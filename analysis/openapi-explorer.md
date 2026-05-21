# OpenAPI Explorer

## Summary

OpenAPI Explorer is actively maintained and advertises OpenAPI 3.2 support, but current source paths strongly suggest it does not semantically support `$dynamicRef` / `$dynamicAnchor`. It uses `openapi-resolver`, which depends on `@apidevtools/json-schema-ref-parser`, and its renderer/sample utilities only handle ordinary `$ref` and standard schema shape keywords.

## Status Snapshot

| Field | Value |
|---|---|
| Category | Documentation renderer / web component |
| Repository | https://github.com/Authress-Engineering/openapi-explorer |
| Package | `openapi-explorer` |
| Version observed | `2.4.799` |
| Current support assessment | Likely unsupported; blank/empty degradation likely |

## Maintenance And Landing Likelihood

The project appears active, with recent pushes and npm publishes.

Landing likelihood: **medium** for fallback/display fixes; **medium-low** for full semantic support.

Reasons:

- The project is active and claims OAS 3.2 support.
- The real support likely belongs in `openapi-resolver`, not only the renderer.
- Current renderer and sample generation are `$ref`-centric.

## Dependency Chain

Observed chain:

`openapi-explorer` -> `openapi-resolver` -> `@apidevtools/json-schema-ref-parser`

Relevant package paths:

- `src/utils/spec-parser.js`
- `openapi-resolver/src/index.js`
- `openapi-resolver/src/dereference.js`
- `@apidevtools/json-schema-ref-parser/lib/ref.ts`

## Current DynamicRef Behavior

Likely behavior:

- `openapi-resolver` dereferences ordinary `$ref` only.
- `$dynamicRef` remains unresolved because `json-schema-ref-parser` reference detection only keys on `$ref`.
- `schemaInObjectNotation` does not branch on `$dynamicRef`, `$dynamicAnchor`, `$id`, `$defs`, or newer 2020-12 keywords such as `prefixItems`.
- Generated examples ignore `$dynamicRef` and can produce empty strings or empty structures.

## Relevant Source Map

| Concern | Source |
|---|---|
| Spec parser integration | `src/utils/spec-parser.js` |
| Component schema rendering | `src/templates/components-template.js` |
| Request body rendering | `src/components/api-request.js` |
| Response body rendering | `src/components/api-response.js` |
| Schema conversion | `src/utils/schema-utils.js` |
| Example generation | `src/utils/schema-utils.js` |
| Resolver package | `openapi-resolver/src/index.js`, `openapi-resolver/src/dereference.js` |

## Existing Issues And Prior Art

- No direct `$dynamicRef` / `$dynamicAnchor` issue was found in the research pass.
- `Authress-Engineering/openapi-explorer#208`: `prefixItems` support request, indicating broader 2020-12 keyword coverage is incomplete.
- `Authress-Engineering/openapi-explorer#221`: performance issue around circular refs / large specs, relevant to dynamic recursion implementation risk.

## Failure Modes To Test

- Blank schema rows for dynamic-ref-only properties.
- Empty generated request/response examples.
- Dropped dynamic-ref branches inside `allOf`.
- External dynamic refs are not fetched or resolved.
- `$dynamicAnchor` is ignored entirely.

## Test Plan

Use shared Playwright renderer tests plus lower-level resolver tests if contributing upstream.

First UI fixtures:

- `baseline-duplicated-pagination`
- `generic-schema-binding`
- `api-envelope`
- `recursive-category-tree`

Upstream tests:

- `openapi-resolver` tests for local dynamic anchors, nested dynamic override, and circular dynamic recursion.
- `schema-utils` tests for `schemaInObjectNotation()` and `generateExample()`.
- Browser tests ensuring no blank rows and correct concrete fields.

## Implementation Plan

Smallest useful path:

1. Add renderer fallback for unresolved `$dynamicRef` so the UI displays a clear unresolved reference rather than blank output.
2. Add failing tests showing current degradation.
3. Implement dynamic reference support in `openapi-resolver` so rendering and examples receive resolved schemas.
4. Track dynamic anchors by resource URI and maintain a dynamic-scope stack while walking schemas.
5. Preserve existing circular-reference handling and ordinary `$ref` behavior.

## Upstream Strategy

Start in `openapi-resolver` if maintainers agree. A renderer-only patch can improve fallback UX but will not deliver correct dynamicRef semantics.

## Open Questions

- Is `openapi-resolver` maintained in the same repository and release cadence as OpenAPI Explorer?
- Should `@apidevtools/json-schema-ref-parser` preservation be improved first to avoid damaging dynamic keywords before `openapi-resolver` sees them?
- How should OpenAPI Explorer expose unresolved dynamic refs to users?

## Sources

- https://github.com/Authress-Engineering/openapi-explorer
- https://www.npmjs.com/package/openapi-explorer
- https://www.npmjs.com/package/openapi-resolver
- https://github.com/Authress-Engineering/openapi-explorer/issues/208
- https://github.com/Authress-Engineering/openapi-explorer/issues/221
- https://github.com/APIDevTools/json-schema-ref-parser
