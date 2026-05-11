# Validation Notes

This directory records how fixtures are validated before they are used for SDK generator outreach.

Validator categories:

| Category | Purpose |
|---|---|
| OpenAPI document validators | Confirm the API description is structurally valid OpenAPI |
| JSON Schema runtime validators | Confirm `$dynamicRef` / `$dynamicAnchor` evaluate as intended for sample instances; classify validator disagreements |

Current commands:

```bash
./scripts/validate-openapi.sh
node scripts/validate-jsonschema.mjs
./scripts/validate-fixtures.sh
```

Do not present one validator as authoritative. If validators disagree, include the disagreement in upstream issues and classify it as mixed validator support.
