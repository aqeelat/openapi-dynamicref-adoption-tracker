# Scalar

## Summary

Scalar is very active and already has relevant JSON Schema 2020-12 context: it replaced OpenAPI metaschema `$dynamicRef` with `$ref` internally to work around AJV limitations. That workaround helps Scalar validate OpenAPI metaschemas, but it does not imply user OpenAPI documents with `$dynamicRef` are semantically supported.

Current source paths appear `$ref`-centric in parsing, bundling, schema rendering, and example generation.

## Status Snapshot

| Field | Value |
|---|---|
| Category | Documentation renderer / API client / parser |
| Repository | https://github.com/scalar/scalar |
| Packages | `@scalar/api-reference`, `@scalar/api-client`, `@scalar/openapi-parser`, `@scalar/json-magic` |
| Current support assessment | Likely unsupported for user `$dynamicRef`; internal metaschema workaround exists |

## Maintenance And Landing Likelihood

Scalar is highly active, with frequent commits and package publishes.

Landing likelihood: **medium-high** for a well-scoped failing test and incremental resolver support.

Reasons:

- Maintainers are active and merge external PRs.
- They have already touched `$dynamicRef` for metaschema validation and understand the AJV limitation.
- The actual implementation likely spans multiple packages, so a small first PR should focus on tests and one local dynamicRef path.

## Dependency Chain

Observed chain:

`@scalar/api-reference` / `@scalar/api-client` -> `@scalar/workspace-store` / `@scalar/oas-utils` -> `@scalar/openapi-parser` -> `@scalar/json-magic` -> AJV for validation.

Relevant packages:

- `packages/openapi-parser`
- `packages/json-magic`
- `packages/workspace-store`
- `packages/api-reference`

## Current DynamicRef Behavior

Known workaround:

- `packages/openapi-parser/src/schemas/README.md` documents replacing OpenAPI metaschema `$dynamicRef` with `$ref` because AJV has issues resolving `$dynamicRef` outside the root object.
- PR `scalar/scalar#8359` replaced OpenAPI 3.2 metaschema `$dynamicRef` occurrences with `$ref`.

Likely user-document behavior:

- `resolve-references.ts` resolves only `schema.$ref`.
- `json-magic` detects references with `$ref` only.
- workspace-store helpers resolve `$ref` only.
- Schema rendering and generated request examples consume these `$ref`-centric resolvers.

## Relevant Source Map

| Concern | Source |
|---|---|
| OpenAPI parser package | `packages/openapi-parser` |
| Reference resolution | `packages/openapi-parser/src/utils/resolve-references.ts` |
| Bundling | `packages/json-magic/src/bundle/bundle.ts` |
| Proxy resolver | `packages/json-magic/src/magic-proxy/proxy.ts` |
| Workspace schema resolving | `packages/workspace-store/src/resolve.ts` |
| Resolved ref helper | `packages/workspace-store/src/helpers/get-resolved-ref.ts` |
| API reference schema UI | `packages/api-reference/src/components/Content/Schema/` |
| Example generation | `packages/workspace-store/src/request-example/builder/helpers/get-example-from-schema.ts` |

## Existing Issues And Prior Art

- `scalar/scalar#8359`: merged workaround replacing metaschema `$dynamicRef` with `$ref` for AJV compatibility.
- `scalar/scalar#6617`: OpenAPI 3.1 Schema Object support issue mentioning JSON Schema 2020-12 semantics, including `$dynamicRef`; closed, but user-document dynamicRef support still appears incomplete from source inspection.
- AJV issue `ajv-validator/ajv#1573` is directly relevant to Scalar's internal workaround.

## Failure Modes To Test

- User schemas containing `$dynamicRef` render as unresolved or empty schemas.
- Generated examples omit fields from the dynamically bound schema.
- External `$dynamicRef` targets are not loaded by bundling because traversal only sees `$ref`.
- Internal metaschema workaround hides dynamicRef problems in Scalar's own validation but not in user specs.

## Test Plan

Use shared Playwright tests for `@scalar/api-reference` and lower-level unit tests for shared packages.

First fixtures:

- `baseline-duplicated-pagination`
- `generic-schema-binding`
- `api-envelope`

Upstream test locations:

- `packages/json-magic` unit tests for reference discovery/resolution.
- `packages/workspace-store` example-generation tests.
- `packages/api-reference` e2e schema rendering tests.

## Implementation Plan

Smallest useful path:

1. Add a user OpenAPI 3.1 fixture with local `$dynamicAnchor` and `$dynamicRef`.
2. Add failing tests in `json-magic` and `workspace-store` showing dynamic slots are not resolved.
3. Extend shared reference resolution with a dynamic-anchor stack for local documents.
4. Make schema rendering and example generation consume the same resolver.
5. Keep Scalar's internal metaschema `$dynamicRef` -> `$ref` workaround separate from user-spec behavior.

## Upstream Strategy

Start with a focused issue or test PR referencing existing PR `#8359`: Scalar already knows `$dynamicRef` matters, but the next step is user-document support rather than metaschema compatibility.

## Open Questions

- Should Scalar continue rewriting internal OpenAPI metaschema dynamic refs after user dynamicRef support lands?
- Can `json-magic` represent dynamic-scope context without breaking its proxy model?
- Is external `$dynamicRef` support in scope for a first PR?

## Sources

- https://github.com/scalar/scalar
- https://github.com/scalar/scalar/pull/8359
- https://github.com/scalar/scalar/issues/6617
- https://github.com/ajv-validator/ajv/issues/1573
- https://www.npmjs.com/package/@scalar/api-reference
- https://www.npmjs.com/package/@scalar/openapi-parser
