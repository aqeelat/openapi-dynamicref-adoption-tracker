# python-jsonschema

## Summary

python-jsonschema v4.26.0 implements `$dynamicRef` / `$dynamicAnchor` support for JSON Schema draft 2020-12 via the `referencing` library (v0.28.4+). Dynamic scope resolution is handled in `referencing.jsonschema.DynamicAnchor.resolve`, which walks the dynamic scope chain maintained by `referencing._core.Resolver`. The `dynamicRef` keyword handler in `jsonschema._keywords` delegates to `_validate_reference`, which calls `_resolver.lookup(ref)`, which uses the `DynamicAnchor.resolve` path for anchor fragments.

The implementation passes the official JSON Schema Test Suite for draft 2020-12, which includes 44 `dynamicRef` test cases covering basic dynamic scope, intermediate scopes, strict-tree schemas, and detached dynamic anchors. However, the official test suite does not cover the OpenAPI 3.1-style generic wrapper patterns (e.g., reusable paginated templates where `$dynamicRef` binds to concrete item types via sibling `$dynamicAnchor` in derived schemas composed through `$ref` + `$defs`). These patterns require correct dynamic scope tracking through `$ref` transitions into template schemas, and it is unverified whether the current implementation handles them correctly.

python-jsonschema is a **validator**, not an OpenAPI tool. It does not parse or resolve OpenAPI documents natively. Its `$dynamicRef` support is relevant when OpenAPI 3.1 schemas are extracted and validated individually. The tool is well-maintained by Julian Berman, with regular releases and active PR merging.

## Status Snapshot

| Property | Value |
|---|---|
| Repository | https://github.com/python-jsonschema/jsonschema |
| Packages | `jsonschema`, `referencing`, `jsonschema-specifications`, `rpds-py` |
| Category | JSON Schema runtime validator |
| Language | Python |
| License | MIT |
| Version analyzed | 4.26.0 |
| Latest PyPI publish | 4.26.0 (2026-01-07) |
| JSON Schema drafts supported | 3, 4, 6, 7, 2019-09, 2020-12 |
| `$dynamicRef` status | **Implemented** — passes official test suite |
| OpenAPI 3.1 relevance | Indirect: python-jsonschema validates JSON Schema portions; downstream OpenAPI tools may use it |
| Landing likelihood | N/A — support already exists; bugfix PRs for edge cases would likely land |

## Maintenance And Landing Likelihood

The project is active. Latest release v4.26.0 was published 2026-01-07. Recent meaningful commits include PR merges through June 2026 (pre-commit updates, ErrorTree fixes, Python 3.15 test fixes). The repository has ~5k stars, 623 forks, and ~50 open issues with ~5 open PRs.

