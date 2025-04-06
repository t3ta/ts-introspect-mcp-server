import { describe, test, expect } from "vitest";
import { introspectFromPackage } from "../src/introspect/fromPackage.js";

describe("introspectFromPackage", () => {
  test("introspects a real package like 'zod'", async () => {
    const result = await introspectFromPackage("zod");
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(e => e.name === "z")).toBe(true);
  });
});
