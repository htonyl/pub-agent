# Collaborative documents

Agreement: agreed for the MVP foundation where the source is an accepted
technical decision or an explicit safety decision in the active work record;
remaining PRD feature scope is draft until product decisions are confirmed.

Implementation: foundation partial. The Worker has versioned text persistence,
a block CRDT module, a bounded Yjs adapter, signed bearer authorization, and
document-scoped WebSocket plumbing. The current worktree also implements
finalized-write rejection, exact approval preconditions, principal-bound block
attribution, and deterministic create retries. Those safety paths have focused
model, route, storage-transaction, and WebSocket-seam evidence. A test-only
Wrangler harness now covers the real HTTP, Durable Object, SQLite, retry,
approval, attribution, finalized-write, WebSocket authorization and
fail-closed message, and eviction/restart paths, but this environment requires
loopback-enabled execution for that test. The scenario passes when run with
loopback access; a validated WebSocket mutation protocol remains outside its
scope.

## Purpose and actors

Collaborative documents give a publishing agent and human reviewers one durable
text artifact with immutable versions, visible provenance, explicit review, and
machine-readable retrieval. The capability serves publishing agents, human
owners and reviewers, downstream agents, and CI or automation agents using
scoped credentials. Workspace administrators govern access, but the workspace
access object is outside the current foundation.

The product path is:

```text
authorized agent creates or proposes content
        -> document head and immutable version are recorded
        -> humans read, edit, comment, and review
        -> a human approves an exact version and may finalize it
        -> authorized readers retrieve the current or pinned version with provenance
```

## Boundary and non-goals

This capability owns document content, block structure, versions, lifecycle
state, provenance, review targeting, and the document-scoped collaboration
transport. It does not define the workspace hierarchy, durable access-grant
model, comments persistence, search, identity federation, offline editing, or
native mobile clients. Those are related capabilities or deferred scope.

The web application is a human review/editor prototype. Its in-memory
`MockDocumentStore` and sample comments are evidence of intended interaction,
not a backend implementation. It must not be cited as proof that Worker routes,
authorization, persistence, review links, or WebSocket collaboration work.

## Current journey

1. A caller presents a signed bearer credential with a capability and optional
   document scope.
2. The API validates a create, replacement update, block operation, or bounded
   Yjs envelope and routes document state to one Durable Object.
3. The object persists a document head and immutable versions for replacement
   updates. The block CRDT and Yjs snapshots are currently separate foundation
   seams and are not yet one complete canonical persistence path.
4. The HTTP and MCP surfaces expose a small foundation tool set: create, read,
   snapshot, apply-operation, propose, approve, and review-link creation.
5. The web mock presents title/content, provenance, comments, history,
   conflict/resync states, review, restore-as-new-version, and exact-version
   approval as a UI concept.
6. Production collaboration remains deferred: the current WebSocket only
   creates an authorized room connection and emits `ready`; unsupported
   application messages close the session with policy code `1008` until a
   validated protocol exists.

## Observable rules

Implementation status uses `missing`, `partial`, or `verified` against code and
tests in this repository. `verified` means repository evidence exists; it does
not mean deployed or production-ready.

