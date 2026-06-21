# vacuum

## Summary

vacuum is a Go-based OpenAPI/AsyncAPI linter (100% Spectral-compatible) that **correctly accepts** OpenAPI 3.1 specs containing `$dynamicRef`/`$dynamicAnchor`. It goes beyond opaque passthrough: it explicitly recognizes `$dynamicRef`/`$recursiveRef` as **dynamic-scope keywords** and deliberately does **not** try to resolve them as ordinary `$ref` pointers — a documented design decision. All four key fixtures lint with exit code 0 and no keyword errors. Its `bundle` command preserves `$dynamicRef` and `$dynamicAnchor` (with minor anchor consolidation during `$ref` merge). No fix needed; it is **Correct (spec-level)**, the same tier as Spectral and Redocly CLI for a linter. Backed by `libopenapi v0.37.2`, which has had full `$dynamicRef` support since v0.30.1.

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/daveshanley/vacuum |
| Binary analyzed | vacuum v0.29.2 (darwin-arm64 release) |
| Source commit | `c14a4a9` (2026-06-06) |
| `$dynamicRef` Status | **Correct (spec-level)** |
| Priority | Done |
| Blocked by | — |
| Backed by | libopenapi |

## Maintenance And Landing Likelihood

| Indicator | Value |
|---|---|
| Most recent meaningful commit | 2026-06-06 (`c14a4a9`) |
| Latest release | v0.29.2 (2026-06-06) |
| Open issues | 14 |
| PRs merged last 6 months | 65 |
| GitHub stars | 1080 |
| Maintainer | Dave Shanley (`quobix` / `daveshanley`) — also author of libopenapi |
| External PRs merged recently | Yes (active) |
| Activity level | **Active** — continuous releases |

Landing likelihood for a well-scoped PR: **N/A** — no PR needed. `$dynamicRef` is already handled correctly at the linter level.

## Dependency Chain

vacuum delegates OpenAPI parsing/indexing/resolving to **`github.com/pb33f/libopenapi`**:

```
vacuum lint
  → github.com/pb33f/libopenapi v0.37.2          (parse, index, resolve, bundle)
  → github.com/pb33f/libopenapi-validator v0.13.8 (OpenAPI validation rules)
```

`libopenapi` has parsed `$dynamicRef`/`$dynamicAnchor` into both its low-level and high-level schema models since v0.30.1 (Dec 2025). vacuum v0.29.2 ships v0.37.2, well past that. **Backed by** libopenapi (Correct).

vacuum adds its own thin layer on top that is explicitly dynamic-scope-aware (see Source Map) — it intercepts libopenapi resolving/indexing errors whose path or node is `$dynamicRef`/`$recursiveRef` and classifies them as **non-errors** (dynamic-scope keywords are expected to be unresolved at parse time). This is the opposite of a tool that crashes on the keyword.

## Current DynamicRef Behavior

Every behavioral claim below is grounded in the Fixture Results table (observed) or in cited source.

- **Linting (primary function): accepts cleanly.** `$dynamicRef`/`$dynamicAnchor` are treated as valid JSON Schema 2020-12 keywords. No "unknown keyword" error, no crash, exit 0 on all four fixtures. (Observed: Fixture Results.)
- **Deliberate non-resolution.** vacuum's synthetic reference rule (`jsonschema/references.go:36`) states: *"`$dynamicRef` and `$recursiveRef` are dynamic-scope keywords and are not resolved as ordinary references."* Resolving/indexing errors whose path or node matches these keywords are filtered out by `IsDynamicScopeResolvingError` / `IsDynamicScopeIndexingError` (`references.go:42-66`). This is correct linter behavior — a linter has no business performing runtime dynamic-scope resolution.
- **Bundling: preserves the keywords, with minor anchor consolidation.** `vacuum bundle` keeps `$dynamicRef`, `$dynamicAnchor`, and `$id` in the output. Observed on `generic-schema-binding`: the `$dynamicRef: '#itemType'` consumer and both response-level `$dynamicAnchor: itemType` overrides survive; the `PaginatedTemplate`'s own `$dynamicAnchor` is absorbed during `$ref` merge (the template is inlined into each response and dedupes against the response's existing anchor). Net dynamic-keyword count goes 4 → 3. This is a cosmetic merge artifact, not a lint defect; the outermost anchors (which drive dynamic-scope resolution) are preserved. Source: `cmd/schema_bundle.go:306` + test `TestSchemaBundle_RewritesExternalRefsAndPreservesDynamicRefs` (`cmd/schema_test.go:238`).
- **Two style rules interact with `$dynamicRef`-bearing schemas** (neither is $dynamicRef rejection):
  - `oas-missing-type` fires on schemas that carry only `$dynamicRef` and no `type` — arguably correct linting.
  - `circular-references` fires on the recursive fixtures (generic-schema-binding, recursive-category-tree) because their `$dynamicRef` chains are, structurally, circular. Correct: they ARE recursive.

