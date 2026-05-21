---
name: test-generator-dynamicref
description: Test an unreleased SDK generator (local checkout, GitHub PR/branch, or npm canary) against the $dynamicRef/$dynamicAnchor fixture suite in this repo. Analyzes generated TypeScript for type fidelity and reports pass/fail per pattern.
---

# Test Generator: $dynamicRef Fixture Suite

Use this skill when the user wants to test a new or unreleased version of an OpenAPI SDK generator against the `$dynamicRef` / `$dynamicAnchor` fixtures in this repository.

Typical user prompts:

- "Test ~/lab/hey-api-openapi-ts against our fixtures"
- "Check if https://github.com/hey-api/openapi-ts/pull/3889 passes"
- "Test orval@canary against the showcase"
- "Run the local checkout of openapi-typescript against the dynamicref fixtures"

## Overview

This skill does three things:

1. **Resolve + build** the generator from whatever the user provides (local path, GitHub URL, or npm version)
2. **Generate** TypeScript SDK(s) from the fixture specs
3. **Analyze** the generated output for `$dynamicRef` type fidelity

Then it reports results and asks if the user wants deeper analysis on failures.

## Step 0: Locate the Tracker Repo

The tracker repo is the repo you are currently in. Confirm by checking for `petstore-dynamicref-showcase.yaml` at the root and `fixtures/` directory. The rest of this skill uses `<tracker>` to refer to this repo's absolute path.

If the user is running you from the generator repo instead, ask them for the tracker repo path. The tracker repo must be on disk — it contains the fixtures, the analysis scripts, and the showcase spec.

## Step 1: Resolve the Generator Source

The user provides one of:

### 1a. Local checkout path

A path to a directory on disk containing the generator source.

Example: `~/lab/hey-api-openapi-ts`

Actions:

1. Confirm the directory exists and contains a `package.json` (Node) or `Cargo.toml` (Rust).
2. Find the CLI entry point:
   - Read `package.json` → look for `bin` field or `"name"` containing `openapi`, `orval`, `oazapfts`, etc.
   - For `@hey-api/openapi-ts`: the CLI is at `dist/run.mts` after building
   - For `orval`: the CLI is at `dist/bin/index.js` after building
   - For `openapi-typescript`: the CLI is at `dist/index.js` after building
   - For other tools: check `package.json.bin` and find the built output
3. Build the project:
   - Node: look at `package.json.scripts.build`. Typical: `pnpm build`, `npm run build`, `tsup`. Run it.
   - If the project uses pnpm (has `pnpm-workspace.yaml`), use `pnpm build`. If it has a `turbo.json`, use `pnpm build --filter=<package-name>` to build only the relevant package.
   - Rust: `cargo build --release -p <crate>`
4. Record the absolute path to the built CLI entry point as `<cli-path>`.
5. Record the generator name/ID as `<gen-id>`. Infer from `package.json.name` (e.g., `@hey-api/openapi-ts` → `hey-api`).

### 1b. GitHub PR or branch URL

Example: `https://github.com/hey-api/openapi-ts/pull/3889`

Actions:

1. Parse the URL to extract: owner, repo, and PR number or branch name.
2. Clone the repo to a temp directory under `<tracker>/io/` (create if needed):
   ```bash
   gh pr checkout <pr-number> --repo <owner>/<repo>
   ```
   Or for a branch:
   ```bash
   git clone --branch <branch> --depth 1 https://github.com/<owner>/<repo>.git <tracker>/io/<repo>-<branch>
   ```
3. Follow step 1a from "Confirm the directory exists" onward, using the cloned path.

### 1c. npm version or tag (canary)

Example: `orval@canary`, `@hey-api/openapi-ts@0.98.0-beta.1`

Actions:

1. Create a temp directory: `<tracker>/io/npm-test-<gen-id>/`
2. Install the package:
   ```bash
   npm init -y
   npm install <package>@<version>
   ```
3. The CLI entry point is `./node_modules/.bin/<bin-name>`. Find the bin name from the installed `package.json`.
4. Record the path as `<cli-path>`.

### 1d. Unknown — ask the user

If the user doesn't clearly provide one of the above, ask:

> "Where is the generator code? Provide a local path, a GitHub PR/branch URL, or an npm version string."

## Step 2: Ensure Specs Are Built

Before generating, the fixture specs must exist under `<tracker>/specs/`.

