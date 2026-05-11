# OpenAPI DynamicRef Tooling Tracker

This repository is a public compatibility lab for OpenAPI `$dynamicRef` / `$dynamicAnchor` support in SDK generators.

**Goal:** provide reproducible evidence, open issues/PRs, and help tooling maintainers implement dynamic references correctly.

## Why This Matters

Many APIs model reusable wrappers (for example paginated responses) that should preserve concrete item types.

With OAS + JSON Schema polymorphism, there are two broad approaches:

- **Explicit concrete schemas** — duplicated wrappers like `PaginatedAssetResponse`, `PaginatedUserResponse`. Broadly supported today.
- **Dynamic polymorphism** — `$dynamicRef` + `$dynamicAnchor` to avoid duplication and encode template-like behavior. Standards-aligned but unevenly implemented.

The schema pattern under test:

```
PaginatedTemplate.items → $dynamicRef: '#itemType'
PaginatedAssetResponse  → binds itemType to Asset via $dynamicAnchor
PaginatedUserResponse   → binds itemType to User  via $dynamicAnchor
```

## 📊 Results

### Generation & Typecheck Matrix

Tested across OAS `3.1.0`, `3.1.1`, `3.1.2`, and `3.2.0`.

Legend: 🟢 pass · 🔴 fail · ⬜ N/A (generation failed)

| Tool | OAS 3.1.0 | OAS 3.1.1 | OAS 3.1.2 | OAS 3.2.0 | Grade |
|---|---|---|---|---|---|
| **Orval** v8.9.1 | 🟢 Gen / 🟢 TSC | 🟢 Gen / 🟢 TSC | 🟢 Gen / 🟢 TSC | 🟢 Gen / 🟢 TSC | **B** |
| **OpenAPI Generator** v7.22.0 | 🟢 Gen / 🟢 TSC | 🟢 Gen / 🟢 TSC | 🟢 Gen / 🟢 TSC | 🔴 Gen / ⬜ TSC | **B** / **D** |
| **Swagger Codegen** v3 | 🟢 Gen / 🔴 TSC | 🟢 Gen / 🔴 TSC | 🟢 Gen / 🔴 TSC | 🔴 Gen / ⬜ TSC | **D** |

> **Gen** = SDK generation succeeds · **TSC** = `tsc --noEmit --strict` passes

### Rubric

| Grade | Meaning |
|---|---|
| 🟢 A | Generates + compiles + correct types |
| 🟡 B | Generates + compiles but degraded types |
| 🟠 C | Generates with heavy warnings / manual fixes needed |
| 🔴 D | Fails generation or unusable output |

### ⚠️ Type Quality Findings

No tested tool emits robust item-typed wrappers from `$dynamicRef`:

| Tool | `items` type emitted | Notes |
|---|---|---|
| Orval | `unknown[]` | `PaginatedTemplate.items` stays generic |
| OpenAPI Generator | `Array<any>` | Wrapper shape flattened with item fields |
| Swagger Codegen | `any` | Wrappers fully degraded |

### 🔴 Notable Failures

- **OpenAPI Generator + 3.2.0** — parse/validation failure, reports `openapi` as unexpected, expects Swagger 2 style attributes
- **Swagger Codegen + 3.2.0** — parser fails with `missing OpenAPI input!` after `SwaggerCompatConverter` errors
- **Swagger Codegen + 3.1.x** — strict TSC failure: `Property 'configuration' has no initializer`

## 📁 Repository Structure

```
specs/                        OpenAPI spec fixtures (3.1.0 – 3.2.0)
state-of-the-union.md         Full detailed report
RUNBOOK.md                    Methodology and execution runbook
SDK_GENERATORS_CATALOG.md     Catalog of all available generators (161+ tools)
```

> `generated/` and `logs/` are produced locally by running the matrix but are gitignored — see `RUNBOOK.md` for how to reproduce them.

## 📋 Specs Under Test

- `specs/sample-schema-oas-3.1.0.yaml`
- `specs/sample-schema-oas-3.1.1.yaml`
- `specs/sample-schema-oas-3.1.2.yaml`
- `specs/sample-schema-oas-3.2.0.yaml`

## 📄 Documentation

- 📜 **[Full Report](state-of-the-union.md)** — detailed findings, logs index, and recommendations
- 📖 **[Runbook](RUNBOOK.md)** — methodology, scoring rubric, and execution process
- 🔧 **[Implementation Guide](IMPLEMENTATION_GUIDE.md)** — step-by-step playbook for adding `$dynamicRef` support to any generator
- 📚 **[SDK Generators Catalog](SDK_GENERATORS_CATALOG.md)** — 161+ generators from OpenAPI Generator + 41 from Swagger Codegen v3

## 🗺️ Community Action Plan

- [ ] Open focused issues with minimal reproducible specs from `specs/`
- [ ] Submit parser/codegen PRs to support `$dynamicRef` resolution and correct type emission
- [ ] Add more tools to the matrix (`openapi-typescript-codegen`, `oazapfts`, `@hey-api/openapi-ts`, AutoRest, NSwag, Kiota)
- [ ] Re-run this matrix after each fix and update `state-of-the-union.md`

See the **[Implementation Guide](IMPLEMENTATION_GUIDE.md)** for a step-by-step playbook to implement `$dynamicRef` support in any generator (check existing work → open issue → fix → fork → PR → update the table below).

## 📢 Outreach

Issues and PRs opened in upstream generator repos.

| Generator | Repo | Issue | PR | Status | Updated |
|---|---|---|---|---|---|
| Orval | [orval-tests/orval](https://github.com/orval-tests/orval) | — | — | not-started | — |
| OpenAPI Generator | [OpenAPITools/openapi-generator](https://github.com/OpenAPITools/openapi-generator) | — | — | not-started | — |
| Swagger Codegen v3 | [swagger-api/swagger-codegen](https://github.com/swagger-api/swagger-codegen) | — | — | not-started | — |

**Status values:** `not-started` · `in-progress` · `pr-open` · `pr-stale` · `merged` · `rejected` · `superseded` · `wontfix` · `resolved`

## 🤝 Contributing

- Keep changes reproducible and scriptable
- Preserve full logs in `logs/` for failures
- Add tool/version metadata to reports
- Prefer adding new test cases/spec variants over hand-wavy conclusions
