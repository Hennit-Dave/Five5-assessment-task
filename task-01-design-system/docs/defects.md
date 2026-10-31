# Defects

Real defects found in this task's own files, with their status and resolution as of 2026-10-31.

## D1 — Single-mode Figma plugin export (`06-tokens-complete.json`) omitted Light-mode role mappings (resolved via `06b-tokens-colour-roles-modes-from-figma-state.json`)

- **Where:** `evidence/06-tokens-complete.json` (`nc · m3 colour roles` holds one flat alias per role); resolved by extracting `evidence/06b-tokens-colour-roles-modes-from-figma-state.json` from the captured Figma Variables API state (`work/figma-m3-state.json`, file `ws3fJaZYN6oRFm3dQMIiXm`, collection `VariableCollectionId:19:3`) and updating `tokens/build-css.mjs` and `tokens/validate-css.mjs`.
- **What:** The third-party Figma export plugin used in Step 5 (`06-tokens-complete.json`) exported only the active mode's alias per role (`57/57` match with Dark mode `19:2`, `14/57` match with Light mode `19:1`). Because live Figma MCP re-export was blocked by `The plugin "figma" needs the user to sign in` (`figma_figma` MCP account disconnected), we extracted both official Figma modes (`Light` `19:1` and `Dark` `19:2`) directly from `work/figma-m3-state.json` into `evidence/06b-tokens-colour-roles-modes-from-figma-state.json` without modifying `05-tokens-incomplete.json` or `06-tokens-complete.json`. `tokens/build-css.mjs` now emits `:root, [data-theme="light"]` (`57` roles) and `[data-theme="dark"]` (`57` roles), validated `57/57` in both modes by `tokens/validate-css.mjs` (`15/15` checks passing).
- **Production cost (before fix):** An app built on the single-mode export had no Light theme in CSS unless supplemented by a multi-mode Variables export.

## D2 — Single-mode plugin export lacks mode metadata (`06-tokens-complete.json`)

- **Where:** `evidence/06-tokens-complete.json` vs `evidence/06b-tokens-colour-roles-modes-from-figma-state.json` and `tokens/build-css.mjs` lines 97–115.
- **What:** `06-tokens-complete.json` has no `modeId` or mode name field on its `nc · m3 colour roles` entries. By contrast, Figma's native Variables API (`work/figma-m3-state.json` / `06b-tokens-colour-roles-modes-from-figma-state.json`) keys every role by explicit `modes: [{ name: "Light", modeId: "19:1" }, { name: "Dark", modeId: "19:2" }]`. `tokens/build-css.mjs` now reads the explicit `Light` and `Dark` mode objects from `06b-tokens-colour-roles-modes-from-figma-state.json` and cross-checks that `06-tokens-complete.json` matches the Dark mode `57/57`.
- **Cost:** Relying on a single-mode plugin export without mode metadata risks silently mislabelling themes if someone re-exports with a different mode active.

## D3 — Shadow colour assumes it equals `primary/40` (open limitation)

- **Where:** `tokens/build-css.mjs`, lines 134–144 (shadow colour check and `color-mix` rewrite).
- **What:** Shadows are rewritten as `color-mix(in srgb, var(--nc-ref-primary-40) N%, transparent)`. If the brand colour changes, shadows follow (intended). If a future shadow uses a different colour, the script falls back to the raw hex and warns (which `validate-css.mjs` would then fail). Also, `color-mix()` requires a modern browser; older browsers drop the shadow.
- **Cost:** Missing shadows on legacy browsers; non-`primary/40` shadow colours require script updates.

## D4 — Validator false positive (fixed)

- **Where:** `tokens/validate-css.mjs`, draft-collection check (first version).
- **What:** It matched the header comment naming the excluded collections (`* Excluded draft collections: nc · primitives, nc · colour roles`) and failed a correct build. Fixed by stripping comments before the search. See `docs/prompts.md`, Step 6 Attempt 1.

## D5 — External Google Fonts CDN dependency and initial false fallback diagnosis (fixed)

- **Where:** `screen/index.html` line 7 (`<link rel="stylesheet" href="./fonts/fonts.css">`, replacing the remote `fonts.googleapis.com` link), `screen/fonts/`, and `tokens/capture-and-verify-screen.mjs`.
- **What:**
  1. *Initial false diagnosis (corrected):* In `evidence/08-agent-typography-answer.txt`, the agent initially claimed the pre-fix screenshot (`10a-screen-with-system-before-fixes.png`) had rendered the fallback font `Georgia` merely because `Cormorant Garamond` and `Manrope` were not installed in `/Library/Fonts` or `~/Library/Fonts` and because `₦35,000` showed old-style descending numerals (`3` and `5`). Subsequent inspection via Chrome DevTools Protocol (`CSS.getPlatformFontsForNode` and `document.fonts`) proved that `CormorantGaramondLight-SemiBold` (`isCustomFont: true`) and `Manrope-Regular` / `Manrope-SemiBold` (`isCustomFont: true`) had in fact loaded and rendered. The old-style digits on `₦35,000` were `Cormorant Garamond`'s default `onum` numerals, caused by Defect `D6` below.
  2. *Architectural defect and fix:* The initial `screen/index.html` fetched `Cormorant Garamond` and `Manrope` at runtime from Google's third-party CDN. We fixed this by bundling the `.woff2` subsets locally in `screen/fonts/` (`cormorant-garamond-600-latin.woff2`, `cormorant-garamond-600-latin-ext.woff2`, `manrope-400-600-latin.woff2`, `manrope-400-600-latin-ext.woff2`) along with their upstream SIL Open Font License 1.1 notices (`OFL-Cormorant-Garamond.txt` and `OFL-Manrope.txt`), and verifying rendered glyphs via `tokens/capture-and-verify-screen.mjs`.
