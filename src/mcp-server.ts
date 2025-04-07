#!/usr/bin/env node
// src/mcp-server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { introspectFromPackage } from "./introspect/fromPackage.js";
import { introspectFromSource } from "./introspect/fromSource.js";
import { IntrospectOptions, type ExportInfo } from "./introspect/types.js";
import * as fs from "fs";
import * as path from "path";
import { createRequire } from "module";

// Create a require function that works in ESM
const require = createRequire(import.meta.url);

// Enable unhandled exception logging
process.on("uncaughtException", (error) => {
  console.error("💥💥💥 UNCAUGHT EXCEPTION:", error);
  // Don't exit the process here - just log
});

process.on("unhandledRejection", (reason) => {
  console.error("💥💥💥 UNHANDLED REJECTION:", reason instanceof Error ? reason.stack : reason);
  // Don't exit the process here - just log
});

// Get the server's directory for use as a search path
const SERVER_DIR = process.cwd();
// Also try parent directory
const PARENT_DIR = path.dirname(SERVER_DIR);
// Default search paths
const DEFAULT_SEARCH_PATHS = [SERVER_DIR, PARENT_DIR];

// Diagnostic info
console.error("📂 Current directory:", process.cwd());
console.error("🔍 Server Directory:", SERVER_DIR);
console.error("🔍 Parent Directory:", PARENT_DIR);
console.error("🔍 NODE_PATH:", process.env.NODE_PATH);
console.error("📋 node_modules exists:", fs.existsSync(path.join(process.cwd(), "node_modules")));

