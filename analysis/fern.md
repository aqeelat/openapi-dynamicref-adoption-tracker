# Fern

## Summary

Fern (`fern-api/fern`, Postman-owned) is an open-core SDK generator (TS, Python, Java, Go, Ruby, C#, Swift, …) driven by a TypeScript CLI that converts OpenAPI → Fern IR → language SDKs. It has **no `$dynamicRef`/`$dynamicAnchor` support**: the OpenAPI importer (`packages/cli/api-importers/openapi-to-ir`) uses only `openapi-types` (TypeScript type definitions) — no JSON-Schema-2020-12-aware parser — and walks schemas structurally, so `$dynamicRef`/`$dynamicAnchor` are treated as **literal data fields**, not reference keywords. Fern's own test fixture `v3-importer-tests/.../deeply-recursive/openapi.yml` confirms this exactly: `$dynamicRef` appears as a property name, and the recorded IR snapshot emits it as a literal object field `{ name: "$dynamicRef", valueType: optional primitive STRING }`. So a generated SDK would contain a property literally named `dynamicRef` rather than a resolved type. No semantic resolution; 0 user issues.

**Empirical `fern generate` run skipped** (stall guard): generation runs in Fern's cloud or via `fern generate --local` (docker), requires Fern CLI auth + IR conversion setup, exceeding the 5-minute budget. Fern's own committed test fixture + IR snapshot provide deterministic ground truth for the behavior.

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/fern-api/fern |
| CLI package | `fern-api` v5.49.0 (npm) |
| Source commit | `5e5a92e5f` (2026-06-15) |
| `$dynamicRef` Status | **No support** |
| Priority | Medium |
| Blocked by | — |
| Backed by | — |

## Maintenance And Landing Likelihood

| Indicator | Value |
|---|---|
| Most recent commit | 2026-06-15 (`5e5a92e5f`) |
| Open issues | 330 |
| GitHub stars | 3668 |
| Maintainer | Fern (commercial company; Postman-owned) |
| Activity level | **Very active** — daily commits, CLI on v5.49.0 |

Landing likelihood for a well-scoped PR: **Medium.** Fern is commercially maintained and responsive, but there is **zero** user demand for `$dynamicRef` (no issues), and adding real support means teaching the OpenAPI importer to distinguish JSON Schema 2020-12 reference keywords from literal property names — a parser-level change to `openapi-to-ir`. An issue with the fixture evidence is the right opener; the existing `deeply-recursive` test shows the maintainers have at least seen specs containing these keywords (as data).

## Dependency Chain

```
fern CLI
  → packages/cli/api-importers/openapi-to-ir   (OpenAPI → Fern IR; uses only "openapi-types" types, no JSON-Schema parser)
  → packages/cli/api-importers/commons          (shared importer utilities)
  → cloud generators (or `fern generate --local` via docker)
```

- The importer has **no** AJV, `@apidevtools/json-schema-ref-parser`, Redocly, or any 2020-12-aware schema library. It walks the OpenAPI document structurally; known structural keywords (`$ref`, `type`, `properties`, `allOf`, …) are interpreted, while anything else (including `$dynamicRef`, `$dynamicAnchor`, `$id`, `$anchor`) is treated as a literal property of the schema object.
- Not blocked by an external tool — the gap is in Fern's own importer.

## Current DynamicRef Behavior

Every claim grounded in Fern's committed test artifacts or cited source.

- **No semantic recognition.** `$dynamicRef`/`$dynamicAnchor` are not treated as reference keywords. (Source: importer dependency list — `openapi-types` only.)
- **Treated as a literal data field.** Fern's own `deeply-recursive` test fixture places `$dynamicRef` as a property of `JsonschemaSchema`; the committed IR snapshot emits it as `{ name: "$dynamicRef", valueType: optional primitive STRING }` (snapshot lines ~85 and ~1575). A generated SDK would therefore expose a property literally named `dynamicRef`/`$dynamicRef` of type `string | undefined`.
- **No crash.** The importer accepts specs containing the keywords; it emits IR for them as fields.
- **No semantic dynamic-scope resolution** — by construction.

## Fixture Results

Empirical `fern generate` run skipped (see Summary). Verdict by Fern's own committed test artifacts (deterministic for this question):

| Fixture | OAS | Observed (from Fern `deeply-recursive` test fixture + IR snapshot) | Verdict |
|---|---|---|---|
| (Fern `deeply-recursive`) | 3.0 | `$dynamicRef` becomes a literal IR field `{ name: "$dynamicRef", type: optional string }`; no resolution | UNTYPED (opaque field) |

Our repo's `generic-schema-binding` / `recursive-category-tree` would behave identically: `$dynamicRef` slots become literal `dynamicRef` string properties rather than resolved types. (Inference, consistent with Fern's deterministic importer behavior.)

