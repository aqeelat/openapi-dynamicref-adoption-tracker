# DynamicRef State of the Union

## Executive Summary

- This repo investigates OpenAPI `$dynamicRef` / `$dynamicAnchor` behavior across validators and SDK generators.
- We now split the work into two stages: fixture validation first, SDK generator type fidelity second.
- Two dynamicRef fixtures are currently validator-backed: recursive tree extension and complex nested resource graphs with multiple dynamic anchors.
- The pagination/generic-wrapper fixture now follows the JSON Schema generics pattern referenced from OAI #3601. It passes Hyperjump runtime validation, but AJV 2020 still resolves it incorrectly.
- Initial TypeScript SDK results show generators parse or emit code in many cases, but none preserve the intended dynamicRef item typing.

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

## TypeScript SDK Matrix (Pagination Generic Fixture)

| Tool | Generator | OpenAPI Parse / Generate | Strict Typecheck | DynamicRef Fidelity | Verdict |
|---|---|---|---|---|---|
| Orval `v8.9.1` | TypeScript fetch | Generates all tested OAS versions | Pass | `items` remains `unknown[]` | Not supported |
| OpenAPI Generator CLI `7.22.0` | `typescript-fetch` | Generates OAS `3.1.x`; fails `3.2.0` | Pass for generated `3.1.x` output | `items` becomes `Array<any>` | Not supported |
| Swagger Codegen CLI v3 | `typescript-fetch` | Generates OAS `3.1.x`; fails `3.2.0` | Fails strict TSC for `3.1.x` | Wrappers degrade to `any` | Not supported |

Swagger strict failure (all `3.1.x`):

```text
generated/swagger-codegen/<version>/api.ts(57,15): error TS2564: Property 'configuration' has no initializer and is not definitely assigned in the constructor.
```

## Recommendation

- Use duplicated concrete wrappers or a hybrid compatibility strategy for production SDK pipelines today.
- Use validator-backed recursive and complex nested fixtures for upstream `$dynamicRef` parser/codegen work.
- Use the pagination/generic-wrapper fixture with the documented validator caveat: Hyperjump validates it; AJV currently does not.
- Treat OAS `3.2.0` as experimental for generator compatibility until parser support improves.

## Outreach

Issues and PRs opened in upstream generator repos are tracked in the [Outreach table in README.md](README.md#-outreach).

## How to Reproduce

Run all fixture validators:

```bash
./scripts/validate-fixtures.sh
```

Run the current SDK generation matrix:

```bash
./scripts/run-matrix.sh
```

Full logs and generated output are not tracked in git (see `.gitignore`).