- **Production cost (if left unfixed):** On unstable or offline Nigerian mobile connections (`docs/business-brief.md`), uncached requests to `fonts.googleapis.com` / `fonts.gstatic.com` can time out or delay text rendering, causing layout shift (`display=swap`) from `Georgia`/`system-ui` to `Cormorant Garamond`/`Manrope`.

## D6 — `Headline Small` (`Cormorant Garamond`) misused for a payment figure inside an order card (fixed)

- **Where:** `screen/index.html` line 114 (`<dd class="amount-owed nc-type-title-large">₦35,000</dd>`; previously `nc-type-headline-small` in `10a-screen-with-system-before-fixes.png`).
- **What:** In the initial build (`10a-screen-with-system-before-fixes.png`), `nc-type-headline-small` (`Cormorant Garamond` Semibold `24px / 33.6px`) was applied to the remaining payment balance inside Card 3, violating `docs/type-scale.md` Section 4 (*"Headline for page headers, Title for order cards and section headers"*) and `docs/business-brief.md` (which assigns order figures and payment balances to `Manrope`). Fixed by changing `dd.amount-owed` to `nc-type-title-large` (`Manrope` Semibold `22px / 33.0px`), verified in `evidence/10-screen-with-system.png` and `evidence/step7-font-loading-verification.txt`.
- **Production cost (if left unfixed):** Renders an important financial balance in `Cormorant Garamond`'s default old-style descending numerals (`3` and `5` hang below the baseline) instead of `Manrope`'s clean geometric lining numerals (used on `₦85,000` and `− ₦50,000`).

## D7 — `Manrope` lacks a glyph for the Naira currency sign (`₦`, `U+20A6`) (open limitation)

- **Where:** `screen/fonts/manrope-400-600-latin-ext.woff2` and `screen/index.html` lines 106, 110, and 114 (`₦85,000`, `− ₦50,000`, `₦35,000`).
- **What:** Verified by `CSS.getPlatformFontsForNode` (`evidence/step7-font-loading-verification.txt`): on `dd.amount-owed (.nc-type-title-large)`, the 6 numeric/punctuation characters (`35,000`) render in `Manrope-SemiBold` (`isCustomFont: true`, `glyphCount: 6`), whereas the single Naira symbol `₦` (`U+20A6`) falls back to the macOS system font `.SF NS` (`isCustomFont: false`, `glyphCount: 1`). Although `Manrope`'s `@font-face` `unicode-range` declares `U+20A0-20AB`, the font file itself does not include a `U+20A6` glyph (unlike `Cormorant Garamond`, which does include `U+20A6`).
- **Production cost:** Across Android, iOS, Windows, and macOS devices, the `₦` prefix on prices renders in each operating system's fallback UI font while the digits render in `Manrope`, creating a slight weight/stroke mismatch on the currency symbol.

## D8 — CSS selector specificity in `screen/styles.css` overrode semantic colours on `<dd>` values (fixed)

- **Where:** `screen/styles.css` lines 249–268 (`.record-row dd` vs `.record-row dd.date-previous`, `.record-row dd.date-updated`, `.record-row dd.amount-paid`, and `.record-row dd.amount-owed`).
- **What:** Originally (`10b-screen-with-system-before-d8-specificity-fix.png`), `.record-row dd { color: var(--nc-color-on-surface); }` had specificity `(0, 1, 1)`, whereas `.date-previous`, `.date-updated`, `.amount-paid`, and `.amount-owed` had single-class specificity `(0, 1, 0)`. As a result, all `<dd>` elements inside `.record-row` rendered in `--nc-color-on-surface` (`#E3E1E9`) instead of applying `--nc-color-on-surface-variant`, `--nc-color-warning` (`Mon, 02 Nov 2026 · 12:00 PM`), `--nc-color-success` (`− ₦50,000`), or `--nc-color-primary` (`₦35,000`). Fixed by scoping the four semantic override rules as `.record-row dd.<class>` (`(0, 2, 1)`), verified in both Dark and Light modes (`evidence/10-screen-with-system.png`, `evidence/10c-screen-with-system-light.png`, and `evidence/step7-font-loading-verification.txt`).
- **Production cost (if left unfixed):** Intended semantic colour cues on revised dates, paid deposits, and remaining balances were silently suppressed by a parent-plus-tag selector.

## D9 — Unsynced IDE editor buffer overwrote regenerated `nc-tokens.css` after Step 8 (fixed)

- **Where:** `tokens/generated/nc-tokens.css` after Step 8 branch deletion (`evidence/11b-broken-referencing-nc-tokens.css`).
- **What:** During Step 8, `tokens/generated/nc-tokens.css` was modified via the IDE editor tool (`edit_file`) on `regression/broken-token-reference`, and then restored on `main` via `git checkout main` and `node build-css.mjs` in the terminal without updating the open IDE editor buffer. When the open editor tab later saved to disk, it wrote the broken Step 8 regression (`--nc-ref-primary-40: #006D3B` and `--nc-color-primary-container: #213DA0`) back over `tokens/generated/nc-tokens.css`. Fixed by archiving the broken stylesheet as `evidence/11b-broken-referencing-nc-tokens.css`, regenerating `tokens/generated/nc-tokens.css` via `build-css.mjs`, syncing the file buffer directly via `write_file`, and verifying `15/15` checks in `tokens/validate-css.mjs`.
