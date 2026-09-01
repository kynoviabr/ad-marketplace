# Velvet Design System R1 — Implementation Notes

Status: local implementation, awaiting human review

## Canonical location

The canonical token source is `app/globals.css`:

- `@theme` owns semantic colors and font-family aliases that Tailwind CSS v4 may expose;
- the first product `:root` block owns type roles, spacing, containers, gutters, grid, control, focus, border, radius, shadow and motion tokens;
- deterministic responsive overrides live at 1439, 1023, 767 and 479 px.

Do not add a parallel token file or a second naming family. Future components consume the canonical semantic tokens before introducing a new literal.

## Font loading

`app/layout.tsx` loads:

- Newsreader 400/500 as `--font-editorial-loaded`;
- Inter 400/500/600/700 as `--font-body-loaded`;
- Plus Jakarta Sans 400/500/600/700 as the temporary `--font-display-loaded` compatibility family.

The public contract is `--font-editorial` and `--font-ui`. `--font-body` aliases `--font-ui`. `--font-display` continues to resolve to Plus Jakarta Sans because the existing mobile navigation still consumes it. Existing `--velvet-serif` and `--public-serif` remain Georgia until their page-specific redesign releases; changing them in R1 would redesign Auth, Onboarding, Dashboard and public pages implicitly.

## Legacy alias strategy

Safe aliases now point to canonical roles, including:

- `--color-background → --color-bg`;
- `--color-surface-muted → --color-surface-alt`;
- `--color-foreground → --color-text-primary`;
- `--color-foreground-muted → --color-text-secondary`;
- `--color-error → --color-danger`;
- `--font-body → --font-ui`;
- `--velvet-aubergine-deep → --color-brand-deep`;
- `--velvet-sans → --font-ui`.

The remaining `--velvet-*` and `--public-*` palette/serif literals are compatibility tokens, not new design decisions. They remain temporarily because current surfaces depend on their exact appearance.

## Opt-in layout utilities

R1 introduces without applying them to existing pages:

- `.velvet-container-reading`;
- `.velvet-container-content`;
- `.velvet-container-market`;
- `.velvet-container-wide`;
- `.velvet-grid`;
- `.velvet-interactive-target`.

Later releases may migrate one approved surface at a time. Page composition must not be changed merely to demonstrate the utilities.

## How future components consume tokens

- Editorial roles use the complete `text/leading/weight/tracking/family` role set, for example `--text-h1` with `--leading-h1` and `--family-h1`.
- Product copy and controls use `--font-ui`; editorial headings use `--font-editorial`.
- Actions use `--color-brand`; olive `--color-accent` is storytelling color, not a CTA.
- Controls use `--control-h`, `--control-h-mobile`, `--target-min` and the global focus treatment.
- Page layouts use a named container and `--gutter-page`; grids use `--gutter-grid`.
- New spacing uses `--space-1` through `--space-10`. Existing page spacing migrates only during the relevant visual release.

## Specimen decision

No specimen route was created. The repository has no Storybook or dedicated visual-fixture infrastructure, and a route would expand R1's public/build surface. The focused contract test validates the complete token interface; visual specimens should be created as a non-indexed review surface only when a later release establishes dedicated visual-regression infrastructure.
