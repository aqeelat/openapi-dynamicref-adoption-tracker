---
name: Generator tracking
about: Track one SDK generator or type emitter against the dynamicRef fixtures
title: "Track generator: <tool>"
labels: ["area:generator"]
assignees: ""
---

## Tool

- Name:
- Repository:
- Language/runtime:
- Upstream issue:
- Upstream PR:

## Current Result

- Generation:
- Typecheck:
- `$dynamicRef` fidelity:
  - Recursive fixtures: dynamic scope resolves to the active recursive type
  - Generic fixtures: generators emit reusable parameterized types when the target language supports generics (concrete materialization is PARTIAL — correct content, lost reuse)
- Last checked:

## Fixture Coverage

- [ ] `baseline-duplicated-pagination`
- [ ] `generic-schema-binding`
- [ ] `paginated-response`
- [ ] `api-envelope`
- [ ] `recursive-category-tree`
- [ ] `nested-workspace-resources`
- [ ] `non-identifier-schema-key`

## Evidence

Paste the relevant generated type excerpt or parser error. Prefer short excerpts over raw logs.

## Next Action

Open/update upstream issue, prepare PR, wait on dependency, or verify a merged fix in the matrix.
