# Swagger-PHP (zircote)

## Summary

Swagger-PHP (`zircote/swagger-php`) is the dominant PHP OpenAPI producer (annotations/attributes → OpenAPI). It has **no `$dynamicRef`/`$dynamicAnchor` support**: its `Schema` attribute/model has no fields for either keyword, and there is no authoring or emit path. PHP attributes reflect concrete classes — a model with no dynamic-reference concept. No issue requests the feature. NelmioApiDocBundle delegates to Swagger-PHP, so it inherits this gap (see `analysis/nelmioapidocbundle.md`).

**Empirical run skipped** (producer; non-runnable per the fixtures-first gate).

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/zircote/swagger-php |
| Source commit | latest (pushed 2026-06-14) |
| OpenAPI version | 3.0 default (`DEFAULT_VERSION` in `Attributes/OpenApi.php`) |
| `$dynamicRef` Status | **No support** |
| Priority | Low |
| Blocked by | — |
| Backed by | — |

## Maintenance And Landing Likelihood

| Indicator | Value |
|---|---|
| Most recent commit | 2026-06-14 |
| Open issues | 17 |
| GitHub stars | 5298 |
| Maintainer | `zircote` (Robert Allen) + contributors |
| Activity level | **Active** — regular commits |
| Issue tracker demand | 0 issues mention `$dynamicRef`/`$dynamicAnchor` |

Landing likelihood for a well-scoped PR: **Low.** The `Schema` attribute/model lacks the keyword fields, PHP type reflection can't infer a `$dynamicRef` template, and there's zero user demand. Adding support would mean extending the `Schema` attribute with `$dynamicRef`/`$dynamicAnchor` properties + reader/writer support + an authoring story — a self-contained but unmotivated change.

## Dependency Chain

```
swagger-php
  → own Schema attribute/model (zircote\swagger\Attributes\Schema)
  → PHP reflection via annotations/attributes
```

- Swagger-PHP is its own model + reflector — no upstream parser to inherit `$dynamicRef` from.
- Downstream: `nelmio/NelmioApiDocBundle` (^4.11 || ^5 || ^6) uses Swagger-PHP as its generator, inheriting the gap.

## Current DynamicRef Behavior

- **No model fields.** `src/Schema.php` (the attribute/model) exposes no `dynamicRef`/`$dynamicAnchor`/`$anchor`/`$id` properties (`grep` returned nothing).
- **No authoring path.** PHP attributes map to concrete classes; no construct carries dynamic-reference semantics.
- **No semantic dynamic-scope resolution** (producer).
- Manual injection only: a user could post-process the generated spec to add the keywords, but Swagger-PHP's pipeline never produces them.

## Fixture Results

Not run (producer; non-runnable). Source-determined verdict:

| Fixture | OAS | Observed | Verdict |
|---|---|---|---|
| generic-schema-binding | 3.1 | No `Schema` attribute property to emit `$dynamicRef`/`$dynamicAnchor`; no code path | N/A (no emit path) |

**Human Review Needed:** none.

## Relevant Source Map

- `src/Schema.php` — `Schema` attribute/model; no `dynamicRef`/`$dynamicAnchor` properties.
- `src/Attributes/OpenApi.php:24` — `DEFAULT_VERSION` (OpenAPI version constant).
- `src/Generator.php` — annotation/attribute → OpenAPI document build pipeline; no dynamic-ref branch.

## Existing Issues And Prior Art

- **No issues** in the tracker request `$dynamicRef`/`$dynamicAnchor`.

## Implementation Plan

Not a near-term target. The path, if pursued:
1. Add `$dynamicRef`/`$dynamicAnchor`/`$anchor`/`$id` properties to the `Schema` attribute.
2. Wire them through the reader and the OpenAPI document writer.
3. Add an authoring example (the generic-pagination pattern) and tests on the fixtures.

Self-contained but unmotivated by current demand.

## Upstream Strategy

None recommended now. If PHP/Symfony ecosystem users request generic-template support, the right opener is an issue on the Swagger-PHP tracker; the change itself is mechanical (extend the attribute + writer).

## Open Questions

- Is there any plan to support OpenAPI 3.1 in Swagger-PHP (it currently targets 3.0)? 3.1 support would be a prerequisite for `$dynamicRef` relevance anyway.

## Sources

- Source clone: `/tmp/swagger-php` (latest, pushed 2026-06-14)
- `src/Schema.php`, `src/Attributes/OpenApi.php:24`, `src/Generator.php`
- Empirical run skipped (producer, non-runnable per fixtures-first gate)
