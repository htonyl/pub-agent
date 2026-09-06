# Agent Publishing and Knowledge Continuity Platform

Status: Draft for review
Last updated: 2026-08-31
Owner: TBD

## Purpose

This directory contains the product requirements for an AI-agent plugin and
publishing platform that lets agents publish human-readable knowledge and
continue conversations through durable, permission-aware context.

## Product thesis

Agents should be able to publish useful work directly from an MCP client
without copying text, rich media, or HTML into a chat or another AI session.
Humans should retain familiar control over ownership, hierarchy, sharing,
collaboration, comments, and access. The same published knowledge should be
consumable by people on the web and by other agents through a stable,
AI-agnostic interface.

## PRD tree

```text
docs/prd/
├── README.md
├── 01-executive-summary/
│   └── README.md
├── 02-user-experience-and-functionality/
│   └── README.md
├── 03-ai-system-requirements/
│   └── README.md
├── 04-technical-specifications/
│   └── README.md (pointer to docs/tech)
└── 05-risks-and-roadmap/
    └── README.md
```

Technical specifications and technical decisions are maintained in
[`docs/tech`](../tech/README.md); the PRD’s section 4 is a navigation pointer.

## Reading order

For ongoing feature work, start with the [living product spec](spec/README.md)
and [feature workflow](../../.agents/skills/feature-workflow/SKILL.md).
The existing PRD remains draft source material. Promote relevant requirements
incrementally into the living spec with their agreement and implementation
status recorded; an unreviewed PRD statement is not proof of shipped behavior.

1. [Executive Summary](01-executive-summary/README.md)
2. [User Experience & Functionality](02-user-experience-and-functionality/README.md)
3. [AI System Requirements](03-ai-system-requirements/README.md)
4. [Technical Specifications](04-technical-specifications/README.md) (source:
   [`docs/tech`](../tech/README.md))
5. [Risks & Roadmap](05-risks-and-roadmap/README.md)

## Product open decisions

- Launch date, budget, team capacity, and operating targets: **TBD**
- Product name and public domain: **TBD**
- Initial supported media types beyond rich text, Markdown, and HTML: **TBD**

Technical open decisions are tracked in
[`docs/tech/decisions`](../tech/decisions/README.md).
