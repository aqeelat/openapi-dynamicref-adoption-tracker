# openapi-typescript

## Overview

| Property | Value |
|---|---|
| Category | Type generator (spec consumer → TypeScript types) |
| Language | TypeScript |
| License | MIT |
| Repo | https://github.com/openapi-ts/openapi-typescript |
| Version analyzed | v7.13.0 |
| OAS version supported | 3.0 and 3.1 |
| Active maintenance | Yes |

## Summary

`openapi-typescript` consumes an OpenAPI spec and emits TypeScript type definitions. It supports both OAS 3.0 and 3.1. Issue [#2029](https://github.com/openapi-ts/openapi-typescript/issues/2029) ("implement OAS3.1 dynamic references", opened Dec 2024) is open, assigned to the maintainer, and labeled `enhancement`. This is the only consumer-side code-generation tool in this analysis with an explicitly-tracked `$dynamicRef` gap. No PR exists yet.

## Schema Processing Stack

- `@redocly/openapi-core ^1.34.6` — handles spec loading and `$ref` resolution. Redocly core supports OAS 3.1 parsing but does not implement `$dynamicRef` semantic resolution for codegen.
- `openapi-typescript`'s own type emitter walks the resolved schema graph and emits TypeScript `interface` / `type` declarations.
- The emitter knows about OAS 3.1 schema semantics but currently treats `$dynamicRef` as an unknown/ignored keyword.

## $dynamicRef Support Status

**Not implemented. Open tracking issue #2029.**

The issue describes the intended semantics:
- `$dynamicAnchor` on a template schema + `$dynamicRef` at use-sites → TypeScript should emit the concrete bound type (equivalent to a TypeScript generic being instantiated).
- The proposed approach is to resolve the `$dynamicRef` → `$dynamicAnchor` binding at generation time (since TypeScript does not have higher-kinded types), yielding concrete TypeScript types per binding context.

The maintainer (`drwpow`) is assigned on the issue. No implementation PR has been filed.

## Relevant Issue

[openapi-ts/openapi-typescript#2029](https://github.com/openapi-ts/openapi-typescript/issues/2029) — "implement OAS3.1 dynamic references"  
Opened: Dec 2, 2024  
Status: Open  
Assignee: `drwpow` (maintainer)  
Labels: `enhancement`, `openapi-ts`

## Testing Approach

See [TESTING_METHODOLOGIES.md — Type Generator Testing](../TESTING_METHODOLOGIES.md#type-generator-testing).

The test harness from the existing `scripts/matrix-runner.mjs` can be adapted:

1. Run `openapi-typescript` against each fixture spec.
2. Parse the output TypeScript with the TypeScript compiler API.
3. Assert that the generated types for each operation reflect the correct concrete binding:
   - `listUsers` → `items` is typed as `User`, not `unknown` or `never`
   - `listGroups` → `items` is typed as `Group`
4. Assert the types are not structurally identical (which would indicate the dynamic binding was ignored).

Until issue #2029 is resolved, the expected result is that `$dynamicRef` is emitted as `unknown` or omitted — this establishes the regression baseline.

## Contribution Feasibility

**High.** The gap is tracked, the maintainer is assigned, and the fix approach is described in the issue. A contribution could:

1. Implement `$dynamicRef` resolution in the type emitter: at each `$dynamicRef` use site, walk up the schema graph to find the dynamically-active `$dynamicAnchor`, resolve the concrete schema, and emit the bound type.
2. Add test fixtures to the `openapi-typescript` test suite covering the patterns from this repo.

The `@redocly/openapi-core` resolution layer does not implement dynamic scope, so the binding resolution would need to happen in `openapi-typescript`'s own walker, which already traverses the schema tree for type emission.

## Landing Likelihood

**High.** Issue is tracked, maintainer-assigned, and the project is actively maintained. A well-structured PR with tests will land.
