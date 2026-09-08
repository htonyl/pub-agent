---
name: commit
description: Create logically split Git commits and commit messages using this repository's type(domain) convention. Use when the user asks to prepare or make commits.
---

# Commit workflow

Use this skill to turn the current worktree into focused, reviewable commits.
Do not create commits unless the user explicitly asks for commits; otherwise
prepare the proposed commit plan and messages only.

## 1. Understand context

- Read the relevant conversation, `AGENTS.md`, and repository guidance.
- Inspect `git status`, the diff, staged changes, and recent commit history.
- Treat existing changes as user-owned.
- At the start of the workflow, record the current `HEAD` and the complete
  `git status --short` as the task baseline. A path is task-eligible only when
  the current request clearly caused or explicitly named its change; thematic
  similarity to the request is not evidence of ownership.
- If the current request produced no repository changes, there are no
  task-eligible paths to commit. Do not turn pre-existing worktree changes into
  the subject of the current commit merely because the user invoked `$commit`.

## 2. Partition the changes

- Classify every changed or untracked path as `current task`, `pre-existing`,
  or `ambiguous` relative to the baseline and the request.
- Identify changes unrelated to the conversation and leave them untouched.
- Group relevant changes into independent compartments that can be reviewed or
  reverted separately.
- Keep dependent changes together and avoid splitting a behavior from its
  required tests or documentation.
- Before staging, produce a scope manifest mapping each proposed path to the
  user request and the reason it belongs in that compartment. Do not stage a
  path without a direct mapping.
- Ask before including a change whose relevance is materially ambiguous. If
  the baseline is dirty and the user has not named the pre-existing paths,
  pause with a concise question listing those paths; `$commit` alone is not
  confirmation to include them.

## 3. Choose commit messages

Use this subject format:

```text
type(domain): imperative message
```

Allowed types, in commit order:

```text
agent, ci, build, docs, feat, fix, refactor, style, chore
```

Use `base` for the domain when no more specific domain applies. Use an
established product-domain term or tooling name when one exists. Use terms
already present in the codebase. Write the subject as an imperative action
from the developer's perspective.

Put detailed design choices, trade-offs, and decisions in the commit body.
The body should preserve context that a future maintainer would otherwise have
to rediscover; do not repeat the subject or narrate routine implementation.

## 4. Commit in order

When explicitly authorized to commit:

1. Recheck the baseline and current status. If the worktree changed during
   the workflow, reclassify the affected paths before staging.
2. Stage only the explicitly listed paths for the first logical compartment.
3. Review the staged diff, scope manifest, and commit message. Confirm that no
   pre-existing or ambiguous path is staged.
4. Create the commit.
5. Verify the result, then continue in the required type order above.

Do not use broad staging such as `git add -A` when unrelated changes exist.
Do not rewrite history, amend, push, or alter remotes unless explicitly
requested.

## Completion

Report the commits created or the proposed messages, the paths included, and
validation results. Mention unrelated changes left untouched or any skipped
checks only when relevant.
