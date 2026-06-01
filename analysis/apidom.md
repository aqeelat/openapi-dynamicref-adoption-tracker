# ApiDOM (`@swagger-api/apidom-reference`)

## Summary

ApiDOM is the reference resolution engine used by swagger-client and, transitively, by Swagger UI. It parses OpenAPI documents into an element tree (AST) and dereferences `$ref` by traversing that tree. The JSON Schema 2020-12 element model defines `$dynamicRef` and `$dynamicAnchor` fields, but the dereference engine never resolves them. This is the single fix point for the entire Swagger ecosystem's `$dynamicRef` gap.

## Status Snapshot

| Field | Value |
|---|---|
| Category | Parser / resolver / dereference engine |
| Repository | https://github.com/swagger-api/apidom |
| Package | `@swagger-api/apidom-reference@1.11.1` |
| Key upstream issue | https://github.com/swagger-api/apidom/issues/378 (closed `not_planned`, likely stale) |
| Downstream impact | swagger-client, swagger-ui, and all tools using ApiDOM for dereference |
| Current support | `$dynamicRef`/`$dynamicAnchor` parsed into element tree but never resolved during dereference |

## Maintenance And Landing Likelihood

- Latest release: v1.11.1 (recent, actively maintained)
- Maintainers: @char0n (Vladimir Gorej, SmartBear), @robert-hebel-sb, @cka121
- Issue #378 was opened by @char0n himself in 2021 — the feature was planned
- Closed `not_planned` by SmartBear employee @MichakrawSB in Nov 2025 with zero comments
- No evidence of technical rejection — closure was likely stale-issue cleanup
- A well-scoped PR with tests following existing patterns has a **medium** landing likelihood

## Dependency Chain

```
swagger-ui@5.32.6
  └── swagger-client@3.37.4
        └── @swagger-api/apidom-reference@1.11.1
              ├── @swagger-api/apidom-core
              ├── @swagger-api/apidom-ns-openapi-3-1
              ├── @swagger-api/apidom-ns-openapi-3-2
              └── @swagger-api/apidom-ns-json-schema-2020-12 (element model)
```

No external resolver or validator dependencies — ApiDOM has its own AST, traversal, and resolution infrastructure.

## Current DynamicRef Behavior

| Aspect | Status |
|---|---|
| Element model (`apidom-ns-json-schema-2020-12`) | `$dynamicRef`/`$dynamicAnchor` defined as getters/setters on `JSONSchema` element |
| Refractor | Registered as value fields — parsed from JSON/YAML correctly |
| Dereference visitor (`SchemaElement` handler) | **Only checks `$ref`**. Guard: `if (!isStringElement(referencingElement.$ref)) return undefined` — skips schemas with `$dynamicRef` but no `$ref` |
| `$anchor` selector | Searches for `$anchor` only, not `$dynamicAnchor` |
| URI selector | Delegates to `$anchorEvaluate` or JSON Pointer — no `$dynamicAnchor` awareness |
| Test coverage | Zero test fixtures for `$dynamicRef`/`$dynamicAnchor` dereference |

### Failure Mode

When a schema contains `{ "$dynamicRef": "#itemType" }` with no `$ref`:
1. The `SchemaElement` handler returns `undefined` (skip)
2. The `$dynamicRef` keyword passes through to the output as a plain string
3. `toValue()` converts the AST to a plain JS object with `$dynamicRef: "#itemType"` intact
4. Downstream consumers (swagger-client, swagger-ui) see an unresolved keyword
5. Swagger UI's sample generator sees no `type`/`properties` and falls back to `"string"`

## Relevant Source Map

