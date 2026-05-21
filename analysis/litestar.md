# Litestar — $dynamicRef Analysis

**Category:** Spec Producer (Python ASGI framework)
**Repo:** https://github.com/litestar-org/litestar
**Version analyzed:** 3.0.0b0
**OAS version emitted:** 3.1 (first-class, not opt-in)
**License:** MIT
**Status:** Not supported — schema model nearly complete; `$dynamicRef`/`$dynamicAnchor` fields missing

---

## What It Does

Litestar is a Python ASGI framework that auto-generates OpenAPI 3.1 specs from route handlers and type annotations. It supports both `msgspec` (default) and Pydantic v2 as schema backends. OAS 3.1 is a first-class target, not an opt-in flag.

## Schema Model Coverage

`litestar/openapi/spec/schema.py` (672 lines) implements an exhaustive OAS 3.1 / JSON Schema 2020-12 model. Present keywords include: `prefix_items`, `contains`, `dependent_schemas`, `schema_if`, `schema_then`, `schema_else`, `unevaluated_properties`, `unevaluated_items`.

**Missing:** `$dynamicRef` and `$dynamicAnchor` — the only two 2020-12 applicator keywords absent from the schema model.

No issues or PRs referencing `$dynamicRef` exist in the tracker.

## Why It Doesn't Emit `$dynamicRef`

Python generics (e.g., `Response[User]`) are resolved by msgspec and Pydantic v2 at schema-generation time. Each concrete instantiation gets its own `$defs` entry. Neither backend produces `$dynamicAnchor` — the concept of an "open generic schema" doesn't exist in Python's type system at runtime.

## Contribution Opportunity

Adding `dynamic_ref: str | None` and `dynamic_anchor: str | None` fields to the `Schema` dataclass is a small, bounded, self-contained PR. Litestar is explicitly 2020-12-first, so the gap is clearly unintentional. The change improves spec-completeness for users who hand-write or inject `$dynamicRef` into their OAS output.

Emission from Python type annotations is a separate, harder problem (requires upstream work in msgspec or Pydantic). The dataclass-completeness fix alone is worthwhile.

**Contribution landing likelihood:** Medium-high. Small diff, clearly fits project goals, active maintainers.

## Testing Methodology

See [../TESTING_METHODOLOGIES.md](../TESTING_METHODOLOGIES.md) — Spec Producer methodology.
