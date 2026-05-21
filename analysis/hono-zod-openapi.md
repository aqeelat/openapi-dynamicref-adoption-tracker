# @hono/zod-openapi — $dynamicRef Analysis

**Category:** Spec Producer (TypeScript/Hono + Zod)
**Repo:** https://github.com/honojs/middleware/tree/main/packages/zod-openapi
**Version analyzed:** 1.4.0
**Core dependency:** `@asteasolutions/zod-to-openapi` v8.5.0, Zod peer `^4.0.0`
**OAS version emitted:** 3.1 (default via `zod-to-openapi` `OpenApiGeneratorV31`)
**License:** MIT
**Status:** Not supported — Zod has no open generic schema type; $dynamicRef cannot be expressed in Zod

---

## What It Does

`@hono/zod-openapi` is a Hono adapter that wraps `@asteasolutions/zod-to-openapi` to generate OAS 3.1 specs from Zod schemas. It is a thin Hono-specific adapter; all schema generation logic lives in `zod-to-openapi`.

## $dynamicRef Support

`zod-to-openapi` does not emit `$dynamicRef` for any Zod schema pattern. Zod v4 has no "open generic schema" type — schemas are concrete at definition time. `ZodLazy`/recursive types produce `$ref` cycles, not `$dynamicRef`. There is no mechanism to express `$dynamicAnchor` in a Zod schema.

## Contribution Opportunity

Very low for automatic emission. A manual escape hatch (e.g., `z.any().openapi({ $dynamicRef: '...' })`) is theoretically possible as user-level pass-through, but would require `zod-to-openapi` to pass unknown OAS extensions through to the output. Fixing this upstream in `zod-to-openapi` first would be necessary before `@hono/zod-openapi` sees any benefit.

**Contribution landing likelihood:** Very low.

## Testing Methodology

See [../TESTING_METHODOLOGIES.md](../TESTING_METHODOLOGIES.md) — Spec Producer methodology.
