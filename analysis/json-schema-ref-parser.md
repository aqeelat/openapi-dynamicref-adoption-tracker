# @apidevtools/json-schema-ref-parser

## Summary

`@apidevtools/json-schema-ref-parser` remains important infrastructure, but it is not the direct path to fixing current Swagger UI. Current Swagger UI uses Swagger ApiDOM through `swagger-client` / `swagger-js`, not this parser.

The right near-term change for this package is likely preservation/pass-through of `$dynamicRef` and `$dynamicAnchor`, not semantic dereferencing. Static dereferencing cannot generally replace `$dynamicRef` because resolution depends on dynamic evaluation scope.

## Status Snapshot

| Field | Value |
|---|---|
| Category | Parser / resolver / bundler |
| Repository | https://github.com/APIDevTools/json-schema-ref-parser |
| Package | `@apidevtools/json-schema-ref-parser` |
| Version observed | `15.3.5` |
| Runtime dependency observed | `js-yaml` |
| Current support assessment | No semantic `$dynamicRef` support |

## Maintenance And Landing Likelihood

The package is active and widely used. Releases continued through 2026, with automated publishing and recent maintainer activity.

Landing likelihood: **medium-low** for semantic support; **medium** for preservation/pass-through.

Reasons:

- Maintainers are active and external PRs have landed.
- The package has historically been cautious around modern JSON Schema reference changes.
- A 2020-12 `$anchor` / `$ref` sibling fix was released in `v15.3.3` and reverted in `v15.3.4` after regression `#420`.
- A pass-through PR has lower risk than a full dynamic-scope resolver.

## Dependency Chain

This package is itself a dependency for other tools. Current Swagger UI no longer depends on it directly for OpenAPI 3.1 rendering.

Known or likely relevant consumers/forks:

- `@apidevtools/swagger-parser`
- `openapi-typescript`
- `@hey-api/json-schema-ref-parser` fork
- Older Redoc/AsyncAPI ecosystem paths
- Stoplight fork: `@stoplight/json-schema-ref-parser`

## Current DynamicRef Behavior

Current source behavior is `$ref`-centric.

Key characteristics:

- Reference discovery checks for `"$ref"` string values.
- `$dynamicRef` and `$dynamicAnchor` are not treated as reference keywords.
- Static dereference replaces `$ref` with target values.
- There is no runtime evaluation context or dynamic anchor stack.

This is not inherently wrong for `$dynamicRef` if the package preserves unknown keywords. The risk is that bundling/dereferencing, sibling merging, or schema-resource handling changes or drops dynamic keywords in ways that make downstream semantic resolution impossible.

## Relevant Source Map

| Concern | Source |
|---|---|
| Public parser class | `lib/index.ts` |
| Core dereference algorithm | `lib/dereference.ts` |
| Bundle algorithm | `lib/bundle.ts` |
| External reference discovery | `lib/resolve-external.ts` |
| `$Ref` model and `$ref` detection | `lib/ref.ts` |
| Reference registry | `lib/refs.ts` |
| JSON Pointer resolution | `lib/pointer.ts` |
| Options | `lib/options.ts` |

## Existing Issues And Prior Art

- `#417`: opened by `KlementMultiverse` and withdrawn/closed by the same author. It was not maintainer-rejected. The issue conflated ordinary `$id` / `$ref` base URI resolution with `$dynamicRef` dynamic scope and had other technical inaccuracies.
- `#145`: central issue opened by `handrews` about JSON Schema 2019-09 / OAS 3.1 reference changes. Closed by a maintainer commit in `v15.3.3`; the fix was reverted in `v15.3.4` after regression `#420`.
- `#222`: `$anchor` unsupported. Closed in 2021.
- `#365` / PR `#369`: OpenAPI 3.1 reference sibling precedence fixed via `dereference.preservedProperties`.
- `#420`: regression from `v15.3.3`; maintainer agreed the behavior should be reverted.

## Failure Modes To Test

- `$dynamicRef` is treated like `$ref` and incorrectly statically dereferenced.
- `$dynamicAnchor` is stripped during bundling/dereferencing.
- `$dynamicRef` survives parsing but points to a target that was moved or rewritten incorrectly.
- `$id` and `$anchor` handling changes base URI behavior in a way that breaks dynamic-scope-preserving output.
- Ordinary `$ref` behavior regresses.

## Test Plan

Use low-level parser/bundler tests, not UI tests.

First fixtures:

- `generic-schema-binding`
- `paginated-response`
- `api-envelope`
- `recursive-category-tree`

Assertions:

- `parse` preserves `$dynamicRef` and `$dynamicAnchor`.
- `bundle` preserves `$dynamicRef` / `$dynamicAnchor` relationships without rewriting them into invalid pointers.
- `dereference` either preserves dynamic keywords or clearly documents that semantic dynamic references are outside scope.
- Ordinary `$ref`, `$id`, `$anchor`, circular refs, and sibling-preservation behavior remain unchanged.

## Implementation Plan

Smallest useful change:

1. Add tests proving `$dynamicRef` and `$dynamicAnchor` are preserved by parse/bundle/dereference flows.
2. Ensure traversal does not mistake `$dynamicRef` for `$ref`.
3. Ensure sibling merge and preserved-property logic does not drop `$dynamicAnchor`.
4. Document that semantic dynamic-scope resolution is out of scope for static dereferencing.

Do not start by implementing full semantic `$dynamicRef` resolution in this package. That belongs in a JSON Schema evaluator or a resolver API that explicitly tracks dynamic scope.

## Upstream Strategy

Open with a failing preservation test PR rather than a broad feature issue. Be explicit that the goal is safe OpenAPI 3.1 / JSON Schema 2020-12 preservation for downstream tools, not claiming full JSON Schema evaluation.

## Open Questions

- Does current `bundle` ever relocate schemas in a way that breaks `$dynamicRef` dynamic scope even if keywords are preserved?
- Should the package expose an option such as `preserveDynamicRefs` or should preservation be unconditional?
- How do forks such as `@hey-api/json-schema-ref-parser` diverge from upstream behavior?

## Sources

- https://github.com/APIDevTools/json-schema-ref-parser
- https://github.com/APIDevTools/json-schema-ref-parser/issues/145
- https://github.com/APIDevTools/json-schema-ref-parser/issues/222
- https://github.com/APIDevTools/json-schema-ref-parser/issues/365
- https://github.com/APIDevTools/json-schema-ref-parser/issues/417
- https://github.com/APIDevTools/json-schema-ref-parser/issues/420
