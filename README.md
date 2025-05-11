# MCP Server Wrapper

A wrapper around MCP servers to allow filtering which tools to expose to clients.

This package allows you to create a proxy for an existing MCP server while selectively exposing only specific tools.

I created this mainly to:

- select which tools to expose to Cursor(my editor of choice)
  - often times I do not use all the tools of a server
  - sometimes I do not want to expose some tools to the LLM
  - stay within limit for number of tools in Cursor
- segregate tools that read a resource from tools that write to a resource, that way I can better control llm behavior

Right now it only supports stdio and "tools" feature, but I plan to add support for other transports and features in the future.

Why deno? Just curious.

## Installation

[Install deno](https://docs.deno.com/runtime/getting_started/installation/) if you don't have it.

### Using dpx

```bash
# Install dpx if you don't have it
deno install --allow-run --allow-net -n dpx https://deno.land/x/dpx/cli.ts

# Run directly with dpx
dpx mcp-server-wrapper YOUR_MCP_SERVER_URL YOUR_TOOL_NAME_1 YOUR_TOOL_NAME_2 ...
```

### Local Installation

```bash
# Clone the repository
git clone https://github.com/your-username/mcp-server-wrapper.git
cd mcp-server-wrapper

# Run with Deno
deno run -A src/cli.ts YOUR_MCP_SERVER_URL YOUR_TOOL_NAME_1 YOUR_TOOL_NAME_2 ...
```

## Usage

### CLI Usage

```bash
dpx mcp-server-wrapper YOUR_MCP_SERVER_URL YOUR_TOOL_NAME_1 YOUR_TOOL_NAME_2 ...
```

Where:

- `YOUR_MCP_SERVER_URL` can be:
  - A local file path (e.g., `./my-server.ts` or `/path/to/server.js`)
  - A JSR package (e.g., `jsr:@username/package-name`)
  - An NPM package (e.g., `npm:package-name`)
- `YOUR_TOOL_NAME_1`, `YOUR_TOOL_NAME_2`, etc. are the names of the tools you want to expose from the original server

### Programmatic Usage

```typescript
import { MCPServerWrapper } from "jsr:@username/mcp-server-wrapper";

const wrapper = new MCPServerWrapper({
  serverUrl: "./my-server.ts",
  allowedTools: ["tool1", "tool2"],
});

// Start the wrapper
await wrapper.start();

// To stop the wrapper
await wrapper.stop();
```

## Examples

### Filtering GitHub API Tools

```bash
# Only expose the 'search-repo' and 'list-issues' tools from a GitHub API server
dpx mcp-server-wrapper ./github-api-server.ts search-repo list-issues
```

### Wrapping Package Servers

```bash
# Only expose specific tools from an npm package
dpx mcp-server-wrapper npm:mcp-wikipedia-server search-wiki get-summary
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
