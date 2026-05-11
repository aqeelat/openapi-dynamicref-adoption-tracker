# OpenAPI DynamicRef Tooling Tracker

This repository is a public compatibility lab for OpenAPI `$dynamicRef` / `$dynamicAnchor` support in SDK generators.

**Goal:** provide reproducible evidence, open issues/PRs, and help tooling maintainers implement dynamic references correctly.

## Why This Matters

Many APIs model reusable wrappers (for example paginated responses) that should preserve concrete item types.

With OAS + JSON Schema polymorphism, there are two broad approaches:

- **Explicit concrete schemas** — duplicated wrappers like `PaginatedUserResponse`, `PaginatedGroupResponse`. Broadly supported today.
- **Dynamic polymorphism** — `$dynamicRef` + `$dynamicAnchor` to avoid duplication and encode template-like behavior. Standards-aligned but unevenly implemented.

Reference context:

- OAI issue: [Recommend describing templates/generic types using `$dynamicRef`](https://github.com/OAI/OpenAPI-Specification/issues/3601)
- JSON Schema article: [Using Dynamic References to Support Generic Types](https://json-schema.org/blog/posts/dynamicref-and-generics)

The schema patterns under test:

```
BaseCategory.children   → $dynamicRef: '#category'
LocalizedCategory       → overrides category with $dynamicAnchor
BaseFolder.children     → nested $dynamicRef: '#folder'
BaseFolder.shortcuts    → second $dynamicRef: '#resource'
PaginatedTemplate.items → generic $dynamicRef: '#itemType'
```

## 📊 Results

### Fixture Validation Matrix

Legend: 🟢 pass · 🔴 fail · ⚠️ mixed validator support

| Fixture | OpenAPI Validators | Runtime Validators | Status |
|---|---|---|---|
| `baseline-duplicated-pagination.yaml` | 🟢 Redocly / openapi-spec-validator / Spectral / swagger-cli | 🟢 valid + invalid instances behave as expected | Control |
| `paginated-generic.yaml` | 🟢 Redocly / openapi-spec-validator / Spectral / swagger-cli | 🟢 Hyperjump validates generic binding / 🔴 AJV does not | ⚠️ Mixed validator support |
| `recursive-category-tree.yaml` | 🟢 Redocly / openapi-spec-validator / Spectral / swagger-cli | 🟢 validates dynamic recursive override | Validated dynamicRef |
| `nested-workspace-resources.yaml` | 🟢 Redocly / openapi-spec-validator / Spectral / swagger-cli | 🟢 validates nested + multiple `$dynamicRef` anchors | Validated dynamicRef |

### TypeScript SDK Matrix

Initial SDK generation results across all 4 fixtures × 3 generators × 4 OAS versions. Re-run the matrix after fixture changes with `scripts/run-matrix.sh`.

#### Generation

| Scenario | Orval v8.9.1 | OpenAPI Generator v7.22.0 | Swagger Codegen v3 |
|---|---|---|---|
| baseline 3.1.x | OK | OK | OK |
| baseline 3.2.0 | OK | FAIL | OK |
| paginated-generic 3.1.x | OK | FAIL | OK |
| paginated-generic 3.2.0 | OK | FAIL | OK |
| recursive-category-tree 3.1.x | OK | FAIL | OK |
| recursive-category-tree 3.2.0 | OK | FAIL | OK |
| nested-workspace 3.1.x | OK | FAIL | OK |
| nested-workspace 3.2.0 | OK | FAIL | OK |

OpenAPI Generator fails on all dynamicRef fixtures: `Could not find /components/schemas/<SchemaName>` — parser cannot resolve schemas containing `$dynamicAnchor`.

#### Strict Typecheck

| Scenario | Orval | OpenAPI Generator | Swagger Codegen |
|---|---|---|---|
| baseline 3.1.x | PASS | PASS | FAIL (strict) |
| all dynamicRef 3.1.x | PASS | N/A (gen failed) | FAIL (strict) |

#### DynamicRef Type Fidelity

No tested tool preserves `$dynamicRef` semantics:

| Tool | DynamicRef Resolution | Example Output |
|---|---|---|
| Orval | Resolves to fallback anchor | `items: unknown[]`, `children: unknown[]` |
| OpenAPI Generator | Cannot parse specs with `$dynamicAnchor` | Parser error before codegen |
| Swagger Codegen | Emits empty interfaces | `interface PaginatedUserResponse {}` |

### ⚠️ Type Quality Findings

| Tool | `items` type emitted | Notes |
|---|---|---|
| Orval | `unknown[]` | `PaginatedTemplate.items` stays generic; concrete override lost |
| OpenAPI Generator | N/A | Fails to parse specs containing `$dynamicAnchor` |
| Swagger Codegen | `any` | Wrappers fully degraded; empty interfaces |

### 🔴 Notable Failures

- **OpenAPI Generator + all dynamicRef fixtures** — `SpecValidationException: Could not find /components/schemas/<name>` — parser-level `$dynamicAnchor` resolution gap
- **OpenAPI Generator + 3.2.0** — even baseline fails: `openapi` version unexpected
- **Swagger Codegen + 3.1.x strict TSC** — `Property 'configuration' has no initializer`, missing test type defs
- **Swagger Codegen + 3.2.0** — parser fails with `missing OpenAPI input!` after `SwaggerCompatConverter` errors

### ⚠️ Pagination Generic Caveat

The pagination/generic-wrapper fixture follows the JSON Schema generics pattern described in the OAI issue and JSON Schema article. It passes Hyperjump runtime validation, but AJV still resolves it incorrectly. Treat this as mixed validator support and include both results when discussing the fixture upstream.

## 📁 Repository Structure

```
fixtures/                      Authored source-of-truth scenarios
  baseline-duplicated-pagination.yaml
  paginated-generic.yaml
  recursive-category-tree.yaml
  nested-workspace-resources.yaml
specs/                         Generated OAS-version matrix specs
  <fixture>/oas-<version>.json
scripts/
  build-specs.mjs              Generates specs/ from fixtures/
  run-matrix.sh                Full generation + typecheck matrix runner
  validate-fixtures.sh         Runs OpenAPI + JSON Schema fixture validators
  validate-openapi.sh          Runs Redocly, openapi-spec-validator, Spectral, swagger-cli
  validate-jsonschema.mjs      Runs AJV 2020 and Hyperjump runtime validation checks
validation/                    Validation notes and results
LICENSE                        MIT
orval.config.ts                Orval generation matrix config
IMPLEMENTATION_GUIDE.md        Agent playbook for fixing generators
state-of-the-union.md          Full detailed report
RUNBOOK.md                     How to rerun the matrix
SDK_GENERATORS_CATALOG.md      Catalog of all available generators (161+ tools)
```

> `generated/` and `logs/` are produced locally by running the matrix but are gitignored — see `RUNBOOK.md` for how to reproduce them, or run `scripts/run-matrix.sh`.

## 📋 Fixtures Under Test

- `fixtures/baseline-duplicated-pagination.yaml`
- `fixtures/paginated-generic.yaml`
- `fixtures/recursive-category-tree.yaml`
- `fixtures/nested-workspace-resources.yaml`

Versioned specs are generated from fixtures into `specs/<fixture>/oas-<version>.json`. Do not edit generated specs directly.

## 📄 Documentation

- 📜 **[Full Report](state-of-the-union.md)** — detailed findings, validation matrix, and recommendations
- 📖 **[Runbook](RUNBOOK.md)** — exact reproduction commands and local artifact generation
- ✅ **[Validation Results](validation/results.md)** — current OpenAPI + JSON Schema fixture validation status
- 🔧 **[Implementation Guide](IMPLEMENTATION_GUIDE.md)** — step-by-step playbook for adding `$dynamicRef` support to any generator
- 📚 **[SDK Generators Catalog](SDK_GENERATORS_CATALOG.md)** — 161+ generators from OpenAPI Generator + 41 from Swagger Codegen v3

## 🗺️ Community Action Plan

- [x] Add validator-backed recursive and complex nested `$dynamicRef` fixtures
- [x] Add a pagination/generic-wrapper `$dynamicRef` fixture based on the JSON Schema generics pattern
- [x] Run SDK generator matrix against all 4 fixtures (Orval, OpenAPI Generator, Swagger Codegen)
- [ ] Investigate AJV's behavior on the pagination/generic-wrapper fixture
- [ ] Add more TypeScript tools (`openapi-typescript-codegen`, `oazapfts`, `@hey-api/openapi-ts`)
- [ ] Add non-TypeScript generators (Java, C#, Python, Go, Rust, Kotlin, Swift, AutoRest, NSwag, Kiota)
- [ ] Open focused upstream issues with validator-backed fixtures; include disagreement details for mixed-support fixtures

See the **[Implementation Guide](IMPLEMENTATION_GUIDE.md)** for a step-by-step playbook to implement `$dynamicRef` support in any generator. Use validator-backed fixtures first; include validator disagreement when using mixed-support fixtures.

## 📢 Outreach

Issues and PRs opened in upstream generator repos.

| Generator | Repo | Issue | PR | Status | Updated |
|---|---|---|---|---|---|
| Orval | [orval-labs/orval](https://github.com/orval-labs/orval) | — | — | not-started | — |
| OpenAPI Generator | [OpenAPITools/openapi-generator](https://github.com/OpenAPITools/openapi-generator) | — | — | not-started | — |
| Swagger Codegen v3 | [swagger-api/swagger-codegen](https://github.com/swagger-api/swagger-codegen) | — | — | not-started | — |
| AJV | [ajv-validator/ajv](https://github.com/ajv-validator/ajv) | — | — | not-started | — |

**Status values:** `not-started` · `in-progress` · `pr-open` · `pr-stale` · `merged` · `rejected` · `superseded` · `wontfix` · `resolved`

## 🤝 Contributing

- Keep changes reproducible and scriptable
- Include summarized evidence inline (generated type excerpts, error messages) rather than raw logs
- Add tool/version metadata to reports
- Prefer adding new test cases/spec variants over hand-wavy conclusions
