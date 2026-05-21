# @fastify/swagger

## Overview

| Property | Value |
|---|---|
| Category | Spec producer (Node.js framework plugin) |
| Language | JavaScript |
| License | MIT |
| Repo | https://github.com/fastify/fastify-swagger |
| Version analyzed | v9.7.0 |
| OAS version emitted | 3.0.3 (default); 3.1.x user-configurable |
| Active maintenance | Yes |

## Summary

`@fastify/swagger` converts Fastify route schemas (JSON Schema) into an OpenAPI document. Its JSON-Schema-to-OAS conversion function (`convertJsonSchemaToOpenapi3`) strips a specific set of keywords (`$id`, `$schema`, `definitions`) but does not strip `$dynamicRef` or `$dynamicAnchor` — they fall through to the default recursive copy branch. This makes `@fastify/swagger` the only framework plugin in this analysis that provides unintentional but functional pass-through of `$dynamicRef`.

## Schema Generation Stack

- Fastify route schemas are plain JSON Schema objects provided by the route author.
- `@fastify/swagger` processes them through `convertJsonSchemaToOpenapi3()` in `lib/spec/openapi/utils.js`.
- The OAS document is assembled with a default `openapi: '3.0.3'` version header unless the caller sets `opts.openapi = '3.1.0'` in the plugin configuration.

## $dynamicRef Support Status

**Passive pass-through.** Not a designed feature; not tested.

The `convertJsonSchemaToOpenapi3` function has explicit handling for a known set of keywords:

```js
// Stripped:
'$id', '$schema', 'definitions'

// Transformed:
'$ref'         → rewritten from `definitions/` to `components/schemas/`
'contentEncoding' → mapped to format: binary/byte
'patternProperties' → folded into additionalProperties
```

All other keywords — including `$dynamicRef` and `$dynamicAnchor` — reach the default branch:

```js
openapiSchema[key] = convertJsonSchemaToOpenapi3(opts, value)
```

This recursively copies the keyword into the output. If the caller sets `openapi: '3.1.0'` in plugin options and hand-authors route schemas containing `$dynamicRef`/`$dynamicAnchor`, those keywords will appear in the emitted spec without being stripped or transformed.

No issues or PRs mentioning `$dynamicRef` in the tracker. The pass-through behavior has not been explicitly documented or tested.

## Relevant Source Locations

| Path | Relevance |
|---|---|
| `lib/spec/openapi/utils.js` | `convertJsonSchemaToOpenapi3()` — the conversion function; default branch is the pass-through |
| `lib/spec/openapi/index.js` | Assembles the OAS document; sets `openapi: opts.openapi \|\| '3.0.3'` |

## Testing Approach

See [TESTING_METHODOLOGIES.md — Spec Producer Testing](../TESTING_METHODOLOGIES.md#spec-producer-testing).

Test: configure `@fastify/swagger` with `openapi: '3.1.0'`, register a route whose schema contains `$dynamicRef`/`$dynamicAnchor`, call the spec endpoint, and assert the keywords survive in the output.

This is a relatively simple integration test. The harness would be a minimal Fastify server with the plugin registered.

## Contribution Feasibility

**High** for documentation/testing. The pass-through already works; the gap is that it is undocumented and untested. A contribution could:

1. Add a test asserting `$dynamicRef` pass-through when OAS 3.1 mode is enabled.
2. Add documentation in the README noting that OAS 3.1 + JSON Schema 2020-12 keywords are preserved.

A more involved contribution would be to add a warning or transformation when `$dynamicRef` appears in a 3.0 document (where it is not a valid keyword).

## Landing Likelihood

**High** for documentation/test PR. **Medium** for feature work. The pass-through is already functional; formalizing it is low-risk.
