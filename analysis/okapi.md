# okapi

## Summary

`okapi` (`GREsau/okapi`) is a Rust/Rocket OpenAPI producer driven by `schemars`. It targets **OpenAPI 3.0.0** (`openapi3.rs:41`). No `$dynamicRef`/`$dynamicAnchor` support — the only source hits are bundled Swagger-UI assets; `schemars` reflects concrete Rust types (generics monomorphized, no dynamic-ref templates). 0 issues. Same architectural profile as aide/utoipa but on an older 3.0 target.

**Empirical run skipped** (producer; non-runnable).

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/GREsau/okapi |
| Source commit | `e5146ea` (2025-06-19) |
| OpenAPI version | 3.0.0 |
| Schema source | `schemars 0.8` |
| `$dynamicRef` Status | **No support** |
| Priority | Low |

## Current Behavior

- `grep` of `okapi/src` for `dynamicRef`/`$dynamic` = zero hits (Swagger-UI bundle is the only match).
- 3.0 target + `schemars` reflection → no `$dynamicRef` concept. Generics materialize to concrete types.

## Recommendation

**Skip.** Architecturally incompatible + 3.0 target.

## Sources

- Source clone: `/tmp/okapi` @ `e5146ea`; `okapi/src/openapi3.rs:41`, `Cargo.toml` (`schemars 0.8`)
