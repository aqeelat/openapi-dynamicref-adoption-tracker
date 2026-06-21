# NelmioApiDocBundle

## Summary

NelmioApiDocBundle (`nelmio/NelmioApiDocBundle`) is the dominant Symfony OpenAPI producer. It **delegates spec generation to Swagger-PHP** (`zircote/swagger-php` ^4.11 || ^5 || ^6) and therefore inherits Swagger-PHP's `$dynamicRef`/`$dynamicAnchor` gap wholesale. Nelmio's own source has zero references to the keywords. The bundle is a thin Symfony-integration + UI layer over Swagger-PHP's generator (`ApiDocGenerator` calls `$this->generator->setVersion(...)` and drives Swagger-PHP). **No support**, **blocked by swagger-php**. No issue requests the feature.

**Empirical run skipped** (producer; non-runnable per the fixtures-first gate).

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/nelmio/NelmioApiDocBundle |
| Source commit | latest (pushed 2026-06-15) |
| Generator dependency | `zircote/swagger-php` ^4.11.1 || ^5.0 || ^6.0 |
| `$dynamicRef` Status | **No support** |
| Priority | Low |
| Blocked by | swagger-php |
| Backed by | — |

## Maintenance And Landing Likelihood

| Indicator | Value |
|---|---|
| Most recent commit | 2026-06-15 |
| Open issues | 62 |
| GitHub stars | 2348 |
| Maintainer | Nelmio team (`dcrobot`, `dunglas` historically) + Symfony community |
| Activity level | **Active** — regular commits |
| Issue tracker demand | 0 issues mention `$dynamicRef`/`$dynamicAnchor` |

Landing likelihood for a well-scoped PR: **Low** in Nelmio itself — the gap lives in Swagger-PHP (the generator). Even if Swagger-PHP added the keyword fields, Nelmio would need to surface them through its Symfony config layer. With zero demand, this is not a near-term target. The realistic unlock is upstream: land support in Swagger-PHP first (see `analysis/swagger-php.md`), then Nelmio follows.

## Dependency Chain

```
NelmioApiDocBundle
  → zircote/swagger-php (^4.11 || ^5 || ^6)   ← the actual generator; gap lives here
  → Symfony (config/routing/UI integration)
```

- Nelmio's `ApiDocGenerator` is a thin orchestrator around Swagger-PHP's generator (`setOpenApiVersion`, `setVersion`, generate). It does not build schemas itself.
- Therefore Nelmio is **blocked by swagger-php** for any `$dynamicRef` capability — there is nothing meaningful to fix in Nelmio until Swagger-PHP supports the keywords.

## Current DynamicRef Behavior

- **No own handling.** `grep` of `src/` for `dynamicRef`/`$dynamic`/`dynamicAnchor` returns zero hits.
- **Inherits Swagger-PHP's gap.** Whatever Swagger-PHP emits (no `$dynamicRef`/`$dynamicAnchor`) is what Nelmio produces.
- **No semantic dynamic-scope resolution** (producer).
- Manual post-processing of the generated spec is the only way to surface the keywords today.

## Fixture Results

Not run (producer; non-runnable). Source-determined verdict:

| Fixture | OAS | Observed | Verdict |
|---|---|---|---|
| generic-schema-binding | 3.1 | No `$dynamicRef`/`$dynamicAnchor` (inherited from Swagger-PHP) | N/A (blocked upstream) |

**Human Review Needed:** none.

## Relevant Source Map

- `src/ApiDocGenerator.php:51,84-103` — `ApiDocGenerator` holds `$openApiVersion` and calls `$this->generator->setVersion(...)` on the Swagger-PHP generator.
- `src/DependencyInjection/NelmioApiDocExtension.php:95` — wires `setOpenApiVersion` from config.
- `composer.json:36,69` — `zircote/swagger-php` dependency.
- No `dynamicRef`/`$dynamicAnchor` references anywhere under `src/`.

## Existing Issues And Prior Art

- **No issues** in the Nelmio tracker request `$dynamicRef`/`$dynamicAnchor`.

## Implementation Plan

**None in Nelmio until Swagger-PHP lands support.** Sequence:
1. Land `$dynamicRef`/`$dynamicAnchor` in Swagger-PHP (extend the `Schema` attribute + writer — see `analysis/swagger-php.md`).
2. Bump Nelmio's Swagger-PHP floor to a version with the support.
3. Surface the keywords through Nelmio's config/annotation layer (small, once the generator can emit them).

## Upstream Strategy

None recommended in Nelmio now. Direct effort at Swagger-PHP upstream; Nelmio is a downstream follower.

## Open Questions

- Will Swagger-PHP ship OpenAPI 3.1 support (the dialect prerequisite for `$dynamicRef`)? Nelmio's own version handling already accepts a configurable `openapi` version, so Nelmio is ready on the version-config side — the bottleneck is the generator.

## Sources

- Source clone: `/tmp/NelmioApiDocBundle` (latest, pushed 2026-06-15)
- `src/ApiDocGenerator.php`, `src/DependencyInjection/NelmioApiDocExtension.php`, `composer.json`
- Cross-ref: `analysis/swagger-php.md`
- Empirical run skipped (producer, non-runnable per fixtures-first gate)
