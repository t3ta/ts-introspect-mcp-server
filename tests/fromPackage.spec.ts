import { describe, test, expect } from "vitest";
import { introspectFromPackage } from "../src/introspect/fromPackage.js";

describe("introspectFromPackage", () => {
  test("introspects a real package like 'zod'", async () => {
    const result = await introspectFromPackage("zod");
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(e => e.name === "z")).toBe(true);
  });
});

  test("introspects '@modelcontextprotocol/sdk'", async () => {
    const result = await introspectFromPackage("@modelcontextprotocol/sdk");
    // Check if any exports were found (actual check)
    expect(result.length).toBeGreaterThan(0);
    // Optionally, add a more specific check if you know an expected export
    // expect(result.some(e => e.name === "InitializeRequestSchema")).toBe(true);
  });
