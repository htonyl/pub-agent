# Capability map

Capabilities are the maintained product-level entry points. Each capability
states the behavior the product promises, then records implementation evidence
without treating an implementation detail as product intent.

## Published capabilities

| Capability | Responsibility | Status |
| --- | --- | --- |
| [Collaborative documents](collaborative-documents.md) | Let humans and authorized agents create, review, version, read, and collaborate on durable text documents with provenance and lifecycle protection. | Foundation implemented; safety verification gaps and product expansion are tracked in the linked work record. |

Start with the capability document for behavior and current coverage. Use the
[local work record](../../../work/collaborative-documents/README.md) for the
active delivery state and tickets.

When first working on a capability, create `<capability>.md` here using the
[spec maintenance rules](../README.md). Add a link and one-sentence responsibility
to this map. Keep its overview, journeys, and detailed rules together until
splitting them makes navigation easier.

Cross-capability journeys link to the relevant rules rather than restating them.
