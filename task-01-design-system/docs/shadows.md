# Shadows — Implemented Figma Styles

Status: created in Figma (`ws3fJaZYN6oRFm3dQMIiXm`, page `03 · Typography & shadows`) and visually reviewed on 2026-10-29. Built from the brand primary colour `#334DAF` (RGB `51, 77, 175`). Application usage remains to be tested when screens are built.

| Style | X (px) | Y (px) | Blur (px) | Spread (px) | Opacity | Planned use in Nit's Cut |
|---|---:|---:|---:|---:|---:|---|
| Soft | 0 | 2 | 8 | 0 | 10% | Planned for subtle card lift (e.g. order summary cards) |
| Medium | 0 | 6 | 18 | 0 | 16% | Planned for floating panels or overlays |
| Hard | 0 | 4 | 2 | 0 | 24% | Planned for deliberate strong edge emphasis; use sparingly |

*Note on values:* `Hard` means a sharper edge (`blur: 2px` at `24%` opacity), not simply a larger blur radius. These three effect styles are custom brand shadows, not Material 3 elevation presets. The black (`#000000`) `shadow` colour variable in `docs/colour-roles.md` is retained in the M3 role table for baseline completeness, but it is currently unused by these three custom `#334DAF` effect styles.

## Brand-Coloured Shadows vs. Black Shadows

Shadows using `#334DAF` add a subtle blue tint around light surfaces, connecting them to Nit's Cut’s brand colour. Black shadows darken the background without adding that blue tint; both need checking against the surface where they appear.

## Boundaries and Dark Mode

Shadows do not replace visible focus indicators or essential control boundaries. Because translucent shadows may be difficult to see in dark mode, rely on surface-container tone contrast and `outline` for essential boundaries (`outline-variant` is only for subtle, non-essential dividers).
