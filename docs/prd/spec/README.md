# Living product spec

This is the maintained reading map for what the product is, from purpose to
precise behavior. Agents own its upkeep; developers supply intent, constraints,
and decisions. This scaffold does not certify existing PRD requirements as
agreed or implemented.

## Reading map

| Need | Read |
| --- | --- |
| Purpose, actors, scope | [Product](product.md) |
| Shared vocabulary | [Glossary](glossary.md) |
| Capabilities and journeys | [Capability map](capabilities/README.md) |
| Detailed shared behavior | [Behavioral contracts](contracts/README.md) |
| Architecture and technical contracts | [Technical documentation](../../tech/README.md) |
| Work in progress and proposed behavior | [Local work records](../../work/README.md) |
| How to carry a change through completion | [Feature workflow](../../../.agents/skills/feature-workflow/SKILL.md) |

## Maintenance rules

- Organize by product capability, not change date, implementation package, or
  ticket. Keep one authoritative home per rule; summaries link to it.
- Start each capability with a short explanation and journey. Add precise rules
  beneath it. Split shared or substantial detail into contracts only as needed.
- Assign stable IDs to rules that tickets or tests reference, such as
  `PUBLISH-001`. Preserve IDs when wording changes; mark retired rules explicitly
  when historical work still references them.
- Distinguish agreement (`draft`, `agreed`, `retired`) from implementation
  (`unverified`, `missing`, `partial`, `verified`). Record exceptions per rule
  when a document's default status does not apply. Verified means checked against
  recorded code/test evidence at a date or revision, not necessarily deployed.
- Keep proposed changes in the work record until the behavior is settled. When
  promoting them, mark implementation gaps explicitly until verification passes.
  Never blend a proposed future behavior into a description of current behavior.
- Code and tests are evidence of implementation, not automatic authority for
  intent. Record conflicts and fix or resolve them; never weaken a requirement
  just to match code. Inferred requirements stay draft until supported by an
  explicit decision or existing agreed source.
- Preserve exact limits, ordering, permission rules, negative requirements, and
  failure behavior from decisions. Record unresolved questions explicitly.
- Update the affected spec in the same work as a behavior change. Internal
  refactors need only technical documentation updates when those contracts change.
- Link schemas and technical decisions in `docs/tech`; do not duplicate them.
  Keep the glossary to definitions and the work record to delivery progress.
- Migrate existing PRD sections only when relevant to a task. Preserve their
  draft/proposed status, cite the source, and replace migrated detail with a link
  so two independently maintained versions do not emerge. Flag disagreements.
- Before finishing, check rule-to-ticket-to-verification coverage, links,
  implementation gaps, and that resolved decisions were actually written to disk.

## Detail to capture

A capability document contains: purpose and actors; boundaries and non-goals;
journey; observable rules with stable IDs; permission and failure examples;
agreement and implementation status; related capabilities/contracts; and
verification links. Add only relevant sections. Use concrete before/after
examples or Given/When/Then when prose alone leaves ambiguity.

No complete product migration is implied by this scaffold. Populate the map
incrementally from reviewed requirements and implementation evidence.
