# rswag

## Summary

`rswag` (`rswag/rswag`) is a Ruby/Rails OpenAPI producer driven by RSpec integration tests → OpenAPI 3.0. No `$dynamicRef`/`$dynamicAnchor` support — zero hits in source; the spec is generated from RSpec request examples, not a type model that could express dynamic-reference templates. The formatter accepts OpenAPI 3.x versions (`openapi_formatter.rb`). 0 issues. Architecturally incompatible (example-driven, no generic-type concept).

**Empirical run skipped** (producer; non-runnable).

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/rswag/rswag |
| Source commit | `0a5a049` (2025-11-25) |
| OpenAPI version | 3.0 (`test-app/openapi/v1/openapi.json`) |
| `$dynamicRef` Status | **No support** |
| Priority | Low |

## Current Behavior

- `grep` for `dynamicRef`/`$dynamic` = zero hits.
- RSpec-driven: schemas are recorded from request/response examples, not authored as templates. No path to emit `$dynamicRef`.

## Recommendation

**Skip.** Example-driven producer; no dynamic-ref concept.

## Sources

- Source clone: `/tmp/rswag` @ `0a5a049`; `rswag-specs/lib/rswag/specs/openapi_formatter.rb:26`, `test-app/openapi/v1/openapi.json`
