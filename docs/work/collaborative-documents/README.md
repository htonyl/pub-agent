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
- **Verify:** passed for this safety slice; broader integration and Durable Object/SQL gaps remain
- **Complete:** not ready

The earliest remaining evidence gap is broader integration verification. A fresh
agent should start by reviewing the CD-001 through CD-004 evidence gaps and
their acceptance scenarios, then continue in dependency order. Do not restart
discovery unless verification reveals a new product decision or contradicts a
settled rule.

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
protocol exists. The safety slice still lacks real Durable Object/SQL,
restart/concurrency, and authenticated WebSocket session evidence.

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
coverage and the fail-closed WebSocket seam, but they remain in `verify` until
the documented SQL, Durable Object, restart, concurrency, and authenticated
WebSocket session gaps are closed or explicitly accepted. Product expansion
tickets stay blocked until that verification gate is resolved. A ticket is not
done because code exists; its acceptance scenarios must pass and be recorded
here and in the ticket.

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

- `CI=true pnpm --filter @pubagent/cloudflare-worker test` — 24 tests passed,
  including synchronous transaction callback and fail-closed WebSocket seam
  tests.
- `CI=true pnpm --filter @pubagent/cloudflare-worker typecheck` — passed.
- `CI=true pnpm --filter @pubagent/web-app check` — passed.
- `CI=true pnpm design:check` — 8 design artifacts verified.
- `git diff --check` — passed.
- Wrangler local Durable Object smoke test — skipped: the restricted
  environment denied loopback binding with `EPERM`.

These checks establish focused model/route, type, web smoke, and design
evidence. They do not establish deployed behavior or complete SQL, Durable
Object restart/concurrency, or authenticated WebSocket protocol coverage. The
Wrangler local smoke test could not run because the environment denied binding
to loopback.

## Verification critique

The safety code is present at the intended server boundaries, but the evidence
does not yet cover every acceptance scenario. CD-001 has lifecycle checks in
the model, store, and Durable Object; direct Durable Object tests for finalized
replacement, Yjs, and block rejection are still absent. CD-002 uses a
transactional version/hash comparison, and the store transaction callbacks are
now synchronous as required by durable-sqlite, but there is no real SQL or
concurrent approval test. CD-003 proves the HTTP block envelope passes the
bearer subject to the coordinator and that the current WebSocket seam closes
unsupported application messages; replacement/Yjs persistence and WebSocket
session identity remain untested. CD-004 covers deterministic routing behavior
in the model, the original immutable version-1 retry result, and synchronous
create transaction execution; restart recovery, concurrent retries, and MCP
parity remain untested.

The block CRDT and Yjs snapshot are still separate from the persisted text head,
so approval currently protects the versioned text path rather than a unified
block manifest. Update-key payload equivalence for ordinary replacement
updates is also still a partial rule. These are recorded as follow-up work and
must not be described as verified product behavior.

## Next action

Close or explicitly accept the remaining CD-001 through CD-004 evidence gaps,
especially real SQL/Durable Object finalized-write and approval tests,
restart/concurrent retry coverage, and authenticated WebSocket session tests.
Then
unblock [CD-005](tickets/05-validated-collaboration-room.md) and
[CD-006](tickets/06-canonical-block-version-integration.md) before expanding
review, hierarchy, or the broader MCP surface.
