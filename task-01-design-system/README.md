# Task 1 — The Design System, and Proving the Agent Used It (`Nit's Cut`)

**Four-minute technical overview for an interviewer.**

---

## 1. What This Task Was

Build a complete, token-referenced design system in Figma (`ws3fJaZYN6oRFm3dQMIiXm`) and CSS for **Nit's Cut**, a fictional Nigerian men's bespoke tailoring business (making Senator native wear, trousers, and shirts), convert the exported Figma JSON into CSS custom properties via an agent-written script, and prove with machine-specific evidence that an AI agent actually consumed the system when building a client-facing screen.

The business problem comes from real workshop observation during tailoring training: missed delivery deadlines caused by power outages and too much work for a single tailor. The client screen must answer three repeated customer questions without a phone call:
1. *What stage is my outfit at (`Waiting`, `Being cut`, `Being sewn`, `Ready for collection`)?*
2. *When is my fitting or collection date, and has a workshop delay moved it?*
3. *How much have I paid, and what balance is still owed?*

---

## 2. What Was Built

- **Figma Design System (`ws3fJaZYN6oRFm3dQMIiXm`):**
  - **Colours (`02 · M3 colours`):** Eight 24-tone palettes (`192` primitives in `NC · M3 Primitives`: `primary`, `secondary`, `tertiary`, `neutral`, `neutral-variant`, `error`, `success`, `warning`) and `57` semantic colour roles (`NC · M3 Colour roles`), with `116` opaque foreground/background and `outline` contrast pairs verified across Light and Dark modes (`docs/colour-roles.md`).
  - **Typography (`03 · Typography & shadows`):** `15` text styles (`NC/Display/*`, `NC/Headline/*`, `NC/Title/*`, `NC/Body/*`, `NC/Label/*`) documented in `docs/type-scale.md` and `docs/divergences.md`.
  - **Elevation (`03 · Typography & shadows`):** `3` brand-tinted elevation shadows (`Soft`, `Medium`, `Hard`) built from `#334DAF` (`docs/shadows.md`).
- **Token Conversion & Validation Pipeline (`tokens/`):**
  - `tokens/build-css.mjs` reads `evidence/06-tokens-complete.json` and `evidence/06b-tokens-colour-roles-modes-from-figma-state.json`, excludes earlier draft collections (`nc · primitives`, `nc · colour roles`), and generates `tokens/generated/nc-tokens.css` (`192` `--nc-ref-*` primitives, `57` Light-mode `--nc-color-*` roles on `:root, [data-theme="light"]`, `57` Dark-mode `--nc-color-*` roles on `[data-theme="dark"]`, `15` `--nc-type-*` style groups/classes, and `3` `--nc-shadow-*` variables).
  - `tokens/validate-css.mjs` enforces `15` automated checks (zero unresolved `var()` references, raw hex confined to `--nc-ref-*`, all `114` Light/Dark role declarations aliasing primitives, no primitive usage in typography classes, `57/57` Light-mode and `57/57` Dark-mode mapping matches against `docs/colour-roles.md`, and exact representative token values).
- **Screen Proof (`outputs/screen-without-system/` vs `screen/`):**
  - Built the Nit's Cut Order Progress & Payment Summary screen first without the system (`evidence/09-screen-without-system.png`) and then consuming `nc-tokens.css` and locally bundled `.woff2` fonts (`evidence/10-screen-with-system.png` in Dark mode, `10c-screen-with-system-light.png` in Light mode, and `10d-screen-with-system-mobile-dark.png` at `375×812` mobile), verified via Chrome DevTools Protocol (`tokens/capture-and-verify-screen.mjs`) and `grep` (`evidence/07-raw-value-search.txt`).
- **Deliberate Token-Referencing Regression (`evidence/11-broken-referencing.png`, `11b-broken-referencing-nc-tokens.css`, & `12-git-log-branch-unmerged.txt`):**
  - On an unmerged branch (`regression/broken-token-reference`, commit `017694d`, subsequently deleted without merging), pointed `--nc-color-primary-container` at raw hex `#213DA0` while shifting `--nc-ref-primary-*` to emerald green (`#006D3B` at tone 40), proving that roles referencing the palette follow the brand change while hardcoded roles break visual consistency.

---

## 3. Key Decisions & Trade-Offs

1. **Pinning `#334DAF` at `primary/40` (`docs/colour-roles.md`):**
   Material Color Utilities `0.3.0` (`SchemeTonalSpot`) desaturates `#334DAF` (chroma `59.49`, tone `36.19`) to `#4F5B92` at `primary/40`, and a pure tone-40 calculation at source hue/chroma yields `#3D57B9`. We pinned `primary/40` to exact `#334DAF` (`evidence/01-palette-before-pin.png` vs `02-palette-after-pin.png`), accepting a `-3.81` HCT tone offset while keeping `on-primary` (`#FFFFFF`) at `7.543:1` contrast.
