# Product glossary

These terms are used by the [collaborative documents capability](capabilities/collaborative-documents.md)
and its work record. Existing terminology remains available in the
[PRD](../README.md) and [technical docs](../../tech/README.md).

| Term | Definition | Agreement/source |
| --- | --- | --- |
| Collaborative document | A durable text document that supports human and authorized-agent changes, immutable versions, provenance, review, and a document-scoped collaboration room. | Agreed for the MVP foundation; [PRD Story 5](../02-user-experience-and-functionality/README.md) and [TD-006](../../tech/decisions/TD-006-collaborative-blocks-and-crdt.md). |
| Agent write | Any replacement update, Yjs text update, or block operation submitted through an agent credential or agent collaboration session. | Agreed safety interpretation recorded in [collaborative document rules](capabilities/collaborative-documents.md). |
| Finalized | A document lifecycle state representing a human-approved immutable reference. Agent writes are rejected by default while the document is finalized. | Agreed; [PRD Story 4](../02-user-experience-and-functionality/README.md) and [TD-006](../../tech/decisions/TD-006-collaborative-blocks-and-crdt.md). |
| Exact approval target | The immutable version identified by both its version number and content hash. Approval must compare both values atomically with the current head before finalizing. | Agreed safety rule; [TD-006 review invariant](../../tech/decisions/TD-006-collaborative-blocks-and-crdt.md). |
| Authenticated principal | The server-verified identity attached to a request after credential validation. It is the source of actor attribution for persisted changes. | Agreed safety rule; [TD-007 access control](../../tech/decisions/TD-007-cloudflare-collaboration-topology.md). |
| Client update ID | A caller-supplied idempotency key for one create or update intent. A retry with the same key and equivalent request returns the original result rather than creating another version or document. | Agreed in [PRD Story 1](../02-user-experience-and-functionality/README.md) and [TD-007 failure rules](../../tech/decisions/TD-007-cloudflare-collaboration-topology.md). |
| Room/echo seam | The current WebSocket implementation boundary: it authorizes a WebSocket upgrade, accepts a room connection, emits `ready`, and echoes payloads. It is not yet the validated, persisted, replayable collaboration protocol. | Current implementation fact; [DocumentDurableObject](../../../packages/cloudflare-worker/src/durable-objects/document-durable-object.ts) and [technical plan](../../tech/technical-specifications/collaborative-documents.md). |
| Block operation | A typed operation (`insert`, `update`, `move`, or `delete`) over the canonical ordered block model. | Agreed technical model; [TD-006](../../tech/decisions/TD-006-collaborative-blocks-and-crdt.md). |

Agents add terms as their meaning is settled, with a concise definition and a
source link. Mark inferred definitions as draft. Keep behavior, implementation
notes, and work progress in their respective documents.

If an existing term conflicts with a proposed use, resolve the meaning before
propagating it to specs and tickets.
