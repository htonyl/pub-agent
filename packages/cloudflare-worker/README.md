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
