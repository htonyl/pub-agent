---
name: feature-workflow
description: Guide a repository feature or behavior change from intent through critique, product specification, local tickets, implementation, and verified completion. Agents maintain the artifacts. Use to start, resume, or finish feature work; not for unrelated documentation edits or general questions.
---

# Feature workflow

Read the root `AGENTS.md`, [spec rules](../../../docs/prd/spec/README.md), and
[work record format](../../../docs/work/README.md). Read only relevant capability
branches and technical references. Paths in this skill are relative to this file.

Agents own specs and tickets. Developers provide intent and product decisions;
do not ask them to write artifacts, approve routine ticket decomposition, or
reconfirm decisions already made. Existing authorization determines how far to
proceed: a planning request ends with a reviewable plan; an implementation request
continues through verification. This workflow does not authorize commits,
external issues, publication, or deployment.

## Start or resume

Inspect status, relevant code, docs, and existing work records. Reuse the matching
record; locate the earliest phase lacking evidence. State the current phase and
next action briefly. Update the record after meaningful decisions and before
handoff, including any blocker. Revisit earlier phases only for changed assumptions.

For a small, well-defined fix, use one compact record with an inline ticket and
combine phases. Perform a short critique without an interview when intent is
already clear. Do not create product spec changes for behavior-preserving edits.

## Phases and exit evidence

| Phase | Agent work | Ready to advance when |
| --- | --- | --- |
| Frame | Establish outcome, affected capabilities, present behavior, scope, and non-goals. Separate facts from assumptions. | The affected behavior and source intent are identifiable. |
| Critique | Challenge intent and design using the protocol below; resolve material ambiguity and record answers. | No unresolved decision blocks the next work. |
| Specify | Draft precise behavior, examples, permissions, failures, limits, and negative requirements. Promote settled rules into canonical specs with implementation gaps marked. | Decisions map to rules and acceptance scenarios without losing constraints. |
| Slice | Create local tickets, verification criteria, and real dependency links. Prefer independently verifiable outcomes. | Work is executable and every changed rule is covered. |
| Implement | Follow ready tickets, inspect subtree instructions and relevant check commands, change code and focused tests, update evidence. | Ticket behavior is implemented and ready for review. |
| Verify | Critique the result against intent, canonical rules, regression risks, and actual test outcomes; inspect final diff and documentation. | Acceptance criteria pass, material findings are resolved, and specs reflect verified behavior or explicit remaining gaps. |
| Complete | Close verified tickets and summarize delivered behavior, validation, and any remaining scope. | All in-scope tickets are verified, no material blockers remain, and the record is resumable as history. |

If a later finding changes intent, return to critique/specify for that decision.
If it is an implementation defect, fix and reverify the affected behavior. Do not
mark work complete while an in-scope acceptance criterion remains unverified.

## Critique protocol

This workflow adapts Matt Pocock's
[grill-with-docs guide](https://github.com/mattpocock/skills/blob/main/docs/engineering/grill-with-docs.md)
and the local [grill-me](../mattpocock/grill-me/SKILL.md) /
[grilling](../mattpocock/grilling/SKILL.md) approach. The local
[grill-with-docs wrapper](../mattpocock/grill-with-docs/SKILL.md) delegates to a
`domain-modeling` skill that is not installed here. Use this explicit protocol;
do not invoke that incomplete wrapper or claim its dependencies ran.

- Before specification, challenge the user's outcome, vocabulary, boundaries,
  permissions, edge cases, and tradeoffs that affect this change. Read the repo
  to answer factual questions. Ask only decisions that need the developer.
- Work through dependent decisions in rounds: ask the currently answerable
  questions with a recommendation and rationale, then wait for answers before
  asking dependent questions. Keep rounds focused on consequential uncertainty.
  Resolved intent and routine reversible choices do not require another approval.
- Before implementation, critique the spec and tickets for omissions,
  contradictions, weakened constraints, untestable acceptance criteria, and
  unnecessary work. Agents fix mechanical omissions themselves; reopen only
  decisions with material product consequences.
- Before completion, compare the delivered behavior and verification evidence to
  the original outcome and resolved answers. Challenge apparent completion when
  negative requirements or failure paths lack coverage.
- Persist each settled term in the product glossary and each behavioral decision
  in the work record, then link it to its canonical rule and ticket. Preserve
  exact numeric limits, ordering, defaults, and exclusions.
- Record a technical decision under the existing `docs/tech/decisions` convention
  when rationale warrants durable explanation. Link it rather than duplicating
  it. Do not create competing `CONTEXT.md` or `docs/adr` structures.
- Check the files after each critique: a good conversation is not evidence that
  its decisions reached the artifacts. Never leave resolved behavior only in chat.

The standalone interview skills can be read for deeper interviewing guidance
when requested; this repository adaptation owns artifact paths and phase exits.
Do not automatically chain `to-spec`, `to-tickets`, or `implement`: their defaults
include tracker publication, additional approval, or commits outside this flow.

## Developer interaction

Support requests such as “start this feature,” “critique the approach,” “turn
these decisions into a spec,” “resume this change,” and “verify completion.”
Report the phase, key finding, and next action. Present concrete product choices
when needed; handle document structure and ticket bookkeeping autonomously.
