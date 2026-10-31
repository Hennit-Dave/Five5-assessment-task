# Prompts

Verbatim prompts given to the agent, followed by what actually happened. Nothing below is reconstructed or improved after the fact.

## Step 6 — JSON to CSS variables

### Prompt 1 (verbatim, 2026-10-30)

> Proceed with Task 1, Step 6: write and run a JSON-to-CSS conversion script for Nit's Cut.
>
> Read the assessment’s Step 6 requirements and the existing project documentation first. Use `task-01-design-system/evidence/06-tokens-complete.json` as the source, preserving the original evidence file.
>
> Requirements:
> 1. Convert the exported colour, typography and shadow tokens into reusable CSS custom properties. Resolve token references correctly and report missing or invalid references.
> 2. Interface styles must use semantic colour roles, such as `primary`, `on-primary`, `surface` and `on-surface`. Primitive colours should support those roles internally; do not use primitive colour variables or raw colour values directly in interface styles.
> 3. Use the current M3 collections. Exclude the earlier draft colour collections from the generated application tokens and document that choice.
> 4. Preserve the chosen Cormorant Garamond/Manrope typography and the three brand-coloured shadow styles.
> 5. Inspect which theme mappings the export actually contains. If Light-mode mappings are missing, report the gap and explain what additional export is needed. Do not invent missing mappings or label Dark-mode values as Light.
> 6. Run the script and validate the output, including unresolved references, token coverage and representative typography/shadow values. Record the actual results and any limitations.
> 7. Record this prompt verbatim in `task-01-design-system/docs/prompts.md`, followed by the actual attempts, errors, fixes and rerun results. Update the relevant evidence index and defect documentation.
>
> Keep the script and generated CSS in clearly named project folders, and document how to regenerate the CSS. Explain the result simply so I can understand and defend the work. Do not mark Step 6 complete until its assessment requirements have been checked.

### What the agent did

1. Inspected the export structure. Colour roles are aliases such as `{nc · m3 primitives.primary.80}`; typography is under `font.nc.*` (`custom-fontStyle`); shadows are under `effect.nc.shadow.*` with 8-digit hex colours such as `#334daf1a`. The export has no field saying which Figma mode the role aliases came from.
2. Wrote `task-01-design-system/tokens/build-css.mjs` (converter) and `task-01-design-system/tokens/validate-css.mjs` (checks).

### Attempt 1 — build passed, validation failed

Build output: `{"primitives":192,"roles":57,"typography":15,"shadows":3}`, exit 0.

Validation output (excerpt, verbatim):

```
PASS  all var() references resolve (135 uses, undefined: [])
PASS  raw hex confined to --nc-ref-* primitives (192 hex lines, 0 elsewhere)
PASS  all 57 role variables alias a primitive
PASS  typography classes do not reference primitives
PASS  coverage {"primitives":192,"roles":57,"typography":15,"shadows":3} (expected 192/57/15/3)
FAIL  draft collections absent from output
INFO  exported aliases vs docs: match Light 14/57, match Dark 57/57
...
1 check(s) failed
exit=1
```

**Cause:** a false positive in the validator, not in the CSS. `grep` showed the only match was line 4 of the generated header comment, `* Excluded draft collections: nc · primitives, nc · colour roles`, which names the excluded collections on purpose.

**Fix:** the validator now strips CSS comments before searching for draft-collection names.

### Attempt 2 — rerun

All 14 checks passed, exit 0. Full log: `evidence/step6-css-build-and-validation.txt`. The source evidence SHA-256 was `8c3072de…af92d33` before and after the run (unchanged).

### Theme finding

The 57 exported role aliases match the documented **Dark** column of `docs/colour-roles.md` 57/57, and the Light column only 14/57 (the roles that use the same tone in both modes, for example the `*-fixed` roles). So this export contains Dark-mode role aliases but does not include separate Light and Dark mappings. The CSS therefore emits the roles under `[data-theme="dark"]` only and generates **no Light theme**. Recorded in `docs/defects.md`.

**Additional export needed:** a re-export of `NC · M3 Colour roles` with the Light mode selected (or a plugin/setting that exports every mode), saved as a separate evidence file. Then the converter can emit `[data-theme="light"]` from real Light aliases.

---

## Step 7 — Font-Loading Inspection and Verification

### Prompt 2 (verbatim, 2026-10-30)

