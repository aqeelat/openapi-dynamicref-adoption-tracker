---
description: "Analyze a tool from TOOLING_CATALOG.md for $dynamicRef/$dynamicAnchor support"
subtask: true
---

Analyze **$ARGUMENTS** for OpenAPI 3.1+ / JSON Schema 2020-12 `$dynamicRef` and `$dynamicAnchor` support.

### Tool selection rules

- If a tool name was provided above, that is the target.
- If the name starts with `!`, strip the `!` and treat this as a force-rerun — redo the analysis even if an existing file is found.
- If no tool name was provided (the bold text above is empty or missing), pick a random tool from @TOOLING_CATALOG.md whose `$dynamicRef` status is **Unknown** and has no corresponding `analysis/<tool-name>.md` file yet.

### Existing analysis check

Before starting, check whether `analysis/<tool-name>.md` already exists.

- If it exists and this is NOT a force-rerun: stop and tell the user the analysis already exists at that path. Suggest re-running with `!` prefix to force.
- If it exists and this IS a force-rerun: overwrite it.
- If it does not exist: proceed.

### Catalog check

Read @TOOLING_CATALOG.md. If the tool does not have an entry, research its identity, repository URL, license, category, and current `$dynamicRef` status, then add a new row to the appropriate section before continuing.

### Run the analysis

Follow the full analysis prompt in @analysis/_prompt.md against the selected tool. Use the fixture suites in @fixtures/ for test planning. Write the result to `analysis/<tool-name>.md` using the outline specified in the prompt.
