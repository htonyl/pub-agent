# CD-007: Connect comments, restore, and review links to the backend

Status: blocked
Canonical rules: [DOC-014](../../../prd/spec/capabilities/collaborative-documents.md#doc-014), [DOC-015](../../../prd/spec/capabilities/collaborative-documents.md#doc-015), [DOC-016](../../../prd/spec/capabilities/collaborative-documents.md#doc-016)
Dependencies: [CD-001](01-finalized-write-protection.md), [CD-002](02-exact-approval-target.md), [CD-003](03-authenticated-actor-attribution.md), [CD-004](04-create-retry-idempotency.md), [CD-006](06-canonical-block-version-integration.md)

## Observable outcome

The human review experience uses the Worker for immutable version reads,
exact-version approval, comments anchored to blocks/ranges, replies,
resolution/reopen, restore-as-new-version, and validated review links. Mock-only
behavior is replaced by an authenticated adapter.

## Acceptance scenarios

- Reviewers see the exact immutable version and hash they are approving.
- A stale approval or restore creates no accidental finalization or overwrite.
- Comments preserve anchor, actor, timestamp, history, and authorization.
- A review token is scoped, validated, and cannot reveal private content after
  expiry or revocation.
- Restoring a prior version creates a new version while retaining history.

## Planned verification

Add route, policy, persistence, HTML/rendering, and web adapter integration tests;
run the web app check against the real adapter.

## Results

Blocked until safety and canonical state integration are verified.