> Fix the font loading in the Nit's Cut screen before capturing the final evidence screenshot.
>
> 1. Preserve the current screenshot as evidence of the rendering issue.
> 2. Check how Cormorant Garamond 600 and Manrope 400/600 are loaded. Inspect browser font-loading results and network errors; do not assume fonts failed just because they are not installed locally.
> 3. Fix any loading problems. Wait for the required fonts to finish loading before capturing, and verify the actual rendered fonts rather than only the CSS font-family declarations.
> 4. Capture the corrected screen as task-01-design-system/evidence/10-screen-with-system.png. Keep the viewport and content unchanged so the comparison is fair.
> 5. Update evidence-index.md, defects.md and prompts.md with the actual cause, fix, verification results and this exact prompt. Correct any earlier unsupported explanation of the font failure.
>
> Keep our chosen typography styles and design tokens. If font loading remains blocked, report the exact blocker instead of claiming the screenshot uses the intended fonts.

### What the agent did and what failed first

1. **Preserved existing screenshot:** Copied `evidence/10-screen-with-system.png` (`171,958` bytes, SHA-256 `c5e0252e7a3f3aeeb12df7cab22c402780df9a06d5513eb0a9853409b143757d`) to `evidence/10a-screen-with-system-before-font-fix.png`.
2. **Attempt 1 at CDP inspection failed:** Wrote a script connecting to headless Chrome via `--remote-debugging-port`. The first run inside the sandbox failed because Chrome could not initialise its Mach crashpad/IPC ports (`bootstrap_check_in ... Permission denied`). The second run outside the sandbox failed with `Error: {"code":-32000,"message":"DOM agent needs to be enabled first."}` because `CSS.enable` was called before `DOM.enable`.
3. **Attempt 2 — Fix and verification (`tokens/capture-and-verify-screen.mjs`):**
   - Enabled `DOM.enable` before `CSS.enable`, explicitly called `document.fonts.load('600 32px "Cormorant Garamond"')`, `document.fonts.load('400 16px "Manrope"')`, and `document.fonts.load('600 16px "Manrope"')`, awaited `document.fonts.ready` plus two animation frames, and queried `CSS.getPlatformFontsForNode` across 9 elements before capturing `10-screen-with-system.png` at `1280×960` (`deviceScaleFactor: 1`).
4. **Actual findings (correcting the earlier unsupported fallback assumption):**
   - Zero network requests failed (`failedNetworkRequests: []`). Google Fonts CSS (`https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Manrope:wght@400;600&display=swap`) and the `latin` + `latin-ext` `.woff2` subsets loaded cleanly when Chrome ran outside the sandbox.
   - `CSS.getPlatformFontsForNode` proved that every inspected element rendered with our custom web fonts (`isCustomFont: true`):
     - `h1.hero-title` (`47` glyphs) and `dd.amount-owed` (`7` glyphs): `CormorantGaramondLight-SemiBold`
     - `h2.card-title` (`29` glyphs), `button.btn-primary` (`20` glyphs), `span.order-ref` (`13` glyphs), `span.stage-badge` (`4` glyphs): `Manrope-SemiBold`
     - `p.hero-copy` (`88` glyphs), `p.delay-text` (`129` glyphs), `p.footnote` (`63` glyphs): `Manrope-Regular`
   - The measured inline text width of `h1.hero-title` was `629.58px`, matching `Cormorant Garamond` `600` at `32px` (`629.57px`) rather than `Georgia` (`816.03px`).
   - Re-capturing `10-screen-with-system.png` at `1280×960` (`deviceScaleFactor: 1`) after awaiting `document.fonts.ready` produced the exact same SHA-256 hash (`c5e0252e7a3f3aeeb12df7cab22c402780df9a06d5513eb0a9853409b143757d`) as `10a-screen-with-system-before-font-fix.png`.
   - **Why the agent had misdiagnosed `10-screen-with-system.png` earlier:** Noticing that `Cormorant Garamond` was not in `/Library/Fonts` and seeing old-style descending digits (`3` and `5`) on `₦35,000`, the agent assumed `Georgia` had rendered without checking `CSS.getPlatformFontsForNode`. In reality, `Cormorant Garamond` uses old-style (`onum`) numerals by default, and they appeared on `₦35,000` because `screen/index.html` line 117 misused `nc-type-headline-small` (`Cormorant Garamond`) on a payment figure instead of `Manrope` (`D6`).

### Prompt 3 (verbatim, 2026-10-30)

