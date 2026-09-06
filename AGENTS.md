# Agent instructions

These instructions apply to the entire repository. More-specific `AGENTS.md`
files may add constraints for their subtree, but must not weaken these rules.

## Communication

- Use a concise, direct tone by default.
- Provide elaboration, background, or step-by-step explanation only when
  requested or needed to resolve ambiguity, risk, or a non-obvious result.
- Omit routine details, common-sense explanations, and normally implicit
  steps unless they affect the outcome.

## Before changing files

- For product features and behavior changes, use the repository's
  [feature-workflow skill](.agents/skills/feature-workflow/SKILL.md). Start at
  the phase supported by existing evidence; do not restart settled discovery.
- Agents maintain specs, local tickets, decision records, and completion
  evidence. Ask developers for unresolved product decisions, not document
  authoring or routine ticket approval. Follow the
  [spec maintenance rules](docs/prd/spec/README.md).

- Read the relevant files and inspect the repository status first.
- State or record reasonable assumptions when requirements are ambiguous.
- Keep the change narrowly scoped to the requested outcome; do not perform
  unrelated cleanup, rewrites, or formatting changes.
- Treat existing uncommitted changes as user-owned. Do not discard, reset, or
  overwrite them without explicit permission.

## Implementation rules

- Prefer the simplest implementation that satisfies the request.
- Preserve existing interfaces, conventions, and compatibility unless a
  breaking change is explicitly requested.
- Do not add dependencies, generated files, configuration, or abstractions
  unless they are needed for the task.
- Never commit secrets, credentials, private keys, tokens, local environment
  files, or sensitive data. Use documented placeholders and environment
  variables instead.
- Validate inputs at trust boundaries and avoid introducing shell, SQL, path,
  or template injection risks.
- Do not silently weaken authentication, authorization, validation, logging,
  or safety checks to make a test or command pass.

## Validation

- Identify the repository's relevant formatter, linter, type checker, and test
  commands before editing when they exist.
- Add or update focused tests for behavior changes and regression fixes.
- Run the smallest relevant checks after each meaningful change, then run the
  broader available checks when practical.
- Do not claim a check passed unless it was actually run. Report skipped or
  unavailable checks, including the reason.
- Review the final diff for unintended files, debug output, secrets, and
  missing tests or documentation.

## Git and external actions

- Do not use destructive commands such as `git reset --hard`, `git clean`, or
  broad deletion commands without explicit permission and a verified target.
- Do not rewrite history, create commits, push branches, open pull requests,
  or change remote settings unless explicitly requested.
- Do not make network calls, publish artifacts, or modify external services
  unless the task requires it and the user has authorized that action.
- Ask before making a materially broader change than the request implies.

## Completion report

Briefly summarize what changed and validation outcomes. Mention assumptions,
risks, or follow-up work only when relevant.
