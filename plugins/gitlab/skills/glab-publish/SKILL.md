---
name: glab-publish
description: Publish local code changes to GitLab. Use when the user asks to create or switch a branch, stage changes, commit, push, and/or open a GitLab merge request from the current checkout.
---

# Publish Changes to GitLab

## Purpose

Safely turn local working-tree changes into a pushed branch and merge request while preserving unrelated user work.

## Workflow

1. Resolve repository context:
   - repository root;
   - GitLab remote and host;
   - current branch and upstream;
   - default/target branch;
   - working-tree status.
2. Inspect the diff before staging.
3. If currently on the default/protected branch and the user asked to publish a feature/fix, create a focused branch rather than committing directly to the protected branch.
4. Stage only files relevant to the requested work. Do not use broad staging when unrelated local changes are present.
5. Run the repository's relevant formatter, lint, typecheck, and tests when discoverable and practical.
6. Commit with a concise message that reflects the actual change.
7. Push with a normal fast-forward-capable push, typically:

```bash
git push -u <remote> HEAD
```

8. After the branch exists remotely, prefer the GitLab MCP `create_merge_request` capability. If unavailable, use `glab mr create` against the resolved host.
9. Summarize branch, commit SHA, push target, MR URL/IID, and validation results.

## Existing branch changes

If the branch already has an open MR:

- push the new commit to the existing branch;
- do not open a duplicate MR;
- use MCP or `glab mr view` to confirm the existing MR when needed.

## Safety rules

- Never run `git reset --hard`, discard local changes, or overwrite unrelated files without explicit instruction.
- Never force-push by default. If the user explicitly asks for a history rewrite, confirm the exact branch and use `--force-with-lease`, not plain `--force`, unless there is a specific reason otherwise.
- Do not push secrets or generated credential files.
- Respect protected branches and required pipeline/review policies.
- Do not merge the MR merely because publishing succeeded unless the user also asked to merge.

## MR content

Use an English title/body by default unless the user asks for another language. Include:

- summary of changes;
- validation/tests;
- relevant issue link or closing reference when known;
- risks, migrations, or follow-up work when applicable.
