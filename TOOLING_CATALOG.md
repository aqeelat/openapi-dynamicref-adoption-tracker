# OpenAPI/JSON Schema Tooling Catalog — `$dynamicRef` Relevance

Tools that parse, resolve, bundle, validate, or lint OpenAPI specs and JSON Schemas containing `$dynamicRef` / `$dynamicAnchor`.

Status key:
- **No support** — tool crashes, errors, or silently drops/mangles `$dynamicRef`
- **Partial** — tool passes through specs without error but does not correctly resolve dynamic scope
- **Correct** — tool implements full 2020-12 `$dynamicRef` dynamic scope resolution
- **Unknown** — not yet tested against dynamicRef fixtures

Priority key:
- **Done** — already Correct; no work needed.
- **High** — actively maintained AND high ecosystem impact; candidate for `$dynamicRef` work soon.
- **Medium** — actively maintained but niche / moderate impact, OR blocked but worth tracking.
- **Low** — unmaintained/stale (last update >1 year ago, see Notes), architecturally blocked with no path, proprietary (no source), or already Correct. Not a near-term work target.

Dependency columns:
- **Blocked by** — upstream tool that must be fixed first before this tool can be addressed. `—` means no upstream blocker. **Only research tools where this column is `—`.**
- **Backed by** — upstream tool that is already Correct, so this tool likely works but needs fixture verification. `—` means no relevant upstream dependency.

---

## 1. Parsers / Resolvers / Bundlers

These libraries parse OpenAPI specs, resolve `$ref` pointers, and/or bundle multi-file specs. They must **preserve `$dynamicRef`/`$dynamicAnchor` without changing dynamic scope** during resolution/bundling.

| Tool | URL | License | `$dynamicRef` Status | Priority | Parser | Sibling-safe | Blocked by | Backed by | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **@apidevtools/swagger-parser** | https://github.com/APIDevTools/swagger-parser | MIT (OSS) | Correct (spec-level) | Done | own | ✓ | — | — | **v12+ supports OAS 3.1.** `validate`/`dereference` both accept 3.1 and preserve `$dynamicRef`/`$dynamicAnchor` opaquely. No semantic dynamic-scope resolution. Used by Hoppscotch, swagger-jsdoc, rtk-query. |
| **@redocly/cli** (bundle) | https://github.com/Redocly/redocly-cli | MIT (OSS) | Correct (spec-level) | Done | Redocly core | ✓ | — | — | Bundles OAS 3.0/3.1/3.2. Passes all fixtures. Preserves `$dynamicRef`/`$dynamicAnchor` as-is. |
| **Stoplight Prism** | https://github.com/stoplightio/prism | Apache-2.0 (OSS) | Partial | High | own + AJV | ? | AJV | — | Mock server + validation proxy. Uses AJV for validation (inherits AJV gaps). |
| **openapi-schema-validator** (Python) | https://github.com/python-openapi/openapi-schema-validator | Apache-2.0 (OSS) | Partial | Medium | python-jsonschema | ✓ | python-jsonschema | — | Delegates to `jsonschema` (Partial). Inherits Partial `$dynamicRef`. |
| **openapi-core** (Python) | https://github.com/python-openapi/openapi-core | BSD-3 (OSS) | Partial | Medium | openapi-schema-validator | ✓ | openapi-schema-validator | — | Request/response validation delegated to `openapi-schema-validator` (→ python-jsonschema). |
| **json-schema-bundler** (Hyperjump) | Part of `@hyperjump/json-schema` | MIT (OSS) | Correct | Done | Hyperjump | ✓ | — | — | Official 2020-12 bundling. Preserves keywords correctly. |
| **Mermade/oas-kit** | https://github.com/Mermade/oas-kit | BSD-3 (OSS) | Unknown | Low | own | ? | — | — | Last update: 2021-07-07. Stale (>1yr); tracked. |
| **swagger-parser** (Java, Swagger API) | https://github.com/swagger-api/swagger-parser | Apache-2.0 (OSS) | Partial | High | swagger-core | **✗** | swagger-core | — | `$dynamicRef` consumer survives; anchors on concrete schemas survive. But override `$dynamicAnchor` beside `$ref` is dropped — **swagger-core collapses `$ref` schemas to reference-only** (OAS-3.0 behavior). **PR #2332 verified insufficient** (built + re-run: counts unchanged). See `analysis/swagger-parser.md` + `analysis/ref-sibling-preservation.md`. |
| **swagger-inflector** (Java) | https://github.com/swagger-api/swagger-inflector | Apache-2.0 (OSS) | Partial | Low | swagger-parser | ✗ | swagger-parser | — | Inherits swagger-parser's sibling-drop. |
| **kiota** (Microsoft) | https://github.com/microsoft/kiota | MIT (OSS) | Partial | High | Microsoft.OpenApi | **✗** | Microsoft.OpenApi | — | **Pattern A actionable now; Pattern B blocked** — `LoadSchema` drops `$ref` siblings ([OpenAPI.NET#2895](https://github.com/microsoft/OpenAPI.NET/issues/2895), PR [#2896](https://github.com/microsoft/OpenAPI.NET/pull/2896)). Steps 1–6 landed; step 7 blocked. Track [kiota#7815](https://github.com/microsoft/kiota/issues/7815). See `analysis/kiota.md` + `analysis/ref-sibling-preservation.md`. |
| **libopenapi** (Go) | https://github.com/pb33f/libopenapi | MIT (OSS) | **Correct** | Done | own | ✓ | — | — | `$dynamicRef`/`$dynamicAnchor` since v0.30.1. Both keywords parsed into schema models; bundler preserves them. Used by vacuum, wiretap. |
| **OpenAPIKit** (Swift, mattpolzin) | https://github.com/mattpolzin/OpenAPIKit | MIT (OSS) | Partial | High | own | ✓ | — | — | `$anchor`/`$dynamicAnchor` preserved (#360). `$dynamicRef` pending **[PR #501](https://github.com/mattpolzin/OpenAPIKit/pull/501)** (`aqeelat`, in progress). Unblocks `swift-openapi-generator` #547. See `analysis/openapikit.md`. |
| **apidevtools/json-schema-ref-parser** | https://github.com/APIDevTools/json-schema-ref-parser | MIT (OSS) | No support | Low | own | ✗ | — | — | Dereferences/bundles all `$ref`s — destroys `$dynamicRef` semantics. |

