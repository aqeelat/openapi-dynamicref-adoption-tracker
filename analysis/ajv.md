# AJV (Another JSON Validator)

## Overview

| Property | Value |
|---|---|
| Category | JSON Schema validator (foundational dependency) |
| Language | TypeScript |
| License | MIT |
| Repo | https://github.com/ajv-validator/ajv |
| Version analyzed | v8.x (latest as of May 2026) |
| JSON Schema support | draft-07 (default), draft-2019-09, draft-2020-12 (via `Ajv2020`) |
| Active maintenance | Active (slow on core bugs) |

## Summary

AJV v8 implements `$dynamicRef`/`$dynamicAnchor` as part of its draft-2020-12 mode (`Ajv2020`), but the implementation has **known correctness bugs** with three concurrent open PRs attempting fixes as of May 2026. AJV is the most widely deployed JSON Schema validator in the JavaScript ecosystem and a transitive dependency of many OpenAPI tools (Prism, Insomnia, openapi-to-postmanv2, and others). Its `$dynamicRef` bugs directly affect any tool that uses it — even if the tool correctly activates `Ajv2020` mode.

## $dynamicRef Implementation Status

**Implemented but buggy.** Three open PRs as of May 2026:

| Issue/PR | Status | Description |
|---|---|---|
| PR #2622 | Open (May 21, 2026) | "Fix dynamicRef resolution for nested dynamic anchors" |
| PR #2615 | Open (May 12, 2026) | "Fix dynamicRef static target resolution" |
| PR #2573 | Open (Jan 2026) | "fix: resolve `$dynamicRef` to `$dynamicAnchor` in `$defs`" |

The source file `lib/vocabularies/dynamic/dynamicRef.ts` contains a telling comment:

```
// TODO the assumption here is that `recursiveRef: #` always points to the root
// of the schema object, which is not correct...
// (This problem is not tested in JSON-Schema-Test-Suite)
```

This reveals that AJV's `$dynamicRef` implementation makes a simplifying assumption — dynamic references resolve to the schema root — that does not hold for the general `$dynamicAnchor` pattern. The official JSON Schema Test Suite does not fully cover this case, which is why the bug persisted.

## Usage Requirement

`$dynamicRef`/`$dynamicAnchor` support is **opt-in** and requires using the 2020-12 constructor:

```ts
// Wrong — default AJV, ignores $dynamicRef silently:
import Ajv from "ajv"
const ajv = new Ajv()

// Correct — 2020-12 mode:
import Ajv2020 from "ajv/dist/2020"
const ajv = new Ajv2020()
```

Many tools (including Prism) use the default constructor even when validating OAS 3.1 schemas, meaning `$dynamicRef` is silently ignored before the bug question even arises.

## Impact on Dependent Tools

| Tool | AJV usage | Impact of AJV bugs |
|---|---|---|
| Stoplight Prism | `ajv ^8.20.0` (default mode) | `$dynamicRef` silently ignored — AJV bug moot until mode is fixed |
| Insomnia | `ajv ^8.17.1` | Same — swagger-parser layer likely strips it first |
| openapi-to-postmanv2 | `ajv ^8.11.0` | Likely default mode; needs verification |
| IBM openapi-validator | Spectral (uses AJV internally) | Low impact — linting rules don't invoke `$dynamicRef` resolution |

## Testing Approach

See [TESTING_METHODOLOGIES.md — Validator Testing](../TESTING_METHODOLOGIES.md#validator-testing).

AJV's own test suite (`npm test` in the repo) exercises `$dynamicRef` through the JSON Schema Test Suite. A contribution could add targeted test cases for the `$defs`-based `$dynamicAnchor` pattern from the fixture in this repo — the gap that PR #2573 addresses.

## Contribution Feasibility

**Low** for AJV itself. The project has significant PR backlog: 276 open issues, 63 open PRs, and three concurrent `$dynamicRef` fix attempts without merges. The maintainer (epoberezkin) is active on comments but merge velocity is slow.

The more impactful path is contributing to the *tools that use AJV* — activating `Ajv2020` mode in Prism, Insomnia, etc. — and noting AJV's known bugs as a downstream limitation.

## Landing Likelihood

**Low** (for AJV itself). The correctness bugs are known; the fix PRs are stalled. Watch the three open PRs for resolution. A new PR that comprehensively fixes all three cases with test coverage from the JSON Schema Test Suite would be the most likely to land.
