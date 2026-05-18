# Runbook: SDK Generator Matrix Pipeline

## Prerequisites

- Node.js (v22 in CI; v20+ locally)
- Docker (for Swagger Codegen v3; optional for other tools)
- `uv` for `openapi-spec-validator` (`brew install uv` or see https://docs.astral.sh/uv/)

Install pinned local dependencies:

```bash
npm ci
```

Optional tools (installed on-demand, skipped if unavailable):

- **Kiota**: `dotnet tool install -g Microsoft.OpenApi.Kiota` or `curl -L https://aka.ms/kiota/install | bash`
- **NSwag**: `dotnet tool install -g NSwag.GlobalTool`

## Pipeline Overview

| Stage | When to run | Entry point | What it does |
|---|---|---|---|
| **Stage 1: Validate & Build** | After changing any fixture in `fixtures/` | `scripts/validate-and-build.sh` | Validates fixtures, regenerates `specs/` |
| **Stage 2: SDK Matrix** | After changing generator versions, or after Stage 1 | `scripts/run-matrix.sh` | Generates SDKs, typechecks, analyzes type quality |

## Stage 1: Validate & Build

```bash
npm run validate:fixtures
```

1. **OpenAPI document validation** — Redocly, openapi-spec-validator, Spectral, swagger-cli
2. **Spec generation** — regenerates `specs/<fixture>/oas-<version>.json`

CI also checks `git diff --exit-code -- specs/` after Stage 1. Fixture validity and generated spec freshness are gating checks.

## Stage 2: Run the SDK Generation Matrix

```bash
npm run matrix
```

Runs all 9 generators × 7 scenarios × 4 OAS versions in parallel (default: 8 workers). Generators that aren't installed are skipped with a clear message.

### Generators in the Matrix

| Tool | Runtime | Notes |
|---|---|---|
| Orval | npx | Uses `orval.config.ts` with `--project` |
| OpenAPI Generator | npx | `typescript-fetch` generator |
| Swagger Codegen v3 | Docker | `typescript-fetch` generator |
| openapi-typescript | npx | Generates `.d.ts` only (no client) |
| @hey-api/openapi-ts | npx | Modern TS SDK + types |
| openapi-typescript-codegen | npx | Full TS client SDK |
| oazapfts | npx | Single-file TS client |
| Kiota (Microsoft) | binary | Requires install (see Prerequisites) |
| NSwag | binary | Requires install (see Prerequisites) |

### CLI Options

```bash
# Run full matrix
./scripts/run-matrix.sh

# Run specific tools/scenarios/versions
node scripts/matrix-runner.mjs --tools=orval,openapi-typescript --scenarios=generic-schema-binding

# Adjust parallelism
MATRIX_CONCURRENCY=4 ./scripts/run-matrix.sh
node scripts/matrix-runner.mjs --concurrency=2

# Skip phases
node scripts/matrix-runner.mjs --no-typecheck --no-analysis

# Dry run (show jobs without executing)
node scripts/matrix-runner.mjs --dry-run
```

### Output

- `generated/<tool>/<scenario>/<version>/` — Generated SDK output
- `logs/<tool>-<scenario>-<version>.log` — Generation logs
- `logs/typecheck-<tool>-<scenario>-<version>.log` — Typecheck logs
- `logs/matrix-results.json` — Structured results (all cells)

### Results Tables

The runner prints four tables:

1. **Generation Results** — OK/FAIL/SKIP per cell
2. **Typecheck Results** — PASS/FAIL per cell
3. **Type Quality** — PRESERVED/PARTIAL/DEGRADED/LOST/EMPTY per cell
4. **Summary** — Counts and skipped tool info

## CI: GitHub Actions Matrix

Push to `main` or open a PR to trigger `.github/workflows/matrix.yml`, which runs each (tool, scenario, version) cell as a separate parallel GitHub Actions job. This gives:

- Full parallelism across GitHub runners
- Visual pass/fail matrix in the Actions UI
- Generated output as downloadable artifacts
- Summary posted to the workflow run page

Generator and strict TypeScript failures are report-only in CI. They are captured in summaries and artifacts but do not fail the workflow. Fixture validation and generated spec freshness fail the workflow.

Manual dispatch accepts optional comma-separated filters:

```text
tools=orval,openapi-typescript
scenarios=generic-schema-binding,recursive-category-tree
```

## Inspect Generated Types

```bash
grep -n "items\|children" generated/orval/generic-schema-binding/3.1.2/model/paginatedTemplate.ts
grep -n "items\|children" generated/orval/recursive-category-tree/3.1.2/model/baseCategory.ts
grep -n "children\|shortcuts" generated/orval/nested-workspace-resources/3.1.2/model/folderTemplate.ts
grep -n "data" generated/orval/api-envelope/3.1.2/model/apiEnvelopeTemplate.ts
```

For dynamicRef fixtures, the desired result depends on fixture category:
- **Recursive/nested fixtures:** dynamic refs must resolve to the correct active type through dynamic scope (e.g., `children: LocalizedCategory[]`, not `children: unknown[]`).
- **Generic/template fixtures:** generators must emit reusable parameterized types when the target language supports generics (e.g., `PaginatedTemplate<T>` with `PaginatedUserResponse = PaginatedTemplate<User>`). Concrete duplicate wrappers do not pass validation for these fixtures — the point of `$dynamicRef` for generics is type reuse. Current generator output degrades to `unknown[]`, `Array<any>`, `any`, or materializes duplicates instead of parameterized types.

## Optional: JSON Schema Runtime Validation

```bash
npm run validate:jsonschema
```

Standalone research tool — not part of the pipeline.

## Updating Results

After running either stage:

1. Update `README.md` results tables with new pass/fail statuses
2. Update `fixtures/README.md` if fixture validation behavior changed
3. Update `state-of-the-union.md` with any new findings
4. Update or create the relevant GitHub tracking issue if issues/PRs are involved
5. Include inline excerpts of generated types as evidence (do not commit raw logs)
