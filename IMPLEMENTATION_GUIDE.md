# Implementation Guide: Adding $dynamicRef Support to SDK Generators

This guide is for an AI agent that is **already running inside a generator's repo**. The user has cloned the generator, navigated into it, and launched you with a prompt like:

> "Use ~/lab/openapi-dynamicref-adoption-tracker to implement dynamic ref in this project."

The tracker repo at `~/lab/openapi-dynamicref-adoption-tracker` (or wherever the user points you) contains validator-backed fixtures, mixed-support fixtures, compatibility results, and this guide.

Do not open upstream issues or PRs from an unvalidated fixture. Use validator-backed fixtures first. If using a fixture with mixed validator support, include the validator disagreement in the issue or PR.

---

## How $dynamicRef Works

`$dynamicRef` and `$dynamicAnchor` are JSON Schema 2020-12 keywords that enable recursive schema references resolved at the **point of use**, not at the point of definition.

Validated fixture patterns include recursive and nested dynamic scope. Example:

```yaml
BaseCategory:
  $dynamicAnchor: category
  properties:
    children:
      type: array
      items:
        $dynamicRef: '#category'

LocalizedCategory:
  $dynamicAnchor: category
  allOf:
    - $ref: '#/components/schemas/BaseCategory'
    - type: object
      required: [displayName, locale]
      properties:
        displayName:
          type: string
        locale:
          type: string
```

When a generator processes `LocalizedCategory`, it should:

1. Walk into `BaseCategory` via `$ref`
2. Encounter `$dynamicRef: '#category'` in `children.items`
3. Resolve it through dynamic scope to the active `LocalizedCategory` anchor
4. Emit child nodes as the concrete extended node type, not the base type or `any`

**Common bug:** generators treat `$dynamicRef` the same as `$ref` and resolve it at definition time, producing `unknown[]`, `any`, or skipping it entirely.

## Expected Correct Output

For recursive tree fixtures, the generated TypeScript should preserve recursive extension:

```typescript
interface LocalizedCategory extends BaseCategory {
  displayName: string;
  locale: string;
  children: LocalizedCategory[];
}
```

For complex nested fixtures, dynamic refs should preserve concrete nested folder/resource types instead of degrading to `any` or `unknown`.

Two pagination/generic-wrapper fixtures follow the JSON Schema generics pattern and are validated by Hyperjump, but AJV currently disagrees. Use them with that caveat documented.

For a future validated pagination pattern, the desired output would be:

```typescript
interface PaginatedUserResponse {
  items: User[];
  total: number;
  page: number;
  pageSize: number;
}
```

**Dynamic refs must resolve to concrete schema types, not generic fallbacks.**

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

**Important:** Before posting the issue, confirm with the user that the content is accurate and they approve the submission. The AI disclosure in the template is honest — do not post without the user's review.

### If no issue exists

Open a new issue:

```bash
gh issue create -R <org>/<repo> --title "feat: support \$dynamicRef / \$dynamicAnchor (JSON Schema 2020-12)" --body "$(cat <<'EOF'
## Summary

This generator does not correctly preserve `$dynamicRef` / `$dynamicAnchor` semantics (JSON Schema 2020-12, [spec section 7.7](https://json-schema.org/draft/2020-12/json-schema-core#section-7.7)) for OpenAPI 3.1.x fixtures that are validator-backed or have documented mixed validator support.

## Reproduction

Minimal fixtures demonstrating the issue are available at:

- Recursive category tree: https://github.com/aqeelat/openapi-dynamicref-adoption-tracker/blob/main/fixtures/recursive-category-tree.yaml
- Nested workspace resources: https://github.com/aqeelat/openapi-dynamicref-adoption-tracker/blob/main/fixtures/nested-workspace-resources.yaml
- Pagination/generic wrapper (named schemas): https://github.com/aqeelat/openapi-dynamicref-adoption-tracker/blob/main/fixtures/generic-schema-binding.yaml
- Pagination/generic wrapper (inline response binding): https://github.com/aqeelat/openapi-dynamicref-adoption-tracker/blob/main/fixtures/paginated-response.yaml

These fixtures pass Redocly, openapi-spec-validator, Spectral, and swagger-cli. The recursive and nested fixtures pass AJV 2020 runtime validation. Both pagination fixtures follow the OAI-referenced JSON Schema generics pattern and pass Hyperjump runtime validation, while AJV currently disagrees.

## Expected behavior

- Recursive children should preserve the concrete extended node type (for example `LocalizedCategory.children: LocalizedCategory[]`)
- Nested dynamic refs should preserve concrete folder/resource types instead of falling back to `any` / `unknown`
- Pagination wrappers should preserve concrete item types (for example `PaginatedUserResponse.items: User[]`)

## Actual behavior

Dynamic refs are typed as `unknown`, `any`, a base schema only, or generation fails entirely.

## Why this matters

`$dynamicRef` enables dynamic scope-aware schema reuse. OpenAPI 3.1.x adopts JSON Schema 2020-12 as its schema dialect, so generators that claim 3.1.x support should handle these keywords where the fixture is validator-backed or clearly documented as mixed-support.

## Compatibility evidence

A cross-generator compatibility matrix is tracked at:
https://github.com/aqeelat/openapi-dynamicref-adoption-tracker

---
*This issue was drafted with assistance from AI tooling. The submitter is responsible for reviewing and validating the contents before submission.*
EOF
)"
```

