# 2. User Experience & Functionality

## User Personas

### Agent builder or developer

Integrates the publishing plugin into an agent. They need a small, predictable
tool surface and a canonical response that identifies the published resource,
its permissions, and its version.

### Publishing agent

Produces research, plans, reports, or other knowledge. It needs to publish
content with metadata, place it in an existing hierarchy, update it safely, and
read related context later.

### Human owner or knowledge worker

Reviews and consumes agent output. They need readable pages, familiar tree
navigation, ownership controls, explicit sharing, and confidence about where
content came from and when it changed.

### Workspace administrator

Defines workspace-level membership, policy, and audit expectations. They need
manageable defaults, revocable access, and visibility into publishing activity.

### Downstream agent

Reads authorized pages or structured content to continue a topic. It needs
stable identifiers, machine-readable content, hierarchy context, version
metadata, and permission-aware retrieval.

### CI or automation agent

Runs without an interactive human session and publishes build reports,
research, or operational knowledge. It needs a service identity with a narrow,
folder-scoped capability and predictable failure behavior.

## User Stories

### Story 1: Publish content

As a publishing agent, I want to submit rich text, Markdown, or HTML directly
from my MCP client so that my work becomes a durable, immediately readable site
without copying it into a chat or another AI session.

**Acceptance Criteria**

- The plugin accepts rich text, Markdown, and HTML payloads with a title and
  destination workspace or site.
- A successful response returns a stable site/page identifier, canonical URL,
  version identifier, publish status, and effective access policy.
- The platform renders supported content without requiring the agent to write
  page-specific frontend code.
- The publish response can be passed to a human or another agent as a stable
  link and machine-readable resource reference; manual content transfer is not
  required.
- Invalid payloads return actionable validation errors and do not create a
  partial published page.
- Repeating a request with the same idempotency key does not create duplicate
  pages or versions.

### Story 2: Organize knowledge in a hierarchy

As a human owner, I want to place sites and pages in a Notion-style hierarchy
so that related agent work can be browsed as a coherent knowledge space.

**Acceptance Criteria**

- A page can have one parent and an ordered set of children.
- Authorized users and agents can create, move, rename, archive, and list
  pages subject to policy.
- The API exposes ancestors, children, sibling ordering, and breadcrumb data.
- Moving a page preserves its stable identifier and version history.
- Cycles and invalid cross-workspace moves are rejected.

### Story 3: Control access

As a human owner or administrator, I want explicit access control so that agent
publishing does not bypass human governance.

**Acceptance Criteria**

- Each workspace, site, and page has an owner and an effective policy.
- MVP policies support at least private, workspace-member, and link/public
  visibility, with the final policy model marked TBD until identity decisions
  are made.
- Agents can act only through scoped credentials and cannot grant themselves
  access.
- Revoking access takes effect for new reads within a defined target of 60
  seconds or less.
- Every permission change and publish event is included in an audit record.

### Story 4: Scope MCP capabilities

As a workspace administrator, I want to scope MCP client permissions by action
and folder or document so that each agent can do only the work it was intended
to do.

**Acceptance Criteria**

- An MCP credential can be scoped independently for read, publish/create,
  update, comment, move, and access-management actions.
- A credential can target an explicit set of folders or document IDs; folder
  scopes may inherit to descendants only when configured.
- A coding agent can be restricted to publish into designated team folders and
  inherit the folders’ already-configured team sharing policy.
- A CI agent can be restricted to publish into designated folders whose content
  is readable by specified downstream agents, without granting it access to
  other workspace content.
- An agent cannot update a human document unless its credential has explicit
  update capability for that document or an allowed parent scope.
- Draft, review, and finalized document states can impose different agent
  actions. Finalized documents are read-only to agents by default and require
  an explicit human-approved capability to modify.
- Every denied action identifies the missing capability and target scope without
  revealing protected content.

### Story 5: Collaborate on text documents

As a human knowledge worker, I want agents and people to edit the same text
document collaboratively so that agent drafts can be reviewed and improved
without moving content between tools.

**Acceptance Criteria**

- A text document supports human and authorized-agent edits in a shared
  document model, with actor attribution for each saved change.
- Changes are automatically saved and assigned a version; a user can inspect
  version history and restore a prior version without deleting history.
- Concurrent edits do not silently overwrite each other. The product either
  merges compatible changes or presents a resolvable conflict with both change
  sets preserved.
- Users can add comments anchored to a document block or text range, reply to
  comments, resolve/reopen them, and see author and timestamps.
- Agents can read comments and create or reply to comments only when their MCP
  credential includes the comment capability.
- Document updates, comments, resolutions, and restores are available through
  the web client and the machine-readable API.

### Story 6: Read on the web

As a human reader, I want to open a published page in a browser so that I can
consume agent work without installing an agent-specific tool.

**Acceptance Criteria**

- Authorized users can open a canonical URL and see the rendered title,
  content, hierarchy context, author/agent attribution, and last-updated time.
- Public pages do not require an account; private pages require authentication
  and authorization.
- The rendered view supports responsive layouts and accessible semantic HTML.
- Unsupported or unsafe HTML is sanitized before rendering.
- A page displays a clear not-found or not-authorized state without revealing
  private metadata.

### Story 7: Read through an API

As a downstream agent, I want to retrieve authorized content in a stable
machine-readable format so that I can continue the topic in a later
conversation.

**Acceptance Criteria**

- The API supports retrieval by stable page/site identifier and canonical URL
  where applicable.
- Responses include canonical content, rendered-content metadata, hierarchy
  context, source/author attribution, timestamps, and version information.
- The API supports listing children and retrieving a bounded set of related
  pages without returning unauthorized content.
- The API returns explicit permission failures and does not allow callers to
  infer the existence of unauthorized pages through timing or error detail.
- Content can be requested in a format suitable for agent context assembly,
  including block boundaries and source links.

### Story 8: Continue a topic with provenance

As a downstream agent, I want to identify the relevant published context and
its provenance so that my next response can build on prior work accurately.

**Acceptance Criteria**

- Retrieved blocks have stable anchors or source references that can be cited.
- A page version is immutable after publication; edits create a new version or
  an explicitly defined equivalent history record.
- The API exposes freshness and update timestamps so an agent can detect stale
  context.
- The MVP provides retrieval primitives; autonomous answer generation and
  cross-agent identity trust are outside the MVP.

## Primary User Flow

```text
Agent composes output in an MCP client
        |
        v
Plugin validates payload + credential capabilities + destination
        |
        v
Platform creates/updates document or page and records version
        |
        v
Renderer produces browser-ready representation
        |
        +--> Human opens, edits, comments on, or shares authorized content
        |
        +--> Downstream agent retrieves authorized structured context
                    |
                    v
             Agent continues the topic with provenance
```

## Non-Goals

- Native iOS and Android applications in the MVP.
- Full feature parity with every current Notion capability; MVP parity is
  limited to hierarchy, automatic versioning, collaborative text editing, and
  comments.
- A universal CMS for arbitrary business workflows.
- Autonomous agent-to-agent messaging, negotiation, or identity federation.
- Automatic discovery of private content or permission inference by an agent.
- Guaranteed support for every HTML feature, JavaScript application, or media
  format.
- Training foundation models on customer content without explicit policy and
  consent.
