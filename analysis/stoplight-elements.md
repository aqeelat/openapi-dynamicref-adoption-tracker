# Stoplight Elements

## Summary

Stoplight Elements likely does not support semantic `$dynamicRef` / `$dynamicAnchor` today. Its pipeline uses Stoplight's own parser/viewer stack, but the relevant schema tree, sampler, and ref-parser packages are `$ref`-centric. Elements also appears to force OpenAPI 3.1 documents into a draft-07 dialect before transformation, which is a major obstacle for JSON Schema 2020-12 semantics.

## Status Snapshot

| Field | Value |
|---|---|
| Category | Documentation renderer |
| Repository | https://github.com/stoplightio/elements |
| Package | `@stoplight/elements` |
| Version observed | `9.0.19` |
| Current support assessment | Likely unsupported; OAS 3.1 dialect downgrade is a blocker |

## Maintenance And Landing Likelihood

Elements is active but appears more maintenance/security-oriented recently.

Landing likelihood: **medium-low**.

Reasons:

- There is recent activity and package publishing.
- The fix likely spans multiple Stoplight packages: Elements, `http-spec`, `json-schema-tree`, `json-schema-viewer`, `json-schema-sampler`, and possibly `json-schema-ref-parser`.
- Removing or gating the draft-07 override may have compatibility implications.

## Dependency Chain

Observed chain:

`@stoplight/elements` -> `@stoplight/http-spec` -> `@stoplight/json-schema-tree` / `@stoplight/json-schema-viewer` -> `@stoplight/json-schema-sampler` -> `@stoplight/json-schema-ref-parser`

Relevant packages:

- `packages/elements`
- `packages/elements-core`
- `@stoplight/http-spec`
- `@stoplight/json-schema-tree`
- `@stoplight/json-schema-viewer`
- `@stoplight/json-schema-sampler`
- `@stoplight/json-schema-ref-parser`

## Current DynamicRef Behavior

Likely behavior:

- OAS 3.1 documents are downgraded by setting `jsonSchemaDialect: 'http://json-schema.org/draft-07/schema#'` in Elements before `http-spec` transformation.
- `json-schema-tree` treats `'$ref' in fragment` as a reference and does not handle `$dynamicRef` / `$dynamicAnchor`.
- `json-schema-sampler` resolves only `schema.$ref` via JSON Pointer.
- Dynamic slots render as unknown/empty and examples degrade.

## Relevant Source Map

| Concern | Source |
|---|---|
| OAS transformation and dialect override | `packages/elements/src/utils/oas/index.ts` |
| Models rendering | `packages/elements-core/src/components/Docs/Model/Model.tsx` |
| Request body rendering | `packages/elements-core/src/components/Docs/HttpOperation/Body.tsx` |
| Response rendering | `packages/elements-core/src/components/Docs/HttpOperation/Responses.tsx` |
| Example generation | `packages/elements-core/src/utils/exampleGeneration/exampleGeneration.ts` |
| JSON schema viewer | `json-schema-viewer/src/components/JsonSchemaViewer.tsx` |
| Schema tree traversal | `json-schema-tree/src/walker/walker.ts`, `json-schema-tree/src/tree/tree.ts` |
| Sampler traversal | `json-schema-sampler/src/traverse.js` |

## Existing Issues And Prior Art

- `stoplightio/json-schema-viewer#56`: support JSON Schema draft-7, 2019-09, and 2020-12. Closed in 2021, but dynamicRef handling was not found in source.
- Recent Elements issues show ongoing schema rendering gaps for 2020-12-style features such as `not`, `uniqueItems`, and `oneOf const`.
- No direct `$dynamicRef` / `$dynamicAnchor` issue was found in the research pass.

## Failure Modes To Test

- OAS 3.1 dynamic schemas are transformed under draft-07 assumptions.
- `$dynamicRef` is ignored by schema tree traversal.
- Generated examples omit concrete fields or return `null`/empty output.
- Renderer silently hides dynamic keyword semantics rather than warning.

## Test Plan

Use the shared Playwright methodology at the rendered UI layer and add lower-level tests if contributing upstream.

Layered upstream tests:

1. `http-spec` transform preserves OAS 3.1 / 2020-12 dialect and dynamic keywords.
2. `json-schema-tree` populates a tree that resolves local dynamic anchors.
3. `json-schema-viewer` renders concrete dynamic target fields.
4. Elements operation response/request DOM shows the expected concrete fields.
5. `json-schema-sampler` produces examples from dynamically resolved schemas.

## Implementation Plan

Smallest useful path:

1. Add failing Elements fixture tests showing current degradation.
2. Remove or gate the OAS 3.1 draft-07 override.
3. Implement dynamic-scope resolution in `json-schema-tree`, not only Elements UI.
4. Add separate sampler support for generated examples.
5. Preserve ordinary `$ref`, circular refs, allOf merging, and OpenAPI 3.0 behavior.

## Upstream Strategy

Start with a small issue and compatibility evidence. Because this likely crosses several packages, ask maintainers where they want the resolver responsibility to live before opening a broad implementation PR.

## Open Questions

- Why does Elements force OAS 3.1 documents to draft-07 even though `http-spec` has tests preserving 2020-12 dialect?
- Are the Stoplight schema packages still actively accepting feature work beyond maintenance?
- Should example generation be fixed in `json-schema-sampler` independently of viewer rendering?

## Sources

- https://github.com/stoplightio/elements
- https://github.com/stoplightio/http-spec
- https://github.com/stoplightio/json-schema-viewer/issues/56
- https://github.com/stoplightio/json-schema-tree
- https://github.com/stoplightio/json-schema-sampler
- https://github.com/stoplightio/json-schema-ref-parser
- https://www.npmjs.com/package/@stoplight/elements
