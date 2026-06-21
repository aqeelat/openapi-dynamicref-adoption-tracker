# @rtk-query/codegen-openapi

## Summary

`@rtk-query/codegen-openapi` (in `reduxjs/redux-toolkit` at `packages/rtk-query-codegen-openapi`) generates Redux Toolkit Query API endpoint definitions from an OpenAPI document. It has **no `$dynamicRef`/`$dynamicAnchor` support**: zero references in source. It parses specs with **`@apidevtools/swagger-parser@10.1.1`** — which, despite its stale npm description (*"OpenAPI 3.0 parser"*), **empirically accepts OAS 3.1** (`validate` returns OK on `openapi: 3.1.0`) and passes `$dynamicRef` through opaquely. The codegen, however, ignores the keyword: it emits endpoint hooks/tags from operations; a `$dynamicRef`-bearing response schema has no concrete type to emit and degrades to `unknown` (or is omitted) in the generated API. RTK Query is hugely popular, so the gap has real impact, but there is zero user demand on the tracker.

**Empirical codegen run skipped** (stall guard): the CLI is config-file-driven (`rtk-query-codegen-openapi ./config.js`, not direct args) and needs a full RTK baseQuery setup + `timeout` (unavailable on macOS) to bound the multi-step run. Source + parser-dependency analysis is conclusive.

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/reduxjs/redux-toolkit (package `packages/rtk-query-codegen-openapi`) |
| Source commit | `fd30d99` (2026-04-14) |
| Parser dep | `@apidevtools/swagger-parser` ^10.1.1 |
| `$dynamicRef` Status | **No support** (codegen ignores it; parser accepts 3.1) |
| Priority | Low |
| Blocked by | — (the gap is the codegen, not the parser) |
| Backed by | — |

## Maintenance And Landing Likelihood

| Indicator | Value |
|---|---|
| Most recent commit | 2026-04-14 (`fd30d99`) |
| Maintainer | Redux team (`markerikson`, `phryneas`, `EskiMojo14`) |
| Activity level | Very active (Redux Toolkit monorepo) |
| Issue tracker demand | 0 issues mention `$dynamicRef`/`$dynamicAnchor` |

Landing likelihood for a well-scoped PR: **Low–Medium.** RTK Query is popular and the Redux team is receptive, but `$dynamicRef` resolution would mean teaching the codegen to resolve the keyword to a concrete response type — a non-trivial addition with zero current demand. An issue with fixture evidence would be the right opener.

## Dependency Chain

```
@rtk-query/codegen-openapi
  → @apidevtools/swagger-parser ^10.1.1   (parses OAS 3.1; passes $dynamicRef through opaquely)
  → openapi-types ^9.1.0                   (TS types)
  → swagger2openapi ^7.0.4                 (Swagger 2.0 → 3.0 conversion)
```

- swagger-parser@10.1.1 empirically accepts the OAS 3.1 fixture (its stale "3.0 parser" npm description notwithstanding), so the spec version is **not** the blocker.
- The keyword gap is in the codegen: it consumes the parsed document's operations/responses and emits RTK Query endpoints; a response schema that resolves only via `$dynamicRef` has no concrete type, so the generated endpoint's response type degrades to `unknown`.

## Current DynamicRef Behavior

- **No handling.** `grep` of `packages/rtk-query-codegen-openapi/src` for `dynamicRef`/`$dynamic`/`$anchor` returns zero hits.
- **Parser passes it through.** swagger-parser@10 accepts the 3.1 fixture and preserves `$dynamicRef`/`$dynamicAnchor` opaquely (the codegen just never reads them).
- **Response types degrade.** Generated endpoint hooks for operations whose response schema uses `$dynamicRef` will lack a concrete type (the codegen has no dynamic-scope resolution).
- **No semantic dynamic-scope resolution.**

## Fixture Results

Codegen run skipped (config-driven CLI; see Summary). Verdict by source + parser analysis:

| Fixture | OAS | Observed | Verdict |
|---|---|---|---|
| generic-schema-binding | 3.1 | parser accepts; codegen ignores `$dynamicRef`; `items` response slot untyped | UNTYPED |

**Human Review Needed:** one end-to-end codegen run with a proper `config.js` to confirm the generated `unknown` typing for a `$dynamicRef` response.

## Relevant Source Map

- `packages/rtk-query-codegen-openapi/src/` — codegen; no `dynamicRef`/`$dynamic` references.
- `packages/rtk-query-codegen-openapi/package.json:72,82` — `@apidevtools/swagger-parser@^10.1.1`, `openapi-types@^9.1.0`, `swagger2openapi@^7.0.4`.

## Existing Issues And Prior Art

- **No issues** in `reduxjs/redux-toolkit` mention `$dynamicRef`/`$dynamicAnchor`.
- Note: the package pins `swagger-parser@^10`; bumping to `^12` (which has the cleaner OAS-3.1 support) would be a prerequisite for any deeper 3.1 work, though @10 already accepts 3.1.

## Implementation Plan

If pursued:
1. Optionally bump `swagger-parser` to `^12` (cleaner 3.1 support; @10 works but its description is stale).
2. In the codegen, when a response schema carries `$dynamicRef`, resolve it against the outermost `$dynamicAnchor` in scope and emit the concrete type; fall back to `unknown` only if unresolved.
3. Tests: generate from `fixtures/generic-schema-binding.yaml` and assert the `items` response slot is typed as `User[]`/`Group[]` (not `unknown`).

## Upstream Strategy

1. Open an issue in `reduxjs/redux-toolkit` (rtk-query codegen) with the fixture and the source evidence (zero keyword handling). Frame as: OAS 3.1 `$dynamicRef` response schemas silently degrade to `unknown`.
2. Expected acceptance: **Low–Medium** — receptive team, but non-trivial feature with no demand. The codegen-config-driven setup makes repro easy for maintainers to verify.

## Open Questions

- Does the generated API emit `unknown` or omit the property entirely for a `$dynamicRef`-only response? (Needs the end-to-end run to confirm — the source suggests `unknown`, but the exact output is unverified.)

## Sources

- Source clone: `/tmp/redux-toolkit` @ `fd30d99` (2026-04-14), `packages/rtk-query-codegen-openapi/`
- `packages/rtk-query-codegen-openapi/package.json` (deps)
- Empirical: `@apidevtools/swagger-parser@10.1.1` `validate` on `fixtures/generic-schema-binding.yaml` → OK (`openapi: 3.1.0`)
- Codegen empirical run skipped (config-driven CLI, stall guard)