---

## 2. Runtime JSON Schema Validators

These validate data instances against JSON Schemas. For `$dynamicRef` to work, the validator must implement **dynamic scope resolution** per JSON Schema 2020-12.

| Tool | URL | License | `$dynamicRef` Status | Priority | Parser | Blocked by | Backed by | Notes |
|---|---|---|---|---|---|---|---|---|
| **AJV** (v8) | https://github.com/ajv-validator/ajv | MIT (OSS) | Partial (with known gaps) | High | own | — | — | Fails generic pagination/wrapper patterns; PR [#2615](https://github.com/ajv-validator/ajv/pull/2615) unmerged. Recursive `$dynamicRef` works. Most widely used JS validator. |
| **Hyperjump JSON Schema** | https://github.com/hyperjump-io/json-schema | MIT (OSS) | Correct | Done | own | — | — | Reference-correct. Passes all patterns incl. external `$dynamicRef`. |
| **python-jsonschema** | https://github.com/python-jsonschema/jsonschema | MIT (OSS) | Partial | High | own | — | — | 2020-12 support; edge-case completeness undocumented. Used by openapi-spec-validator, openapi-schema-validator. |
| **jsonschema-rs** (Rust) | https://github.com/Stranger6667/jsonschema-rs | MIT (OSS) | Correct | Done | own | — | — | Correct `$dynamicRef`/`$dynamicAnchor`. Full JSTS 2020-12 zero xfails. Python/Ruby bindings. See `analysis/jsonschema-rs.md`. |
| **json-schema-validator** (Java, networknt) | https://github.com/networknt/json-schema-validator | Apache-2.0 (OSS) | Correct | Done | own | — | — | Correct since v1.3.0 (PR #931). 100% JSTS 2020-12 pass. See `analysis/networknt-json-schema-validator.md`. |
| **justinrainbow/json-schema** (PHP) | https://github.com/jsonrainbow/json-schema | MIT (OSS) | Partial | Medium | own | — | — | Draft-07 + some 2020-12. `$dynamicRef` incomplete. |
| **Opis JSON Schema** (PHP) | https://github.com/opis/json-schema | Apache-2.0 (OSS) | Correct | Done | own | — | — | All 1227 official draft2020-12 tests pass. See `analysis/opis-json-schema.md`. |
| **Boon** (Rust) | https://github.com/santhosh-tekuri/boon | MIT (OSS) | Correct | Done | own | — | — | `compiler.rs:602-612` implements `DynamicRef`. Recursive-tree smoke test passes. See `analysis/boon.md`. |

