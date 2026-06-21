# AGENTS.md — OpenAPI `$dynamicRef` Adoption Tracker

This is the project-level guide for any agent (or human) working in this repo. Read this first.

## What this project is

Tracks `$dynamicRef` / `$dynamicAnchor` (JSON Schema 2020-12 / OpenAPI 3.1+) support across the OpenAPI/JSON Schema tooling ecosystem — parsers, validators, linters, renderers, SDK generators, spec producers, API clients, mock servers. The goal is to **move the whole ecosystem toward full `$dynamicRef` support**, not just to document gaps.

## Key files

| File | Purpose |
|---|---|
| `TOOLING_CATALOG.md` | The master catalog: every tool, status (`Correct`/`Partial`/`No support`/`Unknown`), priority, blocked-by/backed-by, notes. §9 = Dismissed/Out-of-Scope. |
| `analysis/<tool>.md` | Per-tool deep analysis (one per tool). Follows `analysis/_prompt.md` outline. |
| `analysis/_prompt.md` | The analysis prompt (required questions + output structure). **Includes the fixtures-first rule + the "generics are achievable" principle.** |
| `.opencode/commands/analyze-tool.md` | The `/analyze-tool` command — clone → **run fixtures first** → analyze → write `analysis/<tool>.md` → update catalog/queue. |
| `analysis/orval-reference.md` | **The reference implementation map.** Orval's `$dynamicRef` generic-emission architecture (two patterns, key functions, cycle guards). Read before designing any generator/producer fix. |
| `IMPLEMENTATION_GUIDE.md` | The implementation-phase guide (issue → failing test → PR → lobbying). Has an Orval reference section. |
| `queue.md` | Implementation queue: Ready (priority-ordered) + Blocked. Local, gitignored. |
| `fixtures/` | The 8 fixture specs (generic-schema-binding, paginated-response, recursive-category-tree, api-envelope, etc.). The empirical truth source. |
| `state-of-the-union.md` | Matrix-tested SDK generator results (Orval, openapi-typescript, kiota, etc.). |

## Core methodology rules (do not violate)

1. **Fixtures-first.** For any *runnable* tool (generator, validator, linter, parser-bundler, importer, renderer-headless-sample), the first step after cloning is to **run it on the fixtures** and record observed output. Source archaeology explains *why*; it does not replace observation. Non-runnable tools (spec producers, libraries without a CLI) are source-first — label them "non-runnable." See `.opencode/commands/analyze-tool.md`.
2. **Generics are achievable. Do NOT default to "architecturally incompatible / materialize concrete types."** Orval proves real generic-type emission (`interface PaginatedTemplate<T>`) lands upstream (PR #3353). For generators/producers, design a real generic-emission path modeled on Orval (see `analysis/orval-reference.md`). The "Java/Go/Rust generics are erased" objection usually doesn't apply at the compile-time/reflection stage where producers operate.
3. **Label inferences.** Behavioral claims must cite observed fixture output or be explicitly labeled "inference."
4. **Stall guard.** If install/build exceeds ~5 min or a run hangs >~5 min, kill it, fall back to source-first, write `"empirical run skipped: <reason>"`.

## Current focus (as of 2026-06-16)

- **Phase 2 deep rewrites** in progress: re-analyzing every non-dismissed tool with the Orval-modeled full-support lens (was previously too conservative). Batches: generators → producers → renderers/validators.
- The catalog was restructured: §9 Dismissed holds architecturally-inapplicable tools (wrong dialect, not-OpenAPI, proprietary, dead-repo). Stale-but-OSS tools stay tracked at Low.

## In-flight upstream work (yours)

| PR | Repo | Status | Note |
|---|---|---|---|
| **#501** | mattpolzin/OpenAPIKit | in progress (`aqeelat`) | Adds `$dynamicRef` to the Swift document model. Keystone — unblocks `swift-openapi-generator` #547. |
| **#2332** | swagger-api/swagger-parser | open (`aqeelat`) | **Verified insufficient for the generic-binding pattern (Pattern B).** Override `$dynamicAnchor` beside `$ref` is dropped because swagger-core collapses `$ref` schemas to reference-only (OAS-3.0 behavior, not lifted for 3.1). Needs a companion swagger-core change (`$ref`-sibling preservation for 3.1) + a Pattern-B test in #2332. See `analysis/swagger-parser.md`. |

## Queue (priority-ordered)

See `queue.md` for the current Ready/Blocked lists. Top items: swagger-parser (blocked-by swagger-core), OpenAPIKit (#501), Micronaut (flagship producer — first to auto-emit `$dynamicRef` from language generics), then kiota/speakeasy/fern.

## Known traps (learned the hard way)

- **Stale npm descriptions lie.** `@apidevtools/swagger-parser@10` and `@12` both accept OAS 3.1 empirically, despite the "@10 is 3.0-only" description. Always run, don't trust descriptions.
- **`$ref`-siblings-ignored is a recurring root cause.** swagger-core (Java), Microsoft.OpenApi (.NET, [#2895](https://github.com/microsoft/OpenAPI.NET/issues/2895)/[#2896](https://github.com/microsoft/OpenAPI.NET/pull/2896)), ibm-openapi-validator's `no-$ref-siblings` rule, and others drop `$ref` siblings per OAS 3.0 semantics. For OAS 3.1, siblings are valid — tools that still drop them make Pattern B **unimplementable**, not just "unsupported." See [`analysis/ref-sibling-preservation.md`](analysis/ref-sibling-preservation.md) for the full cross-cutting analysis + the sibling-safe/sibling-unsafe parser split. The catalog's §1 has a "Sibling-safe" column (✓/✗/?) per parser.
- **Repos move/die.** Verify repo URLs (e.g. `Tufin/oasdiff`→`oasdiff/oasdiff`; `saaste/boon`→`santhosh-tekuri/boon`; `anttiviljami/openapi-client-axios`→`openapistack/`). Dead repos go to §9 Dismissed.
- **Bundled JS assets create grep false-positives.** `$dynamicRef` hits in `swagger-ui-bundle.js` / `redoc.standalone.js` / `defaultcodesamples.js` are bundled validators/UI, not the tool's own handling. Exclude `**/dist/**`, `**/assets/**`, `**/out/**`.
