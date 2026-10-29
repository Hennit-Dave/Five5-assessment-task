# Nits Cut — M3 colour mapping

Status: colour variables and palette/role sheets were created and visually checked in Figma. Source colour calculations were generated locally; the prepared JSON is not the required complete Figma export. Palette presentation simplified on 2026-10-29.

## Method

Generated with Google Material Color Utilities 0.3.0, pinned for reproducibility. Uses the M3 Tonal Spot scheme available in that version, not the newer 2026 specification. Primary is adjusted to source hue/chroma and primary/40 is explicitly overridden to the brand hex. Secondary, tertiary, neutral, neutral variant and error derive from the Tonal Spot scheme. Success and warning are custom HCT extensions.

The source #334DAF has measured HCT tone 36.19. Original generated primary/40 was #4F5B92. Brand-hue/chroma HCT tone 40 is #3D57B9. Final primary/40 is #334DAF, a documented exception. Do not claim its measured tone equals 40.

There are 192 primitive variables, 49 core/compatibility roles and eight extension roles in each mode. 24 base tones cover ordinary accent, fixed and surface roles; any additional algorithm-selected tones are retained exactly. Background/on-background/surface-variant are compatibility roles. Outline-variant is a low-emphasis divider, not a text or sole control-boundary colour. Shadow and scrim are black role colours with opacity determined by usage; surface-tint is an overlay role, not body text.

## Role mapping

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

## Contrast checks

These measure opaque sRGB pairs, not arbitrary combinations, focus indicators or state-layer compositing. Thresholds: 4.5:1 normal text and 3:1 control boundary. Any failed pair below is not approved for the stated purpose.

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

## Figma implementation and evidence

The NC · M3 Colour roles collection references NC · M3 Primitives through aliases, with Light and Dark modes. The separate plugin material-theme collection is not a dependency of these sheets.

The captured before state is source-hue/chroma Primary 40 #3D57B9, not the default Tonal Spot #4F5B92. The after state is the exact brand override #334DAF. Other tones did not change during that pinning step. Existing before/after captures are preserved in evidence/01-palette-before-pin.png and evidence/02-palette-after-pin.png.

## Notes moved off the palette sheet

- Generation: M3 / Google Material Color Utilities 0.3.0, using HCT palettes with a documented brand override.
- Primary uses the source hue/chroma. Other core palettes use Tonal Spot. Success and warning are custom extensions.
- There are 24 tones per family and 192 editable primitive variables; these provide the tones used by the Light/Dark surface and accent roles.
- Primary 40 is the token name. The pinned #334DAF has measured HCT tone 36.19; it is an intentional exception, not an exact measured tone 40.
- Inspiration: user-supplied six-blue palette credited to @The_Pensiler; do not claim original authorship of the inspiration palette.
- Layout reference: the learner's Practice Canvas example, https://www.figma.com/design/jKtu8ENQaKkq63uRwfE828?node-id=173-3 .

The palette sheet keeps its title, colour-family names, tone numbers, hex values and a short after-pin label. This is a presentation cleanup; colour values and aliases are unchanged. Earlier screenshots retain their original annotations and are not overwritten.

The Tokens Studio JSON remains a prepared interchange file, not a tested import or a complete assessment export of colours, typography and effects.

## Sources

- https://github.com/material-foundation/material-color-utilities
- https://m3.material.io/styles/color/the-color-system
- https://codelabs.developers.google.com/customizing-material-color

Palette inspiration was user supplied and visibly credited to @The_Pensiler. No interview, personal rationale, or assessment evidence has been invented.
