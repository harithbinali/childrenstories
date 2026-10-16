# Storyling Design System

> **Working name.** "Storyling" is a placeholder product name — no brand name or logo was supplied. Replace it everywhere (wordmark text, `ستوريلنج` in Arabic) once the real brand exists.

A premium, playful, cartoon-inspired design system for a **children's AI storybook SaaS**: parents create personalised, illustrated picture books where their child is the hero, read them aloud together, and optionally print them. The interface should feel like an interactive illustrated storybook rather than a corporate SaaS site.

## Products / surfaces
- **Marketing website** — parent-facing landing, library preview, pricing. `ui_kits/website/`
- **Parent app** — dashboard (child profiles, bookshelf), **story creator** wizard, bedtime **reader**, **checkout**. `ui_kits/app/`
- **Admin dashboard** — internal overview, content moderation, families. `ui_kits/admin/`

All surfaces support **English (LTR)** and **Arabic (RTL)**.

## Sources
No codebase, Figma or brand assets were provided. Inputs were a written brief plus three third-party mood references (copied to `assets/references/`, **inspiration only — they belong to other brands and must not be used in product**):
- `ref-imagine-poster.jpg` — preschool poster: sticker-outlined navy/red headline, floating tilted icon tiles, dashed flight paths, dashed-stitch speech bubble.
- `ref-kids-center-site.jpeg` — kids learning-centre website: wavy blue sections, blob-shaped hero art, pastel program cards, yellow pill CTAs, cartoon mascots overlapping sections.
- `ref-storybook-poster.jpeg` — storybook poster: multi-colour chunky title, night-sky storytelling scene, round "badge" callouts, icon-circle feature list.

Everything in this system (palette, type, shapes, components) is an original synthesis of those motifs.

---

## CONTENT FUNDAMENTALS
**Voice:** a warm, slightly whimsical storyteller talking to a busy parent. Delight is in the imagery; copy stays clear and reassuring.
- **Address the parent as "you"; the child by name** ("Make tonight's story for Layla"). Product speaks as "we" ("We'll write and illustrate…"). Never "I".
- **Sentence case** for everything — headings, buttons, tabs. Uppercase only for tiny eyebrows and badges (`NEW`, `MOST LOVED`).
- **Buttons are verbs, 1–4 words:** "Create a story", "Start reading", "Make another", "Try 7 days free". No "Submit"/"OK".
- **Concrete, time-based promises** over hype: "about a minute", "12 illustrated pages", "before pyjamas are on". Avoid "revolutionary", "AI-powered" in headlines — AI is the how, the story is the what.
- **Errors are kind and specific:** "That email looks a little wobbly", "Card declined — try another card." Never blame, never "Invalid".
- **Gentle humour is welcome** in empty/loading states ("Dreaming up the plot", "Binding the book", "All clear! Nice work.").
- **Safety copy is plain and confident** for parents: "Every story is checked by our kid-safe filters."
- **Story text** (reader pages) is short sentences, simple vocabulary, dialogue in curly quotes.
- **Emoji: no.** Stars, clouds, hearts come from the icon set, never emoji.
- **Arabic:** Modern Standard Arabic, same warmth; Arabic guillemets «» for quotes; Eastern Arabic numerals (٢–١٠) in Arabic copy.

Examples: hero "Bedtime stories starring *your child.*" · eyebrow "PERSONALISED AI STORYBOOKS · AGES 2–10" · hint "A sentence or two is plenty. Leave blank and we'll surprise you."

