# aide

## Summary

`aide` (`tamasfe/aide`) is a Rust/Axum (and others) OpenAPI producer — compositional, targeting **OpenAPI 3.1.0** (`openapi.rs:109,118`). It has **no `$dynamicRef`/`$dynamicAnchor` support**: the only source hits are bundled Redoc/Swagger-UI JS assets, not aide's code. Schemas come from `schemars` reflection over concrete Rust types, so — like Pydantic/Litestar — generics are materialized to concrete types; there is no `$dynamicRef` emission path. Zero issue demand. Closest to relevant of the Rust producers (3.1 + schemars), but architecturally incompatible near-term for the same reason as Pydantic.

**Empirical run skipped** (producer; non-runnable per the fixtures-first gate).

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/tamasfe/aide |
| Source commit | `20b303c` (2026-04-14) |
| OpenAPI version | 3.1.0 (`openapi.rs:109,118`) |
| Schema source | `schemars` reflection over Rust types |
| `$dynamicRef` Status | **No support** |
| Priority | Low |
| Blocked by | — |
| Backed by | — |

## Current Behavior

- **No emission.** `grep` of `crates/aide/src` for `dynamicRef`/`$dynamic` returns zero hits (the only matches are bundled `res/redoc/redoc.standalone.js` and `res/swagger/swagger-ui-bundle.js` — the docs UI, unrelated to generation).
- **Concrete generics.** `schemars` reflects Rust types; Rust generics are monomorphized at instantiation, so aide emits concrete schemas per type, not `$dynamicAnchor`/`$dynamicRef` templates. Same architectural mismatch as Pydantic/utoipa/Huma.
- **3.1-targeted**, so the dialect is right; the gap is the reflection model.

## Recommendation

**Skip (near-term).** Architecturally incompatible like the other reflection-based producers. The Rust producer most worth re-visiting would be one that opts into a generic-template authoring model (none today).

## Sources

- Source clone: `/tmp/aide` @ `20b303c` (2026-04-14); `crates/aide/src/openapi/openapi.rs:109,118`
