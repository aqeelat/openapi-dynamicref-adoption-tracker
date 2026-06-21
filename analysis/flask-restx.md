# Flask-RESTX

## Summary

`Flask-RESTX` (`python-restx/flask-restx`, fork of Flask-RESTPlus) is a Flask extension that ships its own OpenAPI document model (the `flask_restx.swagger` module, inherited from flask-restplus). It targets **OpenAPI 3.0** and has **no `$dynamicRef`/`$dynamicAnchor` support** — zero hits in source; the model predates the 2020-12 keywords. Schemas come from Flask-RESTX `Api`/`Model`/`fields` definitions, which have no dynamic-reference concept. 0 issues.

**Empirical run skipped** (producer; non-runnable).

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/python-restx/flask-restx |
| Source commit | `30abd91` (2026-04-14) |
| OpenAPI version | 3.0 |
| `$dynamicRef` Status | **No support** |
| Priority | Low |

## Current Behavior

- `grep` of `flask_restx/` for `dynamicRef`/`$dynamic` = zero hits.
- Hand-rolled swagger model (forked); no 2020-12 reference keywords modeled. Schemas authored via `Model`/`fields.*` — concrete, no generics/templates.

## Recommendation

**Skip.** Architecturally incompatible; 3.0-targeted; unmotivated.

## Sources

- Source clone: `/tmp/flask-restx` @ `30abd91`; `flask_restx/swagger.py`
