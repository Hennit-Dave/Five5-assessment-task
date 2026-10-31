# Nits Cut Task 1 interview study guide

Prepared on 31 October 2026. This is a learning companion to your formal interview answers and defect log. Read it to understand the ideas, then practise explaining them in your own words. The sample answers describe project work; they do not mean you must claim you personally wrote every script.

## Your project in everyday words

Nit's Cut is a fictional business that makes men's native wear, trousers and shirts. While learning tailoring, you saw power cuts and too much work cause missed deadlines. Your demonstration screen helps customers see their outfit's stage, fitting and collection dates, and payment balance.

Task 1 builds the visual rules for that screen and proves that an AI agent followed them. It does not prove that a working order database, payment service or SMS system exists. The screen uses sample information.

Think of the design system as a tailoring specification. A tailor needs agreed fabric, measurements and finishing instructions. An agent needs agreed colours, text styles and rules for applying them. You still inspect the finished result.

## Small dictionary

| Word | Simple meaning | Example in your project |
|---|---|---|
| Token | A named, reusable design setting | A colour, text size or shadow |
| Primitive | A basic value from the palette | The blue #334DAF |
| Semantic role | A name describing a colour's job | Primary action colour or page background |
| Alias or reference | A setting that points to another setting | Primary points to a palette tone |
| Component | A reusable piece of the interface | Button, badge or card |
| Typography | Rules for how text looks | Font, weight, size, spacing and line height |
| Contrast | How different text is from its background | Dark text on a pale card |
| Theme | A coordinated set of colour assignments | Light or Dark |
| JSON | A structured file that stores the exported settings | Your Figma token export |
| CSS | Instructions telling the browser how a page looks | Apply the primary colour to a button |
| Validator | A script that checks rules | Reject a colour role containing a raw hex value |
| Regression | Something that previously worked becoming wrong | A role losing its palette reference |
| Specificity | The priority used when CSS rules compete | A general rule unexpectedly beating a colour class |
| Glyph | A drawn character inside a font | The Naira sign, ₦ |

## The twelve interview questions

### 1 How would you structure design tokens

**What they are asking:** How do you organise the settings so they are easy to reuse and change?

**A simple answer:** I separate basic values from their jobs. The palette stores my actual colour values. Roles such as primary, surface and on-surface point to that palette. The screen uses the roles. I also keep reusable text styles and shadows. A larger project could add settings for individual components.

**Your example:** In Light mode, the primary role points to primary tone 40, which is #334DAF. A button asks for primary rather than copying that blue into its own stylesheet.

**Remember:** Basic value → job → screen element. The organisation is similar to keeping a fabric specification separate from the instruction saying where that fabric is used.

### 2 When is a token change breaking

**What they are asking:** When can changing one shared setting damage existing screens?

**A simple answer:** A change is breaking when something using the setting no longer works as intended. Deleting a colour name can remove styling. Changing a colour can make text difficult to read. Increasing text size can make a button label overflow. I check the actual screens, not just whether the setting still exists.

**Your example:** A button background and its text colour must still work together after a brand update. Passing a colour check alone does not prove every layout still works.

### 3 How would you support multiple brands and themes

**What they are asking:** Can the same screen work with different appearances without rewriting every button and card?

**A simple answer:** I keep the role names the same and change what they point to. Surface can point to a pale tone in Light mode and a dark tone in Dark mode. Components continue asking for surface. Another brand could supply a different palette and fonts while keeping those same jobs.

**Your current position:** Both Light and Dark now have 57 role assignments in CSS. Multiple brands are a possible extension, not something already built. The extra theme data came from a previously captured Figma state because a fresh Figma connection was unavailable. It was not a new live export.

### 4 Can tokens guarantee accessible contrast

**What they are asking:** Does using approved colour names automatically make all text readable?

**A simple answer:** No. A colour can be correct but used on the wrong background. Transparency, pictures or a competing CSS rule can also change the result. Our checked pairs pass their thresholds, but I still need to inspect how the screen actually uses them.

**Your example:** D8 showed that the screen could use token names and still display unintended colours because another CSS rule won.

**Remember:** A good ingredient does not guarantee a good finished result. Passing these checks is not a claim that the whole application meets every accessibility requirement.

### 5 How do you check contrast

**What they are asking:** What practical steps do you take to make text and important controls visible?

