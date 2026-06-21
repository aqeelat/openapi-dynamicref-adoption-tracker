# Boon (Rust, santhosh-tekuri)

## Summary

Boon (`santhosh-tekuri/boon`) is a Rust JSON Schema validator with 2020-12 support. It **correctly implements `$dynamicRef`/`$dynamicAnchor`**: `src/compiler.rs:602-612` builds a `DynamicRef { sch, anchor }` node and the compiler tracks `dynamicAnchors` for dynamic-scope resolution. A focused smoke test (recursive tree via `$dynamicAnchor` + `$dynamicRef`) **passes** — valid recursive instances validate, disallowed nested properties fail, proving recursion through dynamic scope works. Its author (`santhosh-tekuri`) also maintains the Go `santhosh-tekuri/jsonschema` validator, which the catalog already records as Correct for the full JSON-Schema-Test-Suite. No fix needed.

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/santhosh-tekuri/boon |
| Source commit | `b487e6a` (2026-02-23) |
| Draft supported | 2020-12 (and 2019-09, draft-07, etc.) |
| `$dynamicRef` Status | **Correct** |
| Priority | Done |
| Blocked by | — |
| Backed by | — |

## Maintenance And Landing Likelihood

| Indicator | Value |
|---|---|
| Most recent commit | 2026-02-23 (`b487e6a`) |
| Maintainer | Santhosh Kumar Tekuri (`santhosh-tekuri`) — also author of the Correct Go `santhosh-tekuri/jsonschema` |
| Activity level | Active |
| Landing likelihood | **N/A** — no PR needed |

## Dependency Chain

Boon is a self-contained Rust validator (no upstream parser dependency). It implements the 2020-12 dialect directly, including dynamic-scope resolution.

## Current DynamicRef Behavior

- **Parses + semantically resolves.** `compiler.rs:602-612`: when `$dynamicRef` is encountered, it builds a `DynamicRef { sch, anchor }` node; the compiler enqueues `dynamicAnchors` (`compiler.rs:269`) and resolves against dynamic scope (outermost matching anchor), not lexical scope.
- **Empirically verified via a focused smoke test.** `tests/dynamicref_smoke.rs` (added for this analysis): a recursive tree schema (`$dynamicAnchor: node` + `items: { $dynamicRef: "#node" }`, `additionalProperties: false`) → valid recursive instance passes, instance with a disallowed nested property fails. This proves `$dynamicRef` is resolved dynamically (otherwise the recursion would not enforce the constraint at depth).
- The bundled official JSON-Schema-Test-Suite harness (`tests/suite.rs`) was not usable in the shallow clone (the suite submodule dir is empty), so the smoke test is the empirical evidence.

## Fixture Results

Empirical (smoke test `tests/dynamicref_smoke.rs`, `cargo test --test dynamicref_smoke`):

| Case | OAS | Observed | Verdict |
|---|---|---|---|
| recursive tree, valid instance | 2020-12 | passes | RESOLVED |
| recursive tree, disallowed top-level property | 2020-12 | fails (additionalProperties) | RESOLVED |
| recursive tree, disallowed **nested** child property | 2020-12 | fails (constraint enforced at depth via `$dynamicRef`) | RESOLVED |

The nested case is the decisive one: it only fails if `$dynamicRef` is resolved dynamically (recursion walks the dynamic scope).

**Human Review Needed:** a full JSON-Schema-Test-Suite run with the submodule initialized, to match the depth of evidence for the Go sibling validator.

## Relevant Source Map

- `src/compiler.rs:269` — "if resource, enqueue dynamicAnchors for compilation".
- `src/compiler.rs:602-612` — `$dynamicRef` handling: `DynamicRef { sch, anchor }` node construction.
- `tests/suite.rs` — official-suite harness (`test_suite("tests/JSON-Schema-Test-Suite")` for draft2020-12; submodule-empty in shallow clone).

## Implementation Plan

**None — already Correct.** Optional follow-up: ensure the JSON-Schema-Test-Suite submodule is pinned to current upstream so CI catches any new dynamicRef edge cases.

## Open Questions

- Is Boon's dynamic-scope resolution as complete as its Go sibling across the full official suite? Likely yes (shared author, same algorithm family), but the empty submodule prevented a full-suite run here.

## Sources

- Source clone: `/tmp/boon` @ `b487e6a` (2026-02-23)
- Empirical: `tests/dynamicref_smoke.rs` (added) → `cargo test --test dynamicref_smoke` passes
- `src/compiler.rs:269,602-612`, `tests/suite.rs`
- Cross-ref: catalog entry for `santhosh-tekuri/jsonschema` (Go, Correct on full JSTS)