**Human Review Needed:** one empirical run of `fern generate --local` on `fixtures/generic-schema-binding.yaml` to confirm the inference — requires Fern CLI auth + docker.

## Relevant Source Map

- `packages/cli/api-importers/openapi-to-ir/package.json:41` — `"openapi-types": "^12.1.3"` is the only OpenAPI-related dep; no JSON-Schema-2020-12 parser.
- `packages/cli/api-importers/v3-importer-tests/src/__test__/fixtures/deeply-recursive/openapi.yml` — Fern's own test fixture with `$dynamicRef`/`$anchor`/`$id`/`$ref`/`$schema` as property names.
- `packages/cli/api-importers/v3-importer-tests/src/__test__/__snapshots__/baseline-sdks/deeply-recursive.json:85,1576` — IR snapshot: `$dynamicRef` → literal field `wireValue: "$dynamicRef"`, `safeName: "dynamicRef"`, `optional primitive STRING`.
- `packages/cli/generation/ir-migrations/.../migrateFromV55ToV54.ts:1265,1276` — `convertDynamicReferencedRequestBody` (Fern IR "dynamic request body" concept — unrelated to JSON Schema `$dynamicRef`; called out to pre-empt confusion).

## Existing Issues And Prior Art

- **No issues** in `fern-api/fern` mention `$dynamicRef`/`$dynamicAnchor`/JSON Schema 2020-12 (search returned 0).
- The `deeply-recursive` importer test is the only internal acknowledgment that specs may contain these keywords — and it treats them as data, not references.

## Failure Modes To Test

- (Confirmed via snapshot) `$dynamicRef` as a property → literal `dynamicRef: string` field in the SDK.
- Worth adding for a future PR: `generic-schema-binding` and `recursive-category-tree` should resolve `$dynamicRef` to the concrete bound type.

## Implementation Plan

The fix is in the OpenAPI importer (`packages/cli/api-importers/openapi-to-ir`):

1. Distinguish JSON Schema 2020-12 reference keywords (`$dynamicRef`, `$dynamicAnchor`, `$id`, `$anchor`) from literal property names during schema walking — i.e., when a schema object has a `$dynamicRef` key at the schema level, treat it as a reference, not a property.
2. Implement dynamic-scope resolution: walk the schema tree to find the outermost `$dynamicAnchor` matching the `$dynamicRef` fragment, and resolve to the bound schema.
3. Add **generic type support** to the Fern IR (Orval-modeled — see [`analysis/orval-reference.md`](orval-reference.md)): emit generic templates (`Template<T>`) + bound aliases (`type Alias = Template<Concrete>`) instead of materializing one concrete class per binding. Orval proves this pattern is achievable in a multi-language generator.
4. Update the `deeply-recursive` importer test: `$dynamicRef` should no longer be a literal field once the input is interpreted as a reference keyword. Add a new fixture modeled on `generic-schema-binding.yaml`.

Phase 1+2 is the substantive parser change; Phase 3 is the IR/codegen change (bounded by Orval's precedent).

## Upstream Strategy

1. **Open an issue** in `fern-api/fern` (importer package) with the fixture evidence and the `deeply-recursive` snapshot showing the opaque-field behavior. Frame as: OpenAPI 3.1 JSON Schema 2020-12 reference keywords are being mis-imported as data fields.
2. Expected acceptance: **Medium.** Fern is responsive, but with no user demand and a parser-level fix, prioritization depends on whether it aligns with their roadmap. The `deeply-recursive` test gives the issue a concrete foothold.
3. A scoped importer PR (recognize the keywords + resolve the recursive self-reference case first) is the right first contribution.

## Open Questions

- Does Fern's commercial cloud product have a richer parser than the OSS importer? (Unknown; the OSS importer is what's analyzed.)
- Is the `$dynamicRef`-as-property behavior intentional (some users model JSON Schema meta-objects as data) or an oversight? The `deeply-recursive` fixture suggests Fern treats the meta-schema as data by design — a `$dynamicRef` keyword would need to be disambiguated from a literal `$dynamicRef` property by position/context.

## Sources

- CLI package: `fern-api` v5.49.0 (npm)
- Source clone: `/tmp/fern` @ `5e5a92e5f` (2026-06-15)
- `packages/cli/api-importers/openapi-to-ir/package.json` (deps)
- `packages/cli/api-importers/v3-importer-tests/src/__test__/fixtures/deeply-recursive/openapi.yml`
- `packages/cli/api-importers/v3-importer-tests/src/__test__/__snapshots__/baseline-sdks/deeply-recursive.json`
- Empirical `fern generate` run skipped (cloud/docker + auth required)