| ID | Rule | Agreement | Implementation |
| --- | --- | --- | --- |
| DOC-001 | A document has a stable ID, title, text content, lifecycle status, monotonically increasing version, content hash, and timestamps. | agreed | partial |
| DOC-002 | A valid create publishes version 1 and records the initial client update ID and actor attribution. Invalid input creates no partial document. | agreed | partial; real persistence and concurrent retry evidence exist, but invalid-input failure atomicity is not fully exercised |
| DOC-003 | A replacement update must identify the current base version. A stale base is rejected and does not create a new version. | agreed | verified for replacement model |
| DOC-004 | A duplicate client update ID returns the original acknowledgement and does not create another version. Reuse with a different payload is a conflict. | agreed | verified for model/store checks and the real HTTP route/Durable Object/SQLite path |
| DOC-005 | A retry of a create with the same idempotency key and equivalent request returns the original document result and does not create a second document. | agreed | partial; HTTP and MCP retries, actor scoping, real SQLite persistence, eviction recovery, conflicting reuse, and durable-write response-failure recovery are evidenced; a production fault-injection scenario remains unmodeled |
| DOC-006 | Every persisted change carries the authenticated principal as actor attribution. Request fields or operation payloads cannot substitute another actor. | agreed | partial; HTTP/MCP block operations are normalized to the principal, while the WebSocket mutation protocol remains absent |
| DOC-007 | Finalized documents are read-only to agents by default. Replacement updates, Yjs text updates, and block mutations are rejected server-side while finalized. A future human-approved override must be explicit, scoped, and expiring. | agreed | partial; finalized replacement, Yjs, and all block guard paths preserve document/version/history state; override semantics remain open |
| DOC-008 | Approval finalizes only the exact immutable version whose expected version number and content hash match the current head in one serialized/atomic operation. A stale or hash-mismatched request has no effect. | agreed | verified for the real SQLite stale/hash/exact and serialized approval/update race cases |
| DOC-009 | A finalized version remains immutable. Any later permitted change creates a new version and makes the previous approval historical. | agreed | partial; finalized writes and unchanged history are verified, while permitted override and block/Yjs version integration are undefined |
| DOC-010 | Canonical document structure is typed, ordered blocks with stable block IDs, provenance, tombstones for deletes, deterministic ordering, and UTF-8-bounded chunks. | agreed | partial; pure `DocumentCrdt` foundation is tested, but persisted document state remains text-first |
| DOC-011 | Block operations are validated before assigning a document-local sequence. Duplicate `opId` replay returns the original acknowledgement; causal gaps require resync. | agreed | partial; HTTP/MCP operations bind the principal, but Durable Object persistence and full document-head integration remain incomplete |
| DOC-012 | Yjs text updates are complete bounded envelopes. The server checks the base state vector and applies the assembled update atomically; arbitrary fragments are not applied. | agreed | partial; adapter validation/tests exist, document lifecycle and durable update binding remain incomplete |
| DOC-013 | A document WebSocket room authorizes joins and broadcasts only acknowledged, validated, durably committed operations with replay/resync and revocation handling. | agreed | missing; current implementation is an authorized `ready` room seam that rejects unsupported application messages |
| DOC-014 | Authorized readers can retrieve a current or immutable version with content, version, hash, timestamps, and provenance without seeing unauthorized content. | agreed | partial; authenticated current/version reads exist, but hierarchy metadata and complete policy model are absent |
| DOC-015 | A review link is a capability-bearing reference to a specific review target and is validated before serving the review view. | draft pending product/access decisions | partial; creation exists, validation/serving route is absent |
| DOC-016 | Human review supports comments anchored to blocks or ranges, replies, resolution/reopen, version history, and restore-as-new-version. | draft in PRD | missing in Worker; web behavior is mock-only |

## Safety gate implemented in the current worktree

The following are the first executable slices in the
[collaborative-documents work record](../../../work/collaborative-documents/README.md):

- Replacement, Yjs, and block mutation paths now check finalized state in the
  model/store/Document Durable Object boundary.
- Approval now requires `expectedVersion` and `expectedContentHash`; the store
  compares both against the current head before changing lifecycle state.
- HTTP and MCP block operations attribute the operation to the authenticated
  principal, ignoring a conflicting client actor field.
- Create routing derives a stable document ID from the authenticated principal
  and client idempotency key, and the model returns the original version-1
  result for an equivalent retry while rejecting a changed payload.

Focused tests cover these behaviors, including synchronous transaction callback
execution and fail-closed WebSocket application messages. The opt-in Wrangler
integration test passes the real route/Durable Object/SQLite scenario,
including MCP retry/conflict behavior, approval/update serialization, and
WebSocket authorization/application rejection, and is available at
`packages/cloudflare-worker/tests/document-worker-integration.test.ts`; run it
with `PUBAGENT_RUN_WRANGLER_INTEGRATION=1` in a network-enabled environment.
Authenticated WebSocket mutation remains outside its scope because the
validated application protocol has not been defined.

Product expansion tickets remain blocked until the remaining integration and
concurrency evidence is closed or explicitly accepted.

## Implemented foundation and gaps

### Implemented or evidenced

- `DocumentModel` validates bounded title/content, hashes content, checks
  replacement base versions, and exposes immutable version reads.
- `DrizzleDocumentStore` persists document heads, versions, and update IDs in
  SQLite-backed Durable Object storage; update replay is transactional.
- `DocumentCrdt` implements typed blocks, deterministic ordering, tombstones,
  UTF-8 chunk validation, duplicate operation replay, and causal-gap detection.
- The Yjs adapter validates complete base64 chunk envelopes, bounded update
  size, state-vector dependencies, and snapshot consistency.
- Signed HMAC bearer tokens enforce expiry, declared capabilities, and optional
  document IDs at the HTTP/MCP boundary. This is a prototype seam, not the
  durable workspace access model.
