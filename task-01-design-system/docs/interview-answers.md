# Task 1 — Interview Defence (`docs/interview-answers.md`)

All twelve answers below are grounded in the Nit's Cut design system and stay under the 200-word limit per question.

---

## 1. How would you structure design tokens?

I structure tokens in layers so raw values are separated from how the interface uses them.

In Nit's Cut (`tokens/generated/nc-tokens.css`), the bottom layer is **primitive tokens** (`--nc-ref-*`): 192 raw hex values across eight 24-tone palettes (`primary`, `secondary`, `tertiary`, `neutral`, `neutral-variant`, `error`, `success`, `warning`), such as `--nc-ref-primary-40: #334DAF`. Component stylesheets never reference `--nc-ref-*` directly.

The second layer is **semantic role tokens** (`--nc-color-*`), plus **typography** (`--nc-type-*`) and **elevation** (`--nc-shadow-*`) tokens. Semantic roles describe a job in the interface—such as `--nc-color-surface`, `--nc-color-on-surface`, `--nc-color-primary-container`, or `--nc-color-warning`—and alias primitive tokens via `var()`.

When needed in a larger codebase, a third **component token** layer (for example, `--nc-badge-active-bg: var(--nc-color-primary)`) can sit on top of semantic roles. Keeping primitives private and exposing semantic roles to components means a palette tweak or theme switch happens in the mapping layer without editing component CSS.

---

## 2. When is a token change breaking?

A token change is breaking whenever existing consumers fail to render as intended or violate accessibility and layout assumptions without changing their own code.

First, **renaming, deleting, or changing the type** of a consumed token (for example, removing `--nc-color-warning-container`) breaks declarations that depend on it. A missing variable uses its supplied fallback; without a valid fallback, the declaration becomes invalid.

Second, **semantic or behavioural shifts** can be breaking even when the token name stays the same:
- **Contrast regressions:** If `--nc-color-primary` or `--nc-color-on-primary` is remapped to a tone pair that drops below WCAG AA (`4.5:1` for normal text), components using that pair fail contrast requirements.
- **Role inversion:** Changing a subtle container role to a high-emphasis accent alters visual hierarchy across every consuming screen.
- **Metric changes:** Increasing a typography token's `font-size`, `line-height`, or `letter-spacing` enough to clip badges or wrap headers breaks layout geometry.

Even when a colour change still passes contrast (such as pinning `primary/40` from `#3D57B9` to `#334DAF` at `7.543:1` against `#FFFFFF`), passing contrast alone does not prove it is non-breaking—you still check its actual uses across the interface.

---

## 3. How would you support multiple brands and themes?

I bind component stylesheets strictly to semantic role names (`--nc-color-*`, `--nc-type-*`, `--nc-shadow-*`) and swap the underlying primitive palettes or role-to-tone mappings per brand and per theme selector.

- **Multiple themes (what exists now vs. what I would extend):** In Nit's Cut (`tokens/generated/nc-tokens.css`), both themes are implemented: `:root, [data-theme="light"]` and `[data-theme="dark"]` each map all 57 semantic roles to tones in the same 24-tone palettes (`docs/colour-roles.md`, `evidence/10-screen-with-system.png` vs `10c-screen-with-system-light.png`). For example, `--nc-color-surface` maps to `neutral/98` (`#FBF8FF`) in Light and `neutral/6` (`#121318`) in Dark, while `--nc-color-primary` maps to `primary/40` (`#334DAF`) in Light and `primary/80` (`#B8C4FF`) in Dark. Because the initial plugin export (`06-tokens-complete.json`) omitted Light mode (`D1`), we extracted both Figma modes (`19:1` and `19:2`) into `06b-tokens-colour-roles-modes-from-figma-state.json`.
- **Multiple brands:** To support additional brands (not currently implemented), each brand would supply its own primitive palette (`--nc-ref-*`), font-family variables (`--nc-type-*-family`), and shadow tint reference while preserving the same 57 semantic role names and 15 typography class names.

Components never branch on brand or theme names; they only consume `var(--nc-color-primary)`.

