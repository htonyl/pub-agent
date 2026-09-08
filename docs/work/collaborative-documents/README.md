# Collaborative documents work record

## Outcome

Document the collaborative document capability from product intent through
implementation evidence, then make the server-side safety invariants the first
executable work. Product expansion may proceed only after finalized-write
protection, exact approval targeting, authenticated actor attribution, and
create retry idempotency are implemented and verified.

## Scope

- Promote the collaborative document behavior into the living product spec.
- Compare the PRD, technical plan and decisions, Worker implementation/tests,
  and web application mock.
- Define stable rules, implementation status, acceptance scenarios, and local
  dependency-ordered tickets.
- Implement and verify the four safety slices before expanding collaboration,
  hierarchy, comments, review links, or the full MCP surface.

## Non-goals

This record does not authorize commits, external issue publication, deployment,
identity-provider selection, workspace access-object design, native mobile
clients, search, offline editing, or a complete PRD migration.

## Source request

The developer requested: use the feature workflow to document the collaborative
document capability, compare the PRD, technical plan, Worker, web app, and
tests, create the living capability spec and local tickets, and prioritize
server-side safety fixes before product expansion. The request also explicitly
requires coordination within this session. The parent agent is coordinating
implementation; this record is maintained by agents.

## Current phase and state

- **Current phase:** verify
- **State:** active
- **Frame:** complete
- **Critique:** complete for the available repository evidence
- **Specify:** complete for the rules and explicit safety requirements
- **Implement:** present for the current CD-001 through CD-004 code scope
- **Verify:** passed for focused evidence and the opt-in real Worker/Durable Object/SQLite scenario; authenticated WebSocket and MCP retry gaps remain
- **Complete:** not ready

The earliest remaining evidence gaps are authenticated WebSocket session
coverage and MCP create-retry parity. A fresh agent should start by reviewing
those CD-003 and CD-004 acceptance scenarios, then continue in dependency
order. Do not restart discovery unless verification reveals a new product
decision or contradicts a settled rule.

## Findings from comparison

### Product intent

The PRD describes a durable, permission-aware text document with automatic
versioning, collaborative human/agent editing, comments, review, hierarchy,
stable machine-readable retrieval, provenance, and finalized-document
protection. Its MVP success targets and identity/access details remain draft or
TBD where the PRD says they require confirmation.

### Technical intent

TD-006 makes typed ordered blocks, stable block IDs, provenance, tombstones,
bounded chunks, deterministic operation ordering, immutable versions, exact
approval targets, and finalized protection part of the foundation. TD-007 makes
the Document Durable Object the document coordinator and requires authorized,
replayable WebSocket rooms, policy checks at mutation boundaries, and durable
idempotency. The technical plan explicitly stages contracts, durable access,
collaboration, review, MCP, and capacity work.

### Implemented Worker evidence

The Worker provides a versioned text model/store, transactional update replay,
immutable version reads, a pure block CRDT, a bounded Yjs text adapter, HMAC
bearer policy, HTTP routes, and a minimal MCP-shaped adapter. The current safety
slice adds finalized-state guards on replacement/Yjs/block writes, exact
version-and-hash approval, principal-bound HTTP/MCP block attribution, and
deterministic create retries. Focused tests cover these model and route seams.
The WebSocket remains an authorized room seam (`ready`), but application
messages now fail closed with a policy close until a validated collaboration
protocol exists. The safety slice has real Worker/Durable Object/SQLite,
restart, and concurrent-create evidence; authenticated WebSocket session and
MCP retry parity evidence remain open.

### Web application evidence

The web app is explicitly a dependency-free in-memory mock transport. It
demonstrates intended review affordances—provenance, comments, history,
restore-as-new-version, conflict/resync states, and exact-version approval—but
does not prove backend persistence, policy enforcement, review-link validation,
or collaboration. The mock must remain a boundary in the capability spec until
an adapter connects it to the Worker.

## Critique record

