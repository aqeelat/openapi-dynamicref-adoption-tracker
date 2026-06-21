# openapi-typescript

## Summary

`openapi-typescript` (a.k.a. `openapi-ts`) is a TypeScript type generator that consumes OpenAPI 3.x specs and emits `.d.ts` type definitions. It is the keystone of a 6-package monorepo that also includes `openapi-fetch` (type-safe fetch client), `openapi-react-query`, and `openapi-typescript-helpers`. The tool uses `@redocly/openapi-core` for spec loading, validation, and `$ref` bundling, then walks the schema graph to emit TypeScript AST nodes via the TypeScript compiler API factory functions.

**`$dynamicRef` and `$dynamicAnchor` are completely unsupported.** There are zero mentions of these keywords anywhere in source, tests, or configuration. Schemas containing `$dynamicRef` silently degrade to `unknown` in the generated output. Issue [#2029](https://github.com/openapi-ts/openapi-typescript/issues/2029) tracks this gap; the maintainer has expressed interest and suggested partnering with Redocly Core. No PR exists.

## Status Snapshot

| Property | Value |
|---|---|
| **Repository** | https://github.com/openapi-ts/openapi-typescript |
| **Legacy name** | Was `openapi-typescript` (single package); monorepo renamed to `openapi-ts` org |
| **Packages to analyze** | `packages/openapi-typescript` (the type generator CLI/library) |
| **Category** | Type generator / SDK generator (spec consumer → TypeScript types) |
| **Version analyzed** | `7.13.0` (latest release) |
| **OpenAPI versions** | 3.0 and 3.1 |
| **`$dynamicRef` support** | None — silent degradation to `unknown` |
| **Tracking issue** | [#2029](https://github.com/openapi-ts/openapi-typescript/issues/2029) |

## Maintenance And Landing Likelihood

| Metric | Value |
|---|---|
| **Most recent meaningful commit** | 2026-02-27 (`feat: allow CLI flags in redocly.yaml`, #2646) |
| **Last source change** | 2026-02-12 (`feat(openAPI-union) Add type support for unions with additionalProperties`, #2415) |
| **Latest release** | `openapi-typescript@7.13.0` |
| **Open issues** | ~256 |
| **Open PRs** | ~30 |
| **GitHub stars** | 8,152 |
| **Maintainer** | Drew Powers (`@drwpow`) — sole active maintainer and reviewer |
| **External PRs merged recently** | Yes — 7.10–7.13 all contain external contributions |
| **Project status** | Active but slow-moving — maintainer reviews and merges external PRs regularly; most recent source changes are community-driven features |

**Landing likelihood: Medium–High.** Evidence:

- Issue #2029 is open with `enhancement` label and the maintainer is assigned.
- Maintainer explicitly commented (2024-12-10): "This is definitely something we'd love to support." Suggested partnering with Redocly Core.
- External PRs are regularly merged — the project is contributor-friendly.
- However, the maintainer has not started implementation, and the issue has been open since Dec 2024 without progress. The Redocly dependency angle adds coordination overhead.
- A well-scoped PR with comprehensive tests that doesn't require Redocly changes would have high acceptance odds.

## Dependency Chain

### Runtime dependencies (`packages/openapi-typescript`)

| Package | Version | Role |
|---|---|---|
| `@redocly/openapi-core` | `^1.34.6` (resolved: `1.34.6`) | Spec loading, linting, bundling, `$ref` resolution |
| `ansi-colors` | `^4.1.3` | CLI colored output |
| `change-case` | `^5.4.4` | Case conversion for root type names |
| `parse-json` | `^8.3.0` | JSON string parsing |
| `scule` | `^1.3.0` | kebab-case for CLI flags |
| `supports-color` | `^10.2.2` | Terminal color detection |
| `yargs-parser` | `^21.1.1` | CLI argument parsing |

### Key dependency analysis

- **`@redocly/openapi-core@1.34.6`** is the sole resolver. Zero mentions of `$dynamicRef`/`$dynamicAnchor`/`$recursiveRef`/`$recursiveAnchor` in the installed package. Redocly passes `$dynamicRef` through as an opaque keyword.
- **No `@apidevtools/json-schema-ref-parser`**, AJV, `openapi-sampler`, or `json-schema-tree` in the dependency chain.
- **`$dynamicRef` is ignored because traversal only checks `$ref`** — confirmed at `src/transform/schema-object.ts:79` (`if ("$ref" in schemaObject)`) and `src/lib/utils.ts:146` (`node.$ref`).
- The tool **bundles** (not dereferences) specs before type generation. Internal `$ref`s remain as JSON Pointer strings.
- OpenAPI 3.1 is advertised; `SchemaObject` doc comments reference "JSON Schema Specification Draft 2020-12." The tool handles 3.1-specific features (type arrays, nullable-as-type-union) but does **not** preserve the 2020-12 dialect — `$dynamicRef`, `$dynamicAnchor`, `$id`, and `$anchor` are simply not handled.

## Current DynamicRef Behavior

### Keyword handling

| Keyword | Parsed? | Preserved? | Semantically resolved? |
|---|---|---|---|
| `$ref` | Yes | No (converted to TS indexed access) | Yes |
| `$dynamicRef` | No | No | No |
| `$dynamicAnchor` | No | No | No |
| `$id` | No | No | No |
| `$anchor` | No | No | No |

### Exact failure mode

When a schema object contains `$dynamicRef` but no `$ref`, the code path in `src/transform/schema-object.ts` is:

1. **Line 62–68**: Schema is not falsy, not `true` — proceeds.
2. **Line 79–81**: `"$ref" in schemaObject` is **false** (`$dynamicRef` is a different key). Skipped.
3. **Line 86–88**: No `const`. Skipped.
4. **Line 94–210**: No `enum`. Skipped.
5. **Line 283**: `transformSchemaObjectCore()` called. No `type` field in typical `$dynamicRef`-only schemas. No `properties`/`additionalProperties`/`$defs`. Returns `undefined`.
6. **Lines 314–320**: `finalType` is `undefined`, no `type` in schemaObject → `finalType = UNKNOWN`.

**Result: `unknown`.** Silent degradation — no error, no warning, no crash. The generated TypeScript silently loses type safety.

## Relevant Source Map

### Spec loading/parsing

| File:line | Function | Role |
|---|---|---|
| `src/lib/redoc.ts:29` | `parseSchema()` | Parses schema from string/URL/Buffer/Readable/object |
| `src/lib/redoc.ts:107` | `validateAndBundle()` | Validates OpenAPI version, lints, bundles with `dereference: false` |
| `src/index.ts` | `openapiTS()` | Orchestrates pipeline |

### Reference traversal

| File:line | Function | Role |
|---|---|---|
| `src/lib/utils.ts:126` | `resolveRef()` | Resolves `$ref` by walking JSON Pointer; follows chained `$ref`s |
| `src/lib/ts.ts` | `oapiRef()` | Converts `$ref` to TypeScript indexed access type |
| `src/lib/utils.ts:368` | `walk()` | Recursive JSON walker (reusable for `$dynamicAnchor` discovery) |

### Type generation (core)

| File:line | Function | Role |
|---|---|---|
| `src/transform/schema-object.ts:52` | `transformSchemaObjectWithComposition()` | **Critical.** Line 79: `"$ref" in schemaObject` → `oapiRef()`. Where `$dynamicRef` support must be added. |
| `src/transform/schema-object.ts:361` | `transformSchemaObjectCore()` | Handles typed schemas, composition, properties, `$defs` |
| `src/transform/index.ts` | `transformSchema()` | Top-level iteration over paths/webhooks/components/`$defs` |

### Type definitions

| File:line | Type | Gap |
|---|---|---|
| `src/types.ts:406` | `ReferenceObject` | Only has `$ref` |
| `src/types.ts:419` | `SchemaObject` | Missing `$dynamicRef`, `$dynamicAnchor`, `$id`, `$anchor` |

## Existing Issues And Prior Art

### Issue #2029 — "implement OAS3.1 dynamic references" (OPEN)

- **Opened by**: @hesxenon (2024-12-02)
- **Status**: Open, assigned to @drwpow
- **Labels**: `enhancement`, `openapi-ts`
- **Comments**:
  1. @hesxenon — Updated example, linked to official OAS docs
  2. @drwpow (maintainer, 2024-12-10) — "This is definitely something we'd love to support." Suggested partnering with Redocly Core.
  3. @aqeelat (2026-05-21) — Detailed technical analysis: root cause, reproduction fixtures, two use cases (recursive types + generic/template types), implementation sketch.

**No PR exists. No fork with relevant support identified.**

### Related issues

| Issue | Status | Notes |
|---|---|---|
| #2577 (OpenAPI 3.2 support) | Open | Adjacent |
| #1872 (3.1 null enum) | Open | 3.1 handling gap |
| #2664 (`$defs` treated as required) | Open | Keyword handling bug |
| #2707 (Upgrade Redocly v2) | Open PR | Would update resolver dependency |

## Failure Modes To Test

| Fixture | Expected failure mode | What to assert |
|---|---|---|
| `recursive-category-tree.yaml` | `children` property typed as `unknown[]` instead of concrete category type | Baseline: `unknown[]`; after fix: `LocalizedCategory[]` |
| `paginated-response.yaml` | `items` property typed as `unknown[]` instead of concrete item type | Baseline: `unknown[]`; after fix: `User[]` / `Group[]` |
| `api-envelope.yaml` | Inner `data` field typed as `unknown` instead of concrete payload type | Baseline: `unknown`; after fix: concrete type |
| `generic-schema-binding.yaml` | Slot fields typed as `unknown` | Same pattern |

## Test Plan

### Upstream test framework

**Vitest.** Tests in `packages/openapi-typescript/test/`. Pattern: arrays of `{ given, want, options }` tuples.

### Test locations

- **Unit tests**: `test/transform/schema-object/` — tests `transformSchemaObject()` directly
- **Integration tests**: `test/index.test.ts` — tests `openapiTS()` end-to-end
- **Fixture-based tests**: `test/fixtures/`

### Baseline fixture

Use `test/fixtures/jsonschema-defs.yaml` or any existing fixture with `$ref` to verify ordinary `$ref` resolution is unchanged.

### Assertions per fixture

| Fixture | Baseline | After fix |
|---|---|---|
| `recursive-category-tree` | `children: unknown[]` | `children: LocalizedCategory[]` |
| `paginated-response` | `items: unknown[]` | `items: User[]` / `Group[]` |
| `api-envelope` | `data: unknown` | `data: <concrete type>` |
| `generic-schema-binding` | Slot fields: `unknown` | Slot fields: concrete types |

### Automation

All assertions can be automated by parsing generated TypeScript with `ts.createSourceFile()` and walking the AST.

### Human review needed

- Output style: inline concrete types vs. named type aliases
- Recursive type readability
- Whether generated types compile without errors

## Implementation Plan

> **Reference:** Orval (sibling package in the `openapi-ts` monorepo) already implements full `$dynamicRef` generic-type emission (PR [#3353](https://github.com/orval-labs/orval/pull/3353)). The resolver architecture should port directly. See [`analysis/orval-reference.md`](orval-reference.md) for the full implementation map. **Emit real generics (`interface PaginatedTemplate<T>`), NOT materialized concrete types.**

### Phase 1: Dynamic-scope resolver (Pattern A — recursive)

Port Orval's `buildDynamicScope` + `resolveDynamicRef` from `packages/core/src/resolvers/ref.ts` into openapi-typescript's `src/lib/utils.ts` + `src/transform/schema-object.ts`:

1. Add `$dynamicRef?: string` and `$dynamicAnchor?: string` to `SchemaObject` in `src/types.ts`.
2. At `schema-object.ts:79`, add a `$dynamicRef` branch parallel to `$ref`:
   ```typescript
   if ("$dynamicRef" in schemaObject) {
     return resolveDynamicRef(schemaObject.$dynamicRef, options) ?? UNKNOWN;
   }
   ```
3. Implement `resolveDynamicRef(anchorName, context)` per Orval's pattern (`ref.ts:437-521`): look up the anchor in a per-schema scope map, fall back to scanning `components.schemas` for a matching `$dynamicAnchor`, return the type name or `unknown`.

This handles recursive trees (`children: BaseCategory[]` instead of `unknown[]`).

### Phase 2: Generic-template emission (Pattern B — the real generics)

Port Orval's `extractBoundAliasInfo` + `collectGenericParams` from `packages/core/src/resolvers/ref.ts` + `generators/schema-definition.ts`:

1. **Template detection** (`collectGenericParams` equivalent): when a schema's `$defs` has entries with `$dynamicAnchor` + no `$ref` (unbound slots), emit a **generic interface**: `interface PaginatedTemplate<itemType> { items: itemType[]; ... }`. The `$dynamicAnchor` value IS the type-parameter name (Orval's deliberate choice — preserves spec-author intent).
2. **Binding detection** (`extractBoundAliasInfo` equivalent): when a schema has `$ref` + `$defs` with `$dynamicAnchor` + `$ref` (the binding pattern), emit a **bound type alias**: `type PaginatedUserResponse = PaginatedTemplate<User>`.
3. **Multi-parameter**: `interface ShelterFolderTemplate<folderType, resourceType>` — iterate `$defs` anchors in order.
4. **Cycle safety**: port Orval's `hasScopeAffectedDynamicRef` + `context.parents` guards.

**Do NOT materialize concrete types** (emit duplicate concrete classes per binding). Orval proves real generics are achievable and were accepted upstream in the same monorepo.

### Backwards-compatibility

- **Low risk**: Only adds new keyword handling. Existing `$ref`, circular refs, and OpenAPI 3.0 docs are unaffected.
- Redocly's bundler passes through unknown keywords, so `$dynamicRef`/`$dynamicAnchor` survive bundling.

### First PR recommendation

**Failing test PR** first (fixtures + tests asserting `unknown`), then implementation PR that unskips and asserts correct output.

## Upstream Strategy

### Should this be tackled now? **Yes.**

- Issue #2029 is open with maintainer buy-in
- openapi-typescript is the most popular TS type generator for OpenAPI (8K+ stars)
- Phase 1 (recursive self-reference) is small enough for a single PR
- Self-contained implementation avoids Redocly coordination bottleneck

### Start with: **Failing test PR**, then implementation PR.

### Expected upstream acceptance likelihood

**Medium–High.** Main risks: maintainer may want Redocly support first, or may disagree with output format. Mitigation: keep PR small, follow existing patterns, include comprehensive tests.

### Downstream tools that benefit

- `openapi-fetch` — proper typing for dynamic-schema responses/requests
- `openapi-react-query` / `swr-openapi` — inherit the fix
- All consumers of generated `.d.ts` files

## Open Questions

1. **Should the implementation live in openapi-typescript's walker or in Redocly Core first?** Self-contained is simpler and faster.
2. **Inline concrete types or named type aliases for generic bindings?** Current pattern uses indexed access types — inline approach is more consistent.
3. **Recursive types with `--export-type`:** TypeScript `type` aliases can't be circular; may need special handling.
4. **Does Redocly's bundler preserve `$dynamicRef`/`$dynamicAnchor`?** Inference: yes (opaque keywords). Should be verified.
5. **Should `$recursiveRef`/`$recursiveAnchor` (Draft 2019-09) also be supported?** Low priority.

## Sources

- Repository: https://github.com/openapi-ts/openapi-typescript (cloned at `/Users/aqeelat/lab/openapi-typescript`)
- `packages/openapi-typescript/package.json`, `src/`, `test/`, `CHANGELOG.md`
- Issue #2029: https://github.com/openapi-ts/openapi-typescript/issues/2029
- GitHub metadata via `gh api`
- `@redocly/openapi-core@1.34.6` — searched for dynamic keywords: zero matches