---

## 4. Can tokens guarantee accessible contrast?

No. Tokens make accessible contrast easier to maintain, but they cannot guarantee it on their own.

Our tests confirm that the checked opaque colour pairs meet their specified thresholds: in `docs/colour-roles.md`, we verified 116 opaque foreground/background and `outline` pairs across Light and Dark modes (58 per mode), confirming each `on-*` role passes WCAG AA (`4.5:1`) against its paired surface or container.

However, a developer or AI agent can still produce inaccessible contrast using valid tokens if they:
1. **Mis-pair roles:** Placing `--nc-color-on-surface-variant` text on `--nc-color-primary`, or pairing two container roles that were never designed to sit together.
2. **Introduce transparency or imagery:** Rendering text over translucent overlays, gradients, or garment photos where background luminance varies across the element.
3. **Hit CSS specificity bugs:** As we found and fixed in our own Defect `D8` (`screen/styles.css` lines 249–268), a higher-specificity selector (`.record-row dd`) initially overrode `.date-updated`, `.amount-paid`, and `.amount-owed` until we scoped them as `.record-row dd.<class>` and verified their rendered contrast in both Dark (`9.60:1`–`9.66:1`) and Light (`5.54:1`–`8.07:1`) modes.

Tokens must therefore be combined with pairing rules and rendered-DOM checks.

---

## 5. How do you ensure that colour contrast guidelines are met within a website or application's design?

I treat contrast checking as a three-stage process across token design, build validation, and rendered browser inspection:

1. **At the token definition stage:** Pair every surface and container role with an explicit `on-*` foreground role (`primary` with `on-primary`, `warning-container` with `on-warning-container`) and calculate WCAG 2.1 relative luminance contrast ratios across every mode before writing UI code. In Nit's Cut, we checked all 58 intended pairs in Light mode and 58 in Dark mode (`docs/colour-roles.md`), verifying at least `4.5:1` for text pairs and `3.0:1` for `outline` against surfaces, while explicitly excluding non-text roles like `scrim`, `shadow`, and `outline-variant`.
2. **At the stylesheet and build stage:** Ban raw hex/rgb values and direct primitive references (`--nc-ref-*`) in component CSS (`evidence/07-raw-value-search.txt` and `tokens/validate-css.mjs`) so components only use vetted semantic roles.
3. **In the rendered browser:** Inspect actual computed styles and states (hover, focus, disabled, status banners) using browser DevTools accessibility checks to catch mis-paired tokens or CSS specificity overrides (`D8`).

---

## 6. Can you discuss the differences between WCAG levels A, AA and AAA?

WCAG conformance levels (A, AA, and AAA) represent progressively stricter accessibility criteria:

- **Level A (minimum baseline):** Addresses basic barriers that block assistive-technology or keyboard-only users entirely—such as providing text alternatives for non-text content, keyboard operability without traps, and not relying on colour alone to convey meaning. Level A sets **no minimum numeric contrast ratio** for text.
- **Level AA (a common accessibility target):** Builds on Level A. It requires at least **`4.5:1`** contrast for normal text, **`3.0:1`** for large text (`≥ 24px` regular or `≥ 18.66px` bold), and **`3.0:1`** for essential non-text UI boundaries and user-interface components (WCAG 1.4.3 and 1.4.11), alongside layout requirements such as **Reflow** (1.4.10) and **Text Spacing** (1.4.12).
- **Level AAA (enhanced):** Requires **`7.0:1`** contrast for normal text and **`4.5:1`** for large text (WCAG 1.4.6), plus stricter criteria such as **Focus Appearance** (2.4.13) and **Sign Language (Prerecorded)** (1.2.6). While we did not target full-page AAA conformance, several Nit's Cut text pairs in `docs/colour-roles.md` exceed `7:1` (for example, Dark `on-surface` on `surface` is `14.322:1`).

---

## 7. Discuss the importance of semantic HTML in the context of accessibility.

