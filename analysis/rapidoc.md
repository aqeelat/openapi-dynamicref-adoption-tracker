# RapiDoc

## Summary

RapiDoc likely does not support `$dynamicRef` / `$dynamicAnchor` semantically. It relies on `@apitools/openapi-parser`, which in turn uses `swagger-client` / ApiDOM-era packages, but RapiDoc's own schema rendering and example-generation utilities only special-case `$ref`.

The project appears less active than Swagger UI, Scalar, Redoc, or Stoplight Elements, which lowers upstream landing likelihood.

## Status Snapshot

| Field | Value |
|---|---|
| Category | Documentation renderer |
| Repository | https://github.com/rapi-doc/RapiDoc |
| Package | `rapidoc` |
| Version observed | `9.3.8` |
| Current support assessment | Likely unsupported; graceful fallback needed |

## Maintenance And Landing Likelihood

Maintenance appears low/inactive compared with other renderer targets.

Landing likelihood: **low-medium**.

Reasons:

- Latest researched release was `v9.3.8` from 2024-10-11.
- Latest researched master commit was from 2024-11-06.
- Open issue/PR counts are relatively high.
- Primary maintainer appears to be the dominant contributor.

## Dependency Chain

Observed chain:

`RapiDoc` -> `@apitools/openapi-parser` -> `swagger-client@3.29.4` -> `@swagger-api/apidom-*`

RapiDoc also has its own schema rendering and sample-generation utilities in `src/utils/schema-utils.js`.

## Current DynamicRef Behavior

Likely behavior:

- Parser may preserve `$dynamicRef`, but full semantic resolution is not evident.
- RapiDoc renderer utilities only recognize `$ref` specially.
- `$dynamicRef`-only schema nodes likely show missing type information or generate `null`/empty examples.
- Recursive dynamic references do not benefit from existing recursive `$ref` handling.

## Relevant Source Map

| Concern | Source |
|---|---|
| Parser integration | `src/utils/spec-parser.js` |
| Component schema rendering | `src/templates/components-template.js` |
| JSON Schema viewer rendering | `src/templates/json-schema-viewer-template.js` |
| Request rendering | `src/components/api-request.js` |
| Response rendering | `src/components/api-response.js` |
| Schema/sample utilities | `src/utils/schema-utils.js` |

Key functions in `schema-utils.js`:

- `getTypeInfo()`
- `getSampleValueByType()`
- `schemaToSampleObj()`
- `schemaInObjectNotation()`
- `generateExample()`

## Existing Issues And Prior Art

- `rapi-doc/RapiDoc#547`: JSON Schema 2020-12 `$ref` sibling support requested and closed.
- Existing schema rendering/sample issues include `const`, `oneOf required`, and nested example behavior.
- No direct `$dynamicRef` / `$dynamicAnchor` issue was found in the research pass.

## Failure Modes To Test

- `{missing-type-info}` or equivalent output for `$dynamicRef`-only nodes.
- Generated examples become `null` or omit concrete fields.
- Raw `$dynamicRef` is ignored rather than displayed clearly.
- Recursive dynamic schemas fail to show recursive concrete fields.

## Test Plan

Use the shared Playwright renderer harness against published `rapidoc@9.3.8` first.

First tests:

- Load `baseline-duplicated-pagination` to establish control behavior.
- Load `generic-schema-binding` and inspect operation response schema text and generated examples.
- Load `recursive-category-tree` and inspect recursive child rendering.

Also add lower-level tests around `schemaInObjectNotation()` and `generateExample()` if contributing upstream.

## Implementation Plan

Smallest useful path:

1. Add graceful display for unresolved `$dynamicRef` rather than missing type information.
2. Add tests proving current degradation.
3. If full support is desired, implement or consume parser-level dynamic-scope resolution before schema-utils runs.
4. Update example generation to resolve dynamic refs or explicitly avoid misleading examples.

Renderer-only support cannot correctly implement full dynamic scope if the parser does not preserve enough context.

## Upstream Strategy

Given apparent lower activity, start by producing compatibility evidence and opening a clear issue before investing in a large PR. If maintainers respond, propose a small fallback/display improvement before full semantic resolution.

## Open Questions

- Is current `@apitools/openapi-parser` behavior materially different from the older Swagger Client version in the lockfile?
- Would maintainers prefer dynamicRef support in `@apitools/openapi-parser` or RapiDoc's schema utilities?
- Is there an active branch or successor package beyond `rapidoc@9.3.8`?

## Sources

- https://github.com/rapi-doc/RapiDoc
- https://github.com/rapi-doc/RapiDoc/releases/tag/v9.3.8
- https://github.com/rapi-doc/RapiDoc/issues/547
- https://www.npmjs.com/package/rapidoc
- https://www.npmjs.com/package/@apitools/openapi-parser
