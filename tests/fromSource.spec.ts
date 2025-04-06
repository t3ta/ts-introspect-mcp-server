import { describe, test, expect } from "vitest";
import { introspectFromSource } from "../src/introspect/fromSource.js";

describe("introspectFromSource", () => {
  test("extracts exported function name and signature", () => {
    const src = `
      /** Add two numbers */
      export function add(a: number, b: number): number;
    `;
    const result = introspectFromSource(src);

    expect(result).toEqual([
      {
        name: "add",
        kind: "function",
        typeSignature: "(a: number, b: number) => number",
        description: "Add two numbers"
      }
    ]);
  });

  test("ignores non-exported functions", () => {
    const src = `
      function hidden(): void {}
      export function visible(): void {}
    `;
    const result = introspectFromSource(src);
    expect(result.map(r => r.name)).toEqual(["visible"]);
  });

  test("extracts type aliases and constants", () => {
    const src = `
      export type ID = string;
      export const VERSION = "1.0.0";
    `;
    const result = introspectFromSource(src);
    const names = result.map(r => r.name);
    expect(names).toContain("ID");
    expect(names).toContain("VERSION");
  });

  test("extracts class exports", () => {
    const src = `
      export class MyClass {
        greet() { return "hello"; }
      }
    `;
    const result = introspectFromSource(src);
    expect(result).toEqual([
      {
        name: "MyClass",
        kind: "class",
        typeSignature: "typeof MyClass",
        description: ""
      }
    ]);
  });
});