Semantic HTML uses elements for their intended purpose (`<header>`, `<section>`, `<article>`, `<h1>`–`<h2>`, `<ol>`, `<dl>/<dt>/<dd>`, `<button>`), giving browsers and assistive technologies a meaningful accessibility tree (roles, names, and keyboard behaviour) without fragile custom scripting.

1. **Screen-reader navigation and structure:** Landmarks, headings (`<h1>` for the garment order title, `<h2>` for the three card sections), ordered lists (`<ol>` for sequential tailoring stages), and description lists (`<dl>` pairing labels like *"Remaining balance still owed"* with `<dd>` values like *"₦35,000"*) let screen-reader users navigate directly to order progress or payment records and hear key-value relationships.
2. **Built-in keyboard and focus behaviour:** Native `<button type="button">` elements (*"Confirm fitting time"*) automatically receive `Tab` focus, activate on `Enter` and `Space`, and expose a `"button"` role, whereas a styled `<div>` requires manual `tabindex`, `role`, and key handlers.
3. **Live-region support:** Setting `role="status"` on the delay banner prepares a polite live region that supports assistive-technology announcements when its content updates dynamically (though a static banner already present on initial page load does not by itself prove an announcement occurred).

---

## 8. How do you handle design handoff to developers using Figma?

Handoff should transfer a structured, verifiable system rather than leaving developers to eyeball hex codes and pixel measurements on a canvas:

1. **Separate primitives from semantic roles in Figma Variables:** In `ws3fJaZYN6oRFm3dQMIiXm`, we kept 24-tone palettes in `NC · M3 Primitives` and aliased 57 semantic roles in `NC · M3 Colour roles`, alongside named text styles (`NC/Display/*` to `NC/Label/*`) and shadow effects (`NC/Shadow/*`).
2. **Export machine-readable tokens and verify completeness:** As Step 5 showed (`05-tokens-incomplete.json` vs `06-tokens-complete.json`), a plugin export with Figma Variables unchecked silently omits colour collections; even with Variables enabled, our export only included Dark-mode role aliases (`D1`). Always diff and validate the JSON export before handing it off.
3. **Automate CSS generation and validation:** Convert the JSON into CSS custom properties (`tokens/build-css.mjs`) with an automated check (`tokens/validate-css.mjs`) that fails if references break or raw hex leaks outside `--nc-ref-*`.
4. **Provide usage rules and known constraints:** Document role jobs (`docs/colour-roles.md`), typography boundaries (`docs/type-scale.md`), and real defects (`docs/defects.md`).

---

## 9. Why do AI-generated interfaces tend to look generic, and what specifically do you hand an agent to stop it?

Without a specific brief and design constraints, an agent may reuse familiar layouts, fonts, and colours—such as default system sans-serif stacks, generic slate/indigo palettes, black drop shadows, and hardcoded hex values invented per component (`evidence/09-screen-without-system.png`).

