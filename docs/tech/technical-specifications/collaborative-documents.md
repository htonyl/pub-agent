# Collaborative document implementation plan

This plan turns the existing agent-publishing requirements into a Cloudflare
implementation. It is intentionally staged: the repository currently has a
Worker/Drizzle/SQLite Durable Object scaffold and design-system Storybook, but
not a separate product web application.

## Current foundation in this branch

- `DocumentCrdt` is a Cloudflare-independent block operation module with stable
  IDs, deterministic ordering, tombstones, UTF-8-safe text chunks, server
  sequences, duplicate replay, and causal-gap detection.
- `DocumentDurableObject` owns the SQLite-backed document store and its
  document-scoped WebSocket room.
- Versioned HTTP and MCP-shaped routes publish, read, update, approve, and
  create a stable review permalink.
- The HTML reader escapes content server-side and renders a minimal human
  document view.
- Existing counter routes and bindings remain intact.

The current HTTP persistence adapter still stores a text payload for the
smallest vertical slice. The next integration step is to persist the block
snapshot and operation tail through the same `DocumentCrdt` interface; the
canonical block contract and tests are already established so this migration
does not change the MCP or web protocol.

## Delivery plan

### 1. Contracts and limits

Define versioned JSON schemas for blocks, operations, snapshots, uploads,
versions, comments, capabilities, and errors. Add validation at HTTP/MCP and
WebSocket trust boundaries. Start with explicit size/rate limits and measure
them against representative multi-megabyte agent edits.

### 2. Durable state and access

Keep a Document Durable Object per document. Add a workspace access object for
membership, capability grants, resource inheritance, policy epochs, expiry, and
revocation. Controllers ask the access seam for an authorization decision;
document objects recheck state transitions and finalized-document protection.

### 3. Large agent updates

Add staged upload sessions with chunk hashes, actor binding, expiry, quotas, and
an atomic commit operation. Store immutable block revisions and a version
manifest. Garbage-collect only unreferenced staged chunks.

### 4. Collaboration

Persist the current CRDT snapshot and a replayable operation tail. On a room
join, authorize and send snapshot-plus-tail or the retained tail from
`lastServerSeq`. Broadcast after durable commit. Add reconnect, resync,
backpressure, presence, and revocation tests.

### 5. Human review workflow

Build the web reader/editor around bounded block reads. Show provenance,
pending/saved/conflict states, comments, version history, restore-as-new-version,
review, exact-version approval, and finalized protection. Use design tokens and
semantic HTML; native mobile apps are not part of this work.

### 6. MCP adapter

Expose publish, update, read, list-children, comments, review, approval, and
access tools through a versioned MCP adapter over the shared domain module.
Responses include canonical URLs, stable IDs, version/sequence, capabilities,
provenance, pagination, and retryable versus non-retryable errors.

### 7. Capacity and resilience

Measure document hotness, replay-tail size, memory, SQLite usage, WebSocket
fan-out, and staged upload pressure. Only then introduce block-shard fan-out.
Use immutable shard data plus a Document Durable Object manifest; do not attempt
cross-Durable-Object rollback transactions.

## Test matrix

- Unit: operation convergence, deterministic ordering, tombstones, chunking,
  duplicate delivery, causal gaps, and immutable snapshots.
- Model: version creation, restore, approval head checks, lifecycle policy, and
  idempotency.
- Worker: capability denial, stable permalink responses, HTML escaping, route
  status codes, WebSocket upgrade, and MCP parity.
- Durable Object: migration initialization, snapshot/replay, restart recovery,
  and atomic visibility of large commits.
- Security: cross-workspace scope, finalized-agent rejection, revocation,
  unauthorized history/preview access, and unsafe HTML.
- Load: representative huge batches, slow-room clients, replay recovery, and
  hot-document mutation limits.

## Non-goals for this session

Native iOS/Android UI, full Notion parity, arbitrary executable HTML, offline
first editing, identity federation, semantic search, and production deployment
are deferred.
