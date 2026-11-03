# Client-Side Validation Rules — Nit's Cut

Task 3, Step 3: Derivation of Validation Rules, Error States, and Accessibility Architecture.

---

## 1. Overview and Engineering Standard

Client-side validation is a user convenience, not a security boundary. It exists to provide clear, accessible feedback to a cooperative user before data leaves their browser.

Every validation rule introduces friction and inevitably excludes or inconveniences someone. A rule without an articulated cost is an unexamined assumption rather than an intentional business trade-off. Below, each rule explicitly documents:
1. **What the rule is.**
2. **What failure it protects against.**
3. **The genuine customer cost, friction, or exclusion.**
4. **The business decision and justification.**

---

## 2. Derivation of Rules Across the Four Categories

### Category 1: Empty-Field Rules (Inline Feedback on Blur)

*Triggered when a user focuses a form field and leaves (blurs) without entering data.*

#### 1. Full Name (Signup)
- **Rule:** Trimmed value must not be empty.
- **Error message:** *"Please enter your name so we know who to address when you visit the shop."*
- **What it protects against:** Accidental blank submissions that create anonymous order records without an identifiable client.
- **Customer Cost & Friction:** Users who prefer to inspect the entire form layout by tabbing through all fields before entering data are presented with an immediate inline warning on the first field before they have decided to type.
- **Business Decision:** Nit's Cut operates on personal client relationships. We accept this tabbing friction because an account created without a name is unusable for tracking bespoke tailoring consultations.

#### 2. Email Address (Signup & Login)
- **Rule:** Trimmed value must not be empty.
- **Error message (Signup):** *"An email address is required to send your fitting confirmations and receipts."*
- **Error message (Login):** *"Please enter your email address to access your account."*
- **What it protects against:** Submitting empty credentials that would inevitably fail authentication or database insertion.
- **Customer Cost & Friction:** Inconveniences users relying on autofill extensions that focus fields in unexpected orders or users who share family devices and must manually clear and re-enter credentials.
- **Business Decision:** Email is the primary key for client accounts. Requiring it on blur immediately signals the mandatory nature of the field.

#### 3. Password (Signup & Login)
- **Rule:** Value must not be empty.
- **Error message (Signup):** *"Please choose a password to protect your account."*
- **Error message (Login):** *"Please enter your password."*
- **What it protects against:** Creating unauthenticated accounts or submitting blank logins.
- **Customer Cost & Friction:** Users who rely on modern passwordless workflows (magic links, WebAuthn, passkeys) face the friction of having to supply a traditional password.
- **Business Decision:** In this prototype stage, passwords are the sole authenticator. The field is required.

#### 4. Terms Checkbox (Signup)
- **Rule:** Checkbox must be checked (`required`).
- **Error message:** *"You must agree to the Terms of Service to create an account."*
- **What it protects against:** Registering users without recorded assent to account rules.
- **Customer Cost & Friction:** Users who wish to explore portal features before agreeing to legal terms are blocked; users on mobile or assistive technologies face extra navigation steps to read the linked terms.
- **Business Decision:** Terms agreement is mandatory prior to account creation.

---

### Category 2: Length and Structure Rules

#### 1. Full Name Length and Structure (Signup)
- **Rule:** Minimum 2 characters; must contain at least one Unicode letter (`\p{L}`). Permits single-word names (mononyms), spaces, hyphens, and apostrophes. Rejects pure punctuation (e.g. `..`, `--`) and single characters.
- **Error message:** *"Please enter at least two characters, including a letter."*
- **What it protects against:**
  - Automated bot scripts populating forms with single-character test tokens ("a", "1", "x").
  - Users typing single punctuation marks (such as `.` or `-` to bypass an empty-field check).
  - Strings of pure punctuation passing a naive length check.
- **Customer Cost & Exclusion (Why the 2-Character Minimum Justifies Rejecting 1-Character Names):**
  - *Single-Name Support:* Nit's Cut intentionally avoids the class's flawed "at least two words separated by a space" rule, thereby welcoming customers with mononyms (e.g. Chinua, Dapo, Sade, Zendaya).
  - *Exclusion of Genuine One-Character Names:* This rule unambiguously excludes individuals whose legal or cultural name is a single letter (for example, individuals with single-letter family names such as "O" in certain Nigerian languages, or "U" in Myanmar).
  - *Design Decision and Trade-off:*
    - **Engineering & Integrity Concern:** The two-character minimum is a deliberate design decision to block automated bot test tokens ("a", "1", "x") and accidental single punctuation keystrokes (`.`, `-`) from polluting customer profiles and order receipts with unidentifiable entries.
    - **Explicit Customer Cost:** Nit's Cut acknowledges that this choice directly discriminates against and blocks legitimate customers who have genuine one-letter legal names. This is not mitigated by any claimed in-person exception or external procedure; it is a clear trade-off where the business accepts excluding genuine one-letter names online in exchange for filtering out single-character garbage and bot tokens.