### If an issue already exists

Add a comment if the issue is stale or missing context from our test specs:

```bash
gh issue comment <issue-number> -R <org>/<repo> --body "$(cat <<'EOF'
I've been investigating `$dynamicRef` compatibility across SDK generators and put together a minimal repro spec and compatibility matrix:

- Recursive fixture: https://github.com/aqeelat/openapi-dynamicref-adoption-tracker/blob/main/fixtures/recursive-category-tree.yaml
- Complex nested fixture: https://github.com/aqeelat/openapi-dynamicref-adoption-tracker/blob/main/fixtures/nested-workspace-resources.yaml
- Pagination/generic fixture (named schemas): https://github.com/aqeelat/openapi-dynamicref-adoption-tracker/blob/main/fixtures/generic-schema-binding.yaml
- Pagination/generic fixture (inline response binding): https://github.com/aqeelat/openapi-dynamicref-adoption-tracker/blob/main/fixtures/paginated-response.yaml
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

- Detect `$dynamicRef` keywords (for example `{"$dynamicRef": "#node"}`)
- When encountered, walk up the schema stack to find a matching `$dynamicAnchor`
- Preserve the dynamic-scope target in the internal model so code emission can produce the concrete recursive/nested type
- Continue processing as if it were a normal `$ref`

---

## Step 4: Write a Failing Test

Before implementing the fix, add a test that proves the bug:

1. Copy fixtures from the tracker repo into the generator's test fixtures:

```bash
cp ~/lab/openapi-dynamicref-adoption-tracker/fixtures/recursive-category-tree.yaml ./test/fixtures/recursive-category-tree.yaml
cp ~/lab/openapi-dynamicref-adoption-tracker/fixtures/nested-workspace-resources.yaml ./test/fixtures/nested-workspace-resources.yaml
cp ~/lab/openapi-dynamicref-adoption-tracker/fixtures/generic-schema-binding.yaml ./test/fixtures/generic-schema-binding.yaml
cp ~/lab/openapi-dynamicref-adoption-tracker/fixtures/paginated-response.yaml ./test/fixtures/paginated-response.yaml
```

2. Write a test that generates code from this spec and asserts correct types:

```typescript
// Pseudocode — adapt to the generator's test framework
const spec = loadSpec('test/fixtures/recursive-category-tree.yaml');
const output = generate(spec);

expect(output).toContain('children: LocalizedCategory[]');
expect(output).not.toContain('items: unknown[]');
expect(output).not.toContain('items: any');
```

3. Run the test — it should **fail**. This confirms you've correctly reproduced the issue.

---

## Step 5: Implement the Fix

Implement `$dynamicRef` resolution in the parser/reference resolver. This must follow JSON Schema 2020-12 dynamic scope semantics (not static `$ref` semantics).

The general algorithm:

```
function resolveDynamicRef(schema, refName, dynamicScope):
    // Walk the dynamic scope from innermost to outermost
    // The dynamic scope is the runtime evaluation path, not the static definition site
    for resource in reverse(dynamicScope):
        if resource declares $dynamicAnchor == refName:
            return the schema that resource points to

    // If no match found, the dynamic ref is unresolvable
    // Do NOT silently degrade to `any` — emit a diagnostic error or warning
    // so that the generator user knows the ref could not be resolved
    raise DynamicRefUnresolvedError(refName)
