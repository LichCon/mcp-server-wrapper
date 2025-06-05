# MCP Server Wrapper

A wrapper around a MCP server to select which tools to expose to mcp client.

I created this mainly to:

- select which tools to expose to Cursor(my editor of choice)
  - often times I do not use all the tools of a server
  - sometimes I do not want to expose some tools to the LLM
  - stay within limit for number of tools in Cursor
- segregate tools that read a resource from tools that write to a resource, that way I can better control llm behavior

Right now it only supports stdio, "tools" feature, deno, jsr and npm packages. I plan to add support for other transports and mcp features in the future.

Does not support passing arguments to the wrapped server. Will be fixed in the future.

Why deno? Just curious.

## Installation

First [Install deno](https://docs.deno.com/runtime/getting_started/installation/) if you don't have it.

You need to install this package only if you want to use it programmatically. For CLI usage, you can run it directly from [jsr](https://jsr.io/).

### Install via jsr

```bash
deno install jsr:@dpirate/mcp-server-wrapper
```

### Install via git (for local development)

```bash
# Clone the repository
git clone https://github.com/your-username/mcp-server-wrapper.git
cd mcp-server-wrapper
```

## Usage

### CLI Usage

You can add the command directly to your mcp.json config.

#### From jsr

```bash
deno run -A jsr:@dpirate/mcp-server-wrapper/cli YOUR_MCP_SERVER_URL YOUR_TOOL_NAME_1 YOUR_TOOL_NAME_2 ...
```

#### From local installation

```bash
deno run -A PATH_TO_LOCAL_INSTALLATION/src/cli.ts YOUR_MCP_SERVER_URL YOUR_TOOL_NAME_1 YOUR_TOOL_NAME_2 ...
```

Where:

- `YOUR_MCP_SERVER_URL` can be:
  - A local file path (e.g., `./my-server.ts` or `/path/to/server.js`)
  - A JSR package (e.g., `jsr:@username/package-name`)
  - An NPM package (e.g., `npm:package-name`)
- `YOUR_TOOL_NAME_1`, `YOUR_TOOL_NAME_2`, etc. are the names of the tools you want to expose from the original server

Note: You need to add prefix `jsr:` or `npm:` to the server url.

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
# Only expose the 'search-repo' and 'list-issues' tools from a local GitHub API server
deno run -A jsr:@dpirate/mcp-server-wrapper/cli ./github-api-server.ts search-repo list-issues
```

### Wrapping Package Servers

```bash
# Only expose specific tools from an npm package
deno run -A jsr:@dpirate/mcp-server-wrapper/cli npm:@modelcontextprotocol/server-memory search_nodes read_graph
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Test
Testing cursor pr reviewer