---

## 3. OpenAPI Linting / Quality Tools

These tools lint OpenAPI specs for style, correctness, and best practices. They need to **not crash on** specs containing `$dynamicRef`/`$dynamicAnchor` and ideally should provide rules that understand dynamic references.

| Tool | URL | License | `$dynamicRef` Status | Priority | Parser | Blocked by | Backed by | Notes |
|---|---|---|---|---|---|---|---|---|
| **Spectral** | https://github.com/stoplightio/spectral | Apache-2.0 (OSS) | Correct (spec-level) | Done | own | — | — | Passes all fixtures. Treats `$dynamicRef`/`$dynamicAnchor` as valid keywords. |
| **Redocly CLI** (lint) | https://github.com/Redocly/redocly-cli | MIT (OSS) | Correct (spec-level) | Done | Redocly core | — | — | Passes all fixtures. Treats keywords as valid. |
| **vacuum** | https://github.com/daveshanley/vacuum | MIT (OSS) | Correct (spec-level) | Done | libopenapi | — | libopenapi | Explicitly recognizes `$dynamicRef`/`$recursiveRef` as dynamic-scope keywords (`references.go`). All 4 fixtures exit 0; bundle preserves keywords. See `analysis/vacuum.md`. |
| **openapi-spec-validator** (Python) | https://github.com/python-openapi/openapi-spec-validator | Apache-2.0 (OSS) | Correct (spec-level) | Done | python-jsonschema | — | — | Passes all fixtures. Accepts keywords as valid within OAS 3.1+. |
| **Zally** (zalando) | https://github.com/zalando/zally | MIT (OSS) | No support | Low | swagger-parser | swagger-parser | — | Pins `swagger-parser-v3:2.1.12` (pre-`$dynamicRef`). Dropped at parse time. Last release v2.1.1 (Dec 2022). See `analysis/zally.md`. |
| **oasdiff** | https://github.com/oasdiff/oasdiff | Apache-2.0 (OSS) | Correct | Done | kin-openapi | — | kin-openapi | `$dynamicRef`/`$dynamicAnchor` are first-class diffable fields. All 4 fixtures validate exit 0. See `analysis/oasdiff.md`. |
| **ibm-openapi-validator** | https://github.com/IBM/openapi-validator | Apache-2.0 (OSS) | Partial | Medium | Spectral | — | Spectral | `no-$ref-siblings` rule deliberately extended to OAS 3.1 (PR #635) → generic-binding pattern errors. Workaround: disable the rule. See `analysis/ibm-openapi-validator.md`. |

---

## 4. Documentation Renderers

These render OpenAPI specs as interactive documentation. They need to display schemas containing `$dynamicRef` without crashing.

| Tool | URL | License | `$dynamicRef` Status | Priority | Parser | Blocked by | Backed by | Notes |
|---|---|---|---|---|---|---|---|---|
| **Swagger UI** | https://github.com/swagger-api/swagger-ui | Apache-2.0 (OSS) | Partial | Medium | ApiDOM | ApiDOM | — | Displays keywords as cosmetic labels; sample generation ignores `$dynamicRef`. Fix belongs in ApiDOM (apidom#378 closed `not_planned`). Issue swagger-ui#10912 open. |
| **Redoc** | https://github.com/Redocly/redoc | MIT (OSS) | No support | Medium | Redocly core | — | — | Redocly core + openapi-sampler; `$ref`-centric → render/sample degradation. See `analysis/redoc.md`. |
| **Stoplight Elements** | https://github.com/stoplightio/elements | Apache-2.0 (OSS) | No support | Medium | own | — | — | Forces OAS 3.1 → draft-07 dialect (a blocker); `$ref`-centric sampler. See `analysis/stoplight-elements.md`. |
| **Scalar** | https://github.com/scalar/scalar | MIT (OSS) | No support | High | own | — | — | `@scalar/json-magic` only checks `$ref`; `SchemaObject` lacks keyword fields. Maintainers aware (PR #8359). Issue #9414 open. High landing likelihood. [Full analysis](analysis/scalar.md) |
| **RapiDoc** | https://github.com/mrin9/RapiDoc | MIT (OSS) | No support | Low | @apitools/openapi-parser | — | — | `$ref`-only schema rendering/example-gen. Less active. See `analysis/rapidoc.md`. |
| **OpenAPI Explorer** | https://github.com/Authress-Engineering/openapi-explorer | Apache-2.0 (OSS) | No support | Medium | json-schema-ref-parser | — | — | `$ref`-only renderer; likely blank/empty degradation. See `analysis/openapi-explorer.md`. |

