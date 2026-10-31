# Nit's Cut — M3 Colour Roles and Contrast

Status: colour variables and palette/role sheets were created and visually checked in Figma (`ws3fJaZYN6oRFm3dQMIiXm`, page `02 · M3 colours`). Source colour calculations were generated locally; the prepared JSON in `outputs/` is not the required complete Figma export of colours, typography, and effects. Palette presentation on the Figma canvas was simplified on 2026-10-29.

## 1. Brand Colour Origin
I selected `#334DAF` from a six-blue inspiration palette credited to `@The_Pensiler` (not claiming original authorship of that inspiration palette). I want Nit's Cut to feel dependable when presenting order dates and payment records.

## 2. Pinning Primary 40 and Visible Difference
Generated with Google Material Color Utilities (MCU) `0.3.0`, pinned for reproducibility, using the M3 Tonal Spot scheme available in that version (not claiming the newer 2026 specification).

In our Material Color Utilities `0.3.0` Tonal Spot configuration, an unadjusted Tonal Spot scheme derived from `#334DAF` produces `#4F5B92` at `primary/40`. Even after locking the Primary palette to the source colour's hue and chroma, the calculated HCT tone 40 is `#3D57B9` because `#334DAF` has a measured HCT tone of `36.19`. To preserve the exact brand colour, `primary/40` is explicitly overridden to `#334DAF` as a documented HCT-tone exception (do not claim its measured tone equals 40).

**Visible difference (`evidence/01-palette-before-pin.png` vs `evidence/02-palette-after-pin.png`):**
In `01-palette-before-pin.png`, the `primary/40` swatch shows the calculated tone-40 blue (`#3D57B9`), which looks noticeably brighter and lighter than the source swatch on the left. In `02-palette-after-pin.png`, `primary/40` is pinned to the exact brand hex `#334DAF`, making the `40` cell visibly deeper and darker (sitting closer in lightness to `primary/30` `#213DA0`), while the remaining 23 tones in the `primary` row and all other palette rows remain unchanged. Because the Light-mode `primary` role aliases `primary/40`, Light-mode components assigned the `primary` role will use this exact `#334DAF` blue rather than a lighter or muted algorithmic substitute.

## 3. Tonal Palettes (24 Tones per Family)
There are 192 primitive variables across eight colour families (`primary`, `secondary`, `tertiary`, `neutral`, `neutral-variant`, `error`, `warning`, `success`), each with 24 tones (`0, 4, 6, 10, 12, 17, 20, 22, 24, 30, 40, 50, 60, 70, 80, 87, 90, 92, 94, 95, 96, 98, 99, 100`).

- **Source derivation:** `primary` uses the `#334DAF` source hue/chroma (with `primary/40` pinned to `#334DAF`). `secondary`, `tertiary`, `neutral`, `neutral-variant`, and `error` derive from the MCU `0.3.0` Tonal Spot scheme. `success` and `warning` are custom HCT extensions generated from separately chosen green and amber source colours—all eight families do not derive solely from the brand blue.
- **Why 24 tones suffice for Light and Dark modes:** Light and Dark modes select different tones from the same palettes (for example, Light mode maps `primary` to `primary/40` and `on-primary` to `primary/100`, whereas Dark mode maps `primary` to `primary/80` and `on-primary` to `primary/20`, while surfaces draw from fine dark steps `4–24` and light steps `87–100`). These 24 tones cover every reference used by our current 57 role mappings across both modes; they are sufficient for this system, not a universal M3 requirement.

## 4. Functional Colours (Proposed Usage Rules)
Because Nit's Cut has not yet been built as a running application, the following are **proposed usage rules** for our functional colour families:
- **Error (`error`, `on-error`, `error-container`, `on-error-container`):** For failed operations and invalid user inputs, such as an invalid payment amount or a missing required measurement field. (Late orders are a business status rather than an input error.)
- **Warning (`warning`, `on-warning`, `warning-container`, `on-warning-container`):** For schedule delays with a clear reason (for example, *"Delivery delayed — power outage"*) or when an unpaid balance reaches a defined payment deadline that makes it actionable.
- **Success (`success`, `on-success`, `success-container`, `on-success-container`):** For completed milestones, such as an outfit marked *"Ready for collection"* or a payment recorded as fully settled.

