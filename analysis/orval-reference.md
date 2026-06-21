# Orval `$dynamicRef` / `$dynamicAnchor` — Reference Implementation Map

Orval (`orval-labs/orval`, in the `openapi-ts` monorepo) is the **reference implementation** for full `$dynamicRef` generic-type emission in an SDK generator. Its support landed in PR [#3353](https://github.com/orval-labs/orval/pull/3353) (May 2026): it emits real generics (`interface PaginatedTemplate<itemType>`) and bound aliases (`type PaginatedUserResponse = PaginatedTemplate<User>`). All 7 fixtures are preserved across all 4 OAS versions.

**This doc is the blueprint for porting the same feature to other generators/producers** (Micronaut, kiota, swift-openapi-generator, Speakeasy, Fern, openapi-typescript, etc.). Read before designing any generic-emission fix.

Source: `~/lab/orval-wt2` (clone). Implementation lives in `packages/core/src/` (+ a parallel walker in `packages/zod/src/index.ts`).

---

## Two dynamic-anchor patterns (the codebase's own terminology)

- **Pattern A** — top-level `$dynamicAnchor` on a schema (recursive-tree / polymorphic-self dispatch).
- **Pattern B** — `$dynamicAnchor` inside a `$defs` entry that also carries a `$ref` (generic-template binding). **This is the pattern that produces generics.**

---

## 1. Reference resolution layer

### 1a. Distinguishing `$dynamicRef` from `$ref`

`packages/core/src/utils/assertion.ts:25-59` — two disjoint guards. `isReference` checks only own-property `$ref`; a `$dynamicRef`-only object is **not** a reference. Separate guard:

```ts
// assertion.ts:35-58
export function isDynamicReference(obj): obj is OpenApiDynamicReferenceObject {
  return !isNullish(obj) && Object.hasOwn(obj, '$dynamicRef') &&
    typeof (obj as Record<string, unknown>).$dynamicRef === 'string';
}
```

Dispatcher: `resolveValue` (`packages/core/src/resolvers/value.ts:159-430`) — checks `isReference` first (line 165), then `isDynamicReference` (line 384). Mutually exclusive.

### 1b. The dynamic-scope walk — `resolveDynamicRef`

`packages/core/src/resolvers/ref.ts:437-521` — `resolveDynamicRef(anchorName, context, imports)`:

1. Look up `context.dynamicScope[anchorName]` (per-schema scope map).
2. **Fallback** (spec-compliant): scan `components.schemas` for a schema whose `$dynamicAnchor === anchorName`; disambiguate by name equality if multiple.
3. If unbound → `{ resolvedTypeName: 'unknown' }`.
4. If `isParameter` → return the generic param name.
5. If concrete → re-resolve via standard `$ref` to pull imports.

**Note:** Orval does **not** implement a true dynamic-scope stack walk (Draft 2020-12 §10.2.2.2). It uses a **flattened, per-component scope map** built once per top-level schema by `buildDynamicScope`. The "outermost" wins because (a) `buildDynamicScope` only inserts entries from the schema's own `$dynamicAnchor` + its own `$defs` (sibling schemas deliberately ignored), and (b) the per-component scope is rebuilt at each schema generation (`schema-definition.ts:331`). This is a **single-frame approximation** — see Limitations (§7).

### 1c. Building the scope — `buildDynamicScope`

`packages/core/src/resolvers/ref.ts:372-431` — walks one schema, returns `Record<string, DynamicScopeEntry>`:

- **Top-level `$dynamicAnchor`** → binds to the schema itself (line 393-395). *(Pattern A self-binding.)*
- **`$defs` entry with `$dynamicAnchor` + `$ref` to a component** → binds the anchor to that referenced component (line 408-410). *(Pattern B binding.)*
- **`$defs` entry with `$dynamicAnchor` but no `$ref`** → unbound → **generic-type-parameter entry** (`isParameter: true`, lines 411-427). Anchor name → TS identifier via `dynamicAnchorsToUniqueParamNames`.

### 1d. Internal type representation

`packages/core/src/types.ts:1194-1210`:

```ts
export interface DynamicScopeEntry {
  name: string;          // generated TS type name (e.g. 'User') or generic param name
  schemaName: string;    // original components.schemas key
  isParameter?: boolean; // true ⇒ unbound generic slot
}
```

Held on `ContextSpec.dynamicScope` (`types.ts:1173-1177`).

---

## 2. Schema → code emission

### 2a. Generic template — `interface PaginatedTemplate<itemType>`

Trigger: `collectGenericParams` (`packages/core/src/generators/schema-definition.ts:196-218`) scans the schema's `$defs` for entries with `$dynamicAnchor` and **no `$ref`** (the unbound-template signal):

```ts
// schema-definition.ts:196-218 (abridged)
function collectGenericParams(schema) {
  const anchors: string[] = [];
  for (const defSchema of Object.values(schema.$defs)) {
    if (defSchema.$dynamicAnchor !== undefined && defSchema.$ref === undefined) {
      anchors.push(defSchema.$dynamicAnchor);
    }
  }
  const uniqueNames = dynamicAnchorsToUniqueParamNames(anchors);
  return anchors.map((anchor) => ({ anchorName: anchor, paramName: uniqueNames.get(anchor) ?? dynamicAnchorToParamName(anchor) }));
}
```

Returned `paramName[]` → `generateInterface` (`schema-definition.ts:336-346`) → `packages/core/src/generators/interface.ts:37-40,65,70`:

```ts
// interface.ts:37-40
const genericSuffix = genericParams?.length > 0 ? `<${genericParams.join(', ')}>` : '';
// interface.ts:70
model += `export interface ${name}${genericSuffix} ${blankInterfaceValue}\n`;
```

**The `$dynamicAnchor` value IS the type-parameter name** — `itemType` in YAML → `<itemType>` in TS. Mapping: `dynamicAnchorToParamName` (`ref.ts:17-25`) sanitizes the anchor to a valid identifier.

### 2b. Bound alias — `type PaginatedUserResponse = PaginatedTemplate<User>`

Detector: `isBoundAlias` (`ref.ts:160-174`) — a `$defs` entry has **both** `$dynamicAnchor` and `$ref`. Then `extractBoundAliasInfo` (`ref.ts:180-295`):

1. Wrapper `$ref`'s target name → `genericName` (e.g. `PaginatedTemplate`).
2. For each `$defs` anchor, resolve the binding `$ref` to its target type (`User`) via `getRefInfo`.
3. Consult the template's own `$defs` for the ordered anchor list + identify unbound slots.
4. For each template anchor: if bound, push the type; if unbound, push the sanitized anchor name + add to `genericParams` (partial binding).

Emission: `schema-definition.ts:245-325`, key line **313**:

```ts
model = `export type ${sanitizedSchemaName}${genericSuffix} = ${genericPart}${nullable};\n`;
//   e.g.  export type PaginatedUserResponse = PaginatedTemplate<User>;
```

For `allOf`-wrapped bindings (Pattern B inside `allOf`): `extractBoundAliasInfo` finds the binding element inside the array, collects other branches as `extraSchemas`, emits an intersection:

```ts
export type ShelterFolder = ShelterFolderTemplate<ShelterFolder, ShelterResource> & { accessLevel: ShelterFolderAccessLevel; };
```

**Inline bindings** (property/response/parameter with `$ref + $defs`): handled in `resolveValue` (`value.ts:165-184`) → produces `ApiEnvelopeTemplate<Pet>` as the resolved response type.

### 2c. Template vs concrete decision (layered, no single predicate)

| Schema shape | Detection site | Outcome |
|---|---|---|
| `$defs` entry: `$dynamicAnchor` + (no `$ref`) | `collectGenericParams` (`schema-definition.ts:196-218`) | `interface Name<param>` |
| `$defs` entry: `$dynamicAnchor` + `$ref` (binding) | `isBoundAlias` (`ref.ts:160-174`) → `extractBoundAliasInfo` | `type Alias = Template<Args>` |
| Top-level `$dynamicAnchor` only (no `$defs`) | `buildDynamicScope` line 393-395 self-binding; `resolveDynamicRef` returns the schema's own name | concrete interface; `$dynamicRef` resolves to self |

### 2d. Anchor name ↔ type-parameter name

**Same string, sanitized.** `dynamicAnchorToParamName` (`ref.ts:17-25`) is the only transform. No synthesized `T`/`E`/`V`. Collision-safe renaming: `dynamicAnchorsToUniqueParamNames` (`ref.ts:27-40`) appends a numeric suffix (`foo_bar`, `foo_bar2`).

---

## 3. Pipeline (end-to-end)

```
importOpenApi
  → filterSpecComponents → collectReferencedComponents (input-filters.ts)   [PR #3579: walk $defs refs]
  → generateSchemasDefinition (schema-definition.ts:40)
      → generateSchemaDefinitions (per schema) (line 220)
          → buildDynamicScope (ref.ts:372)         [seeds context.dynamicScope — the ONLY seeding point]
          → extractBoundAliasInfo? (ref.ts:180)    [Pattern B: bound alias]
          → collectGenericParams (line 196)        [Pattern A/template: generic params]
          → generateInterface (interface.ts:23)    [emits interface X<T>]
          OR resolveValue (value.ts:159)           [walks schema]
              → isReference?  → extractBoundAliasInfo → emit `T<Args>` inline
                              → resolveRef
              → isDynamicReference? → resolveDynamicRef (ref.ts:437)
              → getScalar (scalar.ts:70) → getObject (object.ts) → resolveValue (recurse)
```

Per-schema dynamic-scope seeding at `schema-definition.ts:327-332` is the **only** place `dynamicScope` is populated. Dedup + topological sort: `sortSchemasByDependencies` (`schema-definition.ts:113-180`) orders templates before bound aliases.

---

## 4. Recursion handling (three cooperating guards)

**(a) Self-binding resolves to the schema's own name.** `BaseCategory` generates `scope.category = { name: 'BaseCategory' }`; `children`'s `$dynamicRef: '#category'` → `BaseCategory` (plain name, no re-walk) → `children: BaseCategory[]`.

**(b) `hasScopeAffectedDynamicRef` materialization guard** (`value.ts:62-125`). Walks a referenced schema; returns `true` only when a nested `$dynamicRef` resolves (via current scope) to a name **other than** the enclosing ref's name (self-ref doesn't count). A `WeakSet<object> seen` prevents infinite walks.

