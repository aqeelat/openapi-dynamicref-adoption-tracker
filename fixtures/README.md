# Fixtures

Fixtures are the authored source-of-truth scenarios for this repository. Generated versioned OpenAPI specs under `specs/` are derived from these files.

Do not edit generated specs directly. Edit a fixture, then run:

```bash
node scripts/build-specs.mjs
```

## Scenarios

| Fixture | Purpose | What It Tests |
|---|---|---|
| `baseline-duplicated-pagination.yaml` | Control case with explicit `PaginatedUserResponse` and `PaginatedGroupResponse` schemas | Confirms a generator can handle ordinary duplicated wrappers before testing `$dynamicRef` |
| `generic-schema-binding.yaml` | Reusable paginated wrapper with named concrete schemas (`PaginatedUserResponse`, `PaginatedGroupResponse`) | Tests JSON Schema generic-type pattern using `$dynamicRef` / `$dynamicAnchor` with named type instantiations |
| `paginated-response.yaml` | Reusable paginated wrapper with type binding at the route response level | Tests the same generic pattern but with `$dynamicAnchor` overrides inline in the path operation response — no separate named wrapper schemas |
| `recursive-category-tree.yaml` | Canonical dynamic recursive override | Tests dynamic scope for recursive schemas (`children` should use the active category type) |
| `nested-workspace-resources.yaml` | Multiple anchors and nested dynamic refs | Tests more than one `$dynamicAnchor` / `$dynamicRef` pair in a nested resource graph |

## Why Keep The Baseline?

The baseline is a control. If a generator cannot produce useful types for explicit paginated wrappers, then a failure on `generic-schema-binding.yaml` is not evidence of a `$dynamicRef` bug.

## Validation Methodology

Fixtures are validated before they are used for SDK generator outreach. This validation is an internal quality-control step: it proves the repo is testing valid inputs with known intended semantics before evaluating whether ecosystem tools preserve those semantics.

| Check | Purpose |
|---|---|
| OpenAPI document validation | Confirms each fixture is a structurally valid OpenAPI document before it enters the SDK matrix |
| JSON Schema runtime validation | Confirms valid and invalid JSON instances behave as expected for the `$dynamicRef` pattern, where validator support exists |

Pipeline commands:

| Stage | Command | When to run |
|---|---|---|
| Stage 1 | `./scripts/validate-and-build.sh` | After changing fixtures |
| Stage 2 | `./scripts/run-matrix.sh` | After changing generator versions |

Standalone JSON Schema research:

```bash
node scripts/validate-jsonschema.mjs
```

Do not present one JSON Schema validator as authoritative when validators disagree. If validators disagree, include the disagreement in upstream issues and classify the fixture as mixed validator support.

## OpenAPI Document Validation

Run via `scripts/validate-openapi.sh` as part of the Stage 1 pipeline.

| Fixture | Redocly | openapi-spec-validator | Spectral | swagger-cli |
|---|---|---|---|---|
| `baseline-duplicated-pagination.yaml` | Pass | Pass | Pass | Pass |
| `generic-schema-binding.yaml` | Pass | Pass | Pass | Pass |
| `paginated-response.yaml` | Pass | Pass | Pass | Pass |
| `recursive-category-tree.yaml` | Pass | Pass | Pass | Pass |
| `nested-workspace-resources.yaml` | Pass | Pass | Pass | Pass |

## JSON Schema Runtime Validation

Run via `node scripts/validate-jsonschema.mjs`. This is standalone fixture research, not the main SDK generator matrix.

Validators: AJV 2020 and Hyperjump 2020-12.

| Fixture | AJV 2020 | AJV PR [#2615](https://github.com/ajv-validator/ajv/pull/2615) | Hyperjump 2020-12 | Classification |
|---|---|---|---|---|
| `baseline-duplicated-pagination.yaml` | Pass | Pass | Not tested | Control passes |
| `generic-schema-binding.yaml` | Valid user/group pages fail; invalid item cases fail | Valid user/group pages pass; invalid item cases fail | Valid user/group pages pass; invalid item cases fail | AJV PR #2615 fixes this |
| `paginated-response.yaml` | Valid user/group pages fail; invalid item cases fail | Valid user/group pages pass; invalid item cases fail | Valid user/group pages pass; invalid item cases fail | AJV PR #2615 fixes this |
| `recursive-category-tree.yaml` | Valid localized category tree passes; child missing localized fields fails | Pass | Not tested | Runtime check passes |
| `nested-workspace-resources.yaml` | Valid nested workspace passes; nested folder missing permissions fails | Fails: "resolves to more than one schema" for multiple same-name `$dynamicAnchor` | Not tested | Separate AJV gap: multiple schemas with same `$dynamicAnchor` name |

AJV PR [#2615](https://github.com/ajv-validator/ajv/pull/2615) fixes the generic pagination dynamic binding pattern. The nested workspace fixture exposes a separate AJV limitation: multiple schemas declaring the same `$dynamicAnchor` name in a single document causes an ambiguous reference error.

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
