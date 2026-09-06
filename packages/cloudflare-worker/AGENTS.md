# Cloudflare Worker Agent Harness

These instructions apply to this package in addition to the repository root
`AGENTS.md`.

## Architecture

- Keep the request path as `routes -> controllers -> models -> storage
  adapters`.
- Treat `views` as the only place that shapes public response payloads.
- Keep Cloudflare APIs (`DurableObject`, bindings, and `ctx.storage`) inside
  `src/durable-objects` and the Worker composition layer.
- Keep models independent of Hono and Cloudflare so their interfaces can be
  tested with in-memory adapters.
- Keep the Durable Object RPC interface small. A single RPC should group the
  work needed for one use case rather than exposing individual database
  queries to the Worker.

## Durable Objects and Drizzle

- New Durable Object classes use SQLite storage in `wrangler.jsonc`.
- The Durable Object is the owner of its SQLite database; never access its
  storage from a controller or route.
- Define tables in `src/database/schema.ts` and access them through a storage
  adapter in `src/database`.
- Use Drizzle query builders for application queries. Do not build SQL by
  concatenating request data.
- Schema changes must be generated with `pnpm db:generate` and reviewed with
  the code change. Add each generated SQL file to `drizzle/migrations.ts`.
  Do not edit an already-applied migration in place.
- Keep initialization/migration work inside `ctx.blockConcurrencyWhile` so
  requests cannot observe a partially initialized object.

## Testing and validation

- Add model tests through the model interface and an in-memory adapter first.
- Add Worker-level tests when routing, binding behavior, or response status
  codes change.
- Before handing off a change, run:

  ```sh
  pnpm test
  pnpm typecheck
  ```

- Use `pnpm dev` for a local Wrangler smoke test before deploying.
- Treat `wrangler deploy` as an external action; agents must not run it unless
  the user explicitly asks for deployment.

## Scope and safety

- Do not add secrets to the repository. Use `.dev.vars` locally and Cloudflare
  secrets for deployed values.
- Do not change Durable Object class names, binding names, or storage backend
  casually: these are deployment state, not ordinary refactors.
- A change to a Durable Object migration or class export needs explicit review
  because it can affect existing state and deployment compatibility.