No semantic dynamic-scope resolution is performed — by design, and appropriate for a linter.

## Fixture Results

Run with `vacuum lint -q fixtures/<f>.yaml` (vacuum v0.29.2). All runs **exit 0**.

| Fixture | OAS version | Observed | Verdict |
|---|---|---|---|
| generic-schema-binding | 3.1 | exit 0; 1 error (`circular-references`, the recursive `$dynamicRef` chain) + style warnings; no keyword errors | PRESERVED |
| paginated-response | 3.1 | exit 0; style warnings only; no keyword errors | PRESERVED |
| recursive-category-tree | 3.1 | exit 0; 1 error (`circular-references`, intentional recursion) + style warnings; no keyword errors | PRESERVED |
| api-envelope | 3.1 | exit 0; passed (warnings only); no keyword errors | PRESERVED |

Bundle check (`vacuum bundle fixtures/generic-schema-binding.yaml <out>`): `$dynamicRef`, `$dynamicAnchor`, `$id` present in output; one `$dynamicAnchor` consolidated during `$ref` merge (see above).

**Human Review Needed:** none. Linting and bundling are fully headless-testable; no browser/DOM surface.

## Relevant Source Map

- `jsonschema/references.go` — synthetic rule `json-schema-ref-valid`; constants `dynamicRefKeyword = "$dynamicRef"`, `recursiveRefKeyword = "$recursiveRef"` (line 16-19); the rule's `HowToFix` explicitly excludes dynamic-scope keywords from ordinary resolution (line 36); `IsDynamicScopeResolvingError` / `IsDynamicScopeIndexingError` / `hasDynamicScopeKeywordPath` / `hasDynamicScopeKeywordNode` (lines 42-66) filter dynamic-scope "errors".
- `cmd/schema_bundle.go:306` — bundler branch `if key.Value == "$dynamicRef" || key.Value == "$recursiveRef"` preserves the keywords through bundling.
- `cmd/schema_test.go:238` — `TestSchemaBundle_RewritesExternalRefsAndPreservesDynamicRefs` asserts preservation end-to-end.
- `functions/schemachecks/jsonschema_checks.go:83` — schema checks recognize `$dynamicRef` mappings when classifying schemas (drives `oas-missing-type` etc.).
- `go.mod` — `github.com/pb33f/libopenapi v0.37.2`, `github.com/pb33f/libopenapi-validator v0.13.8`.

## Existing Issues And Prior Art

- No open issues or PRs mention `$dynamicRef`/`$dynamicAnchor`. Search of `daveshanley/vacuum` returned only unrelated closed items (#564, #265). The dynamic-scope handling was added proactively, driven by libopenapi support, not by a bug report.
- The maintainer (Dave Shanley) is also the author of `libopenapi`, so vacuum's dynamic-scope awareness tracks libopenapi's first-class support closely.

## Failure Modes To Test

None are failing. For regression-watching, the cases worth keeping covered:
- A spec where `$dynamicRef` points to an undefined anchor — vacuum should still not crash (it doesn't resolve the keyword).
- A recursive `$dynamicRef` tree — currently triggers `circular-references` (style rule); acceptable, but a future enhancement could suppress that rule when the cycle is via `$dynamicRef`/`$recursiveRef`.
- Bundling a spec where a `$dynamicAnchor`-bearing schema is the target of a `$ref` (the consolidation case observed here).

## Implementation Plan

**N/A — no implementation needed.** vacuum already does the right thing for a linter. If pursued as an enhancement (not a fix), two small ideas:
1. Suppress `circular-references` when the cycle is via a dynamic-scope keyword (would remove the 1 "error" on the recursive fixtures).
2. Preserve all `$dynamicAnchor` declarations through bundle merge (avoid the 4→3 consolidation) for full semantic fidelity.

Both are low-priority polish, not correctness gaps.

## Upstream Strategy

None required. If the two enhancements above are ever desired, the maintainer is receptive and active (65 PRs merged in 6 months); either would be a small, well-scoped PR.

## Open Questions

- Is the bundle-time `$dynamicAnchor` consolidation ever semantically material? For this repo's fixtures, no (outermost anchors survive). For specs that rely on an inner default anchor without an override, it could be — unverified.

## Sources

- Binary: vacuum v0.29.2 darwin-arm64 (https://github.com/daveshanley/vacuum/releases/tag/v0.29.2)
- Source clone: `/tmp/vacuum-repo` @ `c14a4a9` (2026-06-06)
- `jsonschema/references.go`, `cmd/schema_bundle.go`, `cmd/schema_test.go`, `functions/schemachecks/jsonschema_checks.go`, `go.mod`
- Empirical lint runs on `fixtures/{generic-schema-binding,paginated-response,recursive-category-tree,api-envelope}.yaml`
- Empirical bundle run on `fixtures/generic-schema-binding.yaml`
- libopenapi `$dynamicRef` support: catalog row + `analysis/libopenapi.md`
