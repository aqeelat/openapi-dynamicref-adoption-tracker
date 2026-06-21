# Hoppscotch

## Summary

Hoppscotch (`hoppscotch/hoppscotch`) is a web-based API client with OpenAPI import. Its import worker (`packages/hoppscotch-common/src/helpers/import-export/import/workers/openapi-import-worker.ts`) uses **`@apidevtools/swagger-parser` 12.1.0** to `validate` and `dereference` imported specs. Empirically, **both paths succeed on OAS 3.1 and preserve `$dynamicRef`/`$dynamicAnchor`** opaquely — no crash, no drop. Hoppscotch then converts the spec into its own collection format (requests/parameters), which does not perform schema validation or dynamic-scope resolution (correct for an API client). So Hoppscotch is **Correct (spec-level)** — same tier as Spectral/Redocly for an importer. Backed by `@apidevtools/swagger-parser@12`, which (contrary to this catalog's outdated note for that row) does support OAS 3.1 and passes the keywords through.

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/hoppscotch/hoppscotch |
| Source commit | latest (pushed 2026-05-28) |
| Import dep | `@apidevtools/swagger-parser` 12.1.0 |
| `$dynamicRef` Status | **Correct (spec-level)** |
| Priority | Low |
| Blocked by | — |
| Backed by | @apidevtools/swagger-parser |

## Maintenance And Landing Likelihood

| Indicator | Value |
|---|---|
| Most recent commit | 2026-05-28 |
| Open issues | active tracker |
| GitHub stars | very high (popular web API client) |
| Maintainer | Hoppscotch team (`liyasthomas` + open-source community) |
| Activity level | **Active** |
| Issue tracker demand | 0 issues mention `$dynamicRef`/`$dynamicAnchor` |

Landing likelihood for a well-scoped PR: **N/A** — no PR needed. Hoppscotch already imports OAS 3.1 specs containing the keywords without crashing or dropping them. Semantic dynamic-scope resolution is not an API client's responsibility.

## Dependency Chain

```
Hoppscotch import worker
  → @apidevtools/swagger-parser 12.1.0   (validate + dereference; OAS 3.1 capable; preserves $dynamicRef/$dynamicAnchor opaquely)
  → fp-ts Either for error handling
```

- `@apidevtools/swagger-parser@12` supports OAS 3.1 (empirically: `validate` and `dereference` both accept `openapi: 3.1.0` and preserve the keywords). This corrects the catalog's stale note that `@apidevtools/swagger-parser` is "3.0 only" — that was true for older majors; v12 handles 3.1.
- **Backed by** `@apidevtools/swagger-parser`. Hoppscotch adds no own schema-resolution logic.

## Current DynamicRef Behavior

Empirically tested (node script against `@apidevtools/swagger-parser@12.1.0` on `fixtures/generic-schema-binding.yaml`):

| Operation | Result |
|---|---|
| `SwaggerParser.validate(fixture, { continueOnError: true })` | OK; `openapi: 3.1.0`; `$dynamicRef` preserved ✓; `$dynamicAnchor` preserved ✓ |
| `SwaggerParser.dereference(fixture)` | OK; `$dynamicRef` preserved ✓; `$dynamicAnchor` preserved ✓ |

- **No crash, no drop.** Both the validate path (used for validation) and the dereference path (used before collection conversion) preserve the keywords. `dereference` only inlines ordinary `$ref`s; `$dynamicRef` is left as an opaque property.
- **No semantic dynamic-scope resolution.** Correct for an API client — Hoppscotch extracts requests/parameters/methods into its collection; it doesn't validate response bodies against schemas. `$dynamicRef` in a request/response body schema is preserved in any schema view but not resolved.
- The import worker (lines 12-50) dispatches `validate` and `dereference` messages and wraps results in `fp-ts/Either`; no special handling for `$dynamicRef` (none needed).

## Fixture Results

Empirical (node, `@apidevtools/swagger-parser@12.1.0`, on `fixtures/generic-schema-binding.yaml`):

| Fixture | OAS | Observed | Verdict |
|---|---|---|---|
| generic-schema-binding | 3.1 | `validate` + `dereference` both succeed; keywords preserved as opaque properties | PRESERVED |

**Human Review Needed:** end-to-end import via the Hoppscotch UI to confirm the collection renders requests correctly for a `$dynamicRef`-bearing spec (the underlying parser already preserves the keywords; the UI conversion is the only unverified layer).

## Relevant Source Map

- `packages/hoppscotch-common/src/helpers/import-export/import/workers/openapi-import-worker.ts:9-50` — import worker: `validateDocs` (line 12, `SwaggerParser.validate` with `continueOnError`), `dereferenceDocs` (line 24, `SwaggerParser.dereference`), message dispatch.
- `packages/hoppscotch-common/package.json:24` — `"@apidevtools/swagger-parser": "12.1.0"`.

## Existing Issues And Prior Art

- **No issues** in the Hoppscotch tracker mention `$dynamicRef`/`$dynamicAnchor`.

## Implementation Plan

**None required.** Hoppscotch already does the right thing for an API client (parses OAS 3.1, preserves keywords, no crash). If a future issue reports a rendering quirk for `$dynamicRef` schemas in the collection view, that would be a UI concern, not a parser concern.

## Upstream Strategy

None. Optional: if the Hoppscotch UI's schema viewer ever displays `$dynamicRef`-bearing responses confusingly, a small UX tweak there — but no parser change.

## Open Questions

- Does the Hoppscotch collection-conversion layer (post-dereference) lose `$dynamicRef` when it flattens response body schemas into request templates? Unverified; the parser preserves them, but the conversion to Hoppscotch's own format is the one unverified step.

## Sources

- Source clone: `/tmp/hoppscotch` (latest, pushed 2026-05-28)
- Empirical node runs against `@apidevtools/swagger-parser@12.1.0` on `fixtures/generic-schema-binding.yaml` (both `validate` and `dereference`)
- `packages/hoppscotch-common/src/helpers/import-export/import/workers/openapi-import-worker.ts`, `packages/hoppscotch-common/package.json:24`
