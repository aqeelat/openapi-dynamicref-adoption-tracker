# Swagger UI

## Summary

Swagger UI is the highest-priority documentation-renderer target. It is the de facto OpenAPI documentation UI, has an existing `$dynamicRef` issue, and current source suggests partial support only: it recognizes and renders `$dynamicRef` / `$dynamicAnchor` as JSON Schema 2020-12 keywords, but does not semantically resolve dynamic scope for operation schemas, generated samples, or Try It Out validation.

Fixing `@apidevtools/json-schema-ref-parser` will not directly fix current Swagger UI. Current Swagger UI uses `swagger-client` / `swagger-js` with Swagger ApiDOM packages for OpenAPI 3.1 resolution.

## Status Snapshot

| Field | Value |
|---|---|
| Category | Documentation renderer / API interaction UI |
| Repository | https://github.com/swagger-api/swagger-ui |
| Current package observed | `swagger-ui@5.32.6` |
| Key dependency | `swagger-client@^3.37.4` → `@swagger-api/apidom-reference` |
| Existing issues | https://github.com/swagger-api/swagger-ui/issues/10912 (outreach), https://github.com/swagger-api/swagger-ui/issues/10651 (original report) |
| Current support assessment | Partial keyword rendering; degraded semantic behavior |

## Maintenance And Landing Likelihood

Swagger UI is actively maintained as part of the Swagger API ecosystem. A well-scoped PR with a clear fixture and test is likely more attractive than a broad JSON Schema engine rewrite.

Landing likelihood: **medium**.

Reasons:

- The project is active and has a mature test culture.
- The problem is user-visible and already reported.
- Full semantic `$dynamicRef` support may require changes in `swagger-js` / ApiDOM and sample generation, not only UI components.
- A smaller first PR that improves sample generation for local dynamic anchors may be more realistic than complete cross-document dynamic-scope support.

## Dependency Chain

Current chain:

`swagger-ui` -> `swagger-client` / `swagger-js` -> `@swagger-api/apidom-*`

Relevant files:

- `swagger-ui/src/core/plugins/swagger-client/index.js`
- `swagger-ui/src/core/plugins/spec/actions.js`
- `swagger-js/src/subtree-resolver/index.js`
- `swagger-js/src/resolver/strategies/openapi-3-1-apidom/resolve.js`
- `swagger-js/src/resolver/apidom/reference/dereference/strategies/openapi-3-1-swagger-client/visitors/dereference.js`

The OpenAPI 3.1 ApiDOM path recognizes JSON Schema 2020-12 vocabulary objects, but the Swagger Client custom dereference visitor appears `$ref`-centric. It handles `referencingElement.$ref` and does not show semantic `$dynamicRef` traversal in the researched source path.

## Current DynamicRef Behavior

Parser/rendering support exists at the keyword level:

- `swagger-ui/src/core/plugins/json-schema-2020-12/hoc.jsx`
- `swagger-ui/src/core/plugins/json-schema-2020-12/components/keywords/$dynamicRef.jsx`
- `swagger-ui/src/core/plugins/json-schema-2020-12/fn.js`

These components make `$dynamicRef` and `$dynamicAnchor` known/displayable keywords. That is not the same as semantic dynamic-scope resolution.

Likely current behavior:

- Schema/model views load and display raw `$dynamicRef` / `$dynamicAnchor`.
- Operation schemas do not reliably show the dynamically bound concrete target.
- Generated samples treat `{ "$dynamicRef": "#itemType" }` as a schema with no inferable type and fall back to a scalar or empty value.
- Try It Out request-body validation remains shallow and is not JSON Schema 2020-12 dynamicRef validation.

## Relevant Source Map

| Concern | Source |
|---|---|
| Swagger client plugin registration | `swagger-ui/src/core/plugins/swagger-client/index.js` |
| Lazy subtree resolution | `swagger-ui/src/core/plugins/spec/actions.js` |
| OAS 3.1 model rendering | `swagger-ui/src/core/plugins/oas31/components/models/models.jsx` |
| OAS 3.1 schema selectors | `swagger-ui/src/core/plugins/oas31/spec-extensions/selectors.js` |
| JSON Schema 2020-12 keyword rendering | `swagger-ui/src/core/plugins/json-schema-2020-12/` |
| Request body default sample | `swagger-ui/src/core/plugins/oas3/components/request-body.jsx` |
| OAS 3.1 sample function overrides | `swagger-ui/src/core/plugins/oas31/after-load.js` |
| JSON Schema sample generation | `swagger-ui/src/core/plugins/json-schema-2020-12-samples/fn/main.js` |
| Sample type fallback | `swagger-ui/src/core/plugins/json-schema-2020-12-samples/fn/core/type.js` |
| Execute/request validation | `swagger-ui/src/core/components/execute.jsx`, `swagger-ui/src/core/plugins/oas3/selectors.js` |

