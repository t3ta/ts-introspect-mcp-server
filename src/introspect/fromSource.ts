import { Project, Node, SourceFile } from "ts-morph";
import { ExportInfo } from "./types.js";

/**
 * Extracts export information directly from TypeScript source code
 * @param source TypeScript source code to analyze
 * @returns Array of export information
 */
export function introspectFromSource(source: string): ExportInfo[] {
  const project = new Project({
    useInMemoryFileSystem: true,
    skipFileDependencyResolution: true,
  });

  // Create an in-memory source file
  const sourceFile = project.createSourceFile("temp.ts", source);
  return extractExports(sourceFile);
}

/**
 * Extracts export information from a source file
 */
function extractExports(sourceFile: SourceFile): ExportInfo[] {
  const exports: ExportInfo[] = [];

  // Get all exported declarations
  const exportedDeclarations = sourceFile.getExportedDeclarations();

  for (const [name, declarations] of exportedDeclarations) {
    // We only care about the first declaration if there are multiple
    const declaration = declarations[0];

    // Skip declarations without a name
    if (!declaration.getSymbol()?.getName()) continue;

    const info = getExportInfo(declaration, name);
    if (info) {
      exports.push(info);
    }
  }

  return exports;
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
    const params = node.getParameters()
      .map(p => `${p.getName()}: ${p.getTypeNode()?.getText() ?? "any"}`)
      .join(", ");
    const returnType = node.getReturnTypeNode()?.getText() ?? "any";
    typeSignature = `(${params}) => ${returnType}`;
  }
  else if (Node.isClassDeclaration(node)) {
    kind = "class";
    typeSignature = `typeof ${name}`;
  }
  else if (Node.isVariableDeclaration(node)) {
    kind = "const";
    typeSignature = `const ${name}: ${node.getTypeNode()?.getText() ?? node.getType().getText()}`;
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
