---
name: Spec producer tracking
about: Track a tool that emits OpenAPI specs from source code
title: "Track spec producer: <tool>"
labels: ["area:producer"]
assignees: ""
---

## Tool

- Name:
- Repository:
- Language/runtime:
- Upstream issue:
- Upstream PR:

## Current Behavior

- Emits `$dynamicRef` / `$dynamicAnchor`: yes/no/partial
- Emits by default:
- Has opt-in flag:
- Has duplicated-schema fallback:
- OpenAPI versions supported:

## Desired Behavior

- [ ] Keeps duplicated schema output as the default while downstream support is incomplete
- [ ] Adds explicit opt-in `$dynamicRef` emission
- [ ] Documents downstream SDK generator compatibility caveats
- [ ] Can emit generic pagination or envelope patterns where applicable
- [ ] Can emit recursive dynamic reference patterns where applicable

## Evidence

Paste generated OpenAPI excerpts or links to relevant docs/issues.

## Next Action

Open upstream issue, prepare PR, wait on SDK generator support, or verify generated output against this repo's fixtures.
