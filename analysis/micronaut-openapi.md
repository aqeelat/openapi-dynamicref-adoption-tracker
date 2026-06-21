# Micronaut OpenAPI

## Summary

Micronaut OpenAPI (`micronaut-projects/micronaut-openapi`) is the Java/Micronaut compile-time OpenAPI producer. It is **the highest-leverage `$dynamicRef` producer target in the catalog** and — contrary to the usual "producers are architecturally incompatible" framing — full support is **achievable**, modeled on Orval's proven implementation (`analysis` reference: Orval emits real generic templates `interface PaginatedTemplate<itemType>` + bound aliases `type X = PaginatedTemplate<User>`).

Two facts make Micronaut the right flagship:

1. **The authoring layer already exists.** OAS-3.1-gated `@Schema` annotation properties can set `$dynamicRef`/`$dynamicAnchor`/`$anchor`/`$id` (`SchemaDefinitionUtils.java:2464-2471`), preserved through merges (`SchemaUtils.java:1006-1015`), on swagger-parser-v3 **2.1.28** + swagger-core **2.2.32** (model has the fields). What's missing is **auto-emission**.
2. **Java generics are NOT erased at Micronaut's processing stage.** Micronaut is a compile-time AOT framework: its annotation processor sees `ClassElement.getTypeArguments()` / `getFirstTypeArgument()` (`SchemaDefinitionUtils.java:889,864`) with full generic info intact. The "Java type erasure blocks this" objection does **not** apply. Today Micronaut resolves `T` to a concrete type at each binding site (producing duplicate concrete schemas); the change is to **preserve `T` as a `$dynamicAnchor` and emit `$dynamicRef`** when an opt-in mode is on.

The deliverable: make Micronaut the **first spec producer to auto-generate `$dynamicAnchor`/`$dynamicRef` from language generics** — the inverse of Orval's reader, breaking the "producers can't emit dynamic-ref" wall that Pydantic/FastAPI/tsoa/springdoc all hit.

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/micronaut-projects/micronaut-openapi |
| Source commit | `dee7010` (2026-06-13) |
| Parser/model | `swagger-parser-v3` 2.1.28, `swagger-core` 2.2.32 |
| `$dynamicRef` Status | **Partial** (manual authoring works today; auto-emission from generics = the goal) |
| Priority | **High** |
| Blocked by | — |
| Backed by | swagger-core (model has the fields) |

## Maintenance And Landing Likelihood

