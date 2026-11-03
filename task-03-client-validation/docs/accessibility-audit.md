# Accessibility Audit & Screen-Reader Transcript — Nit's Cut

Task 3, Step 6: Written Accessibility Audit and Screen-Reader Verification (`docs/accessibility-audit.md`).

---

## 1. Audit Framework & Evaluation Criteria

In accordance with WCAG 2.1 AA and assessment guidelines, every field across the three authentication forms (`/auth?mode=signup`, `/auth?mode=login`, `/auth?mode=reset`) is audited against five mandatory criteria:

1. **Colour Independence (WCAG 1.4.1 Use of Color):**
   - Errors, warnings, and required states must not rely on color alone (e.g. red borders or red text).
   - A non-color visual signal (such as an icon, prefix text, or symbol) must accompany color changes.
2. **Keyboard Reachability (WCAG 2.1.1 Keyboard):**
   - All interactive controls must be reachable via `Tab` / `Shift+Tab`.
   - Checkboxes must toggle with `Space`; buttons must activate with `Enter` and `Space`.
3. **Visible Focus (WCAG 2.4.7 Focus Visible):**
   - The active element must display a distinct, high-contrast visual focus indicator that is not suppressed by `outline: none`.
4. **Error Association (WCAG 1.3.1 Info and Relationships & WCAG 3.3.1 / 3.3.2):**
   - Invalid fields must programmatically communicate invalidity via `aria-invalid="true"`.
   - Inline error messages must be programmatically associated with the input via `aria-describedby="<error-id>"`.
   - Error containers must notify assistive technologies (e.g. `role="alert"` or `aria-live`).
5. **Screen Reader Announcement (WCAG 4.1.2 Name, Role, Value):**
   - Real transcript of announcements spoken by macOS VoiceOver when navigating, focusing, triggering errors, and re-focusing fields.

---

## 2. Before-Fix Accessibility Audit Matrix

*Note: As instructed, entries remain blank until tested live with macOS VoiceOver by the learner to record actual observed speech without invention.*

| Form & Field Control | 1. Colour Independence | 2. Keyboard Reachability | 3. Visible Focus | 4. Error Association (`aria-describedby` & `invalid`) | 5. Screen Reader Announcement (Before Fix) | Status / Defect Notes |
|---|---|---|---|---|---|---|
| **Signup:** Full Name (`#signup-name`) |  |  | After empty submission returned focus here, the learner saw a blinking cursor inside the field and an outline around it. | Code review: linked to its own alert via aria-describedby. Validation sets aria-invalid on error and removes it on clearing. | Learner heard the name error (see transcript below). |  |
| **Signup:** Email Address (`#signup-email`) |  | Tab moved focus from Full Name to Email. | The learner saw the outline move to Email and a blinking cursor inside the field. | Code review: linked to its own alert via aria-describedby. Validation sets aria-invalid on error and removes it on clearing. | Learner heard the email error (see transcript below). |  |
| **Signup:** Password (`#signup-password`) |  | Reached with Tab. | Outline and blinking cursor. | Code review: linked to its own alert via aria-describedby. Validation sets aria-invalid on error and removes it on clearing. | Learner heard the empty-password error (see transcript below). |  |
| **Signup:** Terms Checkbox (`#signup-terms`) | Visible error when unchecked: “You must agree to the Terms of Service to create an account”. | Learner reached the checkbox by keyboard and reported that pressing Enter ticked it during this test. | Learner saw an outline around the focused checkbox. | Code review: linked to its own alert via aria-describedby. Validation sets aria-invalid on error and removes it on clearing. | Learner heard the label and checkbox role. On unchecking, the learner reported “i must agree to the terms of service before i can create an account”. | Heard “checked box” after pressing Space to select it. Exact spoken state on unchecking was not reported. |
| **Signup:** Submit Button (`button[type="submit"]`) |  | Reached by keyboard and activated with Enter. | Learner saw no visible change when the button received keyboard focus. | N/A (errors belong to the fields). | On focus returning to Full Name: “Please enter your name so we know who to address when you visit the shop” | With required fields empty, pressing Enter moved focus to Full Name. |
| **Login:** Email Address (`#login-email`) | Visible error: “Please enter your email address to access your account.” | Reached with Tab. | Outline and blinking cursor. | Code review: linked to its own alert via aria-describedby. Validation sets aria-invalid on error and removes it on clearing. | On leaving the empty field with Tab: “Please enter your email address to access your account” |  |
| **Login:** Password (`#login-password`) | Visible error: “Please enter your password” | Reached with Tab. | Outline and blinking cursor. | Code review: linked to its own alert via aria-describedby. Validation sets aria-invalid on error and removes it on clearing. | On leaving the empty field with Tab, the learner reported “please enter the your password”. |  |
| **Login:** Submit Button (`button[type="submit"]`) |  | Reached with Tab and activated with Enter. | Visible outline. | N/A (errors belong to the fields). | On focus returning to Email, the learner reported “please enter your emai address to access your account”. | With both fields empty, focus moved to Email. |
| **Reset:** Email Address (`#reset-email`) | Learner saw an error message at the email field. | Shift + Tab returned focus from the reset button to Email. | Learner saw a blinking cursor inside the email field. | Code review: linked to its own alert via aria-describedby. Validation sets aria-invalid on error and removes it on clearing. | On leaving the empty field with Tab, the learner reported “please enter your email address to access your account”. | The announcement uses login wording on the reset form. |
| **Reset:** Submit Button (`button[type="submit"]`) |  | Learner reached the button with Tab and activated it with Enter. | Learner saw an outline around the button when it received keyboard focus. | N/A (errors belong to the fields). | Learner paraphrase: VoiceOver asked for an email address to receive a password-reset link. | On repeat, the learner confirmed that focus was on the Email field after Enter and that VoiceOver asked them to enter their email. Wording is paraphrased. |