- HTTP routes and the MCP-shaped adapter cover a small foundation surface, and
  tests cover basic authorization, create response shape, model replay/stale
  version behavior, CRDT convergence, and Yjs envelope validation.
- The focused safety slice has model and route evidence for finalized-write
  rejection, exact approval targeting, principal-bound block attribution, and
  create retry behavior.

### Partial or missing

- Full safety evidence is incomplete: the test-only Wrangler integration
  harness passes real SQL transactions, Durable Object restart, finalized
  replacement/Yjs/all block-operation variants, concurrent retries,
  approval/update serialization, MCP retry/conflict/actor-scoping, and
  WebSocket authorization plus fail-closed application messages when loopback
  access is enabled. Authenticated WebSocket mutation remains untested because
  its protocol is not defined.
- Block and Yjs state are not fully integrated with the persisted document
  version/head model.
- The WebSocket implementation is currently only the authorized room seam
  described above; it has no validated operation envelope, durable commit,
  replay, resync, backpressure, presence, or revocation behavior. Unsupported
  application messages fail closed with policy code `1008`.
- No workspace/site/page hierarchy or child listing exists.
- Comments, replies, resolution/reopen, and restore are absent from the Worker;
  the web mock only demonstrates the intended interaction.
- Review links are created but no token-validation route serves a review view.
- HTML rendering is an escaped plain-text `<pre>` view rather than the planned
  rich text/Markdown/HTML adapter.
- The MCP surface is a minimal adapter, not the PRD's full publish/update/read,
  navigation, comments, and access-management tool set.

## Related sources and verification

| Concern | Source/evidence |
| --- | --- |
| Product intent, actors, stories, and acceptance criteria | [PRD UX and functionality](../../02-user-experience-and-functionality/README.md), [AI requirements](../../03-ai-system-requirements/README.md) |
| Technical delivery sequence and test matrix | [Collaborative documents technical plan](../../../tech/technical-specifications/collaborative-documents.md) |
| Canonical blocks, approval, chunks, and idempotency | [TD-006](../../../tech/decisions/TD-006-collaborative-blocks-and-crdt.md) |
| Durable Object, room, access, and failure boundaries | [TD-007](../../../tech/decisions/TD-007-cloudflare-collaboration-topology.md) |
| Replacement model and persistence | [document model](../../../../packages/cloudflare-worker/src/models/document-model.ts), [document store](../../../../packages/cloudflare-worker/src/database/document-store.ts) |
| Room seam and Yjs/block adapters | [Document Durable Object](../../../../packages/cloudflare-worker/src/durable-objects/document-durable-object.ts), [Yjs adapter](../../../../packages/cloudflare-worker/src/models/yjs-text.ts), [block CRDT](../../../../packages/cloudflare-worker/src/models/document-crdt.ts) |
| Current API/MCP authorization boundaries | [document controller](../../../../packages/cloudflare-worker/src/controllers/document-controller.ts), [MCP controller](../../../../packages/cloudflare-worker/src/controllers/mcp-controller.ts), [policy](../../../../packages/cloudflare-worker/src/policy/document-policy.ts) |
| Current focused tests | [document model tests](../../../../packages/cloudflare-worker/tests/document-model.test.ts), [store transaction test](../../../../packages/cloudflare-worker/tests/document-store.test.ts), [CRDT/Yjs tests](../../../../packages/cloudflare-worker/tests/document-crdt.test.ts), [route tests](../../../../packages/cloudflare-worker/tests/document-routing.test.ts), [WebSocket seam test](../../../../packages/cloudflare-worker/tests/websocket-protocol.test.ts), [opt-in Worker integration test](../../../../packages/cloudflare-worker/tests/document-worker-integration.test.ts) |
| Human UI boundary | [web app README](../../../../packages/web-app/README.md), [mock transport](../../../../packages/web-app/src/main.ts) |

The current worktree checks are `CI=true pnpm --filter
@pubagent/cloudflare-worker test` (28 tests passed and one optional test
skipped), the Worker typecheck, the web-app smoke check, `CI=true pnpm
design:check` (8 artifacts verified), and `git diff --check`. The opt-in
integration test passes with loopback access (the default restricted
invocation skips it with `EPERM`); these checks do not certify deployment or a
validated WebSocket mutation protocol.

The work record maps each rule to a ticket and planned verification. This
capability document should be updated in the same change as behavior changes;
implementation status should move to `verified` only after the recorded checks
actually pass.
