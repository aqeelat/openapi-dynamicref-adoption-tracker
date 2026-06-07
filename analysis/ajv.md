# AJV

## Summary

AJV v8 has real JSON Schema draft 2020-12 support through `ajv/dist/2020`, and that constructor enables the dynamic vocabulary path (`dynamicRef: true`). Support for `$dynamicRef` / `$dynamicAnchor` is therefore implemented, but it is partial: current AJV 8.20.0 has known correctness gaps around non-root/static dynamic-anchor targets and OpenAPI 3.1-style schema patterns.

The most useful upstream path is not adding first-time support, but landing or consolidating the existing `$dynamicRef` fix work. PR #2615 is the strongest current candidate for the generic pagination / wrapper patterns in this repo, while PR #2622 targets nested dynamic-anchor fallback behavior and issue #1745. Recursive tree-style dynamic references already pass this repo's runtime checks in current AJV.

## Status Snapshot

| Property | Value |
|---|---|
| Repository | https://github.com/ajv-validator/ajv |
| Package | `ajv` |
| Category | Runtime JSON Schema validator |
| Language | TypeScript |
| License | MIT |
| Version analyzed | 8.20.0 |
| Latest npm publish | 8.20.0 |
| Default JSON Schema mode | draft-07 via `import Ajv from "ajv"` |
| 2020-12 mode | `import Ajv2020 from "ajv/dist/2020"` |
| `$dynamicRef` status | Partial |
| OpenAPI 3.1 relevance | High: AJV is a foundational dependency for JS OpenAPI validation/mocking tools |
| Landing likelihood | Medium for a scoped fix PR; low for a brand-new broad rewrite |

## Maintenance And Landing Likelihood

AJV is active but slow-moving. GitHub reports 14.7k stars, 982 forks, and 342 open issues/PRs as of 2026-06-04. The repo's latest pushed activity was 2026-05-12, while the latest visible commits include the 8.20.0 release on 2026-04-24 and a CI follow-up merged as #2608. The latest npm package is `ajv@8.20.0`.

Apparent maintainers include Evgeny Poberezkin (`epoberezkin`, npm user `esp`) and npm maintainer `blakeembrey`. External PRs do land, for example #2604 and #2580 were merged in April 2026, but the dynamic-reference backlog has multiple overlapping open PRs.

Landing likelihood is **medium** for a focused PR that builds on the existing dynamic-ref fixes and includes targeted tests. Evidence: PR #2615 is clean/mergeable, includes a passing full test run in its description, and is explicitly scoped to `$dynamicRef` static target resolution. PR #2622 is also clean/mergeable and targets the same issue family. However, issue #1745 has been open since 2021 and PR #2573 has been open since January 2026 with merge conflicts, so broad or ambiguous changes have a meaningful stall risk.

## Dependency Chain

AJV is the validator itself rather than an OpenAPI parser, resolver, renderer, or generator. Its production dependencies in 8.20.0 are `fast-deep-equal`, `fast-uri`, `json-schema-traverse`, and `require-from-string`.

AJV does not use `@apidevtools/json-schema-ref-parser`, Swagger ApiDOM, Redocly OpenAPI Core, Hyperjump, or `openapi-sampler` for validation. Reference and dynamic-scope behavior lives inside AJV's compiler and vocabulary implementation.

The dependency-chain risk is downstream: many OpenAPI tools use AJV but instantiate the default draft-07 constructor. In that configuration, user schemas with `$dynamicRef` do not get 2020-12 dynamic-scope semantics. Tools must use `ajv/dist/2020` or equivalent 2020-12 configuration before AJV's partial support is even exercised.

AJV advertises draft 2020-12 support. The 2020 constructor confirms this by setting `dynamicRef: true`, `next: true`, and `unevaluated: true`, and by registering the draft-2020 vocabularies and meta-schema.

## Current DynamicRef Behavior

AJV recognizes `$dynamicRef` and `$dynamicAnchor` in draft-2020 mode. The relevant vocabulary files are present under `lib/vocabularies/dynamic/`, and `lib/vocabularies/draft2020.ts` includes the dynamic vocabulary before core, validation, applicator, and unevaluated vocabularies.

