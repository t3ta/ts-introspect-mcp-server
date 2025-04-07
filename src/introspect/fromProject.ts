import { Project, Node, SourceFile, ModuleResolutionKind } from "ts-morph";
import { ExportInfo, IntrospectOptions } from "./types.js";
import * as fs from "fs";
import * as path from "path";
import { tryLoadFromCache, saveToCache } from "./cacheUtils.js";
import { filterExports } from "./filterUtils.js";
import { extractExports } from "./exportExtractor.js";

interface IntrospectProjectOptions extends Omit<IntrospectOptions, 'searchPaths'> {
  projectPath?: string;
  tsConfigPath?: string;
}

/**
 * プロジェクト全体のTypeScriptコードからエクスポート情報を抽出
 * @param options プロジェクト解析オプション
 * @returns エクスポート情報の配列
 */
export async function introspectFromProject(
  options: IntrospectProjectOptions = {}
): Promise<ExportInfo[]> {
  const {
    projectPath,
    tsConfigPath,
    searchTerm,
    cache = true,
    cacheDir,
    limit
  } = options;

  // CWDとその親ディレクトリを候補として持つ
  const cwd = process.cwd();
  const parentDir = path.dirname(cwd);

  // プロジェクトパスとtsconfig.jsonの特定
  let resolvedProjectPath: string | undefined;
  let resolvedTsConfigPath: string | undefined;

  // まずprojectPathが指定されているかチェック
  if (projectPath) {
    resolvedProjectPath = projectPath;
    // 指定されたprojectPathでtsconfig.jsonを探す
    const possibleTsConfig = path.join(projectPath, 'tsconfig.json');
    if (fs.existsSync(possibleTsConfig)) {
      resolvedTsConfigPath = possibleTsConfig;
    }
  } else {
    // 親ディレクトリのtsconfig.jsonをチェック
    const parentTsConfig = path.join(parentDir, 'tsconfig.json');
    if (fs.existsSync(parentTsConfig)) {
      resolvedProjectPath = parentDir;
      resolvedTsConfigPath = parentTsConfig;
    }
    // CWDのtsconfig.jsonをチェック
    else {
      const cwdTsConfig = path.join(cwd, 'tsconfig.json');
      if (fs.existsSync(cwdTsConfig)) {
        resolvedProjectPath = cwd;
        resolvedTsConfigPath = cwdTsConfig;
      }
    }
  }

  // tsConfigPathが明示的に指定されていれば、それを使う
  if (tsConfigPath) {
    resolvedTsConfigPath = tsConfigPath;
    // tsConfigPathからプロジェクトパスを推測（もし指定されてなければ）
    if (!resolvedProjectPath) {
      resolvedProjectPath = path.dirname(tsConfigPath);
    }
  }

  // プロジェクトパスもtsconfig.jsonも見つからなかったらエラー
  if (!resolvedProjectPath || !resolvedTsConfigPath) {
    throw new Error(
      'Could not determine project root or find tsconfig.json. ' +
      'Please specify projectPath and/or tsConfigPath explicitly.'
    );
  }

  if (process.env.DEBUG === 'true') console.error(`📂 Project path: ${resolvedProjectPath}`);
  if (process.env.DEBUG === 'true') console.error(`📄 tsconfig.json: ${resolvedTsConfigPath}`);

  // キャッシュキーはプロジェクトパスとtsconfig.jsonのハッシュから生成
  const cacheKey = `project-${Buffer.from(resolvedProjectPath + resolvedTsConfigPath).toString('base64')}`;

  // キャッシュをチェック
  if (cache) {
    const cachedExports = tryLoadFromCache(cacheKey, cacheDir);
    if (cachedExports) {
      if (process.env.DEBUG === 'true') console.error(`✨ Using cached exports for project: ${resolvedProjectPath}`);
      return filterExports(cachedExports, searchTerm, limit);
    }
  }

  // ts-morphプロジェクトを作成
  const project = new Project({
    tsConfigFilePath: resolvedTsConfigPath,
    skipAddingFilesFromTsConfig: false,
  });

  // プロジェクト内の全ソースファイルを取得
  const sourceFiles = project.getSourceFiles();
  if (process.env.DEBUG === 'true') console.error(`📊 Found ${sourceFiles.length} source files`);

  // 各ファイルからエクスポートを抽出
  const allExports: ExportInfo[] = [];
  for (const sourceFile of sourceFiles) {
    try {
      const fileExports = extractExports(sourceFile);
      allExports.push(...fileExports);
    } catch (error) {
      if (process.env.DEBUG === 'true') console.error(`❌ Error extracting exports from ${sourceFile.getFilePath()}:`, error);
    }
  }

  // キャッシュに保存
  if (cache) {
    saveToCache(cacheKey, allExports, cacheDir);
  }

  // フィルタリングして返す
  return filterExports(allExports, searchTerm, limit);
}
