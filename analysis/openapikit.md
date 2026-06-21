# OpenAPIKit (mattpolzin)

## Summary

OpenAPIKit is the Swift OpenAPI document model — the parser/AST layer used by Apple's `swift-openapi-generator` (and other Swift OpenAPI tooling). It has **partial `$dynamicRef` support at HEAD**: it parses and preserves `$anchor` and `$dynamicAnchor` (landed in #360, 2024-03-27), but does **not** yet parse `$dynamicRef` — the keyword is dropped with a validation warning (*"Found nothing but unsupported attributes"*), and the consumer schema decodes as an empty non-reference.

**This is actively being fixed.** PR [**#501**](https://github.com/mattpolzin/OpenAPIKit/pull/501) — *"feat: support `$dynamicRef` / `$dynamicAnchor` (JSON Schema 2020-12)"* — by `aqeelat` (opened 2026-06-15, 7 files, 2 commits, `mergeable=unstable`, in progress) adds `$dynamicRef` to the `JSONSchema` AST. It is the single gating dependency that unblocks `swift-openapi-generator` #547, and the maintainer (`mattpolzin`) has explicitly invited help on this exact feature (#359). Once #501 lands and ships, OpenAPIKit flips to **Correct** (parse/preserve; semantic dynamic-scope resolution would follow either here or in the consumer).

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/mattpolzin/OpenAPIKit |
| Version analyzed (HEAD) | 6.2.0 (resolved via SPM) |
| Source commit | `57b631812` (2026-05-14) |
| `$dynamicRef` Status | **Partial** at HEAD (`$anchor`/`$dynamicAnchor` parsed; `$dynamicRef` pending **#501**) |
| Priority | High |
| Active PR | [#501](https://github.com/mattpolzin/OpenAPIKit/pull/501) (aqeelat, in progress) |
| Blocked by | — |
| Backed by | — |

## Maintenance And Landing Likelihood

| Indicator | Value |
|---|---|
| Most recent commit | 2026-05-14 (`57b631812`) |
| Maintainer | Matt Polzin (`mattpolzin`) — sole maintainer |
| Activity level | Active (6.x line) |
| Tracking issue | [#359](https://github.com/mattpolzin/OpenAPIKit/issues/359) (open) |

Landing likelihood for #501: **High.** `mattpolzin` opened #359 himself, explored the implementation, and explicitly invited collaboration (*"I'd like to make sure to extend an invitation for help"*). The sole open question he raised was AST shape / breaking-change timing — #501 is the concrete answer to that. The remaining work is review/merge and (likely) aligning on a major-version bump.

## Dependency Chain

```
OpenAPIKit
  → OpenAPIKitCore (CoreContext, JSONTypeFormat, JSONReference)
  → Yams (YAML decoding; consumer-supplied)
```

OpenAPIKit is the foundation — no upstream parser to inherit from. The work belongs here. Consumers: `apple/swift-openapi-generator` (blocked on this — see `analysis/swift-openapi-generator.md`).

## Current `$dynamicRef` Behavior (HEAD, pre-#501)

Empirically verified via a probe built against OpenAPIKit 6.2.0 (decoded `fixtures/recursive-category-tree.yaml` + `fixtures/generic-schema-binding.yaml`):

- **`$anchor` / `$dynamicAnchor`: parsed/preserved.** `JSONSchema.anchor` / `JSONSchema.dynamicAnchor` (`JSONSchema.swift:241-247`), backed by `coreContext`; threaded through factory methods (`1184+`) and `DereferencedJSONSchema.dynamicAnchor` (`DereferencedJSONSchema.swift:141`). Added by #360. (Observed: `BaseCategory.dynamicAnchor == "category"` survives decode.)
- **`$dynamicRef`: NOT parsed (pre-#501).** No `dynamicRef` field in `Sources/` at HEAD; the decoder warns *"Found nothing but unsupported attributes"* and the consumer schema decodes as an empty non-reference. (Observed: the `children`/`items` `$dynamicRef` consumer decodes non-reference with `anchor=nil dynamicAnchor=nil`.)
- **No semantic dynamic-scope resolution.** A document model's job is parse/preserve; resolution belongs in the consumer (or a future OpenAPIKit helper).

**#501 changes this:** it adds the `$dynamicRef` AST node + decoding, so post-merge the keyword survives decode and becomes visible to `swift-openapi-generator`.

## Fixture Results (HEAD, pre-#501)

| Fixture | Keyword | Observed | Verdict |
|---|---|---|---|
| recursive-category-tree | `$dynamicAnchor` on `BaseCategory`/`LocalizedCategory` | survives decode (`"category"`) | PRESERVED |
| recursive-category-tree | `$dynamicRef` on `children.items` | decodes as non-reference empty schema | STRIPPED (until #501) |
| generic-schema-binding | `$dynamicRef` on `items.items` | decodes as non-reference empty schema | STRIPPED (until #501) |

**Human Review Needed:** re-run the probe against the #501 branch to confirm `$dynamicRef` survives decode post-merge.

## Relevant Source Map

- `Sources/OpenAPIKit/Schema Object/JSONSchema.swift:241-247` — `anchor` / `dynamicAnchor` (backed by `coreContext`).
- `Sources/OpenAPIKit/Schema Object/JSONSchema.swift:1183+` — factory methods accept `anchor`/`dynamicAnchor`.
- `Sources/OpenAPIKit/Schema Object/DereferencedJSONSchema.swift:141` — `dynamicAnchor` on the dereferenced view.
- **Gap (pre-#501):** no `dynamicRef` field. **#501** adds it — review the PR diff for the chosen AST shape (likely a new case/property mirroring `JSONReference`).

## Existing Issues And Prior Art

- **[#359](https://github.com/mattpolzin/OpenAPIKit/issues/359)** (open, 2024-03-18) — the tracking issue. `mattpolzin` (2024-11-01): *"In preparation for a v4.0.0 release, I am bumping this issue to the v5.x milestone."*
- **[#360](https://github.com/mattpolzin/OpenAPIKit/issues/360)** (closed/merged 2024-03-27) — landed `$anchor` + `$dynamicAnchor` (half of #359).
- **[#501](https://github.com/mattpolzin/OpenAPIKit/pull/501)** (open, in progress, `aqeelat`) — the `$dynamicRef` implementation. Closes #359.
- Cross-repo: `apple/swift-openapi-generator#547` is blocked on this; landing #501 unblocks it.

## Implementation Plan

#501 is the implementation. For completeness, the design considerations it resolves (and any follow-up):

1. **AST shape** — new `.dynamicReference` enum case (clean, breaking) vs. `dynamicRef: String?` field (less breaking). #501 picks one; align with the maintainer on major-version timing.
2. **Decoding** — recognize `$dynamicRef` in the schema decoder (stop emitting "unsupported attributes").
3. **Serialization** — encode `$dynamicRef` back out.
4. **`DereferencedJSONSchema`** — carry the raw keyword through dereferencing (OpenAPIKit doesn't resolve dynamic scope, but shouldn't drop the keyword).
5. **Tests** — JSON-Schema-Test-Suite `dynamicRef.json` cases; round-trip encode/decode tests mirroring the existing `$dynamicAnchor` tests.

Semantic dynamic-scope resolution is **out of scope** for OpenAPIKit (it's a document model) — that belongs in the consumer (`swift-openapi-generator`), which is the next step after #501 lands.

## Upstream Strategy

1. **Land #501** (yours). Work with `mattpolzin` on the AST-shape / major-version question if he raises it in review.
2. Once merged + shipped, flip this row to **Correct** and move `swift-openapi-generator` from Blocked → Ready (its next step becomes the generator-side generic emission, Orval-modeled — see `analysis/swift-openapi-generator.md`).
3. Expected acceptance: **High** — maintainer-invited, addresses #359 directly.

## Open Questions

- Does #501 preserve `$dynamicRef` through `DereferencedJSONSchema`, or only at the raw `JSONSchema` layer? (Affects whether consumers can see it post-dereference.)
- Major-version timing: does `mattpolzin` want #501 gated to v7.x (breaking) or backported? Resolved in PR review.

## Sources

- Version: OpenAPIKit 6.2.0 (resolved via SPM in a probe package)
- Source: `/tmp/swift-gen-test/.build/checkouts/OpenAPIKit` @ `57b631812` (2026-05-14)
- Empirical probe: decoded `fixtures/recursive-category-tree.yaml` + `fixtures/generic-schema-binding.yaml` via `YAMLDecoder` + `OpenAPI.Document`
- PR [#501](https://github.com/mattpolzin/OpenAPIKit/pull/501) (aqeelat, in progress); issues [#359](https://github.com/mattpolzin/OpenAPIKit/issues/359), [#360](https://github.com/mattpolzin/OpenAPIKit/issues/360)
- Cross-ref: `apple/swift-openapi-generator#547`
