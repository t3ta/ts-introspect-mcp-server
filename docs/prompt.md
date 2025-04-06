# AI Prompt: Export Introspection Tool with ts-morph

You are a TypeScript expert AI.

I want you to build a tool that takes a package name (e.g. `"zod"`) and returns a list of all exported symbols from its TypeScript declaration files. Each symbol should include:

- `name`: the exported identifier
- `kind`: one of `"function"`, `"class"`, `"const"`, `"type"`
- `typeSignature`: the full type signature as a string
- `description`: the JSDoc comment (if available)

## Requirements

- Use `ts-morph` to parse and analyze the `.d.ts` files.
- Only include top-level, named exports.
- Ignore internal (non-exported) declarations.
- You may assume that the main declaration file is located at `node_modules/${packageName}/index.d.ts`, or resolve it accordingly.
- The output should be a list of structured `ExportInfo` objects:

```ts
type ExportInfo = {
  name: string;
  kind: "function" | "class" | "type" | "const";
  typeSignature: string;
  description: string;
};
```

## Entry Point

Please implement:

```ts
function introspectFromPackage(packageName: string): Promise<ExportInfo[]>;
```

## Notes

Only include top-level exports (no class methods or interfaces for now).
The goal is to give developers or LLMs a quick overview of what a package provides.
