# Nits Cut combined interview and defects study guide
This single guide contains Task 1 and Task 2, with space to add Tasks 3–5 later. The formal assessment answer files remain separate. Use the task headings to find the section you want to practise.

Prepared on 31 October 2026. This is a learning companion to your formal interview answers and defect log. Read it to understand the ideas, then practise explaining them in your own words. The sample answers describe project work; they do not mean you must claim you personally wrote every script.

## Task 1 Interview Questions Answers and Defects

The following Task 1 material is retained from the earlier guide. Its review findings describe the state at that review date.

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

## Task 2 Interview Questions and Answers

Added on 1 November 2026. Task 2 moves from design rules to a running application, database evidence and Git practices. These explanations simplify the supplied answers and correct misleading claims. They do not certify that every Task 2 deliverable is finished. The performance figures and database experiment below come from the saved project records, not a new test in this review.

### Words to understand first

| Word | Simple meaning |
|---|---|
| Branch | A named line of work in Git |
| Commit | A saved snapshot with a message and identifier |
| Remote | Another repository, such as the one on GitHub |
| Push | Send local commits and branch updates to a remote |
| Pull request | A request to review and combine a branch's changes |
| Merge | Combine lines of work |
| Rebase | Replay changes on another starting point |
| CI | Automated checks run when code changes |
| Production | The live environment used by real users |
| Database persistence | Data stays saved beyond the immediate request |
| Migration | A recorded change to the database structure |
| Prepared statement | A database query whose values are supplied separately from its SQL instructions |
| HTTP status | The server's reported result for a request, such as 200, 201 or 500 |
| Cold request | An initial request that may incur setup work |
| Round trip | The time the client waits for the request and response |

### 1 What is the difference between Git Flow and trunk based development

**What they are asking:** How do teams organise branches, and why might they favour frequent small changes?

**A simple answer:** Git Flow separates work into branches such as main, develop and release branches. It can suit a planned release schedule. Trunk-based development keeps integration centred on one main branch, with small changes added frequently, often through short-lived branches. Frequent integration can reduce how far people's work drifts apart and reveal problems sooner. It needs reliable checks and discipline.

**Example:** Two tailors comparing their work frequently can spot mismatched measurements earlier than if they work separately for weeks.

**Remember:** Long-lived branches can make merging harder, but conflicts are not inevitable. Git Flow does not require every feature to last weeks, and trunk-based development does not automatically deploy every change to customers.

### 2 What does git push force do and why is force with lease safer

**What they are asking:** What could happen if you replace shared branch history?

**A simple answer:** A force push can replace the remote branch's current history with my version, even if that removes other commits from the branch. Force-with-lease adds a check that the remote branch still points to the commit I expect. If it changed unexpectedly, Git refuses the update.

**Example:** It is like replacing a shared document only if nobody has changed it since the version you checked.

**Important limit:** It is safer, not risk-free. Background fetching can weaken the protection of the usual tracking-reference form. Lost branch history is not necessarily permanently erased immediately; copies or reflogs may still allow recovery. Neither command bypasses the server's permissions or branch rules.

