# ogen — $dynamicRef Analysis

**Category:** SDK Generator (Go)
**Repo:** https://github.com/ogen-go/ogen
**Version analyzed:** latest main
**OAS version input:** 3.0 primary; OAS 3.1 partial (nullable type arrays open as of Jan 2026, PR #1619)
**License:** Apache-2.0
**Status:** Not supported — OAS 3.1 baseline itself incomplete

---

## What It Does

ogen generates strict, type-safe Go server and client code from OpenAPI 3.x specs. It targets correctness and safety over feature breadth (2.1k stars).

## $dynamicRef Support

No issues or PRs reference `$dynamicRef`. ogen's OAS 3.1 support is itself incomplete — nullable `type: [T, null]` arrays are still being worked on (PR #1619, open as of Jan 2026). `$dynamicRef` is a JSON Schema 2020-12 feature requiring recursive schema resolution at code-generation time, which is significantly harder than basic 3.1 nullability.

## Contribution Opportunity

Filing a tracking issue now is reasonable. A PR should wait until the OAS 3.1 baseline (nullable types, discriminators) is stabilized. Maintainers are active with good label hygiene.

**Contribution landing likelihood:** Low-to-medium. Active project, receptive maintainers, but `$dynamicRef` requires a complete 3.1 foundation first.

## Implementation Direction (post-3.1)

Once the OAS 3.1 baseline stabilizes, implement `$dynamicRef` using **Go generics** (`type PaginatedTemplate[T any] struct { items []T }`), modeled on Orval's two-pattern architecture (see [`analysis/orval-reference.md`](orval-reference.md)). Do NOT default to materialized concrete types — Orval proves generic emission is achievable.

## Testing Methodology

See [../TESTING_METHODOLOGIES.md](../TESTING_METHODOLOGIES.md) — SDK Generator methodology.
