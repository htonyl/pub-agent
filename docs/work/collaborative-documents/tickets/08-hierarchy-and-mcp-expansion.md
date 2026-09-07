# CD-008: Add hierarchy, child navigation, and the broader MCP surface

Status: blocked
Canonical rules: [DOC-014](../../../prd/spec/capabilities/collaborative-documents.md#doc-014) and draft PRD hierarchy/access requirements
Dependencies: [CD-001](01-finalized-write-protection.md), [CD-002](02-exact-approval-target.md), [CD-003](03-authenticated-actor-attribution.md), [CD-004](04-create-retry-idempotency.md), [CD-006](06-canonical-block-version-integration.md)

## Observable outcome

Documents can be placed in an authorized ordered hierarchy and discovered by
bounded child/related reads. The MCP adapter exposes the product's documented
publish, update, read, navigation, comments, review, and access boundaries with
stable IDs, provenance, versions, capabilities, and explicit errors.

## Acceptance scenarios

- Authorized callers can create, move, rename, archive, and list children while
  cycles and cross-workspace moves are rejected.
- Unauthorized hierarchy traversal reveals neither protected content nor page
  existence through response details.
- MCP tool calls share the HTTP domain rules, including finalized protection,
  actor attribution, idempotency, bounded reads, and exact approval.
- Publishing does not implicitly grant read, update, comment, move, or access
  management capability.

## Planned verification

Add policy-matrix, hierarchy integrity, bounded pagination, MCP parity, and
cross-workspace isolation tests. Resolve identity and access-model decisions
before promoting draft access rules to agreed status.

## Results

Blocked until safety rules and canonical document state are verified.