Run:

```bash
node <tracker>/scripts/build-specs.mjs
```

This reads `fixtures/*.yaml` and produces `specs/<scenario>/oas-<version>.json` for each scenario and version.

Verify with:

```bash
ls <tracker>/specs/
```

You should see: `api-envelope`, `baseline-duplicated-pagination`, `generic-schema-binding`, `nested-workspace-resources`, `non-identifier-schema-key`, `paginated-response`, `recursive-category-tree`.

## Step 3: Generate SDK from the Showcase Spec

The primary test target is **`petstore-dynamicref-showcase.yaml`** at the tracker root. It exercises all `$dynamicRef` patterns in a single spec:

- Generic pagination (`PaginatedTemplate` → `items: Array<Pet>`, `items: Array<Owner>`)
- Generic response envelope (`ApiEnvelopeTemplate` → `data: Pet`, `data: PaginatedPetItems`)
- Recursive category tree (`BaseSpeciesCategory` → `children: LocalizedSpeciesCategory[]`)
- Nested workspace resources (`ShelterFolderTemplate` → multi-parameter generic with `folderType` + `resourceType`)
- Non-identifier schema keys (`pet`, `shelter-folder` with kebab-case keys)
- Typed request/response bodies

### 3a. Create output directory

```
<tracker>/generated/<gen-id>-dev/showcase/
```

### 3b. Run the generator

Invoke the generator with the showcase spec as input and the output directory as output.

Generator-specific invocation patterns:

**`@hey-api/openapi-ts`:**
```bash
node <cli-path> -i "<tracker>/petstore-dynamicref-showcase.yaml" -o "<tracker>/generated/<gen-id>-dev/showcase" -c @hey-api/client-fetch
```

**`orval`:**
```bash
npx --yes orval --input "<tracker>/petstore-dynamicref-showcase.yaml" --output '{"mode":"single","target":"<tracker>/generated/<gen-id>-dev/showcase/sample.ts","client":"fetch","schemas":"<tracker>/generated/<gen-id>-dev/showcase/model"}'
```

**`openapi-typescript`:**
```bash
node <cli-path> "<tracker>/petstore-dynamicref-showcase.yaml" -o "<tracker>/generated/<gen-id>-dev/showcase/types.d.ts"
```

**`openapi-typescript-codegen`:**
```bash
npx --yes openapi-typescript-codegen -i "<tracker>/petstore-dynamicref-showcase.yaml" -o "<tracker>/generated/<gen-id>-dev/showcase"
```

**`oazapfts`:**
```bash
npx --yes oazapfts "<tracker>/petstore-dynamicref-showcase.yaml" "<tracker>/generated/<gen-id>-dev/showcase/api.ts"
```

**For unknown generators**, look at `package.json.bin` to find the CLI command, then check `--help` for input/output flags. Common patterns: `-i`/`--input` for spec, `-o`/`--output` for output directory.

If the generator fails on the showcase spec, record the error and proceed to step 3c for diagnosis.

### 3c. Optional — Run against individual fixtures + version matrix

If the user asked for version-specific testing, or if the showcase failed and you need to isolate which pattern broke, run against the individual focused fixtures. These live in `<tracker>/specs/<scenario>/oas-<version>.json`.

Use the same generator invocation but with each spec as input. Output to:

```
<tracker>/generated/<gen-id>-dev/<scenario>/<version>/
```

The 7 scenarios are:
- `baseline-duplicated-pagination`
- `generic-schema-binding`
- `paginated-response`
- `api-envelope`
- `recursive-category-tree`
- `nested-workspace-resources`
- `non-identifier-schema-key`

The 4 OAS versions are: `3.1.0`, `3.1.1`, `3.1.2`, `3.2.0`.

Only do this if:
- The user explicitly asked for version matrix
- The generator handles OAS versions differently (e.g., only parses 3.1.x)
- The showcase failed and you need to isolate the failure

## Step 4: Analyze Generated Output

Scan all generated `.ts` and `.d.ts` files in the output directory.

### 4a. Fidelity checks for the showcase

Check for these **concrete type signals** (PASS = found, FAIL = not found):

