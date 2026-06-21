# VaporToOpenAPI

## Summary

`VaporToOpenAPI` (`dankinsoid/VaporToOpenAPI`; repo moved from the catalog's earlier `dankinsoid/VaporOpenAPI` spelling) is a Swift/Vapor OpenAPI producer. It has **no `$dynamicRef`/`$dynamicAnchor` support** — zero hits in source. Schemas are reflected from Swift `Codable` types (concrete); generics are monomorphized, so there is no dynamic-ref emission path. Same architectural profile as the other reflection-based producers (aidé/okapi/utoipa). 0 issues.

**Empirical run skipped** (producer; non-runnable).

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/dankinsoid/VaporToOpenAPI (was `VaporOpenAPI`) |
| Source commit | `a555ef2` (2026-05-31) |
| `$dynamicRef` Status | **No support** |
| Priority | Low |

## Current Behavior

- `grep` of `Sources/VaporToOpenAPI/` for `dynamicRef`/`$dynamic` = zero hits (the only `openapi` references are the route-serving helpers like `Stoplight.swift`).
- Reflection-based over `Codable` Swift types → concrete schemas; no dynamic-ref templates.

## Recommendation

**Skip.** Architecturally incompatible.

## Sources

- Source clone: `/tmp/VaporToOpenAPI` @ `a555ef2`; `Sources/VaporToOpenAPI/`
