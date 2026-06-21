# Plan: Add clone-to-tmp step + implementation queue

## Goal

Separate the analysis phase (ephemeral `/tmp/` clones) from the implementation phase (`~/lab/` clones + IMPLEMENTATION_GUIDE.md). Bridge them with a local `queue.md` that tracks tools with high implementation potential.

## Workflow

```
analyze-tool → clone to /tmp/<tool>/ → research → write analysis/<tool>.md
    → update catalog (Status, Blocked by, Backed by)
    → if high potential: add to queue.md

Later:
    queue.md entry → create GitHub issue → clone to ~/lab/<tool>/
    → follow IMPLEMENTATION_GUIDE.md to implement
```

## Changes (4 files)

### 1. `.opencode/commands/analyze-tool.md`

**Clone step** (replace the `~/lab/clones/` version from prior plan):

```markdown
### Clone upstream repo

Clone the tool's repository to `/tmp/<tool-name>/` for local source analysis.

- If the directory already exists, run `git pull` to update.
- Use `git clone --depth 1` for a shallow clone (latest commit only).
- If the analysis needs git history (prior art, changelog, reverted fixes),
  run `git fetch --unshallow` on demand.
- If the tool has no public repo (proprietary), skip this step and note it.
- Record the commit SHA and date in the output file's Status Snapshot.
```

**New queue step** after "Update catalog dependencies":

```markdown
### Queue for implementation

If the analysis Recommendation is to tackle this tool **now** or **later**
(not "skip"), and the upstream acceptance likelihood is **medium** or
**high**, and the tool is not blocked by an unresolved upstream dependency:

- Append a row to `queue.md` (create the file if it does not exist).
- If the tool does not meet these criteria, do not queue it.

Queue row format:
| Tool | Analysis | Acceptance | Blocked by | Next step | Queued |
|---|---|---|---|---|---|
| <tool> | analysis/<tool>.md | <High/Medium> | <— or upstream> | Create issue | <YYYY-MM-DD> |
```

### 2. `analysis/_prompt.md`

Update line 9:

```
Do not implement changes. The tool's repository is cloned at
`/tmp/<tool-name>/`. Use it for source exploration: grep for keywords,
read source files, check test structure, and verify dependency manifests.
Fall back to web sources (GitHub web UI, package registries) for issues,
PRs, release history, and content not on the default branch.
```

### 3. `queue.md` (new, gitignored)

```markdown
# Implementation Queue

Tools analyzed and identified as candidates for upstream $dynamicRef work.
Local working file — not committed.

| Tool | Analysis | Acceptance | Blocked by | Next step | Queued |
|---|---|---|---|---|---|
```

### 4. `.gitignore`

Add `queue.md` after the existing `OUTREACH_TRACKER.md` line (line 2).

## Not changed

- `IMPLEMENTATION_GUIDE.md` — already covers the implementation phase (`~/lab/` clone, issue creation, PR workflow). The queue feeds into it.
- `TOOLING_CATALOG.md` — no structural change.
- `/tmp/` clones are ephemeral (cleared on reboot). No cleanup step needed.
