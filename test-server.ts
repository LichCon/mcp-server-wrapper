#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Create a server with stdio transport
const transport = new StdioServerTransport();
const server = new Server(
  {
    name: "test-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Connect to the transport
await server.connect(transport);

// Define tool handler that returns properly formatted text content
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name;
  const args = request.params.arguments || {};

  if (name === "hello") {
    return {
      content: [
        {
          type: "text",
          text: `Hello, ${String(args.name)}!`,
        },
      ],
    };
  } else if (name === "add") {
    const a = Number(args.a);
    const b = Number(args.b);
    const result = a + b;

    return {
      content: [
        {
          type: "text",
          text: `Result: ${result}`,
        },
      ],
    };
  } else if (name === "multiply") {
    const a = Number(args.a);
    const b = Number(args.b);
    const result = a * b;

    return {
      content: [
        {
          type: "text",
          text: `Result: ${result}`,
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "hello",
        description: "Say hello to someone",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The name to say hello to",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "add",
        description: "Add two numbers",
        inputSchema: {
          type: "object",
          properties: {
            a: {
              type: "number",
              description: "First number",
            },
            b: {
              type: "number",
              description: "Second number",
            },
          },
          required: ["a", "b"],
        },
      },
      {
        name: "multiply",
        description: "Multiply two numbers",
        inputSchema: {
          type: "object",
          properties: {
            a: {
              type: "number",
              description: "First number",
            },
            b: {
              type: "number",
              description: "Second number",
            },
          },
          required: ["a", "b"],
        },
      },
    ],
  };
});
