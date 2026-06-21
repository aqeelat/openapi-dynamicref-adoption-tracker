# jsonschema-rs

## Summary

jsonschema-rs is a high-performance Rust JSON Schema validator that **correctly implements** `$dynamicRef` and `$dynamicAnchor` per JSON Schema 2020-12. It is one of the most mature `$dynamicRef` implementations across any language, alongside Hyperjump (JS) and networknt (Java). The validator passes the full JSON Schema Test Suite for draft2020-12 with zero xfails. The implementation includes dynamic scope tracking, dynamic anchor resolution (outermost-match semantics), `$dynamicRef` handling in `unevaluatedProperties`/`unevaluatedItems`, and spec-compliant evaluation path output. Provides Python and Ruby bindings. No fix needed.

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/Stranger6667/jsonschema-rs |
| Crate | `jsonschema` v0.46.5 (also `referencing` v0.46.5) |
| Commit analyzed | `bd435f5` (2026-06-14) |
| `$dynamicRef` Status | **Correct** |
| Blocked by | — |
| Backed by | — |

## Maintenance And Landing Likelihood

| Indicator | Value |
|---|---|
| Most recent meaningful commit | 2026-06-14 |
| Latest release | v0.46.5 (2026-05-13) |
| Open issues | 5 |
| Open PRs | 5 |
| GitHub stars | 787 |
| Maintainer | Dmitry Dygalo (`Stranger6667`) — also maintainer of python-jsonschema and Schemathesis |
| External PRs merged recently | Yes (active dependency-update and feature PRs) |
| Activity level | **Active** — multiple releases per month |

Landing likelihood for a well-scoped PR: **N/A** — no PR needed; `$dynamicRef` is already correctly implemented.

## Dependency Chain

jsonschema-rs has **no upstream dependencies** for `$dynamicRef` resolution. The implementation is self-contained in Rust across two crates:

- **`jsonschema`** (v0.46.5): The validator crate. Compiles `$dynamicRef` keyword via `compile_dynamic_ref()` in `keywords/ref_.rs:295`. Tracks dynamic scope in `compiler::Context` (`compiler.rs:96`). Handles `$dynamicRef` in `unevaluatedProperties` (`keywords/unevaluated_properties.rs:51`) and `unevaluatedItems` (`keywords/unevaluated_items.rs:38`).
- **`referencing`** (v0.46.5): The reference resolution library. Implements `Anchor::Dynamic` variant (`anchor.rs:21`) with full dynamic scope resolution (`anchor.rs:46-64`). The `Resolver` tracks the dynamic scope chain (`resolver.rs:180`) and `Anchor::Dynamic::resolve()` walks the entire scope to find the outermost matching dynamic anchor.

Dependencies from `Cargo.toml`: `fluent-uri` (URI parsing), `serde_json`, `ahash`, `hashbrown`, `percent-encoding`. None of these affect `$dynamicRef` semantics.

The library does **not** wrap AJV, python-jsonschema, or any other validator. The dynamic scope implementation is original Rust code.

## Current DynamicRef Behavior

**Status: Correct.** jsonschema-rs fully implements `$dynamicRef` / `$dynamicAnchor` per JSON Schema 2020-12:

### Keyword recognition
- `$dynamicAnchor` is parsed and stored as `Anchor::Dynamic` in the registry index (`registry/index.rs:92`).
- `$dynamicRef` is recognized as `BuiltinKeyword::DynamicRef` (`keywords/mod.rs:100`) and compiled via `compile_dynamic_ref` (`keywords/mod.rs:531`).
- Both keywords are recognized only for Draft 2020-12 and Unknown drafts (`keywords/mod.rs:531`).

### Dynamic scope resolution
- `Anchor::Dynamic::resolve()` (`anchor.rs:46-64`) iterates over all URIs in the dynamic scope (innermost to outermost), updating the target each time it finds a matching `$dynamicAnchor`. The final target is the **outermost** matching dynamic anchor — correct per spec section 7.3.2.
- Dynamic scope is tracked in `Resolver::scopes` (`resolver.rs:16`) and evolved via `push_front` on each resource boundary crossing (`resolver.rs:191`).
- The compiler's `Context` carries `dynamic_scope` (`compiler.rs:96`) and includes it in cache keys (`LocationCacheKey`, `AliasCacheKey`) to ensure schemas compiled under different dynamic scopes are distinct.

