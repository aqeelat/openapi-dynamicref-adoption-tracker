# Validation Notes

This directory records how fixtures are validated before they are used for SDK generator outreach.

Validator categories:

| Category | Purpose |
|---|---|
| OpenAPI document validators | Confirm the API description is structurally valid OpenAPI |
| JSON Schema runtime validators | Investigate `$dynamicRef` / `$dynamicAnchor` runtime resolution; classify validator disagreements |

Pipeline commands:

| Stage | Command | When to run |
|---|---|---|
| Stage 1 | `./scripts/validate-and-build.sh` | After changing fixtures |
| Stage 2 | `./scripts/run-matrix.sh` | After changing generator versions |

Standalone research:

```bash
node scripts/validate-jsonschema.mjs
```

Do not present one validator as authoritative. If validators disagree, include the disagreement in upstream issues and classify it as mixed validator support.
