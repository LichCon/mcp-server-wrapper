export {
  MCPServerWrapper,
  type MCPServerWrapperConfig,
} from "./server-wrapper.ts";

// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (import.meta.main) {
  console.log("MCP Server Wrapper - Use as a CLI(/cli) or import as a module");
  console.log(
    "CLI Usage: dpx mcp-server-wrapper YOUR_MCP_SERVER_URL YOUR_TOOL_NAME_1 YOUR_TOOL_NAME_2 ..."
  );
}
