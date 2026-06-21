# swagger-axios-codegen

## Summary

`Manweill/swagger-axios-codegen` is a small TypeScript axios-client generator. It fetches/loads an OpenAPI document and emits axios method wrappers. It has **no `$dynamicRef`/`$dynamicAnchor` support**: zero references in source. It uses no JSON-Schema-2020-12-aware parser — it loads the spec into its own `ISwaggerSource` shape and generates axios calls; schemas with `$dynamicRef` are simply ignored (the generator emits request/response methods, not type resolution). Small project, modest adoption, zero issue demand.

**Empirical run skipped** (generator; the source is conclusive — zero keyword handling, and the tool emits axios methods, not resolved types).

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/Manweill/swagger-axios-codegen |
| Source commit | `03c90fe` (2026-03-16) |
| `$dynamicRef` Status | **No support** |
| Priority | Low |
| Blocked by | — |
| Backed by | — |

## Maintenance And Landing Likelihood

| Indicator | Value |
|---|---|
| Most recent commit | 2026-03-16 (`03c90fe`) |
| Maintainer | `Manweill` |
| Activity level | Low–moderate |
| Issue tracker demand | 0 issues mention `$dynamicRef`/`$dynamicAnchor` |

Landing likelihood for a well-scoped PR: **Low.** Niche generator, no user demand, and the generated artifact (axios methods) doesn't carry schema-type fidelity anyway.

## Current DynamicRef Behavior

- **No handling.** `grep` of `src/` for `dynamicRef`/`$dynamic`/`$anchor` returns zero hits.
- The generator loads the spec into `ISwaggerSource` and walks operations to emit axios request methods; it does not perform schema resolution. A `$dynamicRef` in a request/response body schema has no effect on the generated code (response types are typically `Promise<any>` or `Promise<axios.Response>`).
- **No semantic dynamic-scope resolution.**

## Fixture Results

Not run (generator; source-conclusive). Verdict:

| Fixture | OAS | Observed | Verdict |
|---|---|---|---|
| generic-schema-binding | 3.1 | `$dynamicRef` ignored; generated axios methods carry no type fidelity for the slot | IGNORED (untyped output regardless) |

## Recommendation

**Skip.** Out of scope for meaningful `$dynamicRef` work — the generator doesn't emit typed schemas to begin with.

## Sources

- Source clone: `/tmp/swagger-axios-codegen` @ `03c90fe` (2026-03-16)
- `src/index.ts` (ISwaggerSource loading, axios method generation)
