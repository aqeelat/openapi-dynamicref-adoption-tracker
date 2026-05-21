# utoipa — $dynamicRef Analysis

**Category:** Spec Producer (Rust derive macros)
**Repo:** https://github.com/juhaku/utoipa
**Version analyzed:** 5.5.0
**OAS version emitted:** 3.0.x primary; OAS 3.1 incomplete (PR #1555 "Add OpenAPI 3.2 support" open May 2026)
**License:** MIT
**Status:** Not supported — macro-based design collapses generics statically; OAS 3.1 itself incomplete

---

## What It Does

utoipa provides Rust derive macros (`#[utoipa::path]`, `#[derive(ToSchema)]`) that generate OAS specs from Rust type annotations at compile time.

## $dynamicRef Support

No `$dynamicRef` support, no issues mentioning it. utoipa expands generic types at compile time via macro expansion — each concrete instantiation (`MyModel<i32>`, `MyModel<String>`) gets its own `#[schema]` component. There is no "open generic" concept available at the point of macro expansion.

Community concern about maintenance pace exists (issue #1498 "Still maintained?", Nov 2025).

## Contribution Opportunity

Low. OAS 3.1 is not yet complete. The macro-based approach makes `$dynamicRef` semantically very hard to express — it would require a way to annotate open/unbound type parameters in derives, which is not currently supported. Maintenance velocity is uncertain.

**Contribution landing likelihood:** Low.

## Testing Methodology

See [../TESTING_METHODOLOGIES.md](../TESTING_METHODOLOGIES.md) — Spec Producer methodology.