## Existing Issues And Prior Art

- `swagger-api/swagger-ui#10912`: outreach issue requesting `$dynamicRef` support, with analysis of the dependency chain and proposed fix path (ApiDOM dereference engine). Opened 2026-05-30.
- `swagger-api/swagger-ui#10651`: original community report that `$dynamicRef` is unsupported in Swagger UI / OpenAPI 3.1. Reports schema view renders while Try It Out ignores `$dynamicRef` and generated examples become null/empty. Opened 2025-12-04 by @owjs3901. No maintainer response.
- `swagger-api/apidom#378`: request for OpenAPI 3.1 namespace `$dynamicRef` / `$dynamicAnchor` during dereference. Opened by maintainer @char0n in 2021. Closed as `not_planned` by SmartBear employee @MichakrawSB in Nov 2025 with zero comments — likely a stale-issue cleanup rather than a technical rejection. This is the canonical upstream gap.
- `swagger-api/apidom#3697`: notes missing `$dynamicRef` / `$dynamicAnchor` support in ApiDOM OpenAPI 3.1 bundling/dereference. Also closed `not_planned`.

## Failure Modes To Test

- Schema view displays raw `$dynamicRef` rather than resolved concrete fields.
- Response examples for `items: { $dynamicRef: "#itemType" }` become `"string"`, `null`, `{}`, or an empty schema.
- Request-body examples for an envelope schema produce `{ "data": "string" }` instead of `{ "data": { "id": "...", "email": "..." } }`.
- Try It Out accepts invalid bodies because only shallow validation is performed.

## Test Plan

Start with Playwright using the shared methodology in [TESTING_METHODOLOGIES.md — Documentation Renderer Testing](../TESTING_METHODOLOGIES.md#documentation-renderer-testing).

First fixtures:

- `baseline-duplicated-pagination`: control.
- `generic-schema-binding`: operation response schema should show `User` fields for users and `Group` fields for groups.
- `paginated-response`: route-level binding should affect generated response samples.
- `api-envelope`: request/response samples should resolve envelope `data`.

For upstream Swagger UI work, port the minimal failing case to their Cypress/Jest setup after the repo-local Playwright reproduction is stable.

## Implementation Plan

Smallest useful path:

1. Add failing tests for sample generation from a schema containing a local `$dynamicRef` and local use-site `$defs` binding.
2. Add resolver support before sample generation so `$dynamicRef` can be resolved against the dynamic anchor stack for local documents.
3. Keep ordinary `$ref`, `$anchor`, circular refs, and OpenAPI 3.0 behavior unchanged.
4. Add UI tests proving operation schema/sample output shows concrete fields rather than raw dynamic keywords.

Longer-term path:

- Move semantic dynamic-scope support into `swagger-js` / ApiDOM resolution rather than duplicating it in UI-only code.
- Add external `$dynamicRef` coverage after local anchors work.

## Upstream Strategy

The fix belongs in ApiDOM (`swagger-api/apidom`), not in swagger-ui. The ApiDOM dereference engine (`apidom-reference` package) resolves `$ref` during tree traversal but ignores `$dynamicRef`. Adding `$dynamicRef` resolution to the `SchemaElement` visitor in the OpenAPI 3.1 dereference strategy would fix the entire stack: ApiDOM → swagger-client (no changes) → swagger-ui (no changes). See `analysis/apidom.md` for the implementation plan.

For the swagger-ui repo specifically, issue #10912 tracks the request and documents the dependency chain. A concise issue comment or PR referencing #10912 and #10651, with a fixture and screenshot, keeps the request visible. The ApiDOM PR is the real work.

## Open Questions

- Should ApiDOM resolve `$dynamicRef` only for local (same-document) anchors first, or support external `$dynamicRef` from the start?
- The apidom#378 closure was likely stale-issue cleanup. A well-scoped PR may still be accepted — the maintainer originally opened the feature request.
- Does the OpenAPI 3.2 dereference strategy need the same changes? (Yes — it mirrors 3.1 structurally.)

## Sources

- https://github.com/swagger-api/swagger-ui
- https://github.com/swagger-api/swagger-ui/issues/10912
- https://github.com/swagger-api/swagger-ui/issues/10651
- https://github.com/swagger-api/swagger-js
- https://github.com/swagger-api/apidom/issues/378
- https://github.com/swagger-api/apidom/issues/3697
