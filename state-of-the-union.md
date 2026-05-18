# DynamicRef State of the Union

## Executive Summary

- This repo investigates OpenAPI `$dynamicRef` / `$dynamicAnchor` behavior across validators and SDK generators.
- We split the work into two stages: fixture validation first, SDK generator type fidelity second.
- Three dynamicRef SDK fixtures are currently validator-backed: recursive tree extension, non-identifier schema-key recursion, and multi-parameter generic templates for nested resource graphs.
- The pagination/generic-wrapper fixture follows the JSON Schema generics pattern referenced from OAI #3601. It passes Hyperjump runtime validation, but AJV 2020 still resolves it incorrectly.
- The initial SDK snapshot across the original 5 fixtures confirmed: no tested tool preserved `$dynamicRef` type fidelity. Generators either failed to parse specs containing `$dynamicAnchor`, emitted `unknown`/`any`/`Object` for dynamic ref slots, or materialized generic/template fixtures as duplicate concrete types instead of reusable parameterized types.
- New finding: OpenAPI Generator fails on named wrapper schemas (`PaginatedUserResponse` → `$ref: PaginatedTemplate`) but **succeeds** on inline binding (response-level `$defs` + `$ref: PaginatedTemplate`). This suggests the parser bug is triggered by schemas that contain `$dynamicAnchor` but are only reachable via `$ref` from another named schema.

## Fixtures

| Fixture | Purpose | Status |
|---|---|---|
| `fixtures/baseline-duplicated-pagination.yaml` | Control case with explicit paginated wrappers | Validated control |
| `fixtures/generic-schema-binding.yaml` | Generic pagination with named wrapper schemas (`PaginatedUserResponse`, `PaginatedGroupResponse`) | OpenAPI-valid; Hyperjump runtime-valid; AJV runtime fails |
| `fixtures/paginated-response.yaml` | Generic pagination with type binding at the route response level (no named wrappers) | OpenAPI-valid; Hyperjump runtime-valid; AJV runtime fails |
| `fixtures/api-envelope.yaml` | Generic response envelope (`ApiEnvelopeTemplate<T>`) with inline `$defs` binding at the route level; one route binds a single resource, another binds a paginated wrapper | OpenAPI-valid; expected same AJV gap as pagination fixtures; not yet runtime-validated |
| `fixtures/recursive-category-tree.yaml` | `$dynamicRef` recursive override using `$dynamicAnchor: category` | Validated dynamicRef |
| `fixtures/nested-workspace-resources.yaml` | Multi-parameter generic template for nested folder/resource graphs (`folderType`, `resourceType`) | Validated dynamicRef |
| `fixtures/non-identifier-schema-key.yaml` | Recursive dynamic override with schema keys that require generated identifier normalization | Validated dynamicRef and generator edge fixture |
| `fixtures/spec-semantics/dynamicref-core-semantics.yaml` | Focused JSON Schema dynamic reference semantics | OpenAPI-valid; Hyperjump runtime-valid for supported cases; AJV has documented gaps |
| `fixtures/spec-semantics/external-dynamic-ref.yaml` | External JSON Schema resource via `$dynamicRef` | OpenAPI-valid; Hyperjump runtime-valid |
| `fixtures/spec-semantics/ambiguous-sibling-anchors.yaml` | Multiple sibling schemas with the same `$dynamicAnchor` name | OpenAPI-valid research fixture for static-scan limitations |
| `petstore-dynamicref-showcase.yaml` | Combined showcase exercising all `$dynamicRef` patterns in a realistic API (generic pagination, response envelopes, nested generics, recursive trees, multi-parameter generic templates, non-identifier keys, typed request/response bodies) | OpenAPI-valid; intended for SDK samples and maintainer demos — not a matrix fixture |

## Validation Matrix

OpenAPI document validation:

| Fixture | Redocly | openapi-spec-validator | Spectral | swagger-cli |
|---|---|---|---|---|
| Baseline duplicated pagination | Pass | Pass | Pass | Pass |
| Paginated generic | Pass | Pass | Pass | Pass |
| Paginated inline binding | Pass | Pass | Pass | Pass |
| API envelope | Pass | Pass | Pass | Pass |
| Recursive category tree | Pass | Pass | Pass | Pass |
| Nested workspace resources | Pass | Pass | Pass | Pass |
| Non-identifier schema key | Pass | Pass | Pass | Pass |
| Spec semantics fixtures | Pass | Pass | Pass | Pass |
| Petstore showcase | Pass | Pass | Pass | Pass |

