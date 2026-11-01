# Nits Cut spacing and layout tokens

These are hand-authored Task 2 foundations, prepared before scaffolding. They extend the Task 1 colours, typography and shadows. They are not a new Figma export and do not change the Task 1 evidence or generated CSS.

## Files and ownership

- Extension: `task-02-repository-and-scaffold/tokens/nc-layout-tokens.css`.
- Existing generated foundation: `task-01-design-system/tokens/generated/nc-tokens.css`.
- Source for existing values: `task-01-design-system/screen/styles.css`.

Load the generated foundation first, this extension second, then application styles. During scaffolding, configure Express to serve the intended CSS assets and verify their URLs. Do not assume a filesystem path is already a public URL. Keep this file outside the generated directory so running the Task 1 converter cannot erase it.

## Spacing

The scale uses rem so spacing follows the root font size. The suffix represents quarter-rem units: `space-4` is 1rem, `space-6` is 1.5rem, and `space-0-5` is 0.125rem. Small intermediate values preserve the existing screen's badge and detail spacing rather than silently changing the design.

| Purpose | Token | Value |
|---|---|---|
| Page sides | `--nc-page-padding-inline` | 1.5rem |
| Page top and bottom | `--nc-page-padding-block` | 2rem |
| Compact page sides | `--nc-page-padding-inline-compact` | 1rem |
| Compact page top and bottom | `--nc-page-padding-block-compact` | 1.25rem |
| Card padding | `--nc-card-padding` | 1.25rem |
| Layout gap | `--nc-layout-gap` | 1.25rem |
| Gap between controls | `--nc-control-gap` | 0.625rem |
| Button vertical padding | `--nc-button-padding-block` | 0.625rem |
| Button horizontal padding | `--nc-button-padding-inline` | 1rem |
| Badge vertical padding | `--nc-badge-padding-block` | 0.25rem |
| Badge horizontal padding | `--nc-badge-padding-inline` | 0.625rem |

Use named purpose tokens where one fits. Other margins and gaps may use the spacing scale. Do not force every badge to have the same padding: the stage badge in Task 1 used 0.1875rem vertically and 0.5rem horizontally, both available in the scale.

## Corners and widths

| Purpose | Token | Value | Reason |
|---|---|---|---|
| Button corners | `--nc-radius-button` | 0.5rem | Retains the existing buttons |
| Stage corners | `--nc-radius-stage` | 0.625rem | Retains the stage panels |
| Header and banner corners | `--nc-radius-panel` | 0.75rem | Retains the existing panels |
| Card corners | `--nc-radius-card` | 0.875rem | Retains the existing cards |
| Pill badges | `--nc-radius-pill` | 999px | Produces capsule ends |
| Main content maximum | `--nc-layout-content-max` | 68rem | Existing desktop container |
| Supporting copy maximum | `--nc-layout-copy-max` | 46rem | Existing introductory copy |
| Main heading maximum | `--nc-layout-heading-max` | 22ch | New starting limit for a deliberate heading shape |

The heading limit is a proposal, not a tested result. A ch unit relates to the font's zero-character width, not an exact letter count. Test the actual heading at three widths during Task 2 and adjust this token if needed. Maximum widths should constrain fluid content; do not make the page a fixed-width box.

## Responsive fluid typography tokens

When scaling the main display headline smoothly across mobile, tablet, and desktop viewports without abrupt breakpoint jumps, we avoid ad-hoc inline `clamp()` calculations by defining explicit layout tokens that respect Task 1 tokens:

| Purpose | Token | Value | Reason |
|---|---|---|---|
| Fluid display size | `--nc-type-display-fluid-size` | `clamp(2rem, 3.5vw + 1rem, var(--nc-type-display-large-size))` | Scales between mobile (2rem) and Task 1 `--nc-type-display-large-size` (3.5625rem) |
| Fluid display line-height | `--nc-type-display-fluid-line-height` | `1.15` | Proportional line-height for multi-line wrapped headings |

These tokens are defined in `nc-layout-tokens.css` and consumed by `.hero-title` in `app.css`.

## Borders and keyboard focus

`--nc-border-width` retains the existing 1px borders. Choose a semantic colour: `--nc-color-outline` for essential boundaries and `--nc-color-outline-variant` only for decorative separators.

The 2px focus width and 2px offset are new starting choices. Use them for visible keyboard focus, then check contrast, clipping and visibility in both themes. Dimensions alone do not establish accessibility compliance.

```css
.page {
  max-inline-size: var(--nc-layout-content-max);
  margin-inline: auto;
  padding: var(--nc-page-padding-block) var(--nc-page-padding-inline);
}
.hero-title {
  max-inline-size: var(--nc-layout-heading-max);
}
.button {
  padding: var(--nc-button-padding-block) var(--nc-button-padding-inline);
  border: var(--nc-border-width) solid var(--nc-color-outline);
  border-radius: var(--nc-radius-button);
}
.button:focus-visible {
  outline: var(--nc-focus-ring-width) solid var(--nc-color-primary);
  outline-offset: var(--nc-focus-ring-offset);
}
```

Apply the appropriate existing Task 1 label class to each button too. Check the focus colour against the actual adjacent surfaces; change the semantic role if it is unsuitable.

## Rules for the scaffold agent

1. Use this file for reusable spacing, corner, width and border decisions. Continue using Task 1 semantic colour roles, text styles and shadows.
2. Raw values belong in token definitions. Keywords such as `auto`, `flex`, `none` and `solid`, and structural rules such as `box-sizing`, are not missing design tokens.
3. Ordinary CSS custom properties cannot be substituted directly into media-query conditions. If retaining the existing 48rem breakpoint, document that explicit exception in application CSS and here; do not write `@media (max-width: var(...))`. A build-time breakpoint mechanism is an alternative if the chosen stack already supplies one.
4. If the scaffold needs another reusable dimension, add a documented token instead of inventing a value inside each component. This small extension does not claim to cover every future screen or responsive type rule.
5. Do not change the user's chosen typography or use fixed button widths and heights. Padding and text determine button dimensions; verify usable interaction targets separately.
6. Verify actual rendering in both themes and at narrow widths when the scaffold is built. These tokens alone have not been tested in a new application.

## Preparation verification

The token file was checked for duplicate names, missing references, balanced braces and accidental definitions of Task 1 colour or typography tokens. The existing Task 1 validator was rerun separately. No application, server, database or new screen was created as part of this preparation.
