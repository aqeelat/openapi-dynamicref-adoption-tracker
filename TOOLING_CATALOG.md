# OpenAPI/JSON Schema Tooling Catalog — `$dynamicRef` Relevance

Tools that parse, resolve, bundle, validate, or lint OpenAPI specs and JSON Schemas containing `$dynamicRef` / `$dynamicAnchor`.

Status key:
- **No support** — tool crashes, errors, or silently drops/mangles `$dynamicRef`
- **Partial** — tool passes through specs without error but does not correctly resolve dynamic scope
- **Correct** — tool implements full 2020-12 `$dynamicRef` dynamic scope resolution
- **Unknown** — not yet tested against dynamicRef fixtures

---

## 1. Parsers / Resolvers / Bundlers

These libraries parse OpenAPI specs, resolve `$ref` pointers, and/or bundle multi-file specs. They must **preserve `$dynamicRef`/`$dynamicAnchor` without changing dynamic scope** during resolution/bundling.

| Tool | URL | License | `$dynamicRef` Status | Notes |
|---|---|---|---|---|
| **@apidevtools/swagger-parser** | https://github.com/APIDevTools/swagger-parser | MIT (OSS) | No support | Swagger 2.0 / OpenAPI 3.0 only. Does not support OAS 3.1 or JSON Schema 2020-12. Will not encounter `$dynamicRef` in its supported spec versions. |
| **@redocly/cli** (bundle) | https://github.com/Redocly/redocly-cli | MIT (OSS) | Correct (spec-level) | Bundles OAS 3.0/3.1/3.2. Passes all dynamicRef fixtures in OpenAPI document validation without error. Does not attempt runtime dynamic scope resolution during bundling — preserves `$dynamicRef`/`$dynamicAnchor` as-is. |
| **@apidevtools/swagger-cli** (bundle) | https://github.com/APIDevTools/swagger-cli | MIT (OSS) | **Archived** | Deprecated in favor of Redocly CLI. Swagger 2.0 / OpenAPI 3.0 only. |
| **Stoplight Prism** | https://github.com/stoplightio/prism | Apache-2.0 (OSS) | Partial | Mock server and validation proxy. Supports OAS 3.1 but uses AJV for schema validation internally, inheriting AJV's `$dynamicRef` gaps for mock generation and request/response validation. |
| **openapi-schema-validator** (Python) | https://github.com/python-openapi/openapi-schema-validator | Apache-2.0 (OSS) | Unknown | Python library for validating OpenAPI schemas (3.0/3.1/3.2). Uses `jsonschema` underneath. Runtime `$dynamicRef` support depends on the `jsonschema` Python package version. |
| **openapi-core** (Python) | https://github.com/python-openapi/openapi-core | BSD-3 (OSS) | Unknown | Python library for OpenAPI request/response validation. Schema validation delegated to `openapi-schema-validator`. |
| **json-schema-bundler** (Hyperjump) | Part of `@hyperjump/json-schema` | MIT (OSS) | Correct | Uses the official 2020-12 bundling process. Preserves `$dynamicRef`/`$dynamicAnchor` correctly — bundled schemas produce identical validation output to unbundled. |
| **Mermade/oas-kit** | https://github.com/Mermade/oas-kit | BSD-3 (OSS) | Unknown | OpenAPI 3.0/3.1 tooling (lint, bundle, validate, convert). Older; may not handle 3.1 JSON Schema features fully. |
| **swagger-parser** (Java, Swagger API) | https://github.com/swagger-api/swagger-parser | Apache-2.0 (OSS) | Unknown | Java parser for Swagger 2.0 / OpenAPI 3.0. OAS 3.1 support is limited. `$dynamicRef` is a JSON Schema 2020-12 feature — unlikely to be handled. |
| **swagger-inflector** (Java) | https://github.com/swagger-api/swagger-inflector | Apache-2.0 (OSS) | Unknown | Uses swagger-parser internally. OAS 3.x support via v2 branch. |
| **kiota** (Microsoft) | https://github.com/microsoft/kiota | MIT (OSS) | Unknown | API client generator that parses OpenAPI specs. Internal parser would need to handle or pass through `$dynamicRef` for downstream use. |
| **libopenapi** (Go) | https://github.com/pb33f/libopenapi | MIT (OSS) | Unknown | Go library for parsing/rendering OpenAPI 3.x. Powers vacuum. Would need to preserve `$dynamicRef`/`$dynamicAnchor` during resolution. |
| **apidevtools/json-schema-ref-parser** | https://github.com/APIDevTools/json-schema-ref-parser | MIT (OSS) | No support | Generic JSON Schema `$ref` resolver. Dereferences/bundles all refs — would destroy `$dynamicRef` semantics if applied to specs containing them. |

