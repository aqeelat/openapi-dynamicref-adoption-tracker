# Testing Methodologies

This file documents testing approaches for verifying `$dynamicRef`/`$dynamicAnchor` support across different categories of OpenAPI tooling. Individual tool analyses link to the relevant section here.

---

## Table of Contents

- [Documentation Renderer Testing](#documentation-renderer-testing)
- [Spec Producer Testing](#spec-producer-testing)
- [Type Generator Testing](#type-generator-testing)
- [Mock Server / Validator Testing](#mock-server--validator-testing)
- [Spec Converter Testing](#spec-converter-testing)
- [API Client Testing](#api-client-testing)
- [API Testing Tool Testing](#api-testing-tool-testing)
- [Validator Testing](#validator-testing)

---

## Documentation Renderer Testing

**Target tools:** Swagger UI, Redoc, Scalar, Stoplight Elements, RapiDoc, OpenAPI Explorer

### Goal

Create reusable, renderer-neutral evidence that a documentation tool correctly resolves and displays schemas containing `$dynamicRef`/`$dynamicAnchor`. The harness answers three questions:

- Does the renderer load the document without parser/runtime failures?
- Does the renderer show the semantically correct schema shape in operation and model views?
- Does generated sample/example output use the dynamically bound concrete schema instead of falling back to an empty, generic, or raw `$dynamicRef` representation?

### Recommended Harness

Use Playwright as the repo-local compatibility harness.

Reasons:

- Works across all six major doc renderers.
- Can capture DOM text, screenshots, console errors, page errors, and network failures.
- Keeps this repo on one cross-renderer test shape even when upstream projects use different test frameworks.
- Produces issue-ready artifacts for maintainers.

Do not use screenshot diffs as the primary oracle. Screenshots are useful evidence artifacts, but semantic assertions should come from visible schema facts extracted from a scoped DOM region.

### Test Layers

1. **Fixture semantic expectations** — renderer-independent manifests describing expected operation/schema facts.
2. **Renderer adapters** — small Playwright modules that mount one renderer, wait for load, expand relevant panels, and extract text from operation/model regions.
3. **Shared assertion engine** — compares extracted UI text and runtime diagnostics against fixture expectations.

### Fixture Set

| Tier | Fixture | Purpose |
|---|---|---|
| Control | `baseline-duplicated-pagination` | Proves the renderer can display ordinary equivalent schemas. |
| MVP dynamic | `generic-schema-binding` | Named concrete schemas bind `itemType` differently. |
| Route-level binding | `paginated-response` | Response-level binding tests inline use-site dynamic scope. |
| Nested dynamic | `api-envelope` | Tests envelope plus nested pagination binding. |
| Recursive dynamic | `recursive-category-tree` | Tests recursive override through dynamic scope. |
| Multi-slot dynamic | `nested-workspace-resources` | Hard mode with multiple dynamic slots and nesting. |
| Identifier edge | `non-identifier-schema-key` | Tests schema keys that are not identifier-like. |

Prefer `specs/<scenario>/oas-3.1.2.json` for repeatable UI tests, while reporting the authored fixture name. Keep OpenAPI 3.1.0/3.1.1/3.2.0 as matrix dimensions after the first adapter works.

### Expected Behavior

For `generic-schema-binding`:

| UI Location | Expected Behavior |
|---|---|
| `GET /users` 200 response schema | Shows pagination fields and `items[]` with `User` fields (`id`, `email`). |
| `GET /groups` 200 response schema | Shows pagination fields and `items[]` with `Group` fields (`id`, `name`). |
| `PaginatedTemplate` component | May show template internals, but should not make operation schemas collapse to fallback output. |
| Generated examples | Should include item shapes consistent with the dynamically bound concrete schema. |

For `api-envelope`:

| UI Location | Expected Behavior |
|---|---|
| Single-resource response | Envelope has `requestId` and `data`; `data` resolves to `User`. |
| List response | Envelope `data` resolves to paginated user data; `data.items[]` resolves to `User`. |

For `recursive-category-tree`:

| UI Location | Expected Behavior |
|---|---|
| Category tree response | Root includes base and localized fields. |
| Recursive children | Child nodes preserve localized fields through recursion. |
| Navigation | Recursive schemas render without infinite expansion or browser lockup. |

### Automatable Assertions

Assert **positive** facts in scoped regions:

- Required field names are visible.
- Concrete item fields are visible for each operation.
- Response/request samples include the expected object shape when the renderer generates samples.
- No console/page errors occur during load and expansion.

Assert **negative** facts in scoped regions:

- Raw `$dynamicRef` or `#itemType` appears where the operation should show resolved concrete fields.
- Fallback output appears: `any`, `unknown`, `not: {}`, empty schema, missing type, free-form object, or scalar placeholders.
- Wrong binding appears: user response shows `name` but not `email`, or group response shows `email` but not `name`.
- Recursive children lose fields that should be preserved by the dynamic override.

Example expectation shape:

```json
{
  "fixture": "generic-schema-binding",
  "checks": [
    {
      "operationId": "listUsers",
      "response": "200",
      "contentType": "application/json",
      "schemaFacts": [
        { "path": "/items", "kind": "array" },
        { "path": "/items/*/id", "kind": "string" },
        { "path": "/items/*/email", "kind": "string", "format": "email" },
        { "path": "/total", "kind": "integer" }
      ],
      "forbidden": ["$dynamicRef", "#itemType", "not: {}", "any", "unknown"]
    }
  ]
}
```

The browser adapter does not need to resolve `$dynamicRef` itself — it only proves whether the UI exposed the semantic facts in the relevant region.

### Classification Labels

| Label | Meaning |
|---|---|
| Pass | Correct concrete fields appear in operation UI and generated samples; no unresolved/fallback evidence. |
| Partial | Correct fields appear, but raw dynamic keywords or confusing fallback artifacts also appear. |
| Render-only degraded | Document loads, but dynamic slots render as generic, empty, wrong, or unresolved. |
| Sample degraded | Schema display is acceptable, but generated samples/examples are wrong. |
| Parser failure | Renderer cannot parse/load the document. |
| UX failure | Semantics may exist, but recursion/interaction is unusable. |
| Not tested | Adapter or fixture coverage is missing. |

### Human Review

Keep human review as a rubric layer, not the primary test oracle. Use it for:

- Whether a dynamic/generic schema presentation is understandable.
- Whether recursive schema navigation is usable.
- Whether showing both raw `$dynamicRef` and resolved fields is helpful or confusing.
- Whether screenshots and reproduction steps are good enough for upstream issues.

### First Swagger UI Adapter

The first adapter should:

1. Serve specs from this repo over HTTP.
2. Load a minimal static page using Swagger UI.
3. Select a spec URL via query parameter.
4. Wait for the Swagger UI root to finish loading.
5. Expand the operation under test.
6. Expand the response or request schema/model panel.
7. Extract visible text from the scoped operation region.
8. Capture screenshot, console logs, page errors, network errors, renderer version, fixture name, and OpenAPI version.

Swagger UI uses Cypress upstream, but this repo should still use Playwright for cross-renderer consistency. If contributing a fix upstream, port the relevant case to Swagger UI's Cypress/Jest setup.

---

## Spec Producer Testing

**Target tools:** FastAPI, @fastify/swagger, tsoa, @nestjs/swagger, poem-openapi

### Goal

Verify whether a framework correctly emits — or at minimum passes through — `$dynamicRef`/`$dynamicAnchor` in the OpenAPI document it generates.

### Approach

**For code-first generators** (FastAPI, tsoa, NestJS, poem-openapi):

1. Define a model/schema that represents a generic/polymorphic pattern using the framework's native idioms.
2. Generate the OAS document.
3. Inspect the output for `$dynamicRef`/`$dynamicAnchor`.
4. If absent, document the static expansion strategy used instead.

The expected result for most code-first generators is that `$dynamicRef` is absent — generics are resolved statically. The test value is establishing that baseline and detecting future changes.

**For middleware/plugin generators** (@fastify/swagger):

1. Register routes with hand-authored schemas containing `$dynamicRef`/`$dynamicAnchor`.
2. Set the plugin to `openapi: '3.1.0'` mode.
3. Fetch the generated spec.
4. Assert the keywords survive in the output.

### Minimal Test Fixture

A generic pagination pattern is the canonical test case:

```python
# FastAPI example
from pydantic import BaseModel
from typing import Generic, TypeVar, List

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int

class User(BaseModel):
    id: str
    email: str
```

Generate the spec and check whether `PaginatedResponse[User]` in a response produces a reusable template schema or an inlined concrete schema.

---

## Type Generator Testing

**Target tools:** openapi-typescript, hey-api, orval

### Goal

Verify that a type generator consuming an OAS 3.1 spec with `$dynamicRef`/`$dynamicAnchor` emits TypeScript types that correctly represent the dynamically-bound concrete schemas per operation.

### Approach

1. Run the type generator against each fixture spec (`specs/<scenario>/oas-3.1.2.json`).
2. Parse the output TypeScript using the TypeScript compiler API (or string assertions for simpler cases).
3. For each operation, assert the response/request body type reflects the correct concrete binding:
   - `listUsers → items: User[]`, not `items: unknown[]`
   - `listGroups → items: Group[]`, not `items: unknown[]`
4. Assert the types for different operations are structurally distinct (ignoring the dynamic binding would make them identical).

The existing `scripts/matrix-runner.mjs` provides the shell for this; extend it with assertion logic.

### Regression Baseline

Until `$dynamicRef` support is implemented, record the current output (typically `unknown` or `never` for unresolved dynamic references). Add assertions that detect regressions from the current baseline and improvements toward the expected output.

---

## Mock Server / Validator Testing

**Target tools:** Stoplight Prism, Schemathesis (validation side)

### Goal

Verify that a mock server or validator correctly enforces schema constraints expressed via `$dynamicRef`/`$dynamicAnchor`.

### Approach

1. Start the tool with a fixture spec (e.g., `generic-schema-binding`).
2. Send a request that violates the dynamically-bound schema:
   - For `listUsers`: a response body whose `items` contains `Group` fields (wrong binding).
   - For `listGroups`: a response body whose `items` contains `User` fields (wrong binding).
3. Assert the tool reports a validation failure.

Without `$dynamicRef` support, the tool will accept both bodies (the constraint is not enforced). This is the failing test.

After the fix, the same requests should produce validation errors.

**Prism-specific setup:**

```bash
prism mock --validate specs/generic-schema-binding/oas-3.1.2.json
```

Then issue requests with incorrect item shapes and assert `400`/validation error responses.

### Isolation Note

This test must be isolated from AJV's own `$dynamicRef` bugs (see [ajv.md](./ajv.md)). If AJV's `$dynamicRef` resolution is also buggy, the tool-level fix may be correct while still failing the test due to downstream AJV issues. Document this separation in the test notes.

---

## Spec Converter Testing

**Target tools:** openapi-to-postmanv2, Yaak (via openapi-to-postmanv2)

### Goal

Verify that a spec converter preserves `$dynamicRef`/`$dynamicAnchor` semantics when converting an OAS document to another format (e.g., Postman collection).

### Approach

1. Pass a fixture spec through the converter.
2. Inspect the output format (Postman collection JSON, etc.).
3. Assert that request/response schemas in the output reflect the dynamically-bound concrete schema, not the raw `$dynamicRef` template.
4. Assert that `$dynamicRef` does not appear as an unresolved string in operation schemas (indicating it was treated as opaque).

For `openapi-to-postmanv2`:

```js
const { convertV2 } = require("openapi-to-postmanv2");
const spec = fs.readFileSync("specs/generic-schema-binding/oas-3.1.2.json");
convertV2({ type: "string", data: spec.toString() }, {}, (err, result) => {
  // Inspect result.output[0].data for schema shapes
});
```

---

## API Client Testing

**Target tools:** Insomnia, Bruno, Yaak

### Goal

Verify that an API client correctly displays schema information from an OpenAPI spec containing `$dynamicRef`/`$dynamicAnchor`, particularly in the request builder and schema preview.

### Approach

API clients are desktop Electron/Tauri applications. Full UI automation is complex. Two tiers:

**Tier 1 — Library-level test (accessible):**

Call the client's import utility directly (if exposed as a library) with a fixture spec. Inspect the resulting internal representation for schema completeness.

Example for Bruno's importer:

```js
const { convertV2 } = require("@usebruno/openapi-to-bruno");
const collection = convertV2(spec);
// Assert request schemas reflect the correct item types
```

**Tier 2 — Manual verification (screenshot evidence):**

1. Import the fixture spec into the client.
2. Navigate to an operation using `$dynamicRef` (e.g., `GET /users`).
3. Screenshot the schema preview pane.
4. Verify the displayed schema shows `User` fields, not a raw `$dynamicRef` or empty schema.

Use Tier 2 screenshots as issue evidence when filing upstream reports.

---

## API Testing Tool Testing

**Target tools:** Schemathesis (generation side)

### Goal

Verify that a property-based API testing tool generates request/response data that satisfies constraints expressed via `$dynamicRef`/`$dynamicAnchor`.

### Approach

**Validation side:** See [Mock Server / Validator Testing](#mock-server--validator-testing).

**Generation side:**

1. Run the tool against a fixture spec targeting a test server.
2. The test server accepts any input and logs received request/response bodies.
3. Inspect the logged bodies to verify they conform to the dynamically-bound concrete schema:
   - Requests to `POST /users` should generate bodies matching `User` fields.
   - Requests to `POST /groups` should generate bodies matching `Group` fields.
4. Assert the generated shapes are structurally distinct per operation (they should differ by concrete binding).

Alternatively, run the tool against a strict validation server that rejects bodies not matching the concrete schema. Generation failures indicate the tool is not generating schema-conformant inputs.

---

## Validator Testing

**Target tools:** AJV, IBM openapi-validator, vacuum

### Goal

Verify that a standalone JSON Schema or OpenAPI validator correctly evaluates `$dynamicRef`/`$dynamicAnchor` constraints.

### Approach

**For AJV (Ajv2020 mode):**

```ts
import Ajv2020 from "ajv/dist/2020";
const ajv = new Ajv2020();

// Load the template schema (with $dynamicAnchor) and concrete schemas
const templateSchema = { /* PaginatedTemplate with $dynamicAnchor: "itemType" */ };
const userSchema = { /* extends template, $dynamicAnchor: "itemType" in $defs */ };

const validate = ajv.compile(userSchema);
const validUser = { items: [{ id: "1", email: "a@b.com" }], total: 1 };
const wrongShape = { items: [{ id: "1", name: "group" }], total: 1 };

assert(validate(validUser) === true);
assert(validate(wrongShape) === false);  // fails if $dynamicRef bug present
```

**For OpenAPI linters (vacuum, IBM validator):**

1. Lint the fixture spec.
2. Assert no false-positive errors are raised on valid `$dynamicRef`/`$dynamicAnchor` usage.
3. Assert the linter does not panic or crash on these keywords.

The primary concern for linters is false positives (incorrectly rejecting valid OAS 3.1 schemas) rather than false negatives (not catching misuse).
