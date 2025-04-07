// src/introspect/filterUtils.ts
import { ExportInfo } from "./types.js"; // Assuming types.ts is in the same directory

/**
 * Filters exports based on search term and limit
 */
export function filterExports(exports: ExportInfo[], searchTerm?: string, limit?: number): ExportInfo[] {
  let result = exports;

  // Apply search term filter if provided
  if (searchTerm) {
    const regex = new RegExp(searchTerm, 'i');
    result = exports.filter(exp =>
      regex.test(exp.name) ||
      regex.test(exp.typeSignature) ||
      regex.test(exp.description)
    );

    if (process.env.DEBUG === 'true') console.error(`🔍 Filtered to ${result.length} exports matching "${searchTerm}"`);
  }

  // Apply limit if provided
  if (limit !== undefined && limit > 0) {
    result = result.slice(0, limit);
    if (process.env.DEBUG === 'true') console.error(`📊 Limited to ${result.length} exports`);
  }

  return result;
}