The current implementation has important limitations:

- `lib/vocabularies/dynamic/dynamicRef.ts` throws unless the `$dynamicRef` string starts with `#`, so non-fragment URI dynamic references are not supported in current master.
- `dynamicRef.ts` decides fallback behavior using `it.schemaEnv.root.dynamicAnchors[anchor]` and otherwise calls the current validator, which is the source of the non-root/static-target gap described by PR #2615 and PR #2622.
- The source contains a TODO stating that the implementation assumes recursive refs point to the root schema object and that this is not correct when `$id` changes resolution scope.
- `$dynamicAnchor` compilation records anchors on `schemaEnv.root.dynamicAnchors` and compiles nested schemas through `compileSchema`, so nested anchor handling exists but current fallback/static-target behavior is incomplete.

Fixture behavior from this repo's `fixtures/README.md` classifies AJV 2020 as mixed:

- `baseline-duplicated-pagination.yaml`: passes.
- `generic-schema-binding.yaml`: valid user/group pages fail, and invalid item cases fail.
- `paginated-response.yaml`: valid user/group pages fail, and invalid item cases fail.
- `api-envelope.yaml`: valid wrapped-user page fails; expected same gap as pagination fixtures.
- `recursive-category-tree.yaml`: valid localized category tree passes; child missing localized fields fails.
- `nested-workspace-resources.yaml`: valid nested workspace passes, but an invalid nested folder missing permissions is accepted because AJV resolves the generic `$dynamicRef` slot to the fallback.
- `non-identifier-schema-key.yaml`: recursive runtime check passes.
- `spec-semantics/dynamicref-core-semantics.yaml`: several core cases are known gaps, including non-fragment URI refs.

## Relevant Source Map

- `lib/2020.ts`: `Ajv2020` constructor; enables `dynamicRef`, `next`, and `unevaluated`; registers draft-2020 vocabularies and meta-schema.
- `lib/vocabularies/draft2020.ts`: includes `dynamicVocabulary` in the draft-2020 vocabulary list.
- `lib/vocabularies/dynamic/index.ts`: exports `$dynamicAnchor`, `$dynamicRef`, `$recursiveAnchor`, and `$recursiveRef` keyword definitions.
- `lib/vocabularies/dynamic/dynamicRef.ts`: compiles `$dynamicRef`; currently accepts hash fragments only and performs dynamic-anchor dispatch/fallback.
- `lib/vocabularies/dynamic/dynamicAnchor.ts`: compiles `$dynamicAnchor`; records root dynamic anchors and builds nested validators.
- `lib/vocabularies/core/ref.ts`: shared `$ref` call/validator machinery; PR #2622 touches this path to populate dynamic-anchor scope when calling referenced schemas.
- `lib/compile/index.ts` and `lib/compile/validate/*`: schema environment and generated validation-code machinery used by nested dynamic anchors.
- `spec/dynamic-ref.spec.ts`: best place for targeted AJV regression tests.
- `spec/json-schema.spec.ts` and `spec/JSON-Schema-Test-Suite`: broader JSON Schema Test Suite integration.

## Existing Issues And Prior Art

- Issue #1573, opened by `seriousme` in 2021, reports AJV failing an OpenAPI 3.1-style `$dynamicRef: "#meta"` case where the target dynamic anchor is under `$defs`. It remains open and includes comparison with Hyperjump/jschon behavior.
- Issue #1745, opened by `essential-randomness` in 2021, asks for `$dynamicAnchor` / `$recursiveAnchor` support in any schema location, not only root. It remains open, has `enhancement` and `bounty` labels, and is referenced by PR #2615 and PR #2622.
- Issue #1964, opened by `sinclairzx81` in 2022, reported unusual recursive `$dynamicRef` validation behavior. It was closed in 2024 as `invalid`; do not treat that issue alone as proof of current generic-wrapper correctness.
- PR #2573, opened by `jasoniangreen` in January 2026, is titled `fix: resolve $dynamicRef to $dynamicAnchor in $defs`. It is open, authored by a collaborator, and currently dirty/unmergeable. Its stated root cause is that schemas in `$defs` are only compiled when referenced by `$ref`.
- PR #2615, opened by `nsteve-one` in May 2026, is titled `Fix dynamicRef static target resolution`. It is open, clean/mergeable, and explicitly positions itself as an alternative to #2573 against current master. It resolves the static target first, uses the resolved non-root `$dynamicAnchor` validator as fallback, and adds regression coverage.
- PR #2622, opened by `Treasure520520` in May 2026, is titled `Fix dynamicRef resolution for nested dynamic anchors`. It is open, clean/mergeable, references #1745, and unskips some recursive/dynamic JSON Schema Test Suite cases.

