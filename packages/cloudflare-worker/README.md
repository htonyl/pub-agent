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

Document routes are available under both `/api/v1` and the compatibility REST
aliases under `/mcp/v1`. They include document creation, immutable version
reads, replacement updates, block operations/snapshots, bounded Yjs text
updates, approval, and review-link creation. `POST /mcp/v1` is a small
authenticated JSON-RPC MCP adapter supporting `initialize`, `tools/list`, and
the document tools `create`, `read`, `apply-operation`, `snapshot`, `propose`,
and `approve`.

Document requests require a signed `Authorization: Bearer pa1...` token. The
token is an HMAC-SHA-256 claim envelope verified with Web Crypto and the
`PUBAGENT_AUTH_SECRET` Cloudflare secret binding. Missing or invalid tokens
return 401; valid tokens without the required capability return 403. The old
`x-pubagent-capabilities` header is not trusted.

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
