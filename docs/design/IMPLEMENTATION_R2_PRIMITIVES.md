# Velvet Design System R2 — Shared Primitives

Status: local implementation, awaiting human review

## Scope

R2 adds opt-in product primitives without migrating or recomposing existing pages:

- `VelvetButton`: primary, secondary, text and danger;
- `VelvetField`: persistent label, hint, error and accessible relationships;
- `VelvetBadge`: neutral, verified, success, warning and danger;
- `VelvetSectionHeader`: eyebrow, semantic heading, description and action;
- `VelvetEmptyState`: honest state, explanation and optional recovery action;
- CSS contracts for product links, navigation links and selectable chips.

All primitives consume the R1 semantic tokens in `app/globals.css`. They use flat, border-led surfaces, 14–16 px functional text, 44 px minimum targets and the canonical focus ring.

## Compatibility strategy

The existing `.btn`, `.input`, `.label` and page-specific primitives remain untouched. Current Auth, Onboarding, public and Admin pages therefore keep their approved pre-redesign composition. Later releases migrate one surface at a time to the `velvet-*` contract under visual review.

R2 does not change routes, copy catalogs, business behavior, API contracts, analytics, KYC, publication or database state.

## Accessibility decisions

- Loading buttons preserve their localized visible label and width while adding `aria-busy` and a decorative spinner.
- Fields always receive a visible label; hints and errors are connected through `aria-describedby`.
- Invalid fields use `aria-invalid`, a danger border and a live alert message.
- Badges never encode status by color alone because caller-provided text remains mandatory.
- Section headings use the caller-selected semantic heading level.
- Empty states use real heading/body/action structure and never fabricate content.

## Review surface

No route was added. The repository still lacks an isolated visual-fixture runner, so R2 is validated through server-rendered component contracts and CSS tests. R3 should exercise these primitives in the first human-visible migration, Header/Footer/Navigation, without changing their functional routes or locale behavior.
