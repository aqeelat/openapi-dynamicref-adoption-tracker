# Connexion

## Summary

Connexion (`spec-first/connexion`) is an OpenAPI-first Python framework — it consumes an OpenAPI spec to route requests **and validate** request/response bodies against the spec's schemas. It has **no `$dynamicRef`/`$dynamicAnchor` support**, and the reason is specific: its JSON body validator pins **`jsonschema.Draft4Validator`** (`connexion/validators/json.py:5-6`, `parameter.py:5`). `$dynamicRef` is a JSON-Schema-2020-12 feature; draft-4 predates it by several generations, so the keyword is dropped during validation. Notably, Connexion's `jsonschema` dependency (`>=4.17.3`) **does** support 2020-12 (`Draft202012Validator`) — so the fix path is concrete: switch the validators to the draft matching the document version (Draft202012Validator for OAS 3.1). Zero issue demand.

**Empirical run skipped** (framework; would require standing up a Connexion app + a `$dynamicRef` spec + issuing requests — multi-step; the validator-class evidence is conclusive).

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/spec-first/connexion |
| Source commit | `a23d44e` (2026-04-25) |
| Validation dep | `jsonschema >= 4.17.3` (supports 2020-12) |
| Validator class used | **`jsonschema.Draft4Validator`** (draft-4 — does not know `$dynamicRef`) |
| `$dynamicRef` Status | **No support** (wrong draft) |
| Priority | Low |
| Blocked by | — (fix is internal: switch validator class) |
| Backed by | — |

## Current Behavior

- `connexion/validators/json.py:5-6` — `import jsonschema; from jsonschema import Draft4Validator, ValidationError`. The JSON body validator constructs a `Draft4Validator`, which silently ignores `$dynamicRef`/`$dynamicAnchor` (unknown keywords in draft-4).
- `connexion/validators/parameter.py:5` — same for parameters.
- Net: an OAS 3.1 spec with `$dynamicRef` is not validated against the dynamic-scope keyword; a `$dynamicRef`-only schema is treated as an empty constraint (everything passes).
- **No semantic dynamic-scope resolution.**

## Implementation Plan (the concrete fix path)

Connexion already depends on a 2020-12-capable `jsonschema`. The minimal change:
1. Select the validator class by document OpenAPI version: `Draft202012Validator` for OAS 3.1+, `Draft4Validator` for 3.0 (unchanged).
2. Construct the chosen validator in `connexion/validators/json.py` and `parameter.py`.
3. Tests: validate a request body against a `$dynamicRef` schema and assert dynamic-scope resolution (inherit `python-jsonschema`'s Partial behavior, which handles most cases).

This is small and self-contained. With it, Connexion would inherit `python-jsonschema`'s Partial `$dynamicRef` support for OAS 3.1 docs.

## Recommendation

**Later** — open an issue noting the draft-4 vs 2020-12 mismatch and the trivial fix; it's a clean, scoped first contribution. (Not queued yet — verify Connexion's OAS-3.1 document support status first; if Connexion doesn't fully support 3.1 specs at all, the validator bump is downstream of that.)

## Sources

- Source clone: `/tmp/connexion` @ `a23d44e`; `connexion/validators/json.py:5-6`, `connexion/validators/parameter.py:5`, `pyproject.toml` (`jsonschema>=4.17.3`)
