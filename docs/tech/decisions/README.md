# Technical Decisions

This directory records decisions that affect architecture, interfaces,
security, operations, or implementation constraints. Product requirements
remain in [`docs/prd`](../../prd/README.md).

## Decision log

| ID | Decision | Status | Record |
| --- | --- | --- | --- |
| TD-001 | Keep technical specifications and decisions under `docs/tech`; keep product requirements under `docs/prd`. | Accepted | This documentation structure |
| TD-002 | Use MCP as the agent-facing integration boundary. | Proposed | [MCP integration](#td-002-mcp-integration) |
| TD-003 | Scope agent capabilities independently by action, resource, document state, audience, and lifetime. | Proposed | [Capability scoping](#td-003-capability-scoping) |
| TD-004 | Make finalized documents read-only to agents by default. | Proposed | [Document lifecycle](#td-004-document-lifecycle) |

## TD-002: MCP integration

**Status:** Proposed

MCP is the agent-facing integration boundary so publishing and reading can be
invoked directly from compatible clients without copying text, rich media, or
HTML through a chat. MCP transport details and compatibility version remain
**TBD**.

## TD-003: Capability scoping

**Status:** Proposed

Agent credentials must scope actions independently from resources. The model
must support explicit workspace, folder, page, and document targets; optional
descendant inheritance; document-state restrictions; audience restrictions;
expiry; and revocation. Server-side authorization is authoritative.

This supports coding agents publishing to approved team folders, CI agents
publishing to folders readable by downstream agents, and review agents editing
only explicitly approved documents.

## TD-004: Document lifecycle

**Status:** Proposed

Documents have at least `draft`, `in_review`, and `finalized` states. Agents
may be granted different capabilities per state. Finalized documents are
read-only to agents by default; a human may grant a time-bound update override
when the workflow requires it.

## Open decisions

- Technology stack, hosting model, and deployment topology.
- Human identity provider, authentication protocol, and service-identity model.
- Storage, indexing, cache invalidation, and collaboration conflict strategy.
- API schema/versioning and MCP compatibility version.
- Compliance, data residency, retention, export, and deletion requirements.
- Capacity targets, SLOs, quotas, and cost model.
