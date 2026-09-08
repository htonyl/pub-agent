# CD-004: Make document creation retry-safe

Status: verify
Canonical rules: [DOC-002](../../../prd/spec/capabilities/collaborative-documents.md#doc-002), [DOC-005](../../../prd/spec/capabilities/collaborative-documents.md#doc-005)
Dependencies: none

## Observable outcome

A create request's client update ID is a durable idempotency key scoped to the
authenticated principal and request intent. Equivalent retries return the same
document ID and version. The same key used by different principals addresses
independent actor-scoped document IDs; it does not conflict solely because the
key text matches. Reusing a key for a different title/content within one actor
scope returns a deterministic conflict without creating another document.

## Acceptance scenarios

- Given an authorized principal and create key `K`, when the same create is
  submitted twice, then both responses identify one document at version 1.
- Given a transient failure after durable create, when the caller retries with
  the same key and equivalent payload, then the original document is recovered.
- Given key `K` already used for one payload, when a different title or content
  is submitted, then the request fails without creating or mutating a document.
- Given key `K` used by principal `alice`, when principal `bob` submits the same
  key, then Bob receives an independently scoped document identity and cannot
  retrieve or mutate Alice's document through idempotency.
- Existing update idempotency and stable publish response behavior continue to
  pass.

## Planned verification

Add model/store/route and MCP retry tests, including conflict reuse and principal
scoping. Exercise the transaction/recovery path supported by the store.

## Results

Create routing now derives a stable actor/key document ID, and the model returns
the immutable version-1 acknowledgement for equivalent retries while rejecting
changed payloads within one actor scope. The create transaction callback also
executes synchronously under durable-sqlite. Focused tests and the opt-in
runtime scenario cover durable persistence, eviction recovery, and concurrent
equivalent creates; cross-actor route conflict cases and MCP retry parity remain
outstanding.

Evidence: `CI=true pnpm --filter @pubagent/cloudflare-worker test` (25 passed),
`CI=true pnpm --filter @pubagent/cloudflare-worker typecheck` (passed), and
`git diff --check` (passed). The opt-in runtime scenario covers concurrent
equivalent creates and storage preservation across Durable Object eviction.
MCP retry parity remains outside the scenario.