## VISUAL FOUNDATIONS
- **Colour:** a bright "poster trio" — **sky blue** `--blue-500` (brand, big sections), **sunshine** `--sun-400` (primary CTA, stars, highlights), **cherry** `--cherry-500` (emphasis words, sale) — plus **bubblegum, mint, tangerine, grape** accents. Each has a darker `-600/-700` "edge" shade used for chunky button bottoms. Backgrounds use **pastel tints** (`--tint-*`) rotated sun → sky → bubble → mint → grape → tangerine. Text is **navy ink** (`--ink-900` #1B2457), never black; pages are warm **paper** (#FFFBF2), never stark white. **Night** (`--night-900`) for bedtime reader and footers.
- **Type:** Fredoka (rounded display, 600–700) for headings/buttons; Nunito (rounded sans, 500 body / 700–800 labels) for UI; **Andika** for story pages (designed for early readers). Arabic: Baloo Bhaijaan 2 + Tajawal, swapped automatically by `[dir="rtl"]`. Hero headlines can use `.sl-sticker-text` (white die-cut outline + soft navy drop) — hero only, once per page. Mix 1–2 accent colours inside a headline (e.g. "big **stories**").
- **Spacing:** 4-based scale, generous; sections breathe with `--section-y` (56→128px fluid). Mobile-first; content max 1200px, reading max 680px. Hit targets ≥44px.
- **Shapes & layout:** nothing sharp. Pills for controls, 28px cards, **wobbly** uneven radii (`--radius-card-wobble`), **blobs** (`--radius-blob-1…4`) for imagery. Layouts are **asymmetric**: offset grids (cards staggered vertically 0/40/10px), elements rotated ±1–3°, illustrations overlapping section edges.
- **Section edges:** straight horizontal breaks are avoided. Use `WaveDivider` (gentle, playful, cloud, drip) between colour bands and `Scallop` under banners/price headers.
- **Backgrounds:** flat colour fields + pastel tints; no photography by default. Hand-illustrated cartoon art (warm, saturated, soft-lit, big-eyed characters as in references) lives inside blob frames. Subtle radial gradients only inside cover placeholders. No aggressive gradients, no grain, no textures.
- **Decoration:** `FloatingDecor` scatters ≤6 icons (clouds, stars, sparkles, moon, paper plane) per area, slowly floating/twinkling. Decoration is ambient, never on top of text.
- **Cards:** white or pastel fill, 28px radius, soft **navy-tinted** shadow (`--shadow-card`). Variants: **sticker** (6px white border + drop — for imagery/tiles), **outlined** (navy ink outline + 6px chunky edge — the one featured item), **flat** (in-card choices). Never coloured left-border cards.
- **Shadows:** always navy-tinted rgba(27,36,87,…), large blur, negative spread (soft lift). Plus the solid **chunky edge** (`0 5px 0 <edge>`) for pressables.
- **Borders:** 2–3px, soft ink-100/200. **Dashed** 2–3px lines are a motif: focus rings, dividers in cards, step connectors, speech-bubble stitching, empty slots.
- **Hover:** buttons lift 2px (edge grows), icons wiggle; cards lift 6px and rotate ~1.5°; links get a wavy underline. **Press:** buttons squash down 4px (edge collapses); cards scale .99. **Focus:** 3px dashed blue outline, 4px offset.
- **Motion:** bouncy overshoot `--ease-bounce` for UI (160–480ms), soft `--ease-soft` for fades; pop-in for dialogs/toasts/new steps; slow float (6s) / twinkle / drift for decor. All disabled under `prefers-reduced-motion`.
- **Transparency & blur:** only on the sticky nav (82% sky + 14px blur) and modal overlay (navy 55% + 6px blur).
- **Imagery tone:** warm, saturated, cheerful cartoon/3D-ish illustration, soft lighting, never dark or scary; bedtime scenes use deep navy with golden lamp light.
- **RTL:** all components use logical properties (`inset-inline-*`, `margin-inline-*`); directional icons mirror via `.sl-flip-rtl` (automatic in `Icon`).

## ICONOGRAPHY
- **Phosphor Icons** via CDN (`@phosphor-icons/web@2.1.1`, imported in `tokens/icons.css`). No brand icon set was provided — Phosphor is a **substitution** chosen for its rounded terminals and fill/duotone weights that match the chunky cartoon look.
- **Weights:** `fill` for UI and decor (default), `bold` for arrows/carets and inline glyphs, `duotone` for feature tiles and placeholder art.
- Use via the `Icon` component (`<Icon name="star" />`) or raw `<i class="ph-fill ph-star">`.
- **Feature tiles:** duotone icon in a 58–72px rounded-square pastel tile, rotated ±4–6°, sticker shadow.
- Decorative motifs (stars, clouds, sparkles, moon, rainbow, paper plane, hearts, books) are Phosphor glyphs in brand colours — no hand-drawn SVG, **no emoji**, no unicode symbols as icons (except curly quote marks in speech bubbles).
- **Illustrations:** none supplied. Every illustration slot is a `BlobFrame` placeholder (dashed outline + duotone icon + caption). Real character art must be commissioned and dropped in via `src`.

## Logo
**No logo was provided.** The wordmark is the working name set in Fredoka 700 (`guidelines/wordmark.html`). Do not design a mark until the brand provides one.

---

## Index
- `styles.css` — entry point (imports only)
- `tokens/` — `fonts.css` (Google Fonts), `icons.css` (Phosphor CDN), `colors.css`, `typography.css`, `spacing.css`, `effects.css` (radii, shadows, motion, z), `motion.css` (keyframes + utility classes), `base.css` (resets, sticker text), `components.css` (component class styles)
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand)
- `components/` — React primitives, each with `.jsx`, `.d.ts`, `.prompt.md`, one card per folder
- `ui_kits/website/`, `ui_kits/app/`, `ui_kits/admin/` — click-through screens
- `assets/references/` — uploaded mood references (do not ship)
- `thumbnail.html`, `SKILL.md`

### Components
- **core/** — Icon, Button, IconButton
- **forms/** — Input, Select, Checkbox, Radio, Switch
- **display/** — Card, StoryCard, Badge, Tag, Avatar, SpeechBubble
- **navigation/** — Tabs, Stepper
- **feedback/** — Dialog, Toast, Tooltip, Progress
- **decor/** — WaveDivider, Scallop, FloatingDecor, BlobFrame

### Intentional additions
No source defined a component inventory, so this is a standard set sized to the brief. Brand-specific additions: **StoryCard** (book tile), **SpeechBubble** (character dialogue), **Stepper** (creator/checkout), **Avatar** (child profiles), **Icon** (Phosphor wrapper with RTL mirroring), and the decor family **WaveDivider, Scallop, FloatingDecor, BlobFrame** (the brief's wavy sections, scalloped edges, floating decorations and organic image frames).