JSON Schema runtime validation:

| Fixture | AJV 2020 | AJV PR #2615 | Hyperjump 2020-12 | Result |
|---|---|---|---|---|
| Baseline duplicated pagination | Pass | Pass | Not tested | Pass |
| Generic schema binding | Fails valid user/group pages | Passes valid/invalid user and group pages | Passes valid/invalid user and group pages | AJV PR #2615 fixes this |
| Paginated response (inline) | Fails valid user/group pages | Passes valid/invalid user and group pages | Passes valid/invalid user and group pages | AJV PR #2615 fixes this |
| API envelope | Not yet tested | Not yet tested | Not yet tested | Expected same gap as pagination fixtures |
| Recursive category tree | Pass | Pass | Not tested | Pass |
| Nested workspace resources | PASS (valid workspace); FAIL (invalid nested folder — AJV does not enforce constraints through `$dynamicRef` generic template binding, same gap as pagination fixtures) | Fails: "resolves to more than one schema" — AJV limitation when multiple schemas share a `$dynamicAnchor` name in the same document; fixture is semantically correct | Not tested | AJV does not resolve `$dynamicRef` generics pattern; fallback `not: {}` accepts invalid data |
| Non-identifier schema key | Pass | Not tested | Pass | Pass |
| Spec semantics fixtures | Mixed known gaps | Not tested | Pass where runtime assertions exist | Research tier; see `fixtures/README.md` |

## Pagination Generic Finding