| Concern | File |
|---|---|
| Strategy entry point | `packages/apidom-reference/src/dereference/strategies/openapi-3-1/index.ts` |
| Dereference visitor | `packages/apidom-reference/src/dereference/strategies/openapi-3-1/visitor.ts` |
| `$anchor` selector | `packages/apidom-reference/src/dereference/strategies/openapi-3-1/selectors/$anchor.ts` |
| URI selector | `packages/apidom-reference/src/dereference/strategies/openapi-3-1/selectors/uri.ts` |
| Utility functions | `packages/apidom-reference/src/dereference/strategies/openapi-3-1/util.ts` |
| Element model | `packages/apidom-ns-json-schema-2020-12/src/elements/JSONSchema.ts` |
| Schema dereference tests | `packages/apidom-reference/test/dereference/strategies/openapi-3-1/schema-object/index.ts` |
| 3.2 visitor (mirror) | `packages/apidom-reference/src/dereference/strategies/openapi-3-2/visitor.ts` |

### Key Code: `SchemaElement` Handler (visitor.ts:966-1322)

The handler resolves `$ref` through this flow:
1. Guard: `if (!isStringElement(referencingElement.$ref)) return undefined` — **this is where `$dynamicRef` is skipped**
2. Compute base URI via `resolveSchema$refField()` using `$id` ancestor metadata
3. Classify URI: unknown, URL, or JSON Pointer
4. Resolve target: `uriEvaluate()` or `jsonPointerEvaluate()`
5. Cycle detection: self-reference, max depth, ancestor lineage
6. Recursive dive: create nested visitor, `visitAsync()` into target
7. Merge: clone target, overlay referencing element's keywords, remove `$ref`
8. Transclude: `link.replaceWith(mergedElement, mutationReplacer)`

### Dynamic Scope Resolution Logic Needed

For `$dynamicRef`, the resolution differs from `$ref` in step 4:
- `$ref` resolves statically: follow the URI to find the target schema
- `$dynamicRef` resolves dynamically: walk the **ancestor lineage** to find the closest `$dynamicAnchor` matching the fragment, then use that schema as the target
- If no matching `$dynamicAnchor` in ancestors: fall back to static URI resolution (same as `$ref`)

The ancestor lineage is already tracked by the visitor (`AncestorLineage` class, `ancestors` parameter). Walking it from innermost to outermost and checking `toValue(ancestor.$dynamicAnchor) === anchorName` implements dynamic scope for same-document patterns.

## Existing Issues And Prior Art

