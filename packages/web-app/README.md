# Pub Agent web app

The web app is a lightweight, dependency-free human editor/review surface for
collaborative agent documents. It is deliberately separate from the Worker and
Storybook packages: the mock transport makes the review flow demonstrable before
the real API is connected.

## Run locally

From this package directory:

```sh
pnpm build
python3 -m http.server 4173 --directory dist
```

Then open <http://localhost:4173>. `pnpm dev` combines those two commands.
`pnpm build` compiles `src/main.ts` to `dist/main.js`, copies `index.html` and
`src/styles.css`, and copies the checked-in generated design CSS into
`dist/generated/`. The package's smoke check also runs the compiler and checks
that the required interaction markers are present:

```sh
pnpm check
```

If a checkout disallows generated-file writes, the build transparently falls
back to the same strict TypeScript compile with `--noEmit`. The build uses the
repository's existing TypeScript compiler under the Worker package and does not
add a dependency or update `pnpm-lock.yaml`.

## Integration points

`src/main.ts` exposes the `DocumentTransport` interface. Replace
`mockTransport` with an adapter that maps the interface to the Worker routes:

- `GET /api/v1/documents/:id` loads the current title, status, version, and
  content metadata.
- `POST /api/v1/documents/:id/updates` saves a new draft with
  `baseVersion`, `content`, and a unique `clientUpdateId`. A `409` should set
  the UI to `conflict` and preserve the reviewer's local state.
- `POST /api/v1/documents/:id/approve` approves the exact version shown in the
  confirmation dialog. Approval is intentionally separate from saving.
- `POST /api/v1/documents/:id/review-links` creates a shareable review link.
- `GET /documents/:id/collaborate` is the WebSocket seam. Feed reconnect,
  resync, and conflict events into the `onState` callback, then apply stable
  block operations to the local store.

The current mock blocks match the canonical block vocabulary: heading,
paragraph, quote, code, list, and agent proposal. Each block has a stable DOM
anchor and visible actor/provenance treatment. The `MockDocumentStore` is
intentionally in-memory and is the only data layer used by the demo.

## Accessibility and interaction notes

The layout uses landmarks, one document heading, labelled controls, keyboard
reachable buttons, visible focus, 44px minimum control targets, live save/state
announcements, and reduced-motion styles. Comments jump to anchored blocks;
history restores create a new version in the mock flow; and exact-version
approval requires a confirmation dialog so acceptance cannot look like an
incidental save.

The visual direction is an original editorial workspace inspired by the calm,
curated density of modern reference libraries. No Mobbin assets, branding, or
private screens are copied.
