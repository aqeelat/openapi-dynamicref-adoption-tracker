# oapi-codegen — $dynamicRef Analysis

**Category:** SDK Generator (Go)
**Repo:** https://github.com/oapi-codegen/oapi-codegen
**Version analyzed:** v2 (latest)
**OAS version input:** 3.0 historically; OAS 3.1 in active development (PR #2336)
**License:** Apache-2.0
**Status:** Not supported — gated on OAS 3.1 baseline completion

---

## What It Does

oapi-codegen generates Go server and client code (chi, echo, gin, gorilla/mux) from OpenAPI specs. It is one of the most widely-used Go OpenAPI codegen tools (8.3k stars).

## $dynamicRef Support

No `$dynamicRef`-specific issues exist. The tool historically targets OAS 3.0 only. OAS 3.1 support is underway in PR #2336 ("Initial OpenAPI 3.1 support based on kin-openapi", milestone v2.8.0, opened Apr 2026, still open as of research date).

**Key dependency chain:** oapi-codegen v2 depends on `github.com/getkin/kin-openapi v0.138.0` for parsing. Whether kin-openapi correctly preserves `$dynamicRef` in its OAS 3.1 path is an open question. Additionally, `santhosh-tekuri/jsonschema/v6` (which does correctly support `$dynamicRef`) is already an indirect dependency.

## Contribution Opportunity

A targeted issue or PR adding `$dynamicRef`-aware code generation to the OAS 3.1 path would be timely — but only after PR #2336 lands. The maintainer (`jamietanna`) is responsive and has active label hygiene. Filing an issue now to track the gap is appropriate; a PR should wait until the 3.1 foundation is stable.

**Contribution landing likelihood:** Medium. Timely window, active maintainer, but blocked on #2336.

## Implementation Direction (post-3.1)

Once #2336 lands, implement `$dynamicRef` using **Go generics** (`type PaginatedTemplate[T any] struct { items []T }`), modeled on Orval's two-pattern architecture (see [`analysis/orval-reference.md`](orval-reference.md)). kin-openapi (oapi-codegen's parser) is **sibling-safe** (✓ — see catalog §1), so Pattern B is implementable. Do NOT default to materialized concrete types — Orval proves generic emission is achievable and accepted upstream.

## Testing Methodology

See [../TESTING_METHODOLOGIES.md](../TESTING_METHODOLOGIES.md) — SDK Generator methodology.
