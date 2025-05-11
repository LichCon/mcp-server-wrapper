#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-net

import { MCPServerWrapper } from "./server-wrapper.ts";

/**
 * Parse command line arguments
 */
function parseArgs(): { serverUrl: string; toolNames: string[] } {
  const args = Deno.args;

  if (args.length < 2) {
    console.error(
      "Usage: dpx mcp-server-wrapper YOUR_MCP_SERVER_URL YOUR_TOOL_NAME_1 YOUR_TOOL_NAME_2 ..."
    );
    Deno.exit(1);
  }

  const serverUrl = args[0];
  const toolNames = args.slice(1);

  return { serverUrl, toolNames };
}

/**
 * Main function
 */
async function main() {
  try {
    // Parse command line arguments
    const { serverUrl, toolNames } = parseArgs();

    // Create and start the server wrapper
    const wrapper = new MCPServerWrapper({
      serverUrl,
      allowedTools: toolNames,
    });

    // Handle termination signals
    const signals = ["SIGINT", "SIGTERM"] as const;
    for (const signal of signals) {
      Deno.addSignalListener(signal, async () => {
        await wrapper.stop();
        Deno.exit(0);
      });
    }

    // Start the server wrapper
    await wrapper.start();

    // Keep the process running
    await new Promise(() => {});
  } catch (error) {
    console.error("Error:", error);
    Deno.exit(1);
  }
}

// Run the main function
if (import.meta.main) {
  main();
}
