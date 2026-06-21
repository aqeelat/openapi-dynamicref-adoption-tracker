# swagger-jsdoc

## Summary

`swagger-jsdoc` (`Surnet/swagger-jsdoc`) generates an OpenAPI document from JSDoc-embedded YAML annotations. It has **no `$dynamicRef`/`$dynamicAnchor` support**: zero references in its own source. It validates/bundles the generated doc with **`@apidevtools/swagger-parser@^12.1.0`** — which (per the fixtures-first finding) supports OAS 3.1 and preserves the keywords opaquely. So a user who hand-authors `$dynamicRef` inside a JSDoc YAML block would see it pass through into the final document, but swagger-jsdoc itself neither generates nor resolves the keyword (it's a JSDoc-to-OpenAPI concatenator). 0 issues.

**Empirical run skipped** (producer; non-runnable — JSDoc-driven, not fixture-driven).

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/Surnet/swagger-jsdoc |
| Source commit | `04cbcb6` (2026-05-22) |
| Validation dep | `@apidevtools/swagger-parser@^12.1.0` (OAS 3.1 capable; preserves keywords opaquely) |
| `$dynamicRef` Status | **No support** (no generation/resolution; opaque passthrough only if hand-authored in JSDoc) |
| Priority | Low |
| Blocked by | — |
| Backed by | @apidevtools/swagger-parser |

## Current Behavior

- **No generation/resolution.** `grep` of `src/` for `dynamicRef`/`$dynamic` = zero hits. swagger-jsdoc concatenates JSDoc YAML blocks into one document; it has no schema model of its own.
- **Opaque passthrough via the validator.** The output is validated through `@apidevtools/swagger-parser@12`, which accepts OAS 3.1 and preserves `$dynamicRef`/`$dynamicAnchor` opaquely. So hand-authored keywords in JSDoc survive to the final file — but that's the validator's behavior, not a swagger-jsdoc feature.
- **No semantic dynamic-scope resolution.**

## Recommendation

**Skip.** A JSDoc concatenator has nothing to "fix" — if a user authors `$dynamicRef` in JSDoc, it already passes through. No generation or resolution responsibility.

## Sources

- Source clone: `/tmp/swagger-jsdoc` @ `04cbcb6`; `package.json` (`@apidevtools/swagger-parser@^12.1.0`)
- Cross-ref: `@apidevtools/swagger-parser@12` OAS-3.1 + opaque-preservation finding (see `analysis/hoppscotch.md`)
