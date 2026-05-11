# DynamicRef State of the Union

## Executive Summary

- This repo tests OpenAPI polymorphism via JSON Schema `$dynamicRef`/`$dynamicAnchor` in a generic pagination wrapper.
- We ran a version matrix across OAS `3.1.0`, `3.1.1`, `3.1.2`, and `3.2.0` using Orval, OpenAPI Generator, and Swagger Codegen.
- For `3.1.x`, generation mostly succeeds but emitted SDK types are degraded for dynamic-ref item typing.
- For `3.2.0`, support diverges significantly: Orval generates, OpenAPI Generator and Swagger Codegen fail at parse/validation.

## What We Tested

- Specs:
  - `specs/sample-schema-oas-3.1.0.yaml`
  - `specs/sample-schema-oas-3.1.1.yaml`
  - `specs/sample-schema-oas-3.1.2.yaml`
  - `specs/sample-schema-oas-3.2.0.yaml`
- Common schema pattern:
  - `PaginatedTemplate.items` uses `$dynamicRef: '#itemType'`
  - `PaginatedAssetResponse` / `PaginatedUserResponse` bind `itemType` with `$dynamicAnchor`
- Tools:
  - Orval `v8.9.1`
  - OpenAPI Generator CLI `7.22.0` (`typescript-fetch`)
  - Swagger Codegen CLI v3 Docker (`typescript-fetch`)

## Generation Matrix

| Tool | OAS 3.1.0 | OAS 3.1.1 | OAS 3.1.2 | OAS 3.2.0 |
|---|---|---|---|---|
| Orval | Pass | Pass | Pass | Pass |
| OpenAPI Generator | Pass | Pass | Pass | Fail |
| Swagger Codegen v3 | Pass | Pass | Pass | Fail |

Notable failure behavior:

- OpenAPI Generator `3.2.0`: parse/validation failure, reports `openapi` as unexpected and expects Swagger 2 style attributes (`logs/openapi-generator-3.2.0.log`).
- Swagger Codegen `3.2.0`: parser fails early with `missing OpenAPI input!` after `SwaggerCompatConverter` errors (`logs/swagger-codegen-3.2.0.log`).

## Typecheck Matrix (`tsc --noEmit --strict`)

| Tool | OAS 3.1.0 | OAS 3.1.1 | OAS 3.1.2 | OAS 3.2.0 |
|---|---|---|---|---|
| Orval | Pass | Pass | Pass | Pass |
| OpenAPI Generator | Pass | Pass | Pass | N/A (generation failed) |
| Swagger Codegen v3 | Fail | Fail | Fail | N/A (generation failed) |

Swagger strict failure (all `3.1.x`):

- `generated/swagger-codegen/<version>/api.ts(57,15): TS2564 Property 'configuration' has no initializer...`

## Type Quality Findings (DynamicRef Polymorphism)

Across successful generation runs, no tested tool emits robust item-typed wrappers from `$dynamicRef`:

- Orval: `items` remains `unknown[]` in `PaginatedTemplate` (`generated/orval/3.2.0/model/paginatedTemplate.ts`).
- OpenAPI Generator: `items` becomes `Array<any>` and wrapper shape is flattened with item fields (`generated/openapi-generator/3.1.2/models/PaginatedAssetResponse.ts`).
- Swagger Codegen: wrappers degrade to `any` (`generated/swagger-codegen/3.1.2/api.ts`).

## Rubric Scores

Per `(tool, version)` quality grade:

- Orval: **B** for `3.1.0`, `3.1.1`, `3.1.2`, `3.2.0` (generates + typechecks, degraded type fidelity)
- OpenAPI Generator: **B** for `3.1.0`, `3.1.1`, `3.1.2`; **D** for `3.2.0` (generation failure)
- Swagger Codegen: **D** for all tested versions (degraded output + strict compile failures for `3.1.x`, generation failure for `3.2.0`)

## Recommendation

- Today: ship duplicated concrete wrappers or hybrid dual-output mode in production SDK pipelines.
- Parallel track: use this repo to file focused issues/PRs on dynamic-ref support in parsers and generators.
- Compatibility stance: treat `3.2.0` as opt-in experimental until parser/generator support improves.

## Logs and Artifacts

- Orval matrix log: `logs/orval-matrix.log`
- OpenAPI Generator logs:
  - `logs/openapi-generator-3.1.0.log`
  - `logs/openapi-generator-3.1.1.log`
  - `logs/openapi-generator-3.1.2.log`
  - `logs/openapi-generator-3.2.0.log`
- Swagger Codegen logs:
  - `logs/swagger-codegen-3.1.0.log`
  - `logs/swagger-codegen-3.1.1.log`
  - `logs/swagger-codegen-3.1.2.log`
  - `logs/swagger-codegen-3.2.0.log`
- Typecheck logs:
  - `logs/typecheck-orval-3.1.0.log`
  - `logs/typecheck-orval-3.1.1.log`
  - `logs/typecheck-orval-3.1.2.log`
  - `logs/typecheck-orval-3.2.0.log`
  - `logs/typecheck-openapi-generator-3.1.0.log`
  - `logs/typecheck-openapi-generator-3.1.1.log`
  - `logs/typecheck-openapi-generator-3.1.2.log`
  - `logs/typecheck-openapi-generator-3.2.0.log`
  - `logs/typecheck-swagger-codegen-3.1.0.log`
  - `logs/typecheck-swagger-codegen-3.1.1.log`
  - `logs/typecheck-swagger-codegen-3.1.2.log`
  - `logs/typecheck-swagger-codegen-3.2.0.log`
