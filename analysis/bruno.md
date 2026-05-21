# Bruno

## Overview

| Property | Value |
|---|---|
| Category | API client (desktop, offline-first) |
| Language | TypeScript (Electron) |
| License | MIT |
| Repo | https://github.com/usebruno/bruno |
| Version analyzed | v3.4.1 (May 21, 2026) |
| OAS version support | Import pipeline — partial |
| Active maintenance | Very active |

## Summary

Bruno is an offline-first API client with an MIT license and very active community. Its OpenAPI import pipeline uses a custom parser, not AJV or swagger-parser, and the schema validation library it does use (`jsonschema` npm package v1.5.x) is draft-04/06-level — it does not support `$dynamicRef`. However, Bruno's import layer is primarily concerned with extracting requests, not performing deep schema validation: `$dynamicRef` keywords in an imported spec are silently ignored. The community is active and contributor-friendly, making Bruno a good target for a focused OpenAPI import improvement.

## Schema Processing Stack

```
Bruno OpenAPI import
  → packages/bruno-app/src/utils/importers/openapi-collection.js  (thin app wrapper)
      → @usebruno/converters / packages/bruno-converters/src/openapi/openapi-to-bruno.js
         (actual conversion logic — no JSON Schema validation library)
  → jsonschema npm ^1.5.0    (draft-04/06 validation, in the app package only)
  → js-yaml                  (YAML parsing)
```

The real conversion work lives in `packages/bruno-converters/src/openapi/openapi-to-bruno.js`. The app-level file (`packages/bruno-app/src/utils/importers/openapi-collection.js`) is a thin wrapper that catches errors and delegates to `@usebruno/converters`. No JSON Schema validation library is used in the converter itself.

## $dynamicRef Support Status

**None — converter has no JSON Schema library; app validator is draft-04/06-only.**

`jsonschema` v1.5.x implements JSON Schema draft-04 with partial draft-06 support. It has no concept of `$dynamicRef` or `$dynamicAnchor`. Even if Bruno's import pipeline called this library with a schema containing `$dynamicRef`, the keyword would be treated as an unknown and ignored.

In practice, Bruno's import does not validate individual property schemas — it reads path/method/parameter structure to generate request templates. Schema details (including `$dynamicRef`) are not used for import. They would only matter if Bruno adds in-app schema-based request validation, which is not currently a feature.

No `$dynamicRef` issues in the tracker. Active OAS 3.1-related import issues exist (e.g., `readOnly` properties, JSON format handling, auth schemes).

## Testing Approach

See [TESTING_METHODOLOGIES.md — API Client Testing](../TESTING_METHODOLOGIES.md#api-client-testing).

Bruno is Electron-based; automated testing of the import UI requires Electron test tooling. The more accessible test is at the library level:

1. Call Bruno's import utility directly with a fixture spec.
2. Inspect the resulting Bruno collection for completeness of imported requests.
3. Verify no crash or data loss occurs with `$dynamicRef`-containing schemas.

This tests graceful handling, not `$dynamicRef` semantic support.

## Contribution Feasibility

**High for graceful handling / good-fit PR.** The Bruno maintainers are active and accepting import-related PRs. A contribution that:

1. Adds a test ensuring `$dynamicRef`-containing specs import without crash.
2. Opens an issue or adds a comment in the importer noting the current limitation.

...would land easily and establish awareness.

A more substantial contribution — adding `$dynamicRef` semantic resolution to Bruno's request-builder schema display — would require adding AJV v8 or `jsonschema_rs` bindings and is a larger scope. The maintainers would likely welcome an issue discussion before a large PR.

## Landing Likelihood

**High** for graceful-handling / awareness PR. **Medium** for a full `$dynamicRef`-aware schema display feature.
