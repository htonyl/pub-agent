# CD-004: Make document creation retry-safe

Status: verify
Canonical rules: [DOC-002](../../../prd/spec/capabilities/collaborative-documents.md#doc-002), [DOC-005](../../../prd/spec/capabilities/collaborative-documents.md#doc-005)
Dependencies: none

## Observable outcome

A create request's client update ID is a durable idempotency key scoped to the
authenticated principal and request intent. Equivalent retries return the same
document ID and version. Reusing a key for a different title/content or actor
does not create another document and returns a deterministic conflict.

## Acceptance scenarios

- Given an authorized principal and create key `K`, when the same create is
  submitted twice, then both responses identify one document at version 1.
- Given a transient failure after durable create, when the caller retries with
  the same key and equivalent payload, then the original document is recovered.
- Given key `K` already used for one payload, when a different title or content
  is submitted, then the request fails without creating or mutating a document.
- Given key `K` used by principal `alice`, when principal `bob` submits it, then
  the request cannot retrieve or mutate Alice's document through idempotency.
- Existing update idempotency and stable publish response behavior continue to
  pass.

## Planned verification

Add model/store/route and MCP retry tests, including conflict reuse and principal
scoping. Exercise the transaction/recovery path supported by the store.

## Results

Create routing now derives a stable actor/key document ID, and the model returns
the immutable version-1 acknowledgement for equivalent retries while rejecting
changed payloads. Focused tests pass; durable persistence, restart recovery,
concurrency, and MCP retry evidence remain outstanding.
