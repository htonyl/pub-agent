# Cloudflare Worker

This package is the Cloudflare Workers entry point for the project. It uses
Hono for HTTP routing, SQLite-backed Durable Objects for per-name state, and
Drizzle ORM for schema-aware database access.

## Commands

Run these from the repository root:

```sh
pnpm --filter @pubagent/cloudflare-worker dev
pnpm --filter @pubagent/cloudflare-worker test
pnpm --filter @pubagent/cloudflare-worker typecheck
pnpm --filter @pubagent/cloudflare-worker db:generate
pnpm --filter @pubagent/cloudflare-worker deploy
```

The starter routes are:

- `GET /health`
- `GET /counters/:name`
- `POST /counters/:name/increment` with an optional JSON `{ "amount": 1 }`

Document routes are available under both `/api/v1` and the lightweight
`/mcp/v1` JSON contract. They include document creation, version reads, large
replacement updates, approval, and review-link creation. The MCP-shaped
surface is intentionally HTTP/JSON and does not claim to implement the MCP
SDK. Document requests require an explicit comma-separated capability in the
`x-pubagent-capabilities` header; the policy adapter denies by default.

`GET /documents/:id` renders an HTML document page. JSON document and publish
responses include a stable `permalink` field.

Each counter name maps to one Durable Object instance. The object owns its
SQLite database and exposes a small RPC interface to the Worker. The Worker
does not query Durable Object storage directly.

## MVC layout

```text
src/
  controllers/       HTTP input parsing and orchestration
  database/          Drizzle schema and storage adapters
  durable-objects/   Cloudflare stateful runtime adapters
  models/            domain behavior and storage interfaces
  routes/            Hono route registration
  views/             response serialization
```

See the package-level `AGENTS.md` for the practices agents should follow when
changing this package.