## 5. Semantic Colour Roles — Planned Uses in Nit's Cut
A colour role defines a job in the interface, not a raw colour value. Every role in the `NC · M3 Colour roles` collection aliases a primitive in `NC · M3 Primitives`. Any `on-*` role (such as `on-primary` or `on-surface`) means the text and icons placed directly on top of that matching background role, not a separate standalone action colour.

- **Surfaces (`surface`, `surface-dim`, `surface-bright`, `surface-container-lowest` to `highest`, `background`):** Planned for page backgrounds, order summary cards, measurement tables, and payment history panels. `background`, `on-background`, and `surface-variant` are retained as M3 compatibility roles.
- **On-surface text (`on-surface`, `on-surface-variant`, `on-background`):** `on-surface` is for primary reading text (client names, garment stages, agreed dates, and amounts). `on-surface-variant` is for secondary labels and supporting metadata.
- **Primary (`primary`, `on-primary`, `primary-container`, `on-primary-container`, `primary-fixed*`):** `primary` is for main high-emphasis actions, with `on-primary` for the text/icon sitting on that `primary` fill. `primary-container` and `on-primary-container` are for softer highlighted states, such as the active stage in an order progress tracker.
- **Secondary and Tertiary (`secondary*`, `tertiary*`):** `secondary` roles are planned for supporting UI elements like garment-type chips or filters (native wear, trousers, shirts). `tertiary` roles are planned for complementary highlights such as upcoming fitting reminders.
- **Outlines (`outline`, `outline-variant`):** `outline` is for essential control boundaries such as form input borders (meeting at least 3:1 contrast against surfaces). `outline-variant` is a low-emphasis divider between list rows and must not be used for text or as the sole boundary of an interactive control.
- **Utility and Inverse roles (`inverse-surface`, `inverse-on-surface`, `inverse-primary`, `surface-tint`, `scrim`, `shadow`):** Inverse roles are for high-contrast snackbars or banners. `surface-tint` is an elevation overlay colour, `scrim` is a modal backdrop colour with opacity applied in usage, and `shadow` (`#000000`) is retained only as an M3 baseline compatibility token (Nit's Cut component elevation styles instead use the custom `#334DAF` brand shadows documented in `docs/shadows.md`).

### Role Mapping Table

| Role | Light primitive | Light hex | Dark primitive | Dark hex |
|---|---|---|---|---|
| background | neutral/98 | #FBF8FF | neutral/6 | #121318 |
| on-background | neutral/10 | #1B1B21 | neutral/90 | #E3E1E9 |
| surface | neutral/98 | #FBF8FF | neutral/6 | #121318 |
| surface-dim | neutral/87 | #DBD9E0 | neutral/6 | #121318 |
| surface-bright | neutral/98 | #FBF8FF | neutral/24 | #38393F |
| surface-container-lowest | neutral/100 | #FFFFFF | neutral/4 | #0D0E13 |
| surface-container-low | neutral/96 | #F5F2FA | neutral/10 | #1B1B21 |
| surface-container | neutral/94 | #EFEDF4 | neutral/12 | #1F1F25 |
| surface-container-high | neutral/92 | #E9E7EF | neutral/17 | #292A2F |
| surface-container-highest | neutral/90 | #E3E1E9 | neutral/22 | #34343A |
| on-surface | neutral/10 | #1B1B21 | neutral/90 | #E3E1E9 |
| surface-variant | neutral-variant/90 | #E2E1EC | neutral-variant/30 | #45464F |
| on-surface-variant | neutral-variant/30 | #45464F | neutral-variant/80 | #C6C5D0 |
| inverse-surface | neutral/20 | #2F3036 | neutral/90 | #E3E1E9 |
| inverse-on-surface | neutral/95 | #F2F0F7 | neutral/20 | #2F3036 |
| outline | neutral-variant/50 | #767680 | neutral-variant/60 | #90909A |
| outline-variant | neutral-variant/80 | #C6C5D0 | neutral-variant/30 | #45464F |
| shadow | neutral/0 | #000000 | neutral/0 | #000000 |
| scrim | neutral/0 | #000000 | neutral/0 | #000000 |
| surface-tint | primary/40 | #334DAF | primary/80 | #B8C4FF |
| primary | primary/40 | #334DAF | primary/80 | #B8C4FF |
| on-primary | primary/100 | #FFFFFF | primary/20 | #002585 |
| primary-container | primary/90 | #DDE1FF | primary/30 | #213DA0 |
| on-primary-container | primary/30 | #213DA0 | primary/90 | #DDE1FF |
| inverse-primary | primary/80 | #B8C4FF | primary/40 | #334DAF |
| secondary | secondary/40 | #5A5D72 | secondary/80 | #C2C5DD |
| on-secondary | secondary/100 | #FFFFFF | secondary/20 | #2C2F42 |
| secondary-container | secondary/90 | #DFE1F9 | secondary/30 | #424659 |
| on-secondary-container | secondary/30 | #424659 | secondary/90 | #DFE1F9 |
| tertiary | tertiary/40 | #75546E | tertiary/80 | #E4BAD9 |
| on-tertiary | tertiary/100 | #FFFFFF | tertiary/20 | #43273F |
| tertiary-container | tertiary/90 | #FFD7F4 | tertiary/30 | #5C3D56 |
| on-tertiary-container | tertiary/30 | #5C3D56 | tertiary/90 | #FFD7F4 |
| error | error/40 | #BA1A1A | error/80 | #FFB4AB |
| on-error | error/100 | #FFFFFF | error/20 | #690005 |
| error-container | error/90 | #FFDAD6 | error/30 | #93000A |
| on-error-container | error/30 | #93000A | error/90 | #FFDAD6 |
| primary-fixed | primary/90 | #DDE1FF | primary/90 | #DDE1FF |
| primary-fixed-dim | primary/80 | #B8C4FF | primary/80 | #B8C4FF |
| on-primary-fixed | primary/10 | #001454 | primary/10 | #001454 |
| on-primary-fixed-variant | primary/30 | #213DA0 | primary/30 | #213DA0 |
| secondary-fixed | secondary/90 | #DFE1F9 | secondary/90 | #DFE1F9 |
| secondary-fixed-dim | secondary/80 | #C2C5DD | secondary/80 | #C2C5DD |
| on-secondary-fixed | secondary/10 | #171B2C | secondary/10 | #171B2C |
| on-secondary-fixed-variant | secondary/30 | #424659 | secondary/30 | #424659 |
| tertiary-fixed | tertiary/90 | #FFD7F4 | tertiary/90 | #FFD7F4 |
| tertiary-fixed-dim | tertiary/80 | #E4BAD9 | tertiary/80 | #E4BAD9 |
| on-tertiary-fixed | tertiary/10 | #2C1229 | tertiary/10 | #2C1229 |
| on-tertiary-fixed-variant | tertiary/30 | #5C3D56 | tertiary/30 | #5C3D56 |
| success | success/40 | #1F6C3A | success/80 | #8BD79B |
| on-success | success/100 | #FFFFFF | success/20 | #003918 |
| success-container | success/90 | #A6F4B5 | success/30 | #005226 |
| on-success-container | success/10 | #00210B | success/90 | #A6F4B5 |
| warning | warning/40 | #8C4F14 | warning/80 | #FFB77D |
| on-warning | warning/100 | #FFFFFF | warning/20 | #4D2600 |
| warning-container | warning/90 | #FFDCC3 | warning/30 | #6E3900 |
| on-warning-container | warning/10 | #2F1500 | warning/90 | #FFDCC3 |

## 6. Contrast Checks and Restricted Pairs

All 116 tested opaque colour pairs below meet their selected contrast thresholds: `4.5:1` for normal text and `3:1` for essential control boundaries. This does not establish full application accessibility; actual text sizes, interactive states, translucent overlays, focus indicators, and component usage still need testing when screens are built.

**Pairs below threshold / explicitly not used for text or essential boundaries:**
- `outline-variant / surface`: measures `1.66:1` in Light mode (`#C6C5D0` on `#FBF8FF`) and `1.97:1` in Dark mode (`#45464F` on `#121318`). Because this is below both `4.5:1` and `3:1`, `outline-variant` is documented as decorative/divider-only and must never be used for text or required form input borders.
- `surface-tint`, `scrim`, and `shadow`: non-text overlay/backdrop roles; never paired as text foregrounds.
- Container-on-surface combinations (e.g. `primary-container` `#DDE1FF` on `surface` `#FBF8FF`): low-contrast surface fills intended to hold `on-*-container` text, never used as text colours themselves.

| Mode | Foreground / background | Ratio | Minimum | Result |
|---|---|---:|---:|---|
| Light | on-primary / primary | 7.443 | 4.5 | Pass |
| Light | on-primary-container / primary-container | 7.272 | 4.5 | Pass |
| Light | primary / surface | 7.079 | 4.5 | Pass |
| Light | on-secondary / secondary | 6.475 | 4.5 | Pass |
| Light | on-secondary-container / secondary-container | 7.227 | 4.5 | Pass |
| Light | secondary / surface | 6.158 | 4.5 | Pass |
| Light | on-tertiary / tertiary | 6.462 | 4.5 | Pass |
| Light | on-tertiary-container / tertiary-container | 7.213 | 4.5 | Pass |
| Light | tertiary / surface | 6.146 | 4.5 | Pass |
| Light | on-error / error | 6.461 | 4.5 | Pass |
| Light | on-error-container / error-container | 7.239 | 4.5 | Pass |
| Light | error / surface | 6.145 | 4.5 | Pass |
| Light | on-success / success | 6.433 | 4.5 | Pass |
| Light | on-success-container / success-container | 13.277 | 4.5 | Pass |
| Light | success / surface | 6.118 | 4.5 | Pass |
| Light | on-warning / warning | 6.474 | 4.5 | Pass |
| Light | on-warning-container / warning-container | 13.254 | 4.5 | Pass |
| Light | warning / surface | 6.158 | 4.5 | Pass |
| Light | on-surface / surface | 16.3 | 4.5 | Pass |
| Light | on-surface-variant / surface | 8.908 | 4.5 | Pass |
| Light | outline / surface | 4.274 | 3 | Pass |
| Light | on-surface / surface-dim | 12.253 | 4.5 | Pass |
| Light | on-surface-variant / surface-dim | 6.696 | 4.5 | Pass |
| Light | outline / surface-dim | 3.213 | 3 | Pass |
| Light | on-surface / surface-bright | 16.3 | 4.5 | Pass |
| Light | on-surface-variant / surface-bright | 8.908 | 4.5 | Pass |
| Light | outline / surface-bright | 4.274 | 3 | Pass |
| Light | on-surface / surface-container-lowest | 17.138 | 4.5 | Pass |
| Light | on-surface-variant / surface-container-lowest | 9.367 | 4.5 | Pass |
| Light | outline / surface-container-lowest | 4.494 | 3 | Pass |
| Light | on-surface / surface-container-low | 15.476 | 4.5 | Pass |
| Light | on-surface-variant / surface-container-low | 8.458 | 4.5 | Pass |
| Light | outline / surface-container-low | 4.058 | 3 | Pass |
| Light | on-surface / surface-container | 14.763 | 4.5 | Pass |
| Light | on-surface-variant / surface-container | 8.069 | 4.5 | Pass |
| Light | outline / surface-container | 3.871 | 3 | Pass |
| Light | on-surface / surface-container-high | 13.989 | 4.5 | Pass |
| Light | on-surface-variant / surface-container-high | 7.646 | 4.5 | Pass |
| Light | outline / surface-container-high | 3.668 | 3 | Pass |
| Light | on-surface / surface-container-highest | 13.231 | 4.5 | Pass |
| Light | on-surface-variant / surface-container-highest | 7.231 | 4.5 | Pass |
| Light | outline / surface-container-highest | 3.469 | 3 | Pass |
| Light | on-primary-fixed / primary-fixed | 13.263 | 4.5 | Pass |
| Light | on-primary-fixed-variant / primary-fixed | 7.272 | 4.5 | Pass |
| Light | on-primary-fixed / primary-fixed-dim | 10.079 | 4.5 | Pass |
| Light | on-primary-fixed-variant / primary-fixed-dim | 5.526 | 4.5 | Pass |
| Light | on-secondary-fixed / secondary-fixed | 13.237 | 4.5 | Pass |
| Light | on-secondary-fixed-variant / secondary-fixed | 7.227 | 4.5 | Pass |
| Light | on-secondary-fixed / secondary-fixed-dim | 10.023 | 4.5 | Pass |
| Light | on-secondary-fixed-variant / secondary-fixed-dim | 5.473 | 4.5 | Pass |
| Light | on-tertiary-fixed / tertiary-fixed | 13.282 | 4.5 | Pass |
| Light | on-tertiary-fixed-variant / tertiary-fixed | 7.213 | 4.5 | Pass |
| Light | on-tertiary-fixed / tertiary-fixed-dim | 10.055 | 4.5 | Pass |
| Light | on-tertiary-fixed-variant / tertiary-fixed-dim | 5.461 | 4.5 | Pass |
| Light | inverse-on-surface / inverse-surface | 11.637 | 4.5 | Pass |
| Light | inverse-primary / inverse-surface | 7.751 | 4.5 | Pass |
| Light | on-background / background | 16.3 | 4.5 | Pass |
| Light | on-surface-variant / surface-variant | 7.232 | 4.5 | Pass |
| Dark | on-primary / primary | 7.72 | 4.5 | Pass |
| Dark | on-primary-container / primary-container | 7.272 | 4.5 | Pass |
| Dark | primary / surface | 10.934 | 4.5 | Pass |
| Dark | on-secondary / secondary | 7.74 | 4.5 | Pass |
| Dark | on-secondary-container / secondary-container | 7.227 | 4.5 | Pass |
| Dark | secondary / surface | 10.887 | 4.5 | Pass |
| Dark | on-tertiary / tertiary | 7.7 | 4.5 | Pass |
| Dark | on-tertiary-container / tertiary-container | 7.213 | 4.5 | Pass |
| Dark | tertiary / surface | 10.887 | 4.5 | Pass |
| Dark | on-error / error | 7.717 | 4.5 | Pass |
| Dark | on-error-container / error-container | 7.239 | 4.5 | Pass |
| Dark | error / surface | 10.926 | 4.5 | Pass |
| Dark | on-success / success | 7.69 | 4.5 | Pass |
| Dark | on-success-container / success-container | 7.262 | 4.5 | Pass |
| Dark | success / surface | 10.857 | 4.5 | Pass |
| Dark | on-warning / warning | 7.736 | 4.5 | Pass |
| Dark | on-warning-container / warning-container | 7.24 | 4.5 | Pass |
| Dark | warning / surface | 10.884 | 4.5 | Pass |
| Dark | on-surface / surface | 14.322 | 4.5 | Pass |
| Dark | on-surface-variant / surface | 10.864 | 4.5 | Pass |
| Dark | outline / surface | 5.867 | 3 | Pass |
| Dark | on-surface / surface-dim | 14.322 | 4.5 | Pass |
| Dark | on-surface-variant / surface-dim | 10.864 | 4.5 | Pass |
| Dark | outline / surface-dim | 5.867 | 3 | Pass |
| Dark | on-surface / surface-bright | 8.883 | 4.5 | Pass |
| Dark | on-surface-variant / surface-bright | 6.738 | 4.5 | Pass |
| Dark | outline / surface-bright | 3.639 | 3 | Pass |
| Dark | on-surface / surface-container-lowest | 14.883 | 4.5 | Pass |
| Dark | on-surface-variant / surface-container-lowest | 11.29 | 4.5 | Pass |
| Dark | outline / surface-container-lowest | 6.097 | 3 | Pass |
| Dark | on-surface / surface-container-low | 13.231 | 4.5 | Pass |
| Dark | on-surface-variant / surface-container-low | 10.037 | 4.5 | Pass |
| Dark | outline / surface-container-low | 5.42 | 3 | Pass |
| Dark | on-surface / surface-container | 12.657 | 4.5 | Pass |
| Dark | on-surface-variant / surface-container | 9.601 | 4.5 | Pass |
| Dark | outline / surface-container | 5.185 | 3 | Pass |
| Dark | on-surface / surface-container-high | 11.055 | 4.5 | Pass |
| Dark | on-surface-variant / surface-container-high | 8.386 | 4.5 | Pass |
| Dark | outline / surface-container-high | 4.529 | 3 | Pass |
| Dark | on-surface / surface-container-highest | 9.547 | 4.5 | Pass |
| Dark | on-surface-variant / surface-container-highest | 7.242 | 4.5 | Pass |
| Dark | outline / surface-container-highest | 3.911 | 3 | Pass |
| Dark | on-primary-fixed / primary-fixed | 13.263 | 4.5 | Pass |
| Dark | on-primary-fixed-variant / primary-fixed | 7.272 | 4.5 | Pass |
| Dark | on-primary-fixed / primary-fixed-dim | 10.079 | 4.5 | Pass |
| Dark | on-primary-fixed-variant / primary-fixed-dim | 5.526 | 4.5 | Pass |
| Dark | on-secondary-fixed / secondary-fixed | 13.237 | 4.5 | Pass |
| Dark | on-secondary-fixed-variant / secondary-fixed | 7.227 | 4.5 | Pass |
| Dark | on-secondary-fixed / secondary-fixed-dim | 10.023 | 4.5 | Pass |
| Dark | on-secondary-fixed-variant / secondary-fixed-dim | 5.473 | 4.5 | Pass |
| Dark | on-tertiary-fixed / tertiary-fixed | 13.282 | 4.5 | Pass |
| Dark | on-tertiary-fixed-variant / tertiary-fixed | 7.213 | 4.5 | Pass |
| Dark | on-tertiary-fixed / tertiary-fixed-dim | 10.055 | 4.5 | Pass |
| Dark | on-tertiary-fixed-variant / tertiary-fixed-dim | 5.461 | 4.5 | Pass |
| Dark | inverse-on-surface / inverse-surface | 10.153 | 4.5 | Pass |
| Dark | inverse-primary / inverse-surface | 5.747 | 4.5 | Pass |
| Dark | on-background / background | 14.322 | 4.5 | Pass |
| Dark | on-surface-variant / surface-variant | 5.485 | 4.5 | Pass |

## Figma Implementation and Provenance

The `NC · M3 Colour roles` collection references `NC · M3 Primitives` through aliases, with Light and Dark modes. The separate plugin `material-theme` collection is not a dependency of these sheets.

The captured before state (`evidence/01-palette-before-pin.png`) shows source-hue/chroma `primary/40` `#3D57B9`, not the default Tonal Spot `#4F5B92`. The after state (`evidence/02-palette-after-pin.png`) shows the exact brand override `#334DAF`. Other tones did not change during that pinning step.

The palette sheet on the Figma canvas (`evidence/palette-after-pin-clean-layout.png`) keeps its title, colour-family names, tone numbers, hex values, and a short after-pin label. Layout reference: the learner's Practice Canvas example (`https://www.figma.com/design/jKtu8ENQaKkq63uRwfE828?node-id=173-3`).

The Tokens Studio JSON in `outputs/` remains a prepared interchange file, not a tested import or a complete assessment export of colours, typography, and effects.

## Deliberate Regression Proof (Step 8)

When we changed the `--nc-ref-primary-*` palette at the source from royal blue (`#334DAF` at tone 40) to emerald green (`#006D3B` at tone 40), every role still referencing the palette via `var()`—including `--nc-color-primary` on the `NC` badge, eyebrow, active-stage border, `Active` pill, and primary button, plus `--nc-color-on-primary-container` on the active stage text—updated automatically across the screen. Because `--nc-color-primary-container` had been broken to point at the raw hex `#213DA0` instead of `var(--nc-ref-primary-30)`, the `Being sewn` status pill and active stage card background stayed stuck in the old royal blue underneath green borders, green badges, and mint-green text (`evidence/11-broken-referencing.png`). That visual split is the whole argument for token referencing: when roles alias primitives and components consume only roles, a palette or theme change updates the entire interface from one place instead of leaving orphaned colours behind or forcing a manual search-and-replace across the codebase.

## Sources

- https://github.com/material-foundation/material-color-utilities
- https://m3.material.io/styles/color/the-color-system
- https://codelabs.developers.google.com/customizing-material-color
