# TD-007: Cloudflare Durable Object topology for collaboration

**Status:** Accepted for the MVP foundation

## Decision

Use Cloudflare Workers/Hono as the composition and protocol layer and SQLite
backed Durable Objects as the state owners:

| Durable Object | Owns |
| --- | --- |
| `WorkspaceAccessDurableObject` | Workspace membership, capability grants, resource scope, and policy epoch |
| `DocumentDurableObject` | Document head, committed sequence, versions, review/approval state, and its WebSocket room |
| Optional future block shard | Immutable block revisions and staged chunks when measured document size or hotness requires it |

Start with one Document Durable Object per document. The object is the only
authority that publishes a new head, so readers never observe a partially
materialized version. Physical block sharding is deferred until capacity tests
show that a document coordinator is the limiting factor.

## WebSocket room

The document object owns the room. A room authenticates and authorizes joins,
replays committed updates from a client-provided `lastServerSeq`, broadcasts
only acknowledged operations, and coalesces or drops presence before it allows
a slow client to delay document commits. Reconnect either receives the retained
operation tail or a snapshot plus tail when compaction has passed the requested
sequence. Pending client operations retain their IDs for safe retry.

The room is not an authorization cache. Policy is checked at join and mutation
boundaries, and a short-lived policy epoch/lease is revalidated after access is
revoked. Read-only participants never receive mutation authority merely by
being connected.

## Access control

Capabilities are independent by action, resource, lifecycle state, audience,
inheritance, and expiry. Publishing does not imply read, update, comment, move,
or share. The request adapter is deny-by-default; the access Durable Object is
the intended source of durable grants and revocation state. Client-declared
headers are only a local composition seam and must be replaced by authenticated
edge context before deployment.

## API surfaces

MCP and the human web client use the same versioned document domain interface:

```text
POST /api/v1/documents
GET  /api/v1/documents/:id
POST /api/v1/documents/:id/updates
GET  /api/v1/documents/:id/versions/:version
POST /api/v1/documents/:id/review-links
POST /api/v1/documents/:id/approve
GET  /documents/:id
WS   /documents/:id/collaborate
```

`/mcp/v1` exposes the same handlers as an MCP-shaped HTTP adapter until the
transport and SDK compatibility decision is made. Mutating responses include a
stable document ID, version, canonical permalink, actor provenance, and
idempotency result.

## Failure and consistency rules

- A retried idempotency key never creates a second version.
- A stale or causally incomplete update fails or requests replay; it is never
  silently last-write-wins over a newer head.
- Version manifests are immutable and pin paginated reads to one head.
- An access revocation fails closed for new reads and room joins within the
  product's stated revocation target.
- No cross-Durable-Object transaction is assumed. If block shards are added,
  immutable staged data is published through a document-owned manifest so
  readers either see the old complete version or the new complete version.

## Deferred choices

Identity provider, production MCP transport, physical block sharding, offline
editing, native mobile clients, search, and active-active multi-region
coordination remain open. They must not leak into the MVP document interface.
