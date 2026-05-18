# Fixtures

Fixtures are the authored source-of-truth scenarios for this repository. The top-level fixtures are the SDK generator matrix scenarios, and generated versioned OpenAPI specs under `specs/` are derived from those files.

Do not edit generated specs directly. Edit a top-level fixture, then run:

```bash
npm run validate:fixtures
```

## Scenarios

| Fixture | Purpose | What It Tests |
|---|---|---|
| `baseline-duplicated-pagination.yaml` | Control case with explicit `PaginatedUserResponse` and `PaginatedGroupResponse` schemas | Confirms a generator can handle ordinary duplicated wrappers before testing `$dynamicRef` |
| `generic-schema-binding.yaml` | Reusable paginated wrapper with named concrete schemas (`PaginatedUserResponse`, `PaginatedGroupResponse`) | Tests JSON Schema generic-type pattern using `$dynamicRef` / `$dynamicAnchor` — generators must emit reusable parameterized types when the target language supports generics, not duplicate concrete wrappers |
| `paginated-response.yaml` | Reusable paginated wrapper with type binding at the route response level | Tests the same generic pattern but with `$dynamicAnchor` overrides inline in the path operation response — no separate named wrapper schemas |
| `api-envelope.yaml` | Generic response envelope (`ApiEnvelopeTemplate<T>`) with inline `$defs` binding at the route level — one route binds a single resource, another binds a paginated wrapper | Tests two-level `$dynamicRef` nesting: `ApiEnvelopeTemplate<T>` where `T` is bound inline per route. Generators must emit `ApiEnvelopeTemplate<T>` as a reusable parameterized type. The paginated-list route additionally chains `PaginatedTemplate<User>` as the bound type |
| `recursive-category-tree.yaml` | Canonical dynamic recursive override | Tests dynamic scope for recursive schemas (`children` should use the active category type) |
| `nested-workspace-resources.yaml` | Multi-parameter generic template for nested folder/resource graphs | Tests a `$dynamicRef` template with two generic slots (`folderType`, `resourceType`) that are bound together in the concrete schema, producing a self-referential folder/resource graph |
| `non-identifier-schema-key.yaml` | Recursive dynamic override with non-identifier schema keys (`base-category`, `localized-category`) | Tests that generators preserve `$dynamicRef` semantics while normalizing schema keys into valid generated identifiers |

A combined showcase fixture at [`petstore-dynamicref-showcase.yaml`](../petstore-dynamicref-showcase.yaml) exercises all `$dynamicRef` patterns together (generic pagination, response envelopes, nested generics, recursive trees, multi-parameter generic templates, non-identifier keys, typed request/response bodies) and is intended for SDK samples, maintainer demos, and "what good output looks like" examples. It is not a replacement for the focused minimal fixtures above.

## Generator Edge Fixtures

Generator edge fixtures are top-level SDK matrix scenarios when the behavior is portable across generators. `non-identifier-schema-key.yaml` is one of these: it tests schema-key normalization plus dynamic reference fidelity, not any one tool's internal implementation.

Tool-specific switches, such as Orval's `enableUnstableDynamicRefSupport`, are not modeled as schema fixtures. Track those in the relevant GitHub issue and tool docs instead.

## Spec Semantics Fixtures

`fixtures/spec-semantics/` contains focused OpenAPI documents for JSON Schema `$dynamicRef` semantics that are useful for parser and validator work but are intentionally kept out of the SDK generator matrix.

| Fixture | What It Tests |
|---|---|
| `spec-semantics/dynamicref-core-semantics.yaml` | Same-resource dynamic anchors, `$dynamicRef` to `$anchor`, `$ref` to `$dynamicAnchor`, fallback to ordinary anchor behavior, non-fragment URI dynamic refs, multi-parameter generic binding, and allOf sibling order |
| `spec-semantics/external-dynamic-ref.yaml` | `$dynamicRef` to an external JSON Schema resource (`external-dynamic-target.json`) for parser/bundler research |
| `spec-semantics/ambiguous-sibling-anchors.yaml` | Multiple sibling schemas with the same `$dynamicAnchor` name, documenting where static sibling scans are only an approximation of dynamic scope |

## Why Keep The Baseline?

The baseline is a control. If a generator cannot produce useful types for explicit paginated wrappers, then a failure on `generic-schema-binding.yaml` is not evidence of a `$dynamicRef` bug.

## Validation Methodology

Fixtures are validated before they are used for SDK generator outreach. This validation is an internal quality-control step: it proves the repo is testing valid inputs with known intended semantics before evaluating whether ecosystem tools preserve those semantics.

| Check | Purpose |
|---|---|
| OpenAPI document validation | Confirms SDK matrix and spec-semantics fixtures are structurally valid OpenAPI documents |
| JSON Schema runtime validation | Confirms valid and invalid JSON instances behave as expected for the `$dynamicRef` pattern, where validator support exists |

Pipeline commands:

| Stage | Command | When to run |
|---|---|---|
| Stage 1 | `./scripts/validate-and-build.sh` | After changing fixtures |
| Stage 2 | `./scripts/run-matrix.sh` | After changing generator versions |

