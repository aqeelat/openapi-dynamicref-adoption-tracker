# Yaak

## Overview

| Property | Value |
|---|---|
| Category | API client (desktop) |
| Language | TypeScript + Rust (Tauri) |
| License | MIT |
| Repo | https://github.com/mountain-loop/yaak |
| Version analyzed | Current main (May 2026) |
| OAS version support | Inherited from openapi-to-postmanv2 v5.x |
| Active maintenance | Yes |

## Summary

Yaak is a Tauri-based (Rust + React) API client with an MIT license. Its OpenAPI import plugin is a thin TypeScript wrapper around `openapi-to-postmanv2 ^5.8.0`. Yaak therefore inherits all `$dynamicRef` behavior (and limitations) from that library. The Rust backend (`yaak-http`, `yaak-models`) does not process OpenAPI specs. The correct upstream fix is in `openapi-to-postmanv2`; once that is fixed, Yaak would need only a dependency bump to benefit.

## Architecture

```
Yaak OpenAPI import (TypeScript plugin at plugins/importer-openapi/)
  → openapi-to-postmanv2 ^5.8.0   (full import logic)

Yaak runtime (Rust via Tauri)
  → yaak-http, yaak-models         (HTTP execution, data models — no OpenAPI processing)
```

Note: Yaak pins `^5.x` while the current release of `openapi-to-postmanv2` is `6.0.1`. There may be OAS 3.1 improvements in v6 that Yaak has not yet picked up.

## $dynamicRef Support Status

**Identical to openapi-to-postmanv2 v5.x — likely broken passthrough.**

See [openapi-to-postmanv2 analysis](./postman-openapi.md) for details. The `$dynamicRef` keyword would survive the import as an opaque property but the dynamic binding is not applied.

## Contribution Path

**Upstream first.** The correct sequence:

1. Fix `openapi-to-postmanv2` to handle `$dynamicRef` correctly.
2. File a Yaak issue noting the `^5.x` pin is missing the fix.
3. Submit a Yaak PR bumping to `openapi-to-postmanv2 ^6.x`.

Direct `$dynamicRef` logic in Yaak would be duplication of work that belongs upstream.

**Note:** Yaak's contribution policy explicitly limits external PRs to "bug fixes and small-scope improvements" and requires larger features to have an approved feedback item at yaak.app/feedback. A dep-bump PR would qualify as a small-scope fix once the upstream work lands.

## Landing Likelihood

**Medium** (contingent on upstream `openapi-to-postmanv2` fix). The dep-bump PR itself is trivially easy to land; the blocker is the upstream work.