> Proceed with option 2 and fix both issues before Step 8.
>
> 1. Keep 08-agent-typography-answer.txt unchanged as the original recorded answer. Preserve the existing screenshot under a clearly named “before fixes” filename and reference it in the evidence index.
> 2. Change the ₦35,000 remaining balance to .nc-type-title-large so it uses Manrope, consistent with our documented rules.
> 3. Investigate the font-loading issue. Do not treat missing locally installed fonts or screenshot appearance as proof that Chrome captured too early. Verify which fonts actually rendered and inspect loading errors.
> 4. Fix font loading, using locally bundled font files if needed. Preserve their licence notices. Wait for the required fonts to load and verify the rendered families and weights.
> 5. Capture the corrected screen as 10-screen-with-system.png, keeping the same viewport and content.
> 6. Record the fixes and actual verification results separately in the evidence and documentation. Correct unsupported claims about the original font failure, while preserving the original answer as historical evidence.
> 7. Rerun the relevant colour-token checks if the screen code changed, and update the saved results.
>
> Report what passed and anything still unresolved. Stop before starting Step 8.

### What the agent did

1. **Restored `evidence/08-agent-typography-answer.txt` to the original recorded answer only** (removing the post-inspection section that had been appended in the previous turn) and recorded the subsequent investigation, fixes, and verification separately in `evidence/08b-typography-and-font-fixes-verification.txt` and `evidence/step7-font-loading-verification.txt`.
2. **Preserved the pre-fix screenshot:** Renamed `10a-screen-with-system-before-font-fix.png` to `evidence/10a-screen-with-system-before-fixes.png` (`1280×960`, SHA-256 `c5e0252e7a3f3aeeb12df7cab22c402780df9a06d5513eb0a9853409b143757d`).
3. **Bundled local `.woff2` fonts and preserved OFL 1.1 licences (`screen/fonts/`):**
   - Downloaded `cormorant-garamond-600-latin.woff2` (`23,384` bytes), `cormorant-garamond-600-latin-ext.woff2` (`20,300` bytes), `manrope-400-600-latin.woff2` (`24,436` bytes), and `manrope-400-600-latin-ext.woff2` (`15,212` bytes), plus upstream SIL Open Font License 1.1 texts (`OFL-Cormorant-Garamond.txt` and `OFL-Manrope.txt`).
   - Created `screen/fonts/fonts.css` and replaced the remote `https://fonts.googleapis.com/...` `<link>` in `screen/index.html` with `<link rel="stylesheet" href="./fonts/fonts.css">`.
4. **Fixed `₦35,000` typography class (`screen/index.html` line 114):**
   - Changed `<dd class="amount-owed nc-type-headline-small">₦35,000</dd>` to `<dd class="amount-owed nc-type-title-large">₦35,000</dd>`.
5. **Captured and verified `evidence/10-screen-with-system.png` (`tokens/capture-and-verify-screen.mjs`):**
   - New screenshot SHA-256: `620dad0993691fc85c113d526c95e6e9b618c5eed930ec6d0b3a43e7fb1e6a35` (`1280×960`, `deviceScaleFactor: 1`).
   - `failedNetworkRequests: []`, `resources: []` (zero external network requests).
   - `CSS.getPlatformFontsForNode` confirmed `h1.hero-title` rendered `47` glyphs in `CormorantGaramondLight-SemiBold` (`isCustomFont: true`), and `dd.amount-owed` rendered its `6` numeric/comma characters (`35,000`) in `Manrope-SemiBold` (`isCustomFont: true`) while the single Naira symbol `₦` (`U+20A6`) fell back to macOS `.SF NS` (`isCustomFont: false`, `1` glyph) because `Manrope` lacks a `U+20A6` glyph (recorded as Defect `D7`).
6. **Reran colour-token checks (`evidence/07-raw-value-search.txt` and `tokens/validate-css.mjs`):**
   - `grep` for raw hex/rgb/hsl across `task-01-design-system/screen/`: `0` matches (`exit=1`).
   - `grep` for `--nc-ref-*` across `task-01-design-system/screen/`: `0` matches (`exit=1`).
   - `node task-01-design-system/tokens/validate-css.mjs`: `14/14` checks passed (`exit=0`).

---

## Step 8 & Final Task 1 Reconciliation (2026-10-31)

### Prompt 4 (verbatim, 2026-10-31)

