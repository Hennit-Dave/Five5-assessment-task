# Genuine Defects Log — Nit's Cut Client Validation (Task 3)

This document records the genuine defects discovered, reproduced, fixed, and verified throughout the implementation of Task 3. Each defect details the user experience, reproduction procedure, engineering remediation, and verification evidence.

---

## Defect 1: `<input type="number">` Leading Zero Truncation and Stepper Cursor Jumps

- **Task / Step:** Step 4 (The Numbers Game)
- **Component:** Order lookup reference field (`/orders/lookup`)
- **What the User Experienced:**
  When entering numeric tailoring order references that begin with leading zeros (e.g. order `0042`), an `<input type="number">` field stripped the leading zeros. When the input held an initial `0`, clicking in and typing `400` resulted in `0400`, and the cursor abruptly jumped to the end of the input rather than allowing standard cursor movement. Furthermore, browser-injected stepper buttons cluttered the field, and accidental mouse-wheel scrolls changed the order number without the user's intent.
- **How We Reproduced It:**
  Built a test page at `/orders/lookup?version=number` with `<input type="number" value="0">`. Using automated Chrome CDP interaction, focused the field with the mouse and typed `400`. The field value became `0400`. When attempting to delete the leading `0`, cursor positioning behaved erratically due to browser number parsing.
- **What Changed:**
  Replaced `<input type="number">` with `<input type="text" inputmode="numeric" pattern="[0-9]*">`. This presents a numeric keypad on mobile devices, preserves raw string representation including leading zeros, and eliminates stepper buttons and scroll hijacking.
- **How We Checked the Fix:**
  Tested `/orders/lookup?version=text` in headless Chrome. Confirmed that entering `0042` preserved the full 4-character string `"0042"`, allowed standard ArrowLeft cursor navigation and backspacing, and rejected non-numeric characters without visual disruption.
- **Evidence:**
  - Defect capture: [`evidence/09-number-input-annoying.png`](../evidence/09-number-input-annoying.png) (and panels `09a`, `09b`, `09c`)
  - Resolution capture: [`evidence/10-text-input-working.png`](../evidence/10-text-input-working.png) (and panels `10a`, `10b`, `10c`)

---

## Defect 2: The recovery form disclosed the code format

The original recovery form displayed a six-digit example and a length-specific error. Someone testing guesses could learn the format from the page. Removing that clue left the number of possible codes unchanged.

The corrected form directs the customer to their recovery message. It also avoids echoing the submitted code or its length. A separate reset test returned the same prototype confirmation for two fictional addresses. The prototype did not check account existence or send email.

- **Evidence:**
  - Before (revealing code shape): [`evidence/step5-before-revealing-code-shape.png`](../evidence/step5-before-revealing-code-shape.png)
  - After (generic guidance): [`evidence/step5-after-generic-code-shape.png`](../evidence/step5-after-generic-code-shape.png)
  - Documentation: [`docs/enumeration.md`](enumeration.md)

---

## Defect 3: Password Reset Form Displayed Login Error Message

- **Task / Step:** Step 6 (The Accessibility Audit)
- **Component:** Reset password form email validation (`#reset-email`)
- **What the User Experienced:**
  When a user left the Email field blank on the Password Reset form (`/auth?mode=reset`) and tabbed out or attempted submission, the inline error and screen reader announced: *"Please enter your email address to access your account."* This instructed users who had lost their passwords on how to log in, rather than how to recover their account.
- **How We Reproduced It:**
  Opened `/auth?mode=reset`, focused `#reset-email`, and pressed `Tab` to leave it empty. The error banner displayed the login message.
- **What Changed:**
  Updated `validateEmail` in [`app/public/js/auth.js`](../../app/public/js/auth.js) to accept a `'reset'` mode argument and output recovery-specific copy: *"Enter your email address to request a password reset."*
- **How We Checked the Fix:**
  Tested the reset form in Chrome CDP and verified via macOS VoiceOver retest that the recovery-specific message is both rendered on screen and announced aloud by the screen reader.
- **Evidence:**
  - Visual verification: [`evidence/after-fix-reset-email-correct-wording.png`](../evidence/after-fix-reset-email-correct-wording.png)
  - VoiceOver audit log: [`docs/accessibility-audit.md`](accessibility-audit.md) (Section 4, Defect 1)

---

## Defect 4: Missing `aria-required` on Text Inputs and Unlinked Password Hint

- **Task / Step:** Step 6 (The Accessibility Audit)
- **Component:** Form controls across `/auth` (`#signup-name`, `#signup-email`, `#signup-password`, `#login-email`, `#login-password`, `#reset-email`)
- **What the User Experienced:**
  Screen reader users tabbing through form inputs had no programmatic indication that fields were required because the `<form>` elements used `novalidate` and inputs lacked `aria-required="true"`. Furthermore, the 15-character minimum requirement on Signup password was not linked via `aria-describedby`, meaning VoiceOver only announced *"Password, secure edit text"* without explaining the password rules until after validation failed.
- **How We Reproduced It:**
  Navigated the forms using macOS VoiceOver. On initial focus, inputs were announced without the "required" trait, and the password hint remained unread.
- **What Changed:**
  Added `aria-required="true"` to all mandatory inputs in [`app/views/auth.ejs`](../../app/views/auth.ejs). Added `<p id="signup-password-hint">` containing *"Must be at least 15 characters long. Spaces are allowed."* and linked it to `#signup-password` via `aria-describedby="signup-password-hint signup-password-error"`.
- **How We Checked the Fix:**
  Conducted follow-up VoiceOver retests. VoiceOver announced: *"password must be at least 15 characters long. Spaces are allowed. Please choose a password to protect your account required invalid data"*, confirming that guidance and required state are spoken together.
