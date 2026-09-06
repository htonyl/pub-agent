# Agent-maintained work records

Agents create and maintain local records here for features and behavior changes.
Developers describe outcomes and resolve consequential ambiguity; agents handle
spec writing, slicing, dependencies, status, and verification evidence.

Use `<change-slug>/README.md` for one change. Keep a small change's ticket inline.
For multiple independently verifiable slices, use
`<change-slug>/tickets/01-<slice>.md` and link them from the change record.
Do not create empty ticket files for every phase. No external tracker is required;
publishing to one requires explicit authorization.

## Change record fields

- Outcome, scope, non-goals, and source request.
- Current phase: frame, critique, specify, slice, implement, verify, or complete.
- State: active, blocked, or complete. A blocked record names the dependency and
  the next action that can unblock it.
- Relevant canonical spec and technical contract links.
- Proposed behavior and open decisions, clearly separated from agreed behavior.
- Resolved decisions with precise constraints, source, and destination rule ID.
- Tickets and their dependencies, or one inline ticket.
- Verification results and remaining implementation gaps.
- Next action, sufficient for a fresh agent to resume without conversation history.

## Ticket fields

- ID/title and observable outcome.
- Status: ready, in-progress, blocked, or done; real blockers by ticket link.
- Canonical rule IDs, or local proposed rule IDs until promoted.
- Acceptance scenarios and planned verification.
- Results: checks actually run, outcomes, and relevant evidence links.

Use vertical slices that can be independently demonstrated where practical.
Keep dependencies acyclic. Mechanical cross-cutting changes may need an explicit
expand/migrate/contract sequence instead.

A ticket is done only when its acceptance criteria are verified. Record skipped
checks and their implications; they do not become passing evidence. A completed
implementation with outstanding verification remains in verify, with its blocker
documented. Completion does not imply a commit, merge, release, or deployment.

Keep completed work records for traceability. Their historical proposals and
decisions never override the [living spec](../prd/spec/README.md).
