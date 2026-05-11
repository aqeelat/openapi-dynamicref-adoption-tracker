# DynamicRef State of the Union

## Executive Summary

- This repo investigates OpenAPI `$dynamicRef` / `$dynamicAnchor` behavior across validators and SDK generators.
- We split the work into two stages: fixture validation first, SDK generator type fidelity second.
- Two dynamicRef fixtures are currently validator-backed: recursive tree extension and complex nested resource graphs with multiple dynamic anchors.
- The pagination/generic-wrapper fixture follows the JSON Schema generics pattern referenced from OAI #3601. It passes Hyperjump runtime validation, but AJV 2020 still resolves it incorrectly.
- TypeScript SDK results across all 4 fixtures confirm: no tested tool preserves `$dynamicRef` type fidelity. Generators either fail to parse specs containing `$dynamicAnchor`, or emit `unknown[]`/`any` for dynamic ref slots.

## Fixtures

| Fixture | Purpose | Status |
|---|---|---|
| `fixtures/baseline-duplicated-pagination.yaml` | Control case with explicit paginated wrappers | Validated control |
| `fixtures/paginated-generic.yaml` | Generic pagination wrapper using `$dynamicRef: '#itemType'` | OpenAPI-valid; Hyperjump runtime-valid; AJV runtime fails |
| `fixtures/recursive-category-tree.yaml` | `$dynamicRef` recursive override using `$dynamicAnchor: category` | Validated dynamicRef |
| `fixtures/nested-workspace-resources.yaml` | Nested structures with multiple dynamic refs (`folder`, `resource`) | Validated dynamicRef |

## Validation Matrix

OpenAPI document validation:

| Fixture | Redocly | openapi-spec-validator | Spectral | swagger-cli |
|---|---|---|---|---|
| Baseline duplicated pagination | Pass | Pass | Pass | Pass |
| Paginated generic | Pass | Pass | Pass | Pass |
| Recursive category tree | Pass | Pass | Pass | Pass |
| Nested workspace resources | Pass | Pass | Pass | Pass |

JSON Schema runtime validation:

| Fixture | AJV 2020 | Hyperjump 2020-12 | Result |
|---|---|---|---|
| Baseline duplicated pagination | Pass | Not tested | Pass |
| Paginated generic | Fails valid user/group pages | Passes valid/invalid user and group pages | Mixed validator support |
| Recursive category tree | Pass | Not tested | Pass |
| Nested workspace resources | Pass | Not tested | Pass |

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

Hyperjump evaluates this as intended: user pages require `User[]`, group pages require `Group[]`, and invalid item shapes fail. AJV does not evaluate this as a generic type-parameter binding and instead resolves the dynamic ref back to the pagination template, causing valid item objects to fail with missing pagination fields.

This means the claim that `$dynamicRef` can model generic wrappers is supported by the OAI discussion and by Hyperjump, but tool support is mixed. Upstream generator issues should include the validator matrix rather than relying on one validator.

## TypeScript SDK Matrix (All Fixtures)

### Generation Results

| Scenario | Orval v8.9.1 | OpenAPI Generator v7.22.0 | Swagger Codegen v3 |
|---|---|---|---|
| baseline / 3.1.0–3.1.2 | OK | OK | OK |
| baseline / 3.2.0 | OK | FAIL | OK |
| paginated-generic / 3.1.0–3.1.2 | OK | FAIL | OK |
| paginated-generic / 3.2.0 | OK | FAIL | OK |
| recursive-category-tree / 3.1.0–3.1.2 | OK | FAIL | OK |
| recursive-category-tree / 3.2.0 | OK | FAIL | OK |
| nested-workspace / 3.1.0–3.1.2 | OK | FAIL | OK |
| nested-workspace / 3.2.0 | OK | FAIL | OK |

**OpenAPI Generator** fails on all dynamicRef fixtures with `Could not find /components/schemas/<SchemaName>` — its Swagger parser cannot resolve schemas that contain `$dynamicAnchor` without also having top-level `$ref` targets. This is a parser-level dynamicRef gap.

### Typecheck Results

| Scenario | Orval | OpenAPI Generator | Swagger Codegen |
|---|---|---|---|
| baseline / 3.1.0–3.1.2 | PASS | PASS | FAIL (strict) |
| baseline / 3.2.0 | PASS | N/A (gen failed) | FAIL (strict) |
| paginated-generic / 3.1.0–3.2.0 | PASS | N/A (gen failed) | FAIL (strict) |
| recursive-category-tree / 3.1.0–3.2.0 | PASS | N/A (gen failed) | FAIL (strict) |
| nested-workspace / 3.1.0–3.2.0 | PASS | N/A (gen failed) | FAIL (strict) |

Swagger Codegen strict failures are from missing `@types/jest`/`@types/mocha` and uninitialized `configuration` property — pre-existing codegen quality issues, not dynamicRef-specific.

### DynamicRef Type Fidelity

| Scenario | Orval Output | What dynamicRef resolved to |
|---|---|---|
| baseline / paginated | `PaginatedTemplate { items: unknown[] }` / `type PaginatedUserResponse = PaginatedTemplate` | Fallback `not: {}` → `unknown[]`; concrete type lost |
| recursive-category-tree | `BaseCategory { children: unknown[] }` / `type LocalizedCategory = BaseCategory & { displayName, locale }` | Recursive override lost → `unknown[]` |
| nested-workspace | `BaseFolder { children: (Document \| unknown)[] }` / `BaseResource = Document \| unknown` | Partial: `Document` sibling resolved but dynamic slots fallback to `unknown` |

Orval resolves `$dynamicRef` to the fallback `$dynamicAnchor` definition rather than the concrete override. This produces syntactically valid TypeScript but semantically wrong types.

## Recommendation

- Use duplicated concrete wrappers or a hybrid compatibility strategy for production SDK pipelines today.
- Use validator-backed recursive and complex nested fixtures for upstream `$dynamicRef` parser/codegen work.
- Use the pagination/generic-wrapper fixture with the documented validator caveat: Hyperjump validates it; AJV currently does not.
- Treat OAS `3.2.0` as experimental for generator compatibility until parser support improves.
- OpenAPI Generator has the most severe gap: it cannot parse specs containing `$dynamicAnchor` at all. Start upstream work there.

## Outreach

Issues and PRs opened in upstream generator repos are tracked in the [Outreach table in README.md](README.md#-outreach).

## How to Reproduce

**Stage 1** (run when fixtures change):

```bash
./scripts/validate-and-build.sh
```

**Stage 2** (run when generator versions change, or after Stage 1):

```bash
./scripts/run-matrix.sh
```

**Optional** — JSON Schema runtime validation (standalone research, not in pipeline):

```bash
node scripts/validate-jsonschema.mjs
```

Full logs and generated output are not tracked in git (see `.gitignore`).
