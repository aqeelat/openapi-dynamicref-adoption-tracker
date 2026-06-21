# ibm-openapi-validator

## Summary

`lint-openapi` (ibm-openapi-validator) is a Spectral-based OpenAPI linter. It **parses** OpenAPI 3.1 specs containing `$dynamicRef`/`$dynamicAnchor`/`$id` without any "unknown keyword" errors, and does not crash. **However**, its `no-$ref-siblings` rule is **deliberately extended to run on OpenAPI 3.1** (a conscious choice in PR #635, 2023), so the canonical generic-binding pattern — `$dynamicAnchor` / `$id` placed next to `$ref` — is reported as an **error and the run exits non-zero**. 3 of 4 fixtures fail this way; the recursive fixture passes because its `$dynamicAnchor` sits on a concrete `type: object` schema, not beside a `$ref`. Backed by Spectral (Correct) for keyword parsing; the gap is IBM's overlay rule, not the parser. Workaround: disable `no-$ref-siblings`.

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/IBM/openapi-validator |
| Package / binary | `ibm-openapi-validator` v1.37.14 / `lint-openapi` |
| Source commit | `dad9cba` (2026-05-28) |
| `$dynamicRef` Status | **Partial** |
| Priority | Medium |
| Blocked by | — |
| Backed by | Spectral |

## Maintenance And Landing Likelihood

| Indicator | Value |
|---|---|
| Most recent meaningful commit | 2026-05-28 (`dad9cba`) |
| Latest release | `ibm-openapi-validator@1.37.14` (2026-05-20) |
| Open issues | 22 |
| GitHub stars | 626 |
| Maintainers | IBM team (`dpopp07`, `padamstx`, `mcbdcc`) |
| Activity level | **Active** — regular monthly releases |

Landing likelihood for a well-scoped PR: **Low–Medium.** PR #635 *intentionally* extended `no-$ref-siblings` to OAS 3.1 despite the contributor noting ref siblings are allowed in 3.1. A PR that relaxes the rule for JSON Schema 2020-12 keywords (`$dynamicAnchor`/`$id`/`$defs`) would directly revisit a deliberate decision, so it would need a strong rationale (e.g., "IBM style should permit the standard 3.1 generic-binding idiom"). The maintainers are engaged, so a discussion-first issue is the right opener.

## Dependency Chain

```
lint-openapi (ibm-openapi-validator)
  → @stoplight/spectral-core / spectral rules    (parses OAS 3.1; Spectral is Correct spec-level)
  → ibm-oas ruleset overlay (packages/ruleset/src/ibm-oas.js)
        - deliberately re-formats Spectral's 'no-$ref-siblings' to run on oas3 (incl. 3.1)
```

The parser is Spectral, which already treats `$dynamicRef`/`$dynamicAnchor` as valid JSON Schema keywords. ibm-openapi-validator inherits that Correctness, then **adds** the `no-$ref-siblings`-on-3.1 enforcement on top. The gap is therefore IBM's overlay, not an upstream Spectre/Spectral defect. **Backed by** Spectral (Correct).

## Current DynamicRef Behavior

Every behavioral claim below is grounded in the Fixture Results or cited source.

- **Parsing: accepts the keywords.** No "unknown property" / "invalid keyword" messages for `$dynamicRef`, `$dynamicAnchor`, `$id`, `$defs`. The validator recognizes them. (Observed: Fixture Results — the error messages are about `$ref` siblings, not about unknown keywords.)
- **No crash.** Every fixture produces a lint report; none abort.
- **`no-$ref-siblings` rejects the generic-binding pattern.** Any schema that places `$dynamicAnchor` (or `$id` / `$defs`) next to a `$ref` is flagged: *"`$ref` must not be placed next to any other properties"* (rule `no-$ref-siblings`). This is the **anchor-override idiom** at the heart of `$dynamicRef` generic binding (`$dynamicAnchor: x` sibling to `$ref: '#/components/schemas/Concrete'`), so 3 of the 4 fixtures exit non-zero.
- **The recursive pattern passes.** A `$dynamicAnchor` on a concrete `type: object` schema and a `$dynamicRef` consumer (no `$ref` sibling) does not trigger the rule — recursive-category-tree exits 0.
- **Deliberate, documented behavior.** Source comment at `packages/ruleset/src/ibm-oas.js:10-14` states Spectral scopes `no-$ref-siblings` to 3.0 (because ref siblings are legal in 3.1) and that IBM **overrides** this to also run on 3.1. Introduced by PR #635. So this is policy, not an oversight.

## Fixture Results

Run with `lint-openapi fixtures/<f>.yaml` (v1.37.14). Exit code is the validator's (`0` = no errors, `1` = ≥1 error).

| Fixture | OAS version | Observed | Verdict |
|---|---|---|---|
| generic-schema-binding | 3.1 | exit 1; 6 errors, all `no-$ref-siblings` on `$dynamicAnchor`/`$id`/`$defs` beside `$ref` in `PaginatedUserResponse` / `PaginatedGroupResponse` | PARTIAL (rule rejects pattern) |
| paginated-response | 3.1 | exit 1; 4 errors, all `no-$ref-siblings` on `$dynamicAnchor` beside `$ref` in response `$defs` | PARTIAL (rule rejects pattern) |
| recursive-category-tree | 3.1 | exit 0; 0 errors, 4 warnings (style only) | PRESERVED |
| api-envelope | 3.1 | exit 1; 6 errors, all `no-$ref-siblings` on `$dynamicAnchor` beside `$ref` | PARTIAL (rule rejects pattern) |

**Human Review Needed:** none.

**Workaround (verified by rule configuration):** set `'no-$ref-siblings': off` (or `warn`) in `.validaterc` / a custom ruleset. With the rule off, the keywords pass through and the spec lints without those errors.

## Relevant Source Map

- `packages/ruleset/src/ibm-oas.js:10-14` — the deliberate override: `oas.rules['no-$ref-siblings'].formats = [oas3];` with the explanatory comment that ref siblings are allowed in 3.1 but IBM enforces anyway.
- `packages/ruleset/src/ibm-oas.js:64` — `'no-$ref-siblings': true` (enabled in the IBM ruleset).
- The validator itself consumes Spectral rules; keyword recognition comes from Spectral (Correct).

## Existing Issues And Prior Art

- **#635** (closed, 2023-09-27, `padamstx`) — *`feat(no-$ref-siblings): modify rule to also run on OpenAPI 3.1.x documents`*. This is the change that produced today's behavior. The PR description acknowledges ref siblings are valid in 3.1 but IBM chose to enforce regardless.
- **#437** (closed, 2022-04-25, `padamstx`) — *`feat: enable spectral:oas 'no-$ref-siblings' rule`*. Original enablement.
- No open issue specifically asks to relax the rule for `$dynamicAnchor` / JSON Schema 2020-12 siblings. (A search of the tracker surfaced only the above plus unrelated items.)

## Failure Modes To Test

- A spec using the generic-binding pattern (`$dynamicAnchor` sibling to `$ref`) → currently errors. (Reproduced on 3 fixtures.)
- A spec using `$dynamicRef` + `$dynamicAnchor` on concrete (non-`$ref`) schemas → currently passes. (Reproduced: recursive-category-tree.)
- Regression-worth watching: after any future rule relaxation, confirm `$dynamicRef` consumer-only schemas don't get newly flagged.

## Implementation Plan

The minimal, highest-value change is a **scoped relaxation** of `no-$ref-siblings` for OAS 3.1 documents to permit the JSON Schema 2020-12 keywords that are semantically meaningful beside `$ref`:
- Allow `$dynamicAnchor`, `$id`, `$defs`, `$schema`, `$comment`, `$anchor` as `$ref` siblings when the document is OAS 3.1+.
- Keep flagging arbitrary application-level siblings (preserves the spirit of IBM's rule).

This is a small, well-contained edit in `packages/ruleset/src/ibm-oas.js` (the rule's `given`/`then` or a custom function), accompanied by a test fixture matching `fixtures/generic-schema-binding.yaml`. Because #635 was deliberate, **open an issue first** to socialize the rationale (3.1 generic binding is standard; current rule penalizes valid specs) before opening a PR.

Backwards-compatibility: the relaxation must be version-gated (3.1+ only) so existing 3.0 behavior is unchanged.

## Upstream Strategy

1. Open an issue citing the fixtures-first evidence (3 of 4 canonical `$dynamicRef` patterns fail by default) and the source comment showing the deliberate 3.1 extension. Frame as "IBM style should permit the standard OAS 3.1 generic-binding idiom."
2. If receptive, follow with a PR scoped to 3.1+ that allows JSON Schema 2020-12 keywords as `$ref` siblings.
3. Expected acceptance: uncertain — directly revisits #635. If IBM declines, document the `no-$ref-siblings: off` workaround in this analysis and the catalog, and deprioritize.

## Open Questions

- Would IBM accept a version-gated relaxation, or is the no-siblings policy absolute regardless of spec version? (Needs the issue conversation to answer.)

## Sources

- Binary: `lint-openapi` v1.37.14 (npm `ibm-openapi-validator`)
- Source clone: `/tmp/openapi-validator` @ `dad9cba` (2026-05-28)
- `packages/ruleset/src/ibm-oas.js` (lines 10-14, 64)
- Empirical `lint-openapi` runs on the four `fixtures/*.yaml`
- PR/issue #635, #437