async function main() {
  console.error("🚀🚀🚀 Starting TypeScript Package Introspector MCP server...");

  // Skipping direct tests to reduce startup time & timeouts
  // try {
  //   console.error("🧪 Testing direct call to introspectFromPackage('zod')...");
  //   const zodExports = await introspectFromPackage("zod", { searchPaths: DEFAULT_SEARCH_PATHS });
  //   console.error(`✅ Direct call succeeded, found ${zodExports.length} exports`);
  //   fs.writeFileSync("debug-zod-exports.json", JSON.stringify(zodExports, null, 2));
  //   console.error("✅ Wrote export data to debug-zod-exports.json");
  // } catch (error) {
  //   console.error("❌ Direct test call failed:", error);
  // }

  try {
    // Create an MCP server
    const server = new McpServer({
      name: "TypeScript Package Introspector",
      version: "0.1.0",
      capabilities: {
        tools: {}
      }
    });

    console.error("📦 Registering tools...");

    // Add a tool to introspect from a package with MEGA DEBUG
    server.tool(
      "introspect-package",
      {
        packageName: z.string().describe("Name of the npm package to introspect (e.g. 'zod')"),
        searchPaths: z.array(z.string()).describe("Optional paths to search for the package").optional(),
        searchTerm: z.string().describe("Filter exports by search term (supports regex)").optional(),
        cache: z.boolean().describe("Enable/disable caching for faster repeat lookups").optional(),
        cacheDir: z.string().describe("Directory to store cache files (default: .ts-morph-cache)").optional(),
        limit: z.number().describe("Limit the number of exports returned").optional()
      },
      async ({ packageName, searchPaths = [], searchTerm, cache = true, cacheDir, limit }) => {
        console.error(`📋 Running introspect-package for: ${packageName}`);
        console.error(`🔍 User-provided search paths: ${searchPaths.length ? searchPaths.join(', ') : 'none'}`);

        // Combine default search paths with user-provided paths
        const allSearchPaths = [...DEFAULT_SEARCH_PATHS, ...searchPaths];

        // Build options object - enable cache by default
        const options: IntrospectOptions = {
          searchPaths: allSearchPaths,
          searchTerm,
          cache, // Default is now true (set above in params)
          cacheDir,
          limit
        };

        // Extra safeguard to catch every possible error
        try {
          // Normal flow continues
          console.error(`⏳ Starting introspection of ${packageName}...`);

          // Add a timeout to prevent hanging
          const timeoutMs = 60000; // 1 minute

          // Create a promise with timeout
          const timeoutPromise = new Promise<ExportInfo[]>((_, reject) => {
            setTimeout(() => {
              reject(new Error(`Operation timed out after ${timeoutMs / 1000} seconds. Try using cache:true or reduce the package scope.`));
            }, timeoutMs);
          });

          // Race between actual operation and timeout
          const exports = await Promise.race([
            introspectFromPackage(packageName, options),
            timeoutPromise
          ]);

          // Handle the annoying empty arrays case
          if (exports.length === 0) {
            console.error(`⚠️ Warning: No exports found in ${packageName}.`);
            return {
              content: [
                {
                  type: "text",
                  text: `No exports were found in package "${packageName}".\n\nThis might be because:\n\n1. The package has no TypeScript definitions\n2. The package uses a non-standard export format\n3. The package could not be found in the search paths\n\nI searched in the following locations:\n${allSearchPaths.map(p => `- ${p}`).join('\n')}\n\nIf you know where the package is installed, you can specify a search path:\n\`\`\`\nintrospect-package({\n  packageName: "${packageName}",\n  searchPaths: ["/path/to/package"],\n  // Optional parameters:\n  searchTerm: "regex pattern",  // Filter by name/type/description\n  cache: true,                  // Cache results for faster repeat lookups\n  cacheDir: ".my-cache",        // Custom cache directory\n  limit: 10                     // Limit number of results\n})\n\`\`\``
                }
              ]
            };
          }

          console.error(`✅ Successfully introspected package: ${packageName}, found ${exports.length} exports`);

          // Skip debug file writing to improve performance
          // try {
          //   fs.writeFileSync(`debug-${packageName}-exports.json`, JSON.stringify(exports, null, 2));
          //   console.error(`✅ Wrote export data to debug-${packageName}-exports.json`);
          // } catch (debugErr) {
          //   console.error("⚠️ Could not write debug file:", debugErr);
          // }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(exports, null, 2)
              }
            ]
          };
        } catch (error) {
          const errorMessage = error instanceof Error
            ? `${error.message}\n\n${error.stack}`
            : String(error);

          console.error(`💥 Error in introspect-package "${packageName}":`, errorMessage);

          return {
            content: [
              {
                type: "text",
                text: `Error introspecting package "${packageName}":\n\n${errorMessage}\n\nI searched in these locations:\n${allSearchPaths.map(p => `- ${p}`).join('\n')}\n\nIf you know where the package is installed, try providing a search path:\n\`\`\`\nintrospect-package({\n  packageName: "${packageName}",\n  searchPaths: ["/path/to/package"],\n  // Optional parameters:\n  searchTerm: "regex pattern",  // Filter by name/type/description\n  cache: true,                  // Cache results for faster repeat lookups\n  cacheDir: ".my-cache",        // Custom cache directory\n  limit: 10                     // Limit number of results\n})\n\`\`\``
              }
            ],
            isError: true
          };
        }
      }
    );

    // Add a tool to introspect from source code
    server.tool(
      "introspect-source",
      {
        source: z.string().describe("TypeScript source code to analyze")
      },
      async ({ source }) => {
        console.error(`📋 Running introspect-source with ${source.length} characters of code`);
        try {
          const exports = introspectFromSource(source);
          console.error(`✅ Successfully introspected source code, found ${exports.length} exports`);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(exports, null, 2)
              }
            ]
          };
        } catch (error) {
          const errorMessage = error instanceof Error
            ? `${error.message}\n\n${error.stack}`
            : String(error);

          console.error(`💥 Error introspecting source code:`, errorMessage);

          return {
            content: [
              {
                type: "text",
                text: `Error introspecting source code:\n\n${errorMessage}`
              }
            ],
            isError: true
          };
        }
      }
    );

    console.error("🔌 Creating transport and connecting...");

    // Start receiving messages on stdin and sending messages on stdout
    const transport = new StdioServerTransport();

    // Connect to transport
    console.error("⏳ Awaiting connection...");
    await server.connect(transport);
    console.error("✅ Server connected successfully!");

    // Keep process alive (some implementations need this)
    process.stdin.resume();

    // Set up a heartbeat to prevent timeouts
    const heartbeat = setInterval(() => {
      // Write a small message to stderr to keep the process alive
      process.stderr.write("❤️");
    }, 5000); // Every 5 seconds

    // Cleanup on exit
    process.on("exit", () => {
      clearInterval(heartbeat);
    });

    console.error("🟢 MCP server ready to accept requests");
  } catch (error) {
    console.error("💥 Server initialization error:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("💥 Fatal error in main():", error);
  process.exit(1);
});
