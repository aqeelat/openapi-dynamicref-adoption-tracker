# OpenAPI DynamicRef Tooling Tracker

This repository is a public compatibility lab for OpenAPI `$dynamicRef` / `$dynamicAnchor` support in SDK generators.

Goal: provide reproducible evidence, open issues/PRs, and help tooling maintainers implement dynamic references correctly.

## Why this matters

Many APIs model reusable wrappers (for example paginated responses) that should preserve concrete item types.

With OAS + JSON Schema polymorphism, there are two broad approaches:

- Explicit concrete schemas (duplicated wrappers like `PaginatedAssetResponse`, `PaginatedUserResponse`)
- Dynamic polymorphism (`$dynamicRef` + `$dynamicAnchor`) to avoid duplication and encode template-like behavior

Today, explicit wrappers are broadly supported by generators. Dynamic refs are standards-aligned but unevenly implemented.

## Current Results

- Full report: `state-of-the-union.md`
- Runbook/process doc: `RUNBOOK.md`
- Versioned specs under test:
  - `specs/sample-schema-oas-3.1.0.yaml`
  - `specs/sample-schema-oas-3.1.1.yaml`
  - `specs/sample-schema-oas-3.1.2.yaml`
  - `specs/sample-schema-oas-3.2.0.yaml`

Quick snapshot:

- Orval: generates all tested versions, but dynamic-ref item typing remains degraded.
- OpenAPI Generator: works for `3.1.x`, fails for `3.2.0` in this setup.
- Swagger Codegen v3: generation/type quality is degraded; `3.2.0` fails.

## Available SDK Generators (cataloged)

We captured tool-provided generator catalogs:

- OpenAPI Generator list: `logs/openapi-generator-generators.log`
- Swagger Codegen list: `logs/swagger-codegen-langs.log`
- Consolidated catalog file: `SDK_GENERATORS_CATALOG.md`

TypeScript-relevant examples in those catalogs include:

- `typescript-fetch`
- `typescript-axios`
- `typescript-angular`
- `typescript`
- `javascript`

## Community Action Plan

- Open focused issues with minimal reproducible specs from `specs/`.
- Submit parser/codegen PRs to support `$dynamicRef` resolution and correct type emission.
- Add more tools to the matrix (`openapi-typescript-codegen`, `oazapfts`, `@hey-api/openapi-ts`, AutoRest, NSwag, Kiota).
- Re-run this matrix after each fix and update `state-of-the-union.md`.

## Contributing

- Keep changes reproducible and scriptable.
- Preserve full logs in `logs/` for failures.
- Add tool/version metadata to reports.
- Prefer adding new test cases/spec variants over hand-wavy conclusions.
