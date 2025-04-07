import { describe, it, expect } from 'vitest';
import { introspectFromProject } from '../src/introspect/fromProject.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('introspectFromProject', () => {
  // このテストプロジェクト自体を解析対象として使うよ！
  const thisProjectPath = path.resolve(__dirname, '..');

  it('should find exported functions and types in the project', async () => {
    const exports = await introspectFromProject({
      projectPath: thisProjectPath,
    });

    // プロジェクトから少なくとも1つ以上のエクスポートを見つけられるはず
    expect(exports.length).toBeGreaterThan(0);

    // 既知の関数がちゃんと見つかるかチェック
    const knownExports = exports.map(exp => exp.name);
    expect(knownExports).toContain('introspectFromPackage');
    expect(knownExports).toContain('introspectFromSource');
  });

  it('should use CWD when projectPath is not specified', async () => {
    const exports = await introspectFromProject({});
    expect(exports.length).toBeGreaterThan(0);
  });

  it('should respect search term filtering', async () => {
    const exports = await introspectFromProject({
      projectPath: thisProjectPath,
      searchTerm: 'Package',
    });

    // 'Package'を含む関数だけがヒットするはず
    expect(exports.length).toBeGreaterThan(0);
    exports.forEach(exp => {
      const regex = new RegExp('Package', 'i');
      const matchesPackage = regex.test(exp.name) ||
        regex.test(exp.description) ||
        regex.test(exp.typeSignature);
      expect(matchesPackage).toBe(true);
      if (!matchesPackage) {
        console.error(`Failed: "${exp.name}" does not contain "Package" in name/description/type`);
      }
    });
  });

  it('should respect result limit', async () => {
    const limit = 2;
    const exports = await introspectFromProject({
      projectPath: thisProjectPath,
      limit,
    });

    expect(exports.length).toBeLessThanOrEqual(limit);
  });

  it('should use cache when enabled', async () => {
    // 1回目の実行（キャッシュなし）
    const start1 = Date.now();
    await introspectFromProject({
      projectPath: thisProjectPath,
      cache: false,
    });
    const time1 = Date.now() - start1;

    // 2回目の実行（キャッシュあり）
    const start2 = Date.now();
    await introspectFromProject({
      projectPath: thisProjectPath,
      cache: true,
    });
    const time2 = Date.now() - start2;

    // キャッシュありの方が速いはず！
    expect(time2).toBeLessThan(time1);
  });

  it('should handle errors gracefully when project path is invalid', async () => {
    await expect(introspectFromProject({
      projectPath: '/path/that/does/not/exist',
    })).rejects.toThrow();
  });
});
