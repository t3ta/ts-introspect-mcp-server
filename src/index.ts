import { introspectFromPackage } from "./introspect/fromPackage.js";

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

main().catch(console.error);
