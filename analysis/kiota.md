# Kiota

## Summary

Kiota is Microsoft's multi-language API client SDK generator. It consumes OpenAPI 3.0/3.1/3.2 specs and generates strongly-typed client libraries for C#, TypeScript, Go, Java, Python, PHP, Ruby, and Dart. It is the engine behind the Microsoft Graph SDKs. Kiota uses **Microsoft.OpenApi** (OpenAPI.NET) v3.7.0 as its OpenAPI parser and object model, then builds its own CodeDOM from the schema graph via `KiotaBuilder`.

**`$dynamicRef` and `$dynamicAnchor` are completely unsupported.** There are zero mentions of `DynamicRef` or `DynamicAnchor` anywhere in Kiota's source code or tests. The upstream parser (Microsoft.OpenApi) correctly parses and preserves these keywords as properties on `OpenApiSchema`, but Kiota's code generation pipeline never reads them. Schemas containing `$dynamicRef` (with no `$ref`) silently degrade to `UntypedNode` — Kiota's equivalent of `any`/`unknown`/`object` across all output languages. No crash, no warning, no error — just meaningless types.

## Status Snapshot

| Property | Value |
|---|---|
| **Repository** | https://github.com/microsoft/kiota |
| **Packages to analyze** | `src/Kiota.Builder` (the code generation engine), `src/kiota` (the CLI) |
| **Category** | SDK generator (spec consumer → multi-language client SDKs) |
| **Version analyzed** | `v1.32.2` (latest release, 2026-06-05); source at commit `1747402c` (2026-06-15) |
| **OpenAPI versions** | 3.0, 3.1, 3.2 (3.2 support added in v1.30.0) |
| **`$dynamicRef` support** | None — silent degradation to `UntypedNode` |
| **Tracking issue** | None filed |

## Maintenance And Landing Likelihood