| Pattern | Key property | Expected concrete type | Should NOT be |
|---|---|---|---|
| Generic pagination (pets) | `items` | `Array<` containing `Pet` or `pet` `>` | `Array<unknown>`, `Array<any>` |
| Generic pagination (owners) | `items` | `Array<` containing `Owner` `>` | `Array<unknown>`, `Array<any>` |
| Response envelope (single pet) | `data` | A type containing `Pet` fields (`id`, `name`, `species`) | `unknown`, `any` |
| Response envelope (paginated) | `data` | A type containing `items: Array<Pet>` | `unknown`, `any` |
| Recursive tree | `children` | `Array<LocalizedSpeciesCategory>` or equivalent | `Array<BaseSpeciesCategory>`, `Array<unknown>` |
| Nested resources (folders) | `children` | Array containing `shelter-folder` or `ShelterFolder` type | `Array<unknown>` |
| Non-identifier keys | — | `pet` and `shelter-folder` schemas normalized to valid identifiers (e.g., `Pet`, `ShelterFolder`, `ShelterFolder`) | Missing or broken |

### 4b. Degradation detection

Search for these patterns on key properties (`items`, `children`, `data`, `shortcuts`):

- `\bitems\b.*\bunknown\b` → degraded (pagination lost)
- `\bitems\b.*\bany\b` → lost (pagination lost, `any` is worse)
- `\bchildren\b.*\bunknown\b` → degraded (recursive type lost)
- `\bchildren\b.*\bany\b` → lost
- `\bdata\b.*\bunknown\b` → degraded (envelope lost)
- `\bdata\b.*\bany\b` → lost

### 4c. Concrete type presence

Check that these type names appear somewhere in the generated output:

- `Pet` or `pet` (normalized)
- `Owner`
- `PaginatedTemplate`
- `ApiEnvelopeTemplate`
- `BaseSpeciesCategory`
- `LocalizedSpeciesCategory`
- `ShelterFolder` or `shelter_folder` or `ShelterFolder`
- `Document`
- `ShelterResource`

### 4d. Fidelity classification

For each pattern, classify as:

| Classification | Meaning |
|---|---|
| **preserved** | Concrete types present, no `unknown`/`any` on key properties |
| **partial** | Some concrete types present but also `unknown`/`any` on some key properties |
| **degraded** | Key properties are `unknown` |
| **lost** | Key properties are `any` |
| **empty** | No generated files or no relevant types found |

### 4e. Typecheck (optional)

If the user wants type safety verification, run `tsc --noEmit` against the generated files:

```bash
npx tsc --noEmit --strict --esModuleInterop --moduleResolution node --target ES2020 --module commonjs --skipLibCheck <generated-ts-files>
```

## Step 5: Report Results

Present a clear summary table:

```
=== $dynamicRef Fixture Test: <gen-id> ===
Source: <what the user provided>
Built from: <commit hash or version>

Pattern                          Fidelity
─────────────────────────────────────────
Generic pagination (Pet[])       PRESERVED
Generic pagination (Owner[])     PRESERVED
Response envelope (single Pet)   PRESERVED
Response envelope (paginated)    DEGRADED
Recursive category tree          PRESERVED
Nested resources (folders)       PARTIAL
Non-identifier key normalization PRESERVED
─────────────────────────────────────────
Overall: 5/7 PRESERVED, 1 DEGRADED, 1 PARTIAL
```

If the generator crashed on any spec, include:

```
CRASH: <scenario> — exit code <code>
  Error: <first line of stderr>
  Full log: <tracker>/logs/<gen-id>-dev-<scenario>.log
```

If you ran the version matrix, also show a per-version table:

```
Scenario                        3.1.0    3.1.1    3.1.2    3.2.0
─────────────────────────────────────────────────────────────────
generic-schema-binding          PASS     PASS     PASS     PASS
paginated-response              PASS     PASS     PASS     PASS
...
```

## Step 6: Ask About Deeper Analysis

After reporting, ask the user:

> "Do you want me to analyze the failures in detail? I can examine the generated code, compare it against expected output, and trace back through the generator's source to identify where `$dynamicRef` resolution breaks down."

If they say yes:

1. Read the generated `.ts` files that failed
2. Identify the specific type that went wrong (e.g., `items: Array<unknown>` instead of `items: Array<User>`)
3. Look at the generator's source code (from the local checkout / cloned repo) to trace how it processes `$dynamicRef` / `$dynamicAnchor`
4. Search the generator's parser/IR/schema code for the relevant handling
5. Suggest specific code changes to fix the issue, referencing file paths and line numbers

