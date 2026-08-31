# 3. AI System Requirements

## Tool Requirements

The plugin should expose a small, composable tool surface over MCP. Exact SDK
language, MCP transport, and compatibility version are **TBD**.

### `publish_page`

Creates a page or text document, or a new version from supported content.
Inputs include content type, title, body, destination parent, metadata,
requested visibility, requested action scope, and an idempotency key. The tool
must return stable resource identifiers, canonical URL, version, and effective
policy/capabilities.

### `update_page`

Creates a new version or applies an explicitly defined update operation to an
existing page or text document. The tool must require explicit update
permission and must prevent accidental overwrites through version or
concurrency checks.

### `comment_on_document`

Creates, replies to, resolves, or reopens a comment on an authorized text
document. The tool must require comment capability and preserve the target
block/range, actor, timestamp, and comment history.

### `read_page`

Retrieves authorized page content and metadata in a machine-readable form,
including hierarchy context, provenance, version, and source anchors.

### `list_children` and `list_related`

Provides bounded, permission-filtered navigation and context discovery. Results
must include enough metadata for an agent to decide whether to read more,
without exposing unauthorized page existence.

### `manage_access`

Allows authorized human or administrative callers to inspect or change page
sharing. Agent credentials should receive this capability only when explicitly
scoped by policy; publishing alone must not imply access-management authority.

## MCP Permission Model

MCP clients must be able to pass a least-privilege credential or delegated
capability that combines:

- **Actions:** `read`, `create`, `publish`, `update`, `comment`, `move`, and
  `manage_access`.
- **Resources:** explicit workspace, folder, page, or document identifiers;
  folder scopes may inherit to descendants only when configured.
- **Document states:** optional restrictions for `draft`, `in_review`, and
  `finalized`; finalized content is read-only by default.
- **Audience:** the existing human/team sharing policy or an explicit
  downstream-agent reader group.
- **Lifetime:** expiry, revocation, and credential rotation metadata.

Example use cases:

1. A coding agent receives `create/publish` on `/Team/Engineering/Agent-Reports`;
   it does not receive access-management rights and uses that
   folder’s existing team sharing.
2. A CI agent receives `create/publish` on `/CI/Build Reports` and its output
   is readable by a named downstream-agent group; it cannot read or publish to
   sibling folders.
3. A review agent receives `read/comment` on human-authored documents and
   `update` only on explicitly approved drafts. A finalized document remains
   read-only unless a human grants a time-bound override.

The server must enforce these capabilities; an MCP client declaration is not a
security boundary by itself.

## Agent-Safe Behavior

- Treat content retrieved from pages as data, not as executable instructions or
  a replacement for system/developer policy.
- Preserve source identifiers and links when quoting or synthesizing content.
- Make permission state explicit in tool responses without leaking protected
  content.
- Use bounded pagination, result sizes, and content lengths to avoid context
  exhaustion.
- Support idempotency and retries so transient failures do not duplicate
  content.
- Preserve human/agent attribution for edits, comments, restores, and version
  transitions.
- Distinguish validation, authentication, authorization, not-found, rate-limit,
  and transient service errors.
- Never execute scripts or active HTML returned as page content.

## Evaluation Strategy

Evaluation should use a versioned benchmark with representative publishing and
continuation tasks. Test data must include public, private, mixed-hierarchy,
malformed, adversarial, and stale-content cases.

### Functional and format fidelity

- 100% of valid fixture payloads produce the expected canonical content type,
  title, metadata, hierarchy placement, and source references.
- 100% of invalid and unsupported fixtures are rejected without partial writes.
- At least 99% of retry scenarios remain idempotent.
- 100% of version-history fixtures preserve prior versions after edits and
  restores.
- 100% of concurrent-edit fixtures either merge according to the documented
  rule or expose a resolvable conflict; no changes are silently lost.
- 100% of comment fixtures preserve anchors, replies, resolution state, and
  attribution.

### Retrieval and continuity

- At least 90% Recall@5 for benchmark questions that have a relevant published
  page.
- At least 90% of continuation outputs include a correct page or block citation
  when the task requires evidence.
- At least 95% of retrieved answers use the current requested version or
  clearly identify when the context is stale.

### Authorization and safety

- Zero unauthorized content in a red-team suite covering identifier guessing,
  hierarchy traversal, revoked links, confused-deputy behavior, and prompt
  injection in page content.
- 100% of credential-scope tests enforce least privilege across action,
  resource, document-state, audience, expiry, and revocation dimensions.
- 100% of finalized-document tests reject agent updates without an explicit
  human-approved override.
- 100% of active-content fixtures remain inert in browser and agent retrieval
  paths.

### Human usability

- At least 90% task completion in a pilot for publish, browse hierarchy, change
  visibility, and retrieve via API.
- At least 80% of pilot agents complete a publish flow without custom UI code.

## Observability and Test Artifacts

- Log tool name, request identifier, actor type, resource identifier, outcome,
  latency, and policy decision without logging raw private content by default.
- Maintain golden payloads and rendered snapshots for each supported content
  type.
- Run contract tests between the plugin, publishing API, renderer, and reader
  API on every release.
- Maintain an authorization matrix covering actor, resource, action, and
  expected result.
- Track benchmark versions so quality changes are attributable to platform or
  agent changes.