To stop this, I hand the agent five concrete inputs:
1. **A short business brief (`docs/business-brief.md`):** Who the user is (Nit's Cut tailoring clients on mobile web), what must work (clear delivery dates and order stage), and the three customer questions the screen must answer.
2. **Generated token CSS (`tokens/generated/nc-tokens.css`) and self-hosted fonts (`screen/fonts/`):** Exposing semantic roles (`--nc-color-*`), deliberate typography classes (`Cormorant Garamond` 600 for Display/Headline, `Manrope` 400/600 for Title/Body/Label), and brand-tinted `#334DAF` shadows (`--nc-shadow-*`).
3. **Explicit usage rules (`docs/type-scale.md`, `docs/colour-roles.md`):** Restricting `Headline` (`Cormorant Garamond`) to page headers and keeping prices and dates in `Manrope`.
4. **Hard constraints in the prompt (`docs/prompts.md`):** Forbidding raw hex/rgb values and direct `--nc-ref-*` primitive usage in component CSS.
5. **Post-build verification (`07-raw-value-search.txt`, `capture-and-verify-screen.mjs`):** Checking raw values via `grep` and rendered glyphs via Chrome DevTools Protocol rather than relying on the agent's self-report (`D5`, `D6`).

---

## 10. Your line height for display large is a specific number. Why that number and not one step either side of it? What would you lose with each?

Our `Display Large` line height is **`79.8px`** (`4.9875rem`), calculated from `57px × 1.4` (`docs/type-scale.md`).

Within the assessment's required line-height formula (`font size × 1.4`, `1.5`, or `1.6`), I chose **`1.4`**—the smallest permitted multiplier—to keep `57px` `Cormorant Garamond` Semibold introductory headings relatively compact if they wrap on a smaller viewport. Because we have only tested single-line samples (`evidence/03-spacing-default.png` and `04-spacing-chosen.png`), the visual effects below are potential trade-offs that would still need a two-line comparison to verify:

- **One step higher (`× 1.5 = 85.5px`):** This adds `5.7px` per line (`11.4px` across two lines). The potential trade-off is extra vertical space at the top of a mobile screen where clients want to see their outfit's stage and collection date quickly, and a possible sense that wrapped heading lines are drifting apart.
- **One step lower (`× 1.3 = 74.1px`):** We would first lose compliance with the assessment's `1.4 / 1.5 / 1.6` formula constraint. Visually, because `Cormorant Garamond` has tall ascenders and deep descenders, a tighter multiplier could risk ascender/descender crowding when a two-line heading wraps.

---

## 11. Point at one place in your own token structure that you would build differently if you started again. Say what you would do instead and what it would cost.

I would change how **`nc · m3 colour roles` was exported in `evidence/06-tokens-complete.json` (Defects `D1` and `D2` in `docs/defects.md`)**.

In Step 5, the third-party Figma export plugin wrote only one flat alias per role under `nc · m3 colour roles` (`{nc · m3 primitives.primary.80}`), with no mode label indicating whether the export came from Light or Dark mode (`57/57` match with Dark `19:2`, `14/57` with Light `19:1`). To emit both `:root, [data-theme="light"]` and `[data-theme="dark"]` in `nc-tokens.css`, we had to extract a second file (`06b-tokens-colour-roles-modes-from-figma-state.json`) from our previously captured Figma Variables state (`work/figma-m3-state.json`) and teach `tokens/build-css.mjs` to merge two different JSON structures.

**What I would do instead:** Use an export workflow from day one that outputs an explicit structure for Light and Dark role mappings—either a single JSON file with named `Light` and `Dark` mode maps per role or separate `tokens-roles-light.json` and `tokens-roles-dark.json` exports.

**What it would cost:** Setting up and maintaining a multi-mode exporter or script, updating the converter when modes change, and roughly doubling the role-mapping block in `nc-tokens.css` (from 57 to 114 declarations).

---

## 12. Wrong-answer analysis. A candidate says: "I set up design tokens by exporting the hex values from Figma into a CSS file, so every colour in the codebase comes from one place. That makes it a single source of truth." This sounds correct and is not. Say precisely what is missing and what will go wrong in month four.

**What is missing:** First, a flat list of hex values lacks **two-tier token referencing**: private primitives (`--nc-ref-*`) aliased by semantic roles (`--nc-color-surface`, `--nc-color-on-surface`, `--nc-color-primary-container`) that describe each colour's job. Second, a one-off CSS export is just a static copy unless Figma and code stay synchronised through an authoritative token source, repeatable generation (`tokens/build-css.mjs`), and automated validation (`tokens/validate-css.mjs` and raw-value checks).

**What goes wrong in month four:**
1. **Theme or palette changes break shared hex variables:** Where one hex variable was reused for backgrounds, badges, and text without semantic roles, changing that variable flips elements that should move in opposite directions across Light and Dark modes.
2. **The exported CSS drifts out of sync:** To patch individual components without breaking others, developers edit the CSS file by hand or hardcode hex overrides—as demonstrated in Step 8 (`evidence/11-broken-referencing.png`), where `--nc-color-primary-container: #213DA0` stayed stuck in royal blue while palette-referenced roles updated to green. Without repeatable generation and validation, the CSS copy becomes stale and stops matching Figma.
