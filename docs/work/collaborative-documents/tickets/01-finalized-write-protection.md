# CD-001: Enforce finalized write protection on all mutation paths

Status: verify
Canonical rules: [DOC-007](../../../prd/spec/capabilities/collaborative-documents.md#doc-007), [DOC-009](../../../prd/spec/capabilities/collaborative-documents.md#doc-009)
Dependencies: none

## Observable outcome

An agent cannot mutate a finalized document through replacement text, Yjs text,
or a block operation. The check is enforced inside the document coordinator or
model/store boundary so a caller cannot bypass it by using another route.

## Acceptance scenarios

- Given a finalized document, when an authorized agent submits a replacement
  update, then the server rejects it and the document head, version history, and
  content hash are unchanged.
- Given a finalized document, when an authorized agent submits a complete Yjs
  envelope, then the server rejects it before applying or persisting the update.
- Given a finalized document, when an authorized agent submits an insert,
  update, move, or delete block operation, then the server rejects it before
  assigning a sequence or broadcasting it.
- Given a draft or in-review document, when an otherwise authorized agent
  writes, then existing base-version, envelope, and operation validation still
  applies.
- Given any rejected finalized write, when the caller retries, then no partial
  version, snapshot, CRDT history, or broadcast exists.

## Planned verification

Add model/store and Durable Object tests for all three paths, plus route-level
status/error assertions. Run the focused Worker suite and typecheck.

## Results

Implemented in the model/store/Document Durable Object paths for replacement,
Yjs, and block mutations. Focused Worker tests pass, but direct Durable Object,
SQL, restart, and all-path rejection tests remain outstanding.
