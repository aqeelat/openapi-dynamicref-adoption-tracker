# APIFlask

## Summary

`APIFlask` (`apiflask/apiflask`) is a thin Flask wrapper that generates OpenAPI from `marshmallow` schemas via **`apispec`** (>=6.0). It targets **OpenAPI 3.0** (apispec's default output) and has **no `$dynamicRef`/`$dynamicAnchor` support** — zero hits in source. `marshmallow` serializes concrete Python types; `apispec` reflects them into a 3.0 schema document. Generics are not represented. 0 issues.

**Empirical run skipped** (producer; non-runnable).

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/apiflask/apiflask |
| Source commit | `c9a9b29` (2026-05-03) |
| OpenAPI version | 3.0 |
| Schema stack | `marshmallow` + `apispec` + `flask-marshmallow` |
| `$dynamicRef` Status | **No support** |
| Priority | Low |

## Current Behavior

- `grep` of `src/apiflask/` for `dynamicRef`/`$dynamic` = zero hits.
- `apispec` reflects `marshmallow` schemas into concrete 3.0 definitions; no dynamic-ref emission path.

## Recommendation

**Skip.** apispec/marshmallow reflection model + 3.0 target.

## Sources

- Source clone: `/tmp/apiflask` @ `c9a9b29`; `pyproject.toml` (apispec, marshmallow, flask-marshmallow)
