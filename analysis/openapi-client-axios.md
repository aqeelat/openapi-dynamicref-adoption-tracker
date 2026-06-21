# openapi-client-axios

## Summary

`openapi-client-axios` (now at **`openapistack/openapi-client-axios`**, moved from `anttiviljami/openapi-client-axios`) is a runtime axios client builder: it loads an OpenAPI document at runtime and builds callable axios methods for each operation. It has **no `$dynamicRef`/`$dynamicAnchor` support**: zero references in source, and it dereferences schemas via `json-schema-deref-sync` (which inlines ordinary `$ref` only). A `$dynamicRef` is left as an opaque property and never resolved; since the client builds methods (not type-checked schemas), the keyword has no runtime effect. No issue demand.

**Empirical run skipped** (runtime client, not a CLI generator; the source + dependency analysis is conclusive).

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/openapistack/openapi-client-axios (moved from `anttiviljami/…`) |
| Source commit | `a321709` (2026-05-17) |
| Deref dep | `json-schema-deref-sync` ^0.14.0 (handles `$ref` only) |
| `$dynamicRef` Status | **No support** |
| Priority | Low |
| Blocked by | — |
| Backed by | — |

## Maintenance And Landing Likelihood

| Indicator | Value |
|---|---|
| Most recent commit | 2026-05-17 (`a321709`) |
| Maintainer | openapistack collective (`anttiviljami` historically) |
| Activity level | Active |
| Issue tracker demand | 0 issues mention `$dynamicRef`/`$dynamicAnchor` |

Landing likelihood: **Low.** Runtime client; schema-fidelity / `$dynamicRef` resolution isn't its purpose. A PR adding semantic resolution would be scope creep with no demand.

## Dependency Chain

```
openapi-client-axios
  → json-schema-deref-sync 0.14.x   (dereferences $ref only; $dynamicRef ignored)
  → openapi-types 12.x              (TypeScript types only)
  → axios                            (HTTP)
```

- `json-schema-deref-sync` inlines `$ref`s; it has no `$dynamicRef`/`$dynamicAnchor` handling, so those keywords are passed through as opaque and dropped from any dereferenced output.
- Not blocked by an external tool — the gap is consistent with the client's purpose (runtime method builder, not a validator).

## Current DynamicRef Behavior

- **No handling.** Source grep for `dynamicRef`/`$dynamic` returns zero hits.
- **Opaque passthrough + deref drop.** The spec is loaded; `$dynamicRef` survives the initial load as an unknown property but is then absent from dereferenced schemas used to build method arguments.
- **No runtime effect** — the client generates axios methods keyed on paths/methods, not on response schema resolution.
- **No semantic dynamic-scope resolution.**

## Fixture Results

Not run (runtime client; source/dependency-conclusive). Verdict:

| Fixture | OAS | Observed | Verdict |
|---|---|---|---|
| generic-schema-binding | 3.1 | `$dynamicRef` ignored by `json-schema-deref-sync`; methods built without schema resolution | IGNORED |

## Recommendation

**Skip.** A runtime axios method-builder doesn't need `$dynamicRef` resolution; the row can stay Low/No support.

## Open Questions

- Should the catalog URL be corrected to `openapistack/openapi-client-axios`? Yes — the `anttiviljami/…` URL redirects; the canonical org is `openapistack`.

## Sources

- Source clone: `/tmp/openapi-client-axios` @ `a321709` (2026-05-17)
- `package.json` (deps: `json-schema-deref-sync`, `openapi-types`); repo URL → `openapistack/openapi-client-axios`