- **Evidence:**
  - VoiceOver transcripts: [`docs/accessibility-audit.md`](accessibility-audit.md) (Section 4, Defects 3 & 4; Section 5)

---

## Defect 5: Inactive Submit Button Hidden Entirely from the DOM

- **Task / Step:** Step 7 (Password Rules, and the Button)
- **Component:** Primary submit buttons on Signup, Login, and Reset forms
- **What the User Experienced:**
  In an early implementation experiment, the "Sign up" button was hidden entirely from the screen and DOM until all validation rules passed. Users had no visual anchor indicating where the form ended or how to submit. When the user checked the Terms checkbox, the button abruptly popped into existence, causing an unexpected layout jump.
- **How We Reproduced It:**
  Implemented hidden submit button behavior (`display: none` until valid). Captured the resulting UI state in [`evidence/13-button-hidden-version.png`](../evidence/13-button-hidden-version.png).
- **What Changed:**
  Abandoned the hidden-button pattern. Kept all submit buttons permanently visible in their natural DOM positions. Applied `aria-disabled="true"` to communicate inactivity while preserving keyboard tab order and visual stability. Styled inactive states using high-contrast design tokens (`--nc-color-on-surface-variant` on `--nc-color-surface-container-high`), achieving 7.65:1 (Light) and 8.39:1 (Dark) contrast ratios. Added submit-event guards that explain missing requirements (such as focusing Terms when it is the sole missing item).
- **How We Checked the Fix:**
  Captured the accessible inactive button state in [`evidence/14-button-disabled-version.png`](../evidence/14-button-disabled-version.png). Verified that clicking the inactive button provides helpful focus recovery rather than silent failure.
- **Evidence:**
  - Hidden version capture: [`evidence/13-button-hidden-version.png`](../evidence/13-button-hidden-version.png)
  - Accessible inactive version capture: [`evidence/14-button-disabled-version.png`](../evidence/14-button-disabled-version.png)

---

## Defect 6: bfcache Back Navigation Preserved In-Flight Submission Lock

- **Task / Step:** Step 7 (Password Rules, and the Button)
- **Component:** Form submission lock logic in `app/public/js/auth.js`
- **What the User Experienced:**
  After submitting a form and viewing the confirmation page, pressing the browser's Back button returned the user to the form. However, because modern browsers restore pages from the back/forward cache (bfcache), the in-memory JavaScript variable `isSubmittingSignup = true` survived. The submit button remained frozen, and deliberate resubmission was blocked.
- **How We Reproduced It:**
  Automated browser navigation in Chrome CDP: submitted Signup form to `/auth/signup`, called `window.history.back()`, refilled fields, and clicked submit. Exactly 0 POST requests were dispatched.
- **What Changed:**
  Added a `pageshow` event listener in `app/public/js/auth.js`:
  ```javascript
  window.addEventListener('pageshow', function () {
    isSubmittingSignup = false;
    isSubmittingLogin = false;
    isSubmittingReset = false;
    updateAllButtonStates();
  });
  ```
  This cleanly clears all submission locks and recalculates button states whenever the page is restored from bfcache.
- **How We Checked the Fix:**
  Reran automated CDP Back-navigation test suite across Signup, Login, and Reset. Verified that deliberate resubmission after Back navigation sends a new HTTP 200 POST request.

---

## Defect 7: Cultural Mononym Rejection via Two-Word Name Rule (Deliberate Step 9 Experiment)

- **Task / Step:** Step 9 (Roll Back Without Hallucination)
- **Component:** Category 2 Name Validation (`#signup-name`)
- **Note:** This was a **deliberate experiment** on branch `demo/step-9-rollback` designed to simulate an engineer implementing a regretted change that damages user experience and internationalization.
- **What the User Experienced:**
  A customer with a legitimate single legal name (a mononym such as *"Dapo"*, *"Chinedu"*, or *"Zendaya"*) was blocked from creating an account. The form displayed: *"⚠ Please enter both your first and last name."*, marked the input `aria-invalid="true"`, locked the submit button as `aria-disabled="true"`, and prevented submission.
- **How We Reproduced It:**
  On local branch `demo/step-9-rollback` (commit `360930d`), updated `app/public/js/auth.js` with `TWO_WORD_NAME_REGEX = /^\S+\s+\S+/`. Entered the fictional single name `"Dapo"`, email `dapo.test@example.com`, password `correct-horse-battery-staple-15`, and checked Terms. Tested via Chrome CDP: the submit button remained disabled, and clicking it dispatched 0 POST requests.
- **What Changed:**
  Recognized the multi-word requirement as a Western naming bias that excludes millions of legitimate users globally. Rather than attempting a conversational undo, inspected commit history (`git log --oneline -n 5`), targeted experimental commit `360930d`, and executed a deterministic version control reversal:
  ```bash
  git revert --no-edit 360930d
  ```
  This created revert commit `f6217b9`, fully restoring Nit's Cut Category 2 name rule (`val.length >= 2 && LETTER_REGEX.test(val)`).
- **How We Checked the Fix:**
  1. Verified with `git diff --exit-code 4888362 HEAD` that the tracked files matched the known-good baseline byte-for-byte (exit status `0`).
  2. Reran the CDP browser test with `"Dapo"`. The submit button activated immediately, and clicking it sent exactly 1 POST request to `/auth/signup`, successfully rendering `Signup Received (Prototype)` with HTTP 200 OK.
- **Evidence:**
  - Transcript & verification: [`evidence/17-commit-list-and-rollback.txt`](../evidence/17-commit-list-and-rollback.txt)
  - Architectural rationale: [`docs/rollback.md`](rollback.md)
