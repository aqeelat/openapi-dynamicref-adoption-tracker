# Scalar

## Summary

Scalar is a very active, widely-adopted OpenAPI platform (15.2k GitHub stars) comprising an API reference renderer, API client, parser, bundler, mock server, and SDK generator. The entire reference resolution stack (`@scalar/json-magic` bundler, `@scalar/workspace-store` resolve helpers) is **`$ref`-only**: `hasRef()` checks exclusively for `$ref`, the `ReferenceObject` type only models `$ref`, and the `SchemaObject` type includes no `$dynamicRef`/`$dynamicAnchor`/`$id`/`$anchor` fields. Scalar already has `$dynamicRef` context from its internal metaschema AJV workaround (PR #8359), but this is strictly for validating OpenAPI metaschemas — user documents with `$dynamicRef` are silently degraded.

## Status Snapshot

| Field | Value |
|---|---|
| Category | Documentation renderer / API client / parser / mock server |
| Repository | https://github.com/scalar/scalar |
| Packages analyzed | `@scalar/api-reference@1.58.0`, `@scalar/api-client@3.8.1`, `@scalar/openapi-parser@0.28.6`, `@scalar/json-magic@0.12.15`, `@scalar/workspace-store@0.53.0`, `@scalar/mock-server@0.10.16`, `@scalar/schemas@0.3.3` |
| `$dynamicRef` status | **Unsupported** — confirmed via source code audit |
| Version analyzed | Latest `main` branch (commits through Jun 2, 2026); latest release `2026-05-14` |

## Maintenance And Landing Likelihood

| Metric | Value |
|---|---|
| Most recent meaningful commit | Jun 2, 2026 (hanspagel: routing refactor #9395) |
| Latest release | `release-2026-05-14` (May 14, 2026) |
| Open issues | ~59 |
| Open PRs | ~29 |
| Total commits | 6,964 |
| Contributors | 150+ with code-owner review (hanspagel, xC0dex, amritk, hwkr, DemonHa) |
| External PR merge rate | High — external contributions regularly merged (e.g., PR #8359 by petvas, issue #5582 reported by handrews) |
| Activity level | **Very active** — daily commits, multiple releases per week |
| Landing likelihood | **High** |

**Evidence for high likelihood:**

1. Maintainers already understand `$dynamicRef` — PR #8359 demonstrates awareness of the AJV limitation and the need for the workaround.
2. Issue #6617 (opened by char0n from Swagger ApiDOM) shows maintainer engagement with JSON Schema 2020-12 alignment; the issue was resolved.
3. Issue #5582 (opened by handrews, JSON Schema spec editor) about `$ref` sibling handling was fixed with the `mergeSiblingReferences` helper — maintainers are receptive to spec-correctness PRs from community experts.
4. Issue #6715 tracks OpenAPI 3.2 support; `$dynamicRef` is in scope for 3.1+ fidelity.
5. The project has a clear contributing guide, automated CI, changeset-based releases, and CODEOWNERS file.

## Dependency Chain

```
@scalar/api-reference ──► @scalar/workspace-store ──► @scalar/json-magic
       │                         │                           │
       │                         ├─ @scalar/schemas          ├─ pathe, yaml
       │                         ├─ @scalar/openapi-upgrader  │
       │                         ├─ @scalar/validation        │
       │                         └─ @scalar/typebox           │
       │
       ├─► @scalar/oas-utils ──► @scalar/workspace-store
       │
       └─► @scalar/api-client ──► @scalar/workspace-store

@scalar/openapi-parser ──► @scalar/json-magic (bundle + dereference)
       │                     @scalar/openapi-types
       │                     @scalar/openapi-upgrader
       │                     ajv@^8.17.1 ← validates metaschemas
       │                     ajv-draft-04@^1.0.0
       │                     ajv-formats@^3.0.1
       │                     jsonpointer@^5.0.1
       │
       └─ [devDep] @apidevtools/swagger-parser (test only, NOT runtime)

@scalar/mock-server ──► @scalar/json-magic
       │                 @scalar/openapi-parser
       │                 @scalar/workspace-store
       │                 @faker-js/faker
       └─► hono
```

**Key observations:**

- Scalar replaced `@apidevtools/json-schema-ref-parser` with its own `@scalar/json-magic` for all reference resolution. The old parser is only a dev dependency for testing.
- AJV is used only in `@scalar/openapi-parser` for OpenAPI document validation against metaschemas. It does NOT validate user schemas at runtime.
- `@scalar/json-magic` is the **lowest shared layer** — all packages that resolve references go through it.
- The `bundle()` function in `json-magic` has a plugin architecture (loader + lifecycle plugins) that could be extended.

**`$dynamicRef` ignored because traversal only checks `$ref`:** Confirmed. The `hasRef()` guard in `bundle.ts` checks `'$ref' in value` only:

```ts
const hasRef = (value: unknown): value is UnknownObject & Record<'$ref', string> =>
  isObject(value) && '$ref' in value && typeof value['$ref'] === 'string'
```

**Bundling/dereference before rendering:** Yes. The API reference calls `dereference()` from `json-magic` which calls `bundle()` to inline all `$ref` references into an `x-ext` section. `$dynamicRef` nodes pass through unmodified.

**OpenAPI 3.1 dialect preservation:** Partial. Scalar supports OpenAPI 3.1 documents and the `SchemaObject` type includes 2020-12 keywords (`const`, `contentMediaType`, `contentEncoding`, `contentSchema`, `patternProperties`, `propertyNames`, `examples`). However, it does NOT include `$id`, `$anchor`, `$dynamicAnchor`, `$dynamicRef`, or `$recursiveRef`.

## Current DynamicRef Behavior

### Parsing / Preservation

- **`$dynamicRef` is NOT parsed or preserved.** It passes through as a plain JSON string property.
- The `SchemaObject` type in `packages/workspace-store/src/schemas/v3.1/strict/schema.ts` has no `$dynamicRef`, `$dynamicAnchor`, `$id`, or `$anchor` fields. These are silently accepted as unknown properties during type coercion but never used.
- The `ReferenceObject` type in `packages/workspace-store/src/schemas/v3.1/strict/reference.ts` only models `$ref`.

### Semantic Resolution

- **No dynamic-scope resolution exists.** The resolve path is:
  1. `bundle()` in `json-magic` — walks the document, resolves `$ref` only
  2. `dereference()` in `json-magic` — calls `bundle()`, wraps result in a magic proxy
  3. `resolve.schema()` in `workspace-store` — calls `getResolvedRef()` which checks `'$ref' in node`
  4. Schema rendering components consume the resolved store data

- At no point does any Scalar package track `$dynamicAnchor` scopes or attempt to resolve `$dynamicRef` against a dynamic-scope stack.

### Sample / Example Generation

- The request-example builder in `packages/workspace-store/src/request-example/` follows `$ref` to find schema objects. A `$dynamicRef` would be treated as an unknown property, and the dynamically-anchored slot would render as empty/`{}` (from the `not: {}` placeholder).

### Internal Metaschema Workaround vs User-Spec Support

- **Internal workaround:** `packages/openapi-parser/src/schemas/` contains modified OpenAPI metaschemas where `$dynamicRef: "#meta"` is replaced with `$ref: "#/$defs/schema"`. This is documented in `packages/openapi-parser/src/schemas/README.md`. Applied for both v3.1 and v3.2 (PR #8359 extended it to v3.2).
- **User-spec support:** Zero. A user OpenAPI document with `$dynamicRef` in component schemas will have those references completely ignored during resolution.

### Exact Failure Mode

1. **Bundling:** `$dynamicRef` nodes are not discovered by `hasRef()`. They survive as literal `{ "$dynamicRef": "#itemType" }` objects in the bundled output.
2. **Schema rendering:** When the API reference encounters a schema object containing only `$dynamicRef`, it sees no `$ref` to resolve and no `type`/`properties`. The schema renders as an empty object or falls through to a generic display.
3. **Example generation:** The example builder walks the schema tree looking for `type`, `properties`, `items`, etc. A `$dynamicRef` node provides none of these, so the example slot is `null`/`{}`.
4. **Mock server:** Similarly, `@faker-js/faker`-based generation follows the same schema tree. Dynamic slots produce empty values.
5. **No crash or error.** The degradation is **silent** — the `$dynamicRef` keyword is simply ignored as an unrecognized property.

## Relevant Source Map

### Documentation Renderer Paths

| Concern | Source Path |
|---|---|
| Spec loading / parsing | `packages/workspace-store/src/plugins/bundler/` (uses `json-magic` bundle) |
| Bundling / dereference | `packages/json-magic/src/bundle/bundle.ts` — `bundle()` function, `hasRef()` guard |
| Dereference wrapper | `packages/json-magic/src/dereference/dereference.ts` — `dereference()` calls `bundle()` |
| Magic proxy | `packages/json-magic/src/magic-proxy/` — lazy `$ref` resolution via Proxy |
| Schema resolve helper | `packages/workspace-store/src/helpers/get-resolved-ref.ts` — `getResolvedRef()`, `mergeSiblingReferences()` |
| Schema resolve entry | `packages/workspace-store/src/resolve.ts` — `resolve.schema()` |
| Schema types (v3.1) | `packages/workspace-store/src/schemas/v3.1/strict/schema.ts` — `SchemaObject` type |
| Reference types | `packages/workspace-store/src/schemas/v3.1/strict/reference.ts` — `ReferenceObject` type |
| Schema UI components | `packages/api-reference/src/components/Content/Schema/` |
| Example generation | `packages/workspace-store/src/request-example/builder/helpers/get-example-from-schema.ts` |
| OpenAPI metaschemas | `packages/openapi-parser/src/schemas/` — `$dynamicRef` replaced with `$ref` |

### Parser / Resolver Paths

| Concern | Source Path |
|---|---|
| Reference discovery | `packages/json-magic/src/bundle/bundle.ts:hasRef()` — only `$ref` |
| URI / base resolution | `packages/json-magic/src/helpers/resolve-reference-path.ts` |
| `$id` / `$anchor` handling | `packages/json-magic/src/helpers/get-schemas.ts` — `getId()`, `getSchemas()` extract `$id` for local ref conversion, but only for `$ref` resolution |
| Bundle output construction | `packages/json-magic/src/bundle/bundle.ts` — writes to `x-ext` section |
| Circular reference handling | `processedNodes` Set in `bundle()` — prevents re-visiting |

### Key Functions for a Fix

- `hasRef()` in `bundle.ts` — needs to also match `$dynamicRef`
- `getResolvedRef()` in `get-resolved-ref.ts` — needs to handle `$dynamicRef`
- `SchemaObject` type — needs `$dynamicRef`, `$dynamicAnchor`, `$id`, `$anchor` fields
- `ReferenceObject` type — may need a parallel `DynamicReferenceObject`
- `dereference()` — needs dynamic-scope stack

## Existing Issues And Prior Art

### PR #8359: `fix(openapi-parser): replace $dynamicRef with $ref in v3.2 schema for AJV compatibility`

- **Opened by:** petvas (external contributor)
- **Merged by:** hanspagel (maintainer) on Mar 10, 2026
- **Status:** Merged
- **Content:** Replaced 5 occurrences of `"$dynamicRef": "#meta"` with `"$ref": "#/$defs/schema"` in the v3.2 metaschema. Added 3.2 pass/fail tests. Documented the workaround.
- **Significance:** Maintainers are aware `$dynamicRef` exists and that AJV cannot handle it. The fix was accepted quickly and with positive feedback ("ah, cool!" — hanspagel).

### Issue #6617: `OpenAPI 3.1.x parser types not aligned with spec`

- **Opened by:** char0n (Swagger ApiDOM maintainer) on Aug 21, 2025
- **Closed by:** May 5, 2026 (completed)
- **Content:** Pointed out that OpenAPI 3.1 Schema Object should not use `SchemaObject | ReferenceObject` union types because `$ref`, `$dynamicRef`, `$anchor`, `$dynamicAnchor` make schemas self-referencing. Cited OAI/OpenAPI-Specification#4906.
- **Maintainer response:** Types were updated. The `SchemaReferenceType<Value>` pattern was introduced, and `mergeSiblingReferences` was added to handle `$ref` siblings correctly.

### Issue #5582: `Schema references with overlapping sibling keywords not handled correctly`

- **Opened by:** handrews (JSON Schema / OpenAPI specification editor) on May 6, 2025
- **Closed by:** Mar 13, 2026 (completed)
- **Assigned to:** DemonHa, hanspagel
- **Content:** `$ref` with sibling keywords (e.g., `$ref + pattern`) — JSON Schema 2020-12 semantics require both to apply. Scalar only showed the sibling.
- **Fix:** Added `mergeSiblingReferences()` in `get-resolved-ref.ts` which merges sibling properties onto the resolved value. This demonstrates the codebase can be extended for 2020-12 reference semantics.

### Issue #6715: `OpenAPI 3.2`

- **Opened by:** hanspagel (maintainer) on Sep 1, 2025
- **Status:** Open
- **Content:** Tracking issue for OpenAPI 3.2 support across all packages. Lists open tasks including nested tags, 3.2 types, parser support, and testing.

### AJV Issue ajv-validator/ajv#1573

- AJV cannot resolve `$dynamicRef`/`$dynamicAnchor` in nested `$defs`. This is why Scalar's internal metaschemas replace `$dynamicRef` with `$ref`. Any PR that adds user-spec `$dynamicRef` resolution to Scalar would need to handle this without relying on AJV for dynamic-scope resolution.

## Failure Modes To Test

| Fixture | Expected Failure |
|---|---|
| `baseline-duplicated-pagination` | **Should pass** — uses only `$ref` |
| `generic-schema-binding` | `PaginatedTemplate` renders as `{items: [], total: int, page: int, pageSize: int}` — the `$dynamicRef: '#itemType'` resolves to `not: {}` (the placeholder), so `items` is an empty array. `PaginatedUserResponse` and `PaginatedGroupResponse` inherit from template but the `$dynamicAnchor: itemType` in their `$defs` is ignored. |
| `paginated-response` | Same as `generic-schema-binding` but with inline `$defs` at the operation level. The `$dynamicAnchor` bindings in response schemas are ignored. Response schema renders as the raw template with `not: {}` for items. |
| `api-envelope` | Double-wrapping pattern fails at both levels: `data` slot resolves to `not: {}`, and `PaginatedUserItems` also has unresolved `$dynamicRef`. The API reference shows empty `data: {}` objects. |
| `recursive-category-tree` | `BaseCategory.children` uses `$dynamicRef: '#category'` which resolves to `BaseCategory` itself (the anchor definition), not `LocalizedCategory`. Without dynamic scope, recursion resolves to the base template without `displayName`/`locale`. |

## Test Plan

### First Fixtures

1. **`baseline-duplicated-pagination`** — must pass with no regressions. All `$ref` resolution must work identically.
2. **`generic-schema-binding`** — primary target. After fix, `GET /users` response should show `items` as `User[]` (not empty), and `GET /groups` should show `Group[]`.

### Assertions per Fixture

**`generic-schema-binding`:**
- `GET /users` response schema has `items` of type `User` (with `id`, `email` properties)
- `GET /groups` response schema has `items` of type `Group` (with `id`, `name` properties)
- Generated examples include populated user/group objects, not empty arrays
- Schema panel shows concrete properties, not `not: {}`

**`paginated-response`:**
- Same as `generic-schema-binding` but tests inline `$defs` at the operation schema level
- Verifies that dynamic scope is computed from the response schema, not just components

**`api-envelope`:**
- `GET /users/{userId}` response shows `data` as `User` type (with id, email)
- `GET /users` response shows `data` as `PaginatedUserItems` type (with items array of User)
- Double-wrapping resolution works: envelope → pagination → concrete item type

**`recursive-category-tree`:**
- `GET /categories/tree` response shows `LocalizedCategory` with `displayName`, `locale`, AND `children` recursively
- The dynamic scope at `LocalizedCategory` level resolves `#category` to `LocalizedCategory`, not `BaseCategory`

### Automatable vs Manual

- **Automatable:** `$ref`-only regressions (baseline), concrete schema property presence, example field population
- **Requires human review:** Schema panel visual rendering, correct display of dynamic resolution in the UI

### Upstream Test Framework

- **Unit tests:** Vitest (`vitest --run`) in each package
- **E2E tests:** Playwright in `packages/api-reference` (`pnpm test:e2e`)
- **Test locations:**
  - `packages/json-magic/src/bundle/bundle.test.ts`
  - `packages/workspace-store/src/helpers/` (resolve helpers)
  - `packages/api-reference/tests/` (Playwright e2e)

## Implementation Plan

### Smallest Useful Change

**Phase 1: Pass-through preservation (safe first PR)**

1. Add `$dynamicRef`, `$dynamicAnchor`, `$id`, `$anchor` to the `SchemaObject` type in `workspace-store/src/schemas/v3.1/strict/schema.ts`
2. Extend `hasRef()` in `json-magic/src/bundle/bundle.ts` to also match `$dynamicRef`
3. Add `$dynamicRef` awareness to the bundler so it doesn't silently drop these keywords
4. Add a failing test with `generic-schema-binding.yaml` fixture

This phase does NOT implement semantic dynamic-scope resolution. It ensures `$dynamicRef` keywords survive bundling and are available for downstream consumption.

**Phase 2: Local dynamic-scope resolution**

1. Add a dynamic-scope stack to the bundle traversal in `json-magic/src/bundle/bundle.ts`
2. When entering a schema with `$dynamicAnchor`, push to the stack
3. When encountering `$dynamicRef`, resolve against the current stack
4. This handles local (same-document) `$dynamicRef` resolution

**Phase 3: Schema rendering and example generation**

1. Update `getResolvedRef()` to handle `$dynamicRef`
2. Update the schema resolve path in `workspace-store/src/resolve.ts`
3. Verify examples generate correctly with dynamic-scope-resolved schemas

### Where Dynamic-Scope Resolution Should Live

**`@scalar/json-magic`** — this is the lowest shared layer. All packages consume it for reference resolution. Adding dynamic-scope resolution here benefits the API reference, API client, mock server, and SDK generator simultaneously.

### Backwards-Compatibility Risks

- **OpenAPI 3.0 documents:** Must remain unaffected. `$dynamicRef`/`$dynamicAnchor` are 3.1+ only. The resolver should only activate for 3.1+ documents.
- **Ordinary `$ref`:** Must not change. The existing `$ref` resolution path is heavily tested and widely used.
- **Circular references:** The `processedNodes` Set already handles circular `$ref`. Dynamic-scope resolution must integrate with this mechanism.
- **AJV compatibility:** The internal metaschema workaround (replacing `$dynamicRef` with `$ref`) should remain separate from user-spec dynamic-scope resolution.

### First PR Recommendation

Start with a **failing test PR** that:
1. Adds the `generic-schema-binding.yaml` fixture to `json-magic` tests
2. Shows that `$dynamicRef` nodes are not discovered by `hasRef()`
3. Shows that the bundled output drops `$dynamicRef` keywords
4. References PR #8359 and issue #6617 as prior art

This is the smallest contribution that advances the cause and gives maintainers concrete evidence to discuss.

## Upstream Strategy

### Tackle Now

Scalar is an excellent target because:

1. **Very active project** — fast review cycles, frequent releases
2. **Existing context** — maintainers already understand `$dynamicRef` from PR #8359
3. **Spec-aligned culture** — issue #5582 fix shows they care about JSON Schema 2020-12 correctness
4. **Clear dependency chain** — `json-magic` is the single resolver layer; fix it there and all packages benefit

### Start With

A **failing test PR** referencing #8359. Do NOT start with an implementation PR — the scope is too large and the design decisions (dynamic-scope stack location, type system changes) need maintainer buy-in first.

### Expected Acceptance Likelihood

- Failing test PR: **Very high** — low risk, clearly demonstrates the gap
- Phase 1 (pass-through preservation): **High** — small scope, no behavior change for existing docs
- Phase 2 (dynamic-scope resolution): **Medium** — larger change, needs design discussion, but maintainers are receptive

### Downstream Beneficiaries

- `@scalar/api-reference` — correct schema display and examples
- `@scalar/api-client` — correct request/response schema handling
- `@scalar/mock-server` — correct mock response generation
- `@scalar/openapi-to-markdown` — correct schema documentation
- All framework integrations (Next.js, Nuxt, Astro, FastAPI, Hono, NestJS, etc.) inherit the fix

## Open Questions

1. **AJV workaround interaction:** Should Scalar's internal metaschema `$dynamicRef` → `$ref` replacement be removed once `json-magic` supports `$dynamicRef`? Or kept separate since AJV fundamentally cannot handle `$dynamicRef`?
2. **Type system design:** Should `$dynamicRef` share the `ReferenceObject` type (extending `$ref` to be a union) or get its own type? Issue #6617's `SchemaReferenceType` pattern suggests the latter.
3. **External `$dynamicRef`:** Is cross-document `$dynamicRef` resolution in scope for a first PR? The bundler already resolves external `$ref`, but dynamic scope across document boundaries adds complexity.
4. **`$recursiveRef` / `$recursiveAnchor`:** These are deprecated in JSON Schema 2020-12 in favor of `$dynamicRef`/`$dynamicAnchor`. Should Scalar support them for backwards compatibility?
5. **Magic proxy:** The `createMagicProxy()` in `json-magic` lazily resolves `$ref` via Proxy. Can it be extended for `$dynamicRef` without breaking the proxy model?

## Sources

- https://github.com/scalar/scalar (main branch, accessed Jun 4, 2026)
- https://github.com/scalar/scalar/pull/8359 (metaschema $dynamicRef → $ref workaround)
- https://github.com/scalar/scalar/issues/6617 (OpenAPI 3.1 type alignment, char0n)
- https://github.com/scalar/scalar/issues/5582 ($ref sibling keywords, handrews)
- https://github.com/scalar/scalar/issues/6715 (OpenAPI 3.2 tracking)
- `packages/json-magic/src/bundle/bundle.ts` — `hasRef()`, `bundle()` (full source reviewed)
- `packages/json-magic/src/dereference/dereference.ts` — `dereference()` (full source reviewed)
- `packages/workspace-store/src/helpers/get-resolved-ref.ts` — `getResolvedRef()`, `mergeSiblingReferences()` (full source reviewed)
- `packages/workspace-store/src/resolve.ts` — `resolve.schema()` (full source reviewed)
- `packages/workspace-store/src/schemas/v3.1/strict/schema.ts` — `SchemaObject` type (full source reviewed)
- `packages/workspace-store/src/schemas/v3.1/strict/reference.ts` — `ReferenceObject` type (full source reviewed)
- `packages/api-reference/package.json` — dependency chain
- `packages/openapi-parser/package.json` — AJV dependency
- `packages/mock-server/package.json` — dependency chain
- https://github.com/ajv-validator/ajv/issues/1573
- https://www.npmjs.com/package/@scalar/api-reference
- https://www.npmjs.com/package/@scalar/openapi-parser