#### 2. Password Policy (Signup vs. Login)
- **Policy Standard & Source:**
  - Standard adapted from **NIST SP 800-63B** (*Digital Identity Guidelines: Authentication and Lifecycle Management*, Section 5.1.1.2 Memorized Secret Authenticators).
  - In a password-only system without multi-factor authentication (MFA), NIST and industry consensus recommend a minimum of **15 characters** for memorized passphrases to withstand offline dictionary and brute-force attacks.
- **Signup Rule:**
  - Minimum **15 Unicode code points**, measured using `Array.from(val).length` to accurately count multi-byte and surrogate-pair characters.
  - **Preserves spaces in passphrases:** Spaces are valid passphrase characters and are never trimmed from the secret.
  - **Rejects all-spaces passwords:** A password consisting solely of whitespace (e.g. 15 spacebar taps) is rejected.
  - *Error message (<15 characters):* *"Password must be at least 15 characters long."*
  - *Error message (all spaces):* *"Password cannot consist solely of spaces."*
- **Login Rule (Kept Separate):**
  - The login form only enforces that the password field is **not empty**.
  - *Why separate:* Login must never disclose registration password policies or prematurely reject credentials that may have been created under previous rules or imported from external directories.
- **Customer Cost & Friction:**
  - A 15-character minimum imposes high cognitive friction on users who do not use password managers, particularly those on mobile virtual keyboards.
  - Customers accustomed to short 8-character passwords may find 15 characters frustrating.
- **Business Decision:** Because Nit's Cut currently lacks MFA and stores private customer measurement profiles and order histories, the security benefit of passphrase-length secrets outweighs the input friction. Spaces are preserved so users can create memorable multi-word passphrases (e.g. `bespoke lagos suit 2026`).

---

### Category 3: Email Format Feedback (Real-Time vs. Submit-Time)

