# Redoc

## Summary

Redoc likely does not semantically support `$dynamicRef` / `$dynamicAnchor` today. It uses Redocly's OpenAPI Core for loading/bundling, Redoc's own `$ref`-centric parser/model layer for rendering, and `openapi-sampler` for samples. The researched paths handle `$ref` and some OpenAPI 3.1 schema features, but not dynamic-scope resolution.

## Status Snapshot

| Field | Value |
|---|---|
| Category | Documentation renderer |
| Repository | https://github.com/Redocly/redoc |
| Package | `redoc` |
| Version observed | Stable `2.5.2`; `3.0.0-rc.0` exists |
| Current support assessment | Likely render/sample degradation |

## Maintenance And Landing Likelihood

Redoc is maintained by Redocly but appears slower-moving than Redocly OpenAPI Core.

Landing likelihood: **medium** if the change is isolated and aligns with Redocly OpenAPI Core; **low-medium** if it requires broad renderer and sampler changes.

Reasons:

- Recent repo activity and package releases exist.
- The project has established schema model tests.
- The fix likely crosses package boundaries: Redoc, `@redocly/openapi-core`, and `openapi-sampler`.

## Dependency Chain

Observed chain:

`redoc` -> `@redocly/openapi-core` for loading/bundling -> Redoc `OpenAPIParser` / `SchemaModel` for rendering -> `openapi-sampler` for examples.

Redoc does not appear to directly use `@apidevtools/json-schema-ref-parser` in the current researched package path.

## Current DynamicRef Behavior

Likely behavior:

- Bundling may preserve `$dynamicRef` as an unknown/known schema keyword, especially in newer OpenAPI Core versions.
- Redoc's model dereference path only resolves `$ref`.
- `openapi-sampler` only follows `$ref` by JSON Pointer and ignores `$dynamicRef`.
- Dynamic slots render as empty/generic schemas or unresolved keyword output.
- Generated examples are likely `null`, `{}`, or incomplete for schemas whose only meaningful constraint is `$dynamicRef`.

## Relevant Source Map

| Concern | Source |
|---|---|
| Spec load/bundle | `src/utils/loadAndBundleSpec.ts` |
| Redoc parser/deref | `src/services/OpenAPIParser.ts` |
| Schema model rendering | `src/services/models/Schema.ts` |
| Field model rendering | `src/services/models/Field.ts` |
| Media type/example generation | `src/services/models/MediaType.ts` |
| Sampler dependency | `openapi-sampler` `src/traverse.js` |

## Existing Issues And Prior Art

- `Redocly/redoc#1715`: OpenAPI 3.1 umbrella issue. It includes reference/dialect gaps, including `$id`-related support.
- `Redocly/redocly-cli#1229`: discusses AJV / JSON Schema 2020-12 limitations and mentions `$dynamicRef` resolution problems in AJV.
- No direct Redoc `$dynamicRef` issue was found in the research pass.

## Failure Modes To Test

- Operation schemas show generic/empty object instead of concrete dynamic binding.
- Models show raw `$dynamicRef` but not concrete fields.
- Examples from `openapi-sampler` omit dynamic target fields.
- Recursive dynamic schemas lose the concrete override or become unexpandable.

## Test Plan

Use the shared Playwright renderer methodology.

First checks:

- `baseline-duplicated-pagination` should pass as a control.
- `generic-schema-binding` should show `User.email` under users and `Group.name` under groups.
- `api-envelope` should show `data.email` for a user response and `data.items[].email` for a paginated user response.

Upstream tests should include:

- `SchemaModel` tests for dynamically resolved fields.
- `MediaTypeModel.generateExample()` tests for dynamically resolved examples.
- Possibly OpenAPI Core bundle tests if bundling currently damages dynamic scope.

## Implementation Plan

Smallest useful path:

1. Add failing Redoc model/sample tests for a local dynamic anchor binding.
2. Decide whether dynamic resolution belongs in `@redocly/openapi-core` or Redoc's `OpenAPIParser`.
3. Ensure `openapi-sampler` receives a schema where dynamic references are resolved or teach the sampler to resolve dynamic refs.
4. Preserve current behavior for ordinary `$ref`, `$anchor`, `$id`, circular references, and OpenAPI 3.0.

Preferred architecture: implement dynamic-scope resolution in the shared resolver/model layer, then have rendering and samples consume the resolved schema consistently.

## Upstream Strategy

Start with a Redoc issue or failing test PR that demonstrates current UI and sample degradation with a minimal OpenAPI 3.1 fixture. If the fix belongs in OpenAPI Core or `openapi-sampler`, split the work after maintainers confirm the preferred layer.

## Open Questions

- Does the latest `@redocly/openapi-core` preserve `$dynamicRef` without damaging dynamic scope during bundling?
- Should `openapi-sampler` implement dynamic scope directly, or should Redoc pass pre-resolved schemas into it?
- Is Redoc v3 the right target instead of v2?

## Sources

- https://github.com/Redocly/redoc
- https://github.com/Redocly/redoc/issues/1715
- https://github.com/Redocly/redocly-cli/issues/1229
- https://www.npmjs.com/package/redoc
- https://www.npmjs.com/package/@redocly/openapi-core
- https://www.npmjs.com/package/openapi-sampler
