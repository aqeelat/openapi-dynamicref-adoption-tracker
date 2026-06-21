# Pydantic (`json_schema`)

## Summary

Pydantic (`pydantic/pydantic`) is the dominant Python data-validation library; its `TypeAdapter.json_schema()` / `BaseModel.model_json_schema()` produces **JSON Schema 2020-12** (`schema_dialect = 'https://json-schema.org/draft/2020-12/schema'`) and is the schema foundation under FastAPI. It has **no `$dynamicRef`/`$dynamicAnchor` support**: zero references to either keyword anywhere in source. The relevant plumbing *exists* — Pydantic emits `$ref` (via `DEFAULT_REF_TEMPLATE = '#/$defs/{model}'`) and `$defs` — but it resolves Python generics (`TypeVar`s) to **concrete types at schema-build time** (`_internal/_generics.replace_types`, `generic_origin`), so it produces a concrete schema per binding rather than a reusable `$dynamicAnchor`/`$dynamicRef` template. That is an architectural mismatch: `$dynamicRef` would require Pydantic to *preserve* generic type parameters through to schema emission, which it does not. No issue requests the feature. FastAPI inherits this (see `analysis/fastapi.md`).

**Empirical run skipped** (producer/library; non-runnable per the fixtures-first gate — `json_schema()` produces schemas from Python types, it does not consume fixture specs).

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/pydantic/pydantic |
| Source commit | latest (pushed 2026-06-15) |
| Output dialect | JSON Schema 2020-12 (`pydantic/json_schema.py:230,265`) |
| `$dynamicRef` Status | **No support** |
| Priority | Low (was High — reclassified: architecturally incompatible near-term, like FastAPI/tsoa) |
| Blocked by | — |
| Backed by | — |

## Maintenance And Landing Likelihood

| Indicator | Value |
|---|---|
| Most recent commit | 2026-06-15 |
| Open issues | 570 |
| GitHub stars | 28029 |
| Maintainer | Samuel Colvin (`samuelcolvin`) + Pydantic team (`dmontagu`, `Viicos`, …) |
| Activity level | **Very active** — daily commits |
| Issue tracker demand | 0 issues request `$dynamicRef`/`$dynamicAnchor` for `json_schema()` |

Landing likelihood for a well-scoped PR: **Low.** This is architectural, not a missing feature bolt-on. Pydantic's whole generic-handling pipeline (`_generics.py`, core-schema construction) collapses `TypeVar`s to concrete types before JSON Schema emission. Supporting `$dynamicRef` would mean carrying generic parameters through to a parameterized schema template — a deep change to Pydantic's type system with no current demand and broad downstream-compatibility risk. An issue/discussion would be the only realistic opener, and even then it's a long-term design question.

## Dependency Chain

```
pydantic.json_schema
  → pydantic._internal._generate_schema / _generics  (Python type → core schema; TypeVars collapsed to concrete)
  → emits JSON Schema 2020-12 with $ref + $defs (DEFAULT_REF_TEMPLATE)
```

- Pydantic emits the 2020-12 dialect and uses `$ref`/`$defs` — so the keyword *infrastructure* is present. The gap is the type-resolution model, not the schema writer.
- No upstream parser dependency (Pydantic is its own type→schema engine). Not blocked externally.

## Current DynamicRef Behavior

- **No emission.** `grep` of `pydantic/` for `dynamicRef`/`$dynamic`/`dynamicAnchor` returns zero hits. The JSON-schema writer (`pydantic/json_schema.py`) has no code path that emits either keyword.
- **Generics are concrete.** `_internal/_generate_schema.py` and `_generics.py` resolve `TypeVar`s (`replace_types`, `generic_origin`) at schema-build time — a `GenericModel[T]` with `T = User` produces a dedicated `User`-flavored schema with a unique `$defs` name, not a reusable template.
- **Recursion uses plain `$ref`.** Self-referential models emit `$ref: '#/$defs/Model'` (the standard 2020-12 pattern), not `$dynamicRef`.
- **Manual injection only.** A user can hand-author a `$dynamicRef`/`$dynamicAnchor` schema dict and pass it through, but Pydantic's own generation never produces one.