#### 1. Real-Time Feedback on Signup (`/auth?mode=signup`)
- **Behavior:** Evaluates format on `input` as the user types.
- **Regex:** `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- **Error message:** *"Please enter a valid email address (e.g. name@example.com)."*
- **What it protects against:** Customers submitting mistyped email domains (e.g. `name@gmial` without a TLD), preventing the creation of permanently orphaned accounts.
- **Customer Cost & Friction:** Users experience visual interruption while still in the middle of typing their domain name (e.g. error displays while typing `chinedu@g`).
- **Business Decision:** On signup, data is collected for the first time. Preventing unrecoverable typos before registration outweighs the momentary visual friction during typing.

#### 2. Submit-Only Feedback on Login (`/auth?mode=login`)
- **Behavior:** Format validation is **strictly submit-only**.
  - Focusing the empty email and leaving it (blur 1) displays an empty-field error.
  - Returning, typing a malformed address, and leaving it (blur 2) clears the empty error and does **not** introduce a format error.
  - Submitting the form evaluates format, shows the format error if malformed, and focuses the field.
- **Why Submit-Only on Login:** Returning customers typing familiar credentials should not be subjected to aggressive error banners interrupting their keystrokes.
- **Customer Cost & Friction:** A returning user who makes a subtle typo only discovers the error after clicking "Log in" rather than while typing.
- **Business Decision:** The dignity and speed of returning clients takes precedence over real-time syntax policing.

#### 3. Password Reset Email Cost & Why Existence Checks Are Pointless
- **Password Reset Cost:** Customers who have lost access to their registered email inbox (e.g. changed employers or lost phone SIM) cannot recover their account through this flow. If an unregistered email is entered, security practices require returning a generic message to prevent user enumeration, leaving genuine users uncertain if they mistyped their address.
- **Why Email Existence Probes are Pointless (Two Sentences):**
  Client-side scripts cannot verify whether an email address actually exists because mail servers intentionally reject or falsify SMTP probes to prevent address harvesting by spammers. Even if an external check verified that an inbox existed, that check cannot prove that the person filling out the form owns or controls that inbox; true ownership can only be verified asynchronously by sending a single-use verification token.

---

### Category 4: Accessible Error Association (Implementation Checks)

*These checks verify programmatic association in code; comprehensive screen-reader auditing is conducted in Step 6.*

1. **Input Association:** Every field with an active error is programmatically coupled via `aria-describedby="<id>-error"`.
2. **State Announcement:** Invalid inputs receive `aria-invalid="true"`; error text containers have `role="alert"` so assistive technology immediately receives the update.
3. **Multi-Sensory Indication (WCAG 1.4.1):** Errors do not rely on color alone. Invalid fields display an error border (`--nc-color-error`), clear warning text, and an inline visual warning icon (`⚠`).
4. **Submit Focus Recovery:** When a form submission is blocked by client-side errors, JavaScript moves keyboard focus directly to the first invalid field (`firstInvalid.focus()`).

---

## 3. Empirical Test Results for Validation Adjustments

Automated execution via [`task-03-client-validation/scripts/test-validation-adjustments.mjs`](file:///Users/blk/Developer/Five5%20assessment%20task/task-03-client-validation/scripts/test-validation-adjustments.mjs) in Chrome DevTools Protocol:

| Test Case | Input Tested | Observed Result | Implementation Behavior |
|---|---|---|---|
| **14-char boundary (Signup Password)** | `"12345678901234"` (14 code points) | `aria-invalid="true"` | **Rejected:** Shows *"Password must be at least 15 characters long."* |
| **15-char boundary (Signup Password)** | `"123456789012345"` (15 code points) | `aria-invalid=null`, no error | **Accepted:** Meets minimum threshold. |
| **All-spaces password** | `"               "` (15 spaces) | `aria-invalid="true"` | **Rejected:** Shows *"Password cannot consist solely of spaces."* |
| **Passphrase with spaces** | `"bespoke lagos suit 2026"` (23 code points) | `aria-invalid=null`, no error | **Accepted:** Spaces preserved as valid passphrase characters. |
| **Unicode code points** | `"Babatunde ✂️ 🧵 26"` (17 code points) | `aria-invalid=null`, no error | **Accepted:** Multi-byte code points accurately counted. |
| **Login email Blur 1 (empty)** | Focus `login-email` and blur empty | `aria-invalid="true"` | Shows *"Please enter your email address to access your account."* |
| **Login email Blur 2 (malformed)** | Type `"chinedu@notanemail"` and blur | `aria-invalid=null`, no error | **No format error on blur:** Empty error cleared; format is not evaluated. |
| **Login email Submit** | Submit form with `"chinedu@notanemail"` | `aria-invalid="true"`, focused | **Format error on submit:** Shows *"Please enter a valid email address..."* and moves focus to field. |
| **Signup live email format** | Type `"babatunde@"` on registration | Live format error on `input` | Shows *"Please enter a valid email address..."* in real time while typing. |
| **Login password short** | `"short"` (5 chars) on login | `aria-invalid=null`, no error | **Accepted:** Login only enforces not-empty; does not enforce 15 characters. |

---

## 4. Step 7: Submit Button Inactive States, Submission Guards, and Password Visibility Architecture

### Rationale for Inactive Visible Buttons vs. Hidden Buttons (Two Sentences)
Keeping an inactive submit button visible in its expected layout position gives users immediate spatial predictability and confirms the ultimate action available on the page, whereas hiding the button causes confusing layout shifts and leaves users uncertain whether the form can even be submitted. When an inactive button is clicked or activated via keyboard, client-side validation triggers focused inline error messages and moves keyboard focus directly to the first incomplete or invalid field, clearly communicating to the user exactly what requirements remain to be satisfied.

### Dynamic Button State Activation Table

All three submit buttons remain visible in their normal position from the moment their form opens. Calculation of button state runs silently without displaying error messages on untouched fields:

| Form | Button Label | Active When | Inactive When | Inactive Styling & Contrast |
|---|---|---|---|---|
| **Signup** (`/auth?mode=signup`) | **Sign up** | Full Name passes name rule (≥2 chars with letter), Email passes format regex, Password passes 15-character rule (≥15 Unicode code points, not all spaces), and Terms checkbox is checked. | Any of the four requirements is unfulfilled or invalid. | `aria-disabled="true"`, background `--nc-color-surface-container-high`, text `--nc-color-on-surface-variant`, border `--nc-color-outline-variant`. Measured contrast: **7.65:1** (Light), **8.39:1** (Dark). |
| **Login** (`/auth?mode=login`) | **Log in** | Email is non-empty and passes email format regex, and Password is non-empty (`length > 0`). | Email is empty/invalid or Password is empty. | `aria-disabled="true"`, focusable with visible 2px outline, `cursor: not-allowed`. |
| **Reset password** (`/auth?mode=reset`) | **Send reset link** | Email is non-empty and passes email format regex. | Email is empty or invalid format. | `aria-disabled="true"`, focusable with visible 2px outline, `cursor: not-allowed`. |

### Submission Guards and Terms-of-Service Validation
- **ARIA does not block submission:** Setting `aria-disabled="true"` on a `<button type="submit">` visually dims the button and announces its inactive state to assistive technology, but native browsers will still fire form submission upon button click or Enter keypress.
- **JavaScript Guard:** The form's `submit` event listener intercepts all submission attempts (mouse clicks, Enter/Space on the button, Enter from text inputs).
- **Terms Checkbox Specific Handling:** When someone attempts to sign up without checking the Terms of Service (both when Terms is the only missing item and when other fields are also invalid), the submission is blocked, `#signup-terms-error` displays *"You must agree to the Terms of Service to create an account."*, the error is announced to screen readers via `role="alert"`, and keyboard focus moves immediately to the checkbox (`#signup-terms`) so the user can check it without tabbing across the form.
- **Double-Submit Prevention:** Once all validation requirements pass, the submission handler sets a submission lock (`isSubmitting = true`) preventing duplicate POST requests.