---

## 5. SDK Generators / Type Emitters

SDK generator results are tracked in [state-of-the-union.md](state-of-the-union.md) and the CI matrix. This section lists additional generators beyond the matrix.

| Tool | URL | License | `$dynamicRef` Status | Priority | Parser | Blocked by | Backed by | Notes |
|---|---|---|---|---|---|---|---|---|
| **Fern** | https://github.com/fern-api/fern | Partial (open core) | No support | Medium | own (openapi-to-ir) | — | — | Importer uses only `openapi-types`; `$dynamicRef` treated as literal data field. Confirmed by Fern's `deeply-recursive` test fixture. See `analysis/fern.md`. |
| **Speakeasy** | https://github.com/speakeasy-api/speakeasy | Partial (open core) | No support | Medium | own (speakeasy-api/openapi) | — | — | Warns `$dynamicRef`/`$dynamicAnchor` are "unknown property"; slots → `any`. Parser test-suite blacklists all `dynamicRef.json`. See `analysis/speakeasy.md`. |
| **openapi-fetch** | https://github.com/openapi-ts/openapi-typescript/tree/main/packages/openapi-fetch | MIT (OSS) | No support | Low | openapi-typescript | openapi-typescript | — | Inherits types from openapi-typescript (`unknown` for `$dynamicRef` slots). Fix lives in openapi-typescript (#2029). See `analysis/openapi-fetch.md`. |
| **QuickType** | https://github.com/glideapps/quicktype | Apache-2.0 (OSS) | Unknown | Low | own | — | — | Last update: 2025-05-26. Stale (>1yr); tracked. |
| **swift-openapi-generator** | https://github.com/apple/swift-openapi-generator | Apache-2.0 (OSS) | No support | Medium | OpenAPIKit | OpenAPIKit | — | Slot degrades to `OpenAPIValueContainer` (untyped). Issue #547 blocked on OpenAPIKit — your PR [#501](https://github.com/mattpolzin/OpenAPIKit/pull/501). See `analysis/swift-openapi-generator.md`. |
| **oapi-codegen** | https://github.com/oapi-codegen/oapi-codegen | Apache-2.0 (OSS) | No support | Medium | kin-openapi | — | — | OAS 3.0 → Go. OAS 3.1 in progress (PR #2336). Gated on 3.1 baseline. Active maintainer. |
| **ogen** | https://github.com/ogen-go/ogen | Apache-2.0 (OSS) | No support | Medium | own | — | — | OAS 3.x → Go strict typing. 3.1 partial (PR #1619). Blocked on 3.1 baseline. |
| **swagger-axios-codegen** | https://github.com/Manweill/swagger-axios-codegen | MIT (OSS) | No support | Low | own | — | — | Emits axios methods, not resolved types. Niche. See `analysis/swagger-axios-codegen.md`. |
| **openapi-client-axios** | https://github.com/openapistack/openapi-client-axios | MIT (OSS) | No support | Low | json-schema-deref-sync | — | — | Runtime axios client. `$ref`-only deref; `$dynamicRef` ignored. See `analysis/openapi-client-axios.md`. |
| **@rtk-query/codegen-openapi** | https://github.com/reduxjs/redux-toolkit | MIT (OSS) | No support | Low | @apidevtools/swagger-parser@10 | — | — | Codegen ignores keyword → response slots untyped. 0 issues. See `analysis/rtk-query-codegen-openapi.md`. |

---

## 6. Spec Producers

Tools that generate OpenAPI specs from source code. These should add `$dynamicRef` emission as opt-in until downstream support is reliable.

