---
description: "Analyze a tool from TOOLING_CATALOG.md for $dynamicRef/$dynamicAnchor support"
subtask: true
model: zai-coding-plan/glm-5.1
---

Analyze **$ARGUMENTS** for OpenAPI 3.1+ / JSON Schema 2020-12 `$dynamicRef` and `$dynamicAnchor` support.

### Tool selection rules

- If a tool name was provided above, that is the target.
- If the name starts with `!`, strip the `!` and treat this as a force-rerun — redo the analysis even if an existing file is found.
- If no tool name was provided (the bold text above is empty or missing), pick a random tool from @TOOLING_CATALOG.md whose `$dynamicRef` status is **Unknown**, **Blocked by** is `—`, and has no corresponding `analysis/<tool-name>.md` file yet.

### Existing analysis check

Before starting, check whether `analysis/<tool-name>.md` already exists.

- If it exists and this is NOT a force-rerun: stop and tell the user the analysis already exists at that path. Suggest re-running with `!` prefix to force.
- If it exists and this IS a force-rerun: overwrite it.
- If it does not exist: proceed.

### Catalog check

Read @TOOLING_CATALOG.md. If the tool does not have an entry, research its identity, repository URL, license, category, and current `$dynamicRef` status, then add a new row to the appropriate section before continuing.

### Clone upstream repo

Clone the tool's repository to `/tmp/<tool-name>/` for local source analysis.

- If the directory already exists, run `git pull` to update.
- Use `git clone --depth 1` for a shallow clone (latest commit only).
- If the analysis needs git history (prior art, changelog, reverted fixes), run `git fetch --unshallow` on demand.
- If the tool has no public repo (proprietary), skip this step and note it in the analysis.
- Record the commit SHA and date in the output file's Status Snapshot.

### Run fixtures first (runnable tools only)

Before reading source, establish ground truth by running the tool against the fixture suite. Source archaeology comes after and explains *why* the observed behavior occurs — it does not replace observation.

Classify the tool and run the matching command against these four high-signal fixtures — `generic-schema-binding`, `paginated-response`, `recursive-category-tree`, `api-envelope`:

- **Matrix generators** (`orval`, `openapi-generator`, `swagger-codegen`, `openapi-typescript`, `hey-api`, `openapi-typescript-codegen`, `oazapfts`, `kiota`, `nswag`): `node scripts/matrix-runner.mjs --tools=<id>`. Inspect `generated/<id>/`.
- **Non-matrix generators** (fern, speakeasy, swift-openapi-generator, sdkgen, …): derive the tool's own CLI against each fixture; inspect emitted code/types.
- **Validators**: AJV/Hyperjump → patterns in `scripts/validate-jsonschema.mjs`. Others → invoke the validator's own CLI on a schema + instance extracted from a fixture.
- **Linters / parser-bundlers** (spectral, redocly, vacuum, oasdiff, ibm-openapi-validator, swagger-parser, libopenapi, …): run the CLI on each fixture; capture exit code + output.
- **Importers** (postman, bruno, insomnia, yaak, hoppscotch): run the converter on a fixture; inspect the resulting collection.
- **Renderers** (swagger-ui, redoc, scalar, …): exercise headless sample-generation only; record full DOM render under "Human Review Needed".
- **Spec producers / libraries without a CLI**: SKIP this step, mark the tool "non-runnable (source-first)", and proceed to source analysis.

Record a **Fixture Results** table — fixture → observed behavior → verdict (`PRESERVED | RESOLVED | STRIPPED | CRASH | UNTYPED | N/A`). This table is the evidence base for the "Current DynamicRef Behavior" section.

Treat all run output as **ephemeral** — do not commit anything under `generated/` or `logs/`; summarize findings in the analysis file only.

**Stall guard:** if the tool isn't installed, try its install hint. If install exceeds **5 minutes** or any single run produces no output for **5 minutes**, kill it, fall back to source-first, and write `"empirical run skipped: <reason>"` in the analysis. Never let a single command hang indefinitely.

### Run the analysis

Follow the full analysis prompt in @analysis/_prompt.md against the selected tool. Use the Fixture Results from the step above as the evidence base; @fixtures/ supplies the specs. Write the result to `analysis/<tool-name>.md` using the outline specified in the prompt.

### Update catalog dependencies

After writing the analysis, update the tool's row in @TOOLING_CATALOG.md based on the dependency chain findings:

- If `$dynamicRef` resolution is delegated to an upstream that is **Partial** or **No support**, set **Blocked by** to that tool name.
- If `$dynamicRef` resolution is delegated to an upstream that is **Correct**, set **Backed by** to that tool name.
- If neither applies, leave both as `—`.
- If the Status changed (e.g., Unknown → Correct/Partial/No support), update that column too.

### Queue for implementation

If the analysis Recommendation is to tackle this tool **now** or **later** (not "skip"), and the upstream acceptance likelihood is **medium** or **high**, and the tool is not blocked by an unresolved upstream dependency:

- Append a row to `queue.md` (create the file if it does not exist).
- If the tool does not meet these criteria, do not queue it.

Queue row format:

```
| <tool> | [analysis/<tool>.md](analysis/<tool>.md) | <High/Medium> | <— or upstream> | Create issue | <YYYY-MM-DD> |
```
