# `$ref` Sibling Preservation — A First-Class Dimension

> **Why `$defs` siblings must be tracked explicitly, not buried under "Pattern B support."**

## The Problem

The tracker scores tools on `$dynamicRef` / `$dynamicAnchor` support across two patterns (Pattern A: recursive self-reference; Pattern B: generic template + binding). What it has **not** been tracking is a prerequisite capability that sits *below* the pattern level: **does the tool's parser preserve `$ref` sibling keywords at all?**

This matters because `$ref` sibling preservation is the load-bearing prerequisite for Pattern B. Without it, Pattern B is not "unsupported" — it is **unimplementable on that parser**, regardless of whether the generator's `$dynamicRef` resolution code is correct.

## Why `$defs` Siblings Are Load-Bearing for Pattern B

The generic-binding pattern (Pattern B) works as follows. A template schema declares a `$dynamicAnchor` + a `$dynamicRef` consumer:

```yaml
PaginatedTemplate:
  $defs:
    itemType:
      $dynamicAnchor: itemType
      not: {}                      # unbound slot
  properties:
    items:
      items:
        $dynamicRef: '#itemType'   # consumer
```

A concrete binding schema carries **its own `$defs`** that overrides the anchor:

```yaml
PaginatedUserResponse:
  $id: ...
  $defs:
    itemType:
      $dynamicAnchor: itemType      # override anchor
      $ref: '#/components/schemas/User'   # bind to concrete type
  $ref: '#/components/schemas/PaginatedTemplate'
```

**`PaginatedUserResponse.$defs` IS the binding mechanism.** It carries the override `$dynamicAnchor` + the concrete `$ref`. If the parser drops `$defs` when it sees the sibling `$ref: PaginatedTemplate`, the override anchor is gone — the generator never sees it — and `$dynamicRef: '#itemType'` resolves to the template's default (`not: {}` → effectively `any`), not to `User`.

**This is the entire binding mechanism.** Drop it and Pattern B is dead at the parser layer, no matter how good the generator's `$dynamicRef` resolution code is.

## The False-Positive Problem

A tool can have **perfect `$dynamicRef` resolution logic** and still fail Pattern B end-to-end because its parser dropped the binding data before the generator sees it. The tracker's scoring conflates "generator doesn't implement" with "parser makes it unimplementable." This produces misleading results:

- **Before this analysis:** kiota's analysis said "Microsoft.OpenApi correctly preserves the keyword data, so Kiota is not blocked — the fix belongs in Kiota's own code generation pipeline." (kiota.md, line 66.)
- **Reality:** Microsoft.OpenApi 3.7.0's `LoadSchema` short-circuits on `$ref` before processing sibling keywords. `$defs`, `$dynamicAnchor`, `$dynamicRef`, `$id`, `$anchor`, and every other JSON Schema 2020-12 keyword beside `$ref` is never parsed into the object model. The generator literally cannot access the binding data. Steps 1–6 of kiota's `$dynamicRef` implementation landed; step 7 (Pattern B) could not proceed — not because kiota's code is wrong, but because the parser **can't supply the data**.

This is the false positive: the generator is incorrectly scored as "not implementing" when the real cause is "parser makes it unimplementable."

## Case Study 1: Microsoft.OpenApi 3.7.0 (.NET)

