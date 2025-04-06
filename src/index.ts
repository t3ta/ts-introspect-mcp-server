#!/usr/bin/env node
// src/index.ts
import { introspectFromPackage } from "./introspect/fromPackage.js";
import { introspectFromSource } from "./introspect/fromSource.js";

// Re-export the core functions
export { introspectFromPackage, introspectFromSource };
export type { ExportInfo, IntrospectOptions } from "./introspect/types.js";

// CLI entry point
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  // Simple argument parsing
  const packageName = args[0];
  const options: Record<string, any> = {};
  
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const option = args[i].slice(2);
      const [key, value] = option.split('=');
      
      if (key === 'searchTerm') {
        options.searchTerm = value;
      } else if (key === 'cache') {
        options.cache = value !== 'false';
      } else if (key === 'cacheDir') {
        options.cacheDir = value;
      } else if (key === 'limit') {
        options.limit = parseInt(value, 10);
      } else if (key === 'searchPath') {
        options.searchPaths = options.searchPaths || [];
        options.searchPaths.push(value);
      }
    }
  }

  if (!packageName) {
    printUsage();
    process.exit(1);
  }

  try {
    const exports = await introspectFromPackage(packageName, options);
    console.log(JSON.stringify(exports, null, 2));
  } catch (error) {
    console.error("Failed to introspect package:", error);
    process.exit(1);
  }
}

function printUsage() {
  console.error(`
Usage: ts-morph-mcp-server <packageName> [options]

Options:
  --searchTerm=<term>      Filter exports by search term (supports regex)
  --cache=<true|false>     Enable/disable caching (default: false)
  --cacheDir=<path>        Specify custom cache directory (default: .ts-morph-cache)
  --limit=<number>         Limit number of exports returned
  --searchPath=<path>      Add a search path (can be used multiple times)

Examples:
  ts-morph-mcp-server zod
  ts-morph-mcp-server typescript --searchTerm=create --limit=10
  ts-morph-mcp-server lodash --cache=true --searchPath=/path/to/project
  `);
}

// Only run main if this file is being executed directly
if (import.meta.url === process.argv[1]) {
  main().catch(console.error);
}