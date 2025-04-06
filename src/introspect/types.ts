/**
 * Represents the information about an exported symbol from a TypeScript package
 */
export type ExportInfo = {
  /** The exported identifier name */
  name: string;
  /** The kind of export (function, class, type, or const) */
  kind: "function" | "class" | "type" | "const";
  /** Full type signature as a string */
  typeSignature: string;
  /** JSDoc comment if available */
  description: string;
};
