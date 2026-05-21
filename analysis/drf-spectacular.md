# drf-spectacular — $dynamicRef Analysis

**Category:** Spec Producer (Python/Django REST Framework)
**Repo:** https://github.com/tfranzel/drf-spectacular
**Version analyzed:** latest
**OAS version emitted:** 3.0.x primary; OAS 3.1 incremental (webhooks merged Jan 2024; nullable OAS 3.1 fix open Sep 2025)
**License:** BSD-3-Clause
**Status:** Not supported — OAS 3.1 itself incomplete; no $dynamicRef demand

---

## What It Does

drf-spectacular generates OpenAPI specs from Django REST Framework serializers and views. It is the dominant spec producer for Django API projects.

## $dynamicRef Support

No `$dynamicRef` issues in tracker. Schema generation is serializer-centric — it introspects DRF serializers to build Python-dict OAS objects directly, without an intermediate JSON Schema AST. Python generics are not a first-class input. OAS 3.1 support is incremental and community-driven; full 3.1 compatibility is itself an open problem.

## Contribution Opportunity

Low. No architectural path for `$dynamicRef` emission from Python serializer introspection. OAS 3.1 completeness is a higher priority issue for the project.

**Contribution landing likelihood:** Low.

## Testing Methodology

See [../TESTING_METHODOLOGIES.md](../TESTING_METHODOLOGIES.md) — Spec Producer methodology.
