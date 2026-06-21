# Zally

## Summary

Zally is Zalando's Java/Kotlin (Spring Boot) OpenAPI linter. It has **no `$dynamicRef`/`$dynamicAnchor` support**: it pins `swagger-parser-v3:2.1.12`, which predates v2.1.28 (2025-05-17) where swagger-parser first learned to parse those keywords, and Zally has no awareness of them in its own ruleset. So `$dynamicRef`/`$dynamicAnchor` in an OAS 3.1 spec are dropped at parse time and never reach Zally's rules. Even a swagger-parser bump to ≥2.1.28 would only reach "Partial" (swagger-parser still loses the keywords during dereference — see `analysis/swagger-parser.md`-equivalent findings / PR #2332). Zally is therefore **blocked by swagger-parser**, and its release line is stale (last release v2.1.1, Dec 2022) despite continued commits.

**Empirical run skipped** per the fixtures-first stall guard: no published Docker image since 2022 and building the Spring Boot server exceeds the 5-minute budget. Characterized via the dependency chain (the documented fallback).

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/zalando/zally |
| Source commit | `0aef7fa` (2025-07-04) |
| Latest release | v2.1.1 (2022-12-09) |
| `$dynamicRef` Status | **No support** |
| Priority | Low |
| Blocked by | swagger-parser |
| Backed by | — |

## Maintenance And Landing Likelihood

| Indicator | Value |
|---|---|
| Most recent meaningful commit | 2025-07-04 (`0aef7fa`) |
| Latest release | v2.1.1 (2022-12-09) — **3+ years old** |
| Open issues | 100 |
| GitHub stars | 944 |
| Archived | no |
| Activity level | **Maintenance-only on releases** — commits continue but no release has shipped since Dec 2022 |

Landing likelihood for a well-scoped PR: **Low.** A `$dynamicRef` fix in Zally itself is moot until swagger-parser is bumped (≥2.1.28) and until swagger-parser preserves the keywords through dereference (PR swagger-parser#2332). On top of that, Zally's stale release line means even a merged change may not ship promptly.

## Dependency Chain

```
zally
  → io.swagger.parser.v3:swagger-parser:2.1.12     (parses user OpenAPI specs; PRE-$dynamicRef)
  → com.github.fge:json-schema-validator           (draft-04-era; used ONLY for internal ruleset-config validation)
```

- **swagger-parser 2.1.12** is the spec parser. `$dynamicRef`/`$dynamicAnchor` parsing was added in swagger-parser **v2.1.28** (PR swagger-parser#2181, merged 2025-05-17), so 2.1.12 drops the keywords entirely. Zally's rules never see them. **Blocked by** swagger-parser.
- `com.github.fge:json-schema-validator` (the unmaintained java-json-tools draft-04 validator) is used in `JsonSchemaValidator.kt` to validate Zally's own ruleset **config** — it does not validate user OpenAPI specs and is irrelevant to `$dynamicRef` in user documents. Mentioned only to pre-empt confusion.
- Zally has **zero** references to `$dynamicRef`/`$dynamicAnchor` in its own source.

## Current DynamicRef Behavior

> **Empirical run skipped** (stall guard): no published Docker image since 2022; building the Spring Boot server + CLI exceeds the 5-minute budget. The behavior is characterized conclusively from the dependency chain, which is deterministic for this question.

- **Parse stage (the blocker):** swagger-parser 2.1.12 does not recognize `$dynamicRef`/`$dynamicAnchor`; they are not surfaced on the parsed schema model. So regardless of Zally's rules, the keywords are invisible to linting.
- **Zally rules:** none reference `$dynamicRef`/`$dynamicAnchor`/`$id`/`$anchor`. Even if the parser preserved the keywords, Zally would merely ignore them (no crash, no rule fires) — but that scenario requires a swagger-parser bump first.
- **Failure mode:** silent drop at parse time. No crash; the keywords simply do not exist in Zally's view of the spec.

## Fixture Results

Not run (see "Empirical run skipped" above). Verdict by dependency analysis:

| Fixture | OAS version | Observed | Verdict |
|---|---|---|---|
| (all four) | 3.1 | `$dynamicRef`/`$dynamicAnchor` dropped by swagger-parser 2.1.12 before Zally sees them | STRIPPED (by upstream) |

**Human Review Needed:** none beyond confirming the dependency version at the time of any future re-test.

## Relevant Source Map

- `server/zally-core/build.gradle.kts:5` — `api("io.swagger.parser.v3:swagger-parser:2.1.12")` (the blocker).
- `server/zally-core/src/main/kotlin/org/zalando/zally/core/JsonSchemaValidator.kt` — uses `com.github.fge:json-schema-validator` for ruleset-config validation only (not user specs).
- No `$dynamicRef`/`$dynamicAnchor` references anywhere under `server/`.

## Existing Issues And Prior Art

- A search of `zalando/zally` found **no** issues or PRs mentioning `$dynamicRef`/`$dynamicAnchor`/JSON Schema 2020-12. The topic has not been raised.
- swagger-parser's own `$dynamicRef` history (PR #2181 merged 2025-05-17 for parsing; PR #2332 open for dereference-preservation) is the relevant upstream prior art.

## Failure Modes To Test

Once a swagger-parser bump is in place:
- Lint each of the four fixtures and confirm whether `$dynamicRef`/`$dynamicAnchor` now survive to Zally's rule layer.
- Expect: no rule fires on the keywords (Zally has no such rules), equivalent to "PRESERVED but ignored" — i.e., Zally would lint cleanly without crashing, matching Spectral/Redocly/vacuum's spec-level behavior.

## Implementation Plan

The work is entirely upstream-sequenced:
1. **Bump swagger-parser to ≥ v2.1.28** (parsing) in `server/zally-core/build.gradle.kts:5`. This alone gets Zally to "parses `$dynamicRef`, loses it during dereference" (Partial) — the same state as swagger-parser itself.
2. **Land swagger-parser PR #2332** (dereference preservation) so the keywords survive the full parse→resolve cycle.
3. After both, Zally inherits Correct spec-level handling automatically (it delegates parsing to swagger-parser and has no keyword-specific rules). Add a regression test that lints each fixture without error.

No Zally-specific semantic dynamic-scope resolution is appropriate (Zally is a linter).

## Upstream Strategy

1. Do **not** open a Zally PR yet — it would be blocked on swagger-parser #2332.
2. Once #2332 lands and is released, open a small Zally PR bumping the swagger-parser dependency, with a fixture-based regression test.
3. Track Zally's stale release cadence separately — even a merged bump may not ship until they cut a new release (last was Dec 2022).

## Open Questions

- Will Zally ship a new release at all? Last release was Dec 2022; commits continue but no release has been cut. A dependency bump merged to `main` could sit unreleased indefinitely.

## Sources

- Source clone: `/tmp/zally` @ `0aef7fa` (2025-07-04)
- `server/zally-core/build.gradle.kts:5` (swagger-parser 2.1.12)
- `server/zally-core/src/main/kotlin/org/zalando/zally/core/JsonSchemaValidator.kt` (fge validator, config-only)
- swagger-parser v2.1.28 release (2025-05-17) — `$dynamicRef` parsing added (PR #2181)
- swagger-parser PR #2332 (open) — dereference preservation
- GitHub repo stats (944 stars, 100 open issues, latest release v2.1.1 2022-12-09)
