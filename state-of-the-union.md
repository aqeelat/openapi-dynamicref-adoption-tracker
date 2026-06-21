# DynamicRef State of the Union

## Executive Summary

- This repo investigates OpenAPI `$dynamicRef` / `$dynamicAnchor` behavior across validators and SDK generators.
- We split the work into two stages: fixture validation first, SDK generator type fidelity second.
- Three dynamicRef SDK fixtures are currently validator-backed: recursive tree extension, non-identifier schema-key recursion, and multi-parameter generic templates for nested resource graphs.
- The pagination/generic-wrapper fixture follows the JSON Schema generics pattern referenced from OAI #3601. It passes Hyperjump runtime validation, but AJV 2020 still resolves it incorrectly.
- The initial SDK snapshot across the original 5 fixtures confirmed: no tested tool preserved `$dynamicRef` type fidelity. Generators either failed to parse specs containing `$dynamicAnchor`, emitted `unknown`/`any`/`Object` for dynamic ref slots, or materialized generic/template fixtures as duplicate concrete types instead of reusable parameterized types. **Orval v8.13.0** (May 2026) is the first matrix-tested generator to preserve fidelity across all fixtures, emitting generic interfaces and bound type aliases.
- New finding: OpenAPI Generator fails on named wrapper schemas (`PaginatedUserResponse` → `$ref: PaginatedTemplate`) but **succeeds** on inline binding (response-level `$defs` + `$ref: PaginatedTemplate`). This suggests the parser bug is triggered by schemas that contain `$dynamicAnchor` but are only reachable via `$ref` from another named schema.

## Ecosystem-Wide Status (June 2026)

Beyond the SDK-generator matrix, the full ecosystem is tracked in [`TOOLING_CATALOG.md`](TOOLING_CATALOG.md) (parsers, validators, linters, renderers, producers, clients, mocks). Key results from the June 2026 fixtures-first analysis pass:

**Correct (fixture-verified / official-suite pass):**
- **Validators:** Hyperjump, networknt (Java), jsonschema-rs (Rust), Opis (PHP, all 1227 draft2020-12 tests), Boon (Rust), santhosh-tekuri/jsonschema (Go).
- **Parsers/bundlers:** libopenapi (Go, v0.30.1+), Redocly CLI, Spectral, openapi-spec-validator, `@apidevtools/swagger-parser` v12 (OAS 3.1, opaque-preserve).
- **Linters/diff:** vacuum (Correct, libopenapi-backed, deliberate dynamic-scope-keyword handling), oasdiff (Correct, `$dynamicRef`/`$dynamicAnchor` first-class diffable fields).

**In-flight upstream work (yours):**
- **OpenAPIKit #501** — adds `$dynamicRef` to the Swift document model. Unblocks `swift-openapi-generator` #547.
- **swagger-parser #2332** — **verified insufficient**: `$ref`-bearing schemas collapse to reference-only (swagger-core OAS-3.0 behavior), dropping override `$dynamicAnchor` siblings before the dereferencer runs. Needs a companion swagger-core `$ref`-sibling preservation fix for 3.1.
- **AJV #2615** — validator generic-wrapper resolution fix (highest-impact JS-ecosystem gap).

**Recurring root cause:** `$ref`-siblings-ignored (OAS 3.0 semantics carried into 3.1) — breaks the generic-binding pattern in swagger-core, ibm-openapi-validator's `no-$ref-siblings`, and others. OAS 3.1 makes `$ref` siblings valid; tools must stop dropping them.

**Reference implementation:** [Orval](analysis/orval-reference.md) — the generic-type-emission blueprint. Analyses design Orval-modeled full-support paths; "architecturally incompatible / materialize concrete types" is no longer the default.

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
| Nested workspace resources | Valid workspace passes; invalid nested folder is accepted as a known gap because AJV resolves the generic `$dynamicRef` slot to the `not: {}` fallback | Fails: "resolves to more than one schema" — AJV limitation when same-name `$dynamicAnchor`s appear in the generic binding path; fixture is semantically correct | Not tested | AJV does not resolve the multi-parameter `$dynamicRef` generic template pattern |
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

The nested workspace fixture was restructured from sibling `$dynamicAnchor` declarations to a multi-parameter generic template pattern (`FolderTemplate` with `folderType` and `resourceType` slots). AJV now parses and partially validates the fixture but does not correctly enforce constraints through `$dynamicRef` generic template binding — the same gap that affects the pagination fixtures. AJV PR #2615 still exposes a separate same-name `$dynamicAnchor` limitation in this generic binding path; the fixture remains semantically correct.

This means the claim that `$dynamicRef` can model generic wrappers is supported by the OAI discussion and by Hyperjump, but tool support is mixed. Upstream generator issues should include the validator matrix rather than relying on one validator.

## Ecosystem Workstreams

`$dynamicRef` adoption depends on several OpenAPI tool categories, not just SDK generators.