Julian Berman (`Julian` on GitHub) is the sole active maintainer and reviewer. External PRs are merged (e.g., #1459 from a contributor fixing `multipleOf`, #1487 for Python 3.15 compatibility). Review turnaround varies from days to months depending on complexity.

The `referencing` library (same author, same org) has 53 stars, 22 forks, and is actively maintained with 107 releases.

Landing likelihood for a well-scoped `$dynamicRef` bugfix PR is **high**. Evidence: the v4.5.0 performance regression (#941) was fixed within a day via revert in v4.5.1. The v4.20.0 release explicitly fixed `$dynamicRef` + `unevaluatedItems`/`unevaluatedProperties` interaction. The maintainer clearly cares about `dynamicRef` correctness.

## Dependency Chain

python-jsonschema's core dependencies (from `pyproject.toml`):

- `attrs>=22.2.0` — class definitions
- `jsonschema-specifications>=2023.03.6` — bundled JSON Schema meta-schemas
- `referencing>=0.28.4` — **reference resolution, including `$dynamicRef` dynamic scope**
- `rpds-py>=0.25.0` — Rust-based persistent data structures (used for `HashTrieMap` in registry)

The `referencing` library is the critical dependency. It handles:
- URI resolution and base URI tracking
- `$id` / `$anchor` / `$dynamicAnchor` discovery
- Resource registry construction
- Dynamic scope chain (`Resolver.dynamic_scope()`)
- `DynamicAnchor.resolve()` — the actual dynamic scope walk

`rpds-py` provides the `HashTrieMap` used for the anchor registry and `HashTrieMap`-backed immutable collections in the resolver.

python-jsonschema does not use `@apidevtools/json-schema-ref-parser`, Swagger ApiDOM, Redocly OpenAPI Core, AJV, or any OpenAPI-specific tooling. It is a pure JSON Schema validator.

The tool does not bundle or dereference OpenAPI specs. It operates on individual JSON Schema objects. When used to validate OpenAPI 3.1 response schemas, the caller must extract the schema from the OpenAPI document first.

python-jsonschema advertises draft 2020-12 support and correctly uses the 2020-12 dialect for schemas declaring `"$schema": "https://json-schema.org/draft/2020-12/schema"`. The `Draft202012Validator` class includes `$dynamicRef` in its keyword set.

## Current DynamicRef Behavior

### Implementation Architecture

The `$dynamicRef` resolution chain:

1. `jsonschema._keywords.dynamicRef` — keyword handler registered in `Draft202012Validator`
2. Delegates to `validator._validate_reference(ref=dynamicRef, instance=instance)`
3. `_validate_reference` calls `self._resolver.lookup(ref)` (from `referencing`)
4. `Resolver.lookup` parses the ref into URI + fragment
5. For anchor fragments (non-pointer), calls `registry.anchor(uri, fragment)` to get an `Anchor` or `DynamicAnchor`
6. If the anchor is a `DynamicAnchor`, calls `DynamicAnchor.resolve(resolver)`
7. `DynamicAnchor.resolve` walks `resolver.dynamic_scope()` — a stack of `(uri, registry)` pairs from the current resolver chain
8. Returns the most recently encountered `DynamicAnchor` with the matching name, or falls back to the initial anchor

The `$ref` handler (`jsonschema._keywords.ref`) also delegates to `_validate_reference`, but `Resolver.lookup` for `$ref` does not walk the dynamic scope — it resolves anchors statically. The distinction is handled in `referencing` by the anchor type: `$anchor` creates a plain `Anchor` (static), `$dynamicAnchor` creates a `DynamicAnchor` (dynamic scope walk).

### Verified Results (2026-06-12)

Tests run against jsonschema 4.26.0 with all 8 fixture patterns:

| Fixture | Pattern | Result | Notes |
|---|---|---|---|
| `baseline-duplicated-pagination` | No `$dynamicRef` (control) | **PASS** | Baseline validation works |
| `generic-schema-binding` | Named component `$dynamicRef` + `$id` | **PASS** | `PaginatedUserResponse` correctly binds `User` via `$dynamicAnchor` |
| `allOf-generic-binding` | `allOf`-based `$dynamicRef` binding | **PASS** | `AssetPaged`/`GroupPaged` correctly bind concrete types |
| `recursive-category-tree` | Recursive self-type via `$dynamicRef` | **PASS** | `LocalizedCategory.children` resolves to `LocalizedCategory`, not `BaseCategory` |
| `non-identifier-schema-key` | Same as recursive with kebab-case keys | **PASS** | Kebab-case schema keys work identically |
| `nested-workspace-resources` | Multi-parameter `$dynamicRef` | **PASS** | Two `$dynamicAnchor` slots (`folderType` + `resourceType`) both resolve correctly |
| `paginated-response` | Inline response `$defs` binding | **FAIL** | `$dynamicRef` resolves to `not: {}` (fallback) — dynamic scope doesn't include anonymous inline schema |
| `api-envelope` | Double-wrapping `$dynamicRef` | **FAIL** | Same root cause: inline response schemas without `$id` don't participate in dynamic scope |

**Summary**: 6/8 fixtures pass. The 2 failures are both caused by the same issue: inline response schemas without `$id` don't participate in dynamic scope tracking.

### What Works

- **Named component `$dynamicRef` binding**: `generic-schema-binding.yaml` — schemas with `$id` in `components/schemas` correctly bind concrete types through `$dynamicAnchor` overrides in `$defs`. Validated with both valid and invalid instances.
- **`allOf`-based generic binding**: `allOf-generic-binding.yaml` — `$dynamicRef` resolves correctly when the binding schema uses `allOf` to compose the template with `$defs` containing `$dynamicAnchor` overrides.
- **Recursive self-type via `$dynamicRef`**: `recursive-category-tree.yaml` — `LocalizedCategory.children` correctly resolves to `LocalizedCategory` (not `BaseCategory`). Invalid instances (children missing `displayName`/`locale`) are correctly rejected.
- **Non-identifier schema keys**: `non-identifier-schema-key.yaml` — identical to recursive-category-tree but with kebab-case schema keys (`base-category`, `localized-category`). Works identically.
- **Multi-parameter `$dynamicRef`**: `nested-workspace-resources.yaml` — two independent `$dynamicAnchor` slots (`folderType` + `resourceType`) both resolve to their concrete overrides (`WorkspaceFolder` + `WorkspaceResource`).
- **`unevaluatedProperties` / `unevaluatedItems` after `$dynamicRef`**: Fixed in v4.20.0.

### What Does NOT Work

- **Inline response schemas without `$id`**: When `$dynamicRef` is used in inline response schemas (no `$id`, not registered as named components), the `referencing` library's `DynamicAnchor.resolve` cannot find the `$dynamicAnchor` override because the schema has no resource identity in the registry. The `$dynamicRef` falls back to the template's own `$dynamicAnchor` (which has `not: {}`), causing all valid instances to be rejected.
  - **Affected fixtures**: `paginated-response.yaml`, `api-envelope.yaml`
  - **Workaround**: Adding a synthetic `$id` to the inline schema before validation makes both patterns pass.
  - **Root cause**: The `referencing` library's `Resolver` tracks dynamic scope via `(uri, registry)` pairs. A schema without `$id` has `uri = None`, and `DynamicAnchor.resolve` cannot look up anchors in anonymous resources during the dynamic scope walk.

### Workaround for Inline Schemas

The failing patterns can be made to work by adding a synthetic `$id` to the inline schema before validation:

```python
schema["$id"] = "file:///oas/responses/users-200"
registry = registry.with_resource(schema["$id"], Resource.from_contents(schema, default_specification=DRAFT202012))
validator = Draft202012Validator(schema, registry=registry)
```

This gives the `referencing` library a resource identity to track in the dynamic scope chain.
- **Two-level `$dynamicRef` nesting** (`api-envelope.yaml`): The envelope template contains a `$dynamicRef` to `dataType`, and the paginated binding itself contains a `$dynamicRef` to `itemType`. This nested dynamic scope resolution is not tested in the official suite.

### Failure Mode

If dynamic scope resolution fails, the fallback behavior is to resolve the `$dynamicRef` to the initial (template's own) `$dynamicAnchor` — effectively behaving like a static `$ref`. For the fixture patterns, this would mean `$dynamicRef: '#itemType'` resolves to `not: {}` (the placeholder in the template), causing valid instances to fail validation (every item would be rejected by `not: {}`).

The failure mode is **wrong binding** rather than crash, error, or silent degradation.

## Relevant Source Map

### jsonschema package

| File | Function/Class | Role |
|---|---|---|
| `jsonschema/_keywords.py:dynamicRef` | `dynamicRef(validator, dynamicRef, instance, schema)` | Keyword handler; delegates to `_validate_reference` |
| `jsonschema/_keywords.py:ref` | `ref(validator, ref, instance, schema)` | `$ref` handler; also delegates to `_validate_reference` |
| `jsonschema/validators.py:Validator._validate_reference` | `_validate_reference(self, ref, instance)` | Shared ref resolution; calls `_resolver.lookup(ref)` |
| `jsonschema/validators.py:Validator.descend` | `descend(self, instance, schema, ...)` | Creates evolved validator with updated resolver; critical for dynamic scope tracking |
| `jsonschema/validators.py:Validator.__attrs_post_init__` | `__attrs_post_init__` | Initializes `_resolver` from `_registry` |
| `jsonschema/validators.py:DRAFT202012Validator` | `Draft202012Validator` | Pre-built validator class with `$dynamicRef` registered |
| `jsonschema/_utils.py` | `find_evaluated_item_indexes_by_schema` | Tracks `$dynamicRef` for `unevaluatedItems` evaluation |
| `jsonschema/_utils.py` | `find_evaluated_property_keys_by_schema` | Tracks `$dynamicRef` for `unevaluatedProperties` evaluation |

### referencing package

| File | Function/Class | Role |
|---|---|---|
| `referencing/jsonschema.py:DynamicAnchor` | `DynamicAnchor.resolve(resolver)` | **Core dynamic scope resolution** — walks `resolver.dynamic_scope()` to find the most recent matching `$dynamicAnchor` |
| `referencing/jsonschema.py:_anchor` | `_anchor(specification, contents)` | Discovers `$anchor` and `$dynamicAnchor` in schema contents |
| `referencing/_core.py:Resolver.lookup` | `lookup(ref)` | Resolves URI + fragment; dispatches to anchor resolution |
| `referencing/_core.py:Resolver.dynamic_scope` | `dynamic_scope()` | Returns the dynamic scope chain (list of `(uri, registry)` pairs) |
| `referencing/_core.py:Resolver._evolve` | `_evolve(base_uri, **kwargs)` | Appends to `_previous` deque when base URI changes |
| `referencing/_core.py:Resolver.in_subresource` | `in_subresource(subresource)` | Creates resolver for subresource; calls `_evolve` |
| `referencing/_core.py:Registry.anchor` | `anchor(uri, name)` | Looks up anchor by URI and name; returns `Anchor` or `DynamicAnchor` |

### jsonschema-specifications package

Bundles the official JSON Schema meta-schemas. Not directly relevant to `$dynamicRef` resolution but provides the meta-schemas used during `check_schema`.

## Existing Issues And Prior Art

### Issue #782 — Support for v2020-12 and v2019 drafts
- **Opened by**: gk12277 (external)
- **Closed by**: Julian (maintainer) on 2021-09-29
- **Status**: Closed with note that v4.0.0 added partial support. Maintainer explicitly stated: "support for `dynamicRef` did not make it in -- adding support for it is non-trivial. I'm definitely keen on adding it (as soon as possible), but I'm fairly certain doing so reasonably will require revamping `RefResolver`."
- **Outcome**: `$dynamicRef` support was later added via the `referencing` library in v4.18.0.

### Issue #941 — Very slow validation after dynamicRef implementation
- **Opened by**: mriedem (external)
- **Closed by**: Julian (maintainer) on 2023-02-23
- **Status**: Fixed by reverting the problematic `$dynamicRef` change in v4.5.1, then properly addressed in v4.18.0 with the `referencing` library overhaul (#1049).
- **Outcome**: The v4.5.0 `$dynamicRef` implementation caused a performance regression even for schemas without user-level `$dynamicRef` (only metaschema usage). The `referencing` library rewrite resolved this.

### Issue #1068 — $dynamicRefs not evaluated on error
- **Opened by**: ikonst (contributor)
- **Closed by**: ikonst (author) on 2023-03-25
- **Status**: Withdrawn by the author after discovering it was a misunderstanding of `unevaluatedProperties` behavior, not a `$dynamicRef` bug.
- **Outcome**: Not a real bug. The maintainer confirmed the implementation passes all upstream test suite tests.

### v4.20.0 changelog — $dynamicRef + unevaluated fix
- "Properly consider items (and properties) to be evaluated by `unevaluatedItems` (resp. `unevaluatedProperties`) when behind a `$dynamicRef`"
- This fix ensures that properties/items validated through a `$dynamicRef` are correctly marked as evaluated for `unevaluatedProperties` / `unevaluatedItems` purposes.

### v4.5.0/v4.5.1 — dynamicRef performance regression
- v4.5.0 introduced `$dynamicRef` support with a performance regression (#941)
- v4.5.1 reverted the changes
- v4.18.0 re-introduced `$dynamicRef` support properly via the `referencing` library

### No OpenAPI-specific issues
- No issues about OpenAPI 3.1, schema components, or OpenAPI-specific `$dynamicRef` patterns were found.

## Failure Modes To Test

| Fixture | Expected behavior if dynamic scope works | Verified behavior | Failure mode |
|---|---|---|---|
| `baseline-duplicated-pagination.yaml` | Pass (no `$dynamicRef`) | **PASS** | N/A — control fixture |
| `generic-schema-binding.yaml` | Valid `{items: [{id: "1", email: "a@b.com"}], total: 1, page: 1, pageSize: 10}` passes | **PASS** | N/A |
| `allOf-generic-binding.yaml` | Valid asset pages pass | **PASS** | N/A |
| `paginated-response.yaml` | Valid user pages pass (inline `$defs` binding) | **FAIL** | `$dynamicRef` resolves to `not: {}` — inline schema without `$id` not in dynamic scope |
| `api-envelope.yaml` | Valid wrapped user passes; two-level dynamic scope resolution | **FAIL** | Same: inline response schema without `$id` not tracked in dynamic scope |
| `recursive-category-tree.yaml` | Valid localized category tree passes | **PASS** | N/A |
| `nested-workspace-resources.yaml` | Valid workspace passes; multi-parameter dynamic scope | **PASS** | N/A |
| `non-identifier-schema-key.yaml` | Same as `recursive-category-tree.yaml` but with hyphenated keys | **PASS** | N/A |

## Test Plan

### Verified Results

All 8 fixtures were tested against jsonschema 4.26.0 on 2026-06-12. See "Verified Results" section above for the full table.

### Remaining tests

1. **Verify the inline-schema workaround is safe** — ensure synthetic `$id` doesn't interfere with `$ref` resolution to other named components. Run `api-envelope.yaml` (which has both inline and named component schemas) with the workaround to confirm no regressions.
2. **Test the `unevaluatedProperties`/`unevaluatedItems` interaction** — the `_utils.py` helpers resolve `$dynamicRef` independently of the main validation path. Verify this doesn't break when combined with `unevaluatedProperties` in the fixture patterns.
3. **Test version matrix** — run against OAS 3.1.1, 3.1.2, 3.2.0 variants (from `specs/`) to confirm behavior is consistent across OpenAPI versions.

### Assertions

**Automatable:**
- Valid instances should produce zero validation errors.
- Invalid instances (e.g., paginated response with wrong item type) should produce validation errors.
- `$dynamicRef` should resolve to the concrete type, not to `not: {}`.

**Requires human review:**
- Whether the inline-schema workaround (synthetic `$id`) is acceptable for downstream OpenAPI tooling that uses python-jsonschema.
- Whether the `referencing` library should be patched to handle anonymous schemas in dynamic scope.

## Implementation Plan

### Current state

python-jsonschema **already has** `$dynamicRef` / `$dynamicAnchor` support. Verified: 6/8 fixtures pass, 2 fail due to inline schemas without `$id`.

### Bug report: inline schemas without `$id` don't participate in dynamic scope

**Minimal reproducer:**

```python
from jsonschema import Draft202012Validator
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012

template = {
    "$id": "https://example.com/PaginatedTemplate",
    "$defs": {"itemType": {"$dynamicAnchor": "itemType", "not": {}}},
    "type": "object",
    "required": ["items"],
    "properties": {"items": {"type": "array", "items": {"$dynamicRef": "#itemType"}}}
}

# Inline binding schema (no $id) — FAILS
inline_no_id = {
    "$defs": {"itemType": {"$dynamicAnchor": "itemType", "type": "string"}},
    "$ref": "https://example.com/PaginatedTemplate"
}

# Same schema with $id — PASSES
inline_with_id = {
    "$id": "https://example.com/Bound",
    "$defs": {"itemType": {"$dynamicAnchor": "itemType", "type": "string"}},
    "$ref": "https://example.com/PaginatedTemplate"
}

registry = Registry().with_resource(
    "https://example.com/PaginatedTemplate",
    Resource.from_contents(template, default_specification=DRAFT202012)
)

instance = {"items": ["hello"]}

# Without $id: fails (items rejected by not:{})
v1 = Draft202012Validator(inline_no_id, registry=registry)
assert not list(v1.iter_errors(instance)), "BUG: without $id, dynamicRef falls back to not:{}"

# With $id: passes
reg2 = registry.with_resource(
    "https://example.com/Bound",
    Resource.from_contents(inline_with_id, default_specification=DRAFT202012)
)
v2 = Draft202012Validator(inline_with_id, registry=reg2)
assert not list(v2.iter_errors(instance)), "should not happen"
```

### Where to file

The fix belongs in the `referencing` library. When `DynamicAnchor.resolve` walks `resolver.dynamic_scope()`, it should be able to discover `$dynamicAnchor` overrides in anonymous resources (those without `$id`).

### Backwards-compatibility risks

Minimal. The `$dynamicRef` implementation is already in place. Bugfixes to dynamic scope resolution would only affect schemas that use `$dynamicRef` / `$dynamicAnchor`. Schemas using only `$ref`, `$id`, `$anchor`, or earlier drafts would be unaffected.

### If a fix is needed

The fix would belong in the `referencing` library, which is the lowest shared layer for reference resolution. Changes to `jsonschema` itself would only be needed if the issue is in how the validator calls into `referencing` (e.g., not passing the correct resolver through `descend`).

## Upstream Strategy

### Recommendation

**File a targeted bug report** with the minimal reproducer above.

The bug is clear: inline schemas without `$id` don't participate in dynamic scope tracking. This affects OpenAPI 3.1 patterns where `$dynamicAnchor` overrides are placed inline in response schemas rather than in named components.

### Expected upstream acceptance likelihood

**High** for a well-scoped bugfix with a minimal reproducer. Evidence:
- The maintainer explicitly cares about `$dynamicRef` correctness (v4.20.0 fix).
- External PRs are merged regularly.
- The `referencing` library is under active development by the same author.

### Starting point

1. File an issue on `python-jsonschema/jsonschema` with the minimal reproducer.
2. If the maintainer confirms, the fix would go into `referencing`'s `DynamicAnchor.resolve` or `Resolver` to handle anonymous resources in the dynamic scope walk.
3. If the fix belongs in `referencing`, the maintainer will redirect accordingly.

### Downstream beneficiaries

If bugs are found and fixed in `referencing`'s dynamic scope handling:
- **python-jsonschema** users who validate OpenAPI 3.1 schemas
- **openapi-core** (if it uses python-jsonschema for validation)
- **schemathesis** (uses python-jsonschema)
- **check-jsonschema** (CLI tool from the same org)
- Any Python OpenAPI tool that delegates schema validation to python-jsonschema

## Open Questions

1. **Should `referencing` handle anonymous schemas in dynamic scope?** The JSON Schema spec says `$dynamicRef` walks the dynamic scope, which is the stack of schema resources being processed. If a schema doesn't have `$id`, it has no resource identity. The `referencing` library currently can't discover `$dynamicAnchor` in anonymous resources during the dynamic scope walk. Is this a spec compliance issue or acceptable behavior?

2. ~~**Does the dynamic scope chain survive OpenAPI `$ref` + `$id` composition?**~~ **Answered: YES.** Verified that `generic-schema-binding.yaml` passes with correct `$id` on both template and derived schemas.

3. ~~**Does `DynamicAnchor.resolve` handle the case where the initial anchor is the only match?**~~ **Answered: YES.** The fallback behavior works correctly — when no override is found, the template's own `$dynamicAnchor` is used.

4. ~~**Are the `find_evaluated_*` helpers in `_utils.py` using dynamic scope correctly?**~~ **Not yet tested.** The `_utils.py` helpers call `validator._resolver.lookup(dynamicRef)` independently of the validator's `descend` path. This has not been tested in the current verification run.

5. **What happens with the `nested-workspace-resources.yaml` multi-parameter pattern?** **Answered: PASSES.** Two `$dynamicAnchor` slots (`folderType` + `resourceType`) both resolve correctly.

## Sources

- Repository: https://github.com/python-jsonschema/jsonschema (main branch, v4.26.0)
- `referencing` library: https://github.com/python-jsonschema/referencing (main branch, v0.37.0)
- PyPI: https://pypi.org/project/jsonschema/ (v4.26.0, 2026-01-07)
- CHANGELOG: https://github.com/python-jsonschema/jsonschema/blob/main/CHANGELOG.rst
- Key source files: `jsonschema/_keywords.py`, `jsonschema/validators.py`, `jsonschema/_utils.py`, `referencing/jsonschema.py`, `referencing/_core.py`
- Issues: #782 (2020-12 support), #941 (dynamicRef performance), #1068 (dynamicRef error reporting)
- JSON Schema Test Suite: https://github.com/json-schema-org/JSON-Schema-Test-Suite (44 `dynamicRef` test cases for draft 2020-12)
- Dependencies from `pyproject.toml`: `attrs>=22.2.0`, `jsonschema-specifications>=2023.03.6`, `referencing>=0.28.4`, `rpds-py>=0.25.0`