---

## 2. Runtime JSON Schema Validators

These validate data instances against JSON Schemas. For `$dynamicRef` to work, the validator must implement **dynamic scope resolution** per JSON Schema 2020-12.

| Tool | URL | License | `$dynamicRef` Status | Notes |
|---|---|---|---|---|
| **AJV** (v8) | https://github.com/ajv-validator/ajv | MIT (OSS) | Partial (with known gaps) | Supports 2020-12 draft. Has `$dynamicRef` implementation but with documented gaps: fails generic pagination/wrapper patterns (falls back to `$dynamicAnchor` default instead of resolving override in scope). Multi-parameter generic templates also broken. PR [#2615](https://github.com/ajv-validator/ajv/pull/2615) fixes pagination and generic wrapper patterns but is **not yet merged**. Recursive `$dynamicRef` (e.g., tree structures) works correctly. Most widely used JS validator — this gap has outsized ecosystem impact. |
| **Hyperjump JSON Schema** | https://github.com/hyperjump-io/json-schema | MIT (OSS) | Correct | Full 2020-12 implementation with correct dynamic scope resolution. Passes all pagination, generic wrapper, recursive, multi-parameter generic, and external `$dynamicRef` fixtures. Also supports OpenAPI 3.0/3.1/3.2 validation natively. Supports bundling. The reference-correct implementation. |
| **python-jsonschema** | https://github.com/python-jsonschema/jsonschema | MIT (OSS) | Partial | Supports 2020-12 draft. Has `$dynamicRef` support but completeness vs. spec edge cases is not well-documented. Used by `openapi-spec-validator` and `openapi-schema-validator`. |
| **jsonschema-rs** (Rust) | https://github.com/Stranger6667/jsonschema-rs | MIT (OSS) | Unknown | Rust JSON Schema validator with Python bindings. Supports 2020-12. Used as optional backend for `openapi-spec-validator`. DynamicRef support status unknown. |
| **json-schema-validator** (Java, networknt) | https://github.com/networknt/json-schema-validator | Apache-2.0 (OSS) | Unknown | Java JSON Schema validator supporting 2020-12. `$dynamicRef` implementation status not well-documented. Used widely in Java OpenAPI tooling. |
| **everit-org/json-schema** (Java) | https://github.com/everit-org/json-schema | Apache-2.0 (OSS) | No support | Java validator. Supports up to draft-07 only — no 2020-12, no `$dynamicRef`. |
| **json-schema** (Ruby, ruby-json-schema) | https://github.com/voxpupuli/json-schema | MIT (OSS) | No support | Ruby validator. Supports up to draft-06/07. No 2020-12 support. |
| **json-schema-validator** (.NET, lateapexearlystudio) | https://github.com/lateapexearlystudio/Lateapexputstatsweighterson.JsonSchema | BSD-3 (OSS) | Unknown | .NET JSON Schema validator with 2020-12 support. DynamicRef implementation status unknown. |
| **OnlineCEH/json-schema** (Go) | https://github.com/onlineCEH/go-jsonschema | MIT (OSS) | Unknown | Go JSON Schema validator. 2020-12 support varies. |
| **qlik-trial/json-schema** (Go) | https://github.com/qlik-oss/json-schema | MIT (OSS) | Unknown | Go JSON Schema validator. DynamicRef support unclear. |
| **jval** (Java) | https://github.com/kiji-bbproject/jval | MIT (OSS) | Unknown | Java JSON Schema validator. Limited draft support. |
| **justinrainbow/json-schema** (PHP) | https://github.com/jsonrainbow/json-schema | MIT (OSS) | Partial | PHP validator. Supports up to draft-07 with some 2020-12 work. `$dynamicRef` support unlikely or incomplete. |
| **Opis JSON Schema** (PHP) | https://github.com/opis/json-schema | Apache-2.0 (OSS) | Unknown | PHP validator with 2020-12 support. DynamicRef implementation status unknown. |
| **saismic/lapis-json-schema** | Various | Various | Unknown | Smaller validators across languages — generally lag behind on 2020-12 features. |
| **Boon** (Rust) | https://github.com/saaste/boon | MIT (OSS) | Unknown | Rust JSON Schema validator. Draft 2020-12 support. |

