# 5. Risks & Roadmap

## Phased Rollout

### MVP: Governed agent publishing and reading

- Agent plugin/API for rich text, Markdown, and HTML publishing.
- Direct MCP-client handoff of text, rich media, and HTML outputs, with a
  canonical link/resource reference suitable for humans and downstream agents.
- Canonical pages with immutable versions and stable identifiers.
- Notion-style parent/child hierarchy with ordered children.
- Human/workspace ownership and minimum viable access policies.
- Action- and folder/document-scoped MCP capabilities, including protected
  finalized documents and CI/service-agent use cases.
- Text-document automatic versioning, collaborative editing, comments, replies,
  resolution, and restore history.
- Server-rendered responsive web reader.
- Permission-aware machine-readable read API for downstream agents.
- Audit events, content sanitization, rate limits, observability, and the
  evaluation suite described in this PRD.
- Mobile clients, additional media types, and autonomous continuation are not
  included.

### v1.1: Deeper collaboration and discoverability

- Approvals, publishing workflows, richer sharing controls, and more document
  lifecycle states on top of the MVP collaboration model.
- Search, filtering, backlinks, related-content APIs, and better context
  assembly for downstream agents.
- Initial mobile-responsive enhancements and a decision on native mobile
  clients.
- Additional media adapters such as images, files, and diagrams, subject to
  security and storage validation.

### v2.0: Cross-client knowledge network

- Native iOS and Android clients using the same authorization and content APIs.
- More media types and multimodal rendering/retrieval.
- Explicit cross-agent continuation protocols, subscriptions, and workflows.
- Portable export/import and stronger interoperability across AI providers.
- Optional federation or cross-workspace sharing after identity, trust, and
  compliance models are validated.

## Technical Risks

### Unsafe or inconsistent rendering

Arbitrary HTML and future media types can create XSS, SSRF, layout, or
availability issues. Mitigate with typed content adapters, server-side
sanitization, inert rendering, resource limits, snapshot tests, and an explicit
unsupported-feature policy.

### Permission leakage

Hierarchy traversal, caches, previews, and agent retrieval create multiple
paths around authorization. Mitigate with centralized policy evaluation,
deny-by-default tests, cache partitioning/invalidation, opaque identifiers where
appropriate, and red-team coverage.

### Prompt injection through published content

Pages may contain instructions that conflict with an agent’s task or policy.
Mitigate by returning content as untrusted data, preserving provenance, using
bounded retrieval, and documenting client-side instruction handling.

### Context quality and continuity failure

Agents may retrieve too much, stale, or irrelevant context. Mitigate with
stable block anchors, version/freshness metadata, hierarchy-aware retrieval,
benchmark evaluation, and citation requirements.

### Collaboration and conflict complexity

Concurrent human and agent edits can create confusing merges, stale comments,
or accidental changes to finalized documents. Mitigate with immutable version
history, explicit conflict handling, block/range anchors, document-state
policies, actor attribution, and restore tests.

### Capability misconfiguration

An overly broad MCP credential could let a coding or CI agent publish, read, or
modify content outside its intended scope. Mitigate with action/resource/state
separation, deny-by-default policies, short-lived credentials, preflight
inspection, audit logs, and automated authorization-matrix tests.

### Vendor and model dependence

Tight coupling to one agent framework could undermine the AI-agnostic goal.
Mitigate with protocol-neutral API schemas, documented contracts, independent
web and agent clients, and conformance tests.

### Cost and scale uncertainty

Rendering, storage, indexing, bandwidth, and future media processing may grow
unpredictably. Mitigate with payload limits, quotas, asynchronous processing
for large assets, usage telemetry, and explicit capacity gates before each
roadmap phase.

### Identity and governance ambiguity

Without a chosen identity model, sharing semantics and revocation guarantees
remain underspecified. Resolve identity provider, workspace model, roles,
policy inheritance, compliance, and data residency before production launch.

## Launch Gates

- Product owner confirms success metrics, target users, pricing/operating model,
  and launch scope.
- Engineering confirms stack, identity, hosting, capacity, and SLO decisions.
- Security review passes authorization, sanitization, tenant isolation, and
  abuse-control tests with zero critical findings.
- Evaluation suite meets the thresholds in the AI System Requirements.
- Pilot users complete publish, browse, share, revoke, and agent-read flows
  with recorded usability results.
