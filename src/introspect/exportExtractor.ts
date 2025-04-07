// src/introspect/exportExtractor.ts
import { Node, SourceFile } from "ts-morph";
import { ExportInfo } from "./types.js"; // Assuming types.ts is in the same directory

/**
 * Extract exports from a source file
 */
export function extractExports(sourceFile: SourceFile): ExportInfo[] {
  if (process.env.DEBUG === 'true') console.error(`🔍 Extracting exports from source file...`);
  const allExports: ExportInfo[] = [];
  const exportSymbols = sourceFile.getExportSymbols();
  if (process.env.DEBUG === 'true') console.error(`🔢 Found ${exportSymbols.length} export symbols`);

  for (const symbol of exportSymbols) {
    const name = symbol.getName();
    // Reduced logging for better performance
    // console.error(`  📝 Processing export symbol: ${name}`);

    // Skip default and internal symbols
    if (name === 'default' || name.startsWith('_')) {
      // console.error(`  ⏭️ Skipping ${name} (default or internal)`);
      continue;
    }

    const declarations = symbol.getDeclarations();
    if (!declarations || declarations.length === 0) {
      // console.error(`  ⏭️ Skipping ${name} (no declarations)`);
      continue;
    }

    // Use the first declaration (getExportSymbols resolves re-exports)
    const decl = declarations[0];
    const info = getExportInfo(decl, name);
    if (info) {
      // Avoid duplicates just in case
      if (!allExports.some(e => e.name === info.name)) {
        // console.error(`  ✅ Adding export: ${name} (${info.kind})`);
        allExports.push(info);
      } else {
        // console.error(`  ⏭️ Skipping duplicate: ${name}`);
      }
    } else {
      // console.error(`  ⏭️ Could not get export info for: ${name}`);
    }
  }

  if (process.env.DEBUG === 'true') console.error(`✅ Extracted ${allExports.length} exports`);
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