| Category | Role | Examples | Recommended work |
|---|---|---|---|
| SDK generators / type emitters | Generate application-facing clients and types | OpenAPI Generator, Orval, openapi-typescript, @hey-api/openapi-ts, Kiota, NSwag | Highest priority: preserve dynamic scope and emit reusable parameterized types where supported |
| Parsers / resolvers / bundlers | Resolve refs and prepare specs for consumers | Redocly bundle, swagger-cli bundle, parser libraries | Preserve `$dynamicRef` / `$dynamicAnchor` without changing dynamic scope |
| Runtime validators | Validate data against schemas | AJV, Hyperjump | Close validator gaps and document disagreements |
| Spec producers | Generate OpenAPI specs from source code | `@nx/swagger`, `@nestjs/swagger`, tsoa, FastAPI, springdoc-openapi, poem-openapi, swaggo/swag | Add opt-in `$dynamicRef` emission while keeping duplicated-schema output as the default |
| Documentation renderers | Render OpenAPI docs | Swagger UI, Redoc, Stoplight Elements | Render valid specs containing `$dynamicRef` without crashing or hiding schemas |

SDK generators and type emitters are the first practical priority because broken generated types immediately affect application developers. A spec producer that emits `$dynamicRef` before downstream tools preserve the semantics can cause generation failures or degraded output such as `unknown`, `any`, `Object`, or duplicate non-generic wrappers.

Spec producers should still start implementing support now, but they should expose it as an explicit opt-in. Default output should remain compatibility-safe duplicated schemas until major SDK generators and parser/bundler stacks reliably preserve dynamic reference semantics.

## Documentation Renderer Progress

Swagger UI is the de facto OpenAPI documentation UI and the highest-priority documentation renderer target. Current research shows the `$dynamicRef` gap is architectural, not cosmetic.

**Dependency chain**: swagger-ui → swagger-client → ApiDOM (`apidom-reference`). ApiDOM is the dereference engine — it resolves `$ref` during AST traversal but ignores `$dynamicRef` entirely. Swagger UI's JSON Schema 2020-12 plugin renders `$dynamicRef`/`$dynamicAnchor` as static keyword labels, and sample generation falls back to `"string"` when a schema has only `$dynamicRef` (no `type`/`properties`).

**Fix location**: ApiDOM is the correct architectural home for the fix. Adding `$dynamicRef` resolution to the `SchemaElement` visitor in the OpenAPI 3.1 dereference strategy would fix the entire stack with zero changes in swagger-client or swagger-ui — the resolved schema flows through `toValue()` to the UI, which renders concrete `type`/`properties` through its normal paths.

