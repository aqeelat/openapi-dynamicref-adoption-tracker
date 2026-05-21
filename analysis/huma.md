# Huma — $dynamicRef Analysis

**Category:** Spec Producer (Go API framework)
**Repo:** https://github.com/danielgtaylor/huma
**Version analyzed:** latest main (Go 1.25+)
**OAS version emitted:** 3.1 (first-class)
**License:** MIT
**Status:** Not supported — design intentionally generates from Go type reflection; no open generic concept

---

## What It Does

Huma is a Go API framework that generates OAS 3.1 specs from Go type annotations. It supports JSON Schema-compatible schemas with nullable rendered as `["string", "null"]` type arrays.

## $dynamicRef Support

The `Schema` struct has no `DynamicRef` or `DynamicAnchor` fields, and `MarshalJSON` does not emit these keywords. No issues reference `dynamicRef` in the tracker.

## Why It Won't Emit `$dynamicRef`

Huma generates schemas by reflecting over concrete Go types. Go generics are resolved at instantiation time — each concrete parameterization produces its own schema. There is no "open generic schema" concept in Huma's design that would naturally map to `$dynamicAnchor`. The framework intentionally supports a subset of JSON Schema focused on fast runtime validation, not full 2020-12 semantics.

## Contribution Opportunity

Low. Adding `DynamicRef`/`DynamicAnchor` fields for pass-through scenarios is technically feasible but niche. The maintainer would need a compelling real-world use case. Not a priority relative to other tools.

**Contribution landing likelihood:** Low.

## Testing Methodology

See [../TESTING_METHODOLOGIES.md](../TESTING_METHODOLOGIES.md) — Spec Producer methodology.