**Issue:** [microsoft/OpenAPI.NET#2895](https://github.com/microsoft/OpenAPI.NET/issues/2895)
**Fix PR:** [microsoft/OpenAPI.NET#2896](https://github.com/microsoft/OpenAPI.NET/pull/2896) (`aqeelat`, open)

`OpenApiV31Deserializer.LoadSchema` short-circuits as soon as it sees `$ref`: it returns an `OpenApiSchemaReference` and never runs `ParseMap` over the remaining sibling keywords. The only sibling data captured is a hard-coded allow-list (`title`, `deprecated`, `readOnly`, `writeOnly`, `default`, `examples`, `extensions`). Every JSON Schema 2020-12 keyword (`$defs`, `$dynamicAnchor`, `$dynamicRef`, `$id`, `$anchor`, `$vocabulary`, `$comment`) is silently dropped.

**Affected tools:** kiota (Pattern B blocked at step 7; kiota tracking issue [#7815](https://github.com/microsoft/kiota/issues/7815)), Swashbuckle.AspNetCore (uses Microsoft.OpenApi 2.7.6, same code path), any .NET tool built on Microsoft.OpenApi.

## Case Study 2: swagger-core (Java)

**Issue:** swagger-parser #2331, PR #2332 — **verified insufficient** (see `analysis/swagger-parser.md`).

swagger-core collapses `$ref`-bearing schemas to reference-only: the Schema POJO for `PaginatedUserResponse` becomes `{$ref: "#/components/schemas/PaginatedTemplate"}` with all siblings (`$id`, `$defs`, override `$dynamicAnchor`) stripped. This is the OAS 3.0 `$ref`-replaces-object behavior, not lifted for 3.1.

PR #2332 adds `mergeSchemas` field-copying for `$dynamicRef`/`$dynamicAnchor` — but the copy is ineffective because `source.get$dynamicAnchor()` returns `null` by the time `mergeSchemas` runs (swagger-core already dropped the sibling at deserialization). Empirically verified: #2332 built and re-run on the 4 fixtures; override-anchor counts unchanged (generic 3→1, api-envelope 6→3).

**Affected tools:** swagger-parser (#2332 insufficient), Zally (uses swagger-parser 2.1.12), Micronaut (swagger-core 2.2.32 — annotation-bypass avoids this for authoring, but round-trip through swagger-parser would mangle), springdoc (swagger-core-jakarta).

## Spec Compliance

In OAS 3.1 / JSON Schema 2020-12, `$ref` is a **regular keyword** — it no longer replaces the object. Siblings are fully valid. A parser that drops siblings on 3.1 documents is **non-compliant**, not "missing a feature." This should factor into the tracker's compliance scoring: sibling-dropping parsers have a spec-conformance bug, not a feature gap.

(OAS 3.0 correctly requires `$ref` siblings to be ignored — so dropping them on the 3.0 path is spec-compliant. The bug is specific to the 3.1+ path where the restriction was removed.)

## The Sibling-Safe / Sibling-Unsafe Split

| Parser | Sibling-safe? | Ecosystem | Pattern B status |
|---|---|---|---|
| **Microsoft.OpenApi** (.NET) | ✗ (#2895/#2896) | kiota, Swashbuckle, ASP.NET | Blocked until #2896 |
| **swagger-core** (Java) | ✗ (collapses $ref schemas) | swagger-parser, Zally, Micronaut (round-trip) | Blocked; #2332 insufficient |
| **@apidevtools/swagger-parser** v12 (JS) | ✓ (opaque-preserve) | Hoppscotch, swagger-jsdoc, rtk-query | Pattern B possible |
| **libopenapi** (Go) | ✓ | vacuum | Pattern B possible |
| **kin-openapi** (Go) | ✓ | oasdiff, oapi-codegen | Pattern B possible |
| **OpenAPIKit** (Swift) | ✓ | swift-openapi-generator | Pattern B possible (once #501 lands) |
| **@redocly/openapi-core** | ✓ | Redocly CLI, Spectral, openapi-typescript | Pattern B possible |
| **python-jsonschema** | ✓ | openapi-spec-validator, openapi-schema-validator, Schemathesis | Pattern B possible |
| **Hyperjump** | ✓ | json-schema-bundler | Pattern B possible (reference-correct) |

## Tracker Changes Implemented

Based on this analysis, the tracker now tracks `$ref` sibling preservation as a first-class dimension:

1. **"Sibling-safe" column in §1 (Parsers/Resolvers/Bundlers).** Values: ✓ (preserves siblings), ✗ (drops them), ? (unverified). Downstream tools inherit via the Parser column.

2. **"Parser" column across all sections.** Names the parser library each tool consumes, making the sibling-safe inheritance visible at a glance: see "Parser: swagger-core" → cross-reference §1 → see ✗ → Pattern B is blocked.

3. **Probe snippet in the Implementation Guide** ("Step 0: Verify parser `$ref`-sibling preservation"). Contributors verify a parser preserves siblings *before* starting Pattern B work, preventing the Kiota scenario (6 steps of work before discovering the parser can't supply the data for step 7).

4. **Pattern B annotation convention.** For tools whose parser is sibling-unsafe: Pattern B is annotated "blocked upstream — parser drops `$ref` siblings" rather than "not implemented."

## Sources

- [microsoft/OpenAPI.NET#2895](https://github.com/microsoft/OpenAPI.NET/issues/2895) — the bug report (Microsoft.OpenApi `LoadSchema` drops `$ref` siblings for 3.1+).
- [microsoft/OpenAPI.NET#2896](https://github.com/microsoft/OpenAPI.NET/pull/2896) — the fix PR (`aqeelat`).
- [microsoft/kiota#7815](https://github.com/microsoft/kiota/issues/7815) — kiota-side tracking.
- `analysis/swagger-parser.md` — empirical verification that swagger-core's sibling-drop makes #2332 insufficient.
- `analysis/orval-reference.md` — the reference implementation (Orval uses `@scalar/openapi-types` which preserves siblings; the two-pattern architecture depends on sibling preservation for Pattern B).
