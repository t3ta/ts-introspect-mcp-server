// src/introspect/fromPackage.ts
import { Project, Node, SourceFile, ModuleResolutionKind } from "ts-morph";
import { ExportInfo } from "./types.js";
import * as fs from "fs";
import * as path from "path";
import { createRequire } from "module";

// Create a require function that works in ESM
const require = createRequire(import.meta.url);

/**
 * Extracts export information from a package's TypeScript declaration files
 * @param packageName Name of the package to introspect (e.g. "zod")
 * @param searchPaths Optional array of additional paths to search for the package
 * @returns Promise resolving to an array of export information
 */
export async function introspectFromPackage(
  packageName: string,
  searchPaths: string[] = []
): Promise<ExportInfo[]> {
  console.error(`🔎 Introspecting package: ${packageName}...`);
  console.error(`🔍 Search paths: ${[process.cwd(), ...searchPaths].join(', ')}`);
  
  const project = new Project({
    compilerOptions: {
      allowJs: true,
      declaration: true,
      emitDeclarationOnly: true,
      skipLibCheck: true,
      moduleResolution: ModuleResolutionKind.NodeJs,
    },
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: false, // Enable dependency resolution
    tsConfigFilePath: undefined,
  });

  try {
    console.error(`📄 Finding package.json for ${packageName}...`);
    
    // Initialize packageJsonPath as empty to satisfy TypeScript
    let packageJsonPath = "";
    let packageDir = "";
    let packageJson: any = {};
    let found = false;
    
    // Try to find package.json using require.resolve first
    try {
      packageJsonPath = require.resolve(`${packageName}/package.json`);
      console.error(`✅ Found package.json at: ${packageJsonPath} (via require.resolve)`);
      
      packageDir = path.dirname(packageJsonPath);
      console.error(`📂 Package directory: ${packageDir}`);
      
      // Read and parse package.json
      const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
      packageJson = JSON.parse(packageJsonContent);
      found = true;
    } catch (error) {
      console.error(`❌ Could not resolve ${packageName}/package.json via require:`, error);
    }
    
    // If not found, try the additional search paths
    if (!found) {
      // All possible package.json locations to check
      const possiblePaths: string[] = [
        path.join(process.cwd(), 'node_modules', packageName, 'package.json'),
        ...searchPaths.map(searchPath => 
          path.join(searchPath, 'node_modules', packageName, 'package.json')
        ),
        ...searchPaths.map(searchPath => 
          path.join(searchPath, packageName, 'package.json')
        ),
      ];
      
      for (const possiblePath of possiblePaths) {
        console.error(`🔍 Checking path: ${possiblePath}`);
        if (fs.existsSync(possiblePath)) {
          packageJsonPath = possiblePath;
          console.error(`✅ Found package.json at: ${packageJsonPath}`);
          
          packageDir = path.dirname(packageJsonPath);
          console.error(`📂 Package directory: ${packageDir}`);
          
          // Read and parse package.json
          const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
          packageJson = JSON.parse(packageJsonContent);
          
          found = true;
          break;
        }
      }
    }
    
    if (!found) {
      throw new Error(`Could not find package.json for ${packageName} in any search paths`);
    }
    
    console.error(`📝 Package.json parsed:`, { 
      name: packageJson.name, 
      version: packageJson.version,
      types: packageJson.types,
      typings: packageJson.typings,
      hasExports: !!packageJson.exports
    });

    // First check types/typings field
    let typesPath = packageJson.types || packageJson.typings;
    console.error(`🔤 Types path from package.json:`, typesPath);

    // If no explicit types field, check exports
    if (!typesPath && packageJson.exports) {
      typesPath = packageJson.exports['.']?.types;
      console.error(`🔤 Types path from exports:`, typesPath);
    }

    // If still no types path, try common locations
    if (!typesPath) {
      typesPath = 'index.d.ts';
      console.error(`🔤 Using default types path:`, typesPath);
    }

    // Resolve the full path relative to package directory
    const mainDtsPath = path.join(packageDir, typesPath.startsWith('./') ? typesPath.slice(2) : typesPath);
    console.error(`📄 Full path to declaration file: ${mainDtsPath}`);

    if (!fs.existsSync(mainDtsPath)) {
      console.error(`❌ Type definitions not found at ${mainDtsPath}`);
      
      // Attempt to find .d.ts files in the package
      const files = fs.readdirSync(packageDir)
        .filter(file => file.endsWith('.d.ts'));
      
      console.error(`🔍 Found ${files.length} .d.ts files in package directory:`, files);
      
      if (files.length === 0) {
        throw new Error(`Type definitions not found at ${mainDtsPath}`);
      }
      
      // Use the first .d.ts file found
      const alternativePath = path.join(packageDir, files[0]);
      console.error(`📄 Using alternative declaration file: ${alternativePath}`);
      
      // Add the main file to the project
      const sourceFile = project.addSourceFileAtPath(alternativePath);
      console.error(`📄 Source file added to project`);
      
      // Extract exports using getExportSymbols
      return extractExports(sourceFile);
    }

    // Add the main file to the project
    const sourceFile = project.addSourceFileAtPath(mainDtsPath);
    console.error(`📄 Source file added to project`);

    // Extract exports using getExportSymbols
    return extractExports(sourceFile);
  } catch (error) {
    console.error(`❌ Failed to load declaration file for package ${packageName}:`, error);
    return [];
  }
}

