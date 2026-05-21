# springdoc-openapi — $dynamicRef Analysis

**Category:** Spec Producer (Java/Spring)
**Repo:** https://github.com/springdoc/springdoc-openapi
**Version analyzed:** 2.8.x
**OAS version emitted:** 3.0.x (default) and 3.1 (opt-in via `springdoc.api-docs.version=openapi_3_1`)
**License:** Apache-2.0
**Status:** Not supported — blocked by upstream swagger-core

---

## What It Does

springdoc-openapi generates OpenAPI specs from Spring MVC/WebFlux annotations. It is the dominant OpenAPI spec producer in the Java/Spring ecosystem.

## $dynamicRef Support

No evidence of `$dynamicRef` or JSON Schema 2020-12 anchor support. springdoc delegates all schema modeling to `io.swagger.core.v3:swagger-core-jakarta` (v2.2.47). swagger-core's `Schema` object does not expose `$dynamicRef`/`$dynamicAnchor` fields. The gap is upstream.

## Contribution Opportunity

Very low. Any fix requires swagger-core to add the keyword first, then springdoc to wire it through. The Java ecosystem is conservative about JSON Schema 2020-12 adoption. An escape hatch via `@Schema(extensions = ...)` is possible at the user level, but springdoc would not emit it automatically.

**Contribution landing likelihood:** Very low.

## Testing Methodology

See [../TESTING_METHODOLOGIES.md](../TESTING_METHODOLOGIES.md) — Spec Producer methodology.