### Validator integration
- `$dynamicRef` validators are compiled identically to `$ref` validators via `compile_reference_validator` (`ref_.rs:148`), but the keyword string `"$dynamicRef"` is used for evaluation path tracking.
- `unevaluatedProperties` and `unevaluatedItems` explicitly track and invoke `$dynamicRef` validators (`unevaluated_properties.rs:51-103`, `unevaluated_items.rs:38-110`).
- Evaluation paths include `$dynamicRef` traversal while `schema_path` (canonical location) excludes it — correct per JSON Schema 2020-12 Core Section 12.4.2 (`ref_.rs:70-74`).

### Test suite
- Passes the full JSON Schema Test Suite for draft2020-12 with **zero xfails** (only two draft4 bignum tests are xfailed — unrelated).
- Has dedicated unit tests for `$dynamicRef` evaluation paths (`ref_.rs:1159-1187`, `paths.rs:889-913`).
- Has dedicated unit tests in the referencing crate for dynamic anchor lookup including multi-resource scope walks (`anchor.rs:172-268`).

### Known limitation
- The `bundle()` function does **not** follow `$dynamicRef` during bundling (`lib.rs:1092`). This affects only the bundler feature, not the validator. Bundled output preserves `$ref` targets but `$dynamicRef` targets are not embedded.

### Legacy support
- Also implements `$recursiveRef` / `$recursiveAnchor` for Draft 2019-09 (`resolver.rs:118`, `ref_.rs:313`).

## Relevant Source Map

### jsonschema-referencing crate

| File | Role |
|---|---|
| `src/anchor.rs:46-64` | `Anchor::Dynamic::resolve()` — walks dynamic scope for outermost match |
| `src/anchor.rs:91-120` | `anchor()` — extracts `$dynamicAnchor` from schema objects |
| `src/resolver.rs:68-98` | `Resolver::lookup()` — resolves references including anchor fragments |
| `src/resolver.rs:107-149` | `Resolver::lookup_recursive_ref()` — Draft 2019-09 recursive ref |
| `src/resolver.rs:180-182` | `Resolver::dynamic_scope()` — returns the scope chain |
| `src/resolver.rs:184-199` | `Resolver::evolve()` — adds resources to dynamic scope on boundary crossing |
| `src/registry/index.rs:88-106` | Anchor indexing — stores both Default and Dynamic anchors |
| `src/registry/mod.rs:384-403` | `Registry::anchor()` — looks up anchor by URI and name |
| `src/draft.rs:239` | Draft 2020-12 keyword set includes `$dynamicAnchor`/`$dynamicRef` |
| `src/spec/mod.rs:28-42` | `$dynamicAnchor` recognition logic per draft |

### jsonschema validator crate

| File | Role |
|---|---|
| `src/keywords/mod.rs:100` | `BuiltinKeyword::DynamicRef` enum variant |
| `src/keywords/mod.rs:531-532` | Draft 2020-12 `$dynamicRef` keyword → `compile_dynamic_ref` dispatch |
| `src/keywords/ref_.rs:294-301` | `compile_dynamic_ref()` — entry point for `$dynamicRef` compilation |
| `src/keywords/ref_.rs:148-214` | `compile_reference_validator()` — shared `$ref`/`$dynamicRef` resolution |
| `src/compiler.rs:96,128` | `dynamic_scope` in `LocationCacheKey` and `AliasCacheKey` |
| `src/compiler.rs:259-261` | `Context::lookup()` — delegates to `Resolver::lookup()` |
| `src/keywords/unevaluated_properties.rs:51-103` | `$dynamicRef` handling in `unevaluatedProperties` |
| `src/keywords/unevaluated_items.rs:38-110` | `$dynamicRef` handling in `unevaluatedItems` |
| `src/paths.rs:889-913` | Evaluation path tracking through `$dynamicRef` |

## Existing Issues And Prior Art

