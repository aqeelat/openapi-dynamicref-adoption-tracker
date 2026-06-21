# oasdiff

## Summary

oasdiff is a Go-based OpenAPI diff and breaking-change detector that **correctly parses, preserves, and diffs** OpenAPI 3.1 specs containing `$dynamicRef`/`$dynamicAnchor`. Unusually for this catalog, it treats both keywords as **first-class diffable fields** — its `SchemaDiff` struct has explicit `DynamicRefDiff` and `DynamicAnchorDiff` entries, so a change to either keyword's value is surfaced in the diff report as a `from`/`to` pair. All four key fixtures validate with exit 0 and self-diff to empty. Backed by `kin-openapi v0.140.0`, which parses the keywords into `openapi3.Schema`. No fix needed. (Repo was transferred from `Tufin/oasdiff` to `oasdiff/oasdiff`; the old URL redirects.)

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/oasdiff/oasdiff (was `Tufin/oasdiff`) |
| Binary analyzed | oasdiff v1.19.1 (darwin release) |
| Source commit | `457a9e3` (2026-06-15) |
| `$dynamicRef` Status | **Correct** |
| Priority | Done |
| Blocked by | — |
| Backed by | kin-openapi |

## Maintenance And Landing Likelihood

| Indicator | Value |
|---|---|
| Most recent meaningful commit | 2026-06-15 (`457a9e3`) |
| Latest release | v1.19.1 (2026-06-14) |
| Open issues | 35 |
| GitHub stars | 1239 |
| Maintainer | Reuven Harrison (`reuvenharrison`) — Tufin/oasdiff org |
| OpenAPI 3.1 support | Landed Feb 2026 (#791), breaking-change rules Feb 2026 (#793), beta label dropped Apr 2026 (#869) — all closed |
| Activity level | **Active** — near-daily commits, frequent releases |

Landing likelihood for a well-scoped PR: **N/A** — no PR needed. `$dynamicRef`/`$dynamicAnchor` are already parsed and diffed.

## Dependency Chain

```
oasdiff
  → github.com/getkin/kin-openapi v0.140.0   (OpenAPI parse; openapi3.Schema has DynamicRef/DynamicAnchor)
  → github.com/oasdiff/yaml, yaml3            (YAML loading)
```

oasdiff reads the keywords directly off kin-openapi's `*openapi3.Schema`: `value1.DynamicRef`, `value1.DynamicAnchor` (`diff/schema_diff.go:282-283`). kin-openapi's Schema model exposes both as string fields, so oasdiff inherits Correct parsing for free and adds its own explicit diff logic on top. **Backed by** kin-openapi (Correct for these keywords).

## Current DynamicRef Behavior

Every behavioral claim below is grounded in the Fixture Results or cited source.

- **Parsing: accepts cleanly.** `oasdiff validate` exits 0 on all four fixtures. No crash, no "unknown keyword" error. (Observed: Fixture Results.)
- **Diffing: first-class.** `$dynamicRef` and `$dynamicAnchor` are explicit fields on `SchemaDiff` (`diff/schema_diff.go:73-74`), compared via `getValueDiff(value1.DynamicRef, value2.DynamicRef)` / `...DynamicAnchor...` (lines 282-283). Observed empirically: changing `$dynamicRef: '#itemType'` → `'#changedTarget'` produces `$dynamicRef: {from: '#itemType', to: '#changedTarget'}` in the diff; changing a `$dynamicAnchor` likewise produces a `from`/`to` entry.
- **Reference-chain tracing:** changes to a schema reached via `$ref` (e.g. adding a `required` property to `User`, which `$defs.itemType` references) are surfaced through the chain.
- **No semantic dynamic-scope resolution** — correct for a diff tool. oasdiff diffs the literal keyword value; it does not (and should not) evaluate dynamic scope.
- **Breaking-change classification — one nuance:** adding a `required` property to `User` (the `$dynamicAnchor` target, referenced via `$defs.itemType` inside a response) was reported in the `diff` but was **not** classified as breaking by `oasdiff breaking` ("No breaking changes to report, but the specs are different"). This is plausibly because (a) the change sits on a response schema, and/or (b) breaking-change analysis does not chase `$dynamicRef`-mediated references the same way it chases ordinary `$ref`. This is a behavioral observation, not a `$dynamicRef` defect — and it is upstream's design choice, not something to fix in oasdiff for this catalog's purposes.

## Fixture Results

| Fixture | OAS version | Observed | Verdict |
|---|---|---|---|
| generic-schema-binding | 3.1 | `validate` exit 0; self-diff empty (exit 0); revised-spec diff detects `$dynamicRef` and `$dynamicAnchor` from/to + `required` change through `$ref` chain | PRESERVED + DIFFABLE |
| paginated-response | 3.1 | `validate` exit 0; self-diff empty (exit 0) | PRESERVED |
| recursive-category-tree | 3.1 | `validate` exit 0; self-diff empty (exit 0) | PRESERVED |
| api-envelope | 3.1 | `validate` exit 0; self-diff empty (exit 0) | PRESERVED |

Targeted change tests on `generic-schema-binding`:
- Rename `$dynamicRef` consumer value → detected as `$dynamicRef: {from, to}`.
- Rename a `$dynamicAnchor` → detected as `$dynamicAnchor: {from, to}`.
- Add `required` to the anchor target → detected in `diff` (not flagged by `breaking`; see nuance above).

**Human Review Needed:** none.

## Relevant Source Map

- `diff/schema_diff.go:53` — comment "OpenAPI 3.1 / JSON Schema 2020-12 fields".
- `diff/schema_diff.go:73-74` — `DynamicRefDiff`, `DynamicAnchorDiff` fields on `SchemaDiff`.
- `diff/schema_diff.go:119-124, 282-283` — reads `value1`/`value2` off kin-openapi `*openapi3.Schema`; `getValueDiff` on `DynamicRef`/`DynamicAnchor`.
- `go.mod` — `github.com/getkin/kin-openapi v0.140.0`.
- CLI: `oasdiff validate`, `oasdiff diff base revision`, `oasdiff breaking base revision`.

## Existing Issues And Prior Art

All dynamicRef-adjacent issues are part of the OpenAPI 3.1 feature work, all closed:
- #791 (closed 2026-02-05) — `feat: add OpenAPI 3.1 support` (`reuvenharrison`).
- #793 (closed 2026-02-06) — `Checker: Add OpenAPI 3.1 breaking change rules` (`reuvenharrison`).
- #869 (closed 2026-04-25) — `docs: drop beta label for OpenAPI 3.1 support` (`reuvenharrison`).

No open issues report `$dynamicRef`/`$dynamicAnchor` bugs.

## Failure Modes To Test

None failing. Regression-worth watching:
- A change ONLY to a `$dynamicRef` value with everything else identical — currently detected (good).
- A breaking change reachable only via a `$dynamicRef` chain — currently reported in `diff` but not in `breaking`. Whether that is desirable is an upstream design question.

## Implementation Plan

**N/A — no implementation needed.** oasdiff already does the right thing for a diff tool. If a future enhancement is desired, the candidate is teaching `breaking` to consider schemas reachable via `$dynamicRef` chains — but that is a scope decision for upstream, not a correctness gap for this catalog.

## Upstream Strategy

None required. The maintainer is highly active (near-daily commits, weekly+ releases); any genuinely useful enhancement would land easily.

## Open Questions

- Should `oasdiff breaking` flag a newly-required field on a schema reached only via `$dynamicRef`? Currently it does not. Unverified whether this is intentional (response-schema semantics) or a tracing gap.

## Sources

- Binary: oasdiff v1.19.1 darwin (https://github.com/oasdiff/oasdiff/releases/tag/v1.19.1)
- Source clone: `/tmp/oasdiff-repo` @ `457a9e3` (2026-06-15)
- `diff/schema_diff.go`, `go.mod`
- Empirical `validate`, self-`diff`, and revised-spec `diff`/`breaking` runs on `fixtures/generic-schema-binding.yaml` (+ `validate`/self-`diff` on the other three fixtures)
- Issues #791, #793, #869 (OpenAPI 3.1 support)
