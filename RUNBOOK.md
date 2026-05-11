# Runbook: Validating Fixtures and Rerunning the SDK Matrix

This document explains how to reproduce the validation and SDK generation results tracked in this repo.

## Prerequisites

- Node.js (v18+)
- Docker (for Swagger Codegen v3)
- npm or bun
- `uv` for `openapi-spec-validator` (`brew install uv` or see https://docs.astral.sh/uv/)

Install local validation dependencies:

```bash
npm install --no-save ajv js-yaml @hyperjump/json-schema
```

## Step 0: Build Versioned Specs

Fixtures under `fixtures/` are the authored source-of-truth scenarios. Generated specs under `specs/` are derived from fixtures for each OAS version.

```bash
node scripts/build-specs.mjs
```

## Step 1: Validate OpenAPI Documents

Run all OpenAPI document validators:

```bash
./scripts/validate-openapi.sh
```

This runs:

```bash
npx --yes @redocly/cli lint <fixture>
uvx openapi-spec-validator <fixture>
npx --yes @stoplight/spectral-cli lint <fixture>
npx --yes @apidevtools/swagger-cli validate <fixture>
```

Expected current result: all fixtures pass all four OpenAPI document validators.

## Step 2: Validate JSON Schema Runtime Behavior

Run JSON Schema runtime checks:

```bash
node scripts/validate-jsonschema.mjs
```

Expected current result:

| Fixture | Runtime Result |
|---|---|
| `baseline-duplicated-pagination.yaml` | AJV passes |
| `paginated-generic.yaml` | AJV fails valid user/group pages; Hyperjump passes valid/invalid user and group cases |
| `recursive-category-tree.yaml` | AJV passes |
| `nested-workspace-resources.yaml` | AJV passes |

## Step 3: Run All Fixture Validators

```bash
./scripts/validate-fixtures.sh
```

This runs both the OpenAPI document validators and JSON Schema runtime checks.

## Step 4: Run the Current SDK Generation Matrix

The SDK matrix uses generated specs under `specs/<fixture>/oas-<version>.json`.

```bash
./scripts/run-matrix.sh
```

Logs go to `logs/`, generated output to `generated/`. Both are gitignored local artifacts.

## Step 5: Inspect Generated Types

Check whether generated models preserve concrete dynamicRef types:

```bash
# Orval
grep -n "items" generated/orval/paginated-generic/3.1.2/model/paginatedTemplate.ts

# OpenAPI Generator
grep -n "items" generated/openapi-generator/paginated-generic/3.1.2/models/PaginatedUserResponse.ts

# Swagger Codegen
grep -n "items" generated/swagger-codegen/paginated-generic/3.1.2/api.ts
```

For the pagination generic fixture, the desired result is `items: User[]` for user pages and `items: Group[]` for group pages. Current generator output degrades to `unknown[]`, `Array<any>`, or `any`.

## Tool Versions

These are the versions used for the initial SDK matrix:

| Tool | Version | Generator |
|---|---|---|
| Orval | v8.9.1 | fetch |
| OpenAPI Generator CLI | 7.22.0 | typescript-fetch |
| Swagger Codegen CLI v3 | Docker image `swaggerapi/swagger-codegen-cli-v3` | typescript-fetch |

## Updating Results

After running validation or generation:

1. Update `README.md` results tables with new pass/fail statuses
2. Update `state-of-the-union.md` with any new findings
3. Update the Outreach table if issues/PRs are involved
4. Include inline excerpts of generated types as evidence (do not commit raw logs)
