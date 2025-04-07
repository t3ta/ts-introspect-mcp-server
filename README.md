# TypeScript Package Introspector (MCP Server)

This tool introspects TypeScript packages and source code to extract exported symbols (functions, classes, types, constants) and their type information. It runs as a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server.

## Features

- Extract exported symbols from npm packages using their type definitions
- Analyze TypeScript source code directly
- Get detailed type signatures for all exported symbols
- Extract JSDoc comments as descriptions
- Provide type information to LLMs through MCP

## Usage

This tool can be run as an MCP server to provide TypeScript package introspection capabilities to LLM applications like Claude for Desktop. You can start it using npx:

```bash
npx ts-introspect-mcp-server
```

To integrate it with your project, create a `.roo/mcp.json` configuration file:

```json
{
  "mcpServers": {
    "ts-introspect": {
      "command": "npx",
      "args": ["-y", "ts-introspect-mcp-server"]
    }
  }
}
```

### MCP Tools

The MCP server provides the following tools:

#### introspect-package

Introspects an npm package and returns its exported symbols.

Parameters:

- `packageName`: Name of the npm package to introspect (e.g., 'zod')

#### introspect-source

Introspects TypeScript source code and returns the exported symbols.

Parameters:

- `source`: TypeScript source code to analyze

## Development

```bash
# Run tests
npm test

# Start the MCP server in development mode
npm run start:mcp
```

## License

MIT
