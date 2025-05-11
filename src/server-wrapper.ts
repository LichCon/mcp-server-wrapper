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
      this.cleanup();
      throw new Error(`Failed to start MCP server wrapper: ${error}`);
    }
  }

  /**
   * Connect to the original MCP server
   */
  private async connectToServer(): Promise<void> {
    try {
      // Determine the type of server URL
      const isLocalFile =
        (this.serverUrl.endsWith(".ts") || this.serverUrl.endsWith(".js")) &&
        (this.serverUrl.startsWith("./") || this.serverUrl.startsWith("/"));

      const isJsrPackage = this.serverUrl.startsWith("jsr:");
      const isNpmPackage = this.serverUrl.startsWith("npm:");

      // For all server types, we'll spawn a child process
      let command = "deno";
      let args: string[];

      if (isLocalFile || isJsrPackage || isNpmPackage) {
        // For JSR or NPM packages, use deno run -A
        command = "deno";
        args = ["run", "-A", this.serverUrl];
      } else {
        throw new Error(`Unsupported server URL: ${this.serverUrl}`);
      }

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
    } catch (error) {
      throw new Error(
        `Failed to connect to server at ${this.serverUrl}: ${error}`
      );
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
    if (!this.server) {
      return;
    }

    if (!this.client) {
      throw new Error(
        "No client available to communicate with the wrapped server"
      );
    }

    // Get available tools from the wrapped server via client
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

      if (!this.client) {
        throw new Error("No client available to handle tool call");
      }

      // Proxy the tool call to the original server via client
      return await this.client.callTool({
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
