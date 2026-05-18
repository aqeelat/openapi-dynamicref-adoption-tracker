# OpenAPI DynamicRef Tooling Tracker

This repository is a public compatibility lab for OpenAPI `$dynamicRef` / `$dynamicAnchor` support in SDK generators, parsers, and validators.

**Goal:** provide reproducible fixtures, CI evidence, upstream issues/PRs, and implementation guidance so tooling maintainers can support dynamic references correctly.

## Current Headline

OpenAPI 3.1.x allows JSON Schema 2020-12 schema objects, and OpenAPI 3.2 explicitly recommends dynamic references for generic/template data structures. In the current matrix, tools still either fail to parse `$dynamicAnchor`, generate syntactically valid but semantically degraded output (e.g., `unknown`, `any`, or `Object`), lose dynamic scope resolution for recursive types, or materialize generic/template patterns as duplicate concrete types instead of reusable parameterized types.

Generator and typecheck failures in this repo are **report-only** because those failures are the compatibility data. Fixture validity and generated spec freshness are the CI gates.

## Adoption Strategy

This project currently tests SDK generators and type emitters, but `$dynamicRef` adoption requires work across the OpenAPI ecosystem: SDK generators, parsers/bundlers, runtime validators, spec producers, and documentation renderers.

SDK generators are the first priority because they are where users see broken output directly. Spec producers such as `@nx/swagger` should start adding `$dynamicRef` emission support, but behind explicit opt-in flags until downstream SDK generator support is reliable.

See [State of the Union](state-of-the-union.md) for the detailed strategy.

## Fixtures

Top-level fixtures feed the SDK generator matrix:

| Fixture | Purpose |
|---|---|
| `baseline-duplicated-pagination.yaml` | Control case with duplicated concrete paginated wrappers |
| `generic-schema-binding.yaml` | Generic pagination with named concrete schemas |
| `paginated-response.yaml` | Generic pagination with inline response-level binding |
| `api-envelope.yaml` | Generic response envelope with inline route-level binding |
| `recursive-category-tree.yaml` | Recursive dynamic override using `$dynamicAnchor: category` |
| `nested-workspace-resources.yaml` | Multi-parameter generic template for nested folder/resource graphs |
| `non-identifier-schema-key.yaml` | Recursive dynamic override with schema keys that need generated identifier normalization |

A combined showcase fixture, [`petstore-dynamicref-showcase.yaml`](petstore-dynamicref-showcase.yaml), exercises all `$dynamicRef` patterns together (generic pagination, response envelopes, nested generics, recursive trees, multi-parameter generic templates, non-identifier keys, typed request/response bodies) and is intended for SDK samples and maintainer demos.

Focused semantics fixtures live under `fixtures/spec-semantics/`. They cover JSON Schema behaviors that are important for parser/validator correctness but are intentionally kept out of the SDK matrix.

See [fixtures/README.md](fixtures/README.md) for validation methodology and runtime validator results.

## Matrix Tools

The current TypeScript-oriented matrix covers:

- Orval
- OpenAPI Generator
- Swagger Codegen v3
- openapi-typescript
- @hey-api/openapi-ts
- openapi-typescript-codegen
- oazapfts
- Kiota
- NSwag

Tool package versions are pinned in [package.json](package.json) and generator commands are pinned in [scripts/matrix-runner.mjs](scripts/matrix-runner.mjs).

## Documentation

- [Runbook](RUNBOOK.md) — reproduction commands, CI behavior, artifacts, and local matrix usage
- [Fixture Guide](fixtures/README.md) — fixture catalog and validation methodology
- [State of the Union](state-of-the-union.md) — detailed compatibility snapshot and recommendations
- [Implementation Guide](IMPLEMENTATION_GUIDE.md) — playbook for adding `$dynamicRef` support to a generator
- [SDK Generators Catalog](SDK_GENERATORS_CATALOG.md) — generator catalog for future expansion

## Tracking Work

Repository-local tracking belongs in GitHub Issues and Projects, not in long-lived README tables. Use the issue templates for generator tracking, fixture gaps, and CI/infrastructure work.

Upstream issue/PR links should be recorded in the relevant local tracking issue, with short generated-type excerpts or parser errors as evidence.

Project board setup is tracked in [#15](https://github.com/aqeelat/openapi-dynamicref-adoption-tracker/issues/15) until the GitHub token has the required Projects scopes.

## Contributing

- Keep fixtures reproducible and scriptable.
- Do not edit generated specs directly.
- Include summarized evidence inline instead of raw logs.
- Add tool/version metadata when updating compatibility results.
- Prefer new fixtures or matrix cells over broad unsupported claims.
