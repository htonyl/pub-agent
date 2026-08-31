# Technical Specifications

## Architecture Overview

The platform should separate content ingestion, canonical storage, rendering,
authorization, and consumption so new clients and media types can be added
without changing the publishing contract.

```text
Agent / MCP Client / Plugin SDK
        |
        v
Publish + Read + Collaboration API ---- AuthN/AuthZ + capability evaluation
        |
        +--> Content service --> canonical document + immutable versions
        |          |
        |          +--> hierarchy / ownership / metadata store
        |          +--> collaborative edit / comment service
        |          +--> audit event stream
        |
        +--> Render service --> sanitized HTML / browser representation
        |
        +--> Agent retrieval API --> structured blocks + provenance
        |
        +--> Web client
        |
        +--> iOS / Android clients (future)
```

Technology choices, hosting, datastore, queueing, and deployment topology are
**TBD**. The following boundaries are requirements independent of those
choices:

- **Canonical content model:** Store content with explicit type, schema
  version, blocks or source body, metadata, author/actor, timestamps, and
  provenance. Do not make rendered HTML the only source of truth.
- **Versioning:** Published versions are immutable and addressable. Updates
  must be atomic and must expose the current version. Text document edits are
  automatically versioned, expose the current version, and retain a restorable
  history. Restore creates a new current version rather than deleting later
  history.
- **Collaborative editing:** The document model must support concurrent human
  and authorized-agent edits with actor attribution. The conflict strategy
  (operation transform, CRDT, or another approach) is **TBD**, but silent lost
  updates are not acceptable.
- **Comments:** Comments are first-class objects anchored to a block or text
  range, with author, timestamps, replies, resolution state, and history.
- **Hierarchy:** Model parent/child relationships separately from content so
  pages can move without rewriting content history.
- **Rendering:** Convert supported content to safe, deterministic,
  browser-ready output. Sanitization and resource policy must run server-side
  before serving untrusted HTML.
- **Read models:** The web representation and agent representation may differ
  in shape, but both must derive from the same authorized version.
- **Extensibility:** Add media types through a typed content adapter and
  renderer contract rather than special-casing each client.

## Integration Points

### Agent plugin

- Tool/API authentication: **TBD**; must support scoped MCP credentials,
  expiration, revocation, and rotation.
- Request validation: content type, size, title, destination, metadata, and
  idempotency key. Validate requested action and resource scope before any
  write.
- Response contract: stable IDs, canonical URL, version, effective policy,
  granted capabilities, warnings, and retryable/non-retryable error
  classification.

### Identity and access

- Human identity provider and protocol: **TBD**.
- Workspace membership, service identities, roles, resource ownership, and
  policy inheritance are required concepts.
- Capabilities must scope actions independently from resources. A credential
  that can publish to a folder must not automatically be able to read,
  update, comment, move, or share all content in that folder.
- Document lifecycle policy must distinguish draft, in-review, and finalized
  states. Finalized documents are read-only to agents by default.
- Authorization must be evaluated on every read and write, including rendered
  pages, API endpoints, previews, collaboration operations, comments, and
  related-content queries.

### Storage and indexing

- Durable storage for workspaces, sites/pages, hierarchy, versions, policies,
  document edits, comments, and audit records.
- Optional search/index layer for future discovery; MVP may use bounded
  hierarchy navigation if it satisfies pilot needs.
- Cache invalidation must respect permission changes and version updates.

### Clients

- Responsive web reader is an MVP client.
- Web text-document views support collaborative editing, version history,
  comments, and document-state controls in the MVP.
- iOS and Android clients consume the same APIs in a later phase.
- API documentation and machine-readable schemas are required for downstream
  agents and independent client implementations.

## Non-Functional Requirements

- **Reliability:** Meet the proposed publish and render targets in the PRD;
  final SLOs are TBD.
- **Performance:** Establish p95 targets for publish, page render, and API
  retrieval during technical validation; proposed initial target is p95 under
  2 seconds for a typical page read excluding large media.
- **Scalability:** Define capacity targets for workspaces, pages, content size,
  concurrent readers, and publish rate before launch; all are TBD.
- **Accessibility:** Rendered pages must use semantic structure, keyboard
  navigation, visible focus, alt-text handling, and a documented accessibility
  target before public launch.
- **Compatibility:** Publish and read contracts must be versioned; breaking
  changes require an announced API version or migration path.

## Security & Privacy

- Deny access by default and apply least privilege to human and agent actors.
- Isolate tenants/workspaces at the authorization and data-access layers.
- Store secrets and tokens using the selected platform’s secure secret
  facilities; never include credentials in content, logs, or client bundles.
- Sanitize HTML and Markdown output, disable scripts and unsafe protocols, and
  constrain external resource fetching to prevent XSS, SSRF, tracking, and
  data exfiltration.
- Encrypt data in transit and at rest, subject to final infrastructure choice.
- Record immutable audit events for publication, update, move, share, revoke,
  comment, restore, document-state transition, read-policy decisions where
  required, and administrative actions.
- Support deletion, export, retention, and legal hold requirements once
  compliance and jurisdiction are defined.
- Do not use customer content for model training or evaluation outside the
  agreed data policy.
- Define abuse controls for spam publishing, oversized payloads, malicious
  HTML, enumeration, scraping, and denial-of-service attempts.
