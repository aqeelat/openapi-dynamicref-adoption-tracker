# @nestjs/swagger

## Overview

| Property | Value |
|---|---|
| Category | Spec producer (TypeScript framework plugin) |
| Language | TypeScript |
| License | MIT |
| Repo | https://github.com/nestjs/swagger |
| Version analyzed | v11.4.4 |
| OAS version emitted | 3.0.0 (default); 3.1.0 user-configurable |
| Active maintenance | Yes |

## Summary

`@nestjs/swagger` generates OpenAPI specs from NestJS decorators and TypeScript class metadata (via `reflect-metadata`). The default output is OAS 3.0.0; OAS 3.1 mode is available when the caller sets `openapi: '3.1.0'` in the document config. Neither mode generates nor handles `$dynamicRef`/`$dynamicAnchor`. Generic classes are resolved statically.

## Schema Generation Stack

- `@nestjs/swagger` uses `swagger-parser@10.0.3` for spec validation.
- Schemas are built by reflecting class/property metadata via decorators (`@ApiProperty`, `@ApiSchema`, etc.).
- The internal `SwaggerScanner` collects schemas from controllers and DTOs, then `SwaggerModule` assembles the OAS document.
- `assignTwoLevelsDeep` merges user-provided `config.components` with scanned schemas — an injection point that passes through arbitrary schema objects.
- `isOas31OrLater()` utility gates OAS 3.1-specific features like `webhooks`.

## $dynamicRef Support Status

**None.** Not on any known roadmap.

- Zero issues or PRs mentioning `$dynamicRef` or `$dynamicAnchor` (searches return only false positives matching "dynamic" in swagger-ui changelog text).
- NestJS generics (`Generic<T>`) are resolved at the point of decorator evaluation or at module initialization. By the time schema collection runs, each generic instantiation is a concrete class — the generator never sees a generic template needing `$dynamicRef`.
- If a user manually constructs a schema object containing `$dynamicRef` and injects it via `config.components`, it may survive into the output document through `assignTwoLevelsDeep` — but this is untested and no pipeline explicitly supports it.

## Relevant Source Locations

| Path | Relevance |
|---|---|
| `lib/swagger-module.ts` | Main module; `openapi: '3.0.0'` default; `isOas31OrLater()` gating |
| `lib/swagger-scanner.ts` | Schema collection from controllers/DTOs |
| `lib/utils/merge-utils.ts` | `assignTwoLevelsDeep` — the injection point for manual schemas |

## Testing Approach

See [TESTING_METHODOLOGIES.md — Spec Producer Testing](../TESTING_METHODOLOGIES.md#spec-producer-testing).

The most informative test is negative: define a NestJS generic DTO, generate the spec, and verify the output contains concrete, non-dynamic schemas. This confirms the static resolution strategy.

A secondary test could verify that a manually-injected `$dynamicRef` in `config.components` survives into the output, establishing whether the injection path is viable for users who want to add dynamic schemas by hand.

## Contribution Feasibility

**Low.** Like tsoa, NestJS generics are resolved statically. Adding first-class `$dynamicRef` support would require:

1. Detecting generic class patterns at schema collection time.
2. Emitting `$dynamicAnchor`-annotated template schemas.
3. Per-instantiation: emitting `$dynamicRef` instead of a concrete schema.

This is a fundamental change to the schema generation model with significant risk of breaking existing users. The more tractable near-term contribution is ensuring that manually-injected `$dynamicRef` schemas are not mangled by the assembly pipeline.

## Landing Likelihood

**Low** for first-class support. **Medium** for a PR ensuring manual `$dynamicRef` injection via `config.components` survives correctly.