## Reference: Fixture Patterns

### Pattern 1 — Generic Pagination (named concrete schemas)

Fixture: `generic-schema-binding.yaml`

```yaml
PaginatedTemplate:
  $defs:
    itemType:
      $dynamicAnchor: itemType
      not: {}
  properties:
    items:
      type: array
      items:
        $dynamicRef: '#itemType'

PaginatedUserResponse:
  $defs:
    itemType:
      $dynamicAnchor: itemType
      $ref: '#/components/schemas/User'
  $ref: '#/components/schemas/PaginatedTemplate'
```

Expected: `PaginatedUserResponse.items` → `Array<User>`, not `Array<unknown>`.

### Pattern 2 — Generic Pagination (inline response binding)

Fixture: `paginated-response.yaml`

```yaml
responses:
  '200':
    content:
      application/json:
        schema:
          $defs:
            itemType:
              $dynamicAnchor: itemType
              $ref: '#/components/schemas/User'
          $ref: '#/components/schemas/PaginatedTemplate'
```

Expected: Response type has `items: Array<User>`, not `Array<unknown>`.

### Pattern 3 — Response Envelope

Fixture: `api-envelope.yaml`

```yaml
ApiEnvelopeTemplate:
  $defs:
    dataType:
      $dynamicAnchor: dataType
      not: {}
  properties:
    data:
      $dynamicRef: '#dataType'
```

Bound at route level with `$defs.dataType.$ref: '#/components/schemas/User'`.

Expected: `data` field has the concrete type, not `unknown`.

### Pattern 4 — Recursive Category Tree

Fixture: `recursive-category-tree.yaml`

```yaml
BaseCategory:
  $dynamicAnchor: category
  properties:
    children:
      items:
        $dynamicRef: '#category'

LocalizedCategory:
  $dynamicAnchor: category
  allOf:
    - $ref: BaseCategory
    - { displayName: string, locale: string }
```

Expected: `LocalizedCategory.children` → `Array<LocalizedCategory>`, not `Array<BaseCategory>` or `Array<unknown>`.

### Pattern 5 — Nested Workspace Resources (multi-parameter generic)

Fixture: `nested-workspace-resources.yaml`

```yaml
FolderTemplate:
  $defs:
    folderType: { $dynamicAnchor: folderType, not: {} }
    resourceType: { $dynamicAnchor: resourceType, not: {} }
  properties:
    children:
      items:
        oneOf:
          - $ref: Document
          - $dynamicRef: '#folderType'
    shortcuts:
      items:
        $dynamicRef: '#resourceType'
```

Expected: `WorkspaceFolder.children` contains `WorkspaceFolder` type, `shortcuts` contains `WorkspaceResource`.

### Pattern 6 — Non-Identifier Schema Keys

Fixture: `non-identifier-schema-key.yaml`

Schema keys like `base-category` and `localized-category` (kebab-case) must be normalized to valid identifiers.

Expected: Generated types use `BaseCategory`, `LocalizedCategory` or similar valid identifiers.

## Known Generator Invocation Patterns

| Generator | CLI invocation (built) | CLI invocation (npx) |
|---|---|---|
| `@hey-api/openapi-ts` | `node <path>/dist/run.mts -i <spec> -o <out> -c @hey-api/client-fetch` | `npx @hey-api/openapi-ts -i <spec> -o <out> -c @hey-api/client-fetch` |
| `orval` | `node <path>/dist/bin/index.js --input <spec> --output ...` | `npx orval --input <spec> --output ...` |
| `openapi-typescript` | `node <path>/dist/index.js <spec> -o <out>` | `npx openapi-typescript <spec> -o <out>` |
| `openapi-typescript-codegen` | `node <path>/bin/index.js -i <spec> -o <out>` | `npx openapi-typescript-codegen -i <spec> -o <out>` |
| `oazapfts` | `node <path>/dist/index.js <spec> <out>` | `npx oazapfts <spec> <out>` |
| `@openapitools/openapi-generator-cli` | N/A (Java wrapper) | `npx @openapitools/openapi-generator-cli generate -i <spec> -g typescript-fetch -o <out>` |
| Kiota | `kiota generate -d <spec> -l typescript -o <out>` | binary only |
| NSwag | `nswag swagger2tsclient /input:<spec> /output:<out>` | binary only |