/**
 * Extract exports from a source file
 */
function extractExports(sourceFile: SourceFile): ExportInfo[] {
  console.error(`🔍 Extracting exports from source file...`);
  const allExports: ExportInfo[] = [];
  const exportSymbols = sourceFile.getExportSymbols();
  console.error(`🔢 Found ${exportSymbols.length} export symbols`);

  for (const symbol of exportSymbols) {
    const name = symbol.getName();
    console.error(`  📝 Processing export symbol: ${name}`);
    
    // Skip default and internal symbols
    if (name === 'default' || name.startsWith('_')) {
      console.error(`  ⏭️ Skipping ${name} (default or internal)`);
      continue;
    }

    const declarations = symbol.getDeclarations();
    if (!declarations || declarations.length === 0) {
      console.error(`  ⏭️ Skipping ${name} (no declarations)`);
      continue;
    }

    // Use the first declaration (getExportSymbols resolves re-exports)
    const decl = declarations[0];
    const info = getExportInfo(decl, name);
    if (info) {
      // Avoid duplicates just in case
      if (!allExports.some(e => e.name === info.name)) {
        console.error(`  ✅ Adding export: ${name} (${info.kind})`);
        allExports.push(info);
      } else {
        console.error(`  ⏭️ Skipping duplicate: ${name}`);
      }
    } else {
      console.error(`  ⏭️ Could not get export info for: ${name}`);
    }
  }

  console.error(`✅ Extracted ${allExports.length} exports`);
  return allExports;
}

/**
 * Extracts export information from a specific declaration
 */
function getExportInfo(node: Node, name: string): ExportInfo | null {
  let kind: ExportInfo['kind'];
  let typeSignature = "";
  let description = "";

  // Get JSDoc comment if available
  if (Node.isJSDocable(node)) {
    const jsDocs = node.getJsDocs();
    if (jsDocs.length > 0) {
      description = jsDocs[0].getDescription().trim();
    }
  }

  if (Node.isTypeAliasDeclaration(node)) {
    kind = "type";
    typeSignature = `type ${name} = ${node.getTypeNode()?.getText() ?? "unknown"}`;
  }
  else if (Node.isFunctionDeclaration(node)) {
    kind = "function";
    typeSignature = node.getText().split("{")[0].trim();
  }
  else if (Node.isClassDeclaration(node)) {
    kind = "class";
    typeSignature = `class ${name} ${node.getExtends()?.getText() ?? ""}`;
  }
  else if (Node.isVariableDeclaration(node)) {
    kind = "const";
    typeSignature = `const ${name}: ${node.getType().getText()}`;
  }
  // ExportSpecifier should ideally be resolved by getExportSymbols,
  // but handle it as a fallback if it appears directly.
  else if (Node.isExportSpecifier(node)) {
     // This case might indicate getExportSymbols didn't fully resolve.
     kind = "type"; // Default to type as a guess
     typeSignature = `export { ${node.getName()} }`;
     description = "Re-exported symbol (unresolved)";
  }
  else {
    return null;
  }

  return {
    name,
    kind,
    typeSignature,
    description,
  };
}