# swift-openapi-generator (Apple)

## Summary

Apple's official Swift OpenAPI generator (a SwiftPM build plugin). It has **no `$dynamicRef`/`$dynamicAnchor` support**, and the gap is **explicitly blocked upstream on OpenAPIKit**. Empirically (`swift build` on `generic-schema-binding.yaml`): the build succeeds (no crash) but OpenAPIKit emits a validation warning — *"Found nothing but unsupported attributes"* — at the `$dynamicRef` slot (`components.schemas.PaginatedTemplate.properties.items.items`), and the generator emits `items: [OpenAPIRuntime.OpenAPIValueContainer]` (Swift's untyped `Any`-equivalent). Issue **#547** (open, 2024-03-18, `brandonbloom`) requests exactly this feature; Apple maintainer `czechboy0` marked it **"blocked, until the OpenAPIKit support is landed"**, and OpenAPIKit maintainer `mattpolzin` confirms he has "work ahead of me just to properly represent `$dynamicRef` in the AST of OpenAPIKit." The generator itself has zero references to the keywords.

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/apple/swift-openapi-generator |
| Plugin version resolved | `swift-openapi-generator` 1.12.2 (via SPM) |
| Source commit | `a6e5a84` (2026-06-05) |
| `$dynamicRef` Status | **No support** |
| Priority | Medium |
| Blocked by | OpenAPIKit |
| Backed by | — |

## Maintenance And Landing Likelihood

