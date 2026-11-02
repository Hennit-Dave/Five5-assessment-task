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
