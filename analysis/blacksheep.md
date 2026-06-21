# BlackSheep

## Summary

`BlackSheep` (`Neoteroi/BlackSheep`) is a Python ASGI framework with a built-in OpenAPI producer (`blacksheep/server/openapi/`). It targets **OpenAPI 3.0** and has **no `$dynamicRef`/`$dynamicAnchor` support** — zero hits in source. Schemas are reflected from dataclasses/Pydantic models (concrete types); no dynamic-reference concept. 0 issues. Same architectural profile as the other reflection-based Python producers.

**Empirical run skipped** (producer; non-runnable).

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/Neoteroi/BlackSheep |
| Source commit | `b5d548b` (2026-06-04) |
| OpenAPI version | 3.0 |
| `$dynamicRef` Status | **No support** |
| Priority | Low |

## Current Behavior

- `grep` of `blacksheep/server/openapi/` for `dynamicRef`/`$dynamic` = zero hits.
- Reflection-based over concrete Python types; no generics/templates → no `$dynamicRef` emission.

## Recommendation

**Skip.** Architecturally incompatible; 3.0-targeted.

## Sources

- Source clone: `/tmp/BlackSheep` @ `b5d548b`; `blacksheep/server/openapi/`
