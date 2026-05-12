# Runbook: Two-Stage Validation and SDK Generation Pipeline

## Prerequisites

- Node.js (v18+)
- Docker (for Swagger Codegen v3)
- `uv` for `openapi-spec-validator` (`brew install uv` or see https://docs.astral.sh/uv/)

Install local dependencies:

```bash
npm install --no-save js-yaml
```

## Pipeline Overview

The repo has two independent stages:

| Stage | When to run | Entry point | What it does |
|---|---|---|---|
| **Stage 1: Validate & Build** | After changing any fixture in `fixtures/` | `scripts/validate-and-build.sh` | Validates fixtures with OpenAPI doc validators, then regenerates `specs/` |
| **Stage 2: SDK Matrix** | After changing generator versions, or after Stage 1 | `scripts/run-matrix.sh` | Generates SDKs from specs and runs strict typecheck |

## Stage 1: Validate & Build

Run after changing any file in `fixtures/`:

```bash
./scripts/validate-and-build.sh
```

This runs:

1. **OpenAPI document validation** (`scripts/validate-openapi.sh`) — Redocly, openapi-spec-validator, Spectral, swagger-cli
2. **Spec generation** (`scripts/build-specs.mjs`) — regenerates `specs/<fixture>/oas-<version>.json` from all fixtures

Specs are always rebuilt, even if validation fails. The exit code reflects validation status (non-zero if any validator failed).

Expected result: all fixtures pass all four OpenAPI document validators.

## Stage 2: Run the SDK Generation Matrix

Run after Stage 1, or when testing against new generator versions:

```bash
./scripts/run-matrix.sh
```

This generates SDKs from `specs/<fixture>/oas-<version>.json` using:

- Orval v8.9.1 (TypeScript fetch)
- OpenAPI Generator v7.22.0 (`typescript-fetch`)
- Swagger Codegen v3 (Docker, `typescript-fetch`)

Then runs strict TypeScript typecheck on all generated output.

Logs go to `logs/`, generated output to `generated/`. Both are gitignored local artifacts.

## Inspect Generated Types

Check whether generated models preserve concrete dynamicRef types:

```bash
grep -n "items\|children" generated/orval/generic-schema-binding/3.1.2/model/paginatedTemplate.ts
grep -n "items\|children" generated/orval/recursive-category-tree/3.1.2/model/baseCategory.ts
grep -n "items\|children" generated/orval/nested-workspace-resources/3.1.2/model/baseFolder.ts
```

For dynamicRef fixtures, the desired result is concrete types (e.g., `items: User[]`, `children: Category[]`). Current generator output degrades to `unknown[]`, `Array<any>`, or `any`.

## Optional: JSON Schema Runtime Validation

For investigating `$dynamicRef` runtime resolution behavior (AJV, Hyperjump):

```bash
npm install --no-save ajv @hyperjump/json-schema
node scripts/validate-jsonschema.mjs
```

This is a standalone research tool — not part of the pipeline. Results are documented in `validation/results.md`.

## Tool Versions

| Tool | Version | Generator |
|---|---|---|
| Orval | v8.9.1 | fetch |
| OpenAPI Generator CLI | 7.22.0 | typescript-fetch |
| Swagger Codegen CLI v3 | Docker image `swaggerapi/swagger-codegen-cli-v3` | typescript-fetch |

## Updating Results

After running either stage:

1. Update `README.md` results tables with new pass/fail statuses
2. Update `state-of-the-union.md` with any new findings
3. Update the Outreach table if issues/PRs are involved
4. Include inline excerpts of generated types as evidence (do not commit raw logs)