| Indicator | Value |
|---|---|
| Most recent commit | 2026-06-05 (`a6e5a84`) |
| Open issues | 134 |
| GitHub stars | 1929 |
| Maintainers | Apple (`czechboy0` / Honza Dvorsky et al.); document model by `mattpolzin` (OpenAPIKit) |
| Activity level | **Active** — Apple-maintained, regular releases |
| Tracking issue | [#547](https://github.com/apple/swift-openapi-generator/issues/547) (open, marked blocked) |

Landing likelihood for a well-scoped PR: **Medium.** Apple and the OpenAPIKit maintainer are mutually engaged on #547 and have already sketched the path (OpenAPIKit AST representation first → generator emits generic types or materialized concrete types). The conversation stalled after 2024-04, but all parties are aligned on the approach. The first concrete contribution belongs in **OpenAPIKit** (represent `$dynamicRef`/`$dynamicAnchor` in the `JSONSchema` AST); the generator-side change follows once that lands.

## Dependency Chain

```
swift-openapi-generator (SwiftPM plugin)
  → mattpolzin/OpenAPIKit v6.1.0+ (OpenAPI document model: JSONSchema, JSONReference)   ← the blocker
  → apple/swift-openapi-runtime (generated-code runtime; provides OpenAPIValueContainer)
  → jpsim/Yams (YAML)
```

- The generator consumes OpenAPIKit's `JSONSchema` / `JSONReference`. OpenAPIKit's `JSONSchema` AST **does not yet represent `$dynamicRef`/`$dynamicAnchor`** (confirmed empirically: OpenAPIKit warns "unsupported attributes" when it encounters `$dynamicRef`; confirmed by maintainer comment on #547).
- Because the parser layer drops the keyword, the generator never sees it — the schema arrives as an empty/untyped object and the generator emits `OpenAPIValueContainer`.
- **Blocked by** OpenAPIKit. Not backstopped by any Correct upstream.

## Current DynamicRef Behavior

Every claim grounded in the Fixture Results or cited source/issue.

- **No crash; build succeeds.** `swift build` completes; the generator produces `Types.swift` / `Client.swift` / `Server.swift`. (Observed.)
- **OpenAPIKit warning at the `$dynamicRef` slot.** *"Validation warning: Problem encountered when parsing `OpenAPI Schema`: Found nothing but unsupported attributes."* at `codingPath=.components.schemas.PaginatedTemplate.properties.items.items`. (Observed in build log.)
- **Slot degrades to `OpenAPIValueContainer`.** `public var items: [OpenAPIRuntime.OpenAPIValueContainer]` — Swift's untyped value container (the runtime's `Any`-equivalent for unknown JSON). (Observed in generated `Types.swift`.)
- **Zero keyword awareness in the generator.** No `dynamicRef`/`$dynamic`/`$anchor`/`$id` references anywhere under `Sources/`. (Source grep.)
- **No semantic dynamic-scope resolution** — by construction (the keyword never reaches the generator).

## Fixture Results

Empirical (minimal Swift package + `swift-openapi-generator` 1.12.2 plugin; `swift build` on the fixture):

| Fixture | OAS | Observed | Verdict |
|---|---|---|---|
| generic-schema-binding | 3.1 | build OK; OpenAPIKit warning "unsupported attributes" at `items.items`; generated `items: [OpenAPIValueContainer]` (should be `User`/`Group`) | UNTYPED |

`recursive-category-tree` / `api-envelope` not run individually — the behavior is determined at the OpenAPIKit parse layer, so all fixtures will degrade identically (`$dynamicRef` → `OpenAPIValueContainer`).

**Human Review Needed:** none. Generated Swift is directly inspectable.

## Relevant Source Map

- `Sources/_OpenAPIGeneratorCore/Translator/CommonTranslations/translateAllAnyOneOf.swift` and `Sources/_OpenAPIGeneratorCore/Extensions/OpenAPIKit.swift` — the generator consumes OpenAPIKit's `JSONSchema` / `n<JSONSchema>`; no dynamic-ref branch exists.
- `Package.swift:49` — `.package(url: "https://github.com/mattpolzin/OpenAPIKit", from: "6.1.0")` (the blocker dependency).
- The `$dynamicRef` keyword is dropped at the OpenAPIKit decode step (inside `JSONSchema`'s `Decodable` conformance, not in this repo) — the generator only sees the resulting empty schema.

## Existing Issues And Prior Art

- **#547** (open, 2024-03-18, `brandonbloom`) — *"Support `$dynamicAnchor` and `$dynamicRef`"*. The canonical tracking issue. Key comments:
  - `czechboy0` (Apple, 2024-03-18): *"I'll mark this one as blocked, until the OpenAPIKit support is landed."*
  - `mattpolzin` (OpenAPIKit, 2024-03-18→04-02): began exploring it; *"I've got work ahead of me just to properly represent `$dynamicRef` in the AST of OpenAPIKit."*
  - `czechboy0`: suggests focusing on the minimal `List<T>` / generic-pages use case first.
  - `brandonbloom`: motivates with a generic pagination container.
  - Discussion stalled after 2024-04-02; no implementation PR on either side.
- No PRs (generator or OpenAPIKit) implement this yet.

## Failure Modes To Test

- (Reproduced) `$dynamicRef` slot → `OpenAPIValueContainer` + OpenAPIKit "unsupported attributes" warning.
- Worth adding for the eventual fix: `recursive-category-tree` (recursive self-reference) and `api-envelope` (nested generics) to cover the cases the #547 discussion identified.

## Implementation Plan

Sequenced across two repos:

1. **OpenAPIKit** (`mattpolzin/OpenAPIKit`) — **your [PR #501](https://github.com/mattpolzin/OpenAPIKit/pull/501)** adds `$dynamicRef` to the `JSONSchema` AST (in progress, 7 files, `mergeable=unstable`). This is the gating prerequisite — once it lands, the "unsupported attributes" warning disappears and the keyword reaches the generator.
2. **swift-openapi-generator** — once #501 lands, emit **Swift generic types** (NOT materialize concrete). Modeled on Orval (see [`analysis/orval-reference.md`](orval-reference.md)):
   - **Pattern A** (recursive): resolve `$dynamicRef` to the enclosing type → `var children: [BaseCategory]`.
   - **Pattern B** (generic template): emit `struct PaginatedTemplate<itemType> { var items: [itemType] }` + bound aliases `typealias PaginatedUserResponse = PaginatedTemplate<User>`. The `$dynamicAnchor` value IS the type-parameter name (Orval's deliberate choice).
   - The CodeDOM changes are bounded — add a `genericParameters` field to the Swift type emitter, mirroring Orval's `interface.ts:37-40` generic suffix.
3. Tests: generator snapshot tests under `Tests/` on the four fixtures; OpenAPIKit JSON-Schema-Test-Suite cases for `dynamicRef.json`.

Phase 1 (#501) is yours and in progress. Phase 2 follows once #501 lands + ships.

## Upstream Strategy

1. **Land #501** (yours) — the keystone. Review with `mattpolzin` on AST shape / major-version timing.
2. Once #501 ships, the generator-side change follows — #547 already has Apple buy-in on the generic-type approach (`czechboy0` explicitly suggested generics).
3. Expected acceptance: **High** for #501 (maintainer-invited); **Medium-High** for the generator-side generic emission (pre-agreed in #547, Orval is the existence proof).

## Open Questions

- Does #501 preserve `$dynamicRef` through `DereferencedJSONSchema`, or only at the raw `JSONSchema` layer? (Affects whether consumers can see it post-dereference.)
- Major-version timing: does `mattpolzin` want #501 gated to v7.x (breaking) or backported? Resolved in PR review.

## Sources

- Plugin: `swift-openapi-generator` 1.12.2 (resolved via SPM in a minimal consumer package)
- Source clone: `/tmp/swift-oag` @ `a6e5a84` (2026-06-05)
- Empirical `swift build` on `fixtures/generic-schema-binding.yaml` (generated `Types.swift` inspected; OpenAPIKit warning captured)
- Issue [#547](https://github.com/apple/swift-openapi-generator/issues/547) + comments (`czechboy0`, `mattpolzin`, `brandonbloom`)
- `Package.swift` (OpenAPIKit 6.1.0 dependency)
