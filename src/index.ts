// src/index.ts
import { introspectFromPackage } from "./introspect/fromPackage.js";
import { introspectFromSource } from "./introspect/fromSource.js";

// Re-export the core functions
export { introspectFromPackage, introspectFromSource };
export type { ExportInfo } from "./introspect/types.js";

// CLI entry point
async function main() {
  const packageName = process.argv[2];

  if (!packageName) {
    console.error("Please provide a package name");
    process.exit(1);
  }

  try {
    const exports = await introspectFromPackage(packageName);
    console.log(JSON.stringify(exports, null, 2));
  } catch (error) {
    console.error("Failed to introspect package:", error);
    process.exit(1);
  }
}

// Only run main if this file is being executed directly
if (import.meta.url === process.argv[1]) {
  main().catch(console.error);
}
