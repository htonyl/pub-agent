# CD-006: Integrate block/Yjs state with versioned document heads

Status: blocked
Canonical rules: [DOC-010](../../../prd/spec/capabilities/collaborative-documents.md#doc-010), [DOC-011](../../../prd/spec/capabilities/collaborative-documents.md#doc-011), [DOC-012](../../../prd/spec/capabilities/collaborative-documents.md#doc-012)
Dependencies: [CD-001](01-finalized-write-protection.md), [CD-002](02-exact-approval-target.md), [CD-003](03-authenticated-actor-attribution.md), [CD-004](04-create-retry-idempotency.md)

## Observable outcome

Typed block state and bounded Yjs text updates participate in the same durable
document head, immutable version history, actor provenance, status checks, and
recovery semantics. The canonical representation and adapter boundaries are
explicit in schemas.

## Acceptance scenarios

- A committed block or Yjs mutation yields one readable version/hash and a
  recoverable snapshot after object restart.
- A stale or causally incomplete update is rejected without partial state.
- Block IDs, tombstones, ordering, anchors, and provenance survive snapshot and
  replay.
- Yjs updates are assembled as complete bounded envelopes and never applied as
  arbitrary fragments.

## Planned verification

Add integration, restart, snapshot/replay, hash, and bounded payload tests across
the model and Durable Object.

## Results

Blocked until safety rules are verified.
