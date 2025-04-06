# MVP: Package Export Introspector

## Goal

Given an npm package name, extract the list of exported identifiers along with their types (if available).

This MVP allows developers or AI systems to understand what symbols are available from a package without manually digging through documentation or typing.

---

## User Stories

### 1. Extract exported function names from a package

**As a** developer,
**I want to** see the exported function names from a package,
**So that** I can understand what functions are available to use.

---

### 2. Extract type signatures of exported functions

**As a** developer,
**I want to** view the input/output types of each exported function,
**So that** I can understand how to use them properly.

---

### 3. Ignore non-exported symbols

**As a** developer,
**I want to** exclude private/internal functions that are not exported,
**So that** the output only includes usable public APIs.

---

### 4. Support basic non-function exports (e.g. constants, classes, type aliases)

**As a** developer,
**I want to** see other exported symbols like constants, types, and classes,
**So that** I have a complete picture of the package API.

---

### 5. Support extracting from a local .d.ts source string (for unit tests)

**As a** developer,
**I want to** call `introspectFromSource(sourceCode)` with raw TypeScript string input,
**So that** I can unit test the introspection behavior easily.

---

### 6. Support resolving and introspecting a package by its name

**As a** developer,
**I want to** pass a package name like `zod` and receive the export info,
**So that** I can analyze installed dependencies without manually providing paths.
