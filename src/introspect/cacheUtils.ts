// src/introspect/cacheUtils.ts
import * as fs from "fs";
import * as path from "path";
import { ExportInfo } from "./types.js"; // Assuming types.ts is in the same directory

/**
 * Default cache directory
 */
const DEFAULT_CACHE_DIR = ".ts-morph-cache";

/**
 * Tries to load exports from cache
 */
export function tryLoadFromCache(packageName: string, cacheDir: string = DEFAULT_CACHE_DIR): ExportInfo[] | null {
  const cacheFilePath = path.join(process.cwd(), cacheDir, `${packageName}.json`);

  if (!fs.existsSync(cacheFilePath)) {
    return null;
  }

  try {
    const cacheContent = fs.readFileSync(cacheFilePath, 'utf8');
    return JSON.parse(cacheContent);
  } catch (error) {
    console.error(`❌ Failed to load cache for ${packageName}:`, error);
    return null;
  }
}

/**
 * Saves exports to cache
 */
export function saveToCache(packageName: string, exports: ExportInfo[], cacheDir: string = DEFAULT_CACHE_DIR): void {
  const cacheDirPath = path.join(process.cwd(), cacheDir);

  // Create cache directory if it doesn't exist
  if (!fs.existsSync(cacheDirPath)) {
    fs.mkdirSync(cacheDirPath, { recursive: true });
  }

  const cacheFilePath = path.join(cacheDirPath, `${packageName}.json`);

  try {
    fs.writeFileSync(cacheFilePath, JSON.stringify(exports, null, 2));
    console.error(`✅ Saved ${exports.length} exports to cache: ${cacheFilePath}`);
  } catch (error) {
    console.error(`❌ Failed to save cache for ${packageName}:`, error);
  }
}