The current pagination fixture follows the JSON Schema generics pattern referenced by [OAI #3601](https://github.com/OAI/OpenAPI-Specification/issues/3601) and [Using Dynamic References to Support Generic Types](https://json-schema.org/blog/posts/dynamicref-and-generics):

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

Hyperjump evaluates this as intended: user pages require `User[]`, group pages require `Group[]`, and invalid item shapes fail. AJV PR [#2615](https://github.com/ajv-validator/ajv/pull/2615) also now evaluates this correctly — valid user/group pages pass and invalid item shapes fail. This PR has not yet been merged.

The nested workspace fixture was restructured from sibling `$dynamicAnchor` declarations to a multi-parameter generic template pattern (`FolderTemplate` with `folderType` and `resourceType` slots). AJV now parses and partially validates the fixture but does not correctly enforce constraints through `$dynamicRef` generic template binding — the same gap that affects the pagination fixtures. The previous "ambiguous reference" error for same-name `$dynamicAnchor` declarations no longer applies to this fixture.

This means the claim that `$dynamicRef` can model generic wrappers is supported by the OAI discussion and by Hyperjump, but tool support is mixed. Upstream generator issues should include the validator matrix rather than relying on one validator.

## TypeScript SDK Matrix Snapshot (Initial 3-Generator Run)

This section is a compatibility snapshot from the initial focused run against Orval, OpenAPI Generator, and Swagger Codegen v3. The live CI matrix now covers additional TypeScript-oriented tools; use GitHub Actions artifacts and tracking issues for current per-tool status.

### Generation Results

| Scenario | Orval v8.9.1 | OpenAPI Generator v7.22.0 | Swagger Codegen v3 |
|---|---|---|---|
| baseline / 3.1.0–3.1.2 | OK | OK | OK |
| baseline / 3.2.0 | OK | FAIL | OK |
| generic-schema-binding / 3.1.0–3.1.2 | OK | FAIL | OK |
| generic-schema-binding / 3.2.0 | OK | FAIL | OK |
| paginated-response / 3.1.0–3.1.2 | OK | OK | OK |
| paginated-response / 3.2.0 | OK | FAIL | OK |
| recursive-category-tree / 3.1.0–3.1.2 | OK | FAIL | OK |
| recursive-category-tree / 3.2.0 | OK | FAIL | OK |
| nested-workspace / 3.1.0–3.1.2 | OK | FAIL | OK |
| nested-workspace / 3.2.0 | OK | FAIL | OK |

**OpenAPI Generator** fails on all fixtures with named `$dynamicAnchor` schemas (e.g., `PaginatedUserResponse` containing `$dynamicAnchor` + `$ref: PaginatedTemplate` in `generic-schema-binding`). But it **succeeds** on the `paginated-response` variant where the `$dynamicAnchor` override lives in the route response schema — the parser bug is triggered by schemas in `components/schemas` that contain `$dynamicAnchor` but are only reachable via `$ref` from another named schema.

### Typecheck Results

| Scenario | Orval | OpenAPI Generator | Swagger Codegen |
|---|---|---|---|
| baseline / 3.1.0–3.1.2 | PASS | PASS | FAIL (strict) |
| baseline / 3.2.0 | PASS | N/A (gen failed) | FAIL (strict) |
| generic-schema-binding / 3.1.0–3.2.0 | PASS | N/A (gen failed) | FAIL (strict) |
| paginated-response / 3.1.0–3.1.2 | PASS | PASS | FAIL (strict) |
| recursive-category-tree / 3.1.0–3.2.0 | PASS | N/A (gen failed) | FAIL (strict) |
| nested-workspace / 3.1.0–3.2.0 | PASS | N/A (gen failed) | FAIL (strict) |

Swagger Codegen strict failures are from missing `@types/jest`/`@types/mocha` and uninitialized `configuration` property — pre-existing codegen quality issues, not dynamicRef-specific.

### DynamicRef Type Fidelity

| Scenario | Orval Output | What dynamicRef resolved to |
|---|---|---|
| generic-schema-binding | `PaginatedTemplate { items: unknown[] }` / `type PaginatedUserResponse = PaginatedTemplate` | Fallback `not: {}` → `unknown[]`; concrete type lost |
| paginated-response | `PaginatedTemplate { items: unknown[] }` — API returns `PaginatedTemplate` directly | Same: fallback to `unknown[]`, no concrete override |
| recursive-category-tree | `BaseCategory { children: unknown[] }` / `type LocalizedCategory = BaseCategory & { displayName, locale }` | Recursive override lost → `unknown[]` |
| nested-workspace | `FolderTemplate { children: (Document \| unknown)[], shortcuts: unknown[] }` / `WorkspaceResource = Document \| unknown` | Partial: `Document` sibling resolved but dynamic slots fallback to `unknown` |

Orval resolves `$dynamicRef` to the fallback `$dynamicAnchor` definition rather than the concrete override. This produces syntactically valid output but semantically wrong types.

Additionally, even when generators do resolve generic fixtures to concrete item types, the current matrix does not distinguish between **reusable parameterized output** (`PaginatedTemplate<T>`) and **duplicate concrete materialization** (separate `PaginatedUserResponse`/`PaginatedGroupResponse` with identical structure). Going forward, generic fixture validation requires parameterized types when the target language supports generics — concrete materialization is classified as PARTIAL (correct type content, lost type reuse).

Orval PR [#3353](https://github.com/orval-labs/orval/pull/3353) adds opt-in dynamic reference support and covers additional generator-facing cases: self-recursive anchors, generic pagination binding, nested workspace resources, disabled-flag fallback behavior, non-identifier schema-key normalization, and unsupported external `$dynamicRef` fallback. The tracker now models the portable schema cases as fixtures; Orval-specific configuration remains tracked in GitHub issue [#1](https://github.com/aqeelat/openapi-dynamicref-adoption-tracker/issues/1).

## Recommendation

- Use duplicated concrete wrappers or a hybrid compatibility strategy for production SDK pipelines today.
- Use validator-backed recursive and complex nested fixtures for upstream `$dynamicRef` parser/codegen work.
- Use the pagination/generic-wrapper fixture with the documented validator caveat: Hyperjump validates it; AJV currently does not.
- **Generic fixtures must produce parameterized types (generics) when the target language supports them.** Concrete materialization of generic wrappers — duplicating the template structure for each item type — does not pass validation. The purpose of `$dynamicRef` for generics is type reuse; producing duplicates defeats that purpose. For languages without generics, concrete wrappers are acceptable as a documented fallback.
- Treat OAS `3.2.0` as experimental for generator compatibility until parser support improves.
- OpenAPI Generator has the most severe gap: it cannot parse specs containing `$dynamicAnchor` at all. Start upstream work there.

## Outreach

Issues and PRs opened in upstream generator repos should be tracked in repository-local GitHub issues and, when available, the GitHub Project board. README intentionally keeps only the durable overview.

## How to Reproduce

**Stage 1** (run when fixtures change):

```bash
npm run validate:fixtures
```

**Stage 2** (run when generator versions change, or after Stage 1):

```bash
npm run matrix
```

**Optional** — JSON Schema runtime validation (standalone research, not in pipeline):

```bash
npm run validate:jsonschema
```

Full logs and generated output are not tracked in git (see `.gitignore`).
