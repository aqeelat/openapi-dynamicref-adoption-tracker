# Speakeasy

## Summary

Speakeasy (`speakeasy-api/speakeasy`) is a multi-language SDK generator (TS, Python, Go, Java, PHP, Ruby, C#, Swift, …). It has **no `$dynamicRef`/`$dynamicAnchor` support**. Empirically, `speakeasy generate sdk` on the fixtures succeeds (no crash) but emits validation warnings flagging both keywords as **"unknown property"**, and types every `$dynamicRef` slot as `any` (`Array<any>` / `z.array(z.any())`). The dynamic-binding targets (`User`, `Group`, the concrete category type) are never generated. Source confirms why: Speakeasy's own parser library (`speakeasy-api/openapi`) has **no `DynamicRef`/`DynamicAnchor` field** on its `Schema` model (only `Ref` for `$ref`), and its JSON Schema Test Suite runner **explicitly blacklists every `dynamicRef.json` case** with the comment *"all failing due to lack of dynamic reference support."* The gap is therefore documented and acknowledged upstream.

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/speakeasy-api/speakeasy (CLI) |
| Parser repo | https://github.com/speakeasy-api/openapi (the schema model + resolution) |
| CLI analyzed | `speakeasy` v1.778.0 (darwin-arm64) |
| CLI commit | `7526194` (2026-06-12) |
| Parser commit | `5b7841f` (2026-06-02) |
| `$dynamicRef` Status | **No support** |
| Priority | Medium |
| Blocked by | — (gap is in Speakeasy's own parser, not an external blocker) |
| Backed by | — |

## Maintenance And Landing Likelihood

| Indicator | Value |
|---|---|
| Most recent CLI commit | 2026-06-12 (`7526194`) |
| Open issues (CLI) | 49 |
| GitHub stars | 419 |
| Maintainer | Speakeasy team (commercial SDK platform) |
| Activity level | **Very active** — the CLI is on v1.778.0 (heavy release cadence) |

Landing likelihood for a well-scoped PR: **Medium.** The gap is acknowledged in the parser's own test suite (`testsuite_test.go` blacklists all `dynamicRef.json` cases). But there are **zero** user issues requesting `$dynamicRef` in the CLI tracker, and the fix is parser-level (add `DynamicRef`/`DynamicAnchor` to `speakeasy-api/openapi`'s Schema model + implement dynamic-scope resolution in the generator) spanning two repos. An issue with fixture evidence would be the right opener; the team is responsive but this is a sizable feature with no demonstrated user demand.

## Dependency Chain

```
speakeasy (CLI)
  → github.com/speakeasy-api/openapi v1.23.0           (own OpenAPI parser + Schema model)
  → github.com/speakeasy-api/openapi-generation/v2      (SDK codegen)
  → github.com/pb33f/libopenapi (forked) v0.21.9-fix…   (indirect; used for some operations)
```

- The Schema model in `speakeasy-api/openapi` (`jsonschema/oas3/schema.go`, `jsonschema/oas3/core/jsonschema.go`) exposes `Ref` (`$ref`) but **no `DynamicRef` / `DynamicAnchor` field**. So the keywords are read as unknown/extra properties and surface as validation warnings, then drop out of the schema graph the generator walks.
- Speakeasy does **not** delegate to AJV, `@apidevtools/json-schema-ref-parser`, or Redocly for schema parsing — it uses its own Go parser. (The AJV-derived `$dynamicRef` hits in `internal/defaultcodesamples/out/defaultcodesamples.js` are the embedded code-sample validator, unrelated to SDK schema generation.)
- **Blocked by / Backed by:** neither — the gap is in Speakeasy's own parser, so this is an internal fix, not an upstream-blocked one.

## Current DynamicRef Behavior

Every claim grounded in the Fixture Results or cited source.

- **No crash.** `speakeasy generate sdk` exits 0 on both fixtures and produces a full SDK. (Observed.)
- **Keywords flagged as unknown.** The parser emits `validation warn: … unknown property $dynamicAnchor / $dynamicRef found` for every occurrence. It does not recognize them as JSON Schema 2020-12 keywords. (Observed in generation logs.)
- **Slots degrade to `any`.** `$dynamicRef`-bearing properties are typed `Array<any>` / `z.array(z.any())`. (Observed: `items` in PaginatedUserResponse/GroupResponse; `children` in LocalizedCategory.)
- **Dynamic-binding targets not generated.** `User`/`Group` (the concrete types the `$dynamicAnchor` overrides point at) are absent from the generated models — the binding is never resolved, so those types are never referenced and never emitted as separate models. (Observed: only `paginated-user-response.ts`, `paginated-group-response.ts` in the generic-binding output; no `user.ts`/`group.ts`.)
- **Field-name quirk:** the `items` property emerged as `n` in the generated TS (a generation artifact, possibly a name-collision/normalization issue). Orthogonal to `$dynamicRef` but worth flagging.
- **Source corroboration:** the parser's test suite explicitly blacklists every `dynamicRef.json` case (`jsonschema/oas3/tests/testsuite_test.go:50+`): *"dynamicRef.json tests - all failing due to lack of dynamic reference support."*

## Fixture Results

Empirical (`speakeasy generate sdk -s <fixture> -l typescript -o <out>`, v1.778.0):

| Fixture | OAS | Observed | Verdict |
|---|---|---|---|
| generic-schema-binding | 3.1 | exit 0; warnings: 4× "unknown property `$dynamicAnchor`/`$dynamicRef`"; `items` → `Array<any>`/`z.array(z.any())`; no `User`/`Group` models emitted | UNTYPED |
| recursive-category-tree | 3.1 | exit 0; warnings: 3× "unknown property"; `children` → `Array<any>`/`z.array(z.any())` | UNTYPED |

**Human Review Needed:** none. Output types are directly inspectable. (Multi-language spot-check beyond TS is optional — the gap is at the parser layer, so all languages inherit `any`/`object`/`interface{}`.)

## Relevant Source Map

- `speakeasy-api/openapi: jsonschema/oas3/core/jsonschema.go:12` — `type Schema struct { … Ref marshaller.Node[*string] key:"$ref" … }`. **No** `DynamicRef`/`DynamicAnchor` field.
- `speakeasy-api/openapi: jsonschema/oas3/schema.go:17` — the public `Schema` wrapper; `Ref *references.Reference`; no dynamic-ref analogue.
- `speakeasy-api/openapi: jsonschema/oas3/resolution.go:28-34` — `IsReference()` / resolution logic keys off `Ref` only.
- `speakeasy-api/openapi: jsonschema/oas3/tests/testsuite_test.go:50-70` — `blacklistedTestCases` map: every `dynamicRef.json` entry → `"requires dynamic reference resolution support"`. The documented acknowledgment of the gap.
- `speakeasy: internal/defaultcodesamples/out/defaultcodesamples.js` — bundled AJV-derived validator (code-sample generation only; NOT user-spec SDK generation). Red herring for greps.

## Existing Issues And Prior Art

- **No CLI issues** in `speakeasy-api/speakeasy` mention `$dynamicRef`/`$dynamicAnchor` (search returned 0). No user demand on record.
- **Internal acknowledgment:** the parser's own test-suite blacklist (`testsuite_test.go`) is the prior art — Speakeasy knows dynamic-reference resolution is unimplemented.
- No related PRs or forks with the support identified.

## Failure Modes To Test

- (Reproduced) `$dynamicRef` slot → `any` with "unknown property" warnings — generic-binding, recursive-tree.
- Worth adding for a future PR: pagination/envelope multi-binding (each concrete binding should emit its own materialized model), and recursive self-reference.

## Implementation Plan

The work spans two repos and is parser-first:

1. **`speakeasy-api/openapi`** — add `DynamicRef`/`DynamicAnchor` fields to `core.Schema` and `Schema` (`key:"$dynamicRef"` / `key:"$dynamicAnchor"`); thread them through the reader/marshaller; stop emitting "unknown property" warnings for them.
2. **Dynamic-scope resolution** — implement the 2020-12 dynamic-scope walk in the parser/resolver so `$dynamicRef` resolves against the outermost matching `$dynamicAnchor` in scope. (Unblacklist the `dynamicRef.json` test suite cases as the acceptance gate.)
3. **`speakeasy-api/openapi-generation`** — emit **real generic types** (Orval-modeled), NOT materialized concrete types. Add generic type-parameter support to Speakeasy's CodeDOM (modeled on Orval's `collectGenericParams`/`extractBoundAliasInfo` — see [`analysis/orval-reference.md`](orval-reference.md)). Templates: `class PaginatedTemplate<T>`; bound aliases: `type PaginatedUserResponse = PaginatedTemplate<User>`. Orval proves this lands upstream in a multi-language generator.
4. Tests: unblacklist `dynamicRef.json` in the parser suite; add SDK-level snapshot tests on `fixtures/generic-schema-binding.yaml` asserting `items: T[]` on the template + `type Alias = Template<User>` on bindings.