---

## 3. OpenAPI Linting / Quality Tools

These tools lint OpenAPI specs for style, correctness, and best practices. They need to **not crash on** specs containing `$dynamicRef`/`$dynamicAnchor` and ideally should provide rules that understand dynamic references.

| Tool | URL | License | `$dynamicRef` Status | Notes |
|---|---|---|---|---|
| **Spectral** | https://github.com/stoplightio/spectral | Apache-2.0 (OSS) | Correct (spec-level) | Passes all dynamicRef fixtures without error. Lints OpenAPI 3.0/3.1/3.2, AsyncAPI, Arazzo. Does not attempt runtime dynamic scope resolution — treats `$dynamicRef`/`$dynamicAnchor` as valid JSON Schema keywords. |
| **Redocly CLI** (lint) | https://github.com/Redocly/redocly-cli | MIT (OSS) | Correct (spec-level) | Passes all dynamicRef fixtures. Supports OpenAPI 3.0/3.1/3.2 linting with custom rulesets. Treats `$dynamicRef`/`$dynamicAnchor` as valid. |
| **vacuum** | https://github.com/daveshanley/vacuum | MIT (OSS) | Unknown (likely correct spec-level) | Go-based linter, 100% Spectral-compatible. Uses libopenapi parser. Supports OpenAPI 3.0/3.1/3.2. Very fast. Likely passes dynamicRef fixtures since it treats JSON Schema keywords as opaque. |
| **openapi-spec-validator** (Python) | https://github.com/python-openapi/openapi-spec-validator | Apache-2.0 (OSS) | Correct (spec-level) | Passes all dynamicRef fixtures. Validates against OAS 2.0/3.0/3.1/3.2 schemas. Accepts `$dynamicRef`/`$dynamicAnchor` as valid JSON Schema keywords within OAS 3.1+ specs. |
| **Zally** (zalando) | https://github.com/zalando/zally | MIT (OSS) | Unknown | OpenAPI linter from Zalando. Java-based. May not handle OAS 3.1 JSON Schema features. |
| **oasdiff** | https://github.com/Tufin/oasdiff | Apache-2.0 (OSS) | Unknown | Go-based OpenAPI diff and breaking-change detection. Parses OAS 3.0/3.1. Would need to handle `$dynamicRef` when comparing specs. |
| **ibm-openapi-validator** | https://github.com/IBM/openapi-validator | Apache-2.0 (OSS) | Unknown | IBM's OpenAPI linter. Supports OAS 3.0/3.1. May not have specific `$dynamicRef` awareness. |

---

## 4. Documentation Renderers

These render OpenAPI specs as interactive documentation. They need to display schemas containing `$dynamicRef` without crashing.

| Tool | URL | License | `$dynamicRef` Status | Notes |
|---|---|---|---|---|
| **Swagger UI** | https://github.com/swagger-api/swagger-ui | Apache-2.0 (OSS) | Unknown | Renders OAS 2.0/3.0/3.1. Uses a schema parser internally. Likely treats `$dynamicRef` as unknown keyword. |
| **Redoc** | https://github.com/Redocly/redoc | MIT (OSS) | Unknown | Renders OAS 2.0/3.0/3.1/3.2. May handle `$dynamicRef` schemas by displaying the fallback. |
| **Stoplight Elements** | https://github.com/stoplightio/elements | Apache-2.0 (OSS) | Unknown | API documentation component. Uses Spectral internally for validation. |
| **Scalar** | https://github.com/scalar/scalar | MIT (OSS) | Unknown | Modern API documentation renderer + API client. |
| **RapiDoc** | https://github.com/mrin9/RapiDoc | MIT (OSS) | Unknown | Web component API docs. Supports OAS 3.0/3.1. |
| **OpenAPI Explorer** | https://github.com/Authress-Engineering/openapi-explorer | Apache-2.0 (OSS) | Unknown | Web component for API exploration. Claims OAS 3.2+ support. |

---

## 5. SDK Generators / Type Emitters

SDK generator results are tracked in [state-of-the-union.md](state-of-the-union.md) and the CI matrix. This section lists additional generators beyond the matrix.