| Tool | Status | Issue | Notes |
|---|---|---|---|
| Swagger UI | issue-open | [swagger-ui#10912](https://github.com/swagger-api/swagger-ui/issues/10912) | Outreach issue; fix tracked as ApiDOM work |
| ApiDOM (upstream) | not-started | [apidom#378](https://github.com/swagger-api/apidom/issues/378) (closed `not_planned`, likely stale) | The dereference engine; needs `$dynamicRef`/`$dynamicAnchor` resolution in `SchemaElement` visitor |

Full analysis: `analysis/swagger-ui.md`. ApiDOM implementation plan: `analysis/apidom.md`.

## TypeScript SDK Matrix Snapshot (Initial 3-Generator Run)

This section is a compatibility snapshot from the initial focused run against Orval, OpenAPI Generator, and Swagger Codegen v3. The live CI matrix now covers additional TypeScript-oriented tools; use GitHub Actions artifacts and tracking issues for current per-tool status.

### Generation Results

| Scenario | Orval v8.13.0 | OpenAPI Generator v7.22.0 | Swagger Codegen v3 |
|---|---|---|---|
| baseline / all versions | OK | OK | OK |
| generic-schema-binding / 3.1.0–3.1.2 | OK | FAIL | OK |
| generic-schema-binding / 3.2.0 | OK | FAIL | OK |
| paginated-response / all versions | OK | OK | OK |
| api-envelope / all versions | OK | N/A (not in initial run) | N/A |
| recursive-category-tree / all versions | OK | FAIL | OK |
| nested-workspace / all versions | OK | FAIL | OK |
| non-identifier-schema-key / all versions | OK | N/A (not in initial run) | N/A |

**OpenAPI Generator** fails on all fixtures with named `$dynamicAnchor` schemas (e.g., `PaginatedUserResponse` containing `$dynamicAnchor` + `$ref: PaginatedTemplate` in `generic-schema-binding`). But it **succeeds** on the `paginated-response` variant where the `$dynamicAnchor` override lives in the route response schema — the parser bug is triggered by schemas in `components/schemas` that contain `$dynamicAnchor` but are only reachable via `$ref` from another named schema.

### Typecheck Results

| Scenario | Orval v8.13.0 | OpenAPI Generator | Swagger Codegen |
|---|---|---|---|
| baseline / all versions | PASS | PASS | FAIL (strict) |
| generic-schema-binding / all versions | FAIL (response handler) | N/A (gen failed) | FAIL (strict) |
| paginated-response / all versions | PASS | PASS | FAIL (strict) |
| api-envelope / all versions | PASS | N/A | N/A |
| recursive-category-tree / all versions | PASS | N/A (gen failed) | FAIL (strict) |
| nested-workspace / all versions | PASS | N/A (gen failed) | FAIL (strict) |
| non-identifier-schema-key / all versions | PASS | N/A | N/A |

Swagger Codegen strict failures are from missing `@types/jest`/`@types/mocha` and uninitialized `configuration` property — pre-existing codegen quality issues, not dynamicRef-specific.

Orval `generic-schema-binding` typecheck fails because the response handler in `sample.ts` uses bare `PaginatedTemplate` without type arguments instead of the bound alias `PaginatedUserResponse`/`PaginatedGroupResponse`. The model types themselves are correct.

### DynamicRef Type Fidelity (v8.13.0)

Orval v8.13.0 preserves `$dynamicRef` type fidelity across all 7 fixtures and all 4 OAS versions (3.1.0–3.2.0). The generator emits generic interfaces and bound type aliases instead of degrading to `unknown`/`any`.

| Scenario | Orval v8.13.0 Output | Fidelity |
|---|---|---|
| generic-schema-binding | `interface PaginatedTemplate<itemType> { items: itemType[]; ... }` / `type PaginatedUserResponse = PaginatedTemplate<User>` / `type PaginatedGroupResponse = PaginatedTemplate<Group>` | PRESERVED |
| paginated-response | `interface PaginatedTemplate<itemType> { items: itemType[]; ... }` / `type PaginatedUserItems = PaginatedTemplate<User>` (inline binding) | PRESERVED |
| api-envelope | `interface ApiEnvelopeTemplate<T> { data: T; ... }` / `interface PaginatedTemplate<itemType> { items: itemType[]; ... }` / `type PaginatedUserItems = PaginatedTemplate<User>` / `type UserEnvelope = ApiEnvelopeTemplate<User>` | PRESERVED |
| recursive-category-tree | `interface BaseCategory { children: BaseCategory[]; ... }` / `type LocalizedCategory = BaseCategory & { displayName, locale }` | PRESERVED |
| nested-workspace | `interface FolderTemplate<folderType, resourceType> { children: (Document \| folderType)[]; shortcuts: resourceType[]; }` / `type WorkspaceFolder = FolderTemplate<WorkspaceFolder, WorkspaceResource> & { permissions: ... }` / `type WorkspaceResource = Document \| WorkspaceFolder` | PRESERVED |
| non-identifier-schema-key | `interface BaseCategory { children: BaseCategory[]; ... }` / `type LocalizedCategory = BaseCategory & { displayName, locale }` | PRESERVED |
| baseline (control) | Concrete `User`, `Group` types — no dynamic refs | PRESERVED |

**Known minor issue**: The response handler in `generic-schema-binding` `sample.ts` uses bare `PaginatedTemplate` without type arguments (should use the bound alias). The model types are correct; this is a response-handler codegen issue, not a dynamic ref resolution issue.

Additionally, even when generators do resolve generic fixtures to concrete item types, the current matrix does not distinguish between **reusable parameterized output** (`PaginatedTemplate<T>`) and **duplicate concrete materialization** (separate `PaginatedUserResponse`/`PaginatedGroupResponse` with identical structure). Going forward, generic fixture validation requires parameterized types when the target language supports generics — concrete materialization is classified as PARTIAL (correct type content, lost type reuse).

Orval PR [#3353](https://github.com/orval-labs/orval/pull/3353) added `$dynamicRef`/`$dynamicAnchor` support and was released in v8.13.0 (May 2026). Follow-up PR [#3446](https://github.com/orval-labs/orval/pull/3446) fixed `$dynamicAnchor` fallback behavior per the JSON Schema spec. The support is always active when these keywords are present — no configuration flag is needed. The implementation covers: self-recursive anchors, generic pagination/template binding, multi-parameter generic templates, `allOf` bound aliases, partially-bound aliases, inline response bindings, non-identifier schema-key normalization, colliding anchor name deduplication, and external `$dynamicRef` fallback to `unknown`. Tracker issue [#1](https://github.com/aqeelat/openapi-dynamicref-adoption-tracker/issues/1) tracks the remaining response-handler codegen gap where `sample.ts` uses bare generic template references instead of bound aliases.

## Recommendation

- Use duplicated concrete wrappers or a hybrid compatibility strategy for production SDK pipelines today.
- Prioritize SDK generators and type emitters first; they are the practical bottleneck for application adoption.
- Use validator-backed recursive and complex nested fixtures for upstream `$dynamicRef` parser/codegen work.
- Use the pagination/generic-wrapper fixture with the documented validator caveat: Hyperjump validates it; AJV currently does not.
- **Generic fixtures must produce parameterized types (generics) when the target language supports them.** Concrete materialization of generic wrappers — duplicating the template structure for each item type — does not pass validation. The purpose of `$dynamicRef` for generics is type reuse; producing duplicates defeats that purpose. For languages without generics, concrete wrappers are acceptable as a documented fallback.
- Spec producers such as `@nx/swagger` should add `$dynamicRef` emission behind explicit opt-in flags, not as default output, until downstream SDK generator support is reliable.
- Track spec producer work separately from SDK generator work; this repo does not need producer CI automation yet.
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
