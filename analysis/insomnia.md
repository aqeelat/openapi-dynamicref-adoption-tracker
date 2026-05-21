# Insomnia

## Overview

| Property | Value |
|---|---|
| Category | API client (desktop) |
| Language | TypeScript (Electron) |
| License | Apache-2.0 |
| Repo | https://github.com/Kong/insomnia |
| Version analyzed | v12.5.0 (Apr 2026) |
| OAS version supported | 3.0, 3.1 (via swagger-parser) |
| Active maintenance | Yes |

## Summary

Insomnia (open source again under Apache-2.0 after Kong's 2023 license drama) uses `@apidevtools/swagger-parser` for spec dereferencing and AJV v8 for validation. The blocker for `$dynamicRef` support is `swagger-parser`, which performs static `$ref` dereferencing and does not implement dynamic scope — `$dynamicRef` keywords are passed through as opaque properties or lost during dereferencing. AJV v8 is present and capable (`Ajv2020` mode) but never reached for `$dynamicRef`-specific semantics.

## Schema Processing Stack

```
Insomnia OpenAPI import
  → @apidevtools/swagger-parser 10.1.1   ($ref resolution / dereference)
  → ajv ^8.17.1                          (schema validation, draft-07 mode by default)
  → @rjsf/validator-ajv8                 (AJV 8 wrapped for React JSON Schema Form)
  → @stoplight/spectral-*                (linting rules)
```

## $dynamicRef Support Status

**None — blocked by swagger-parser.**

`@apidevtools/swagger-parser` v10 performs `$ref` dereferencing (inlining referenced schemas). It does not implement `$dynamicRef` semantics — the keyword is either:

- Passed through as an unresolved string property (the spec structure is preserved but the binding is not applied), or
- Lost if the dereferencer treats `$dynamicRef` as an unrecognized `$ref`-like keyword and attempts to resolve it as a static path.

Even if `$dynamicRef` survives dereferencing, Insomnia's AJV usage is likely in default (draft-07) mode, not `Ajv2020`, meaning AJV would ignore the keyword at validation time.

No issues mentioning `$dynamicRef` in the Insomnia tracker. The gap is unreported.

## Relevant Dependencies

| Dependency | Role | $dynamicRef relevance |
|---|---|---|
| `@apidevtools/swagger-parser` 10.1.1 | Spec loading/dereference | Primary blocker — static `$ref` only |
| `ajv ^8.17.1` | Schema validation | Available but likely in draft-07 mode |
| `@stoplight/spectral-*` | Linting | Not relevant to `$dynamicRef` resolution |

## Testing Approach

See [TESTING_METHODOLOGIES.md — API Client Testing](../TESTING_METHODOLOGIES.md#api-client-testing).

The test would import a fixture spec into Insomnia and verify whether:
1. The spec imports without errors.
2. The schema properties visible in the request builder reflect the dynamically-bound concrete schema.
3. Environment generation or request templating respects the bound schema.

This is a manual/screenshot test given Insomnia's Electron architecture; automated UI testing would require setting up Electron test infrastructure.

## Contribution Feasibility

**Medium (upstream first).** The primary fix target is `@apidevtools/swagger-parser` (also known as `swagger-api/apidom-*` in the new architecture). A `$dynamicRef` pass-through or semantic resolution PR there would benefit Insomnia and all other tools in the `swagger-parser` dependency chain.

A direct Insomnia-level contribution is harder: the fix would need to detect `$dynamicRef` after `swagger-parser` returns and apply dynamic binding logic in Insomnia's own schema processing. This is duplicating work that belongs in the resolution library.

## Landing Likelihood

**Medium** for an upstream `swagger-parser` PR. **Lower** for a direct Insomnia PR given the corporate (Kong) maintenance model and the fact that the root fix belongs upstream.
