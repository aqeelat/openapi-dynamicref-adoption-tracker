# Implementation Guide: Adding $dynamicRef Support to SDK Generators

This guide is for an AI agent that is **already running inside a generator's repo**. The user has cloned the generator, navigated into it, and launched you with a prompt like:

> "Use ~/lab/openapi-dynamicref-adoption-tracker to implement dynamic ref in this project."

The tracker repo at `~/lab/openapi-dynamicref-adoption-tracker` (or wherever the user points you) contains the test specs, compatibility results, and this guide.

---

## How $dynamicRef Works

`$dynamicRef` and `$dynamicAnchor` are JSON Schema 2020-12 keywords that enable recursive schema references resolved at the **point of use**, not at the point of definition.

In our test pattern:

```yaml
PaginatedTemplate:
  properties:
    items:
      type: array
      items:
        $dynamicRef: '#itemType'    # placeholder — resolved later

PaginatedAssetResponse:
  allOf:
    - $ref: '#/components/schemas/PaginatedTemplate'
    - $dynamicAnchor: itemType      # binds the placeholder
      $ref: '#/components/schemas/Asset'
```

When a generator processes `PaginatedAssetResponse`, it should:

1. Walk into `PaginatedTemplate` via `$ref`
2. Encounter `$dynamicRef: '#itemType'`
3. Look up the `$dynamicAnchor: itemType` in the enclosing schema resource
4. Resolve it to `Asset`
5. Emit `items: Asset[]` in the output type

**Common bug:** generators treat `$dynamicRef` the same as `$ref` and resolve it at definition time, producing `unknown[]`, `any`, or skipping it entirely.

## Expected Correct Output

For `PaginatedAssetResponse`:

```typescript
interface PaginatedAssetResponse {
  items: Asset[];
  total: number;
  page: number;
  pageSize: number;
}
```

For `PaginatedUserResponse`:

```typescript
interface PaginatedUserResponse {
  items: User[];
  total: number;
  page: number;
  pageSize: number;
}
```

**Each concrete wrapper must have its items typed to the bound schema, not a generic fallback.**

---

## Step 1: Check for Existing Work

Before doing anything, search the repo's issues and PRs for prior work on `$dynamicRef` or `$dynamicAnchor`:

```bash
gh issue list -R <org>/<repo> --search "dynamicRef OR dynamicAnchor OR dynamic-ref OR dynamic-ref OR \$dynamicRef"
gh pr list -R <org>/<repo> --search "dynamicRef OR dynamicAnchor OR dynamic-ref OR \$dynamicRef" --state all
```

### If existing work is found

| Scenario | How to identify | What to do |
|---|---|---|
| **Open issue, no PR** | Issue exists, no linked PR | Proceed to Step 2. Reference this issue in your PR. |
| **Open PR, active** | Recent activity (< 30 days), CI passing | **Stop.** Summarize the PR to the user (approach, test coverage, current status) and ask for instructions. Do not duplicate work. |
| **Open PR, stale** | No activity > 30 days, may have failing CI | Summarize to the user. Recommend: revive (rebase + fix) or start fresh. Ask which. |
| **Open PR, draft** | Marked as draft | **Stop.** Summarize to the user and ask for instructions. The author may still be working on it. |
| **Merged PR** | Merged status | Verify the fix works against our test specs (see Step 5). If it works, update the Outreach table in the tracker's `README.md` as `merged` and stop. If not, open a new issue describing the remaining gap. |
| **Closed PR (rejected)** | Closed without merge | Read the rejection reasons. Understand what went wrong. Start fresh but avoid the same mistakes. Open a new issue if needed, link the prior PR. |

When presenting a summary to the user, include:

- PR/issue link and author
- Age and activity status
- Approach taken (is it solving the right problem?)
- Test coverage
- Your recommendation (revive / start fresh / wait / done)

### If no existing work is found

Proceed to Step 2.

---

## Step 2: Open or Update a GitHub Issue

### If no issue exists

Open a new issue:

