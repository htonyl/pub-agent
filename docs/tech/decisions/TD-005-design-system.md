# TD-005: Cross-platform design contracts

**Status:** Accepted

Canonical DTCG JSON tokens and primitive contracts live under `design-system/`.
A repository-owned generator produces checked-in CSS, Swift, Kotlin, and Android
XML adapters plus a machine-readable manifest. Product UI consumes semantic
aliases only; foundation tokens remain private to themes.

Storybook (HTML/Vite) is the web catalog. A Compose Multiplatform catalog runs
on desktop and Android. Both expose the generated canonical primitive matrix;
hand-authored composition examples are separate. Coordinated releases use
`design-system/vMAJOR.MINOR.PATCH`, while ordinary corrections may be untagged.
