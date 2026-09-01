# Pub Agent design system

`tokens.json` is the sole source of truth. It uses DTCG token objects and separates
foundation values from semantic light/dark aliases. Application code and primitive
adapters consume semantic aliases only.

Run `pnpm design:build` after changing canonical tokens or primitive contracts,
then commit the generated outputs. `pnpm design:check` is the CI-safe drift
check. Coordinated releases use `design-system/vMAJOR.MINOR.PATCH`;
ordinary reviewed corrections may remain untagged.

The generated manifest describes the standard primitive state matrix and
accessibility obligations. Platform exceptions must be documented in the contract
instead of overriding generated values locally.
