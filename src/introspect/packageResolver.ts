// src/introspect/packageResolver.ts
import * as fs from "fs";
import * as path from "path";
import { createRequire } from "module";

// Create a require function that works in ESM
const require = createRequire(import.meta.url);

interface PackageInfo {
  packageJsonPath: string;
  packageDir: string;
  packageJson: any;
}

/**
 * Finds the package.json file for a given package name and returns its path,
 * the real directory path (resolving symlinks), and the parsed JSON content.
 * @param packageName Name of the package
 * @param searchPaths Additional paths to search within
 * @returns Object containing package info, or null if not found
 */
export function findPackageJsonAndDir(packageName: string, searchPaths: string[] = []): PackageInfo | null {
  console.error(`📄 Finding package.json for ${packageName}...`);

  let packageJsonPath = "";
  let packageDir = "";
  let packageJson: any = {};
  let found = false;

  // Try to find package.json using require.resolve first - fastest method
  try {
    packageJsonPath = require.resolve(`${packageName}/package.json`);
    console.error(`✅ Found package.json at: ${packageJsonPath} (via require.resolve)`);

    // Resolve symbolic links for pnpm compatibility
    packageDir = fs.realpathSync(path.dirname(packageJsonPath));
    console.error(`✅ Real package directory: ${packageDir}`);

    // Read and parse package.json
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
    packageJson = JSON.parse(packageJsonContent);
    found = true;
  } catch (error) {
    // Just silently continue to the next method
  }

  // If not found, try the additional search paths
  if (!found) {
    const possiblePaths: string[] = [
      // Standard node_modules locations
      path.join(process.cwd(), 'node_modules', packageName, 'package.json'),
      ...searchPaths.map(searchPath =>
        path.join(searchPath, 'node_modules', packageName, 'package.json')
      ),
      // pnpm specific paths
      path.join(process.cwd(), 'node_modules', '.pnpm', `${packageName}@*`, 'node_modules', packageName, 'package.json'),
      path.join(process.cwd(), 'node_modules', '.pnpm', packageName, 'node_modules', packageName, 'package.json'),
      ...(packageName.includes('/') ? [
        path.join(process.cwd(), 'node_modules', '.pnpm', packageName.replace('/', '+')+'@*', 'node_modules', packageName, 'package.json'),
        path.join(process.cwd(), 'node_modules', '.pnpm', packageName.replace('/', '+'), 'node_modules', packageName, 'package.json')
      ] : []),
      // Search in provided paths
      ...searchPaths.map(searchPath =>
        path.join(searchPath, 'node_modules', '.pnpm', `${packageName}@*`, 'node_modules', packageName, 'package.json')
      ),
      ...searchPaths.map(searchPath =>
        path.join(searchPath, 'node_modules', '.pnpm', packageName, 'node_modules', packageName, 'package.json')
      ),
      ...(packageName.includes('/') ? searchPaths.flatMap(searchPath => [
        path.join(searchPath, 'node_modules', '.pnpm', packageName.replace('/', '+')+'@*', 'node_modules', packageName, 'package.json'),
        path.join(searchPath, 'node_modules', '.pnpm', packageName.replace('/', '+'), 'node_modules', packageName, 'package.json')
      ]) : []),
      // Direct package paths
      ...searchPaths.map(searchPath =>
        path.join(searchPath, packageName, 'package.json')
      ),
    ];

    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        packageJsonPath = possiblePath;
        console.error(`✅ Found package.json at: ${packageJsonPath}`);

        // Resolve symbolic links for pnpm compatibility
        packageDir = fs.realpathSync(path.dirname(packageJsonPath));
        console.error(`✅ Real package directory (fallback): ${packageDir}`);

        // Read and parse package.json
        const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
        packageJson = JSON.parse(packageJsonContent);

        found = true;
        break;
      }
    }
  }

  if (!found) {
    console.error(`❌ Could not find package.json for ${packageName} in any search paths`);
    return null;
  }

  console.error(`📝 Package.json parsed:`, {
    name: packageJson.name,
    version: packageJson.version,
    types: packageJson.types,
    typings: packageJson.typings,
    hasExports: !!packageJson.exports
  });

  return { packageJsonPath, packageDir, packageJson };
}

/**
 * Finds the list of declaration file paths to load for a package.
 * @param packageInfo Information about the package (path, dir, json content)
 * @returns Array of absolute paths to .d.ts files
 */
export function findDeclarationFiles(packageInfo: PackageInfo): string[] {
  const { packageJsonPath, packageDir, packageJson } = packageInfo;
  const packageJsonDir = path.dirname(packageJsonPath);

  // 1. Check types/typings field
  let typesPath = packageJson.types || packageJson.typings;
  console.error(`🔤 Types path from package.json:`, typesPath);

  // 2. If no explicit types field, check exports
  if (!typesPath && packageJson.exports) {
    typesPath = packageJson.exports['.']?.types;
    console.error(`🔤 Types path from exports:`, typesPath);
  }

  // 3. If still no types path, try common locations (index.d.ts)
  if (!typesPath) {
    typesPath = 'index.d.ts';
    console.error(`🔤 Using default types path:`, typesPath);
  }

  // Resolve the main declaration file path relative to package.json directory
  const mainDtsPath = path.resolve(packageJsonDir, typesPath.startsWith('./') ? typesPath.slice(2) : typesPath);
  console.error(`📄 Resolved full path to main declaration file: ${mainDtsPath} (relative to ${packageJsonDir})`);

  if (fs.existsSync(mainDtsPath)) {
    console.error(`✅ Main declaration file exists: ${mainDtsPath}`);
    return [mainDtsPath]; // Return only the main file if it exists
  } else {
    console.error(`❌ Main type definition file not found at ${mainDtsPath}. Attempting to load all .d.ts files in the package directory.`);

    // Attempt to find and load all .d.ts files in the actual package directory
    try {
      const files = fs.readdirSync(packageDir)
        .filter(file => file.endsWith('.d.ts'));

      console.error(`🔍 Found ${files.length} .d.ts files in package directory:`, files);

      if (files.length === 0) {
        throw new Error(`No type definition files (.d.ts) found in package directory: ${packageDir}`);
      }

      // Return the absolute paths of all found .d.ts files
      const declarationFiles = files.map(file => path.resolve(packageJsonDir, file));
      console.error(`📄 Returning all found declaration files:`, declarationFiles);
      return declarationFiles;

    } catch (readDirError) {
       console.error(`❌ Error reading package directory ${packageDir}:`, readDirError);
       throw new Error(`Failed to read package directory ${packageDir} to find declaration files.`);
    }
  }
}
