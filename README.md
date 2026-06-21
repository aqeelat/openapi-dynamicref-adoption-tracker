# OpenAPI DynamicRef Tooling Tracker

This repository is a public compatibility lab for OpenAPI `$dynamicRef` / `$dynamicAnchor` support in SDK generators, parsers, and validators.

**Goal:** provide reproducible fixtures, CI evidence, upstream issues/PRs, and implementation guidance so tooling maintainers can support dynamic references correctly.

## Current Headline

OpenAPI 3.1.x allows JSON Schema 2020-12 schema objects, and OpenAPI 3.2 explicitly recommends dynamic references for generic/template data structures. **Orval v8.13.0** is the first matrix-tested SDK generator to preserve `$dynamicRef` type fidelity across all 7 fixtures and all 4 OAS versions (3.1.0–3.2.0), emitting generic interfaces (`PaginatedTemplate<T>`) and bound aliases (`type PaginatedUserResponse = PaginatedTemplate<User>`) instead of degrading to `unknown`/`any`.

Other matrix tools still either fail to parse `$dynamicAnchor`, generate syntactically valid but semantically degraded output (e.g., `unknown`, `any`, or `Object`), lose dynamic scope resolution for recursive types, or materialize generic/template patterns as duplicate concrete types instead of reusable parameterized types.

Generator and typecheck failures in this repo are **report-only** because those failures are the compatibility data. Fixture validity and generated spec freshness are the CI gates.

## Adoption Strategy

This project currently tests SDK generators and type emitters, but `$dynamicRef` adoption requires work across the OpenAPI ecosystem: SDK generators, parsers/bundlers, runtime validators, spec producers, and documentation renderers.

SDK generators are the first priority because they are where users see broken output directly. Spec producers such as `@nx/swagger` should start adding `$dynamicRef` emission support, but behind explicit opt-in flags until downstream SDK generator support is reliable.

See [State of the Union](state-of-the-union.md) for the detailed strategy.

## Ecosystem Catalog

Beyond the SDK-generator matrix above, [`TOOLING_CATALOG.md`](TOOLING_CATALOG.md) tracks `$dynamicRef` relevance across the **whole ecosystem** — parsers/resolvers, runtime validators, linters, documentation renderers, spec producers, API clients, and mock servers — with per-tool status, priority, and blocked-by/backed-by dependencies. Each tool has a deep analysis at `analysis/<tool>.md`.

**Methodology:** analyses are **fixtures-first** — runnable tools are run against the fixture suite before source archaeology (see `.opencode/commands/analyze-tool.md`). Producers (non-runnable) are source-first.

**Reference implementation:** [Orval](analysis/orval-reference.md) is the blueprint for generic-type emission. The catalog's guiding principle is that **generic-type emission is achievable** (Orval proves it) — analyses design real Orval-modeled implementation paths, not "materialize concrete types" workarounds.

### Correct implementations (pass the fixtures / official suite)
- **Generators:** Orval (PR [#3353](https://github.com/orval-labs/orval/pull/3353)).
- **Validators:** Hyperjump, networknt (Java), jsonschema-rs (Rust), Opis (PHP), Boon (Rust), santhosh-tekuri/jsonschema (Go) — all pass the official JSON-Schema-Test-Suite for draft 2020-12.
- **Parsers/bundlers:** libopenapi (Go), Redocly CLI, Spectral, openapi-spec-validator.
- **Linters/diff:** vacuum, oasdiff (both Correct, fixture-verified).

### In-flight upstream work
- **OpenAPIKit #501** (`mattpolzin/OpenAPIKit`) — adds `$dynamicRef` to the Swift document model. Keystone — unblocks `swift-openapi-generator` #547.
- **swagger-parser #2332** (`swagger-api/swagger-parser`) — preserve `$dynamicRef`/`$dynamicAnchor` in the OAS 3.1 dereferencer. **Verified insufficient for the generic-binding pattern** (swagger-core collapses `$ref` schemas to reference-only); needs a companion swagger-core `$ref`-sibling fix. See `analysis/swagger-parser.md`.
- **AJV #2615** — fixes the validator's generic pagination/wrapper resolution gaps. Highest-impact unmerged JS-ecosystem fix.

The prioritized implementation queue (Ready + Blocked) is in `queue.md` (local, gitignored).

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

- **Orval** — `$dynamicRef` preserved (v8.13.0+)
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

- **[AGENTS.md](AGENTS.md)** — read this first if you're an agent working in this repo (project guide, methodology, current focus).
- [Tooling Catalog](TOOLING_CATALOG.md) — ecosystem-wide `$dynamicRef` status matrix (parsers, validators, linters, renderers, generators, producers, clients, mocks).
- [Runbook](RUNBOOK.md) — reproduction commands, CI behavior, artifacts, and local matrix usage
- [Fixture Guide](fixtures/README.md) — fixture catalog and validation methodology
- [State of the Union](state-of-the-union.md) — detailed compatibility snapshot and recommendations
- [Implementation Guide](IMPLEMENTATION_GUIDE.md) — playbook for adding `$dynamicRef` support to a generator (incl. Orval reference section)
- [Orval Reference](analysis/orval-reference.md) — the generic-type-emission blueprint
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
