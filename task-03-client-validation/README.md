# Task 3: The Form, Attacked from Both Sides

Nit's Cut client-side validation, accessibility audit, adversarial testing, and version control rollback implementation.

---

## Overview of Steps 1–9

### Step 1: Collapse the Authentication Pages
Consolidated three separate authentication routes (`/signup`, `/login`, `/reset`) into a single progressively enhanced `/auth` route that dynamically displays the requested form via `?mode=login|signup|reset`.
- **Implementation:** Added client-side history manipulation (`history.pushState` / `popstate`), form-card visibility switching, and heading focus management (`h1.focus()`) in [`app/public/js/auth.js`](../app/public/js/auth.js).
- **Results:** Reduced public site page count from 5 to 3 without losing direct URL addressability. Confirmed 0 server requests, 0 page reloads, and persistent JavaScript state across 6 form switches.
- **Evidence & Docs:**
  - Before page count: [`evidence/01-page-count-before.txt`](evidence/01-page-count-before.txt)
  - After page count: [`evidence/02-page-count-after.txt`](evidence/02-page-count-after.txt)
  - Address bar state capture: [`evidence/03-url-states.png`](evidence/03-url-states.png)
  - Zero-request form-switch logs: [`evidence/04-form-switch-logs.txt`](evidence/04-form-switch-logs.txt)
  - Architecture rationale: [`docs/spa-rationale.md`](docs/spa-rationale.md)

### Step 2: Justify Every Field
Audited every field across all three forms against three rigorous criteria: why it is required for Nit's Cut bespoke tailoring workflow, what breaks if omitted, and who is wrongly excluded.
- **Implementation:** Kept form footprints minimal. Documented tailoring business justification for client name, email address, password, and terms agreement.
- **Evidence & Docs:**
  - Field justification matrix: [`docs/field-justification.md`](docs/field-justification.md)
  - Terms of Service legal note: [`docs/terms-note.md`](docs/terms-note.md)

### Step 3: Four Categories of Validation Rules
Designed, authored, and verified client-side validation logic spanning four distinct categories:
1. **Category 1 (Empty fields on blur):** Inline error triggers on blur when leaving required fields blank.
2. **Category 2 (Length and structure):** Requires at least 2 characters with a letter for names (explicitly permitting mononyms like "Dapo" or "Chinedu"), and a 15+ code-point passphrase for signup passwords.
3. **Category 3 (Email timing):** Real-time format validation while typing on Signup vs. submit-time format checking on Login to avoid disruptive interruption during credentials entry.
4. **Category 4 (Assistive technology):** Programmatic error associations using `aria-describedby`, `aria-invalid="true"`, `role="alert"`, and focus recovery to the first invalid field upon failed submission.
- **Evidence & Docs:**
  - Category 1 empty field error: [`evidence/05-empty-field-error.png`](evidence/05-empty-field-error.png)
  - Category 2 length blocking: [`evidence/06-length-rule-blocking.png`](evidence/06-length-rule-blocking.png)
  - Category 3 real-time signup email: [`evidence/07-email-realtime-signup.png`](evidence/07-email-realtime-signup.png)
  - Category 3 submit-time login email: [`evidence/08-email-on-submit-login.png`](evidence/08-email-on-submit-login.png)
  - Complete rules documentation: [`docs/validation-rules.md`](docs/validation-rules.md)

### Step 4: The Numbers Game
Demonstrated the usability defect caused by `<input type="number">` on order reference lookup (where initial `0` causes typing `400` to yield `0400` and cursor jumping to the end), and corrected it using `<input type="text" inputmode="numeric" pattern="[0-9]*">`.
- **Implementation:** Preserved leading zeros (e.g. order `0042`), enabled numeric mobile keypads, and supported standard text cursor navigation without numeric stepper interference.
- **Evidence & Docs:**
  - Number input defects: [`evidence/09-number-input-annoying.png`](evidence/09-number-input-annoying.png) (and panels `09a`, `09b`, `09c`)
  - Numeric text input working: [`evidence/10-text-input-working.png`](evidence/10-text-input-working.png) (and panels `10a`, `10b`, `10c`)

### Step 5: Don't Give Away the Game
Audited the password recovery flow to prevent sensitive code shape disclosure and user enumeration attacks.
- **Implementation:** Replaced revealing placeholders and length-disclosing errors with generic guidance. Implemented uniform confirmation responses across existing and non-existent email addresses on password reset.
- **Evidence & Docs:**
  - Before (revealing code shape): [`evidence/step5-before-revealing-code-shape.png`](evidence/step5-before-revealing-code-shape.png)
  - After (generic guidance): [`evidence/step5-after-generic-code-shape.png`](evidence/step5-after-generic-code-shape.png)
  - Enumeration defense analysis: [`docs/enumeration.md`](docs/enumeration.md)