**Reference:** [Official Git push documentation](https://git-scm.com/docs/git-push).

### 3 Why is rewriting shared history dangerous

**What they are asking:** Why does changing earlier commits affect other people?

**A simple answer:** Other people may already be working from those commits. Rebase and amend can create replacement commits with different identifiers. If I publish that rewritten history, their work and the shared branch can disagree about what happened. That creates extra recovery work and can lose changes from the branch.

**What I would do:** On a shared branch, I normally make a new correction commit or revert the unwanted change. Any necessary rewrite needs coordination. Rewriting unshared personal work is usually easier to manage.

**Remember:** Revert adds a new commit that undoes a change. It does not erase the old commit. It is not enough to remove a leaked secret from history; the secret must also be revoked or rotated.

### 4 What is the difference between merge and rebase

**What they are asking:** How can two lines of work be brought together?

**A simple answer:** Merge combines histories while keeping existing commit identities. When histories have diverged, it usually creates a merge commit. If one branch is simply ahead, Git may fast-forward without creating one. Rebase replays changes onto a new base and normally gives those replayed commits new identities.

**When I would choose each:** I would use merge to combine shared work without rewriting it. I might rebase my own unshared branch to place it on the latest main branch before review. Either approach still needs checking and testing.

**Do not confuse:** Squash merging combines the changes into one new commit. It does not preserve the original individual commit identities or signatures as that new commit's identity or signature.

**Reference:** [Official Git merge documentation](https://git-scm.com/docs/git-merge).

### 5 What causes a merge conflict and what do the markers mean

**What they are asking:** What should you do when Git cannot safely combine changes?

**A simple answer:** A conflict happens when Git cannot automatically reconcile changes, such as two edits to the same area or an edit on one branch and deletion on another. The markers show the competing versions. I read both, decide what the final file should contain, remove the markers, test the result and stage the resolution before continuing.

- `<<<<<<< HEAD` starts the first version.
- `=======` separates the two versions.
- `>>>>>>> other-branch` ends the second version.

**Remember:** These common markers use seven characters. Keep the correct result, which may combine parts of both versions. Do not blindly accept one side. During rebase, the meaning of the sides can be surprising, so inspect the operation and actual changes.

### 6 What are the working directory staging area and repository

**What they are asking:** Do you understand where changes are before and after a commit?

**A simple answer:** The working directory contains the files I edit. The staging area holds the version I have selected for the next commit. The local repository stores committed history. I edit, use git add to select changes, then git commit to record that selected snapshot. Git push shares it with the remote.

**Example:** Editing a garment specification is working-directory activity. Choosing which changes to record is staging. Saving the agreed version with a note is committing.

**Important limit:** If I edit a file again after staging it, the newer edit is not automatically included in that staged version. A local commit is also not a backup against losing the computer. Git history can become unreachable or be removed; do not describe it as impossible to lose.

### 7 What is branch protection

**What they are asking:** How can a team prevent risky changes reaching an important branch?

**A simple answer:** Branch protection sets rules for updating a branch such as main. Depending on the configuration, it can require a pull request, reviews and passing checks, or restrict force pushes and deletion. Some setups also require signed commits or an up-to-date branch.

**Example:** Before a change reaches main, a reviewer checks it and automated tests must pass.

**Remember:** Those are possible rules, not guarantees about our repository. I must inspect the actual configuration before claiming they are enabled. Passing checks or having a signature does not prove the code is correct or safe.

### 8 Walk me through a project you built end to end

**What they are asking:** Can you connect the business need to implementation and evidence?

**A simple answer to adapt:** Nit's Cut is my assessment project for a men's tailoring business. I started with the need for clear order progress, dates and payment information. With agent assistance, I developed a design system and then an Express application using EJS. The project uses SQLite and better-sqlite3 for enquiry records. The saved evidence records two submissions and database rows with different IDs and timestamps. We also deliberately broke the database path and recorded an error response instead of success.

**Evidence:** The recorded successful writes are at 17:48:43 and 17:51:01 UTC on 31 October 2026. Refer to the actual logs and database-row capture when discussing them.

**Be honest:** Describe your choices, instructions and checks, and acknowledge the agent's implementation work. Do not describe this as a fully deployed customer platform unless that has actually happened.

### 9 Tell me about something you built breaking in production

**What they are asking:** Have you handled a failure affecting real users, and what did you learn?

**Important correction:** The supplied answer describes a previous customer portal, a failed email worker and thousands of queued jobs. No supporting experience was provided here. Do not present that story as your own.

**A truthful answer if you have no production incident:** I have not yet handled a real production outage. My closest relevant experience is a controlled failure in my local Nit's Cut project. We used an invalid database path, submitted an enquiry and checked the response and logs. The application returned a 500 error and told the user the record was not stored. This taught me to inspect the database and failure behaviour rather than trust a screen alone. I would distinguish this exercise from a real production incident.

**If you do have a real incident:** Replace this with what actually happened, your role, the impact, your fix and what changed afterwards.

### 10 How do you learn an unfamiliar codebase

**What they are asking:** How do you get useful understanding without reading everything randomly?

**A simple answer:** I start with the README, setup instructions, dependencies and configuration. I run the project in a safe local environment. Then I follow one user action through the code, such as an enquiry moving from a form to a route and into the database. I read the related tests and recent changes, and ask about anything unclear.

**Your example:** Follow the enquiry form, its POST route, validation, prepared SQL statement and response. Then check the saved row.

**Remember:** Deliberate breakages belong in an isolated test environment with permission, not an unfamiliar production service.

### 11 What is the difference between correct and complete code

**What they are asking:** Can a working piece still be insufficient for delivery?

**A simple answer:** Correct code behaves according to its specification. That includes error handling when the specification requires it; correctness is not limited to the happy path. Complete work covers the full agreed scope, including integration, tests, setup instructions, relevant security and accessibility requirements, and operation or maintenance needs.

**Your example:** An insert function may correctly save a valid enquiry, but the feature is not complete if its form, validation, useful error response or migration instructions are missing.

**Remember:** Completion is judged against an agreed scope. It does not mean the software can never fail or that every possible future feature exists.

### 12 How do you build software someone else can maintain

**What they are asking:** Could another person run, understand and change the project without depending on you?

**A simple answer:** I use understandable structure, clear names and documented setup steps. I record database changes as migrations, keep secrets out of Git, explain required environment settings and provide useful error logs. I add relevant tests and explain how to regenerate design assets. I ask someone unfamiliar with the project to try the README and fix the difficulties they report.

**Your example:** The Express, EJS and SQLite choices give this project a relatively small set of parts to explain. Prepared statements keep submitted values separate from SQL instructions.

**Be honest:** A tested README is something to demonstrate with real feedback, not assume. A simple stack does not automatically make a project maintainable, and another framework or ORM is not inherently unreliable.

### 13 Where did your first load time go

**What they are asking:** Which performance numbers did you measure and which explanations are guesses?

**A simple answer:** Our saved local test records 25.25 milliseconds for the first HTML request and 2.47 milliseconds for the next. The server log records 6 milliseconds and 1 millisecond respectively. The HTML response was 3,596 bytes. These measurements cover different parts of the request, so I cannot assign the difference to particular causes without more measurements.

**Important distinction:** This was an HTML-response timing, not a full browser page load including CSS, fonts, layout and painting. The approximate difference for the first request is 19.25 milliseconds, but server timing is rounded and the measurement boundaries differ.

**Possible causes to investigate:** Connection setup, client overhead, scheduling and server work. Template reading and compilation may already be inside the server's measured duration, so do not automatically count them again as outside it. A profiler or more detailed timing can narrow this down.

### 14 Why could an app report success without saving anything

**What they are asking:** How can the interface hide a failed database write, and how would you catch it?

**A simple answer:** That was not the result of our recorded failure test: Nit's Cut returned 500 and displayed an error. In a faulty application, a route might catch a database error but still show success, or respond before an asynchronous write finishes. The user sees confirmation even though nothing was saved.

**The strongest quick check:** Submit a test entry with a unique value, then query the intended database independently for that exact entry. Check its ID, saved values and timestamp. Correlate it with the request logs.

**Remember:** A 201 is the server saying a resource was created; it is not independent proof of a committed database row. Successful form flows may also use redirects. The absence of 201 alone does not prove a write failed. better-sqlite3's ordinary query calls are synchronous, so missing await is a general example rather than a diagnosis of our driver.

### 15 Why does reaching a dashboard not prove the backend works

**What they are asking:** What evidence is missing from a successful-looking screen?

**A simple answer:** The dashboard might contain sample data or appear even after a failed write. Seeing it only proves that the user reached that screen. It does not prove the intended account or enquiry was stored, or that other required backend actions happened.

**What I would do:** Submit a uniquely identifiable test record. Check the request result and independently inspect the intended database for the committed record. Read it through a fresh request or connection. Then deliberately cause a safe database failure and confirm the interface reports an error. Add an integration test checking both the response and database state.

**Your example:** For Task 2, check the enquiries table. Do not claim that a signup system with password storage was tested when the evidence concerns a tailoring-enquiry form.

## Task 2 practice and evidence reminders

Practise questions 6, 8, 13 and 14 first: explain the three Git areas, tell the project story, separate measured timing from guesses, and explain how to prove a database write. Then practise the remaining questions without reading full paragraphs.

Task 2 evidence paths are relative to `task-02-repository-and-scaffold/`, unlike the earlier Task 1 evidence table:

- `evidence/04-first-load.txt`: recorded HTML-response timing.
- `evidence/11-write-succeeded-logs.txt`: successful submission records.
- `evidence/12-database-rows.png`: saved row inspection capture.
- `evidence/13-write-failed-logs.txt`: deliberate database failure.
- `docs/false-success.md`: experiment account; some explanatory claims need the qualifications given above.

These are study explanations, not a claim that you have mastered the material or personally experienced an unverified production incident. Formal Task 2 answers remain unchanged in this edit. Before submission, correct their unverified production story and misleading claims about permanent commit loss, merges, correctness, timing and HTTP status as database proof.

## Future task sections

Task 3, Task 4 and Task 5 questions and simple answers will be added to this same guide when supplied. No answers or completion claims have been invented for them.