| Tool | URL | License | `$dynamicRef` Status | Notes |
|---|---|---|---|---|
| **Fern** | https://github.com/fern-api/fern | Partial (open core) | Unknown | Postman-owned. TS, Python, Java, Go, Ruby, C#. |
| **Stainless** | https://stainlessapi.com/ | Proprietary | Unknown | Powers OpenAI, Stripe, Anthropic SDKs. |
| **Speakeasy** | https://github.com/speakeasy-api/speakeasy | Partial (open core) | Unknown | SDKs + Terraform providers + CLIs. |
| **liblab** | https://liblab.com/ | Proprietary | Unknown | Enterprise SDK generation. TS, Python, Java, Go, C#. |
| **openapi-fetch** | https://github.com/openapi-ts/openapi-typescript/tree/main/packages/openapi-fetch | MIT (OSS) | Unknown | Lightweight TS client companion to openapi-typescript. |
| **QuickType** | https://github.com/glideapps/quicktype | Apache-2.0 (OSS) | Unknown | JSON Schema → types in 15+ languages. |
| **swift-openapi-generator** | https://github.com/apple/swift-openapi-generator | Apache-2.0 (OSS) | Unknown | Apple's official Swift generator. |
| **oapi-codegen** | https://github.com/oapi-codegen/oapi-codegen | Apache-2.0 (OSS) | Unknown | OpenAPI 3.0 → Go server/client (chi, echo, gin). |
| **ogen** | https://github.com/ogen-go/ogen | Apache-2.0 (OSS) | Unknown | OpenAPI 3.x → Go with strict typing. |
| **apimatic** | https://apimatic.io/ | Proprietary | Unknown | 12+ language SDK generation. |
| **Konfig** | https://github.com/konfig-dev/konfig | MIT (OSS) | Unknown | Sunset Dec 2024. Was TS, Python, Java, Go, Ruby, PHP, C#. |
| **sdkgen** | https://github.com/sdkgen/sdkgen | MIT (OSS) | Unknown | Typed SDK generation. |
| **swagger-axios-codegen** | https://github.com/Manweill/swagger-axios-codegen | MIT (OSS) | Unknown | TS Axios-based client. |
| **openapi-client-axios** | https://github.com/anttiviljami/openapi-client-axios | MIT (OSS) | Unknown | Axios client with type safety. |
| **@rtk-query/codegen-openapi** | https://github.com/reduxjs/redux-toolkit | MIT (OSS) | Unknown | OpenAPI → RTK Query API definitions. |

---

## 6. Spec Producers

Tools that generate OpenAPI specs from source code. These should add `$dynamicRef` emission as opt-in until downstream support is reliable.