Standalone JSON Schema research:

```bash
npm run validate:jsonschema
```

Do not present one JSON Schema validator as authoritative when validators disagree. If validators disagree, include the disagreement in upstream issues and classify the fixture as mixed validator support.

## OpenAPI Document Validation

Run via `scripts/validate-openapi.sh` as part of the Stage 1 pipeline. This includes top-level SDK matrix fixtures and `fixtures/spec-semantics/*.yaml`.

| Fixture | Redocly | openapi-spec-validator | Spectral | swagger-cli |
|---|---|---|---|---|
| `baseline-duplicated-pagination.yaml` | Pass | Pass | Pass | Pass |
| `generic-schema-binding.yaml` | Pass | Pass | Pass | Pass |
| `paginated-response.yaml` | Pass | Pass | Pass | Pass |
| `api-envelope.yaml` | Pass | Pass | Pass | Pass |
| `recursive-category-tree.yaml` | Pass | Pass | Pass | Pass |
| `nested-workspace-resources.yaml` | Pass | Pass | Pass | Pass |
| `non-identifier-schema-key.yaml` | Pass | Pass | Pass | Pass |
| `spec-semantics/ambiguous-sibling-anchors.yaml` | Pass | Pass | Pass | Pass |
| `spec-semantics/dynamicref-core-semantics.yaml` | Pass | Pass | Pass | Pass |
| `spec-semantics/external-dynamic-ref.yaml` | Pass | Pass | Pass | Pass |

## JSON Schema Runtime Validation

Run via `npm run validate:jsonschema`. This is standalone fixture research, not the main SDK generator matrix.

Validators: AJV 2020 and Hyperjump 2020-12.

| Fixture | AJV 2020 | AJV PR [#2615](https://github.com/ajv-validator/ajv/pull/2615) | Hyperjump 2020-12 | Classification |
|---|---|---|---|---|
| `baseline-duplicated-pagination.yaml` | Pass | Pass | Not tested | Control passes |
| `generic-schema-binding.yaml` | Valid user/group pages fail; invalid item cases fail | Valid user/group pages pass; invalid item cases fail | Valid user/group pages pass; invalid item cases fail | AJV PR #2615 fixes this |
| `paginated-response.yaml` | Valid user/group pages fail; invalid item cases fail | Valid user/group pages pass; invalid item cases fail | Valid user/group pages pass; invalid item cases fail | AJV PR #2615 fixes this |
| `api-envelope.yaml` | Valid wrapped-user page fails; invalid item cases fail | Not tested | Not tested | Expected same gap as pagination fixtures; AJV PR #2615 should fix this |
| `recursive-category-tree.yaml` | Valid localized category tree passes; child missing localized fields fails | Pass | Not tested | Runtime check passes |
| `nested-workspace-resources.yaml` | Valid nested workspace passes; AJV accepts invalid nested folder data (missing `permissions` field) | Fails: "resolves to more than one schema" for multiple same-name `$dynamicAnchor` in the same document (`FolderTemplate.$defs.folderType` and `WorkspaceFolder.$defs.folderType` share an anchor name) — this is an AJV limitation, not a fixture bug | Not tested | AJV does not correctly resolve the multi-parameter generic template pattern; the fixture is semantically sound |
| `non-identifier-schema-key.yaml` | Valid localized category tree passes; child missing localized fields fails | Not tested | Valid localized category tree passes; child missing localized fields fails | Runtime check passes; generator matrix tests identifier normalization |
| `spec-semantics/ambiguous-sibling-anchors.yaml` | Not tested | Not tested | Not tested | OpenAPI-valid research fixture for static-scan limitations |
| `spec-semantics/dynamicref-core-semantics.yaml` | `$ref` to `$dynamicAnchor` passes; several `$dynamicRef` core cases are known gaps, including non-fragment URI refs | Not tested | Core cases, non-fragment URI refs, allOf order, and multi-parameter generic cases pass | Semantics fixture tier; AJV gaps are documented by case output |
| `spec-semantics/external-dynamic-ref.yaml` | Not tested | Not tested | Valid external node passes; invalid external node fails | External resource semantics fixture for parser/bundler research |

AJV PR [#2615](https://github.com/ajv-validator/ajv/pull/2615) fixes the generic pagination dynamic binding pattern. The nested workspace fixture exposes a separate AJV limitation: multiple schemas declaring the same `$dynamicAnchor` name in a single document causes an ambiguous reference error. This is a limitation of AJV PR #2615, not a bug in the fixture — `nested-workspace-resources.yaml` is semantically correct (both anchor declarations are scoped to different schemas in the `allOf` chain).

## Fixture To Spec Path

```text
fixtures/<scenario>.yaml
  -> scripts/build-specs.mjs
specs/<scenario>/oas-3.1.0.json
specs/<scenario>/oas-3.1.1.json
specs/<scenario>/oas-3.1.2.json
specs/<scenario>/oas-3.2.0.json
```

The generated specs should differ only by top-level `openapi` version unless a scenario documents a version-specific exception.

Spec-semantics fixtures are validated in place and are not expanded into the SDK matrix under `specs/`.