```bash
gh issue create -R <org>/<repo> --title "feat: support \$dynamicRef / \$dynamicAnchor (JSON Schema 2020-12)" --body "$(cat <<'EOF'
## Summary

This generator does not correctly resolve `$dynamicRef` / `$dynamicAnchor` (JSON Schema 2020-12, [spec section 7.7](https://json-schema.org/draft/2020-12/json-schema-core#section-7.7)) in OpenAPI 3.1.x specs.

## Reproduction

A minimal spec demonstrating the issue is available at:
https://github.com/aqeelat/openapi-dynamicref-adoption-tracker/blob/main/specs/sample-schema-oas-3.1.2.yaml

The spec defines a generic `PaginatedTemplate` using `$dynamicRef: '#itemType'`, then binds it via `$dynamicAnchor` in `PaginatedAssetResponse` and `PaginatedUserResponse`.

## Expected behavior

- `PaginatedAssetResponse.items` should be typed as `Asset[]`
- `PaginatedUserResponse.items` should be typed as `User[]`

## Actual behavior

`items` is typed as `unknown[]` / `any` / `Array<any>` (or generation fails entirely).

## Why this matters

`$dynamicRef` enables template-like schema patterns without duplication. OpenAPI 3.1.x adopts JSON Schema 2020-12 as its schema dialect, so generators that claim 3.1.x support should handle these keywords. This is increasingly relevant as APIs adopt OAS 3.1 for polymorphic response wrappers.

## Compatibility evidence

A cross-generator compatibility matrix is tracked at:
https://github.com/aqeelat/openapi-dynamicref-adoption-tracker

---
*This issue was filed with assistance from AI tooling. The reproduction steps and spec references were verified by a human contributor.*
EOF
)"
```

### If an issue already exists

Add a comment if the issue is stale or missing context from our test specs:

```bash
gh issue comment <issue-number> -R <org>/<repo> --body "$(cat <<'EOF'
I've been investigating `$dynamicRef` compatibility across SDK generators and put together a minimal repro spec and compatibility matrix:

- Repro spec: https://github.com/aqeelat/openapi-dynamicref-adoption-tracker/blob/main/specs/sample-schema-oas-3.1.2.yaml
- Compatibility tracker: https://github.com/aqeelat/openapi-dynamicref-adoption-tracker

Happy to help with a PR if there's interest in fixing this.
EOF
)"
```

Save the issue URL and number — you'll need them for the PR and for updating the tracker.

---

## Step 3: Find the Relevant Code

Search the generator codebase for these entry points:

### 3a. Schema parser / reference resolver

Where `$ref` is followed. Search for:
- `"$ref"`, `$ref`, `resolveRef`, `resolve_ref`, `dereference`
- The code that walks schema objects and follows references

### 3b. Dynamic ref handling (if any)

Search for:
- `"$dynamicRef"`, `"$dynamicAnchor"`, `dynamicRef`, `dynamic_anchor`
- If no results: this is the root cause — the keyword is simply ignored

### 3c. Type emitter / code generator

Where resolved schemas are converted to output types:
- Search for where `items` or `array` types are emitted
- This is where the resolved type should flow through

### What to look for

Most generators have a pipeline like:

```
Parse OpenAPI doc → Resolve references → Build internal model → Emit code
```

The fix usually goes in the **Resolve references** stage. You need to:

- Detect `$dynamicRef` keywords (they look like `{"$dynamicRef": "#itemType"}`)
- When encountered, walk up the schema stack to find a matching `$dynamicAnchor`
- Replace the dynamic ref with the schema the anchor points to
- Continue processing as if it were a normal `$ref`

---

## Step 4: Write a Failing Test

Before implementing the fix, add a test that proves the bug:

1. Copy the test spec from the tracker repo into the generator's test fixtures:

```bash
cp ~/lab/openapi-dynamicref-adoption-tracker/specs/sample-schema-oas-3.1.2.yaml ./test/fixtures/dynamicref-sample.yaml
```

2. Write a test that generates code from this spec and asserts correct types:

