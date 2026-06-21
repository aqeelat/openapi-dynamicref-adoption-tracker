# Microsoft.OpenApi (OpenAPI.NET): `$ref` sibling preservation blocker

> Explainer for the tracker's analysis agent. This is a cross-cutting discovery that affects the Pattern B (generic-template) analysis for any tool whose parser is `Microsoft.OpenApi`. Update the relevant per-tool analysis files and `IMPLEMENTATION_GUIDE.md` to reference this.

## TL;DR

`Microsoft.OpenApi` 3.7.0 (the OpenAPI.NET parser used by Kiota and other .NET tools) **silently drops most `$ref` sibling keywords** when a schema contains both `$ref` and other declarations. Only a small allow-list of annotation siblings (`description`, `title`, and a few others added in #2369) survives parsing. Keywords like `$defs`, `$dynamicAnchor`, `$id`, `$anchor` are dropped and unreachable through the standard `IOpenApiSchema` API.

This is correct for OpenAPI 3.0 (where `$ref` siblings are spec-required to be ignored) but **wrong for OpenAPI 3.1+**, which adopts JSON Schema 2020-12 semantics: `$ref` is a regular keyword and siblings are fully valid.

The bug blocks Pattern B (generic templates with `$dynamicRef` slots bound by sibling `$defs` in referencing schemas) for every tool that uses `Microsoft.OpenApi` as its parser.

## Discovery context

Found while implementing `$dynamicRef` support in Kiota (`microsoft/kiota`). Steps 1–6 of the implementation landed (Pattern A recursive resolution + CodeDOM `TypeParameters` + 6 language writers wired). Step 7 (Pattern B concrete bindings) failed end-to-end because the parser drops the binding data before Kiota ever sees it.

## Reproduction

Minimal YAML:

```yaml
openapi: 3.1.0
info:
  title: repro
  version: 1.0.0
paths: {}
components:
  schemas:
    Target:
      type: object
      properties:
        name: { type: string }
    Referencing:
      $ref: '#/components/schemas/Target'
      description: Sibling description
      $dynamicAnchor: anchor
      $defs:
        sibling:
          $dynamicAnchor: inner
          $ref: '#/components/schemas/Target'
```

C# probe:

```csharp
using Microsoft.OpenApi;
using Microsoft.OpenApi.Reader;

var settings = new OpenApiReaderSettings();
settings.AddYamlReader();

var yaml = /* the YAML above */;
using var stream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(yaml));
var result = await OpenApiDocument.LoadAsync(stream, "yaml", settings);
var referencing = result.Document.Components!.Schemas["Referencing"];

Console.WriteLine(referencing.Description);    // "Sibling description" — preserved
Console.WriteLine(referencing.DynamicAnchor);  // null — LOST
Console.WriteLine(referencing.Definitions?.Count ?? 0);  // 0 — LOST (delegates to Target.Definitions)
```

Reflection over `OpenApiSchemaReference` (the runtime type of `Referencing`) confirms that property accessors delegate to `Target` for everything except the annotation allow-list.

## What is and isn't preserved

Verified by reflection on the parsed `OpenApiSchemaReference` instance:

| Sibling keyword | Preserved? | Notes |
|---|---|---|
| `description` | Yes | Via the #2369 annotation work |
| `title` | Yes | Via the #2369 annotation work |
| Other annotations (`example`, `deprecated`, etc.) | Partial | Subset of #2369 |
| `$defs` | **No** | `Definitions` delegates to `Target.Definitions` |
| `$dynamicAnchor` | **No** | Property reads as null when set as sibling |
| `$dynamicRef` | **No** (presumably) | Same delegation pattern |
| `$id` | **No** | `Id` reads as `Target.Id` |
| `$anchor` | **No** | Not exposed on `IOpenApiSchema` at all |
| `properties` (sibling overrides) | **No** | `Properties` delegates to `Target.Properties` |
| `required` (sibling) | **No** | Delegates to `Target.Required` |

## Impact on `$dynamicRef` patterns

### Pattern A (recursive self-reference) — UNAFFECTED

Pattern A uses **top-level** `$dynamicAnchor` on each schema (not as a sibling of `$ref`). Example:

```yaml
BaseCategory:
  $dynamicAnchor: category              # top-level, not sibling
  properties:
    children:
      type: array
      items:
        $dynamicRef: '#category'

LocalizedCategory:
  $dynamicAnchor: category              # top-level
  allOf:
    - $ref: '#/components/schemas/BaseCategory'
```

Both anchors are top-level on their schemas, so `Microsoft.OpenApi` preserves them. Kiota's Pattern A resolver works end-to-end across C#, TypeScript, Go, Python, Java.

### Pattern B (generic template + binding) — BLOCKED

Pattern B uses **sibling `$defs` + `$dynamicAnchor`** on the referencing schema:

```yaml
PaginatedUserResponse:
  $ref: '#/components/schemas/PaginatedTemplate'  # $ref present
  $defs:                                          # sibling — DROPPED
    itemType:
      $dynamicAnchor: itemType                    # sibling — DROPPED
      $ref: '#/components/schemas/User'
```

The binding information (`itemType → User`) is unreachable through `Microsoft.OpenApi` 3.7.0. Any tool that wants to emit `class PaginatedUserResponse : PaginatedTemplate<User>` cannot get the `User` type from the parsed object model.

The `allOf` variant doesn't help either. The fixture `allOf-generic-binding.yaml` writes the binding as:

```yaml
AssetPaged:
  allOf:
    - $defs:
        contentType:
          $dynamicAnchor: contentType
          $ref: '#/components/schemas/Asset'
    - $ref: '#/components/schemas/Paged'
```

Probed: `AssetPaged.AllOf[0].$defs.contentType` is parsed as an `OpenApiSchemaReference` (because of the inner `$ref: Asset`), and the sibling `$dynamicAnchor: contentType` on that inner schema is dropped. Same root cause.

## Tools affected

Any tool whose OpenAPI parser is `Microsoft.OpenApi` 3.x:

- **Kiota** (`microsoft/kiota`) — confirmed; full analysis at `analysis/kiota.md` and `analysis/kiota-implementation-plan.md`
- Possibly others (NSwag, OpenAPI.NET-based doc generators, etc.) — needs per-tool verification. The bug is in the parser, so any tool that reads `$dynamicRef` / `$dynamicAnchor` siblings through `IOpenApiSchema` is affected.

The bug is **not** a Kiota-side issue. It cannot be worked around in Kiota's code — the data is gone before Kiota sees the schema.

## Workarounds

None that preserve the Pattern B fixture semantics.

- Restructuring the fixture to avoid `$ref + $defs` siblings loses the validator-backed status of the existing fixtures (they're written to match real-world JSON Schema generics patterns).
- Patching `Microsoft.OpenApi` is the only path to a real fix.

## Status

- **Upstream issue to be filed**: `microsoft/OpenAPI.NET` — see `~/lab/kiota/DYNAMICREF_OPENAPI_NET_ISSUE.md` for the draft.
- **Kiota-side implementation**: Steps 1–6 of the Kiota plan are landed and verified; Step 7 (Pattern B bindings) is cancelled pending the upstream fix.
- **Tracker-wide effect**: when scoring tools that depend on `Microsoft.OpenApi`, Pattern B should be marked as "blocked upstream — microsoft/OpenAPI.NET sibling-$defs preservation" rather than "tool does not implement". This is a parser-level blocker, not a generator-level gap.

## Suggested tracker updates

When the analysis agent next revises the tracker:

1. **`analysis/kiota.md`** — add a "Known upstream blockers" section pointing to this file and the upcoming `microsoft/OpenAPI.NET` issue. Note that the prior analysis's "Pattern B: not implemented" framing is incomplete — Pattern B is *unimplementable* on the current parser without upstream changes.
2. **`IMPLEMENTATION_GUIDE.md`** — add a "Parser-level blockers" callout so future contributors don't waste cycles implementing Pattern B against an affected parser. List `Microsoft.OpenApi` sibling-preservation as a known blocker, with a probe snippet maintainers can run before starting implementation.
3. **`state-of-the-union.md`** — note Pattern B's status for Kiota as "blocked upstream" rather than "no support".
4. **`TOOLING_CATALOG.md`** (if it lists parser dependencies) — annotate `Microsoft.OpenApi`-dependent tools with the sibling-preservation caveat.

## References

- `Microsoft.OpenApi` 3.7.0 source: https://github.com/microsoft/OpenAPI.NET
- Prior related issues in `microsoft/OpenAPI.NET`:
  - #2369 "Add all 'Annotations' to OpenApiSchemaReference" (closed; addressed a subset of annotation siblings)
  - #2763 "OpenApiSchemaReference allows Description alongside $ref producing non-spec-compliant output in OAS 3.0" (the inverse bug: siblings appearing in 3.0 where they shouldn't)
  - #1274 "Add support for `$dynamicRef` / `$dynamicAnchor`" (added the keyword *parsing*, but sibling preservation was not in scope)
- OpenAPI 3.1 spec — Schema Object: https://spec.openapis.org/oas/v3.1.1#schema-object
- JSON Schema 2020-12 core: https://json-schema.org/draft/2020-12/json-schema-core
- Tracker: https://github.com/aqeelat/openapi-dynamicref-adoption-tracker
- Kiota implementation plan: `analysis/kiota-implementation-plan.md`
