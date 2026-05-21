# poem-openapi

## Summary

`poem-openapi` is an active Rust OpenAPI spec producer, but it currently emits OpenAPI 3.0.0 and has its own schema AST that cannot represent JSON Schema 2020-12 `$dynamicRef` / `$dynamicAnchor`. Supporting dynamic references would require opt-in OpenAPI 3.1 support plus schema AST, serializer, and derive-macro changes.

This is a producer-side project, not a documentation renderer. It is valuable because it answers whether frameworks can emit dynamicRef specs once consumers are ready.

## Status Snapshot

| Field | Value |
|---|---|
| Category | Spec producer |
| Repository | https://github.com/poem-web/poem |
| Crate | `poem-openapi` |
| Version observed | `5.1.16` on master |
| Current support assessment | No OpenAPI 3.1 or dynamicRef emission |

## Maintenance And Landing Likelihood

`poem-openapi` is actively maintained. Recent changelog entries and merged community PRs show maintainer activity.

Landing likelihood: **medium** for opt-in OpenAPI 3.1 groundwork; **low-medium** for full dynamicRef generic-template support in one PR.

Reasons:

- The project is active and accepts community contributions.
- Backward-compatible changes are more likely to land.
- Full dynamicRef support touches the schema model, derive macros, serialization, OpenAPI versioning, and nullable/dialect behavior.

## Dependency Chain

`poem-openapi` uses its own schema model rather than delegating schema generation to `schemars`.

Core flow:

Rust types and derive macros -> `Type` implementations -> `Registry` / `MetaSchema` -> OpenAPI serializer.

## Current DynamicRef Behavior

Current behavior:

- Document serializer hardcodes OpenAPI `3.0.0`.
- `MetaSchema` does not have `$id`, `$schema`, `$defs`, `$dynamicAnchor`, or `$dynamicRef` fields.
- `MetaSchemaRef` can represent only inline schemas or static component `$ref` references.
- Nullable behavior is OpenAPI 3.0 style (`nullable: true`), not JSON Schema 2020-12 nullability.
- Generic object names are materialized as concrete component names rather than reusable dynamic templates.
- Recursive schemas are handled by inserting placeholder schemas during registration to avoid stack overflow.

## Relevant Source Map

| Concern | Source |
|---|---|
| OpenAPI version serialization | `poem-openapi/src/registry/ser.rs` |
| Schema AST | `poem-openapi/src/registry/mod.rs` |
| Schema reference enum | `poem-openapi/src/registry/mod.rs` |
| Public `Type` trait | `poem-openapi/src/types/mod.rs` |
| Object derive schema generation | `poem-openapi-derive/src/object.rs` |
| Union derive schema generation | `poem-openapi-derive/src/union.rs` |
| Vec schema generation | `poem-openapi/src/types/external/vec.rs` |
| Option schema generation | `poem-openapi/src/types/external/optional.rs` |
| Map schema generation | `poem-openapi/src/types/external/hashmap.rs`, `btreemap.rs` |

## Existing Issues And Prior Art

- No direct `$dynamicRef`, `$dynamicAnchor`, JSON Schema 2020-12, or OpenAPI 3.1 support issue was found in the research pass.
- PR `poem-web/poem#1043` shows recent community contributions can land.
- Existing recursive schema behavior is covered by tests related to issue `#171`.

## Failure Modes To Test

- Cannot emit `openapi: 3.1.0` or `jsonSchemaDialect` through normal APIs.
- Cannot attach `$dynamicAnchor` to generated schema nodes.
- Cannot emit `$dynamicRef` instead of `$ref`.
- Generic wrappers are materialized as separate concrete schemas rather than dynamic templates.
- OpenAPI 3.1 nullable output is unavailable.

## Test Plan

Producer tests should inspect generated OpenAPI JSON/YAML.

First tests:

- Existing OpenAPI 3.0 output remains unchanged by default.
- Opt-in OpenAPI 3.1 output emits `openapi: 3.1.0` and `jsonSchemaDialect`.
- Manual schema construction can emit `$dynamicAnchor` and `$dynamicRef`.
- Recursive schemas still serialize without stack overflow.
- Generic wrapper fixture can be represented as a dynamic template under opt-in mode.

Use this repo's fixtures as expected output references, especially `generic-schema-binding`, `api-envelope`, and `recursive-category-tree`.

## Implementation Plan

Smallest useful path:

1. Add OpenAPI version selection, defaulting to current `3.0.0` behavior.
2. Add 3.1 serializer support with `jsonSchemaDialect`.
3. Extend `MetaSchema` and `MetaSchemaRef` to represent `$defs`, `$dynamicAnchor`, and `$dynamicRef`.
4. Add a manual escape hatch or attribute-based way to mark a schema as a dynamic anchor/ref before attempting automatic generic inference.
5. Add derive-macro support for common generic wrappers only after the low-level representation is stable.
6. Keep OpenAPI 3.0 output byte-for-byte or semantically unchanged unless 3.1 is explicitly enabled.

## Upstream Strategy

Start with an issue proposing opt-in OpenAPI 3.1 support and low-level schema AST additions. Avoid proposing `$dynamicRef` as default output until downstream renderer/generator support is better. A first PR should likely add representation and serialization, not automatic generic-template inference.

## Open Questions

- Would maintainers accept OpenAPI 3.1 support as a feature flag/config option?
- Should dynamicRef support be exposed through derive attributes, manual `Type` implementations, or a schema extension API?
- How should `poem-openapi` handle 3.1 nullability while preserving 3.0 output?

## Sources

- https://github.com/poem-web/poem
- https://github.com/poem-web/poem/blob/master/poem-openapi/Cargo.toml
- https://github.com/poem-web/poem/blob/master/poem-openapi/CHANGELOG.md
- https://github.com/poem-web/poem/blob/master/poem-openapi/src/registry/ser.rs
- https://github.com/poem-web/poem/blob/master/poem-openapi/src/registry/mod.rs
- https://github.com/poem-web/poem/blob/master/poem-openapi/src/types/mod.rs
- https://github.com/poem-web/poem/pull/1043