The critique follows the repository's explicit adaptation of Matt Pocock's
[grill-with-docs guide](https://github.com/mattpocock/skills/blob/main/docs/engineering/grill-with-docs.md)
and the feature-workflow protocol. It challenged outcome, vocabulary,
boundaries, authority, failure paths, and implementation evidence before
specification; the repository answered factual questions. The consequential
decisions below were explicit in the developer request or accepted technical
decisions, so no developer interview is blocking this slice.

The critique found these non-negotiable negative requirements:

- Finalized agent writes must fail closed on every mutation surface.
- Approval must not finalize whichever head happens to be current; it must
  compare both expected version and content hash atomically.
- A client-supplied actor field cannot override the authenticated principal.
- Retries of create must not produce duplicate documents.
- The current WebSocket must be described honestly as room/echo plumbing until
  validation, durable commit, replay, resync, and revocation exist.

Before implementation, the parent agent should re-run the critique against the
concrete spec/ticket diff for omitted failure cases and untestable criteria.
Before completion, compare each delivered rule, including negative requirements,
with actual tests and update implementation statuses on disk.

## Assumptions and open decisions

| Item | Treatment |
| --- | --- |
| The current HMAC bearer token is a prototype authorization seam. | Record its evidence; do not promote it to the final workspace identity model. |
| The persisted replacement text model and block CRDT both exist during the foundation. | Treat typed blocks as the accepted canonical technical direction while recording integration as partial; do not silently claim one is fully authoritative in code. |
| A future finalized override may exist. | Keep it explicit, human-approved, scoped, and expiring as required by the source decisions; its exact capability schema remains open. |
| Product decisions about identity provider, workspace hierarchy, review-link audience/expiry, and comments API are unresolved. | Keep those behaviors draft or blocked; ask the developer only when implementation requires a consequential choice. |

## Resolved decisions

| Decision | Constraint | Canonical rule | Ticket |
| --- | --- | --- | --- |
| Finalized protection | Agent writes fail closed by default across replacement, Yjs, and block mutation paths. | [DOC-007](../../prd/spec/capabilities/collaborative-documents.md#doc-007) | [CD-001](tickets/01-finalized-write-protection.md) |
| Exact approval | Approval compares expected version and content hash atomically with the current head. | [DOC-008](../../prd/spec/capabilities/collaborative-documents.md#doc-008) | [CD-002](tickets/02-exact-approval-target.md) |
| Actor authority | Authenticated principal is the actor source at every mutation boundary. | [DOC-006](../../prd/spec/capabilities/collaborative-documents.md#doc-006) | [CD-003](tickets/03-authenticated-actor-attribution.md) |
| Create retries | Equivalent retries with one client idempotency key return the original document result. | [DOC-005](../../prd/spec/capabilities/collaborative-documents.md#doc-005) | [CD-004](tickets/04-create-retry-idempotency.md) |
| Collaboration seam | WebSocket is room/echo plumbing until validated durable collaboration exists. | [DOC-013](../../prd/spec/capabilities/collaborative-documents.md#doc-013) | [CD-005](tickets/05-validated-collaboration-room.md) |

## Tickets and dependency order

| ID | Ticket | Status | Dependencies |
| --- | --- | --- | --- |
| [CD-001](tickets/01-finalized-write-protection.md) | Enforce finalized write protection on all mutation paths | verify | none |
| [CD-002](tickets/02-exact-approval-target.md) | Atomically approve an expected version and content hash | verify | CD-001 |
| [CD-003](tickets/03-authenticated-actor-attribution.md) | Bind mutation attribution to the authenticated principal | verify | CD-001 |
| [CD-004](tickets/04-create-retry-idempotency.md) | Make document creation retry-safe | verify | none |
| [CD-005](tickets/05-validated-collaboration-room.md) | Replace room/echo with validated durable collaboration | blocked | CD-001, CD-003, CD-004 |
| [CD-006](tickets/06-canonical-block-version-integration.md) | Integrate block/Yjs state with versioned document heads | blocked | CD-001, CD-002, CD-003, CD-004 |
| [CD-007](tickets/07-human-review-backend.md) | Connect comments, restore, and review links to the backend | blocked | CD-001, CD-002, CD-003, CD-004, CD-006 |
| [CD-008](tickets/08-hierarchy-and-mcp-expansion.md) | Add hierarchy, child navigation, and the broader MCP surface | blocked | CD-001, CD-002, CD-003, CD-004, CD-006 |

`CD-001` through `CD-004` are the safety gate. Their implementation and
focused evidence are present, including synchronous transaction callback
coverage and the fail-closed WebSocket seam. A test-only Wrangler harness now
exercises the HTTP routes, Durable Object, SQLite migrations, retry race,
approval compare-and-set, actor attribution, finalized replacement/Yjs/block
guards, and storage-preserving eviction/restart path in one runtime scenario.
The harness is opt-in because it needs loopback binding. It passed in a
loopback-enabled run; the default restricted invocation still reports `EPERM`
for that binding. Keep the four tickets in `verify` until their remaining
authenticated WebSocket and MCP retry gaps are closed or explicitly accepted.
Product expansion tickets stay blocked until that verification gate is
resolved. A ticket is not done because code exists; its acceptance scenarios
must pass and be recorded here and in the ticket.

## Verification plan

Run focused Worker tests after each safety slice, then the full Worker test and
typecheck commands from `packages/cloudflare-worker/package.json`. Add tests for
each negative requirement:

- replacement, Yjs, and block writes against finalized documents return a
  conflict/forbidden result and leave head, versions, snapshots, and broadcasts
  unchanged;
- approval with stale version or wrong hash fails atomically, while the exact
  pair finalizes the intended head;
- forged actor fields are rejected or normalized to the authenticated principal
  in HTTP, MCP, and WebSocket mutation paths;
- equivalent create retries return one stable document/version, while
  conflicting reuse of the key fails without a second document;
- existing stale-version, duplicate-update, CRDT, Yjs, authorization, and
  route tests continue to pass.

The web app check remains useful for its mock interaction markers but cannot
serve as backend evidence. Update each `DOC-*` implementation status only after
tests and code review establish the stated behavior. Record skipped checks and
remaining deployment/identity limitations explicitly.

## Verification results

- `CI=true pnpm --filter @pubagent/cloudflare-worker test` — 25 tests passed,
  1 optional Wrangler integration test skipped by default, including
  synchronous transaction callback and fail-closed WebSocket seam tests.
- `CI=true pnpm --filter @pubagent/cloudflare-worker typecheck` — passed.
- `CI=true pnpm --filter @pubagent/web-app check` — passed.
- `CI=true pnpm design:check` — 8 design artifacts verified.
- `git diff --check` — passed.
- `PUBAGENT_RUN_WRANGLER_INTEGRATION=1 ./node_modules/.bin/vitest run
  tests/document-worker-integration.test.ts --reporter verbose` — passed
  with the real Worker, Durable Object, SQLite migrations, retry race,
  approval, attribution, finalized-write, and eviction/restart scenario.
- `PUBAGENT_RUN_WRANGLER_INTEGRATION=1 ./node_modules/.bin/vitest run
  tests/document-worker-integration.test.ts` — skipped by the preflight probe:
  `listen EPERM: operation not permitted 127.0.0.1`.

These checks establish focused model/route, type, web smoke, design, and local
Worker/Durable Object/SQLite evidence. They do not establish deployed behavior,
authenticated WebSocket protocol coverage, MCP retry parity, or unified block
and Yjs version semantics. The default restricted invocation still skips the
Wrangler scenario because the environment denies loopback binding.

## Verification critique

The safety code is present at the intended server boundaries, and the new
integration test passes the runtime scenarios needed to close the SQL and
Durable Object gap: finalized replacement, Yjs, and block rejection through
the real routes and Durable Object, exact approval version/hash failures and
success, bearer actor attribution, concurrent create retries, and
storage-preserving object eviction/restart. CD-003's authenticated WebSocket
session identity and CD-004's MCP retry parity remain outside this HTTP/runtime
scenario.

The block CRDT and Yjs snapshot are still separate from the persisted text head,
so approval currently protects the versioned text path rather than a unified
block manifest. Update-key payload equivalence for ordinary replacement
updates is also still a partial rule. These are recorded as follow-up work and
must not be described as verified product behavior.

## Next action

Close or explicitly accept the remaining CD-001 through CD-004 evidence gaps,
especially authenticated WebSocket session tests and MCP retry parity. Then
unblock [CD-005](tickets/05-validated-collaboration-room.md) and
[CD-006](tickets/06-canonical-block-version-integration.md) before expanding
review, hierarchy, or the broader MCP surface.
