# Fixtures

Fixtures are the authored source-of-truth scenarios for this repository. Generated versioned OpenAPI specs under `specs/` are derived from these files.

Do not edit generated specs directly. Edit a fixture, then run:

```bash
node scripts/build-specs.mjs
```

## Scenarios

| Fixture | Purpose | What It Tests |
|---|---|---|
| `baseline-duplicated-pagination.yaml` | Control case with explicit `PaginatedUserResponse` and `PaginatedGroupResponse` schemas | Confirms a generator can handle ordinary duplicated wrappers before testing `$dynamicRef` |
| `generic-schema-binding.yaml` | Reusable paginated wrapper with named concrete schemas (`PaginatedUserResponse`, `PaginatedGroupResponse`) | Tests JSON Schema generic-type pattern using `$dynamicRef` / `$dynamicAnchor` with named type instantiations |
| `paginated-response.yaml` | Reusable paginated wrapper with type binding at the route response level | Tests the same generic pattern but with `$dynamicAnchor` overrides inline in the path operation response — no separate named wrapper schemas |
| `recursive-category-tree.yaml` | Canonical dynamic recursive override | Tests dynamic scope for recursive schemas (`children` should use the active category type) |
| `nested-workspace-resources.yaml` | Multiple anchors and nested dynamic refs | Tests more than one `$dynamicAnchor` / `$dynamicRef` pair in a nested resource graph |

## Why Keep The Baseline?

The baseline is a control. If a generator cannot produce useful types for explicit paginated wrappers, then a failure on `generic-schema-binding.yaml` is not evidence of a `$dynamicRef` bug.

## Fixture To Spec Path

```text
fixtures/<scenario>.yaml
  -> scripts/build-specs.mjs
specs/<scenario>/oas-3.1.0.json
specs/<scenario>/oas-3.1.1.json
specs/<scenario>/oas-3.1.2.json
specs/<scenario>/oas-3.2.0.json
```

The generated specs should differ only by top-level `openapi` version unless a scenario documents a version-specific exception.