## Fixture Results

Not run (producer/library; non-runnable). Source-determined verdict:

| Fixture | OAS | Observed | Verdict |
|---|---|---|---|
| generic-schema-binding | 3.1 | No Pydantic model construct produces a `PaginatedTemplate<T>` template with `$dynamicAnchor`/`$dynamicRef`; generics always materialize to concrete schemas | N/A (architecturally incompatible) |

**Human Review Needed:** none.

## Relevant Source Map

- `pydantic/json_schema.py:230,265` — 2020-12 dialect declaration.
- `pydantic/json_schema.py:116` — `DEFAULT_REF_TEMPLATE = '#/$defs/{model}'` (the `$ref`/`$defs` emission).
- `pydantic/_internal/_generate_schema.py:838-856` — `generic_origin` handling; generics collapsed at schema-build.
- `pydantic/_internal/_generics.py` — `replace_types`, `get_standard_typevars_map` (concrete type substitution).
- No `dynamicRef`/`$dynamic`/`dynamicAnchor` references anywhere under `pydantic/`.

## Existing Issues And Prior Art

- **No issues** in the Pydantic tracker request `$dynamicRef`/`$dynamicAnchor` for `json_schema()`.
- FastAPI's analysis (`analysis/fastapi.md`) notes Pydantic is the upstream reason FastAPI doesn't emit `$dynamicRef` — consistent with the static-generic-resolution model here.

## Failure Modes To Test

- Author a recursive Pydantic model → confirm `$ref` (not `$dynamicRef`) is emitted for the self-reference.
- Author a `Generic[T]` model with two bindings → confirm two distinct concrete `$defs` entries (no shared template).

## Implementation Plan

Not a near-term target. The conceptual path (if ever pursued):

1. Detect generic *definitions* (a `Generic[T]` model referenced as a template) and emit a `$dynamicAnchor` on the template's `T` slot instead of substituting `T`.
2. At each *binding site* (`MyModel[int]`), emit the override `$dynamicAnchor` + `$ref` to the concrete type, and a `$dynamicRef` consumer in the template.
3. Gate behind an opt-in mode (e.g. `json_schema(generic_mode='dynamic')`) so the default concrete-resolution behavior is unchanged.

This is a **bounded, opt-in feature**, not an architectural impossibility. Pydantic retains `__pydantic_generic_metadata__` through to schema-build time (`_generate_schema.py:838`); the change is to PRESERVE generic parameters instead of resolving them when the opt-in is on. **Orval** proves the emission pattern (PR #3353); **Micronaut** proves the producer-side inverse (`analysis/micronaut-openapi.md`). No compatibility risk — opt-in flag, default unchanged. See [`analysis/orval-reference.md`](orval-reference.md) for the two-pattern architecture.

## Upstream Strategy

Open a discussion issue framing the `generic_mode='dynamic'` opt-in. Reference Orval #3353 + Micronaut's implementation as existence proofs. The Pydantic team is receptive to well-scoped opt-in features (see their OAS 3.1 / 2020-12 dialect support). Expected acceptance: **Medium** — the feature is well-scoped and opt-in, but Pydantic's core team may want to see ecosystem demand before committing.

## Open Questions

- Is there any Pydantic RFC for "parameterized"/"generic" schema emission? (Not found in the tracker.)

## Sources

- Source clone: `/tmp/pydantic` (latest, pushed 2026-06-15)
- `pydantic/json_schema.py` (lines 116, 230, 265), `pydantic/_internal/_generate_schema.py` (838-856), `pydantic/_internal/_generics.py`
- Empirical run skipped (producer/library, non-runnable per fixtures-first gate)
