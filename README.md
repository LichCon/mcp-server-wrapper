# MCP Server Wrapper

A wrapper around MCP servers to allow filtering which tools to expose to clients.

This package allows you to create a proxy for an existing MCP server while selectively exposing only specific tools. It's useful when you want to limit the functionality of an MCP server for specific use cases or security reasons.

## Features

- Wrap any MCP server (local file or package)
- Filter which tools are exposed to clients
- Seamlessly proxy tool execution to the original server
- Easy to use CLI interface

## Installation

### Using dpx (recommended)

```bash
# Install dpx if you don't have it
deno install -A -r https://deno.land/x/dpx/cli.ts

# Run directly with dpx
dpx mcp-server-wrapper YOUR_MCP_SERVER_URL YOUR_TOOL_NAME_1 YOUR_TOOL_NAME_2 ...
```

### Local Installation

```bash
# Clone the repository
git clone https://github.com/your-username/mcp-server-wrapper.git
cd mcp-server-wrapper

# Run with Deno
deno run --allow-read --allow-write --allow-run --allow-net src/cli.ts YOUR_MCP_SERVER_URL YOUR_TOOL_NAME_1 YOUR_TOOL_NAME_2 ...
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

## Development

```bash
# Clone the repository
git clone https://github.com/your-username/mcp-server-wrapper.git
cd mcp-server-wrapper

# Run tests
deno test

# Run development server
deno task dev
```

## Logging

This project follows the MCP (Model Context Protocol) logging guidelines:

- Only critical error messages are logged to stderr
- All non-error logging has been removed to ensure clean stdio communication
- This is crucial because MCP uses stdio for communication between clients and servers
- Using stdout for logging would interfere with the protocol operation

When extending this project:

- Only use `console.error()` for genuine error conditions
- Avoid using any logging for informational or debugging purposes as it may interfere with the protocol

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