> Review and finish the remaining work in Task 1 inside /Users/blk/Developer/Five5 assessment task.
>
> Read the current AGENTS.md, commit rules and original Task 1 requirements first. Work through the following in order. Preserve original evidence and record actual results—do not mark work complete just because its files exist.
>
> 1. Restore the correct design system.
> The current tokens/generated/nc-tokens.css still contains the deliberate Step 8 regression: primary/40 is #006D3B and primary-container is hardcoded to #213DA0. Preserve the regression screenshot, original Git evidence and a clearly labelled copy of the broken CSS. Regenerate the application CSS from the original JSON export, restoring #334DAF and semantic aliases. Run validation and fix any failures.
>
> 2. Fix the screen’s colour overrides.
> Correct the .record-row dd specificity issue documented as D8 so revised dates, deposits and remaining balances receive their intended semantic colours. Use semantic roles, not raw colours or direct primitive references. Verify the actual rendered colours and their contrast against their backgrounds.
>
> 3. Complete Light-mode support.
> Obtain the real Light-mode role mappings from Figma and save them as an additional export without overwriting the original Step 5 evidence. Extend the converter and validation to support explicit Light and Dark mappings. Do not invent missing values. If Figma access blocks this work, describe the exact blocker and continue independent tasks.
>
> 4. Check rendering and refresh evidence.
> Verify Cormorant Garamond 600 and Manrope 400/600 actually render. Retain the font licences and document any Naira-symbol fallback accurately. Check the screen at the existing screenshot size and a narrow mobile viewport for clipping or overflow. Preserve earlier screenshots, then refresh 10-screen-with-system.png and its verification record. Keep the numbered final screenshot in Dark mode for continuity; save Light/mobile captures separately.
>
> 5. Correct the raw-colour search evidence.
> Search the entire first-party codebase, including scripts, generated CSS and the intentional without-system example. Exclude dependencies, Git internals and binary files, and state those exclusions explicitly. Save the exact commands and full output in 07-raw-value-search.txt. Explain legitimate raw-colour matches separately; do not hide them to produce an empty result. Also check interface styles for direct primitive references.
>
> 6. Reconcile the documentation.
> Shorten business-brief.md to comfortably below 400 words including its note and headings. Preserve the retrospective-writing disclosure. Update defects.md, prompts.md, evidence-index.md, README.md, the checklist and progress records to match verified reality. Preserve historical answers and logs; append corrections separately. Update interview answers affected by fixes, particularly Light-mode support, and keep each answer under 200 words. Do not claim I reviewed or understood something without my confirmation.
>
> 7. Perform a final assessment audit.
> Check every mandatory Task 1 requirement against its actual files and evidence. Confirm the regression branch remains deleted and unmerged. Clearly distinguish completed work, unresolved limitations, remaining learner actions and the optional walkthrough. Record this prompt verbatim and log actual attempts, failures, fixes and checks.
>
> 8. Save the finished work.
> Follow the project’s commit checklist, inspect staged files for secrets and excluded assessment text, stage specific files and create a local commit once the relevant checks pass. Do not push, rewrite history or merge the regression. Report the commit ID and check results.
>
> Finish by explaining the changes simply and giving me a short interview-practice checklist plus an outline for the optional four-minute walkthrough. Do not invent my spoken defence or claim a recording exists. Stop after Task 1; do not begin Task 2.

### What the agent did, including blockers, failures, fixes, and verification

1. **Restored `tokens/generated/nc-tokens.css` and archived the broken regression CSS (`D9`):**
   - **Cause of regression remaining on disk:** During Step 8, `nc-tokens.css` was edited via the IDE editor tool (`edit_file`) on `regression/broken-token-reference`, and then restored on `main` via `git checkout main` and `node build-css.mjs` in the terminal without syncing the open IDE editor tab. When the IDE saved its buffer, it overwrote `nc-tokens.css` on disk with the broken Step 8 CSS (`--nc-ref-primary-40: #006D3B` and `--nc-color-primary-container: #213DA0`).
   - **Fix:** Archived the exact broken stylesheet from unmerged commit `017694d` as `evidence/11b-broken-referencing-nc-tokens.css` (SHA-256 `0d52ebd756db8442ec9b86ef5b09729742dda92336c2873d647adf9202fa001e`), regenerated `tokens/generated/nc-tokens.css` via `node task-01-design-system/tokens/build-css.mjs`, and synced the IDE buffer via `write_file` (SHA-256 `cc5a14df1346b5a936b380d09979de910ab15a25245b0f1370aa33bc9ba25c0b`).
