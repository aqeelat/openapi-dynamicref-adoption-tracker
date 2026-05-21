# Schemathesis

## Overview

| Property | Value |
|---|---|
| Category | API testing (property-based) |
| Language | Python (Rust core) |
| License | MIT |
| Repo | https://github.com/schemathesis/schemathesis |
| Version analyzed | v4.19.0 |
| OAS version supported | 3.0, 3.1 (full) |
| Active maintenance | Very active |

## Summary

Schemathesis is a property-based API testing tool. It recently migrated its validation backend to `jsonschema_rs` (Rust, via Python bindings), which implements JSON Schema 2020-12 including `$dynamicRef`/`$dynamicAnchor`. Validation of responses against schemas containing `$dynamicRef` is likely correct. The unverified gap is in the Hypothesis-based test *data generation* layer: `hypothesis_jsonschema` may not honor `$dynamicRef` when generating request bodies that must satisfy a schema. No issues exist for this specific gap.

## Processing Stack

```
Schemathesis
  → jsonschema_rs ^0.46.4     (validation — Rust, 2020-12 support, $dynamicRef aware)
  → hypothesis_jsonschema ^0.23.1  (test data generation from JSON Schema — Python)
  → hypothesis                (property-based test framework)
```

PR #3709 ("refactor: Use `jsonschema_rs` for reference resolution", merged May 2026) confirms the recent migration of the resolution and validation pipeline to the Rust validator.

## $dynamicRef Support Status

**Validation: likely correct. Data generation: unverified.**

`jsonschema_rs` is one of the most spec-correct JSON Schema validators available. It implements the full draft-2020-12 vocabulary including `$dynamicRef`/`$dynamicAnchor`. Response validation against schemas containing these keywords should work correctly once specs are parsed.

`hypothesis_jsonschema` is a separate library that synthesizes Hypothesis strategies from JSON Schema descriptions. It targets draft-07 primarily. Whether it correctly generates data that satisfies schemas containing `$dynamicRef` constraints is untested. If `hypothesis_jsonschema` treats `$dynamicRef` as an unknown keyword, generated test inputs may not respect the dynamically-bound concrete schema, causing either:

- False positives: Schemathesis generates invalid inputs, which get rejected by a well-implemented server, causing spurious test failures.
- False negatives: Schemathesis generates too-permissive inputs, missing bugs in the server's handling of the bound concrete schema.

No issues mentioning `$dynamicRef` in the Schemathesis tracker.

## Testing Approach

See [TESTING_METHODOLOGIES.md — API Testing Tool Testing](../TESTING_METHODOLOGIES.md#api-testing-tool-testing).

Two-pronged test approach:

1. **Validation test**: Run Schemathesis against a mock server that returns a response violating the dynamically-bound schema. Assert Schemathesis reports a failure.
2. **Generation test**: Run Schemathesis against a server that accepts any input but logs received request bodies. Inspect the generated inputs to verify they conform to the dynamically-bound schema (not just the template schema).

The second test requires a custom Hypothesis strategy observer or a server-side logger.

## Contribution Feasibility

**Medium.** Two separate contribution paths:

1. **Validation** (easier): If a test reveals `jsonschema_rs` doesn't handle `$dynamicRef` in Schemathesis's usage context (e.g., due to how `$ref` resolution results are fed into the validator), fixing the integration is tractable.
2. **Generation** (harder): Improving `hypothesis_jsonschema` to honor `$dynamicRef` would require changes to that separate library, which Schemathesis does not own. Alternatively, Schemathesis could post-process `hypothesis_jsonschema` strategies to apply dynamic binding constraints — a significant feature.

The maintainer (Stranger6667) is highly responsive and lands fixes quickly when provided with reproducible test cases.

## Landing Likelihood

**Medium.** If the gap is in Schemathesis's integration with `jsonschema_rs`, the fix would land quickly. If the gap is in `hypothesis_jsonschema` itself, the path is longer and depends on a separate maintainer.