```typescript
// Pseudocode — adapt to the generator's test framework
const spec = loadSpec('test/fixtures/dynamicref-sample.yaml');
const output = generate(spec);

expect(output).toContain('items: Asset[]');
expect(output).not.toContain('items: unknown[]');
expect(output).not.toContain('items: any');
```

3. Run the test — it should **fail**. This confirms you've correctly reproduced the issue.

---

## Step 5: Implement the Fix

Implement `$dynamicRef` resolution in the parser/reference resolver. The general algorithm:

```
function resolveDynamicRef(schema, refName, contextStack):
    for frame in reverse(contextStack):
        if frame has $dynamicAnchor == refName:
            return frame (or the schema frame.$ref points to)

    for resource in schemaResources:
        if resource has $dynamicAnchor == refName:
            return resource

    return { type: "any" }
```

Key considerations:

- **Context stack matters.** `$dynamicRef` must be resolved relative to the schema resource that **uses** the template, not the one that **defines** it. This is the critical difference from `$ref`.
- **allOf composition.** In our pattern, the `$dynamicAnchor` sits alongside `$ref` in an `allOf`. Make sure your resolver processes all `allOf` entries and collects anchors before resolving refs.
- **Don't break existing $ref handling.** `$dynamicRef` is a separate keyword — make sure normal `$ref` resolution is untouched.

---

## Step 6: Verify the Fix

1. **Run the failing test from Step 4.** It should now pass.

2. **Run the full existing test suite.** Nothing should regress.

3. **Run the full matrix from the tracker repo** against your local build:

```bash
TRACKER=~/lab/openapi-dynamicref-adoption-tracker

# Adapt these commands to the generator's CLI
<generator-binary> --input $TRACKER/specs/sample-schema-oas-3.1.0.yaml --output /tmp/dynamicref-test/3.1.0
<generator-binary> --input $TRACKER/specs/sample-schema-oas-3.1.1.yaml --output /tmp/dynamicref-test/3.1.1
<generator-binary> --input $TRACKER/specs/sample-schema-oas-3.1.2.yaml --output /tmp/dynamicref-test/3.1.2
<generator-binary> --input $TRACKER/specs/sample-schema-oas-3.2.0.yaml --output /tmp/dynamicref-test/3.2.0
```

4. **Typecheck each generated output:**

```bash
for v in 3.1.0 3.1.1 3.1.2 3.2.0; do
  echo "=== $v ==="
  cd /tmp/dynamicref-test/$v && tsc --noEmit --strict
done
```

5. **Inspect the types.** Verify:
   - `PaginatedAssetResponse.items` is `Asset[]`
   - `PaginatedUserResponse.items` is `User[]`
   - No `any`, `unknown`, or generic fallbacks

---

## Step 7: Fork, Commit, and Open a PR

Once the fix is working and tested:

### 7a. Fork the repo and add as remote

```bash
gh repo fork <org>/<repo> --clone=false
git remote add fork https://github.com/<your-user>/<repo>.git
```

### 7b. Create a feature branch and commit

```bash
git checkout -b fix/dynamicref-support

# Stage only the files you changed — never use git add -A in a third-party repo
git add <path/to/changed/resolver> <path/to/new/test> <path/to/test/fixture>
git commit -m "feat: add \$dynamicRef / \$dynamicAnchor support for OpenAPI 3.1.x"
```

### 7c. Push and open a PR

```bash
git push -u fork fix/dynamicref-support

gh pr create \
  --repo <org>/<repo> \
  --title "feat: add \$dynamicRef / \$dynamicAnchor support" \
  --body "$(cat <<'EOF'
## Summary

Adds support for JSON Schema 2020-12 `$dynamicRef` / `$dynamicAnchor` resolution in OpenAPI 3.1.x schema processing.

Fixes #<issue-number>

## Problem

Dynamic references were either ignored or resolved at definition time, producing `unknown[]`, `any`, or `Array<any>` for parameterized schemas like generic pagination wrappers.

## Solution

- Added `$dynamicRef` detection in the schema reference resolver
- Implemented context-stack-aware resolution to find matching `$dynamicAnchor` at the point of use
- Added test coverage using a spec with `PaginatedTemplate` + concrete bindings

## Testing

- New test: generates code from a `$dynamicRef` spec and asserts correct item types
- Existing test suite: all passing, no regressions
- Verified against OpenAPI 3.1.0, 3.1.1, 3.1.2, and 3.2.0 specs from https://github.com/aqeelat/openapi-dynamicref-adoption-tracker

## Before

```typescript
items: unknown[];
```

## After

```typescript
items: Asset[];
```

---
*This PR was authored with assistance from AI tooling. The code changes, tests, and rationale were reviewed and verified by a human contributor.*
EOF
)"
```

