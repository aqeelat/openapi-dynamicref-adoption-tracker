# Opis JSON Schema

## Summary

Opis JSON Schema (`opis/json-schema`) is a PHP JSON Schema validator with 2020-12 support. It **correctly implements `$dynamicRef`/`$dynamicAnchor`**: `src/Parsers/Drafts/Draft202012.php:93` registers both keywords, and the project bundles the **official JSON Schema Test Suite** — on which **all 1227 draft2020-12 tests pass** (`composer phpunit --filter OfficialDraft202012`), including the `dynamicRef.json` cases. No fix needed. The second PHP validator in the catalog to support dynamicRef (the other, `justinrainbow/json-schema`, is draft-07-level).

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/opis/json-schema |
| Source commit | `85d8523` (2026-04-30) |
| Draft supported | 2020-12 (and others) |
| `$dynamicRef` Status | **Correct** |
| Priority | Done |
| Blocked by | — |
| Backed by | — |

## Maintenance And Landing Likelihood

| Indicator | Value |
|---|---|
| Most recent commit | 2026-04-30 (`85d8523`) |
| Latest release | within 2026 (active) |
| Open issues | small tracker |
| Maintainer | Opis team (`sarmin`, `acky`) |
| Activity level | **Active** — regular releases |
| Landing likelihood | **N/A** — no PR needed |

## Dependency Chain

Opis is a self-contained PHP validator (no upstream parser dependency). It implements the 2020-12 dialect directly in its `Draft202012` parser, including the dynamic-scope resolution algorithm.

## Current DynamicRef Behavior

- **Parses + semantically resolves.** `Draft202012.php:93` registers `'$dynamicRef'` (ref) and `'$dynamicAnchor'` (anchor, fragment). The validator implements dynamic-scope resolution (outermost-anchor-wins), not just parse/preserve.
- **Empirically verified via the official test suite.** `composer install && vendor/bin/phpunit --filter OfficialDraft202012` → **OK (1227 tests, 1228 assertions)** — every draft2020-12 case passes, including all of `tests/official/tests/draft2020-12/dynamicRef.json`.

## Fixture Results

Empirical (official suite run; 1227/1227 pass):

| Fixture / suite | OAS | Observed | Verdict |
|---|---|---|---|
| official `draft2020-12/dynamicRef.json` (all cases) | 2020-12 | all pass | RESOLVED |
| official `draft2020-12/*` (full 1227) | 2020-12 | all pass | RESOLVED |

**Human Review Needed:** none.

## Relevant Source Map

- `src/Parsers/Drafts/Draft202012.php:93` — registers `$dynamicRef` (ref) + `$dynamicAnchor` (anchor, fragment).
- `tests/AbstractOfficialDraftTest.php` / `tests/AbstractOfficialDraftTest` — official-suite runner.
- `tests/official/tests/draft2020-12/dynamicRef.json` — the bundled official dynamicRef cases.

## Implementation Plan

**None — already Correct.** No fix needed.

## Open Questions

- Whether Opis tracks the very latest JSON-Schema-Test-Suite revisions (the bundled copy was current as of the commit; if a new dynamicRef edge case is added upstream, Opis should pull it).

## Sources

- Source clone: `/tmp/json-schema` @ `85d8523` (2026-04-30)
- Empirical: `composer install` + `vendor/bin/phpunit --filter OfficialDraft202012` → 1227/1227 pass
- `src/Parsers/Drafts/Draft202012.php:93`, `tests/official/tests/draft2020-12/dynamicRef.json`
