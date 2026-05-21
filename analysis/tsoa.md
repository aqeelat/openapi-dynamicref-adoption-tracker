# tsoa

## Overview

| Property | Value |
|---|---|
| Category | Spec producer (TypeScript → OpenAPI code-first) |
| Language | TypeScript |
| License | MIT |
| Repo | https://github.com/lukeautry/tsoa |
| Version analyzed | v6.x stable / v7.0.0-alpha.0 |
| OAS version emitted | 3.0.x (Swagger 2.0 also supported) |
| Active maintenance | Moderate |

## Summary

tsoa generates OpenAPI specs from TypeScript classes, decorators, and type metadata via the TypeScript compiler API. It resolves TypeScript generics statically at generation time, emitting concrete, instantiated schemas. It targets OAS 3.0.x with no plans for OAS 3.1 or `$dynamicRef` support. The architecture is fundamentally incompatible with `$dynamicRef`-style polymorphism.

## Schema Generation Stack

tsoa uses the TypeScript compiler (`typescript` peer dependency) to:

1. Parse TypeScript source files
2. Resolve decorators (`@Route`, `@Get`, `@Body`, etc.) and extract metadata
3. Resolve TypeScript types — including generics — to concrete JSON Schema-like structures
4. Emit an OAS 2.0 or OAS 3.0.x document with `#/components/schemas/*` references

Generic classes like `PaginatedResponse<T>` are resolved per instantiation: each unique `T` yields a separate named schema in `#/components/schemas`. The spec contains no generic templates.

## $dynamicRef Support Status

**None.** Not architecturally feasible without a redesign.

- Zero issues or PRs mentioning `$dynamicRef`, `$dynamicAnchor`, or OAS 3.1.
- tsoa's type resolver is a complete, bespoke TypeScript-to-JSON-Schema pipeline. It produces flat, concrete schemas — the opposite of the open-world template pattern that `$dynamicRef` enables.
- The emitted OAS version is 3.0.x by default; there is no OAS 3.1 support path in either the stable or alpha releases.

## Testing Approach

See [TESTING_METHODOLOGIES.md — Spec Producer Testing](../TESTING_METHODOLOGIES.md#spec-producer-testing).

Given the architectural incompatibility, the most useful test for tsoa is negative: verify that a TypeScript generic class is expanded to multiple concrete schemas, confirming the static resolution strategy. This establishes the baseline expectation and helps detect future changes.

## Contribution Feasibility

**Very low.** Adding `$dynamicRef` output would require:

1. tsoa to emit OAS 3.1 (a significant unimplemented feature).
2. tsoa's type resolver to detect patterns where dynamic binding would be semantically equivalent to TypeScript's generic instantiation.
3. New code to emit `$dynamicAnchor`-annotated template schemas alongside `$dynamicRef`-using per-instantiation schemas.

This would be a large, breaking change with uncertain value to tsoa's user base, which tends toward code-first decoration patterns rather than schema-first composition.

## Landing Likelihood

**Very low.** OAS 3.1 support itself is not on tsoa's roadmap. `$dynamicRef` is a non-starter without that foundation.