```

Key considerations:

- **Dynamic scope, not static scope.** `$dynamicRef` is resolved along the runtime evaluation path (the dynamic scope), which tracks which schema resources are active when the ref is encountered. This is fundamentally different from `$ref` which is a static link. If the generator only has a static reference graph, it will need to simulate the dynamic scope by tracking schema evaluation order.
- **Composition matters.** Validated recursive fixtures use composed schemas with a `$dynamicAnchor` at the composed schema root. The pagination fixture uses the JSON Schema generics pattern: a fallback dynamic anchor in the template and concrete dynamic anchors in each response schema's `$defs`.
- **Don't break existing $ref handling.** `$dynamicRef` is a separate keyword — make sure normal `$ref` resolution is untouched.
- **Don't silently degrade to `any`.** If a dynamic ref cannot be resolved, emit a clear diagnostic (warning or error) rather than falling back to `any` / `unknown`. Silent degradation is exactly the problem this repo is trying to eliminate.

---

## Step 6: Verify the Fix

1. **Run the failing test from Step 4.** It should now pass.

2. **Run the full existing test suite.** Nothing should regress.

3. **Run the validated fixtures from the tracker repo** against your local build:

```bash
TRACKER=~/lab/openapi-dynamicref-adoption-tracker

# Adapt these commands to the generator's CLI
<generator-binary> --input $TRACKER/fixtures/recursive-category-tree.yaml --output /tmp/dynamicref-test/recursive-category-tree
<generator-binary> --input $TRACKER/fixtures/nested-workspace-resources.yaml --output /tmp/dynamicref-test/nested-workspace-resources
<generator-binary> --input $TRACKER/fixtures/generic-schema-binding.yaml --output /tmp/dynamicref-test/generic-schema-binding
<generator-binary> --input $TRACKER/fixtures/paginated-response.yaml --output /tmp/dynamicref-test/paginated-response
```

4. **Typecheck each generated output:**

```bash
for fixture in recursive-category-tree nested-workspace-resources generic-schema-binding paginated-response; do
  echo "=== $fixture ==="
  cd /tmp/dynamicref-test/$fixture && tsc --noEmit --strict
done
```

5. **Inspect the types.** Verify:
   - Recursive children preserve the concrete extended node type
   - Nested dynamic refs preserve concrete folder/resource types
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

Dynamic references were either ignored or resolved at definition time, producing `unknown[]`, `any`, or base-only types for recursive/nested schemas that should preserve the active dynamic scope.

## Solution

- Added `$dynamicRef` detection in the schema reference resolver
- Implemented dynamic-scope-aware resolution to find the active `$dynamicAnchor` target
- Added test coverage using recursive, nested, and pagination-generic dynamicRef fixtures

## Testing

- New test: generates code from `$dynamicRef` fixtures and asserts correct recursive/nested types
- Existing test suite: all passing, no regressions
- Verified against fixtures from https://github.com/aqeelat/openapi-dynamicref-adoption-tracker

## Before

```typescript
children: unknown[];
```

## After

```typescript
children: LocalizedCategory[];
```

---
*This PR was drafted with assistance from AI tooling. The submitter is responsible for reviewing and validating the contents before submission.*
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

If the fix was verified against the fixtures, update `state-of-the-union.md` with the new results.

---

## Lobbying Maintainers

After opening an issue or PR, help it gain traction with the maintainers. Most open-source maintainers are busy and may not prioritize JSON Schema edge cases. Here's how to increase the chances of a response and merge.

### Write high-quality issues

- **Lead with impact.** Explain why this matters in practice (pagination wrappers, generic response types, reducing schema duplication). Don't assume they care about spec compliance for its own sake.
- **Provide a minimal repro.** The spec in this repo is intentionally small — link directly to it. Don't make them find or build a test case.
- **Show the before/after.** Concrete type output (`unknown[]` vs `LocalizedCategory[]`) is more convincing than abstract descriptions.

### Write reviewable PRs

- **Keep PRs small.** Only change the reference resolver and add tests. Don't refactor unrelated code in the same PR.
- **Explain the algorithm.** Include a comment or PR description explaining how `$dynamicRef` resolution differs from `$ref` (dynamic scope vs. static reference lookup). Most reviewers won't know this distinction.
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
- **Validated fixtures in the tracker repo:** `fixtures/recursive-category-tree.yaml` and `fixtures/nested-workspace-resources.yaml`
- **Mixed-support generic fixtures:** `fixtures/generic-schema-binding.yaml` and `fixtures/paginated-response.yaml`
- **Fixture validation methodology and results:** `fixtures/README.md`
- **Compatibility results:** `state-of-the-union.md`
