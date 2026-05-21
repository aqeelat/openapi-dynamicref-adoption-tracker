# openapi-to-postmanv2 (Postman)

## Overview

| Property | Value |
|---|---|
| Category | Spec converter (OpenAPI → Postman collection) |
| Language | JavaScript |
| License | Apache-2.0 |
| Repo | https://github.com/postmanlabs/openapi-to-postmanv2 |
| Version analyzed | v6.0.1 (Apr 15, 2026) |
| OAS versions supported | Swagger 2.0, OAS 3.0, OAS 3.1 |
| Active maintenance | Yes |

## Summary

`openapi-to-postmanv2` is the open-source library that powers Postman's OpenAPI import feature. It uses AJV v8 and a custom resolver chain (`oas-resolver-browser`). The tool explicitly targets OAS 3.1 support. `$dynamicRef` handling is unknown — the `oas-resolver-browser` layer does static `$ref` traversal and likely passes `$dynamicRef` through without semantic resolution, meaning the keyword may appear in the output collection but without the bound concrete schema. No issues exist for this gap, making it an unreported first-mover opportunity.

Yaak inherits the same behavior since it uses `openapi-to-postmanv2 ^5.8.0` as its OpenAPI importer.

## Processing Stack

```
openapi-to-postmanv2
  → oas-resolver-browser 2.5.6   ($ref resolution)
  → ajv ^8.11.0                  (JSON Schema validation)
  → ajv-draft-04                 (OAS 2.0/3.0 compat)
  → ajv-formats 2.1.1
  → json-schema-merge-allof 0.8.1
  → swagger2openapi 7.0.8        (Swagger 2.0 upconversion)
```

Note: does **not** use `@apidevtools/swagger-parser`. Uses its own resolver chain.

## $dynamicRef Support Status

**Unknown / likely broken passthrough.**

`oas-resolver-browser` performs static `$ref` traversal (similar to `json-schema-ref-parser` in bundling mode). It does not implement `$dynamicRef` semantics. The likely behavior:

- `$dynamicRef` is treated as a property name, not as a reference keyword.
- It is copied into the output Postman collection as an opaque string.
- The bound concrete schema is never inlined or associated.

AJV v8 is present but likely used in draft-07/draft-04 mode (given `ajv-draft-04` dependency), not `Ajv2020` mode.

No `$dynamicRef` issues in the tracker. OAS 3.1 support PRs exist (e.g., `nullable` handling, `type` arrays), but none address `$dynamicRef` specifically.

## Testing Approach

See [TESTING_METHODOLOGIES.md — Spec Converter Testing](../TESTING_METHODOLOGIES.md#spec-converter-testing).

The test:
1. Pass a fixture spec (e.g., `generic-schema-binding`) through `openapi-to-postmanv2`.
2. Inspect the output Postman collection JSON.
3. Assert that request/response schemas in the collection reflect the dynamically-bound concrete schema.
4. Assert that `$dynamicRef` does not appear as an unresolved string in operation schemas.

This is a straightforward unit test against the library's API.

## Contribution Feasibility

**Medium-High.** The repo is well-structured JavaScript, actively maintained, and contributors are welcome (67 open issues, 34 open PRs with active review). A PR demonstrating broken `$dynamicRef` passthrough with a test case would be well-received — OAS 3.1 is explicitly on the roadmap.

The fix could be:
1. Detect `$dynamicRef` keywords after resolution and perform a post-processing pass to bind them.
2. Or, replace `oas-resolver-browser` with a resolver that handles `$dynamicRef` correctly.

Option 1 is more contained; option 2 is more correct but higher scope.

## Landing Likelihood

**Medium-High.** Active maintainers, explicit OAS 3.1 support commitment, no competing PRs on this gap. The most impactful single fix in the API-client category — fixing it also fixes Yaak.