| Metric | Value |
|---|---|
| **Most recent meaningful commit** | 2026-06-15 (daily dependency bumps and feature work) |
| **Latest release** | `v1.32.2` (2026-06-05) |
| **Releases in last 6 months** | ~6 minor releases (v1.27–v1.32) |
| **Open issues** | ~500+ (active triage; latest issue #7791 filed 2026-06-12) |
| **Open PRs** | Active merge queue (recent non-dependabot PRs: #7764, #7765, #7641–#7643, #7735, #7746) |
| **Maintainers** | Microsoft team — `andrealbm`, `baywet` (Darrel Miller), `MaggieKimani1`, `irvinesunday`, `adrach` are active reviewers/committers |
| **External PRs merged recently** | Yes — security fixes, bug fixes, and feature PRs from community contributors are regularly merged |
| **Project status** | Very active — daily commits, frequent releases, multiple maintainers |

**Landing likelihood: Medium.** Evidence:

- Kiota is actively developed with a responsive maintainer team at Microsoft.
- The project already supports OAS 3.1 and 3.2, and depends on Microsoft.OpenApi which already parses `$dynamicRef`/`$dynamicAnchor` — so the raw data is available in the object model today.
- However, supporting `$dynamicRef` meaningfully in generated SDKs is architecturally significant: Kiota's CodeDOM has no concept of generic type parameters, so the generator cannot emit reusable parameterized types (e.g., `PaginatedTemplate<T>`). The pragmatic alternative — materializing concrete types from dynamic bindings — requires implementing dynamic scope tracking during schema traversal, which is non-trivial.
- No existing issues or PRs about this topic exist, so there is no established maintainer appetite to measure.
- A well-scoped issue explaining the gap with fixture examples would be the right first step. An implementation PR that handles the common pagination/envelope patterns (concrete type materialization) would be the right second step.

## Dependency Chain

### Runtime dependencies (`src/Kiota.Builder/Kiota.Builder.csproj`)

| Package | Version | Role |
|---|---|---|
| `Microsoft.OpenApi` | `3.7.0` | OpenAPI object model, JSON/YAML reader, `$ref` lazy resolution |
| `Microsoft.OpenApi.YamlReader` | `3.7.0` | YAML parsing support |
| `Microsoft.OpenApi.ApiManifest` | `3.0.0-preview.1` | API manifest format support |

### Key dependency analysis

- **`Microsoft.OpenApi` v3.7.0 (OpenAPI.NET)** is the sole parser and object model. It was rewritten in v2 to support OpenAPI 3.1 with full JSON Schema 2020-12 keyword support. The v2 upgrade guide explicitly lists `$dynamicRef` and `$dynamicAnchor` as new schema properties:
  - `OpenApiSchema.DynamicRef` (`string?`) — parsed from `$dynamicRef`
  - `OpenApiSchema.DynamicAnchor` (`string?`) — parsed from `$dynamicAnchor`
  - Both are on the `IOpenApiSchema` interface and deserialized by V31 and V32 readers
  - `OpenApiSchemaReference` delegates `DynamicRef`/`DynamicAnchor` to its `Target`
  - Confirmed via GitHub code search of `microsoft/OpenAPI.NET`: `src/Microsoft.OpenApi/Models/OpenApiSchema.cs`, `src/Microsoft.OpenApi/Reader/V31/OpenApiSchemaDeserializer.cs`, `src/Microsoft.OpenApi/Reader/V32/OpenApiSchemaDeserializer.cs`
  - Added in response to issue [microsoft/OpenAPI.NET#1274](https://github.com/microsoft/OpenAPI.NET/issues/1274) ("Add support for $schema, $id, $comment, $vocabulary, $dynamicRef, $dynamicAnchor, $recursiveAnchor, $recursiveRef"), closed in v2-Preview1 milestone

- **Microsoft.OpenApi does NOT resolve dynamic scope.** It is an object model, not a validator. It parses and preserves the keywords as string properties but does not implement the dynamic evaluation path algorithm from RFC 2020-12. This is by design — the library delegates validation to external validators.

- **Kiota does not delegate `$dynamicRef` resolution to Microsoft.OpenApi.** Kiota builds its own CodeDOM from the `IOpenApiSchema` graph. The schema-to-code pipeline only checks for `OpenApiSchemaReference` (i.e., `$ref`) when deciding whether a schema is "referenced." It never reads `schema.DynamicRef` or `schema.DynamicAnchor`.

- **Classification**: Microsoft.OpenApi is a **blocker** for Pattern B. Its `LoadSchema` short-circuits on `$ref` and drops sibling keywords (`$defs`, `$dynamicAnchor`, `$dynamicRef`, `$id`, `$anchor`) at parse time — see [OpenAPI.NET#2895](https://github.com/microsoft/OpenAPI.NET/issues/2895). This means Kiota's generator **cannot access the binding data** for Pattern B (generic templates), regardless of its own codegen logic. Steps 1–6 of Kiota's `$dynamicRef` implementation landed; step 7 (Pattern B) could not proceed. Fix PR [#2896](https://github.com/microsoft/OpenAPI.NET/pull/2896) is open. **Pattern A (recursive `$dynamicRef`) is NOT blocked** — the `$dynamicAnchor` sits on a concrete schema (not beside `$ref`), so Microsoft.OpenApi preserves it. See `analysis/ref-sibling-preservation.md` for the full analysis.

## Current DynamicRef Behavior

### Keyword handling

| Keyword | Parsed by upstream? | Accessible to Kiota? | Read by Kiota? | Semantically resolved? |
|---|---|---|---|---|
| `$ref` | Yes → `OpenApiSchemaReference` | Yes | Yes (`IsReferencedSchema()`, `GetReferenceId()`) | Yes — Kiota follows `$ref` to target schema |
| `$dynamicRef` | Yes → `OpenApiSchema.DynamicRef` | Yes (property on `IOpenApiSchema`) | **No** — zero references in source | No |
| `$dynamicAnchor` | Yes → `OpenApiSchema.DynamicAnchor` | Yes | **No** — zero references in source | No |
| `$id` | Yes → `OpenApiSchema.Id` | Yes | No | No |
| `$anchor` | Yes (via reader) | Yes | No | No |

### Exact failure mode

When Kiota's `CreateModelDeclarations` method (`KiotaBuilder.cs:1891`) encounters a schema with `$dynamicRef` but no `$ref`, type, properties, or composition:

1. `schema.IsReferencedSchema()` returns `false` — only `OpenApiSchemaReference` (from `$ref`) returns `true` (`OpenApiSchemaExtensions.cs:57-63`).
2. The schema is not inherited (no `allOf` with a single `$ref`).
3. The schema is not an intersection or union (no `allOf`/`oneOf`/`anyOf`).
4. The schema is not an object type, has no properties, is not an enum, has no `additionalProperties`.
5. The schema is not an array.
6. `schema.Type` is null and `schema.Format` is empty → `GetPrimitiveType()` returns null.
7. No `anyOf`/`oneOf`/`allOf` to unwrap.
8. **Falls through to**: `return new CodeType { Name = UntypedNodeName, IsExternal = true }` (`KiotaBuilder.cs:1968`), where `UntypedNodeName = "UntypedNode"` (`KiotaBuilder.cs:678`).

**Result: `UntypedNode`.** This maps to `object`/`any`/`unknown` in all output languages. Silent degradation — no error, no warning, no crash. The generated SDK loses all type safety for dynamically-referenced schemas.

### Concrete example: `generic-schema-binding.yaml`

The `PaginatedTemplate` schema has:
```yaml
properties:
  items:
    type: array
    items:
      $dynamicRef: '#itemType'
```

When Kiota processes `PaginatedTemplate`:
- Creates a class with properties `items`, `total`, `page`, `pageSize`
- For `items` (type: array): calls `CreateModelDeclarations` on the `items` sub-schema `{$dynamicRef: '#itemType'}`
- That sub-schema has no `$ref`, no `type`, no properties → falls through to `UntypedNode`
- The `items` property is typed as `UntypedNode[]` (e.g., `List<object>` in C#, `any[]` in TypeScript)

The concrete binding in `PaginatedUserResponse.$defs.itemType.$dynamicAnchor` → `$ref: '#/components/schemas/User'` is never discovered because Kiota does not walk `$dynamicAnchor` overrides.

## Fixture Results

This is a **source-first analysis**. Kiota requires .NET SDK 10.0.301 (per `global.json`) which was not available locally (only 10.0.300 installed), preventing a local build and fixture run. The table below records **inferred** outcomes from source analysis. Verification would require running `kiota generate -d <fixture> -l typescript -o <out>` against each fixture.

| Fixture | OAS version | Inferred outcome | Verdict |
|---|---|---|---|
| `baseline-duplicated-pagination.yaml` | 3.1 | Works — explicit `PaginatedUserResponse`/`PaginatedGroupResponse` use ordinary `$ref` chains. No `$dynamicRef`. | N/A (control) |
| `generic-schema-binding.yaml` | 3.1 | `items` property typed as `UntypedNode[]` instead of `User[]`/`Group[]`. `$dynamicAnchor` overrides in `$defs` ignored. | UNTYPED |
| `allOf-generic-binding.yaml` | 3.1 | Same — `$dynamicRef` in template `items` unresolved. `allOf` binding walked but dynamic anchor not connected. | UNTYPED |
| `paginated-response.yaml` | 3.1 | Same — inline `$dynamicAnchor` override at response level not discovered. | UNTYPED |
| `api-envelope.yaml` | 3.1 | Two-level nesting: both `data` field and inner pagination `items` resolve to `UntypedNode`. | UNTYPED |
| `recursive-category-tree.yaml` | 3.1 | `children` property typed as `UntypedNode[]` instead of the concrete category type. | UNTYPED |
| `nested-workspace-resources.yaml` | 3.1 | Both generic slots (`folderType`, `resourceType`) resolve to `UntypedNode`. | UNTYPED |
| `non-identifier-schema-key.yaml` | 3.1 | Same as recursive-category-tree — `children` untyped. Schema key normalization is orthogonal. | UNTYPED |

**Human Review Needed:** Verify inferred outcomes by running the CI matrix (`node scripts/matrix-runner.mjs --tools=kiota`) and inspecting `generated/kiota/` output for `UntypedNode`/`any`/`object` in property types.

**Upstream test framework:** xUnit. Integration tests in `tests/Kiota.Builder.IntegrationTests/` use fixture YAML files and `KiotaBuilder.GenerateClientAsync()`. Pattern: `[Theory]` with `[InlineData(GenerationLanguage.X)]` per language.

## Relevant Source Map

### Spec loading / parsing

| File:line | Function | Role |
|---|---|---|
| `src/Kiota.Builder/KiotaBuilder.cs` | `KiotaBuilder` class | Orchestrates the entire pipeline: load → URL tree → code model → refiner → writer |
| `src/Kiota.Builder/OpenApiDocumentDownloadService.cs` | `OpenApiDocumentDownloadService` | Downloads and loads OpenAPI document via `OpenApiDocument.LoadAsync()` |

### Schema → CodeDOM conversion (critical path)

| File:line | Function | Role |
|---|---|---|
| `src/Kiota.Builder/KiotaBuilder.cs:1891` | `CreateModelDeclarations()` | **Critical.** Main dispatch for schema → type. Checks `IsReferencedSchema()`, inheritance, intersection, union, object, array, primitive. Where `$dynamicRef` handling must be added. |
| `src/Kiota.Builder/KiotaBuilder.cs:2404` | `CreatePropertiesForModelClass()` | Iterates `schema.Properties` and calls `CreateModelDeclarations` per property. `$dynamicRef` schemas here fall through to `UntypedNode`. |
| `src/Kiota.Builder/KiotaBuilder.cs:1709` | `CreateModelDeclarationAndType()` | Creates a CodeClass from a schema. Entry point for object-type schemas. |
| `src/Kiota.Builder/KiotaBuilder.cs:1725` | `CreateInheritedModelDeclaration()` | Handles `allOf` inheritance chains. Where generic-binding via `allOf` + `$dynamicAnchor` would need integration. |
| `src/Kiota.Builder/KiotaBuilder.cs:678` | `UntypedNodeName` constant | `"UntypedNode"` — the fallback type for unresolvable schemas. |

### Reference handling

| File:line | Function | Role |
|---|---|---|
| `src/Kiota.Builder/Extensions/OpenApiSchemaExtensions.cs:31` | `GetReferenceId()` | Returns `Reference.Id` for `OpenApiSchemaReference`, or merged original reference ID. Does not check `DynamicRef`. |
| `src/Kiota.Builder/Extensions/OpenApiSchemaExtensions.cs:57` | `IsReferencedSchema()` | Returns `true` only for `OpenApiSchemaReference` (i.e., `$ref`). `$dynamicRef` schemas are not "referenced." |
| `src/Kiota.Builder/EqualityComparers/OpenApiSchemaReferenceComparer.cs` | `OpenApiSchemaReferenceComparer` | Compares `OpenApiSchemaReference` by `Reference.Id`. Would need a parallel for dynamic refs. |

### CodeDOM types (gap analysis)

| File | Type | Gap |
|---|---|---|
| `src/Kiota.Builder/CodeDOM/CodeType.cs` | `CodeType` | No generic type parameter concept. Cannot represent `PaginatedTemplate<T>`. |
| `src/Kiota.Builder/CodeDOM/CodeClass.cs` | `CodeClass` | No type parameter list. Cannot model parameterized classes. |
| `src/Kiota.Builder/CodeDOM/CodeTypeBase.cs` | `CodeTypeBase` | Base for `CodeType` and `CodeComposedTypeBase`. No generic arity field. |

## Existing Issues And Prior Art

### No kiota issues or PRs for `$dynamicRef`/`$dynamicAnchor`

GitHub search for "dynamicRef", "dynamicAnchor", "dynamic ref", and "JSON Schema 2020-12" in `microsoft/kiota` returned zero relevant results. No issue, PR, or discussion has been filed about this topic.

### Related: kiota#3879 — "Improve generated BaseCollectionPagination(Count)Response (DRY) + paging out of the box"

- **Status**: Closed (2023-12-08)
- **Relevance**: About pagination response DRYness — the same use case `$dynamicRef` solves (reusable paginated wrappers). Kiota currently generates duplicate pagination wrappers per API because it cannot express generic templates. This issue confirms the maintainers are aware of the pagination-DRY problem but solved it differently (or deferred).

### Upstream: microsoft/OpenAPI.NET#1274 — "Add support for $schema, $id, $comment, $vocabulary, $dynamicRef, $dynamicAnchor, $recursiveAnchor, $recursiveRef"

- **Status**: Closed (2024-02-12)
- **Milestone**: v2 - Preview1
- **Author**: `adhiambovivian`
- **Assignee**: `MaggieKimani1`
- **Result**: `$dynamicRef` and `$dynamicAnchor` added as properties on `OpenApiSchema` and `IOpenApiSchema`. V31 and V32 deserializers parse them. This is the foundation Kiota could build on.

### Upstream: microsoft/OpenAPI.NET#1319 — "Resolve JsonSchema serialization"

- **Status**: Closed (2024-11-07)
- **Milestone**: v2 - Preview1
- **Result**: Fixed serialization of `JsonSchema` objects including references, extensions, and additional properties. Some tasks left unchecked (recursive schema construction, `UnresolvedSchema` property).

**No prior fixes were reverted. No forks with relevant support identified.**

## Failure Modes To Test

| Fixture | Expected failure mode | What to assert |
|---|---|---|
| `recursive-category-tree.yaml` | `children` property typed as `UntypedNode[]` / `any[]` / `object[]` instead of concrete category type | Baseline: `UntypedNode[]`; after fix: concrete `LocalizedCategory[]` |
| `generic-schema-binding.yaml` | `items` property typed as `UntypedNode[]` instead of `User[]`/`Group[]` | Baseline: `UntypedNode[]`; after fix: `User[]` / `Group[]` |
| `paginated-response.yaml` | Same — inline `$dynamicAnchor` override not discovered | Same pattern |
| `api-envelope.yaml` | Both `data` field and nested pagination `items` untyped | Baseline: `UntypedNode`; after fix: concrete types |
| `nested-workspace-resources.yaml` | Both `folderType` and `resourceType` slots untyped | Baseline: `UntypedNode`; after fix: concrete types |
| `non-identifier-schema-key.yaml` | Same as recursive tree, plus schema key normalization (`base-category` → valid identifier) | Baseline: `UntypedNode[]`; after fix: concrete type with normalized name |

## Implementation Plan

> **Reference:** Orval proves real generic-type emission is achievable and lands upstream (PR [#3353](https://github.com/orval-labs/orval/pull/3353)). See [`analysis/orval-reference.md`](orval-reference.md). **Do NOT default to "materialize concrete types."** The CodeDOM-generic work is bounded, not architecturally impossible.

### Phase 1: Pattern A (recursive `$dynamicRef`) — actionable NOW

Pattern A (recursive tree) does NOT need CodeDOM generics or `$ref`-sibling preservation. The `$dynamicAnchor` sits on a concrete `type: object` schema (not beside `$ref`), so Microsoft.OpenApi preserves it.

1. In `CreateModelDeclarations` (`KiotaBuilder.cs:1891`), add a `$dynamicRef` branch: when `schema.DynamicRef` is non-null, resolve it against the enclosing schema's `$dynamicAnchor` (walk the parent context for a matching anchor name).
2. Emit the resolved type name (e.g., `BaseCategory` for recursive trees → `children: List<BaseCategory>`).
3. This mirrors Orval's Pattern A (`buildDynamicScope` self-binding → `resolveDynamicRef` returns the enclosing name).

**Not blocked** by Microsoft.OpenApi #2896 or CodeDOM changes. Can ship independently.

### Phase 2: CodeDOM generic type parameters — the architectural enabler

Add generic type parameters to Kiota's CodeDOM so it can represent `PaginatedTemplate<T>`:

1. Add a `TypeParameters` collection to `CodeType` / `CodeClass` (`src/Kiota.Builder/CodeDOM/`).
2. Update each of the 8 language writers to emit generics in their language's syntax (C# `<T>`, TS `<T>`, Go `[T any]`, Java `<T>`, etc.). Orval's TS implementation (`interface.ts:37-40`) shows the pattern — the per-language writer is mechanical.
3. This is the "cross-cutting" change, but Orval proves it's bounded (one PR, well-defined per-writer work).

### Phase 3: Pattern B (generic templates + bound aliases) — blocked on #2896

Once CodeDOM generics exist (Phase 2) AND Microsoft.OpenApi preserves `$ref` siblings (#2896 lands):

1. **Template emission** (inverse of Orval's `collectGenericParams`): when a schema's `$defs` has `$dynamicAnchor` + no `$ref` (unbound slot), emit a generic class: `class PaginatedTemplate<T> { List<T> items; ... }`. The `$dynamicAnchor` value IS the type-parameter name.
2. **Binding emission** (inverse of Orval's `extractBoundAliasInfo`): when a schema has `$ref` + `$defs` with override `$dynamicAnchor` + `$ref` to a concrete type, emit a bound alias: `type PaginatedUserResponse = PaginatedTemplate<User>` (or language equivalent).
3. **Multi-parameter**: iterate `$defs` anchors in order → `class ShelterFolder<TFolder, TResource>`.
4. **Cycle safety**: port Orval's `hasScopeAffectedDynamicRef` + `context.parents` guards.

**Blocked on:** Microsoft.OpenApi [#2896](https://github.com/microsoft/OpenAPI.NET/pull/2896) (sibling preservation) — without it, `LoadSchema` drops the `$defs` binding data before Kiota sees it. See [`analysis/ref-sibling-preservation.md`](ref-sibling-preservation.md).

### Where dynamic-scope resolution should live

In `KiotaBuilder.CreateModelDeclarations` and `CreatePropertiesForModelClass` (`src/Kiota.Builder/KiotaBuilder.cs`). The resolution logic (walking `$dynamicAnchor` declarations) could be an extension method on `IOpenApiSchema` in `src/Kiota.Builder/Extensions/OpenApiSchemaExtensions.cs`, parallel to the existing `GetReferenceId` / `IsReferencedSchema` methods.

### Tests

- **Unit tests**: `tests/Kiota.Builder.Tests/KiotaBuilderTests.cs` — add tests asserting `UntypedNode` for current behavior, then update to assert concrete types after fix.
- **Integration tests**: Add a fixture YAML in `tests/Kiota.Builder.IntegrationTests/` (e.g., `DynamicRefModel.yaml`) modeled on `generic-schema-binding.yaml`, with a `GenerateSample`-style test across languages.

### Backwards-compatibility

- **Low risk for Phase 1** (warning only). No output changes.
- **Low risk for Phase 2/3**: Only adds new handling for schemas that currently produce `UntypedNode`. Existing `$ref`, circular refs, and OpenAPI 3.0 documents are unaffected — the new code path only activates when `schema.DynamicRef` is non-null.

## Upstream Strategy

### Should this be tackled now or later? **Later.**

- Filing an issue first is the right first step. The maintainers need to decide whether concrete type materialization (duplicate classes) is acceptable or whether they want to invest in CodeDOM generics first.
- Kiota is in the CI matrix (`scripts/matrix-runner.mjs`), so the current `UntypedNode` output can be verified and tracked.
- The fix is self-contained in Kiota — no upstream coordination needed since Microsoft.OpenApi already provides the keyword data.

### Start with: **Issue + fixture evidence**, then implementation PR.

File an issue in `microsoft/kiota` with:
1. A minimal reproduction (the `generic-schema-binding.yaml` fixture).
2. Source evidence that `DynamicRef`/`DynamicAnchor` are never read (zero grep hits).
3. The `UntypedNode` output from the CI matrix.
4. A proposed implementation sketch (Phase 2 above).

### Expected upstream acceptance likelihood

**Medium.** Kiota is active and receptive to external PRs, and the maintainers already understand the pagination-DRY problem (kiota#3879). However, the architectural decision about generics vs. materialization needs maintainer buy-in before an implementation PR would be accepted.

### Downstream tools that benefit

- All Kiota-generated SDKs, including the **Microsoft Graph SDK** — the most widely consumed .NET/TypeScript/Python/Java SDK for Microsoft cloud APIs.
- Any API using `$dynamicRef` patterns (generic pagination, response envelopes, recursive type hierarchies) that publishes an OpenAPI spec consumed by Kiota.

## Open Questions

1. **Generics vs. materialization**: Should Kiota add type parameters to its CodeDOM (large change, all 8 writers affected) or materialize concrete types per binding (smaller change, duplicate classes)? This is a maintainer decision.
2. **`$ref` siblings in Microsoft.OpenApi v3**: **ANSWERED — `$defs` siblings are NOT accessible.** Microsoft.OpenApi's `LoadSchema` drops `$ref` siblings at parse time (issue [OpenAPI.NET#2895](https://github.com/microsoft/OpenAPI.NET/issues/2895)). The `$defs` override + `$dynamicAnchor` are never parsed into the object model when `$ref` is present. Fix PR [#2896](https://github.com/microsoft/OpenAPI.NET/pull/2896) is open. This is the gating blocker for Kiota's Pattern B implementation.
3. **Interaction with `allOf` flattening**: Kiota aggressively flattens `allOf` entries. Would `$dynamicAnchor` declarations survive `MergeAllOfSchemaEntries` and `MergeIntersectionSchemaEntries`? Needs tracing.
4. **CI matrix results**: Are there existing `generated/kiota/` outputs from the CI matrix that confirm `UntypedNode` for the fixture scenarios? If so, they should be cited directly.

## Sources

- Repository: https://github.com/microsoft/kiota (cloned at `/tmp/kiota`, commit `1747402c8035ac969a3d3c582529a64f9dcd8620`, 2026-06-15)
- `src/Kiota.Builder/KiotaBuilder.cs` — `CreateModelDeclarations` (line 1891), `CreatePropertiesForModelClass` (line 2404), `UntypedNodeName` (line 678)
- `src/Kiota.Builder/Extensions/OpenApiSchemaExtensions.cs` — `GetReferenceId` (line 31), `IsReferencedSchema` (line 57)
- `src/Kiota.Builder/Kiota.Builder.csproj` — `Microsoft.OpenApi` v3.7.0
- Upstream: https://github.com/microsoft/OpenAPI.NET — `$dynamicRef`/`$dynamicAnchor` in `OpenApiSchema.cs`, V31/V32 deserializers; issue [#1274](https://github.com/microsoft/OpenAPI.NET/issues/1274)
- GitHub issue/PR search via `gh search issues` and `gh search code` for `microsoft/kiota` and `microsoft/OpenAPI.NET`
- `CHANGELOG.md` — v1.30.0 added OAS 3.2.0 support
- `global.json` — requires .NET SDK 10.0.301
