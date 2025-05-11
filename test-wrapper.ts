#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write --allow-net

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { MCPServerWrapper } from "./src/mod.ts";

// Utility function to extract content text from tool response
function getResponseText(response: unknown): string {
  if (!response || typeof response !== "object") {
    return "";
  }

  try {
    // @ts-ignore: Handle response type without strong typing
    const content = response.content;
    if (!Array.isArray(content) || !content.length) {
      return "";
    }

    // @ts-ignore: Handle object access safely
    return typeof content[0].text === "string" ? content[0].text : "";
  } catch {
    return "";
  }
}

// Test MCP wrapper with the test server
async function testWrapper() {
  // Create and start wrapper that only exposes 'hello' and 'add' tools
  const wrapper = new MCPServerWrapper({
    serverUrl: "./test-server.ts",
    allowedTools: ["hello", "add"],
  });

  await wrapper.start();

  // Create a client to connect to the wrapper
  const command = Deno.execPath();
  const args = [
    "run",
    "--allow-run",
    "--allow-read",
    "--allow-write",
    "--allow-net",
    "src/cli.ts",
    "./test-server.ts",
    "hello",
    "add",
  ];

  // Give wrapper time to start
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Create client using StdioClientTransport with spawn command
  const transport = new StdioClientTransport({
    command,
    args,
  });

  const client = new Client({
    name: "test-client",
    version: "1.0.0",
  });

  await client.connect(transport);

  // List available tools
  await client.listTools();

  // Test 'hello' tool
  try {
    const helloResult = await client.callTool({
      name: "hello",
      arguments: { name: "World" },
    });

    const helloText = getResponseText(helloResult);
    if (!helloText.includes("Hello, World!")) {
      console.error("❌ 'hello' tool doesn't work correctly.");
    }
  } catch (error) {
    console.error("Error executing 'hello' tool:", error);
  }

  // Test 'add' tool
  try {
    const addResult = await client.callTool({
      name: "add",
      arguments: { a: 5, b: 3 },
    });

    const addText = getResponseText(addResult);
    if (!addText.includes("8")) {
      console.error("❌ 'add' tool doesn't work correctly.");
    }
  } catch (error) {
    console.error("Error executing 'add' tool:", error);
  }

  // Test 'multiply' tool (should fail)
  try {
    await client.callTool({
      name: "multiply",
      arguments: { a: 5, b: 3 },
    });
    console.error("❌ 'multiply' tool shouldn't be available but it is!");
  } catch (error) {
    // This error is expected, no need to log
  }

  // Clean up
  await client.close();
  await wrapper.stop();
}

await testWrapper();