---

## 3. macOS VoiceOver Testing Protocol

### VoiceOver Setup on macOS
- **Turn On / Off VoiceOver:** Press `Cmd + F5` (or triple-click Touch ID / Power button).
- **Navigation Keys:**
  - `Tab` / `Shift + Tab`: Move between focusable controls.
  - `Control + Option (VO) + Left / Right Arrow`: Move VoiceOver cursor across elements.
  - `Space`: Check/uncheck checkbox or activate button.
- **VoiceOver Caption Panel:** Open *VoiceOver Utility* (`VO + F8`) &rarr; *Visuals* &rarr; enable *Caption Panel* to view real-time spoken text subtitles.

### Initial Walkthrough Test: Signup Full Name (`#signup-name`)
1. Open Google Chrome at `http://localhost:3000/auth?mode=signup`.
2. Press `Tab` until focus reaches **Full Name**.
3. Leave the field completely empty.
4. Press `Tab` once to move focus to the Email field (triggering the `blur` empty-field validation on Full Name).
5. Observe the appearance of the inline error message below Full Name.
6. Press `Shift + Tab` once to return focus to the Full Name field.
7. Record below the exact words spoken by VoiceOver upon returning to the errored field.

#### Before-fix announcements reported by the learner

**Signup Full Name**

> please enter your full name so we know who to address when you visist the shop

**Signup Email**

> An. email address is required to send your fitting confirmations and receipts

The learner heard both messages during the blank-field test. The quotations preserve the learner’s transcription. Which message was heard on Tab versus Shift + Tab is still unconfirmed.

**Signup Password**

> please choose a password to protect your account

The learner reported this announcement during the empty-password test. The exact focus transition is unconfirmed.

**Signup Terms checkbox**

Learner’s before-fix account, in their own words:

> it says i agree to the terms of service and says check box then while i uncheck the box it said i must agree to the terms of service before i create an account

The learner heard the label and role on focus and the agreement error when they unchecked the box. On a second test, the learner pressed Space to select the focused checkbox and reported:

> it says i agree to the terms of service and said checked box

This confirms an audible checked state in that test.

---

## 4. Defect Log (Four Real Problems Identified & Fixed)