Prior art: Hyperjump JSON Schema is the best reference implementation for this repo's dynamic-scope fixtures. The fixture docs record Hyperjump passing the generic pagination and core semantics cases that current AJV fails.

## Failure Modes To Test

- Silent degradation when a downstream tool uses the default `Ajv` draft-07 constructor instead of `Ajv2020`.
- Incorrect fallback to the current/root validator instead of the resolved static dynamic-anchor target.
- Valid generic-wrapper instances rejected because `$dynamicRef` does not bind to the dynamic anchor override in scope.
- Invalid generic-wrapper instances accepted because `$dynamicRef` resolves to a permissive or `not: {}` fallback.
- Non-fragment `$dynamicRef` values rejected with `"$dynamicRef" only supports hash fragment reference`.
- Multiple same-name `$dynamicAnchor`s in a dynamic evaluation path incorrectly treated as ambiguous or resolved by static sibling scan rather than dynamic scope.
- OpenAPI 3.1 metaschema-style `#meta` dynamic references under `$defs` failing validation.

## Test Plan

Use this repo's standalone JSON Schema runtime validation suite first, not SDK generator output. The repo already documents `npm run validate:jsonschema` as the AJV/Hyperjump comparison path.

Baseline assertions:

- `baseline-duplicated-pagination.yaml` should pass in AJV 2020. If it fails, the problem is ordinary schema validation rather than `$dynamicRef`.

Dynamic fixture assertions:

- `generic-schema-binding.yaml`: valid `PaginatedUserResponse` and `PaginatedGroupResponse` examples should pass; invalid item shapes should fail against the bound item type.
- `paginated-response.yaml`: route-level bindings should validate the same way as named concrete generic bindings.
- `api-envelope.yaml`: the single-resource envelope should bind `data` to `User`; the paginated envelope route should chain `ApiEnvelopeTemplate<PaginatedTemplate<User>>` semantics.
- `recursive-category-tree.yaml`: localized category children should use the active localized category shape, not the base category fallback.
- `nested-workspace-resources.yaml`: both generic slots should resolve through the active dynamic path; invalid nested folders missing permissions should fail.
- `non-identifier-schema-key.yaml`: recursive behavior should remain correct even when schema keys require generated-name normalization downstream.
- `spec-semantics/dynamicref-core-semantics.yaml`: add targeted AJV tests for same-resource dynamic anchors, `$dynamicRef` to `$anchor`, `$ref` to `$dynamicAnchor`, non-fragment URI refs, multi-parameter generic binding, and allOf sibling order.
- `spec-semantics/external-dynamic-ref.yaml`: use after same-document behavior is fixed; external dynamic references are currently outside AJV's hash-only implementation.

Automation is feasible for all validator pass/fail assertions. Human review is only needed to decide whether a proposed AJV failure is an AJV limitation, a fixture expectation issue, or a JSON Schema spec ambiguity.

Upstream tests should use AJV's existing `spec/dynamic-ref.spec.ts` for focused regressions and `spec/json-schema.spec.ts` / JSON Schema Test Suite integration for standard-suite coverage. A PR should run at least `npm run build`, dynamic-ref mocha tests, `spec/json-schema.spec.ts --grep dynamicRef`, `npm run prettier:check`, `npm run eslint`, and `npm test` if practical.

## Implementation Plan

The smallest useful change is to land a scoped static-target resolution fix rather than rewrite dynamic scope from scratch.

Recommended implementation shape:

