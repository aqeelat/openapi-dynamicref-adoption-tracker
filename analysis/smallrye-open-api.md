# SmallRye OpenAPI

## Summary

SmallRye OpenAPI (`smallrye/smallrye-open-api`) is the Java/Quarkus (MicroProfile OpenAPI) spec producer. It has **no `$dynamicRef`/`$dynamicAnchor` support**: its own `SchemaImpl` model has no `dynamicRef`/`dynamicAnchor` fields, and there is no authoring or emit path for the keywords anywhere in source. Schemas come from MicroProfile `@Schema` annotations and Java type reflection — a model with no dynamic-reference concept. The default OpenAPI version target is `3.1.0` (`SmallRyeOATSConfig.VERSION`), so the version gate is not the blocker — the schema model is. No issue or PR requests the feature.

**Empirical run skipped** (producer; non-runnable per the fixtures-first gate).

## Status Snapshot

| Field | Value |
|---|---|
| Repo | https://github.com/smallrye/smallrye-open-api |
| Source commit | `a964c5f` (2026-06-12) |
| Schema model | own (`io.smallrye.openapi.api.models.media.SchemaImpl extends Schema`), Jackson-based |
| Default OpenAPI version | `3.1.0` (`SmallRyeOATSConfig.java:102`) |
| `$dynamicRef` Status | **No support** |
| Priority | Low |
| Blocked by | — |
| Backed by | — |

## Maintenance And Landing Likelihood

| Indicator | Value |
|---|---|
| Most recent commit | 2026-06-12 (`a964c5f`) |
| Maintainer | SmallRye community (Red Hat / Quarkus) |
| Activity level | **Active** — regular commits |
| Issue tracker demand | 0 issues mention `$dynamicRef`/`$dynamicAnchor` |

Landing likelihood for a well-scoped PR: **Low.** SmallRye uses its own schema model (not swagger-core's `Schema`, which already has the fields). Adding `$dynamicRef` support means extending SmallRye's `Schema`/`SchemaImpl` model, the reader, and the writer — plus an authoring mechanism (MicroProfile `@Schema` has no dynamic-ref concept today). Zero user demand. Compare Micronaut, which gets this "for free" via swagger-core's model — SmallRye does not have that advantage.

## Dependency Chain

```
smallrye-open-api-core
  → own Schema model (io.smallrye.openapi.api.models.media.SchemaImpl)
  → com.fasterxml.jackson (jackson-core/databind/dataformat-yaml) 2.22.0
```

- Unlike Micronaut (swagger-core model) or Swashbuckle (Microsoft.OpenApi), SmallRye's `SchemaImpl` is a hand-rolled model. `grep` of `SchemaImpl.java` for `dynamicRef`/`$dynamicRef`/`$anchor`/`$id` returned nothing — none of these 2020-12 reference keywords are modeled.
- Not blocked by an external library — the gap is SmallRye's own model.

## Current DynamicRef Behavior

- **No model fields.** `SchemaImpl` does not declare `dynamicRef`/`dynamicAnchor`/`$anchor`/`$id`.
- **No authoring path.** MicroProfile `@Schema` annotations and Java type reflection do not surface these keywords.
- **No semantic dynamic-scope resolution** (producer).
- A user cannot emit `$dynamicRef` through SmallRye's normal pipeline today; only by post-processing the generated document manually.

## Fixture Results

Not run (producer; non-runnable). Source-determined verdict:

| Fixture | OAS | Observed | Verdict |
|---|---|---|---|
| generic-schema-binding | 3.1 | No model field or authoring mechanism to emit `$dynamicRef`/`$dynamicAnchor` | N/A (no emit path) |

**Human Review Needed:** none.

## Relevant Source Map

- `core/src/main/java/io/smallrye/openapi/api/models/media/SchemaImpl.java` — `SchemaImpl extends Schema`; no `dynamicRef`/`$dynamicAnchor`/`$anchor`/`$id` fields.
- `core/src/main/java/io/smallrye/openapi/api/SmallRyeOASConfig.java:102` — `VERSION = "3.1.0"` (default target).
- `core/pom.xml` — jackson 2.22.0; no swagger-core `Schema` dependency for the model.

## Existing Issues And Prior Art

- **No issues** in the tracker request `$dynamicRef`/`$dynamicAnchor`.
- SmallRye does have a generic-pagination helper (`BaseResponse`/OpenAPI skeleton), but it generates concrete duplicated schemas, not `$dynamicRef` templates.

## Implementation Plan

Not a near-term target. The path, if pursued:
1. Extend SmallRye's `Schema` interface and `SchemaImpl` with `dynamicRef`/`dynamicAnchor`/`$anchor`/`$id` fields + reader/writer support.
2. Add an authoring mechanism (extend the MicroProfile `@Schema` annotation handling in SmallRye's annotation scanner, analogous to Micronaut's `annValues` path).
3. Tests on the four fixtures.

Sizable, model-wide change with no current demand.

## Upstream Strategy

None recommended now. If Quarkus/MicroProfile users request generic-template support, the right first step is a design issue comparing the swagger-core approach (Micronaut) vs. SmallRye's own model.

## Open Questions

- Is SmallRye planning to migrate its model to swagger-core's (which already has the fields)? No public signal found; unlikely given its long-standing own-model architecture.

## Sources

- Source clone: `/tmp/smallrye-open-api` @ `a964c5f` (2026-06-12)
- `core/src/main/java/io/smallrye/openapi/api/models/media/SchemaImpl.java`, `core/src/main/java/io/smallrye/openapi/api/SmallRyeOASConfig.java:102`, `core/pom.xml`
- Empirical run skipped (producer, non-runnable per fixtures-first gate)
