# Validation Results

Last recorded validation: 2026-05-11

## OpenAPI Document Validators

Run via `scripts/validate-openapi.sh` (part of Stage 1 pipeline).

| Fixture | Redocly | openapi-spec-validator | Spectral | swagger-cli |
|---|---|---|---|---|
| `baseline-duplicated-pagination.yaml` | Pass | Pass | Pass | Pass |
| `generic-schema-binding.yaml` | Pass | Pass | Pass | Pass |
| `paginated-response.yaml` | Pass | Pass | Pass | Pass |
| `recursive-category-tree.yaml` | Pass | Pass | Pass | Pass |
| `nested-workspace-resources.yaml` | Pass | Pass | Pass | Pass |

## JSON Schema Runtime Validation

Run via `node scripts/validate-jsonschema.mjs` (standalone research tool, not part of the pipeline).

Validators: AJV 2020 and Hyperjump 2020-12

| Fixture | AJV 2020 | Hyperjump 2020-12 |
|---|---|---|
| `baseline-duplicated-pagination.yaml` | Valid user page passes; invalid user item fails | Not tested |
| `generic-schema-binding.yaml` | Valid user/group pages fail; invalid item cases fail | Valid user/group pages pass; invalid item cases fail |
| `paginated-response.yaml` | Valid user/group pages fail; invalid item cases fail | Valid user/group pages pass; invalid item cases fail |
| `recursive-category-tree.yaml` | Valid localized category tree passes; child missing localized fields fails | Not tested |
| `nested-workspace-resources.yaml` | Valid nested workspace passes; nested folder missing permissions fails | Not tested |