| Indicator | Value |
|---|---|
| Most recent commit | 2026-06-13 (`dee7010`) |
| Maintainer | Micronaut team (DataStax / OSS community) |
| Activity level | **Very active** |
| Demand signal | 0 user issues for `$dynamicRef` — but the team proactively added the OAS-3.1 authoring layer and tracks swagger-parser/core bumps (#2134 → 2.1.28, #2126 → 2.2.32). They are pre-invested. |

Landing likelihood for a well-scoped PR: **High.** The team already shipped half the feature (the authoring layer) without being asked, and keeps the parser/model current. A PR that completes the picture — auto-emission from Java generics, opt-in for back-compat — is a flagship differentiator (no other producer does this) that aligns with their OAS-3.1 investment. The main thing to socialize first is the opt-in design (don't change default concrete-resolution behavior).

## Dependency Chain

```
micronaut-openapi
  → io.swagger.parser.v3:swagger-parser v2.1.28   (parses specs incl. $dynamicRef)
  → io.swagger.core.v3:swagger-core v2.2.32        (Schema POJO with $dynamicRef/$dynamicAnchor/$id/$anchor fields)
  → Micronaut annotation processor (compile-time AOT; ClassElement retains generic type info)
```

- swagger-core's `Schema` exposes `get$dynamicRef()`/`set$dynamicRef()` + `get$dynamicAnchor()`/`set$dynamicAnchor()` — Micronaut already reads/writes these (`SchemaDefinitionUtils.java:2464-2471`, `SchemaUtils.java:1006-1015`).
- Micronaut's `ClassElement` (the annotation-processor type model) retains `getTypeArguments()` at processing time — generic parameters are visible, not erased.

## Current DynamicRef Behavior (HEAD)

- **Authorable (OAS 3.1 only).** `SchemaDefinitionUtils.java:2464-2471` (inside `if (isOpenapi31())`): reads `"$dynamicRef"`, `"$dynamicAnchor"`, `"$anchor"`, `"$id"`, `"$schema"`, `"$vocabulary"` from annotation values → `schemaToBind.set$dynamicRef(...)` etc. So a user can author the keywords today.
- **Preserved through merges.** `SchemaUtils.java:1006-1015` copies `$dynamicAnchor`/`$dynamicRef` during schema merge (only if target's field is null); equality check at `:1622`.
- **Not auto-generated.** `SchemaDefinitionUtils.java:864,872,889,929-947` resolve generic `ClassElement` type arguments to concrete types (`getFirstTypeArgument()`, `getTypeArguments()`). `bindSchemaForElement` (`:1171`) binds the resolved concrete schema. No path emits a generic template.
- **Gated to OAS 3.1** for the authoring path.

## The Orval Reference (what "full support" looks like)

Orval (`openapi-ts` monorepo) reads `$dynamicAnchor`/`$dynamicRef` and emits TypeScript generics via two patterns (PR #3353, May 2026):
- **Pattern A — top-level `$dynamicAnchor`** (recursive tree): `$dynamicRef` resolves to the enclosing type → `children: BaseCategory[]` (recursion via the anchor).
- **Pattern B — `$defs` + `$ref` binding** (generic template): a template schema emits `interface PaginatedTemplate<itemType>` (anchor name = type-parameter name); a binding site emits `type PaginatedUserResponse = PaginatedTemplate<User>`.

Orval's key functions: `buildDynamicScope` (per-schema scope map), `resolveDynamicRef` (outermost-anchor lookup + `unknown` fallback), `extractBoundAliasInfo` (the `$ref + $defs` binding detector), `collectGenericParams` (unbound-anchor → type-parameter), `hasScopeAffectedDynamicRef` (cycle-safe materialization guard).

## Implementation Plan — Full Support (Orval-modeled, inverse direction)

Micronaut's job is the **inverse** of Orval: it reads **Java generic types** and **emits** the `$dynamicAnchor`/`$dynamicRef` spec. The two patterns map directly:

### Phase 1 — Opt-in generic-preservation mode
Add a config flag, e.g. `micronaut.openapi.generic-schema-mode: dynamic-ref` (default: `concrete`, today's behavior). When on, the schema visitor preserves generic parameters instead of resolving them.

### Phase 2 — Template emission (Java generic → spec template) — Orval Pattern A + B inverse
In `SchemaDefinitionUtils`/`bindSchemaForElement` (`:1171`), when the visitor encounters a generic type `Foo<T>` in dynamic-ref mode:
1. **Detect the type variable** via `ClassElement.getTypeArguments()` (`:889`). If a type argument is an unresolved `TypeVariable` (not a concrete binding), treat it as a generic slot.
2. **Emit a `$dynamicAnchor`** named after the type variable (sanitized to a valid anchor — mirror Orval's `dynamicAnchorToParamName`): `schemaToBind.set$dynamicAnchor(sanitize(typeVarName))`.
3. **At each usage of `T` inside the template** (e.g. `List<T> items`), instead of resolving `T` to a concrete schema, emit a `$dynamicRef` consumer: `itemsSchema.set$dynamicRef("#" + sanitize(typeVarName))`.

This produces the template (Pattern A for self-recursive generics; Pattern B template shape for `Foo<T>`).

### Phase 3 — Binding emission (parameterized type → spec binding) — Orval Pattern B inverse
When the visitor encounters a **parameterized type** `Foo<User>` at a field/response/parameter site (detected via `ClassElement` with concrete type arguments), emit the binding:
1. Emit a `$ref` to the template (`#/components/schemas/Foo`).
2. Emit a sibling `$defs.<anchorName>` with `$dynamicAnchor: <anchorName>` + `$ref: '#/components/schemas/User'` (the concrete binding).
3. Use the existing merge-preservation path (`SchemaUtils.java:1006-1015`) so the binding survives.

This is exactly the `extractBoundAliasInfo` inverse — Orval detects this shape to *read* it; Micronaut would *write* it.

### Phase 4 — Cycle safety
Mirror Orval's `hasScopeAffectedDynamicRef` + `context.parents` guards: recursive generic templates (`class Tree<T> { List<Tree<T>> children; }`) resolve the `$dynamicRef` to the enclosing template name (Pattern A self-binding), terminating recursion at a named reference rather than re-inlining.

### Phase 5 — Tests
- Generate the four fixtures' shapes from Java generic types; assert the emitted `openapi.json` contains the `$dynamicAnchor`/`$dynamicRef`/binding structure matching each fixture.
- Add a Micronaut integration test modeled on `generic-schema-binding.yaml` (`PaginatedResponse<T>` + `PaginatedResponse<User>`/`<Group>` bindings).
- Back-compat: with `generic-schema-mode: concrete` (default), output is unchanged.

### Scope
This is a **medium-sized, well-bounded feature**, not a research item:
- The generic info is already available (`ClassElement.getTypeArguments()`).
- The authoring + merge paths already exist.
- The Orval reference gives the exact two-pattern architecture + cycle guards to port.
- The change is gated behind an opt-in flag, so zero back-compat risk to the default concrete-resolution path.

## Relevant Source Map

- `openapi/src/main/java/io/micronaut/openapi/visitor/SchemaDefinitionUtils.java:2464-2471` — existing `isOpenapi31()` authoring block (`set$dynamicRef`/`set$dynamicAnchor`/`set$anchor`/`set$id`).
- `openapi/src/main/java/io/micronaut/openapi/visitor/SchemaDefinitionUtils.java:864,872,889,929-947` — generic-type resolution (`getFirstTypeArgument`, `getTypeArguments`). **Where Phase 2 hooks in to preserve `T` instead of resolving it.**
- `openapi/src/main/java/io/micronaut/openapi/visitor/SchemaDefinitionUtils.java:1171` — `bindSchemaForElement`. **Where Phase 3 emits the template/binding.**
- `openapi/src/main/java/io/micronaut/openapi/visitor/SchemaUtils.java:1006-1015,1622` — merge preservation + equality (already handle `$dynamicAnchor`/`$dynamicRef`).
- `openapi/pom.xml` — swagger-parser-v3 2.1.28, swagger-core 2.2.32.

## Existing Issues And Prior Art

- No feature requests for `$dynamicRef` in the Micronaut tracker (only renovate bumps #2134/#2126 — positive signals).
- The authoring capability was added proactively by the team. The Orval PR #3353 (TS ecosystem, May 2026) is the reference implementation proving the generic-emission pattern lands upstream.
- swagger-core's `Schema` model has the fields; swagger-parser-v3 2.1.28 parses them.

## Upstream Strategy

1. **Open a design issue** first framing the opt-in `generic-schema-mode: dynamic-ref`, citing Orval #3353 as the existence proof and the four fixtures as the target shapes. The Micronaut team is pre-invested (they built the authoring layer unprompted), so a concrete design + the Orval precedent should get traction.
2. Follow with an implementation PR scoped to Phases 1-3 (opt-in flag + template emission + binding emission) with fixture-based tests. Default behavior unchanged.
3. Expected acceptance: **High.** Flagship feature (first producer with auto dynamic-ref), aligned with their OAS-3.1 work, opt-in (no back-compat risk), proven pattern (Orval).

## Open Questions

- Anchor-name sanitization for Java: Orval uses the `$dynamicAnchor` value directly as the TS type-parameter name. For Java, do we keep the type-variable name as the anchor (e.g. `PaginatedResponse<itemType>`) or map to conventional `T`/`E`? Keeping the variable name is more faithful and avoids collisions; decide in the design issue.
- Multi-level generics (`Map<K, V>`) → multi-anchor templates: Orval handles multi-parameter (e.g. `ShelterFolderTemplate<folderType, resourceType>`); Micronaut's `getTypeArguments()` returns a map, so this is straightforward.
- Interaction with Micronaut's existing `allOf` inheritance flattening: ensure emitted templates/bindings survive the flattening passes (the merge-preservation path should cover it).

## Sources

- Source clone: `/tmp/micronaut-openapi` @ `dee7010` (2026-06-13)
- `openapi/src/main/java/io/micronaut/openapi/visitor/SchemaDefinitionUtils.java` (2464-2471, 864, 889, 1171), `SchemaUtils.java` (1006-1015, 1622)
- Orval reference: PR [#3353](https://github.com/orval-labs/orval/pull/3353) (implementation map in `~/lab/orval-wt2`)
- Dependency bumps: issues #2134 (swagger-parser-v3 → 2.1.28), #2126 (swagger-core → 2.2.32)