### Defect 1: Reset email field uses the login error message on blur and submit
- **Steps to reproduce:** Open `/auth?mode=reset`. Focus the Email field and press `Tab` to leave it empty.
- **What happened:** The reset form handler called `validateEmail(rEmail, 'login', false)`. Both inline alert and VoiceOver announced: *"Please enter your email address to access your account."* This told users trying to reset their password how to log into their account.
- **What should happen:** The message must be specific to password recovery: *"Enter your email address to request a password reset."*
- **Remedy applied:** In [`app/public/js/auth.js`](file:///Users/blk/Developer/Five5%20assessment%20task/app/public/js/auth.js), updated `validateEmail` to handle `mode === 'reset'` with text `"Enter your email address to request a password reset."` and bound reset form listeners to `'reset'`. Verified in evidence `evidence/after-fix-reset-email-correct-wording.png`.

### Defect 2: Primary button focus indicator styling and contrast
- **Steps to reproduce:** Tab to the "Sign up" button on dark theme (`/auth?mode=signup`) and compare with "Log in" on `/auth?mode=login`.
- **Learner before-fix observation:** The learner saw no visible change when tabbing to the Sign up button, whereas on Log in, a visible outline was observed.
- **Analysis and token remediation:**
  - In `app/public/css/app.css`, `.btn` previously only specified `.btn:focus-visible`, without `.btn:focus`. In some browser states or focus transfers, programmatic focus did not show the focus ring.
  - All raw values (`#FFFFFF`, raw pixel offsets) were replaced strictly with existing project tokens:
    - Width: `var(--nc-focus-ring-width)` (2px from `nc-layout-tokens.css`)
    - Offset: `var(--nc-focus-ring-offset)` (2px from `nc-layout-tokens.css`)
    - Color: `var(--nc-color-primary)` (from `nc-tokens.css`)
- **Measured colour pairs and actual contrast (correcting prior 10+:1 claim):**
  - **Dark Mode (`[data-theme="dark"]`):** Focus ring `--nc-color-primary` (`#B8C4FF`) against adjacent card background `--nc-color-surface-container` (`#1F1F25`). Measured WCAG contrast ratio is **9.66:1** (exceeds WCAG 2.1 AA 3.0:1 non-text threshold).
  - **Light Mode (`:root`):** Focus ring `--nc-color-primary` (`#334DAF`) against adjacent card background `--nc-color-surface-container` (`#EFEDF4`). Measured WCAG contrast ratio is **6.41:1** (exceeds WCAG 2.1 AA 3.0:1 non-text threshold).
  - Keyboard focus was verified on both Sign up and Log in buttons across both Dark and Light themes (saved in `evidence/focus-signup-dark.png`, `evidence/focus-signup-light.png`, `evidence/focus-login-dark.png`, and `evidence/focus-login-light.png`).

### Defect 3: Signup password requirements were absent from HTML and not linked via `aria-describedby`
- **Steps to reproduce:** Open `/auth?mode=signup` and press `Tab` to focus the Password field.
- **What happened:** VoiceOver announced only *"Password, secure edit text"*. The 15-character minimum requirement was missing from the HTML markup and not associated via `aria-describedby`. Screen-reader users had no way of knowing the password length rules until after failing validation.
- **What should happen:** Requirements must be visible and programmatically linked so VoiceOver announces the requirement before the user types.
- **Remedy applied:** In [`app/views/auth.ejs`](file:///Users/blk/Developer/Five5%20assessment%20task/app/views/auth.ejs), added `<p id="signup-password-hint">Must be at least 15 characters long. Spaces are allowed.</p>` and linked the input using `aria-describedby="signup-password-hint signup-password-error"`.

### Defect 4: Six text inputs lacked required-state markers (distinguished from Terms checkbox)
- **Steps to reproduce:** Tab through the fields on `/auth?mode=signup`, `/auth?mode=login`, or `/auth?mode=reset`.
- **What happened:** The **six text inputs** (`#signup-name`, `#signup-email`, `#signup-password`, `#login-email`, `#login-password`, `#reset-email`) completely lacked a required-state marker—having neither HTML `required` nor `aria-required="true"`. Because the forms specify `novalidate`, assistive technology had no programmatic indication that these text fields were mandatory upon initial focus. In contrast, the **Terms checkbox** (`#signup-terms`) already had the native HTML `required` attribute in markup.
- **What should happen:** All mandatory fields must programmatically communicate their required status to assistive technology on initial focus.
- **Remedy applied:** In [`app/views/auth.ejs`](file:///Users/blk/Developer/Five5%20assessment%20task/app/views/auth.ejs), added explicit `aria-required="true"` to the six text inputs (`#signup-name`, `#signup-email`, `#signup-password`, `#login-email`, `#login-password`, `#reset-email`), and also added `aria-required="true"` to `#signup-terms` to ensure programmatic parity across assistive technologies.

---

## 5. After-Fix Accessibility Audit Matrix & Verification Transcript

Learner retest. The spoken errors below were reported during validation. Announcements on first entering untouched fields are still unconfirmed.

| Control | Learner observation | Result |
|---|---|---|
| Reset email | “Please enter your email address to access your account.” | Reset-specific speech was not verified. The local server currently serves JavaScript containing the reset-specific message. |
| Signup full name | “Please enter your name so we know who to address when you visit the shop.invalid data menu pop edit text” | Empty-field error heard. |
| Signup email | “An email address is required to send your fitting confirmations and receipts invalid data menu pop up email with autofill” | Empty-field error heard. “Required” occurs in the error text. The separate required-state announcement is unconfirmed. |
| Signup password | “Please choose a password to protect your account.invalid data with menu pop up” | Empty-field error heard. The 15-character guidance was not reported during this interaction. |
| Sign up button | Learner saw an outline when the button received focus. | Visible focus observed in this run. Theme and contrast were not measured in this manual check. |

### Follow-up learner retest

| Control | Visible text reported | VoiceOver transcript reported | Result |
|---|---|---|---|
| Reset email | “Enter your email address to request a password reset.” | “Enter your email address to request a password reset.required invalid data email” | The recovery-specific wording was visible and spoken on this retest. VoiceOver also announced the required and invalid states. |
| Signup password | “Must be at least 15 characters long. Spaces are allowed Please choose a password to protect your account” | “password must be at least 15 characters long. Spaces are allowed.Please choose a password to protect your account required invalid data” | The minimum-length and spaces guidance was visible and spoken alongside the empty-password error. VoiceOver also announced the required and invalid states. This observation covers the field with an error. |

### Post-redesign VoiceOver walkthrough

After the grouped Signup, Login and Reset walkthrough, the learner reported “for this all came through the same from the last audit”. This is one overall observation. No new field-by-field quotations or separate focus destinations were supplied for this run. The earlier transcripts and the before-fix Reset paraphrase retain their original context.