2. **Pairing `Cormorant Garamond` Semibold (`600`) with `Manrope` (`400`/`600`) (`docs/type-scale.md`, `docs/divergences.md`):**
   Diverged from the M3 2021 baseline (`Roboto` everywhere) to give garment headings bespoke editorial authority (`Cormorant Garamond` `600` on Display/Headline, `-0.5px` tracking on Display) while keeping order stages, dates, and Naira figures crisp in `Manrope` (`Title` `600`, `Body` `400`, `Label` `600` with `+0.2px` tracking).
3. **Line-height multipliers (`1.4`, `1.5`, `1.6`):**
   Applied `× 1.4` to Display/Headline and Label, `× 1.5` to Title, and `× 1.6` to Body (`Display Large` = `57px × 1.4 = 79.8px`).
4. **Completing Light-mode support from captured Figma Variables state (`evidence/06b-tokens-colour-roles-modes-from-figma-state.json`):**
   Because the third-party Figma plugin export (`06-tokens-complete.json`) exported only Dark-mode aliases (`57/57`) and live Figma MCP re-export was blocked by account sign-in (`The plugin "figma" needs the user to sign in`), we extracted both official Figma modes (`Light` `19:1` and `Dark` `19:2`) from our captured Figma Variables state (`work/figma-m3-state.json`) without modifying `06-tokens-complete.json`.

---

## 4. What We Got Wrong & Real Defects Found (`docs/defects.md`)

- **Step 5 Incomplete Export (`evidence/05-tokens-incomplete.json`):** First Figma export (`28,989` bytes) had Figma Variables unchecked and omitted all four colour collections (`["font", "effect", "typography"]` only). Fixed in `06-tokens-complete.json` (`177,990` bytes).
- **`D1` & `D2` (`evidence/06-tokens-complete.json`, resolved via `06b-tokens-colour-roles-modes-from-figma-state.json`):** The third-party Figma plugin export output only one mode (`Dark`) for `nc · m3 colour roles` with no mode metadata field. Resolved by extracting both `Light` (`19:1`) and `Dark` (`19:2`) modes from `work/figma-m3-state.json` into `06b-tokens-colour-roles-modes-from-figma-state.json` and emitting `:root, [data-theme="light"]` and `[data-theme="dark"]` (`114` role declarations).
- **`D3` (`tokens/build-css.mjs` lines 134–144):** Shadow conversion assumes shadow hex equals `primary/40` (`#334DAF`) and rewrites it using `color-mix(in srgb, var(--nc-ref-primary-40) ...)`.
- **`D4` (`tokens/validate-css.mjs`, fixed):** First validation run (`docs/prompts.md`, Step 6 Attempt 1) failed on a false positive because the validator matched the excluded draft collection names inside the CSS header comment.
- **`D5` & `D6` (`evidence/08-agent-typography-answer.txt`, `screen/index.html`, fixed):** In the initial screen build (`10a-screen-with-system-before-fixes.png`), the agent misused `.nc-type-headline-small` (`Cormorant Garamond`) on the `₦35,000` balance (`D6`) and falsely blamed `₦35,000`'s old-style descending numerals on a `Georgia` font fallback without checking `CSS.getPlatformFontsForNode` (`D5`). Fixed by self-hosting `.woff2` fonts with SIL OFL 1.1 licences (`screen/fonts/`), changing `₦35,000` to `.nc-type-title-large` (`Manrope`), and verifying rendered glyphs in `evidence/08b-typography-and-font-fixes-verification.txt`.
- **`D7` (`screen/fonts/manrope-400-600-latin-ext.woff2`, open limitation):** `CSS.getPlatformFontsForNode` revealed that `Manrope` lacks a glyph for the Naira sign (`₦`, `U+20A6`), causing that single character (`1` glyph) to fall back to `.SF NS` while the digits (`6` glyphs) render in `Manrope-SemiBold`.
- **`D8` (`screen/styles.css` lines 249–268, fixed):** `.record-row dd` (`(0, 1, 1)` specificity) initially overrode `.date-previous`, `.date-updated`, `.amount-paid`, and `.amount-owed` (`(0, 1, 0)`). Fixed by scoping them as `.record-row dd.<class>` (`(0, 2, 1)`) and verifying rendered contrast in Dark (`9.60:1`–`9.66:1`) and Light (`5.54:1`–`8.07:1`) modes.
- **`D9` (`tokens/generated/nc-tokens.css`, fixed):** An unsynced IDE editor buffer overwrote `nc-tokens.css` with the Step 8 regression after `node build-css.mjs` ran in the terminal. Fixed by archiving `11b-broken-referencing-nc-tokens.css`, regenerating `nc-tokens.css`, and syncing the file buffer directly.

---

## 5. Directory Map & Quick Verification

- **Regenerate and validate CSS tokens:**
  ```bash
  node task-01-design-system/tokens/build-css.mjs
  node task-01-design-system/tokens/validate-css.mjs
  ```
- **Documentation (`docs/`):**
  - `business-brief.md` · `colour-roles.md` · `type-scale.md` · `shadows.md` · `divergences.md` · `prompts.md` · `defects.md` · `interview-answers.md` · `evidence-index.md` · `decision-log.md` · `deliverables-checklist.md`
- **Evidence (`evidence/`):**
  - `01-palette-before-pin.png` through `12-git-log-branch-unmerged.txt` (indexed with SHA-256 hashes in `docs/evidence-index.md`).
