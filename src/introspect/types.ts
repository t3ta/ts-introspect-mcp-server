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

/**
 * Options for introspecting a package
 */
export type IntrospectOptions = {
  /** Additional paths to search for the package */
  searchPaths?: string[];
  
  /** Optional search term to filter exports (case-insensitive, supports regex patterns) */
  searchTerm?: string;
  
  /** Whether to use caching for faster repeat lookups */
  cache?: boolean;
  
  /** Directory to store cache files (default: ".ts-morph-cache") */
  cacheDir?: string;
  
  /** Limit the number of exports returned */
  limit?: number;
};