### Password Rule and Progressive Hint Architecture
- **Signup Rule:** Minimum 15 Unicode code points (`Array.from(val).length >= 15`), spaces allowed anywhere to support memorable passphrases, all-whitespace rejected (`!val.trim()`).
- **Progressive Hint Reveal:** On initial page render, `#signup-password-hint` is given the `.nc-visually-hidden` class. Because `#signup-password` specifies `aria-describedby="signup-password-hint signup-password-error"`, screen readers (such as VoiceOver) immediately read the 15-character guidance upon initial focus. As soon as the user starts typing (`input` event with `length > 0`), the hint is revealed visually below the field so sighted users do not have to guess the length requirement.

### Password Visibility Toggle vs. Password Confirmation Field
- **Why a visibility toggle is superior to a confirmation field:**
  Requiring users to type a password twice doubles cognitive friction and input effort (especially on mobile virtual keyboards), yet fails to prevent errors because users frequently copy-paste between the fields or type the same typo twice. A password visibility toggle using clear Heroicons eye and eye-slash outline icons allows users to visually verify what they typed, catch and correct typos in real time, and complete registration with confidence without disrupting form flow.
- **Implementation Specifications:**
  - Placed inside `.password-input-wrap` on both Signup (`#signup-password`) and Login (`#login-password`).
  - Uses official Heroicons v2 outline 24×24 SVG paths for `eye` (when hidden) and `eye-slash` (when visible).
  - Accessible name toggles between `"Show password"` and `"Hide password"` via `aria-label`.
  - Input field has `padding-inline-end: 2.75rem` (44px) so long passwords never collide with the toggle button, verified on 375px mobile viewports.
  - Toggling visibility switches `type="password"` ↔ `type="text"`, preserves the input's current value, retains keyboard focus on the toggle button, never submits the form, and never affects submit button activation.

### Empirical Evidence Summary (E13 vs E14)
- **Evidence 13 (`evidence/13-button-hidden-version.png`):** Demonstrates the hidden-button experiment where the Sign up button was hidden from view and keyboard navigation when the form was incomplete (password empty). Hiding the button produced an unnatural void below the Terms checkbox and left the user uncertain how to complete registration.
- **Evidence 14 (`evidence/14-button-disabled-version.png`):** Demonstrates the final accessible implementation reproducing the same validation state using fictional data (`"Folake Adeyemi"`, `"folake.test@example.com"`, empty password, Terms checked). The inactive "Sign up" button remains visible in its expected position, programmatically marked with `aria-disabled="true"`, styled using semantic tokens (`--nc-color-surface-container-high` / `--nc-color-on-surface-variant`), and fully keyboard focusable with a 2px outline.

