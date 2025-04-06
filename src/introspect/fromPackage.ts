import { Project, Node, SourceFile, TypeAliasDeclaration, FunctionDeclaration, ClassDeclaration, VariableDeclaration, ModuleResolutionKind } from "ts-morph";
import { ExportInfo } from "./types.js";
import * as fs from "fs";

/**
 * Extracts export information from a package's TypeScript declaration files
 * @param packageName Name of the package to introspect (e.g. "zod")
 * @returns Promise resolving to an array of export information
 */
export async function introspectFromPackage(packageName: string): Promise<ExportInfo[]> {
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
    // Find package.json first
    const packageJsonPath = require.resolve(`${packageName}/package.json`);
    const packageDir = packageJsonPath.substring(0, packageJsonPath.lastIndexOf('/'));
    const packageJson = require(packageJsonPath);

    // First check types/typings field
    let typesPath = packageJson.types || packageJson.typings;

    // If no explicit types field, check exports
    if (!typesPath && packageJson.exports) {
      typesPath = packageJson.exports['.']?.types;
    }

    // If still no types path, try common locations
    if (!typesPath) {
      typesPath = 'index.d.ts';
    }

    // Resolve the full path relative to package directory
    const mainDtsPath = `${packageDir}/${typesPath.startsWith('./') ? typesPath.slice(2) : typesPath}`;

    if (!fs.existsSync(mainDtsPath)) {
      throw new Error(`Type definitions not found at ${mainDtsPath}`);
    }

    // Add the main file to the project
    const sourceFile = project.addSourceFileAtPath(mainDtsPath);

    // Extract exports using getExportSymbols
    const allExports: ExportInfo[] = [];
    const exportSymbols = sourceFile.getExportSymbols();

    for (const symbol of exportSymbols) {
      const name = symbol.getName();
      // Skip default and internal symbols
      if (name === 'default' || name.startsWith('_')) continue;

      const declarations = symbol.getDeclarations();
      if (!declarations || declarations.length === 0) continue;

      // Use the first declaration (getExportSymbols resolves re-exports)
      const decl = declarations[0];
      const info = getExportInfo(decl, name);
      if (info) {
        // Avoid duplicates just in case
        if (!allExports.some(e => e.name === info.name)) {
          allExports.push(info);
        }
      }
    }

    // console.log('Final Found exports:', allExports.map(e => e.name)); // TEMP

    return allExports;
  } catch (error) {
    console.error(`Failed to load declaration file for package ${packageName}:`, error);
    return [];
  }
}

/**
 * Extracts export information from a specific declaration
 */
function getExportInfo(node: Node, name: string): ExportInfo | null {
  let kind: ExportInfo["kind"];
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
     // We'll treat it as 'unknown' for now.
     // console.warn(`Handling unresolved ExportSpecifier: ${name}`);
     kind = "type"; // Default to type as a guess
     typeSignature = `export { ${node.getName()} }`;
     description = "Re-exported symbol (unresolved)";
  }
  else {
    // console.warn(`Unhandled node kind: ${node.getKindName()} for ${name}`);
    return null;
  }

  return {
    name,
    kind,
    typeSignature,
    description,
  };
}