| Tool | URL | License | Language/Platform | `$dynamicRef` Status | Priority | Parser | Blocked by | Backed by | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **springdoc-openapi** | https://github.com/springdoc/springdoc-openapi | Apache-2.0 (OSS) | Java/Spring | No support | Low | swagger-core-jakarta | swagger-core-jakarta | — | Schema modeling delegated to `swagger-core-jakarta` (no keyword fields). Upstream-blocked. |
| **@nestjs/swagger** | https://github.com/nestjs/swagger | MIT (OSS) | TypeScript/NestJS | No support | Low | own | — | — | OAS 3.0 target. Static generic resolution. |
| **FastAPI** | https://github.com/tiangolo/fastapi | MIT (OSS) | Python | No support | Low | Pydantic | Pydantic | — | Pydantic resolves generics statically; no `$dynamicRef` emitted. |
| **swaggo/swag** | https://github.com/swaggo/swag | MIT (OSS) | Go | No support | Low | own | — | — | Doc comments → Swagger 2.0 only. |
| **poem-openapi** | https://github.com/poem-web/poem | MIT/Apache-2.0 (OSS) | Rust | No support | Low | own | — | — | OpenAPI 3.0 hardcoded. No OAS 3.1. |
| **utoipa** | https://github.com/juhaku/utoipa | MIT/Apache-2.0 (OSS) | Rust | No support | Low | own | — | — | OAS 3.1 incomplete (PR #1555). Macros collapse generics. |
| **Swashbuckle.AspNetCore** | https://github.com/domaindrivendev/Swashbuckle.AspNetCore | MIT (OSS) | C#/.NET | No support | Low | Microsoft.OpenApi 2.7.6 | — | — | C# reflection; no emit path. `Microsoft.OpenApi` v2 line. See `analysis/swashbuckle-aspnetcore.md`. |
| **drf-spectacular** | https://github.com/tfranzel/drf-spectacular | BSD-3 (OSS) | Python/Django | No support | Low | own | — | — | OAS 3.0. Serializer-centric; no JSON Schema AST. |
| **tsoa** | https://github.com/lukeautry/tsoa | MIT (OSS) | TypeScript | No support | Low | own | — | — | Decorators + type inference → OAS 3.0. Static generics. |
| **Huma** | https://github.com/danielgtaylor/huma | MIT (OSS) | Go | No support | Low | own | — | — | OAS 3.1. Concrete Go types; no keyword fields in Schema. |
| **Litestar** | https://github.com/litestar-org/litestar | MIT (OSS) | Python | No support | Medium | own | — | — | OAS 3.1 first-class. Schema dataclass nearly complete 2020-12 but missing `$dynamicRef`/`$dynamicAnchor` fields. Bounded opportunity. |
| **aide** | https://github.com/tamasfe/aide | MIT/Apache-2.0 (OSS) | Rust | No support | Medium | schemars | — | — | Axum → OAS 3.1. `schemars` retains Rust generics at compile-time → emission path exists (Orval-modeled inverse). See `analysis/aide.md`. |
| **okapi** | https://github.com/GREsau/okapi | MIT (OSS) | Rust | No support | Low | schemars | — | — | Schemars + Rocket → OAS 3.0. Reflection-based. See `analysis/okapi.md`. |
| **paperclip** | https://github.com/paperclip-rs/paperclip | MIT/Apache-2.0 (OSS) | Rust | No support | Low | openapiv3-paper | — | — | actix/axum plugin, v2+v3. Reflection-based. See `analysis/paperclip.md`. |
| **Micronaut OpenAPI** | https://github.com/micronaut-projects/micronaut-openapi | Apache-2.0 (OSS) | Java/Micronaut | Partial | High | swagger-core | — | swagger-core | **Highest-leverage producer target.** Compile-time AOT retains generics. Authoring layer exists; merge preservation exists. Goal: Orval-modeled auto-emission from Java generics. See `analysis/micronaut-openapi.md`. |
| **SmallRye OpenAPI** | https://github.com/smallrye/smallrye-open-api | Apache-2.0 (OSS) | Java/Quarkus | No support | Low | own | — | — | Own `SchemaImpl` model (no keyword fields). Default OAS 3.1.0. See `analysis/smallrye-open-api.md`. |
| **Pydantic** (json_schema) | https://github.com/pydantic/pydantic | MIT (OSS) | Python | No support | Low | own | — | — | `TypeAdapter.json_schema()` emits 2020-12 with `$ref`/`$defs` but resolves `TypeVar`s to concrete types. See `analysis/pydantic.md`. |
| **@hono/zod-openapi** | https://github.com/honojs/hono | MIT (OSS) | TypeScript/Hono | No support | Medium | Zod | — | — | Zod has no open generic type — `$dynamicRef` inexpressible. See `analysis/hono-zod-openapi.md`. |
| **ts-rest** | https://github.com/ts-rest/ts-rest | MIT (OSS) | TypeScript | Unknown | Low | own | — | — | Last update: 2025-06-02. Stale; tracked. |
| **tRPC OpenAPI** | https://github.com/jlalmes/trpc-openapi | MIT (OSS) | TypeScript | Unknown | Low | own | — | — | Last update: 2024-11-19. Stale; tracked. |
| **rswag** | https://github.com/rswag/rswag | MIT (OSS) | Ruby/Rails | No support | Low | own | — | — | RSpec → OAS 3.0. Example-driven. See `analysis/rswag.md`. |
| **Swagger-PHP** | https://github.com/zircote/swagger-php | Apache-2.0 (OSS) | PHP | No support | Low | own | — | — | `Schema` model has no keyword fields. OAS 3.0. See `analysis/swagger-php.md`. |
| **NelmioApiDocBundle** | https://github.com/nelmio/NelmioApiDocBundle | MIT (OSS) | PHP/Symfony | No support | Low | swagger-php | swagger-php | — | Delegates to Swagger-PHP. Inherits gap. See `analysis/nelmioapidocbundle.md`. |
| **express-jsdoc-swagger** | https://github.com/BRIKEV/express-jsdoc-swagger | MIT (OSS) | JavaScript/Express | Unknown | Low | own | — | — | Last update: 2023-10-23. Stale; tracked. |
| **swagger-jsdoc** | https://github.com/Surnet/swagger-jsdoc | MIT (OSS) | JavaScript | No support | Low | @apidevtools/swagger-parser@12 | — | @apidevtools/swagger-parser | JSDoc concatenator. Hand-authored `$dynamicRef` passes through opaquely. See `analysis/swagger-jsdoc.md`. |
| **Flask-RESTX** | https://github.com/python-restx/flask-restx | BSD-3 (OSS) | Python/Flask | No support | Low | own | — | — | Own swagger model, OAS 3.0. See `analysis/flask-restx.md`. |
| **Flasgger** | https://github.com/flasgger/flasgger | MIT (OSS) | Python/Flask | Unknown | Low | own | — | — | Last update: 2024-04-23. Stale; tracked. |
| **APIFlask** | https://github.com/apiflask/apiflask | MIT (OSS) | Python/Flask | No support | Low | apispec | — | — | `apispec` + `marshmallow` → OAS 3.0. Concrete types. See `analysis/apiflask.md`. |
| **BlackSheep** | https://github.com/Neoteroi/BlackSheep | MIT (OSS) | Python | No support | Low | own | — | — | ASGI; `blacksheep/server/openapi` → 3.0. See `analysis/blacksheep.md`. |
| **Connexion** | https://github.com/spec-first/connexion | Apache-2.0 (OSS) | Python | No support | Low | jsonschema (Draft4) | — | — | Pins `Draft4Validator` — draft-4 doesn't know `$dynamicRef`. Fix: `Draft202012Validator` for 3.1. See `analysis/connexion.md`. |
| **Vapor OpenAPI** | https://github.com/dankinsoid/VaporToOpenAPI | MIT (OSS) | Swift/Vapor | No support | Low | own | — | — | Reflection-based `Codable` → OpenAPI. See `analysis/vaportoopenapi.md`. |

