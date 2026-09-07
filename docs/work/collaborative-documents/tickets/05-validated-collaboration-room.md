# CD-005: Replace room/echo with validated durable collaboration

Status: blocked
Canonical rules: [DOC-011](../../../prd/spec/capabilities/collaborative-documents.md#doc-011), [DOC-013](../../../prd/spec/capabilities/collaborative-documents.md#doc-013)
Dependencies: [CD-001](01-finalized-write-protection.md), [CD-003](03-authenticated-actor-attribution.md), [CD-004](04-create-retry-idempotency.md)

## Observable outcome

The document room authenticates joins, validates operation envelopes, commits
operations durably before broadcasting acknowledgements, supports replay/resync
from `lastServerSeq`, and fails closed after revocation. Slow clients cannot
delay document commits.

## Acceptance scenarios

- A join receives an authorized snapshot/tail or retained tail, not arbitrary
  room content.
- A valid operation is persisted before acknowledged broadcast; an invalid,
  stale, causally incomplete, or finalized mutation is neither persisted nor
  broadcast.
- Duplicate operation IDs replay the original acknowledgement; reconnect from a
  retained sequence does not duplicate visible operations.
- A compacted or unavailable sequence causes snapshot-plus-tail resync.
- Revoked access prevents new joins and mutation messages within the agreed
  revocation target.

## Planned verification

Add Durable Object room tests for authorization, replay, resync, commit ordering,
backpressure, revocation, duplicate operations, and restart recovery.

## Results

Blocked until the four safety tickets are verified.
