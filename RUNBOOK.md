# OpenAPI DynamicRef State-of-the-Union Runbook

This document is an execution runbook for another agent to assess what happens when we represent generic wrappers in OpenAPI 3.1 using `$dynamicRef`/`$dynamicAnchor`.

The goal is to compare:

- current duplicated-wrapper schemas (works with most generators today), and
- dynamic-ref template schemas (standards-aligned, but uneven tooling support).

---

## 1) Scope and Success Criteria

### Questions to answer

1. Do validators correctly evaluate dynamic references in our sample specs?
2. Which SDK generators can ingest dynamic-ref specs without breaking?
3. Which generators emit useful types vs degraded/incorrect types?
4. Is a dual-output strategy needed (compat mode + dynamic mode)?

### Required outputs

- A markdown report `state-of-the-union.md` with:
  - tool/version matrix,
  - pass/fail by stage,
  - generated type quality notes,
  - recommendation for rollout.
- Artifact folder containing:
  - input specs,
  - generation logs,
  - generated SDK outputs,
  - compile/test logs.

---

## 2) Repository Layout To Create

Create this structure under `~/lab/openapi-dynamicref-test`:

```text
.
├── specs/
│   ├── baseline-duplicated.yaml
│   ├── dynamicref-template.yaml
│   └── dynamicref-hybrid.yaml
├── instances/
│   ├── asset-page.valid.json
│   ├── user-page.valid.json
│   └── invalid-mismatched-item.invalid.json
├── tools/
│   ├── orval/
│   ├── openapi-generator/
│   ├── swagger-codegen/
│   └── extra/
├── generated/
├── logs/
└── state-of-the-union.md
```

---

## 3) Spec Fixtures To Author

## 3.1 Baseline: duplicated wrappers

`specs/baseline-duplicated.yaml`

- OpenAPI `3.1.0`
- `components/schemas` includes:
  - `Asset`, `User`,
  - `PaginatedAssetResponse` (duplicate wrapper with `items: Asset[]`),
  - `PaginatedUserResponse` (duplicate wrapper with `items: User[]`).
- Paths:
  - `/assets` returns `PaginatedAssetResponse`
  - `/users` returns `PaginatedUserResponse`

Purpose: control case known to work in mainstream generators.

## 3.2 Dynamic template

`specs/dynamicref-template.yaml`

- OpenAPI `3.1.0`
- Introduce template schema:
  - `PaginatedResponse` with `$dynamicAnchor: itemType`
  - `items` references `{"$dynamicRef":"#itemType"}` (or equivalent structure, depending on chosen pattern)
- Introduce concrete instantiations:
  - `PaginatedAssetResponse` references template and binds `itemType` to `Asset`
  - `PaginatedUserResponse` references template and binds `itemType` to `User`
- Same paths as baseline.

Purpose: standards-aligned dynamic reference encoding.

## 3.3 Hybrid compatibility

`specs/dynamicref-hybrid.yaml`

- Includes dynamic template pattern from 3.2
- Adds explicit concrete aliases or duplicated concrete schemas for compatibility
- Optional vendor extension hints allowed (for experiment only), e.g. `x-template-of` metadata

Purpose: evaluate migration strategy when some tools ignore dynamic refs.

---

## 4) Validation Stage

Run at least two validators with JSON Schema 2020-12 support.

Recommended:

- AJV CLI / Node API
- One additional validator implementation from a different ecosystem

For each spec:

1. Validate the OpenAPI document structure (if tool supports it).
2. Validate sample instances against relevant response schemas:
   - valid asset page
   - valid user page
   - intentionally invalid payload (wrong item type)

Record in `logs/validation-*.log`:

- validator version,
- whether `$dynamicRef` is recognized,
- pass/fail with reasons.

---

## 5) SDK Generation Matrix

Run generation for each fixture spec across multiple tools.

## 5.1 Required tools

- Orval
- openapi-generator
- swagger-codegen (if feasible in environment)

## 5.2 Optional additional tools

- Another TypeScript-focused generator
- Another JVM/.NET generator

For each combination `(tool, spec)`:

1. Attempt generation.
2. Capture stdout/stderr to `logs/<tool>-<spec>.log`.
3. Save outputs under `generated/<tool>/<spec>/`.

Record:

- generation success/failure,
- parse/validation warnings,
- model names emitted,
- whether true generics are emitted,
- whether concrete aliases are emitted,
- obvious type degradation (`any`, `unknown`, empty schemas).

---

## 6) Compile/Typecheck Stage

For each generated TypeScript SDK output:

1. Add minimal `tsconfig.json` with strict mode enabled.
2. Add a tiny usage test that calls each endpoint and asserts inferred response item type.
3. Run `tsc --noEmit`.

Capture logs under `logs/typecheck-*.log`.

Note whether the following is true:

- `/assets` response items inferred as `Asset[]`
- `/users` response items inferred as `User[]`
- no unsafe fallback types where stronger types are expected

---

## 7) Scoring Rubric

Use this rubric in `state-of-the-union.md`.

Per `(tool, spec)`:

- `A` = Generates + compiles + correct types
- `B` = Generates + compiles but degraded types
- `C` = Generates with heavy warnings/manual fixes needed
- `D` = Fails generation or unusable output

Add one-line rationale for each grade.

---

## 8) Report Template

Create `state-of-the-union.md` with these sections:

1. Executive Summary
2. Tool Versions
3. Validation Results
4. Generation Matrix
5. Type Quality Findings
6. Risks and Compatibility Gaps
7. Recommended Rollout Strategy
8. Appendix (commands and logs index)

Include a final recommendation with one of:

- keep duplicated wrappers only,
- ship dynamic-ref behind feature flag,
- ship hybrid dual-output mode,
- block rollout pending specific tool fixes.

---

## 9) Guardrails

- Do not modify production specs in this analysis workspace.
- Keep all experiments in this folder.
- Pin and record tool versions for reproducibility.
- Keep commands deterministic and scriptable.
- If a tool crashes, preserve full logs rather than summarizing only.

---

## 10) Suggested Execution Order

1. Author the 3 fixture specs.
2. Add sample instances.
3. Run validator matrix.
4. Run SDK generator matrix.
5. Run TS typecheck tests.
6. Fill `state-of-the-union.md` using rubric.
7. Provide final recommendation and next actions.
