# CD-002: Atomically approve an expected version and content hash

Status: verify
Canonical rules: [DOC-008](../../../prd/spec/capabilities/collaborative-documents.md#doc-008), [DOC-009](../../../prd/spec/capabilities/collaborative-documents.md#doc-009)
Dependencies: [CD-001](01-finalized-write-protection.md)

## Observable outcome

Approval accepts an expected version and expected content hash. The document
coordinator compares both values with the current head and finalizes only when
both match in one serialized/atomic operation.

## Acceptance scenarios

- Given head version `N` and hash `H`, when a reviewer approves `(N, H),` then
  exactly that head becomes finalized.
- Given head version `N+1`, when a reviewer submits `(N, H),` then approval
  returns a conflict and does not finalize either version.
- Given head version `N` with hash `H2`, when a reviewer submits `(N, H),` then
  approval returns a conflict and leaves the status and head unchanged.
- Given concurrent approval and update attempts, then the serialized result is
  either an approval of the exact pair before a permitted new version or a
  rejected stale approval; it never approves an unseen head.
- Given a finalized document, when approval is retried for its already-finalized
  exact pair, then the response is explicit and no new version is created.

## Planned verification

Add model/store/ Durable Object tests for version and hash compare-and-set,
including a transaction or concurrency-shaped test. Update HTTP and MCP request
validation and assert conflict responses.

## Results

Implemented with expected version and content hash compare-and-set in the store
and model/route validation. The approval transaction callback now uses the
synchronous durable-sqlite contract. Focused tests pass; real SQL transaction,
concurrency, and Durable Object evidence remains outstanding.

Evidence: `CI=true pnpm --filter @pubagent/cloudflare-worker test` (24 passed),
`CI=true pnpm --filter @pubagent/cloudflare-worker typecheck` (passed), and
`git diff --check` (passed). Wrangler local Durable Object smoke testing was
skipped because the restricted environment denied loopback binding.