---

## 7. API Client / Testing Tools

Tools that import OpenAPI specs for making API calls, testing, or interactive exploration.

| Tool | URL | License | `$dynamicRef` Status | Priority | Parser | Blocked by | Backed by | Notes |
|---|---|---|---|---|---|---|---|---|
| **Postman** (openapi-to-postman) | https://github.com/postmanlabs/openapi-to-postman | Apache-2.0 (OSS, converter) | Partial / Unknown | High | own + AJV | AJV | — | `oas-resolver-browser` does static `$ref` only; `$dynamicRef` likely opaque passthrough. Needs fixture verification. |
| **Insomnia** | https://github.com/Kong/insomnia | Apache-2.0 (OSS) | No support | Medium | @apidevtools/swagger-parser@10 | @apidevtools/swagger-parser | — | OAS 3.1 basic import works (PR #5459) but `$dynamicRef` silently ignored. |
| **Hoppscotch** | https://github.com/hoppscotch/hoppscotch | MIT (OSS) | Correct (spec-level) | Low | @apidevtools/swagger-parser@12 | — | @apidevtools/swagger-parser | `validate` + `dereference` both preserve keywords opaquely (no crash). Correct for an importer. See `analysis/hoppscotch.md`. |
| **Bruno** | https://github.com/usebruno/bruno | MIT (OSS) | No support | High | jsonschema (draft-04) | — | — | No JSON Schema validation lib in converter; app uses `jsonschema@^1.5.0` (draft-04/06). Best contribution target. |
| **Yaak** | https://github.com/mountain-loop/yaak | MIT (OSS) | No support | Medium | openapi-to-postmanv2 | openapi-to-postmanv2 | — | Delegates to Postman's converter. Feature changes require approved feedback item. |
| **Schemathesis** | https://github.com/schemathesis/schemathesis | MIT (OSS) | Partial | Medium | python-jsonschema | python-jsonschema | — | Validation inherits python-jsonschema's Partial; test data for `$dynamicRef` schemas likely incomplete. |
| **HTTPie** | https://httpie.io | BSD-3 (OSS) | Unknown | Low | — | — | — | Last update: 2024-12-17. CLI HTTP client. OpenAPI autocompletion. Stale; tracked. |