### Step 6: The Accessibility Audit
Conducted an accessibility audit across all fields against five criteria: colour independence (adding caution icons beside error text), keyboard reachability, visible focus indicators (tokenized 2px offset ring), error association (`aria-describedby` / `role="alert"`), and real VoiceOver screen reader announcements.
- **Implementation:** Fixed four genuine accessibility defects, added `aria-required="true"` to mandatory text fields, linked password hints via `aria-describedby`, and recorded learner VoiceOver retests.
- **Evidence & Docs:**
  - Written audit & transcripts: [`docs/accessibility-audit.md`](docs/accessibility-audit.md)
  - Tokenized focus indicators: [`evidence/focus-signup-dark.png`](evidence/focus-signup-dark.png), [`evidence/focus-signup-light.png`](evidence/focus-signup-light.png), [`evidence/focus-login-dark.png`](evidence/focus-login-dark.png), [`evidence/focus-login-light.png`](evidence/focus-login-light.png)
  - Corrected reset email wording: [`evidence/after-fix-reset-email-correct-wording.png`](evidence/after-fix-reset-email-correct-wording.png)

### Step 7: Password Rules and the Button State
Implemented password requirements (15+ character passphrase, progressive hint reveal on first keystroke, Heroicons visibility toggle) and resolved the submit button presentation debate:
- **Experiment:** First implemented the anti-pattern where the submit button was hidden entirely until the form was valid, capturing its disruptive layout shift in [`evidence/13-button-hidden-version.png`](evidence/13-button-hidden-version.png).
- **Final Solution:** Kept submit buttons permanently visible in their expected DOM positions with dynamic `aria-disabled="true"` styling (exceeding WCAG 4.5:1 contrast in both light and dark themes). Added submit-event guards that explain missing Terms rather than silently failing, and implemented `pageshow` listeners to clear submission locks during browser Back navigation.
- **Evidence & Docs:**
  - Hidden button experiment: [`evidence/13-button-hidden-version.png`](evidence/13-button-hidden-version.png)
  - Accessible inactive button: [`evidence/14-button-disabled-version.png`](evidence/14-button-disabled-version.png)

### Step 8: Attack Your Own Form, Then Skip It Entirely
Tested the security boundaries of client validation through both frontend automation and raw HTTP client bypass:
1. **Through the form:** Automated 18 attack vectors using headless Chrome CDP. Recorded what was caught (`a@b` failed regex, button remained disabled, 0 POSTs sent) and what slipped through (5,000+ character strings enabled the submit button due to missing `maxlength` bounds).
2. **Around the form:** Bypassed the browser entirely using raw `curl` POSTs directly to `/auth/signup` containing blatantly invalid and empty payloads.
- **Results:** The Express backend returned `HTTP 200 OK` and rendered `Signup Received (Prototype)` for all direct requests, proving that zero client-side rules protect backend endpoints.
- **Evidence & Docs:**
  - Automated browser attack logs: [`evidence/15-form-attack-results.txt`](evidence/15-form-attack-results.txt)
  - Raw curl command and server response: [`evidence/16-direct-request-command-and-response.txt`](evidence/16-direct-request-command-and-response.txt)
  - Security boundary analysis: [`docs/client-side-is-not-security.md`](docs/client-side-is-not-security.md)

### Step 9: Roll Back Without Hallucination
Demonstrated deterministic version control rollback using an explicit Git commit SHA on a dedicated local branch (`demo/step-9-rollback`):
1. **Baseline check (`4888362`):** Tested the single name "Dapo" on the starting baseline; verified that the form was valid, the button enabled, and exactly 1 POST reached the server.
2. **Experimental regret (`360930d`):** Introduced a flawed two-word full name requirement (`TWO_WORD_NAME_REGEX = /^\S+\s+\S+/`), which wrongly rejected mononyms like "Dapo" and disabled the submit button.
3. **Deterministic rollback (`f6217b9`):** Listed commits via `git log`, targeted the specific commit ID `360930d`, and executed `git revert --no-edit 360930d`.
4. **Verification:** Executed `git diff --exit-code 4888362 HEAD`, yielding exit status `0` (clean, zero difference against known-good baseline). Retested "Dapo" to confirm complete recovery of mononym support.
- **Evidence & Docs:**
  - Rollback transcript & diff check: [`evidence/17-commit-list-and-rollback.txt`](evidence/17-commit-list-and-rollback.txt)
  - Rollback rationale: [`docs/rollback.md`](docs/rollback.md)