| Issue | Opened by | Status | Notes |
|---|---|---|---|
| [apidom#378](https://github.com/swagger-api/apidom/issues/378) | @char0n (maintainer) | Closed `not_planned` (Nov 2025) | Original feature request for `$dynamicRef`/`$dynamicAnchor` dereference. Zero comments on closure. |
| [apidom#3697](https://github.com/swagger-api/apidom/issues/3697) | @char0n (maintainer) | Closed `not_planned` (Nov 2025) | ApiDOM converter missing `$dynamicRef`/`$dynamicAnchor` support. |
| [apidom#306](https://github.com/swagger-api/apidom/issues/306) | @char0n (maintainer) | Closed `completed` | Schema Object dereference parent tracker. #378 was the only unchecked item; parent closed anyway. |
| [swagger-ui#10912](https://github.com/swagger-api/swagger-ui/issues/10912) | Community | Open | Outreach issue documenting the dependency chain and proposed fix path. |
| [swagger-ui#10651](https://github.com/swagger-api/swagger-ui/issues/10651) | @owjs3901 | Open (no response) | Original report: `$dynamicRef` unsupported, examples become null/empty. |

## Failure Modes To Test

- Schema with `$dynamicRef` but no `$ref` passes through unchanged (current behavior, confirmed)
- `$dynamicRef` with matching `$dynamicAnchor` in ancestor chain resolves to the ancestor's schema
- `$dynamicRef` with no matching `$dynamicAnchor` falls back to static URI resolution
- Recursive `$dynamicRef` (tree structure) handled by existing circular reference detection
- `$dynamicRef` with both `$ref` present: `$ref` takes precedence (existing `$ref` code path handles it)

## Test Plan

Use ApiDOM's existing test pattern: `root.json` + `dereferenced.json` fixtures under `test/dereference/strategies/openapi-3-1/schema-object/fixtures/`.

### Fixtures to add

| Fixture | What It Tests |
|---|---|
| `$dynamicRef-internal` | Basic: `$dynamicRef` resolves to `$dynamicAnchor` in same document. Generic pagination pattern. |
| `$dynamicRef-recursive` | Self-referential: `$dynamicRef` in `children` resolves to same schema. Circular detection. |
| `$dynamicRef-fallback` | No matching `$dynamicAnchor` in ancestors. Falls back to static anchor/pointer resolution. |

### Test command

```bash
cd packages/apidom-reference
npm test -- --grep "openapi-3-1.*Schema Object"
```

### Upstream test framework

Mocha + TypeScript (`ts-mocha`), Chai assertions. Follow existing patterns in `schema-object/index.ts`.

## Implementation Plan

### Smallest useful change

Add `$dynamicRef` handling to the `SchemaElement` visitor in the OpenAPI 3.1 dereference strategy. Scope: local (same-document) `$dynamicRef` / `$dynamicAnchor` only.

### Step 1: New `$dynamicAnchor` selector

Create `selectors/$dynamicAnchor.ts` analogous to `selectors/$anchor.ts`:
- `evaluate(anchor, element)` — `find()` for `SchemaElement` with matching `$dynamicAnchor`
- Same validation and error class pattern

### Step 2: Modify `SchemaElement` handler

After the `$ref` guard (`visitor.ts:975`), add `$dynamicRef` code path:

```typescript
if (!isStringElement(referencingElement.$ref)) {
  if (isStringElement(referencingElement.$dynamicRef)) {
    // 1. Extract anchor name from $dynamicRef value
    // 2. Walk ancestorsLineage to find closest $dynamicAnchor match
    // 3. If found: use ancestor schema as referencedElement
    // 4. If not found: fall back to static resolution ($anchor / JSON Pointer)
    // 5. Apply same merge/transclude pattern as $ref
    // 6. Remove $dynamicRef from merged element
  }
  return undefined;
}
```

### Step 3: Apply to OpenAPI 3.2 strategy

The 3.2 visitor mirrors 3.1. Apply identical changes.

### Step 4: Add tests

Three fixture pairs following existing patterns.

### Backwards-compatibility

- `$ref` behavior unchanged (guard fires first)
- `$anchor` behavior unchanged (separate selector)
- Circular reference handling unchanged (same detection)
- OpenAPI 3.0 specs unaffected (no `$dynamicRef` keywords)
- Schemas with both `$ref` and `$dynamicRef`: `$ref` takes precedence (existing behavior preserved)

## Upstream Strategy

1. Comment on apidom#378 noting that the closure may have been stale and offering a PR
2. Submit PR with failing tests first, then implementation
3. Reference swagger-ui#10912 and swagger-ui#10651 as downstream evidence
4. Frame as "complete the JSON Schema 2020-12 dereference support" rather than a new feature

## Recommendation

**Tackle now.** The fix is well-scoped, the codebase patterns are clear, and the impact is high (fixes the entire Swagger ecosystem). Landing likelihood is medium — the feature was originally planned by the maintainer, the closure was likely administrative, and the code change follows existing patterns exactly.

## Open Questions

- Should the first PR support external `$dynamicRef` (cross-document), or local-only?
- Should `$dynamicRef` resolution also be added to the bundler, or only the dereference strategy?
- Does swagger-client's custom dereference visitor (which extends the base ApiDOM visitor) need awareness of `$dynamicRef`, or does the base visitor fix propagate automatically?

## Sources

- https://github.com/swagger-api/apidom
- https://github.com/swagger-api/apidom/issues/378
- https://github.com/swagger-api/apidom/issues/3697
- https://github.com/swagger-api/apidom/issues/306
- https://github.com/swagger-api/swagger-ui/issues/10912
- https://github.com/swagger-api/swagger-ui/issues/10651
