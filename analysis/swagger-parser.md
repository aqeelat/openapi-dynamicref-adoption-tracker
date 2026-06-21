# swagger-parser (Java, Swagger API)

## Summary

`swagger-api/swagger-parser` is the dominant Java OpenAPI parser/resolver/bundler. It **parses `$dynamicRef` and `$dynamicAnchor` into the swagger-core `Schema` model** (the consumer `$dynamicRef` survives end-to-end) and does not crash on any fixture. **However**, the canonical generic-binding anchor-override pattern degrades: `$dynamicAnchor` declarations placed as siblings of `$ref` (the idiom that makes `$dynamicRef` resolve to a concrete override) are **dropped** during parse/resolve, and `$id` is **fully dropped** in all modes. Empirically (`java -jar swagger-parser-cli.jar`, v2.1.44-snapshot): generic-schema-binding goes 3→1 `$dynamicAnchor`, 3→0 `$id`; api-envelope goes 6→3 `$dynamicAnchor`, 2→0 `$id`. Source confirms the mechanism — `ReferenceVisitor.visitSchema` handles `$ref` only (line 150), and `OpenAPI31Traverser.mergeSchemas` (lines 997-1075) copies ~30 named fields but omits `$dynamicRef`/`$dynamicAnchor`/`$id`/`$anchor`. **PR #2332** (open, by `aqeelat`, 2026-05-12, 0 comments) is the scoped fix. Status: **Partial**.

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/swagger-api/swagger-parser |
| Binary built | `swagger-parser-cli.jar` (locally compiled, modules `swagger-parser-v3` + `swagger-parser-cli`) |
| Source commit | `2ce81b1b` (2026-06-15) |
| Latest release | v2.1.44 (2026-06-12) |
| `$dynamicRef` Status | **Partial** |
| Priority | High |
| Blocked by | — (fix lives in this repo; see Open Questions re: swagger-core deserializer) |
| Backed by | — |

## Maintenance And Landing Likelihood

