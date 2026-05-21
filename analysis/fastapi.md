# FastAPI

## Overview

| Property | Value |
|---|---|
| Category | Spec producer (Python framework) |
| Language | Python |
| License | MIT |
| Repo | https://github.com/fastapi/fastapi |
| Version analyzed | Current main (May 2026) |
| OAS version emitted | 3.1.0 (default) |
| Active maintenance | Yes |

## Summary

FastAPI defaults to emitting OAS 3.1.0 — the only framework in this analysis to do so — but it generates schemas entirely through Pydantic's `GenerateJsonSchema` pipeline, which does not produce `$dynamicRef` or `$dynamicAnchor`. Generic/polymorphic patterns are resolved statically at schema generation time into concrete `$ref` expansions. No `$dynamicRef` issues exist in the tracker.

## Schema Generation Stack

FastAPI does not implement its own JSON Schema emitter. It delegates entirely to Pydantic v2:

- `pydantic>=2.9.0` — the schema generation backend
- `fastapi/openapi/utils.py` — assembles the OAS document, collecting component schemas from Pydantic output
- `fastapi/openapi/models.py` — typed representation of OAS 3.1 structures

Pydantic v2's `GenerateJsonSchema` resolves Python generics at class-definition time and emits static, concrete JSON Schema. It produces `$ref` (pointing to `#/components/schemas/*`) but never `$dynamicRef` or `$dynamicAnchor`.

## $dynamicRef Support Status

**None.** Not on any known roadmap.

Pydantic's `TypeVar`-based generics (e.g., `Generic[T]`) are expanded into concrete schemas at model-class creation time. By the time the OpenAPI document is assembled, all generic parameters have been resolved. There is no runtime binding problem to express as `$dynamicRef`.

Even if a user manually injected a `$dynamicRef`-containing schema via FastAPI's `openapi_extra` mechanism, it would be passed through as an opaque dict — but FastAPI applies no special handling and the generated document may have structural gaps depending on where the injection occurs.

Zero issues or PRs matching `dynamicRef` in the tracker.

## Relevant Source Locations

| Path | Relevance |
|---|---|
| `fastapi/openapi/utils.py` | Assembles component schemas; entry point for schema pipeline |
| `fastapi/openapi/models.py` | OAS 3.1 typed model; does not include `$dynamicRef`/`$dynamicAnchor` fields |
| `fastapi/openapi/constants.py` | `REF_PREFIX = "#/components/schemas/"` confirms flat ref strategy |

## Testing Approach

See [TESTING_METHODOLOGIES.md — Spec Producer Testing](../TESTING_METHODOLOGIES.md#spec-producer-testing).

The test question for FastAPI is: does a Pydantic model that a user intends as a "generic template" survive into the emitted OAS 3.1 document in a way that conveys the generic structure?

A realistic fixture would define a `PaginatedResponse[T]` model and check whether the emitted spec contains either:
- Correct resolved forms per endpoint (acceptable), or
- A reusable template schema with `$dynamicRef` (not expected; would be a meaningful positive)

Since FastAPI resolves generics statically, the current expected output is multiple concrete inline schemas — one per instantiation — rather than a shared template.

## Contribution Feasibility

**Low** in the near term. The gap is architectural — Pydantic owns schema generation and does not model `$dynamicRef`. A meaningful contribution would require:

1. A Pydantic PR adding a new `GenerateJsonSchema` mode that emits `$dynamicRef`/`$dynamicAnchor` for appropriate generic patterns, or
2. A FastAPI-level postprocessor that detects structurally identical generic schemas and consolidates them using `$dynamicRef`.

Both are substantial features with uncertain demand from the Python/Pydantic community. The more tractable near-term ask is filing an issue to confirm FastAPI's intent regarding `$dynamicRef` in 3.1 documents — the lack of existing issues is informative.

## Landing Likelihood

**Low.** No existing issues, no roadmap mention, architectural gap in Pydantic. FastAPI's OAS 3.1 default is a positive signal for the ecosystem but the `$dynamicRef` gap is deep.