| Tool | URL | License | Language/Platform | `$dynamicRef` Status | Notes |
|---|---|---|---|---|---|
| **springdoc-openapi** | https://github.com/springdoc/springdoc-openapi | Apache-2.0 (OSS) | Java/Spring | Unknown | Dominant in Java/Spring ecosystem. |
| **@nestjs/swagger** | https://github.com/nestjs/swagger | MIT (OSS) | TypeScript/NestJS | Unknown | Dominant in Node.js/NestJS. |
| **FastAPI** | https://github.com/tiangolo/fastapi | MIT (OSS) | Python | Unknown | Dominant in Python. Uses Pydantic for schemas. |
| **swaggo/swag** | https://github.com/swaggo/swag | MIT (OSS) | Go | Unknown | Dominant in Go. Doc comments → Swagger 2.0. |
| **poem-openapi** | https://github.com/poem-web/poem | MIT/Apache-2.0 (OSS) | Rust | Unknown | poem framework derive macros → OpenAPI 3.0. |
| **utoipa** | https://github.com/juhaku/utoipa | MIT/Apache-2.0 (OSS) | Rust | Unknown | Framework-agnostic derive macros → OpenAPI 3.0/3.1. Supports actix, axum, etc. |
| **Swashbuckle.AspNetCore** | https://github.com/domaindrivendev/Swashbuckle.AspNetCore | MIT (OSS) | C#/.NET | Unknown | Dominant in ASP.NET Core. |
| **drf-spectacular** | https://github.com/tfranzel/drf-spectacular | BSD-3 (OSS) | Python/Django | Unknown | Dominant in Django ecosystem. |
| **tsoa** | https://github.com/lukeautry/tsoa | MIT (OSS) | TypeScript | Unknown | Decorators + type inference → OpenAPI 2.0/3.0. |
| **Huma** | https://github.com/danielgtaylor/huma | MIT (OSS) | Go | Unknown | Generates OpenAPI 3.1. Highest OAS version support among Go producers. |
| **Litestar** | https://github.com/litstar-org/litstar | MIT (OSS) | Python | Unknown | ASGI framework. Auto-generates OpenAPI 3.1. |
| **aide** | https://github.com/tamasfe/aide | MIT/Apache-2.0 (OSS) | Rust | Unknown | Axum → OpenAPI 3.1. Compositional approach. |
| **okapi** | https://github.com/GREsau/okapi | MIT (OSS) | Rust | Unknown | Schemars + Rocket → OpenAPI 3.0. |
| **paperclip** | https://github.com/paperclip-rs/paperclip | MIT/Apache-2.0 (OSS) | Rust | Unknown | Plugin-based for actix-web/axum. |
| **Micronaut OpenAPI** | https://github.com/micronaut-projects/micronaut-openapi | Apache-2.0 (OSS) | Java/Micronaut | Unknown | Compile-time OpenAPI generation. |
| **SmallRye OpenAPI** | https://github.com/smallrye/smallrye-open-api | Apache-2.0 (OSS) | Java/Quarkus | Unknown | MicroProfile OpenAPI annotations. |
| **go-swagger** | https://github.com/go-swagger/go-swagger | Apache-2.0 (OSS) | Go | Unknown | Annotations → Swagger 2.0. |
| **Pydantic** (json_schema) | https://github.com/pydantic/pydantic | MIT (OSS) | Python | Unknown | `TypeAdapter.json_schema()` produces JSON Schema 2020-12. Foundation for FastAPI. |
| **ASP.NET Core built-in OpenAPI** | https://learn.microsoft.com/en-us/aspnet/core/fundamentals/openapi | MIT (OSS) | C#/.NET | Unknown | .NET 9+ built-in spec generation. |
| **@hono/zod-openapi** | https://github.com/honojs/hono | MIT (OSS) | TypeScript/Hono | Unknown | Zod schemas → OpenAPI 3.1. |
| **ts-rest** | https://github.com/ts-rest/ts-rest | MIT (OSS) | TypeScript | Unknown | Type-safe REST contracts → OpenAPI. |
| **tRPC OpenAPI** | https://github.com/jlalmes/trpc-openapi | MIT (OSS) | TypeScript | Unknown | tRPC procedures → OpenAPI. |
| **rswag** | https://github.com/rswag/rswag | MIT (OSS) | Ruby/Rails | Unknown | RSpec integration tests → OpenAPI 3.0. |
| **grape-swagger** | https://github.com/ruby-grape/grape-swagger | MIT (OSS) | Ruby | Unknown | Grape API framework → OpenAPI. |
| **Swagger-PHP** | https://github.com/zircote/swagger-php | Apache-2.0 (OSS) | PHP | Unknown | Annotations/attributes → OpenAPI 3.0. |
| **NelmioApiDocBundle** | https://github.com/nelmio/NelmioApiDocBundle | MIT (OSS) | PHP/Symfony | Unknown | Symfony → OpenAPI 3.0. |
| **Laravel OpenAPI** | https://github.com/goldSpec/laravel-openapi | MIT (OSS) | PHP/Laravel | Unknown | Laravel routes + attributes → OpenAPI 3.0. |
| **express-jsdoc-swagger** | https://github.com/BRIKEV/express-jsdoc-swagger | MIT (OSS) | JavaScript/Express | Unknown | JSDoc → OpenAPI 3.0. |
| **swagger-jsdoc** | https://github.com/Surnet/swagger-jsdoc | MIT (OSS) | JavaScript | Unknown | JSDoc → OpenAPI. |
| **Flask-RESTX** | https://github.com/python-restx/flask-restx | BSD-3 (OSS) | Python/Flask | Unknown | Flask extension → OpenAPI. |
| **Flasgger** | https://github.com/flasgger/flasgger | MIT (OSS) | Python/Flask | Unknown | Flask + Swagger/OpenAPI. |
| **APIFlask** | https://github.com/apiflask/apiflask | MIT (OSS) | Python/Flask | Unknown | Flask wrapper → OpenAPI 3. |
| **BlackSheep** | https://github.com/Neoteroi/BlackSheep | MIT (OSS) | Python | Unknown | ASGI framework → OpenAPI 3. |
| **Connexion** | https://github.com/spec-first/connexion | Apache-2.0 (OSS) | Python | Unknown | OpenAPI-first framework. |
| **Vapor OpenAPI** | https://github.com/dankinsoid/VaporOpenAPI | MIT (OSS) | Swift/Vapor | Unknown | Vapor → OpenAPI 3.0. |
| **springfox** (swagger) | https://github.com/springfox/springfox | Apache-2.0 (OSS) | Java/Spring | No support | Legacy. Superseded by springdoc. Largely unmaintained. |