| Indicator | Value |
|---|---|
| Most recent meaningful commit | 2026-06-15 (`2ce81b1b`) |
| Latest release | v2.1.44 (2026-06-12) — regular releases |
| Open issues / PRs | high count; active project |
| Key reviewer | `frantuma` (top committer/reviewer) |
| External PRs merged recently | Yes (e.g. the original `$dynamicRef` parsing PR #2181 by `damian-jankowski`, approved by `frantuma`, merged within a day) |
| Activity level | **Active** — but maintainers explicitly acknowledge slow review (issue #2284, distracted by apidom/swagger-editor) |

Landing likelihood for a well-scoped PR: **Medium-High.** The precedent (PR #2181) was reviewed and merged quickly by `frantuma`. PR #2332 is well-scoped (4 changes, 8 tests, closes a reported crash #2331) but has sat for ~1 month with 0 comments — consistent with the slow-review pattern in #2284. Needs a rebase (currently behind `master`) and a ping.

## Dependency Chain

```
swagger-parser
  → io.swagger.core.v3:swagger-models / swagger-core   (Schema POJO; HAS $dynamicRef/$dynamicAnchor fields — verified)
  → own OAS 3.1 dereferencer (swagger-parser-v3/reference/OpenAPI31Traverser, ReferenceVisitor)
```

- swagger-core's `Schema` model exposes `$dynamicRef`/`$dynamicAnchor` (getter/setter), so the model can represent the keywords. Parsing was wired in by PR #2181 (merged 2025-05-15, released in v2.1.28).
- swagger-parser's **own** OAS 3.1 dereferencer (`reference/` package) is where the loss happens — it does **not** delegate to an external resolver library. So the fix belongs in **this** repo, not upstream. Not blocked by an external tool.
- Open question: swagger-core's **deserializer** may also drop `$ref` siblings during read (OAS 3.0 semantics), which would explain why the drop is identical in `plain` and `-resolve` modes (see Fixture Results). That part would require a swagger-core change; PR #2332 targets the swagger-parser dereferencer layer.

## Current DynamicRef Behavior

Every claim grounded in the Fixture Results or cited source.

- **No crashes** on any of the four fixtures (`exit 0` in plain, `-resolve`, `-resolveFully`, `-flatten`). (Observed.)
- **`$dynamicRef` (the consumer) survives** in all modes and all fixtures (1→1, 3→3). It is never a `$ref` sibling, so it is not subject to the drop. (Observed.)
- **`$dynamicAnchor` override pattern degrades.** Anchors placed as siblings of `$ref` (the anchor-override idiom at the heart of generic binding) are dropped: generic-schema-binding 3→1, paginated-response 3→1, api-envelope 6→3. The surviving anchor in each case is the generic template's own default `$dynamicAnchor`. (Observed.)
- **Anchors on concrete (non-`$ref`) schemas survive** — recursive-category-tree keeps 2→2 because its `$dynamicAnchor` sits on `type: object` schemas. (Observed.)
- **`$id` is fully dropped** in every fixture and every mode (including plain parse). This is a deserialization/serialization gap independent of the dereferencer. (Observed; exact layer not isolated — see Open Questions.)
- **plain ≡ resolve counts** — the anchor drop occurs at parse/deserialize time, not only during explicit `-resolve`. The merge step (`mergeSchemas`) compounds it.
- **No semantic dynamic-scope resolution** is performed — by design for a parser/bundler, but the keyword *preservation* gap above means a resolved spec no longer carries the information needed for downstream dynamic-scope resolution.

### #2332 verification (PR built + fixtures re-run)

PR #2332 (`fix/oas31-dynamicref-id-resolution`, commit `84c1d5c1`) was built (`mvn -pl modules/swagger-parser-cli -am package -DskipTests`) and the CLI re-run on all four fixtures. **Result: counts unchanged from HEAD** — generic 3→1 anchors, api-envelope 6→3, `$id` →0, in both `plain` and `-resolve`. The PR does **not** fix the observed override-anchor loss.

Root cause (confirmed by inspecting the #2332 output): `PaginatedUserResponse`/`PaginatedGroupResponse` collapse to **pure `$ref`** objects (`{$ref: "#/components/schemas/PaginatedTemplate"}`) — their `$id`, `$defs`, and override `$dynamicAnchor` siblings are dropped. This is swagger-core's **`$ref`-replaces-object behavior** (OAS 3.0: sibling properties SHALL be ignored), not lifted for OAS 3.1. The collapse happens at the **deserialization/model level, before `mergeSchemas` runs** — so #2332's `mergeSchemas` copy (`OpenAPI31Traverser.java:1097,1100`) operates on a model where `source.get$dynamicAnchor()` is already `null`.

**#2332's own tests confirm the gap:** they assert `$defs` stashed in *extensions* (line 88) and cover **Pattern A** (recursive — `BaseCategory`, lines 106-116) + `mergeSchemas` field copy (line 128) — all of which pass. But there is **no test for Pattern B** (the `$ref` + `$defs` + override `$dynamicAnchor` generic-binding shape), which is the empirically-failing pattern. Adding a Pattern B test would surface the gap in CI.

**Implication for the PR:** #2332 is correctly scoped to the dereferencer but **insufficient** for the canonical generic-binding pattern. The effective fix requires preserving `$ref` siblings for OAS 3.1 — either a **swagger-core change** (stop collapsing `$ref` schemas to reference-only for 3.1 docs; the OAS 3.1 spec removes the "siblings ignored" restriction) or a deeper swagger-parser change that intercepts before the collapse. With that upstream fix, #2332's `mergeSchemas` copy would become effective.

## Fixture Results

CLI: `java -jar swagger-parser-cli.jar -i <fixture> [-resolve] -yaml -o <out>` (built locally @ `2ce81b1b`). Counts = `$keyword` occurrences in the YAML output vs. the original fixture.

| Fixture | OAS | `$dynamicRef` (orig→out) | `$dynamicAnchor` (orig→out) | `$id` (orig→out) | exit | Verdict |
|---|---|---|---|---|---|---|
| generic-schema-binding | 3.1 | 1→1 | 3→1 | 3→0 | 0 | PARTIAL (override anchors + `$id` lost) |
| paginated-response | 3.1 | 1→1 | 3→1 | 1→0 | 0 | PARTIAL (override anchors + `$id` lost) |
| recursive-category-tree | 3.1 | 1→1 | 2→2 | 2→0 | 0 | PARTIAL (`$id` lost; anchors on concrete schemas survive) |
| api-envelope | 3.1 | 3→3 | 6→3 | 2→0 | 0 | PARTIAL (override anchors + `$id` lost) |

`-resolveFully` multiplies the keywords (e.g. generic: dynamicRef=5, dynamicAnchor=5) — confirming they **are** in the model; the loss is in the dereference/serialize path, not the parser's ability to represent them.

**Human Review Needed:** none. CLI output is fully inspectable.

## Relevant Source Map

- `modules/swagger-parser-v3/src/main/java/io/swagger/v3/parser/reference/ReferenceVisitor.java:148-156` — `visitSchema`: `if (StringUtils.isBlank(schema.get$ref())) return null;` then `resolveSchemaRef(schema, schema.get$ref(), …)`. Handles `$ref` only; `$dynamicRef` is never visited/resolved.
- `modules/swagger-parser-v3/src/main/java/io/swagger/v3/parser/reference/OpenAPI31Traverser.java:997-1075` — `mergeSchemas(source, target)`: enumerates ~30 fields to copy (description, oneOf/anyOf, type(s), format, required, then/if/else, contentSchema, contains, additionalProperties, unevaluatedProperties/Items, prefixItems, properties, patternProperties, pattern, dependentSchemas, const, additionalItems, enum, readOnly, writeOnly, …). **Does not copy `$dynamicRef`, `$dynamicAnchor`, `$id`, or `$anchor`.** Called at line 930 during the OAS 3.1 dereference merge.
- `modules/swagger-parser-cli/` — the CLI (`-i`, `-resolve`, `-resolveFully`, `-flatten`, `-yaml`, `-o`); main class `io.swagger.v3.parser.SwaggerParser`.

## Existing Issues And Prior Art

- **PR #2332** (open, 2026-05-12, `aqeelat`) — *`fix(parser-v3): preserve $dynamicRef/$dynamicAnchor and fix $id scope leak in OAS 3.1 dereferencer`*. The scoped fix for exactly the behavior observed above. 0 comments, behind `master` (needs rebase). Closes:
- **Issue #2331** (the reported crash / data-loss bug).
- **PR #2181** (merged 2025-05-15, `damian-jankowski`, approved by `frantuma`) — the prior PR that added `$dynamicRef`/`$dynamicAnchor` *parsing* (released v2.1.28). Established that external PRs on this topic get reviewed and merged.
- **Issue #2284** — maintainers' acknowledgment of slow review times (focus on apidom/swagger-editor). Explains #2332's dormancy.

## Failure Modes To Test

- (Reproduced) `$dynamicAnchor` beside `$ref` dropped during parse/resolve — generic-binding, paginated-response, api-envelope.
- (Reproduced) `$id` dropped in all modes.
- (Not reproduced on these fixtures) Issue #2331's reported crash when `$id` + `$ref` to `#/components/…` coexist under specific conditions — the 4 fixtures exit 0; the crash may need the #2331 repro.

## Implementation Plan

The smallest useful change is **already drafted in PR #2332**: preserve `$dynamicRef`/`$dynamicAnchor` (and `$id`) through the OAS 3.1 dereferencer merge step. Concretely, extend `mergeSchemas` (and the deserializer's `$ref`-sibling handling) to carry these keywords, gated to OAS 3.1+ so 3.0 behavior is unchanged.

- First PR scope: **pass-through preservation** (keep the keywords through resolve/bundle), not semantic dynamic-scope resolution. That alone unblocks downstream consumers (libopenapi-style tools, validators run on the resolved spec).
- Tests: TestNG; fixtures already live under `src/test/resources/dynamicRef/`. Add a case asserting keyword counts are preserved through `-resolve`.
- Backwards-compat: the change must be version-gated to OAS 3.1+; OAS 3.0 documents keep the existing `$ref`-sibling-drop behavior (per 3.0 spec).

Semantic dynamic-scope resolution is a larger, separate effort and not appropriate to bundle into the preservation PR.

## Upstream Strategy

1. **Rebase PR #2332** onto current `master` (it's behind).
2. **Ping `frantuma`** with a comment referencing PR #2181's quick turnaround and issue #2331's crash. Frame the PR as the natural follow-up to #2181.
3. Expected acceptance: **Medium-High** given the #2181 precedent; main risk is review latency (#2284), not rejection.
4. If the `$id`-drop turns out to originate in swagger-core's deserializer (not swagger-parser), split that into a follow-up issue/PR against swagger-core.

## Open Questions

- Is the `$id` drop (3→0 in all modes) happening in swagger-core's deserializer or swagger-parser's serialization? If the former, a separate swagger-core change is needed; PR #2332 alone may not fully fix `$id`. (Verifying this is the next concrete step.)
- Why does `plain` mode drop the override anchors identically to `-resolve`? Likely swagger-core's deserializer applies `$ref`-replaces-object (OAS 3.0) semantics even for 3.1 docs — needs confirmation.

## Sources

- Binary: `swagger-parser-cli.jar` built locally (`mvn -pl modules/swagger-parser-cli -am package -DskipTests`) @ `2ce81b1b` (2026-06-15)
- Source clone: `/tmp/swagger-parser` @ `2ce81b1b`
- `modules/swagger-parser-v3/src/main/java/io/swagger/v3/parser/reference/ReferenceVisitor.java` (visitSchema, line 148-156)
- `modules/swagger-parser-v3/src/main/java/io/swagger/v3/parser/reference/OpenAPI31Traverser.java` (mergeSchemas, lines 997-1075; call site 930)
- Empirical CLI runs on the four `fixtures/*.yaml` (plain + resolve; resolveFully spot-check)
- PR #2332, Issue #2331, PR #2181, Issue #2284
