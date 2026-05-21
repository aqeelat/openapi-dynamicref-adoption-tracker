# libopenapi — $dynamicRef Analysis

**Category:** Parser / Resolver / Bundler (Go)
**Repo:** https://github.com/pb33f/libopenapi
**Version analyzed:** v0.30.1 (Dec 2025)
**OAS version:** 3.0 + 3.1 (primary design target)
**License:** MIT
**Status:** Correct — full support added in v0.30.1

---

## What It Does

libopenapi is a full-fidelity Go library for parsing, rendering, diffing, and bundling OpenAPI 3.0/3.1/3.2 specs. It is used by vacuum (linter), wiretap (traffic capture), and several other Go-based OpenAPI tools.

## $dynamicRef Support

PR #487 (merged Dec 17, 2025) added complete support:

- `$dynamicAnchor` and `$dynamicRef` fields added to both **low-level** and **high-level** schema models
- Parsing logic in the `Build` method with hash calculation
- **Diff/breaking-change detection**: modification or removal of `$dynamicAnchor`/`$dynamicRef` marked as breaking by default
- **Bundler**: verified that bundling preserves both keywords without breaking dynamic scope
- 100% test coverage on the new code (99.53% overall project)

Issue #267 (with community bounty) originally requested the feature. The maintainer (`daveshanley`) implemented and merged it directly.

## Impact

libopenapi is infrastructure for the Go OpenAPI ecosystem. Tools that depend on it (vacuum, wiretap, oasdiff-adjacent tooling) now inherit correct `$dynamicRef`/`$dynamicAnchor` preservation at the parse level.

## Testing Methodology

See [../TESTING_METHODOLOGIES.md](../TESTING_METHODOLOGIES.md) — Parser/Resolver methodology.