---

## 8. Mock Servers

Tools that generate mock API responses from OpenAPI specs.

| Tool | URL | License | `$dynamicRef` Status | Priority | Parser | Blocked by | Backed by | Notes |
|---|---|---|---|---|---|---|---|---|
| **Stoplight Prism** | https://github.com/stoplightio/prism | Apache-2.0 (OSS) | Partial | High | own + AJV | AJV | — | See §1. Inherits AJV gaps for mock generation. |

---

## 9. Dismissed / Out of Scope

Tools moved out of the main sections because `$dynamicRef` is **architecturally inapplicable** (not because they're merely hard). Reasons: wrong spec dialect, not an OpenAPI tool, not schema-resolving by design, proprietary (no source), no public repo, or repo dead/gone. Analysis files removed where they existed.

### Wrong spec dialect (no `$dynamicRef` concept)
| Tool | Reason |
|---|---|
| **go-swagger** | Emits **Swagger 2.0**. `$dynamicRef` is a JSON Schema 2020-12 / OAS 3.1 feature — two generations ahead. |
| **grape-swagger** | Grape → **Swagger 2.0**. Wrong dialect. |
| **everit-org/json-schema** | Java validator; **draft-07 only** — no 2020-12, no `$dynamicRef`. |
| **json-schema** (Ruby, voxpupuli) | Ruby validator; **draft-06/07** only. No 2020-12 support. |

### Not OpenAPI / not schema-resolving by design
| Tool | Reason |
|---|---|
| **sdkgen** | Consumes its own `.sdkgen` DSL (`@sdkgen/parser`), not OpenAPI/JSON Schema. `$dynamicRef` doesn't apply. |
| **Microcks** | Example-driven mock server — serves canned examples, does not resolve JSON Schema. `$dynamicRef` irrelevant to its function. |
| **Mockoon** | Canned-response mock; OpenAPI import extracts paths + example responses. Not schema-driven. |
| **WireMock** | OSS WireMock does **not consume OpenAPI** (stub-mapping based; no OpenAPI module in the build). OpenAPI mocking is a WireMock Cloud (proprietary) feature. |

### Proprietary / no source to analyze
| Tool | Reason |
|---|---|
| **Stainless** | Proprietary. Powers OpenAI/Stripe/Anthropic SDKs; no public source. |
| **liblab** | Proprietary enterprise SDK generation. No public source. |
| **apimatic** | Proprietary. 12+ language SDK generation. No public source. |
| **Apidog** | Proprietary all-in-one API platform. No public source. |

### No public repo
| Tool | Reason |
|---|---|
| **ASP.NET Core built-in OpenAPI** | Microsoft docs only; no public source repo to analyze. |

### Repo dead / gone
| Tool | Reason |
|---|---|
| **json-schema-validator** (.NET, lateapexearlystudio) | Org `lateapexearlystudio` deleted/renamed — repo not found. |
| **OnlineCEH/go-jsonschema** | Repo not found. |
| **qlik-trial/json-schema** | Repo not found. |
| **jval** (Java) | Repo not found. |
| **saismic/lapis-json-schema** | Vague ("smaller validators across languages"); no canonical repo. |
| **goldSpec/laravel-openapi** | Repo not found. |
| **@apidevtools/swagger-cli** | Archived; deprecated in favor of Redocly CLI. Swagger 2.0 / OAS 3.0 only. |
| **Konfig** | Sunset Dec 2024. |
| **springfox** | Legacy; superseded by springdoc; largely unmaintained. |
| **API Sprout** | Last release 2019; archived/stale. |

---

Outreach workflow (issue templates, contact tracking) is maintained locally in `OUTREACH_TRACKER.md` (not committed).

Matrix-tested SDK generators (Orval, OpenAPI Generator, Swagger Codegen v3, openapi-typescript, @hey-api/openapi-ts, openapi-typescript-codegen, oazapfts, Kiota, NSwag) are tracked in [state-of-the-union.md](state-of-the-union.md).

---

## Summary of Known Gaps

### Critical (blocks adoption)
1. **AJV** — merged fix PR [#2615](https://github.com/ajv-validator/ajv/pull/2615) is the single highest-impact unmerged fix. AJV is the default JSON Schema validator in the JS ecosystem and is used by Prism, Spectral internals, and countless applications.
2. **OpenAPI Generator** — cannot parse `$dynamicAnchor` at all. Blocks any spec producer from emitting dynamicRef.

### Important (degraded output)
3. **Stoplight Prism** — inherits AJV gaps for mock generation.
4. **Postman** (`openapi-to-postmanv2`) — AJV v8 present; `oas-resolver-browser` does static `$ref` only; `$dynamicRef` likely treated as opaque passthrough without semantic resolution. Unverified — no fixture test yet.
5. **Insomnia** — blocked upstream by `@apidevtools/swagger-parser` which does not resolve `$dynamicRef`.
6. **Yaak** — delegates to `openapi-to-postmanv2`; inherits all Postman converter gaps.
7. **Bruno** — converter in `packages/bruno-converters/src/openapi/`; app uses `jsonschema` (draft-04/06); `$dynamicRef` silently ignored. Most approachable for a direct fix.

### Correct implementations
- **Orval** (SDK generator) — `$dynamicRef`/`$dynamicAnchor` fully supported since v8.13.0 (May 2026). Emits generic interfaces (`PaginatedTemplate<T>`) and bound aliases (`type Alias = Template<Concrete>`). All 7 fixtures PRESERVED across all 4 OAS versions. PR [#3353](https://github.com/orval-labs/orval/pull/3353). **Reference implementation for generic-type emission — model for Micronaut/kiota/swift-openapi-generator ports.**
- **Hyperjump JSON Schema** — reference-correct for all tested patterns.
- **Redocly CLI** (lint + bundle) — passes all fixtures.
- **Spectral** — passes all fixtures.
- **openapi-spec-validator** (Python) — passes all fixtures.
- **libopenapi** (Go) — `$dynamicRef`/`$dynamicAnchor` fully supported since v0.30.1 (Dec 2025).
- **santhosh-tekuri/jsonschema v6** (Go) — passes full JSON-Schema-Test-Suite for 2020-12.
- **json-schema-validator** (Java, networknt) — correct dynamic-scope resolution since v1.3.0 (PR #931, Jan 2024). 100% pass on JSON Schema Test Suite for Draft 2020-12. Dominant Java ecosystem validator; used by light-4j and other Java OpenAPI tooling.
- **Opis JSON Schema** (PHP) + **Boon** (Rust) + **jsonschema-rs** (Rust) — all pass the official draft2020-12 suite (incl. `dynamicRef.json`).