**A simple answer:** First I check the intended foreground and background pairs. Then I check that the code uses the right roles. Finally I inspect the colours the browser actually displays. I repeat the checks for the themes and states I use, and fix or restrict combinations that fail.

**Numbers to remember:** Normal text generally needs at least 4.5 to 1 for AA. Large text needs 3 to 1. Essential non-text visual information also has applicable 3 to 1 requirements. There are exceptions, so these are not a rule that every decorative line must pass.

**Your evidence:** The colour document records 116 selected pairs across two modes. The browser report also records the corrected date and payment colours. Do not claim every interactive state was tested unless its evidence exists.

### 6 What is the difference between A AA and AAA

**What they are asking:** Do you understand the different levels of accessibility requirements?

**A simple answer:** A covers basic requirements. AA includes A and adds further requirements; it is a common target. AAA includes both earlier levels and adds stricter requirements. These levels cover much more than colours, including keyboard use and how people understand and navigate content.

**Useful contrast example:** For normal text, AA requires 4.5 to 1 and AAA requires 7 to 1. For large text, those figures are 3 to 1 and 4.5 to 1. A does not set a minimum numeric text contrast ratio. Reflow and Text Spacing are AA requirements.

**Do not say:** “My app is AAA because some text pairs exceed 7 to 1.” That checks one part of accessibility, not the whole page.

### 7 Why is semantic HTML important

**What they are asking:** Why use the proper HTML element instead of making everything look right with styling?

**A simple answer:** The proper element tells the browser and assistive technology what something is. A heading identifies a section. A real button has built-in keyboard behaviour. A list describes related items. This helps people understand and operate the page.

**Your example:** The tailoring stages use an ordered list. Payment labels and values use a description list. The main garment name is a heading.

**Limit:** A button still needs working application behaviour. A status region can support announcements when its content changes; a static screenshot does not prove that screen readers announced it.

### 8 How do you hand a Figma design to developers

**What they are asking:** How do you transfer the actual design rules rather than just send a picture?

**A simple answer:** I provide named Figma variables and styles, export their settings, and check the export. A script converts the data into CSS. I provide usage instructions and known limitations, then compare the built screen with the intended system.

**Your example:** The first export omitted colour variables. The next included them but lacked separate theme mappings. Checking the files caught both gaps. The supplementary saved Figma state supplied the missing mode assignments.

**Remember:** A handoff includes data, instructions and verification. Exporting a file is only one step.

### 9 Why do AI interfaces look generic and what do you provide

**What they are asking:** How do you give the agent enough direction to make this business recognisable?

**A simple answer:** If I ask only for a good-looking screen, the agent may choose familiar colours and layouts. I give it the business brief, the customer's questions, the generated design settings and explicit rules. Then I inspect its work and ask it to identify the styles it used.

**Your example:** Cormorant Garamond gives large headings a tailored character. Manrope handles everyday details and payment figures. The agent had to use semantic roles instead of choosing new colours per element.

### 10 Why is Display Large line height 79 point 8 pixels

**What they are asking:** Can you explain a precise decision and its trade-offs?

**A simple answer:** The text size is 57 pixels. I used the allowed multiplier 1.4, so 57 × 1.4 equals 79.8. It is the smallest multiplier permitted by the assessment and keeps the line box relatively compact. Using 1.5 makes it 85.5 pixels and takes more space. Using 1.3 makes it 74.1 pixels but breaks the assessment's rule.

**Be honest:** The original spacing specimens were single-line samples. They do not establish whether a two-line heading would feel too loose or crowded. Those visual trade-offs would need a separate comparison.

**Do not confuse:** Letter spacing changes gaps horizontally. Line height controls the vertical space allocated to a line of text.

### 11 What would you organise differently next time

**What they are asking:** Can you identify an improvement and explain the effort it would require?

**A simple answer:** I would choose an export process that includes explicit theme names and all role mappings from the start. Our first colour export had only one mode without a clear mode label. We needed a second data file and extra conversion logic. A clearer export structure would make future updates easier to check.

**The cost:** Setting up and maintaining a more suitable exporter, updating the converter, and validating both themes whenever the design changes.

**Keep it simple:** Say “an explicit structure for Light and Dark mappings.” You do not need to claim that a particular custom JSON field is an official standard.

### 12 Why is exporting hex values not enough for one source of truth

**What they are asking:** Why can one file of colours still lead to inconsistent screens?