| Issue | Title | State | Relevance |
|---|---|---|---|
| [#195](https://github.com/Stranger6667/jsonschema/issues/195) | Draft 2020-12 | Closed | Tracking issue for 2020-12 implementation. `$dynamicRef`/`$dynamicAnchor` items all checked off. |
| [#1125](https://github.com/Stranger6667/jsonschema/issues/1125) | Memory leak with recursive `$dynamicRef` | Closed | Fixed in v0.46.3 — memory not reclaimed when validator for schema with recursive `$dynamicRef` is dropped. |
| [#287](https://github.com/Stranger6667/jsonschema/issues/287) | `$dynamicRef` in `unevaluatedItems` | Closed | Added support for `$ref`/`$recursiveRef`/`$dynamicRef` in `unevaluatedItems`. |
| [#44](https://github.com/Stranger6667/jsonschema/issues/44) | Implement Draft 2019-09 | Closed | Added `$recursiveRef`/`$recursiveAnchor` support. |

No open issues or PRs related to `$dynamicRef` correctness. No reverted fixes. No forks with alternative implementations needed.

## Failure Modes To Test

Since the validator is already **Correct**, these are verification tests, not regression tests:

1. **Generic pagination binding** (`generic-schema-binding.yaml`): Validate a valid user page — should pass. Validate an invalid item type — should fail with correct error.
2. **Paginated response** (`paginated-response.yaml`): Same as above with inline route-level binding.
3. **API envelope** (`api-envelope.yaml`): Two-level nested `$dynamicRef` — should correctly resolve inner and outer bindings.
4. **Recursive category tree** (`recursive-category-tree.yaml`): Children should validate against the active category type, not the base.
5. **Multi-parameter generic** (`nested-workspace-resources.yaml`): Two `$dynamicAnchor` slots bound together — should resolve correctly.
6. **Non-identifier schema keys** (`non-identifier-schema-key.yaml`): Schema keys with hyphens should not affect `$dynamicRef` resolution.
7. **allOf generic binding** (`allOf-generic-binding.yaml`): Concrete binding via `allOf` sibling should override the template slot.

## Test Plan

jsonschema-rs is a validator, not a renderer or SDK generator. The test plan focuses on runtime validation behavior:

### Fixtures to use first
1. `generic-schema-binding.yaml` — core generic binding pattern
2. `recursive-category-tree.yaml` — recursive dynamic override
3. `paginated-response.yaml` — inline route-level binding
4. `api-envelope.yaml` — nested `$dynamicRef`

### Baseline fixture
`baseline-duplicated-pagination.yaml` should validate identically regardless of `$dynamicRef` support — it uses explicit concrete schemas.

### Assertions
For each fixture, extract the JSON Schema components and validate known-valid and known-invalid instances:
- **Valid instances** must pass (no errors).
- **Invalid instances** (wrong item type, missing required field) must fail with correct error pointing to the dynamically resolved schema.
- **Error paths** must include the `$dynamicRef` traversal in the evaluation path.

### Automation
All assertions can be automated via Rust unit tests or the Python bindings (`jsonschema_rs.validate(instance, schema)`). No human review needed for validator behavior.

### Upstream test framework
Rust `#[test]` with `serde_json::json!` macros. The JSON Schema Test Suite runner (`tests/suite.rs`) is the canonical integration test.

## Implementation Plan

**No implementation needed.** jsonschema-rs already correctly implements `$dynamicRef` and `$dynamicAnchor`. The implementation was completed as part of the Draft 2020-12 support tracked in issue [#195](https://github.com/Stranger6667/jsonschema/issues/195).

The only known gap is the **bundler** (`bundle()` function), which does not follow `$dynamicRef` during bundling. This is documented as a limitation (`lib.rs:1092`) and is not a validator correctness issue.

## Upstream Strategy

No upstream action required. The tool is already correct.

If the bundler limitation were to be addressed in the future, the work would involve:
- Following `$dynamicRef` targets during bundling to embed them in the output document
- Preserving `$dynamicAnchor`/`$dynamicRef` keywords in the bundled output
- Ensuring bundled output validates identically to unbundled (the Hyperjump bundler is the reference implementation)

This would be a low-priority enhancement, not a correctness fix.

## Open Questions

- The `bundle()` limitation means tools that use jsonschema-rs for bundling (rather than validation) would not correctly handle `$dynamicRef`. Whether any downstream tool relies on jsonschema-rs for bundling OpenAPI specs is unknown.
- Python bindings (`jsonschema-py`) expose the validator but it's unclear how many Python users use it as a backend for `openapi-spec-validator` in practice.

## Sources

- Source code: `/tmp/jsonschema-rs/` (commit `bd435f5`, 2026-06-14)
- [CHANGELOG.md](https://github.com/Stranger6667/jsonschema-rs/blob/master/CHANGELOG.md) — v0.46.5
- [Issue #195](https://github.com/Stranger6667/jsonschema/issues/195) — Draft 2020-12 tracking
- [Issue #1125](https://github.com/Stranger6667/jsonschema/issues/1125) — Memory leak fix for recursive `$dynamicRef`
- [crates.io: jsonschema](https://crates.io/crates/jsonschema)
- [crates.io: referencing](https://crates.io/crates/referencing)
- JSON Schema Test Suite: `crates/jsonschema/tests/suite/` (git submodule)