### Learner VoiceOver walkthrough for Step 7

- Signup password: On focus, the learner reported “password must be 15 characters long”. After entering a valid passphrase, the error cleared and the length hint was visible. The learner heard both toggle labels and used Space to show the letters and mask them again.
- Signup with only Terms unchecked: VoiceOver said “sign up dimmed button”. Pressing Enter returned focus to the unchecked Terms checkbox. The learner reported hearing that agreement was required before creating an account.
- Login: Space revealed the password while the form stayed open. Pressing Space again without moving focus masked it.
- Reset: With Email empty, the learner reported “send reset link dimmed button”. After entering a valid email, the learner reported “send rest link button”. The second transcription omits “dimmed”. This interaction tested the announced state without submitting the form.

---

### Browser Back-Navigation and In-Flight Submission Network Log Results

Verified via headless Chrome CDP ([`test-step7-comprehensive-review.mjs`](file:///Users/blk/Developer/Five5%20assessment%20task/task-03-client-validation/scripts/test-step7-comprehensive-review.mjs)) tracking HTTP POST requests across rapid double-clicking, in-flight editing during delayed responses, and complete back-navigation/resubmission lifecycles for **Signup**, **Login**, and **Reset**:

| Form | Endpoint Tested | Rapid Double-Click POSTs | In-Flight Edit During Delayed Response | Attempt 1 POSTs & Status | Screen Result (Attempt 1) | Back-Navigation (bfcache) | Attempt 2 POSTs & Status | Cumulative POSTs | Final Status |
|---|---|---|---|---|---|---|---|---|---|
| **Signup** | `/auth/signup` | Exactly 1 POST | Exactly 1 POST (2nd submit blocked during in-flight edit) | 1 POST (HTTP 200) | `Signup Received (Prototype)` | Restored to `/auth?mode=signup` (`bfcache: true`). All fields restored. Button active. | 1 new POST (HTTP 200) | **2 POSTs total** (0 dropped, 0 duplicate) | **PASSED** |
| **Login** | `/auth/login` | Exactly 1 POST | Exactly 1 POST (2nd submit blocked during in-flight edit) | 1 POST (HTTP 200) | `Login Received (Prototype)` | Restored to `/auth?mode=login` (`bfcache: true`). All fields restored. Button active. | 1 new POST (HTTP 200) | **2 POSTs total** (0 dropped, 0 duplicate) | **PASSED** |
| **Reset** | `/auth/reset` | Exactly 1 POST | Exactly 1 POST (2nd submit blocked during in-flight edit) | 1 POST (HTTP 200) | `Password Reset Requested (Prototype)` | Restored to `/auth?mode=reset` (`bfcache: true`). Email restored. Button active. | 1 new POST (HTTP 200) | **2 POSTs total** (0 dropped, 0 duplicate) | **PASSED** |

#### Browser Behavior and In-Flight Lock Architecture
- **Preserved `pageshow` Reset for Back-Navigation:** To allow users to submit again after pressing the browser Back button, `window.addEventListener('pageshow', ...)` resets the submission locks (`isSubmittingSignup = false`, `isSubmittingLogin = false`, `isSubmittingReset = false`) and re-evaluates button active states upon return.
- **Strict In-Flight Lock Protection:** The submission-lock resets were intentionally excluded from field validation and button-state update functions (`updateSignupButtonState`, `updateLoginButtonState`, `updateResetButtonState`). If a user edits an input while a previous submission is still pending in-flight (tested with a 1200ms delayed server response), the active submission lock remains locked, ensuring that repeated button activations or Enter keypresses cannot send duplicate requests to the server.
- **Rapid Double-Click Protection:** For all three forms, dispatching synchronous or near-instant duplicate click events sends exactly one HTTP POST request, preventing double-submission defects.
- **bfcache Heap Preservation:** In Chrome, window variables set prior to submission (`window.__bfcacheCanary`) survived browser back navigation (`history.back()`), confirming that the document heap was restored from the browser's Back/Forward cache.
- **Limitations:** Testing was executed via headless Google Chrome under CDP. OS-specific desktop browser UI behaviors (e.g. native browser dialog prompts like "Confirm Form Resubmission" which occur on POST refresh rather than back-navigation) were not observed during `history.back()` because the back navigation returned to the cached GET form page rather than refreshing a POST endpoint.