**A simple answer:** A list of colours does not explain their jobs. Different elements may share a colour today but need different colours in another theme. I need semantic roles pointing to the palette, plus a repeatable way to regenerate CSS when the source changes. Otherwise the exported file becomes an old copy that people patch by hand.

**Your strongest example:** In the deliberate experiment, we changed the primary palette to green. Correct references followed it. A role containing a fixed blue value stayed blue. We captured that inconsistency and deleted the experiment branch without merging it. The working CSS is now restored to blue.

## Understanding your defects

A defect record explains what was wrong, its effect, how it was discovered and its current status. It is evidence that you inspected the work. Some entries are corrected mistakes; others are remaining limits.

### D1 The export left out Light mode

**In simple words:** The file included colour roles but only one version of each role. That was not enough to build both themes.

**Now:** Both themes are generated using an additional file extracted from saved Figma state. All 114 alias targets match that saved state. This review did not compare it with today's live Figma file.

**Lesson:** Check the contents of an export, not just its filename or size.

### D2 The export did not label its theme

**In simple words:** A colour list without a Light or Dark label can be assigned to the wrong theme.

**Now:** The converter reads explicit mode information from the supplementary file. The original export is preserved with its limitation.

**Lesson:** Values need context. Like an unlabelled set of garment measurements, correct numbers can be used for the wrong purpose.

### D3 Shadow conversion assumes the brand colour

**In simple words:** The converter knows how to make the three current blue shadows follow the primary palette. A future shadow using another colour would need extra handling. The CSS technique also needs browser support.

**Now:** This remains a documented limitation, not a current failure of the three chosen shadows. The validator rejects a raw colour if the converter falls back to one.

**Lesson:** A script can work for today's inputs without handling every possible future input.

### D4 A check complained about a comment

**In simple words:** The validator saw an old collection name in an explanatory comment and wrongly treated it as active styling.

**Now:** Fixed by excluding comments from that check.

**Lesson:** Checks can have bugs too. Investigate a failure instead of automatically changing correct work to silence it.

### D5 The agent guessed that the wrong font rendered

**In simple words:** The agent initially blamed a fallback font without checking the browser. Later inspection and a matching screenshot hash supported that the intended fonts had loaded. The unusual payment digits were connected to the wrong text style, D6.

**Now:** The diagnosis is corrected. Font files are also stored with the project, with their licences, so the page no longer needs the external font service at runtime.

**Lesson:** A declared font name or a visual guess is not proof of the font actually used. Self-hosting removes one external dependency; it does not guarantee instant loading or an offline application.

### D6 The balance used the heading font

**In simple words:** The agent used Cormorant Garamond for the remaining balance even though your rules assign payment figures to Manrope.

**Now:** Fixed to Title Large: Manrope 600, 22-pixel text and 33-pixel line height.

**Lesson:** A valid design-system style can still be used on the wrong element. The problem was a mismatch with your rules, not a universal rule that serif numbers are unreadable.

### D7 The Naira symbol uses a fallback font

**In simple words:** The browser report shows that the digits use Manrope while the ₦ symbol uses a system font with the current font setup.

**Now:** This remains a documented limitation. Its appearance may vary on other operating systems. The observed result concerns the bundled font setup; avoid generalising it to every Manrope font release.

**Lesson:** Check real currency symbols and other characters your customers need, not only ordinary English letters.

### D8 A CSS rule overruled the intended colours

**In simple words:** The general rule for record values had higher priority than the rules for the revised date, paid amount and balance. Those values stayed the general text colour.

**Now:** More specific selectors apply the intended semantic colours. The saved browser report records passing contrast for the checked values in both themes.

**Lesson:** Choosing the right token does not help if the browser applies another rule instead.

### D9 The broken experiment remained in the working CSS

**In simple words:** The experiment branch was gone, but the file used by the screen still contained its broken green-and-blue settings. An independent validation caught this.

**Now:** The broken file is archived as evidence and the application CSS has been regenerated. All 15 current checks pass. The project log attributes the reappearance to an old editor buffer saving over the regenerated file; this review confirms the corrected file, not the historical editor event itself.

**Lesson:** Check the actual files after cleanup. A branch being deleted does not prove the working folder is correct.

## What this review confirmed

