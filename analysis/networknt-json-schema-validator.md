# networknt/json-schema-validator

## Summary

networknt/json-schema-validator **already implements** `$dynamicRef` / `$dynamicAnchor` with correct dynamic-scope resolution. The implementation landed in v1.3.0 (January 2024, PR #931 by `justin-tay`) and has since shipped in every release line. The validator reports **100% pass** on the official JSON Schema Test Suite for Draft 2020-12 — 1261 required and 651 optional cases, zero failures, zero disabled — with the `dynamicRef.json` suite (18 test groups including strict-tree, detached dynamic refs, multiple dynamic paths, and leaving-dynamic-scope) fully enabled.

This tool does not need upstream work for `$dynamicRef`. The catalog currently lists it as "Unknown"; the evidence supports reclassifying it as **Correct** for JSON Schema dynamic-scope resolution. The only unverified aspect is running this repo's OpenAPI-wrapped fixtures directly against the validator, since networknt is a pure JSON Schema validator and does not parse OpenAPI documents natively (schemas must be extracted and resources registered). That is a usage/integration question, not an implementation gap.

## Status Snapshot

| Property | Value |
|---|---|
| Repository | https://github.com/networknt/json-schema-validator |
| Package | `com.networknt:json-schema-validator` (Maven Central) |
| Category | Runtime JSON Schema validator |
| Language | Java (JDK 17+ for 3.x line; JDK 8+ for 2.x line) |
| License | Apache-2.0 |
| Version analyzed | 3.0.4 |
| Latest release | 3.0.4 (2026-06-10) |
| Default JSON Schema mode | Detected from `$schema`; default dialect configurable via `SchemaRegistry.withDefaultDialect(...)` |
| 2020-12 mode | First-class: `SpecificationVersion.DRAFT_2020_12`, `Draft202012` dialect, `OpenApi31` dialect |
| `$dynamicRef` status | **Correct** — implemented, passes official test suite |
| OpenAPI 3.1 relevance | High: dominant Java JSON Schema validator; OpenAPI 3.0/3.1 dialects built in; used by light-4j and other Java OpenAPI tooling |
| Landing likelihood | N/A — support already exists; bugfix PRs would land readily |

## Maintenance And Landing Likelihood

The project is active and well-maintained. GitHub reports 1057 stars, 341 forks, and only 14 open issues as of 2026-06-14. The repo was last pushed 2026-06-11. Releases are frequent and regular: 3.0.4 (2026-06-10), 3.0.3 (2026-05-27), 3.0.2 (2026-04-14), 3.0.1 (2026-03-10), 3.0.0 (2025-12-13). The recent 3.0.0 major bumped to Jackson 3 and JDK 17; the 2.x line continues for Java 8 + Jackson 2 users (latest 2.0.1).

Steve Hu (`stevehu`) is the owner and creator. `justin-tay` is the dominant active contributor — responsible for the 2020-12 support refactor (#931), the vast majority of functional fixes across 1.3.x–3.0.x, and all recent keyword/dialect correctness work. Earlier contributors include `fdutton` (who added `$recursiveAnchor`/`$recursiveRef` in 1.0.86 and built the JUnit dynamic-test suite harness) and `valfirst` (CI/tooling).

External PRs are merged regularly (the changelog credits many external contributors across 1.x–3.x). There are **zero open PRs** at the time of analysis. Review turnaround for well-scoped fixes is typically days to a few weeks.

Landing likelihood for a well-scoped `$dynamicRef` **bugfix** PR is **high** if a real defect is found, given the maintainer's demonstrated commitment to test-suite compliance and dynamic-scope correctness. No such fix is currently needed — the implementation is complete.

## Dependency Chain

networknt is the validator itself, not an OpenAPI parser, renderer, or generator. Its production dependencies (from `pom.xml`, 3.0.4) are minimal by design:

- `tools.jackson.core:jackson-databind` 3.1.1 — JSON parsing (Jackson 3.x)
- `tools.jackson.dataformat:jackson-dataformat-yaml` 3.1.1 — YAML support (excludable)
- `com.ethlo.time:itu` 1.14.0 — RFC 3339 date/date-time validation (excludable)
- `org.slf4j:slf4j-api` 2.0.17 — logging

Optional (not auto-included): `org.jruby.joni:joni` 2.2.6 and `org.graalvm.js:js-language` 25.0.1 for ECMA-262 regular expressions.

It does **not** use `@apidevtools/json-schema-ref-parser`, Swagger ApiDOM, Redocly OpenAPI Core, AJV, Hyperjump, `openapi-sampler`, `json-schema-tree`, or any external schema/resolver library. All `$ref` resolution, `$id`/`$anchor`/`$dynamicAnchor` discovery, resource registry construction, and dynamic-scope tracking are implemented in-house (`SchemaRegistry`, `SchemaContext`, `ExecutionContext`, `DynamicRefValidator`, `RefValidator`).

The library does not bundle or dereference OpenAPI specs as a whole. It validates individual JSON Schema documents. When used to validate OpenAPI 3.1 response/request schemas, the caller extracts the schema and registers component schemas as resources. The OpenAPI 3.1 dialect (`OpenApi31.java`) is built directly on `SpecificationVersion.DRAFT_2020_12` and its full keyword set, so it preserves the JSON Schema 2020-12 dialect rather than downgrading to draft-07 / OpenAPI 3.0 behavior.

## Current DynamicRef Behavior

### Implementation architecture

`$dynamicRef` and `$dynamicAnchor` are recognized keywords in the Draft 2020-12 and OpenAPI 3.1 dialects. The resolution path:

1. `DynamicRefValidator` (`keyword/DynamicRefValidator.java`) reads the `$dynamicRef` value and resolves it against the parent schema's `SchemaLocation`, accounting for `$id` scope changes (`$ref` prevents a sibling `$id` from changing the base URI, handled in `resolve(...)`).
2. It looks up the resolved anchor in `parentSchema.getSchemaContext().getDynamicAnchors()` — a per-resource `ConcurrentMap<String, Schema>` populated during schema construction.
3. If no matching `$dynamicAnchor` exists in the same resource, it falls back to behaving like a `$ref` to `$anchor` (delegating to `RefValidator.getRefSchema`). This is spec-correct: a `$dynamicRef` without a bookending `$dynamicAnchor` is an ordinary reference.
4. If a matching `$dynamicAnchor` **does** exist, it walks the dynamic scope: `executionContext.getEvaluationSchema().descendingIterator()` — the evaluation schema stack from innermost to outermost. At each resource boundary (where the absolute IRI changes), it checks that resource's `dynamicAnchors` map for the same anchor name. The last (outermost) match wins, which is exactly the 2020-12 dynamic-scope algorithm.
5. The resolved schema is then validated/walked against the instance.

This is a genuine, correct dynamic-scope implementation — not a static sibling scan, and not a root-only fallback. Circular-reference handling in the `walk` path guards against infinite recursion by checking whether the target schema location already appears in the evaluation stack.

### Verified evidence of correctness

The README documents a 100% pass rate on the JSON Schema Test Suite for Draft 2020-12:

| Dialect | Required | Optional | Failures |
|---|---|---|---|
| DRAFT_2020_12 | 1261 (100%) | 651 (100%) | 0 |

`JsonSchemaTestSuiteTest.java` is the harness. The `disableV202012Tests()` method is empty (`// nothing here`) — **no 2020-12 tests are disabled or skipped**, unlike tools that quietly disable failing dynamic-scope cases. The harness uses `Files.walk` over `src/test/suite/tests/draft2020-12`, so it runs both `dynamicRef.json` (18 test groups) and `optional/dynamicRef.json`.

The included `draft2020-12/dynamicRef.json` covers the canonical dynamic-scope patterns that map directly to this repo's fixtures:

| Test Suite case | Maps to repo fixture |
|---|---|
| "tests for implementation dynamic anchor and reference link" (strict-extendible) | `generic-schema-binding.yaml`, `allOf-generic-binding.yaml` |
| "$ref and $dynamicAnchor are independent of order — defs first / ref first" | `allOf-generic-binding.yaml`, `dynamicref-core-semantics.yaml` OrderDefsFirst/OrderRefFirst |
| "strict-tree schema, guards against misspelled properties" | `recursive-category-tree.yaml`, `non-identifier-schema-key.yaml` |
| "multiple dynamic paths to the $dynamicRef keyword" | `paginated-response.yaml` |
| "$dynamicRef that initially resolves to a schema with a matching $dynamicAnchor resolves to the first $dynamicAnchor in the dynamic scope" | `api-envelope.yaml` (two-level nesting) |
| "A $dynamicRef with intermediate scopes that don't include a matching $dynamicAnchor" | `nested-workspace-resources.yaml` |
| "$dynamicRef skips over intermediate resources" | multi-parameter generic binding |
| "after leaving a dynamic scope, it is not used by a $dynamicRef" | dynamic-scope boundary correctness |
| "$ref to $dynamicRef finds detached $dynamicAnchor" | `spec-semantics/external-dynamic-ref.yaml` |

All of these pass.

### Distinction: metaschema vs. user-document support

No workaround is in play. The validator uses its own bundled 2020-12 meta-schemas and validates user documents with the same keyword machinery. There is no evidence of `$dynamicRef` being stripped or replaced for internal use while remaining unsupported for user schemas — the keyword is fully functional for user documents.

### Failure mode

If a `$dynamicRef` cannot be resolved at all (no matching `$dynamicAnchor` and no resolvable `$anchor` fallback), `DynamicRefValidator.validate(...)` / `walk(...)` throws `InvalidSchemaRefException` with a message-key `internal.unresolvedRef`. This is a loud failure, not silent degradation.

## Relevant Source Map

| File | Function/Class | Role |
|---|---|---|
| `keyword/DynamicRefValidator.java` | `getRefSchema(...)` | **Core dynamic-scope resolution** — resolves the anchor, walks `executionContext.getEvaluationSchema()` across resource boundaries, outermost match wins |
| `keyword/DynamicRefValidator.java` | `resolve(...)` | Resolves `$dynamicRef` IRI against parent, accounting for sibling `$id` |
| `keyword/DynamicRefValidator.java` | `validate(...)` / `walk(...)` | Dispatches to resolved schema; throws `InvalidSchemaRefException` on unresolvable ref; circular-dependency guard in `walk` |
| `keyword/RefValidator.java` | `getRefSchema(...)` | `$ref` resolution; fallback path for `$dynamicRef` without bookending `$dynamicAnchor` |
| `keyword/RecursiveRefValidator.java` | — | `$recursiveRef` / `$recursiveAnchor` (draft 2019-09 predecessor) |
| `SchemaContext.java` | `getDynamicAnchors()` | Per-resource `ConcurrentMap<String, Schema>` of `$dynamicAnchor` names → schemas |
| `ExecutionContext.java` | `getEvaluationSchema()` | The evaluation/dynamic-scope stack (`Deque<Schema>`) walked by `DynamicRefValidator` |
| `SchemaRegistry.java` | — | Resource registry; `$id` → schema resource; schema retrieval and caching |
| `resource/SchemaLoader.java` | — | Loads schema resources by retrieval IRI (classpath, HTTP, map) |
| `dialect/Draft202012.java` | — | Draft 2020-12 dialect definition (includes `$dynamicRef`, `$dynamicAnchor`) |
| `dialect/OpenApi31.java` | — | OpenAPI 3.1 dialect, built on `SpecificationVersion.DRAFT_2020_12` keywords + OAS base vocabulary |
| `dialect/OpenApi30.java` | — | OpenAPI 3.0 dialect (draft-07 based; no `$dynamicRef`) |
| `JsonSchemaTestSuiteTest.java` | `draft2022012()` / `disableV202012Tests()` | Test-suite harness; 2020-12 disable list is empty |
| `AbstractJsonSchemaTestSuite.java` | `createTests(...)` / `executeTest(...)` | Walks `.json` files recursively; runs each test case; configures remote loaders for `http://localhost:1234` |
| `src/test/suite/tests/draft2020-12/dynamicRef.json` | — | 18 test groups of official dynamicRef cases |
| `src/test/suite/tests/draft2020-12/optional/dynamicRef.json` | — | Optional dynamicRef cases |

## Existing Issues And Prior Art

- **PR #931 — "Support Draft 2020-12 and refactor schema retrieval"** (`justin-tay`, merged January 2024, shipped in v1.3.0). This is the landmark change that introduced `DynamicRefValidator`, the resource-registry refactor, per-resource `dynamicAnchors` maps, and correct dynamic-scope traversal. It was a breaking API change (documented in the 1.3.0 upgrade guide). This is the single most relevant prior art.
- **Issue #1012** (`jtregl`, closed) — "JSON Schema validation failed against custom JSON Meta Schema after update 1.2.0 -> 1.3.0". A regression report triggered by the #931 refactor; resolved. Not a `$dynamicRef`-specific defect.
- **Issue #475** (`ericbroda`, closed) — older meta-schema validation report, predating 2020-12 support.
- **No open issues or PRs** mention `$dynamicRef` or `$dynamicAnchor` gaps. A targeted search for both keywords returns only #931 and unrelated meta-schema reports.
- The README previously (1.0.78, 2023-03) stated "202012 version is only partially supported." That caveat is **obsolete** since #931; the README now advertises full Bowtie-tracked compliance and a 100% test-suite table.

Reference implementations for comparison: Hyperjump JSON Schema is the other fully-correct implementation tracked in this repo. networknt is the Java ecosystem's equivalent — a complete, test-suite-validated implementation rather than a partial one like AJV or the inline-schema gaps in python-jsonschema.

## Failure Modes To Test

Given that the official test suite passes at 100%, the remaining risk surface is OpenAPI-integration-specific rather than core-algorithmic. Modes worth probing:

- **OpenAPI document resource identity**: this repo's fixtures embed schemas in `components/schemas` with `$ref: '#/components/schemas/X'` alongside `$id: 'https://example.com/schemas/X'`. When an OpenAPI document is loaded as a single resource, the `$id` declarations create sub-resources. Dynamic scope must cross these boundaries correctly. This maps to test-suite cases that pass, but the OpenAPI-wrapped variant has not been run against networknt directly.
- **Inline response schemas without `$id`**: `paginated-response.yaml` and `api-envelope.yaml` bind `$dynamicAnchor` overrides in anonymous inline response schemas. In python-jsonschema these fail because anonymous resources lack registry identity. networknt's resource model differs (it tracks resources by `SchemaLocation` and populates `dynamicAnchors` during schema construction, not via a `referencing`-style registry that keys on `$id`), so it may or may not exhibit the same gap. This is the single highest-value test to run.
- **Multi-parameter generic binding with same-name anchors in siblings**: `nested-workspace-resources.yaml` has two `$dynamicAnchor` slots. AJV struggles here; the test-suite "strict-extendible" cases cover the single-slot version. The two-slot OpenAPI variant is unverified.
- **Non-fragment URI `$dynamicRef`**: `dynamicref-core-semantics.yaml` includes `https://example.com/schemas/non-fragment-root#meta`. The test-suite "relative-dynamic-reference" case (`extended#meta`) passes, so this should work, but the cross-document variant (`external-dynamic-ref.yaml`) depends on resource-loader configuration.

## Test Plan

networknt is a pure JSON Schema validator, so testing uses the standalone JSON Schema runtime path rather than SDK generator output. Two tiers:

### Tier 1: Official test suite (already passing)

The included `src/test/suite/tests/draft2020-12/dynamicRef.json` and `optional/dynamicRef.json` are the baseline. These already pass at 100%. No action needed; they serve as the regression net for any future change.

### Tier 2: This repo's fixtures, extracted to JSON Schema

For each OpenAPI fixture, extract the operation response schema and register `components/schemas` as resources, then validate valid and invalid instances. This requires a small Java test harness (or a Kotlin/Groovy script using the Maven artifact). Recommended fixtures in priority order:

1. **`generic-schema-binding.yaml`** — assert valid `PaginatedUserResponse`/`PaginatedGroupResponse` instances pass and invalid item shapes fail. Maps to passing test-suite cases, so this should confirm.
2. **`paginated-response.yaml`** — the highest-value probe. If the inline response schema (no explicit resource registration of the override) resolves `$dynamicRef` to the `not: {}` fallback instead of the bound item type, networknt has the same inline-resource gap as python-jsonschema. If it passes, networknt's resource model handles anonymous schemas differently and better.
3. **`api-envelope.yaml`** — two-level dynamic nesting. Assert the single-resource envelope binds `data` to `User` and the paginated route chains correctly.
4. **`recursive-category-tree.yaml`** — assert `LocalizedCategory.children` resolves to `LocalizedCategory`, not `BaseCategory`. Maps to the passing strict-tree suite case.
5. **`nested-workspace-resources.yaml`** — assert both `$dynamicAnchor` slots resolve through the active dynamic path; invalid nested folders missing permissions must fail.
6. **`spec-semantics/dynamicref-core-semantics.yaml`** — the semantics fixture; assert same-resource anchors, `$dynamicRef`→`$anchor`, `$ref`→`$dynamicAnchor`, non-fragment URI refs, multi-parameter dictionary binding, and allOf order all behave per spec.
7. **`spec-semantics/external-dynamic-ref.yaml`** — assert external `$dynamicRef` resolves across documents when the external resource is registered via `MapResourceLoader` or `schemas(...)`.

### Assertions

- **Automatable**: all validator pass/fail assertions — valid instances produce zero errors, invalid instances produce errors, `$dynamicRef` resolves to the concrete bound type rather than `not: {}`.
- **Requires human review**: whether any fixture failure is a networknt limitation, a fixture-extraction artifact (missing resource registration), or a spec ambiguity.

### Upstream test framework

JUnit 5 (`@TestFactory` + `DynamicNode`), matching `JsonSchemaTestSuiteTest.java`. A contribution would add fixture-derived test cases to `JsonSchemaTestSuiteExtrasTest.java` or a new test class.

## Implementation Plan

No implementation work is needed — `$dynamicRef` / `$dynamicAnchor` are correctly implemented and ship in all current release lines (2.x and 3.x).

If Tier 2 testing reveals a gap (most plausibly the inline-schema resource-identity case), the fix location is already clear:

- **Dynamic-scope walk**: `keyword/DynamicRefValidator.java` — `getRefSchema(...)` already walks `executionContext.getEvaluationSchema()`. If anonymous inline schemas are not appearing in that stack with their `dynamicAnchors` populated, the defect is in schema construction/resource registration (`SchemaRegistry` / `Schema` creation path), not in the walk logic itself.
- **Resource identity for anonymous schemas**: investigate whether `SchemaContext.getDynamicAnchors()` is populated for schemas loaded inline without `$id`. networknt keys resources by `SchemaLocation` (which always exists) rather than solely by `$id`, so it may already handle this — unlike python-jsonschema's `referencing`-based registry. This is the key thing Tier 2 testing would confirm.

Backwards-compatibility risk for any hypothetical fix is low: the dynamic-scope walk is isolated to `DynamicRefValidator` and only affects schemas that actually use `$dynamicRef`. Ordinary `$ref`, `$id`, `$anchor`, circular refs, and draft-04/06/07 documents would be unaffected.

## Upstream Strategy

### Recommendation

**Reclassify this tool from "Unknown" to "Correct" in `TOOLING_CATALOG.md`**, and add it to the "Correct implementations" section. No upstream outreach is needed for core `$dynamicRef` support.

The only worthwhile follow-up is running this repo's OpenAPI-wrapped fixtures (Tier 2 above) against the validator to confirm the inline-schema and multi-parameter patterns behave correctly when schemas are extracted from an OpenAPI document. If any case fails, file a focused bug report with a minimal reproducer — the maintainer (`justin-tay`) has a strong track record of fast, correct fixes in this area.

### Expected acceptance likelihood

N/A for the implementation (already merged). **High** for any well-scoped bugfix with a minimal reproducer, based on the maintainer's history of merging external PRs and fixing dynamic-scope / resource-resolution issues promptly.

### Downstream beneficiaries

networknt is already correct, so the benefit is signaling: downstream Java OpenAPI tools that delegate schema validation to networknt inherit correct `$dynamicRef` behavior today. This includes:

- **light-4j** / **light-rest-4j** — the networknt microservices framework that validates request/response against OpenAPI specs at runtime.
- **mservicetech/openapi-schema-validation** — a generic OpenAPI 3.0 validator built on networknt.
- **mpenet/legba** — Clojure OpenAPI service library using networknt.
- Any Java/Spring/Quarkus application that pulls in networknt for request validation against OpenAPI 3.1 schemas.

If a future Tier 2 test reveals and fixes an inline-schema gap, the fix would benefit all of the above for OpenAPI 3.1 response-level `$dynamicAnchor` overrides.

## Open Questions

1. **Does networknt handle inline response schemas without `$id` in dynamic scope?** python-jsonschema fails here because `referencing` keys resources by `$id`. networknt keys resources by `SchemaLocation` and populates `dynamicAnchors` at construction time, so it may not have the same limitation. Tier 2 test of `paginated-response.yaml` and `api-envelope.yaml` would resolve this. Inference: likely works, but unverified.
2. **Does the multi-parameter `nested-workspace-resources.yaml` pattern resolve correctly?** The single-slot version passes in the official suite. The two-slot OpenAPI variant is unverified. Inference: likely works given the walk logic is slot-agnostic.
3. **Should this repo add a Java-based runtime validation script** (analogous to `npm run validate:jsonschema` for AJV/Hyperjump) to include networknt in the fixture validation matrix? Currently the matrix only covers JS and Python validators.

## Sources

- Repository: https://github.com/networknt/json-schema-validator (master branch, v3.0.4)
- Maven Central: `com.networknt:json-schema-validator:3.0.4`
- CHANGELOG: https://github.com/networknt/json-schema-validator/blob/master/CHANGELOG.md
- README (test-suite compliance table + Bowtie badges): https://github.com/networknt/json-schema-validator/blob/master/README.md
- PR #931 (2020-12 support + dynamic scope): https://github.com/networknt/json-schema-validator/pull/931
- `DynamicRefValidator`: https://github.com/networknt/json-schema-validator/blob/master/src/main/java/com/networknt/schema/keyword/DynamicRefValidator.java
- `SchemaContext` (dynamicAnchors map): https://github.com/networknt/json-schema-validator/blob/master/src/main/java/com/networknt/schema/SchemaContext.java
- `OpenApi31` dialect (2020-12 based): https://github.com/networknt/json-schema-validator/blob/master/src/main/java/com/networknt/schema/dialect/OpenApi31.java
- `JsonSchemaTestSuiteTest` (empty 2020-12 disable list): https://github.com/networknt/json-schema-validator/blob/master/src/test/java/com/networknt/schema/JsonSchemaTestSuiteTest.java
- Draft 2020-12 dynamicRef test suite: https://github.com/networknt/json-schema-validator/blob/master/src/test/suite/tests/draft2020-12/dynamicRef.json
- Bowtie compliance report: https://bowtie.report/#/implementations/java-networknt-json-schema-validator
- `pom.xml` dependencies: https://github.com/networknt/json-schema-validator/blob/master/pom.xml
- Local catalog entry: `TOOLING_CATALOG.md` (Section 2, Runtime JSON Schema Validators)
