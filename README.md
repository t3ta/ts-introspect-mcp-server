# TypeScript Package Introspector (MCP Server)

This tool introspects TypeScript packages and source code to extract exported symbols (functions, classes, types, constants) and their type information. It can be used both as a library/CLI tool and as a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server.

## Features

- Extract exported symbols from npm packages using their type definitions
- Analyze TypeScript source code directly
- Get detailed type signatures for all exported symbols
- Extract JSDoc comments as descriptions
- Run as an MCP server to provide context to LLMs

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ts-morph-mcp-server.git
cd ts-morph-mcp-server

# Install dependencies
npm install
# or with pnpm
pnpm install
```

## Usage as CLI

```bash
# Build the project
npm run build

# Introspect a package
node dist/index.js zod
```

## Usage as Library

```typescript
import { introspectFromPackage, introspectFromSource } from 'ts-morph-mcp-server';

// Introspect a package
const exports = await introspectFromPackage('zod');
console.log(exports);

// Introspect source code
const source = `
export function add(a: number, b: number): number {
  return a + b;
}
`;
const sourceExports = introspectFromSource(source);
console.log(sourceExports);
```

## Usage as MCP Server

This tool can be run as an MCP server to provide TypeScript package introspection capabilities to LLM applications like Claude for Desktop.

```bash
# Build the project
npm run build

# Start the MCP server
npm start
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

# Start the development server
npm run dev

# Start the MCP server in development mode
npm run start:mcp
```

## License

MIT