---

## 7. API Client / Testing Tools

Tools that import OpenAPI specs for making API calls, testing, or interactive exploration.

| Tool | URL | License | `$dynamicRef` Status | Notes |
|---|---|---|---|---|
| **Postman** (openapi-to-postman) | https://github.com/postmanlabs/openapi-to-postman | Apache-2.0 (OSS, converter) | Unknown | Dominant API client. Converter supports OAS 2.0/3.0/3.1. Uses internal resolver. |
| **Insomnia** | https://github.com/Kong/insomnia | Apache-2.0 (OSS) | Unknown | Kong-owned. Limited OAS 3.1 support. |
| **Hoppscotch** | https://github.com/hoppscotch/hoppscotch | MIT (OSS) | Unknown | Web-based API client. OpenAPI import. |
| **Bruno** | https://github.com/usebruno/bruno | MIT (OSS) | Unknown | Git-based API client. OpenAPI import. |
| **Schemathesis** | https://github.com/schemathesis/schemathesis | MIT (OSS) | Unknown | Property-based API testing from OpenAPI. OAS 3.1 supported. Uses python-jsonschema. |
| **HTTPie** | https://httpie.io | BSD-3 (OSS) | Unknown | CLI HTTP client. OpenAPI autocompletion. |
| **Apidog** | https://apidog.com | Proprietary | Unknown | All-in-one API platform. OAS 3.1 advertised. |

---

## 8. Mock Servers

Tools that generate mock API responses from OpenAPI specs.

| Tool | URL | License | `$dynamicRef` Status | Notes |
|---|---|---|---|---|
| **Stoplight Prism** | https://github.com/stoplightio/prism | Apache-2.0 (OSS) | Partial | See parsers section. Inherits AJV gaps for mock generation. |
| **WireMock** | https://github.com/wiremock/wiremock | Apache-2.0 (OSS) | Unknown | Java-based. Dominant in Java ecosystem. |
| **Microcks** | https://github.com/microcks/microcks | Apache-2.0 (OSS) | Unknown | Enterprise-grade mocking. OAS 3.0, 3.1 partial. |
| **Mockoon** | https://github.com/mockoon/mockoon | MIT (OSS) | Unknown | Desktop + CLI. OAS 3.0 import only. |
| **API Sprout** | https://github.com/danielgtaylor/apisprout | MIT (OSS) | Unknown | Go-based. Last release 2019 — archived/stale. |

Outreach workflow (issue templates, contact tracking) is maintained locally in `OUTREACH_TRACKER.md` (not committed).

Matrix-tested SDK generators (Orval, OpenAPI Generator, Swagger Codegen v3, openapi-typescript, @hey-api/openapi-ts, openapi-typescript-codegen, oazapfts, Kiota, NSwag) are tracked in [state-of-the-union.md](state-of-the-union.md).

---

## Summary of Known Gaps

### Critical (blocks adoption)
1. **AJV** — merged fix PR [#2615](https://github.com/ajv-validator/ajv/pull/2615) is the single highest-impact unmerged fix. AJV is the default JSON Schema validator in the JS ecosystem and is used by Prism, Spectral internals, and countless applications.
2. **OpenAPI Generator** — cannot parse `$dynamicAnchor` at all. Blocks any spec producer from emitting dynamicRef.

### Important (degraded output)
3. **Orval** — parses but emits `unknown` for dynamic ref slots. PR in progress.
4. **Stoplight Prism** — inherits AJV gaps for mock generation.

### Correct implementations
- **Hyperjump JSON Schema** — reference-correct for all tested patterns.
- **Redocly CLI** (lint + bundle) — passes all fixtures.
- **Spectral** — passes all fixtures.
- **openapi-spec-validator** (Python) — passes all fixtures.
