# CD-003: Bind mutation attribution to the authenticated principal

Status: verify
Canonical rules: [DOC-006](../../../prd/spec/capabilities/collaborative-documents.md#doc-006), [DOC-011](../../../prd/spec/capabilities/collaborative-documents.md#doc-011)
Dependencies: [CD-001](01-finalized-write-protection.md)

## Observable outcome

Every persisted mutation and acknowledged block operation records the
authenticated principal as actor. A client-provided `actorId` cannot impersonate
another actor. WebSocket messages use the principal associated with the
authorized room session.

## Acceptance scenarios

- Given a valid token for `alice`, when a replacement or Yjs request includes
  `actorId: bob`, then persisted provenance records `alice` and the conflicting
  field is rejected or ignored according to the versioned request contract.
- Given a valid token for `alice`, when an HTTP/MCP block operation includes
  `actorId: bob`, then the acknowledged and persisted operation is attributed to
  `alice`.
- Given a WebSocket room joined by `alice`, when a message claims `bob`, then it
  is not broadcast as a `bob` mutation.
- Given an invalid or missing credential, then no mutation is attributed to a
  fallback or client-supplied actor.
- Existing actor attribution for valid requests remains visible in versions and
  responses.

## Planned verification

Add HTTP, MCP, Durable Object, and WebSocket seam tests for forged actor fields,
missing principals, and valid attribution. Confirm audit-friendly conflict or
normalization behavior is documented.

## Results

HTTP and MCP block operations now overwrite client actor fields with the
authenticated principal before model application. Unsupported WebSocket
application messages now close with policy code `1008` instead of being echoed
or broadcast; the room still accepts an authorized upgrade and sends `ready`.
Focused route/model and WebSocket seam checks pass; replacement/Yjs provenance
and authenticated WebSocket session tests remain to be proved in Durable
Object integration.

Evidence: `CI=true pnpm --filter @pubagent/cloudflare-worker test` (25 passed),
`CI=true pnpm --filter @pubagent/cloudflare-worker typecheck` (passed), and
`git diff --check` (passed). The opt-in runtime scenario proves bearer
attribution on a real block operation; authenticated WebSocket session
identity remains outside the scenario.