**(c) `context.parents` cycle guard.** When materialization fires, pushes `refName` into `context.parents`; next recursion skips if already present.

**(d) Cross-schema collision fix (#3439/#3447).** If `NodeA` and `NodeB` both declare `$dynamicAnchor: 'node'` and reference each other, `value.ts:270-311` filters the colliding anchor from `effectiveContext.dynamicScope` before recursing (unless via `allOf`).

---

## 5. Multi-parameter generics

Fully supported. `dynamicAnchorsToUniqueParamNames` returns `Map<anchor, paramName>`; iteration follows `$defs` insertion order. Showcase: `interface ShelterFolderTemplate<folderType, resourceType>` + `type ShelterFolder = ShelterFolderTemplate<ShelterFolder, ShelterResource> & {...}`. **Partial binding:** `type PartiallyBoundPair<cursorType> = PairTemplate<User, cursorType>`.

---

## 6. Test coverage

| File | Scope |
|---|---|
| `packages/core/src/resolvers/dynamic-ref.test.ts` (865 lines) | `buildDynamicScope` + `resolveDynamicRef` unit tests |
| `packages/core/src/resolvers/ref.test.ts:240-706` | `extractBoundAliasInfo`, `dynamicAnchorsToUniqueParamNames`, collisions |
| `packages/core/src/resolvers/value.test.ts:139-612` | `resolveValue` with `$dynamicRef` (materialization, parents guard, inline bound alias) |
| `packages/core/src/generators/dynamic-ref.test.ts` (1080 lines) | End-to-end `generateSchemasDefinition` for all 4 patterns |
| `samples/dynamic-ref/`, `samples/paginated-response-tags-split/` | Showcase specs + per-file snapshots |

---

## 7. Limitations (what Orval does NOT cover)

1. **External `$dynamicRef`** (`other.json#anchor`) → rejected → `unknown` (`value.ts:387-389`).
2. **No true dynamic-scope stack.** One scope frame per top-level component. Deeply nested multi-level overrides may not resolve per-spec.
3. **Ambiguous anchors → `unknown`** when multiple schemas declare the same `$dynamicAnchor` and none matches by exact name.
4. **`$dynamicAnchor` on non-`schemas` components** (responses, parameters) partially ignored.
5. **Parameter-name shadowing** not detected (anchor sanitizes to `User` + real `User` schema exists → shadow).
6. **Zod/mock walker is separate** (`packages/zod/src/index.ts` reimplements scope resolution).

---

## Porting notes (for other generators/producers)

- **Anchor name = type-parameter name** is deliberate (preserves spec-author intent). Java/Swift/Go can keep the anchor name or map to conventional `T`/`E` — defensible either way.
- **Pattern A vs Pattern B split is the central architectural decision.** Detect these EARLY (parse/schema-walk phase) to avoid special-casing in the type-emission phase.
- **`buildDynamicScope` is per-schema, not global.** Avoids cross-talk; matches per-type codegen models.
- **`hasScopeAffectedDynamicRef` is the subtlest piece** — decides inline-vs-reference. For Java: "if the referenced type's shape would change under the current dynamic scope, generate a fresh synthetic subclass." Java can't express anonymous intersection types inline like TS — emit a generated class name instead.
- **External `$dynamicRef` + true dynamic-scope stacks are unimplemented in Orval.** A port may match these (documented) limitations or invest in full Draft 2020-12 compliance.

**Single-line architecture summary:** `buildDynamicScope` per schema seeds `Record<anchor, {name, schemaName, isParameter}>`; `resolveDynamicRef` consults it (spec-fallback scan, `unknown` for ambiguity); `extractBoundAliasInfo` recognizes the `$ref + $defs` binding → `{genericName, typeArgs, genericParams}`; `collectGenericParams` recognizes unbound anchors → type parameters; `resolveValue` ties it together with cycle-safe materialization via `hasScopeAffectedDynamicRef` + `context.parents`.