2. **Completed Light-mode support from captured Figma Variables state (`D1`, `D2`):**
   - **Live Figma MCP blocker:** `list_plugin_accounts` reported `figma_figma`: `The plugin "figma" needs the user to sign in`, blocking a live plugin re-export.
   - **Genuine Figma Variables source:** Inspected `work/figma-m3-state.json` (captured directly from Figma file `ws3fJaZYN6oRFm3dQMIiXm` via `figma.variables.getLocalVariableCollectionsAsync()` and `figma.variables.getLocalVariablesAsync()`), which contains `VariableCollectionId:19:3` (`NC · M3 Colour roles`) with both modes `Light` (`modeId: 19:1`) and `Dark` (`modeId: 19:2`) and all `57` role variable mappings (`VariableID:19:196`..`VariableID:19:252`).
   - **Verification & extraction:** Verified by script that `19:2` (`Dark`) matches `06-tokens-complete.json` `57/57`, and both `19:1` (`Light`) and `19:2` (`Dark`) match `docs/colour-roles.md` `57/57`. Saved the extracted two-mode mapping as `evidence/06b-tokens-colour-roles-modes-from-figma-state.json` (`16,580` bytes, SHA-256 `9042051d3dbf89ccbdf77b5eb6a994de60183147f8d657f0a5264d34eab4feab`) without touching `05-tokens-incomplete.json` or `06-tokens-complete.json`.
   - **Converter & validator update:** Updated `tokens/build-css.mjs` and `tokens/validate-css.mjs` to emit and validate both `:root, [data-theme="light"]` (`57` roles) and `[data-theme="dark"]` (`57` roles) = `114` role declarations (`15/15` checks passing in `evidence/step6b-light-and-dark-css-validation.txt`; original `step6-css-build-and-validation.txt` preserved).
3. **Fixed `.record-row dd` specificity bug (`D8`) and mobile responsiveness in `screen/styles.css`:**
   - Scoped `.record-row dd.date-previous`, `.record-row dd.date-updated`, `.record-row dd.amount-paid`, and `.record-row dd.amount-owed` (`(0, 2, 1)`) so they override `.record-row dd` (`(0, 1, 1)`), and added `@media (max-width: 48rem)` so `.grid` stacks to a single column on narrow mobile viewports.
4. **Refreshed screenshots and CDP verification (`tokens/capture-and-verify-screen.mjs`):**
   - Preserved `10b-screen-with-system-before-d8-specificity-fix.png` (`620dad09…`) and `step7a-font-loading-verification-before-d8-fix.txt` (`0777a1f3…`).
   - **Attempt 1 failure & fix:** First run of the updated `capture-and-verify-screen.mjs` threw `Failed to execute 'getComputedStyle' on 'Window': parameter 1 is not of type 'Element'` because the script queried `section.card` whereas `screen/index.html` uses `<article class="card">`. Fixed selector to `article.card` and reran.
   - **Verified results (`step7-font-loading-verification.txt`):**
     - Dark mode (`10-screen-with-system.png`, `1280×960`, SHA-256 `4f30bdcf…`): `dd.date-previous` = `#C6C5D0` (`9.60:1` vs `#1F1F25`), `dd.date-updated` = `#FFB77D` (`9.62:1`), `dd.amount-paid` = `#8BD79B` (`9.60:1`), `dd.amount-owed` = `#B8C4FF` (`9.66:1`).
     - Light mode (`10c-screen-with-system-light.png`, `1280×960`, SHA-256 `a0e5bb40…`): `dd.date-previous` = `#45464F` (`8.07:1` vs `#EFEDF4`), `dd.date-updated` = `#8C4F14` (`5.58:1`), `dd.amount-paid` = `#1F6C3A` (`5.54:1`), `dd.amount-owed` = `#334DAF` (`6.41:1`).
     - Desktop (`1280×960`) and narrow mobile (`375×812`, `10d-screen-with-system-mobile-dark.png`, SHA-256 `d3ca74b0…`) layout checks: `hasHorizontalOverflow: false`, `overflowingElementsCount: 0` in both viewports.
5. **Updated `evidence/07-raw-value-search.txt`:**
   - Searched the entire first-party codebase (`task-01-design-system/`, `outputs/`, `work/`) with explicit exclusions (`--exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.local-instruction-archive --binary-files=without-match`), recorded exact commands and full outputs, explained all legitimate matches outside `screen/`, and confirmed `0` raw colour values and `0` `--nc-ref-*` primitive references in `task-01-design-system/screen/`.

