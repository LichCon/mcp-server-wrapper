import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * Configuration for the MCP Server Wrapper
 */
export interface MCPServerWrapperConfig {
  /** URL or path to the MCP server */
  serverUrl: string;
  /** List of tool names to expose from the original server */
  allowedTools: string[];
}

/**
 * MCP Server Wrapper - wraps an existing MCP server and filters the exposed tools
 */
export class MCPServerWrapper {
  private serverUrl: string;
  private allowedTools: Set<string>;
  private client: Client | null = null;
  private server: Server | null = null;
  private childProcess: Deno.ChildProcess | null = null;

  /**
   * Create a new MCP Server Wrapper
   * @param config Configuration for the wrapper
   */
  constructor(config: MCPServerWrapperConfig) {
    this.serverUrl = config.serverUrl;
    this.allowedTools = new Set(config.allowedTools);
  }

  /**
   * Start the wrapped server
   */
  async start(): Promise<void> {
    try {
      // Connect to the original MCP server
      await this.connectToServer();

      // Start our proxy server
      await this.startProxyServer();
    } catch (error) {
      console.error("Failed to start MCP server wrapper:", error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Connect to the original MCP server
   */
  private async connectToServer(): Promise<void> {
    // Determine if the server is a local file or a package
    const isLocalFile =
      this.serverUrl.endsWith(".ts") ||
      this.serverUrl.endsWith(".js") ||
      this.serverUrl.startsWith("./") ||
      this.serverUrl.startsWith("/");

    if (isLocalFile) {
      // For local file, spawn a child process
      const command = this.serverUrl.endsWith(".ts") ? "deno" : "node";
      const args = this.serverUrl.endsWith(".ts")
        ? [
            "run",
            "--allow-read",
            "--allow-write",
            "--allow-run",
            "--allow-net",
            this.serverUrl,
          ]
        : [this.serverUrl];

      this.childProcess = new Deno.Command(command, {
        args,
        stdin: "piped",
        stdout: "piped",
        stderr: "piped",
      }).spawn();

      // Create client with stdio transport to the child process
      const transport = new StdioClientTransport({
        command,
        args,
      });

      this.client = new Client({
        name: "mcp-server-wrapper",
        version: "1.0.0",
      });

      await this.client.connect(transport);
    } else {
      // For packages, try to dynamically import
      try {
        const module = await import(this.serverUrl);
        if (typeof module.createServer === "function") {
          // If the module exports a createServer function, use it
          this.server = await module.createServer();
        } else {
          throw new Error(
            `The module at ${this.serverUrl} does not export a createServer function.`
          );
        }
      } catch (error) {
        console.error(
          `Failed to import MCP server from ${this.serverUrl}:`,
          error
        );
        throw error;
      }
    }
  }

  /**
   * Start the proxy server that filters tools
   */
  private async startProxyServer(): Promise<void> {
    // Create a new MCP server with stdio transport
    const transport = new StdioServerTransport();

    this.server = new Server(
      {
        name: "mcp-server-wrapper",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Set up request handlers before connecting
    this.setupToolHandlers();

    // Connect the server to the transport
    await this.server.connect(transport);
  }

  /**
   * Set up tool proxy handlers
   */
  private async setupToolHandlers(): Promise<void> {
    if (!this.client || !this.server) {
      return;
    }

    // Get available tools from the wrapped server
    const toolResponse = await this.client.listTools();

    // Filter tools based on the allowed list
    const filteredTools = toolResponse.tools.filter((tool: Tool) =>
      this.allowedTools.has(tool.name)
    );

    // Set up tool listing handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: filteredTools,
      };
    });

    // Set up tool call handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      if (!this.allowedTools.has(toolName)) {
        throw new Error(`Tool not found: ${toolName}`);
      }

      // Proxy the tool call to the original server
      return await this.client!.callTool({
        name: toolName,
        arguments: request.params.arguments || {},
      });
    });
  }

  /**
   * Stop the wrapped server and clean up resources
   */
  async stop(): Promise<void> {
    await this.cleanup();
  }

  /**
   * Clean up resources
   */
  private async cleanup(): Promise<void> {
    try {
      // Clean up client connection
      if (this.client) {
        await this.client.close();
        this.client = null;
      }

      // Clean up server
      if (this.server) {
        await this.server.close();
        this.server = null;
      }

      // Clean up child process
      if (this.childProcess) {
        this.childProcess.kill();
        this.childProcess = null;
      }
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }
}
