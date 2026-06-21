# paperclip

## Summary

`paperclip` (`paperclip-rs/paperclip`) is a Rust OpenAPI plugin for actix-web/axum. It supports OpenAPI v2 and v3 (via `openapiv3-paper` v2.0), gated behind the `v3` feature. No `$dynamicRef`/`$dynamicAnchor` support — zero hits in source; reflection-based over Rust types. 0 issues. Same architectural profile as the other Rust producers.

**Empirical run skipped** (producer; non-runnable).

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/paperclip-rs/paperclip |
| Source commit | `8d8f0c6` (2026-04-20) |
| OpenAPI versions | v2 (default) + v3 (feature `v3`, via `openapiv3-paper 2.0`) |
| `$dynamicRef` Status | **No support** |
| Priority | Low |

## Current Behavior

- `grep` of source for `dynamicRef`/`$dynamic` = zero hits.
- Plugin/reflection-based; no dynamic-ref emission path. v3 support exists but the model (`openapiv3-paper`) doesn't surface the keywords and paperclip doesn't author them.

## Recommendation

**Skip.** Architecturally incompatible.

## Sources

- Source clone: `/tmp/paperclip` @ `8d8f0c6`; `Cargo.toml:44` (`openapiv3-paper 2.0`), `src/v2/mod.rs`, `src/error.rs:28`
