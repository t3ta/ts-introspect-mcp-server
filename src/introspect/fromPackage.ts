// src/introspect/fromPackage.ts
import { Project, Node, SourceFile, ModuleResolutionKind } from "ts-morph";
import { ExportInfo, IntrospectOptions } from "./types.js";
import * as fs from "fs"; // Add missing fs import
import { tryLoadFromCache, saveToCache } from "./cacheUtils.js";
import { filterExports } from "./filterUtils.js";
import { extractExports } from "./exportExtractor.js";
import { findPackageJsonAndDir, findDeclarationFiles } from "./packageResolver.js"; // Import package resolver utils


/**
 * Extracts export information from a package's TypeScript declaration files
 * @param packageName Name of the package to introspect (e.g. "zod")
 * @param options Configuration options for introspection
 * @returns Promise resolving to an array of export information
 */
export async function introspectFromPackage(
  packageName: string,
  options: IntrospectOptions = {}
): Promise<ExportInfo[]> {
  const {
    searchPaths = [],
    searchTerm,
    cache = false,
    cacheDir, // Default value is handled in cacheUtils
    limit
  } = options;

  console.error(`🔎 Introspecting package: ${packageName}...`);

  // Try to load from cache first if enabled
  if (cache) {
    const cachedExports = tryLoadFromCache(packageName, cacheDir);
    if (cachedExports) {
      console.error(`✅ Loaded exports from cache for ${packageName}`);
      return filterExports(cachedExports, searchTerm, limit);
    }
  }

  console.error(`🔍 Search paths: ${[process.cwd(), ...searchPaths].join(', ')}`);

  const project = new Project({
    compilerOptions: {
      allowJs: true,
      declaration: true,
      emitDeclarationOnly: true,
      skipLibCheck: true,
      moduleResolution: ModuleResolutionKind.NodeJs,
      // Performance optimizations
      // TEMP: Re-disable performance options as they caused issues
      // noResolve: true,
    },
    skipAddingFilesFromTsConfig: true,
    // TEMP: Re-disable performance options as they caused issues
    // skipFileDependencyResolution: true, // Disable dependency resolution to improve performance
    // TEMP: Re-disable in-memory file system as it caused issues
    // useInMemoryFileSystem: true, // Use in-memory file system for better performance
    tsConfigFilePath: undefined,
  });

  try {
    // 1. Find package.json and the real package directory
    const packageInfo = findPackageJsonAndDir(packageName, searchPaths);
    if (!packageInfo) {
      // Error logged within findPackageJsonAndDir
      return [];
    }

    // 2. Find all relevant declaration (.d.ts) files
    const declarationFiles = findDeclarationFiles(packageInfo);
    if (declarationFiles.length === 0) {
       // Error logged within findDeclarationFiles
       return [];
    }

    // 3. Add declaration files to the ts-morph project and extract exports
    let allExports: ExportInfo[] = [];
    for (const filePath of declarationFiles) {
       console.error(`📄 Attempting to load and extract from: ${filePath}`);
       if (!fs.existsSync(filePath)) { // Double check existence before adding
           console.error(`  ❌ File does not exist (skipped): ${filePath}`);
           continue;
       }
       try {
           const sourceFile = project.addSourceFileAtPath(filePath);
           console.error(`  ✅ Source file added to project: ${filePath}`);
           const fileExports = extractExports(sourceFile);
           allExports = allExports.concat(fileExports); // Combine exports
           console.error(`  📊 Found ${fileExports.length} exports in this file. Total exports now: ${allExports.length}`);
       } catch (fileError) {
           console.error(`  ❌ Failed to load or extract exports from ${filePath}:`, fileError);
           // Optionally decide whether to continue or re-throw
       }
    }

    if (allExports.length === 0) {
        console.error(`⚠️ No exports could be extracted from any found .d.ts files for package ${packageName}`);
    }

    // Save to cache if enabled
    if (cache) {
      saveToCache(packageName, allExports, cacheDir);
    }

    // Apply filtering
    return filterExports(allExports, searchTerm, limit);
  } catch (error) {
    console.error(`❌ Failed to load declaration file for package ${packageName}:`, error);
    return [];
  }
}