- Resolve the `$dynamicRef` static target using AJV's existing reference resolver before applying dynamic-anchor override logic.
- If the static target resolves to a `$dynamicAnchor`, use that compiled validator as the fallback instead of falling back to the current/root validator.
- Preserve ordinary `$anchor` behavior when the static target is not dynamic.
- Preserve current recursive/tree behavior that already passes this repo's recursive fixtures.
- Add direct tests for `$defs`-located dynamic anchors and OpenAPI 3.1 `#meta`-style schemas.

PR #2615 already implements much of this strategy and is the best starting point for the generic pagination / wrapper patterns. PR #2622 may contain necessary dynamic-scope propagation changes for nested dynamic anchors and JSON Schema Test Suite unskips. A maintainer-friendly next step is likely to consolidate the non-overlapping parts of #2615 and #2622 rather than submit a fourth competing PR.

Backwards-compatibility risks are meaningful because AJV is widely embedded and code-generated validators are sensitive to control-flow changes. Ordinary `$ref`, `$id`, `$anchor`, circular references, recursive refs, draft-07 behavior, and non-2020 constructors must remain unchanged. OpenAPI 3.0 documents should not see any behavior change unless a downstream tool has incorrectly routed them through 2020-12 mode.

## Upstream Strategy

Tackle AJV now, but do not open a new broad issue. The issue and PR history is already sufficient.

Best path:

- Reproduce this repo's failing AJV cases against `ajv@8.20.0` and PR #2615.
- Comment on PR #2615 with the concrete fixture matrix, especially `generic-schema-binding.yaml`, `paginated-response.yaml`, `api-envelope.yaml`, and `nested-workspace-resources.yaml`.
- If #2615 does not cover nested dynamic scope from #2622, propose a consolidated follow-up or ask maintainers which PR they prefer as the base.
- Keep the first accepted patch limited to same-resource static target resolution and `$defs` dynamic anchors; defer external non-fragment `$dynamicRef` if it increases review risk.

Expected acceptance likelihood is **medium** because the fix is high-impact and already has clean open PRs, but AJV's backlog and the age of #1745 make timing uncertain.

Downstream tools that would benefit include Stoplight Prism, Postman/openapi-to-postman once configured for 2020-12, Insomnia if its parser path preserves OpenAPI 3.1 JSON Schema keywords, Spectral internals where AJV validation is used, and many custom Node.js OpenAPI validators.

## Open Questions

- Which of PR #2615 and PR #2622 do AJV maintainers prefer as the base for a final fix?
- Does AJV intend to support non-fragment URI `$dynamicRef` in v8, or should that wait for a larger resolver refactor?
- Can the multi-parameter `nested-workspace-resources.yaml` pattern be supported without introducing ambiguity for same-name dynamic anchors in sibling/static scans?
- Should this repo's `api-envelope.yaml` be added to the local AJV PR validation matrix before upstream outreach, since the fixture docs infer it has the same gap as pagination but do not record Hyperjump/AJV PR #2615 results?

## Sources

- AJV repository: https://github.com/ajv-validator/ajv
- npm `ajv@8.20.0`: https://registry.npmjs.org/ajv/latest
- AJV package manifest: https://raw.githubusercontent.com/ajv-validator/ajv/master/package.json
- `Ajv2020` constructor: https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/2020.ts
- Draft-2020 vocabulary list: https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/vocabularies/draft2020.ts
- Dynamic vocabulary index: https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/vocabularies/dynamic/index.ts
- `$dynamicRef` implementation: https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/vocabularies/dynamic/dynamicRef.ts
- `$dynamicAnchor` implementation: https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/vocabularies/dynamic/dynamicAnchor.ts
- Issue #1573: https://github.com/ajv-validator/ajv/issues/1573
- Issue #1745: https://github.com/ajv-validator/ajv/issues/1745
- Issue #1964: https://github.com/ajv-validator/ajv/issues/1964
- PR #2573: https://github.com/ajv-validator/ajv/pull/2573
- PR #2615: https://github.com/ajv-validator/ajv/pull/2615
- PR #2622: https://github.com/ajv-validator/ajv/pull/2622
- Local fixture behavior: `fixtures/README.md`
- Local catalog entry: `TOOLING_CATALOG.md`
