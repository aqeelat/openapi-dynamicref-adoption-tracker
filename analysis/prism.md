# Stoplight Prism

## Overview

| Property | Value |
|---|---|
| Category | Mock server / validation proxy |
| Language | TypeScript |
| License | Apache-2.0 |
| Repo | https://github.com/stoplightio/prism |
| Version analyzed | v5.15.11 |
| OAS version supported | 3.0, 3.1 (syntactic acceptance; semantic gaps) |
| Active maintenance | Yes |

## Summary

Prism validates requests and responses against OpenAPI schemas using AJV v8. Despite OAS 3.1 syntactic support (added PR #1783, 2021), Prism never activates AJV's `Ajv2020` mode — it uses the default AJV instance (draft-07 semantics) for all schema validation regardless of OAS version. This means `$dynamicRef`/`$dynamicAnchor` are silently ignored: the validation path activates but the keywords are treated as unknown and pass without effect. The gap is unreported, making Prism a high-value first-mover contribution target.

## Validation Stack

```
Prism validator
  → @stoplight/json-schema-ref-parser v10   ($ref resolution)
  → ajv ^8.20.0                             (JSON Schema validation, draft-07 mode)
  → ajv-formats ^2.1.1                      (format validators)
```

The critical issue: `new Ajv({ ... })` (default constructor) is used everywhere. AJV v8's `$dynamicRef`/`$dynamicAnchor` support requires `new Ajv2020({ ... })` from `ajv/dist/2020`. The default constructor does not enable 2020-12 keywords.

## $dynamicRef Support Status

**None — AJV 2020-12 mode never activated.**

Prism's OAS 3.1 support (PR #1783, merged Apr 2021) added acceptance of 3.1 documents syntactically (parsing, routing, example generation) but did not update the validation layer to use `Ajv2020` for 3.1 schemas.

No issues or PRs specifically mention `$dynamicRef` or `$dynamicAnchor`. The gap is entirely unreported.

Runtime behavior with a 3.1 spec containing `$dynamicRef`:
- Prism loads the document (no parser error)
- The mock server generates responses using examples or default generation (unaffected by `$dynamicRef`)
- Validation of requests/responses against schemas containing `$dynamicRef`: the keyword is passed to AJV's default instance, which treats it as an unknown keyword and ignores it. Validation may incorrectly pass when it should fail, or fail to enforce the dynamically-bound concrete schema constraints.

## Relevant Source Locations

| Path | Relevance |
|---|---|
| `packages/http/src/validator/validators/body.ts` | AJV instantiation for body validation — uses default `Ajv` |
| `packages/http/src/validator/validators/headers.ts` | AJV instantiation for header validation |
| `packages/http/src/utils/parseBody.ts` | Entry point for body parsing before validation |

(Exact file paths should be confirmed against the repo; the AJV instantiation pattern is the critical fix point.)

## Testing Approach

See [TESTING_METHODOLOGIES.md — Mock Server / Validator Testing](../TESTING_METHODOLOGIES.md#mock-server-validator-testing).

The test:
1. Start Prism with a fixture spec (e.g., `generic-schema-binding`) in validation mode.
2. Send a request whose response body violates the dynamically-bound schema (e.g., wrong `items` shape for `listUsers`).
3. Assert Prism returns a validation error — currently it does not (bug).
4. After the fix (switching to `Ajv2020` for 3.1 documents), assert the same request produces a validation error.

This is a concise failing-test PR that demonstrates the gap before submitting the fix.

## Contribution Feasibility

**High.** The change is localized:

1. Detect the OAS version of the document being validated.
2. If OAS 3.1.x, instantiate `Ajv2020` instead of the default `Ajv`.
3. The `@stoplight/json-schema-ref-parser` step runs before AJV and resolves static `$ref`s; `$dynamicRef` would need to be preserved through this step (check whether the Stoplight fork passes it through).

**Caveat:** AJV v8 itself has known `$dynamicRef` bugs (see [ajv.md](./ajv.md) — three open PRs as of May 2026). Activating `Ajv2020` mode in Prism would expose those bugs. The contribution may need to note this and either wait for AJV fixes or include workarounds.

## Landing Likelihood

**High.** Active maintenance, clear Apache-2.0 license, well-structured TypeScript codebase, unreported gap with a localized fix. First-mover advantage — no competing PRs.