Phase 1+2 is sizable; Phase 3 is bounded by Orval's precedent.

## Upstream Strategy

1. **Open an issue** in `speakeasy-api/openapi` (not the CLI) referencing the `testsuite_test.go` blacklist and the fixture evidence. The blacklist is the strongest lever — it shows the maintainers already track this as a known gap.
2. Expected acceptance: **Medium.** The team is active and commercial; they may prioritize if it aligns with customer demand. The absence of user issues means it's not yet on their roadmap — an issue + fixture evidence is the way to get it there.
3. A parser PR (add the fields + unblacklist a subset of `dynamicRef.json`) would be the right first contribution — smaller and self-contained than the full generator change.

## Open Questions

- Does Speakeasy's commercial product have private/enterprise demand for `$dynamicRef` that doesn't surface in the public CLI issues? (Unknown; the team would answer this in response to an issue.)
- Is the `items` → `n` field rename a separate generator bug, or related to the `$dynamicRef` schema being malformed from the parser's view? Worth isolating.

## Sources

- CLI: `speakeasy` v1.778.0 (`brew install speakeasy-api/homebrew-tap/speakeasy`)
- CLI source clone: `/tmp/speakeasy` @ `7526194` (2026-06-12)
- Parser source clone: `/tmp/speakeasy-openapi` @ `5b7841f` (2026-06-02)
- Empirical `speakeasy generate sdk` runs on `fixtures/generic-schema-binding.yaml` and `fixtures/recursive-category-tree.yaml` (typescript)
- `jsonschema/oas3/{core/jsonschema.go, schema.go, resolution.go, tests/testsuite_test.go}`
- CLI `go.mod` (`speakeasy-api/openapi v1.23.0`, `openapi-generation/v2`)
