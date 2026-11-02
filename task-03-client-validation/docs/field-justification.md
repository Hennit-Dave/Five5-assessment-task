# Form Field Justification — Nit's Cut

Task 3, Step 2: Information Design on the Authentication Forms (`/auth`).

Every field across the authentication forms must answer three mandatory questions:
1. **Why is it needed at that moment?**
2. **How would Nit's Cut use it?**
3. **What happens if the customer enters it incorrectly?**

---

## 1. Current Running Behavior vs. Intended Production Behavior

To maintain absolute technical honesty in assessment review and viva defence:

- **What Currently Runs (Task 3 Prototype):**
  - All three forms (`/auth?mode=signup`, `/auth?mode=login`, `/auth?mode=reset`) submit via explicit **HTTP POST** (`/auth/signup`, `/auth/login`, `/auth/reset`).
  - Inputs are received via parsed `req.body`.
  - Passwords are kept strictly out of URLs, query strings, and terminal request logs.
  - Handlers return a clear prototype confirmation view ([`app/views/auth-result.ejs`](file:///Users/blk/Developer/Five5%20assessment%20task/app/views/auth-result.ejs)) displaying submitted fields and confirming secure POST transmission.
- **Intended Account Behavior (Future Task 4 / Production):**
  - `signup`: Checks email uniqueness in SQLite, hashes password with a salted cryptographic hash, stores account row, creates authenticated session cookie.
  - `login`: Looks up email, verifies password hash, issues session cookie.
  - `reset`: Generates time-limited cryptographic token and dispatches reset email.

---

## 2. Inventory of Implemented Forms and Fields

### A. Signup Form (`/auth?mode=signup`) — Submitted via `POST /auth/signup`

#### 1. Full Name (`name="name"`, type: text)
- **Why needed at that moment:**
  Bespoke tailoring is an individualized craft. When a customer registers on Nit's Cut to track orders, collecting their name immediately personalizes their client portal ("Welcome, Babatunde") and allows atelier reception staff to locate their digital record if they register online before walking into the showroom.
- **How Nit's Cut uses it:**
  Labels the client profile, tags physical cutting work tickets, labels fabric garment covers, and addresses the customer in direct fitting communications.
- **What happens if incorrect:**
  If a customer enters nonsense or single punctuation, staff cannot identify who owns the garment when the customer arrives for a consultation.
- **Validation Rule Design (Avoiding the Class's Flawed Two-Word Rule):**
  - *The Class Mistake:* In class, a rule was demonstrated requiring "at least two words separated by a space". While designed to block automated single tokens ("a", "test"), that rule has a fatal flaw: it arbitrarily blocks people who legitimately have a single name (mononyms), of which there are millions globally and in West Africa.
  - *Nit's Cut Decision:* Nit's Cut allows single names. The validation rule requires a minimum of 2 characters and at least one non-whitespace character, permitting single-word names (e.g. "Chinedu", "Dapo", "Zendaya") while cleanly rejecting empty input, single punctuation marks, or whitespace-only submissions.

#### 2. Email Address (`name="email"`, type: email)
- **Why needed at that moment:**
  Serves as the unique account username and electronic contact point.
- **How Nit's Cut uses it:**
  Primary unique identifier in the database; receives booking receipts, fitting schedule notifications, and password reset links.
- **What happens if incorrect:**
  The customer is permanently locked out if their password is forgotten and receives no digital order receipts.

#### 3. Password (`name="password"`, type: password)
- **Why needed at that moment:**
  Secures the customer's personal tailoring portal, confidential body measurements, appointment calendar, and order history.
- **How Nit's Cut uses it:**
  Hashed on the server to authenticate future logins.
- **What happens if incorrect:**
  The customer cannot log in.

#### 4. Terms of Service Acceptance (`name="terms"`, type: checkbox, required)
- **Why needed at that moment:**
  Account creation establishes the legal relationship between the client and Nit's Cut. Registering involves storing personal contact information and agreeing to account rules.
- **How Nit's Cut uses it:**
  Enforces an affirmative, verifiable consent check before account creation.
- **What happens if unchecked:**
  HTML5 and backend validation block submission; accounts cannot be registered without agreement to terms.

---

### B. Login Form (`/auth?mode=login`) — Submitted via `POST /auth/login`

#### 1. Email Address (`name="email"`, type: email)
- **Why needed at that moment:**
  Identifies which existing account is attempting to authenticate.
- **How Nit's Cut uses it:**
  Queried in the database to locate the account.
- **What happens if incorrect:**
  Authentication fails with a generic error message ("Invalid email or password").

#### 2. Password (`name="password"`, type: password)
- **Why needed at that moment:**
  Proves ownership of the account.
- **How Nit's Cut uses it:**
  Compared against the stored password hash.
- **What happens if incorrect:**
  Authentication is rejected.

---

### C. Password Reset Form (`/auth?mode=reset`) — Submitted via `POST /auth/reset`

#### 1. Email Address (`name="email"`, type: email)
- **Why needed at that moment:**
  Identifies which customer account requires a password recovery link.
- **How Nit's Cut uses it:**
  Verifies account existence internally and dispatches a single-use token.
- **What happens if incorrect:**
  No reset email can be delivered.

---

## 3. Fields Evaluated and Deliberately Omitted

| Field Name | Category | Reason for Omission / Deferral |
|---|---|---|
| **Phone Number** | Deferred to Enquiry | **Phone collection is kept strictly at the tailoring enquiry (`POST /inquiries`).** At initial account signup, Nit's Cut has no cloth to cut and no immediate appointment to coordinate. Collecting phone numbers prematurely increases signup friction. In Task 2, `phone` is already collected on `POST /inquiries` exactly when a fitting is booked. |
| **Confirm Password** | Eliminated | Redundant typing friction. Increases mobile form abandonment. A standard "Show password" visibility toggle is far superior to forcing the user to type a masked string twice. |
| **Physical Delivery Address** | Eliminated | Bespoke tailoring begins with in-person consultations and fittings over weeks; shipping addresses belong at final collection/dispatch, not initial account registration. |
| **Date of Birth** | Eliminated | No age-restricted goods exist; collecting demographic data creates unnecessary data liability. |
| **Self-Measured Sizes** (Chest/Neck/Inseam) | Eliminated | In bespoke tailoring, clients must never measure themselves. Self-taken measurements ruin garments; Nit's Cut tailors measure clients in person. |
| **Marketing Spam Checkbox** | Eliminated | Promotional spam opt-in checkboxes irritate high-end clients. Service updates are handled through direct transactional emails. |
| **"Remember Me" Checkbox** | Eliminated | The application does not yet implement persistent session or cookie middleware. Adding a checkbox that does nothing is misleading decoration. |
| **Initial Captcha** | Eliminated | Friction for genuine human clients; bot mitigation belongs on rate limiting, not the default UI. |
| **Security Questions on Reset** | Eliminated | Insecure, easily guessed via social engineering, and deprecated under modern NIST SP 800-63B guidelines. |
| **New Password on Reset Request** | Eliminated | Creating a new password belongs on the authenticated single-use token callback page (`/auth/reset/:token`), not on the initial public reset request form. |

---

## 4. Nonfunctional Decoration Identified and Eliminated

1. **Submit Button Semantic Correction:** Submit buttons on all three forms previously had `type="button"`, which does not submit an HTML form. Updated to semantic `type="submit"`.
2. **Decorative Punctuation Removed:** Removed ornamental `&nbsp;·&nbsp;` dividers in login sublinks in favor of structured flexbox spacing (`.auth-sublinks` using token `var(--nc-space-3)`).
3. **Excluded Misleading Badges:** Visual "256-bit SSL Encrypted" or "Bank-Grade Security" shield badges were deliberately excluded because they deceive users into thinking client-side HTML provides backend security.
