# Storyling Design System — source copy

Exported from the Storyling Claude Design project (supplied by the owner as
`Storyling_Design_System.zip`, 2026-10-16). This folder is the **reference** —
the production implementation lives in `src/styles/storyling/` and
`src/components/storyling/` and must stay faithful to it.

Omitted on purpose: `assets/references/` and `uploads/` (third-party mood
images that belong to other brands — not for product use), `_ds_bundle.js`,
thumbnails.

Production adaptations (documented in docs/ARCHITECTURE.md, ADR-9):
- Fonts self-hosted via `next/font/google` (same families) instead of the Google Fonts CDN import.
- Phosphor icons self-hosted from the `@phosphor-icons/web` package instead of the CDN.
- Components ported from JSX to typed TSX with identical class names and props.
