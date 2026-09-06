# TD-006: Canonical blocks and collaborative update model

**Status:** Accepted for the MVP foundation

## Decision

Documents use typed, ordered blocks as their canonical representation. A block
has an immutable `blockId`, a `kind`, a `schemaVersion`, JSON attributes,
typed content, provenance, and deletion metadata. Text content is represented
as an ordered list of UTF-8-bounded chunks. Rendered HTML, Markdown, and other
source formats are adapters or derived views; they are never the only source of
truth.

The collaboration interface uses an operation envelope containing:

```text
documentId, actorId, clientId, opId, logicalClock, baseSequence, operation
```

The first operations are `insert`, `update`, `move`, and `delete`. The
Document Durable Object assigns a monotonically increasing document-local
sequence after validation and durable commit. Reusing an `opId` with the same
payload returns the original acknowledgement; reusing it with a different
payload is a conflict. A client whose base sequence is ahead of the server is
asked to resynchronize.

Concurrent operations use deterministic operation keys for ordering and
field-level last-writer-wins inside the CRDT module. Deletes retain tombstones
so block anchors and audit history remain addressable while deleted blocks are
excluded from visible content. This is a block-structure CRDT foundation, not a
promise that arbitrary long-form text is automatically merged character by
character.

## Why this shape

Large agent edits are naturally batches of paragraphs, headings, code blocks,
tables, and other typed units. Sending a multi-megabyte edit as one character
operation creates oversized messages, expensive replay, and poor provenance.
Stable block IDs let humans and agents cite, comment on, move, and review the
same unit across versions.

The dependency-free model is deliberately behind a small interface so the
Worker can test convergence and idempotency without a Cloudflare runtime. A
future text adapter may use Yjs inside bounded text blocks after Worker
compatibility, persistence, memory, and anchor behavior are validated. We do
not introduce a custom character-level CRDT or a new dependency in this slice.

## Large edit protocol

Large agent changes follow this shape:

```text
begin upload -> upload UTF-8 chunks -> validate manifest -> commit operation batch
```

Chunks are bounded independently from total document size. A commit references
the complete staged payload and publishes one new version only after every
chunk and permission check succeeds. Upload identity is bound to the actor,
document, intended capability, expiry, and content hash. Missing or duplicate
chunks are retryable; an incomplete batch is not visible as a document version.

Initial implementation limits are runtime configuration, not Cloudflare
provider guarantees. They must cover chunk bytes, total staged bytes, blocks per
batch, nesting depth, WebSocket frame size, replay window, and per-actor write
rate.

## Review and approval invariants

Approval targets an exact immutable version and content hash. Approval and a
`finalized` transition are serialized by the document coordinator. A later
edit makes the approval historical rather than current; restore creates a new
version. Agents are read-only against finalized documents unless a human grants
an explicit, expiring override.

## Consequences

- The MVP can handle huge structured agent updates without making every client
  understand a rendering format.
- Version history can retain immutable manifests while the current head remains
  cheap to read.
- Block-level concurrent edits can converge without silent lost updates.
- Character-level text merge, offline-first editing, and cross-document
  transactions remain explicit follow-up work.
- A pure model does not replace authorization, lifecycle, or approval checks;
  those remain server-authoritative Durable Object responsibilities.