- The validator passes all 15 checks on 31 October 2026.
- Primary tone 40 is #334DAF again and colour roles reference primitives.
- Both themes have 57 roles. Their 114 saved alias targets match the previously captured Figma state (`work/figma-m3-state.json` → `evidence/06b-tokens-colour-roles-modes-from-figma-state.json`), which is distinct from a fresh live Figma export.
- The date and payment selector fix (`D8`) exists in the CSS and is verified in the rendered browser report for both Light and Dark themes.
- The broader raw-colour report (`evidence/07-raw-value-search.txt`) includes commands, explicit exclusions, full code-file matches and explanations of legitimate matches.
- The brief is 360 words by whitespace count. Each formal interview answer remains under 200 words (134 to 182 words).
- The refreshed Light (`10c-screen-with-system-light.png`), Dark (`10-screen-with-system.png`), mobile (`10d-screen-with-system-mobile-dark.png`) and without-system (`09-screen-without-system.png`) screenshots show the corrected screen and fitting date (`Fri, 30 Oct 2026 · 4:00 PM`), with earlier captures preserved (`09a`, `10a`, `10b`). The browser report (`evidence/step7-font-loading-verification.txt`) confirms no horizontal overflow at 1280 pixels or 375 pixels.
- The regression commit (`017694d`) is not contained in any active branch.

## Final refinements completed on 31 October 2026

1. **Fitting date day-of-week corrected:** Changed `"Thu, 30 Oct 2026 · 4:00 PM"` to `"Fri, 30 Oct 2026 · 4:00 PM"` in both `screen/index.html` and `outputs/screen-without-system/index.html`, preserved `09a-screen-without-system-before-date-fix.png` alongside `10a` and `10b`, and refreshed `09`, `10`, `10c`, `10d`, and `step7-font-loading-verification.txt` along with their SHA-256 hashes in `docs/evidence-index.md`.
2. **Formal interview answer 11 simplified:** Updated Answer 11 in `docs/interview-answers.md` to recommend an explicit structure for Light and Dark role mappings (either named `Light` and `Dark` mode maps in one JSON export or separate Light/Dark files) without presenting custom `$extensions.modes.*` keys as a required official standard.
3. **Saved Figma state vs. fresh live export distinguished:** Kept explicit across all docs that `06b-tokens-colour-roles-modes-from-figma-state.json` was extracted from the previously captured Figma Variables state (`work/figma-m3-state.json`) because live Figma MCP sign-in was unavailable (`The plugin "figma" needs the user to sign in`), rather than claiming a fresh live export from Figma today.
4. **Remaining limitations kept visible (`D3` and `D7`):** Kept `D3` (shadow `color-mix()` assumes `primary/40` `#334DAF` and modern browser support) and `D7` (the bundled `Manrope` font setup falls back to the system font `.SF NS` for the single Naira symbol `₦`, `U+20A6`) clearly visible as remaining limitations rather than calling all defects fixed.

## How to practise

Start with your own explanation of the tailoring problem. Then answer each question aloud without reading. For every answer, give one project example and say where you would show the evidence. If you cannot explain a word, return to the dictionary rather than memorising it.

Practise these demonstrations: explain palette versus role; calculate 57 × 1.4; show the missing collections in the first export; show the wrong payment style and its correction; compare the blue screen with the deliberately broken green-and-blue screen.

Be clear about your contribution: you chose the business and design direction, instructed the agent, reviewed the results and learned to check its claims. Only describe actions as your own when that reflects what you actually did.

Your remaining learner work is understanding and rehearsing the answers, final submission review, and deciding whether to record the optional four-minute walkthrough. This guide does not claim that rehearsal or recording has happened.

## Where to find the proof

Paths below are relative to task-01-design-system.

| Topic | File |
|---|---|
| Formal answers | docs/interview-answers.md |
| Detailed defect history | docs/defects.md |
| Colour mappings and ratios | docs/colour-roles.md |
| Fifteen text styles | docs/type-scale.md |
| Why defaults changed | docs/divergences.md |
| Original agent answer | evidence/08-agent-typography-answer.txt |
| Later corrections | evidence/08b-typography-and-font-fixes-verification.txt |
| Browser font and colour report | evidence/step7-font-loading-verification.txt |
| Broken experiment | evidence/11-broken-referencing.png |
| Deleted branch record | evidence/12-git-log-branch-unmerged.txt |

Accessibility references for further reading: [W3C Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [W3C Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html), and [W3C Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html).