---

## Step 8: Update the Tracker

After the PR is open, update the Outreach table in the tracker repo's `README.md`:

1. Find or add the generator row in the "Outreach" table.
2. Fill in the Issue and/or PR links.
3. Set the status to `pr-open`.
4. Set the date to today (YYYY-MM-DD).

If the fix was verified across all spec versions, update `state-of-the-union.md` with the new results.

---

## Lobbying Maintainers

After opening an issue or PR, help it gain traction with the maintainers. Most open-source maintainers are busy and may not prioritize JSON Schema edge cases. Here's how to increase the chances of a response and merge.

### Write high-quality issues

- **Lead with impact.** Explain why this matters in practice (pagination wrappers, generic response types, reducing schema duplication). Don't assume they care about spec compliance for its own sake.
- **Provide a minimal repro.** The spec in this repo is intentionally small — link directly to it. Don't make them find or build a test case.
- **Show the before/after.** Concrete type output (`unknown[]` vs `Asset[]`) is more convincing than abstract descriptions.

### Write reviewable PRs

- **Keep PRs small.** Only change the reference resolver and add tests. Don't refactor unrelated code in the same PR.
- **Explain the algorithm.** Include a comment or PR description explaining how `$dynamicRef` resolution differs from `$ref` (context stack vs. direct lookup). Most reviewers won't know this distinction.
- **Show no regressions.** Run the full existing test suite and include the passing output in the PR. Maintainers are protective of CI.

### Engage on the right channels

- **GitHub Discussions / Discord / Slack.** Many generators have a community chat. Post there linking to the issue: "Hey, I ran into this gap in `$dynamicRef` handling — opened #123 with a minimal repro and a fix. Happy to iterate on the approach."
- **Don't ping maintainers immediately.** Wait 3-5 business days before a polite follow-up comment on the issue or PR.
- **Respond quickly to review feedback.** Fast iteration signals that you're committed to getting it merged.

### Build external evidence

- **Reference the compatibility tracker.** Link to this repo as evidence that this is a cross-ecosystem gap, not a niche concern. "Here's a compatibility matrix showing that no major generator handles this correctly yet — this project could be the first."
- **Cross-link related issues.** If other generators have the same bug, link their issues. Maintainers may not realize this is a known ecosystem gap.
- **Upvote or comment on existing issues.** If someone else already filed the same bug, add your repro spec and findings as a comment rather than opening a duplicate.

### Be patient but persistent

- If a PR goes stale after 2+ weeks with no review, post a polite comment: "Bumping this — happy to rebase or adjust the approach if there's feedback. Is there anything blocking review?"
- If a maintainer pushes back on scope, offer to gate the feature behind a config flag: "I can add an opt-in flag so this only activates when users explicitly enable `$dynamicRef` support."
- If a PR is rejected, thank the maintainer, document the reasoning in the Outreach table in the tracker's `README.md`, and move on to the next generator. Not every project will accept the change.

---

## Appendix: Spec Reference

- **JSON Schema 2020-12 Core** — `$dynamicRef` / `$dynamicAnchor`: https://json-schema.org/draft/2020-12/json-schema-core#section-7.7
- **OpenAPI 3.1.0** — uses JSON Schema 2020-12 as its schema dialect
- **Test specs in the tracker repo:** `specs/sample-schema-oas-3.1.{0,1,2}.yaml` and `specs/sample-schema-oas-3.2.0.yaml`
- **Compatibility results:** `state-of-the-union.md`
