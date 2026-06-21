# Swashbuckle.AspNetCore

## Summary

Swashbuckle.AspNetCore (`domaindrivendev/Swashbuckle.AspNetCore`) is the dominant ASP.NET Core OpenAPI producer (Swagger/gen + UI). It has **no `$dynamicRef`/`$dynamicAnchor` support**: zero references to either keyword anywhere in source, and it generates schemas by reflecting on concrete C# types — a model with no concept of dynamic-reference templates. It uses `Microsoft.OpenApi 2.7.6` (the v2 line; the kiota analysis found `DynamicRef`/`DynamicAnchor` properties on Microsoft.OpenApi's v3 `OpenApiSchema`, not the v2 line Swashbuckle pins). No issue or PR requests the feature. The only way a user could surface `$dynamicRef` today is by manually injecting it through a custom `ISchemaFilter`/`IDocumentFilter` — i.e. outside Swashbuckle's type-reflection pipeline.

**Empirical run skipped** (producer; non-runnable per the fixtures-first gate).

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/domaindrivendev/Swashbuckle.AspNetCore |
| Source commit | `c3071ad` (2026-06-14) |
| Schema model dep | `Microsoft.OpenApi` 2.7.6 (+ `Microsoft.OpenApi.YamlReader` 2.7.6) |
| OpenAPI versions | 3.0 by default; 3.1 serialization added in v10/v2.x |
| `$dynamicRef` Status | **No support** |
| Priority | Low |
| Blocked by | — |
| Backed by | — |

## Maintenance And Landing Likelihood

| Indicator | Value |
|---|---|
| Most recent commit | 2026-06-14 (`c3071ad`) |
| Maintainer | `domaindrivendev` (Rune Hammersland) + contributors |
| Activity level | **Active** — recent v10 work for OAS 3.1 |
| Issue tracker demand | 0 issues mention `$dynamicRef`/`$dynamicAnchor` |

Landing likelihood for a well-scoped PR: **Low.** C# type reflection has no notion of `$dynamicRef` templates; the feature would require a new authoring model (e.g., opt-in generic-template attributes), plus likely a bump to Microsoft.OpenApi v3 to get the `DynamicRef`/`DynamicAnchor` model fields. With zero user demand and an architectural gap, this is a long-odds contribution.

## Dependency Chain

```
Swashbuckle.AspNetCore.SwaggerGen
  → Microsoft.OpenApi 2.7.6            (OpenAPI model — v2 line)
  → (C# System.Reflection via JsonSchemaFactory / SchemaExtensions)  ← where schemas come from
```

- Schemas are produced by reflecting on C# types (`JsonSerializerOptions` / `TypeInfo`), not authored. There is no code path that sets `$dynamicRef`/`$dynamicAnchor`.
- The model dep (Microsoft.OpenApi 2.7.6) is the v2 line; `DynamicRef`/`DynamicAnchor` surfaced on Microsoft.OpenApi v3 (per the kiota/openapi-fetch line of analysis). So even the model may not carry the fields in this version — and Swashbuckle wouldn't populate them regardless.

## Current DynamicRef Behavior

- **No emit path.** Source grep for `dynamicRef`/`$dynamic`/`$anchor` returned zero hits across the repo.
- **Reflection-based.** Schemas come from C# types; C# has no dynamic-reference-template construct.
- **Manual injection only.** A user could add `$dynamicRef` via a custom `ISchemaFilter` that mutates the generated `OpenApiSchema` — but that's hand-authored, outside Swashbuckle's pipeline.
- **No semantic dynamic-scope resolution** (producer).

## Fixture Results

Not run (producer; non-runnable). Source-determined verdict:

| Fixture | OAS | Observed | Verdict |
|---|---|---|---|
| generic-schema-binding | 3.1 | No way to express `PaginatedTemplate<T>` + `$dynamicRef` from C# types; no `$dynamicRef` emitted | N/A (no emit path) |

**Human Review Needed:** none beyond confirming Microsoft.OpenApi 2.7.6's `OpenApiSchema` field set if a custom filter approach is pursued.

## Relevant Source Map

- `src/Swashbuckle.AspNetCore.SwaggerGen/` (`SchemaGenerator`, `JsonSerializerDataContractResolver`) — C# type → `OpenApiSchema` reflection pipeline. No dynamic-ref branch.
- `Directory.Packages.props:20-21` — `Microsoft.OpenApi` / `Microsoft.OpenApi.YamlReader` pinned to 2.7.6.
- No source file references `$dynamicRef`/`$dynamicAnchor`/`$anchor`/`$id` as schema keywords.

## Existing Issues And Prior Art

- **No issues** in the tracker request `$dynamicRef`/`$dynamicAnchor`/JSON Schema 2020-12 generics.
- Adjacent: the v10 OAS 3.1 work is the only relevant context, but it targets 3.1 *serialization*, not 2020-12 reference-keyword authoring.

## Implementation Plan

Not a near-term target. The realistic path (if ever pursued):
1. Bump Microsoft.OpenApi to v3 to get `DynamicRef`/`DynamicAnchor` model fields.
2. Introduce an authoring API (e.g., a `[DynamicRef]`/`[DynamicAnchor]` attribute or a fluent schema API) — C# reflection alone cannot infer these.
3. Add a schema filter that honors the attributes when targeting OAS 3.1.

This is a sizable feature with no current demand.

## Upstream Strategy

None recommended now. If demand emerges, the right first step is a design issue discussing how `$dynamicRef` would map to C# types (likely an attribute-based authoring model), gated on a Microsoft.OpenApi v3 bump.

## Open Questions

- Will Swashbuckle's planned Microsoft.OpenApi v3 migration (to align with the broader .NET OpenAPI ecosystem) naturally bring the `DynamicRef`/`DynamicAnchor` fields into its model? Likely yes for the model, but it still wouldn't auto-emit them from C# types.

## Sources

- Source clone: `/tmp/Swashbuckle.AspNetCore` @ `c3071ad` (2026-06-14)
- `Directory.Packages.props` (Microsoft.OpenApi 2.7.6), `src/Swashbuckle.AspNetCore.SwaggerGen/`
- Cross-ref: kiota analysis (Microsoft.OpenApi v3 `OpenApiSchema.DynamicRef`/`DynamicAnchor`)
