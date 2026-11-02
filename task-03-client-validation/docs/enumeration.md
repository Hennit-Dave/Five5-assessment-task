# Data Shape Leakage and User Enumeration Defence — Nit's Cut

Task 3, Step 5: Protecting Sensitive Data Shapes and Preventing Account Enumeration.

---

## 1. The Sensitive Field and Why Its Shape Is Sensitive

### The Field
The sensitive field is the **Password Reset Recovery Code** (`recovery_code`), entered at the second stage of account recovery ([`/auth/recovery`](file:///Users/blk/Developer/Five5%20assessment%20task/app/views/recovery.ejs)).

### Why Its Shape Is Sensitive
Unlike public operational identifiers (such as Nit's Cut order reference `NC-204` or `NC-0042`, which are printed on receipts and garment bags), a password reset code is a **temporary secret authenticator**. Possession of this code authorizes access to a client's private account, bespoke garment measurements, and order history.

When a form reveals the exact shape of an authenticator (for example: `placeholder="e.g. 6-digit PIN: 492018"`, `maxlength="6"`, or helper text stating *"Enter the 6-digit number"*), it broadcasts technical specifications about the secret to anyone viewing the page.

---

## 2. What the Hint Taught a Person Guessing Codes

When the form contained revealing placeholder text and error messages, an attacker attempting to brute-force a customer's recovery code learned three vital facts:

1. **The Exact Length:** The code is exactly 6 characters long (not 8, 10, or 16).
2. **The Character Set:** The code consists strictly of decimal digits `0–9` (10 possible symbols per position), with no lowercase letters, uppercase letters, or punctuation.
3. **The Search Space (Entropy Collapse):**
   - If an attacker did not know the format, they would have to search across arbitrary alphanumeric combinations. An 8-character alphanumeric code ($62^8$) contains approximately **$218 \text{ trillion}$** combinations.
   - By telling the attacker that the code is a 6-digit decimal PIN, the search space collapses to exactly $10^6 = \mathbf{1,000,000}$ **possibilities** (from `000000` to `999999`).
   - On a fast network connection without rate limits, testing 1,000,000 combinations is trivial for automated scripts. The hint effectively handed the attacker a map of what to guess.

---

## 3. Why Removing the Hint Does Not Change the Number of Possible Codes

Removing the hint from the HTML is a **defensive measure**, not a source of cryptographic entropy.

- **The Math Does Not Change:** If the backend generates a 6-digit numeric PIN, there are still only 1,000,000 possible codes in reality. Removing the placeholder from the web browser does not create more combinations on the server.
- **The Attacker's Uncertainty:** What changes is the attacker's **knowledge**. Without the hint, an attacker cannot be sure whether the code is 6 digits, 8 alphanumeric characters, or a 12-character token. They must search a much larger theoretical space or spend time probing boundary conditions.
- **True Security Requires Backend Controls:** Obscuring the shape in client HTML does not make a weak code strong. Real protection requires server-side controls: cryptographically secure random generation (e.g. 128-bit tokens), short expiration windows (e.g. 15 minutes), single-use invalidation upon attempt, and strict IP and account rate limiting (e.g. 5 failed attempts locks the token).

---

## 4. How Account-Specific Messages Cause User Enumeration

Account enumeration occurs when a public website behaves differently depending on whether an entered identifier (email address or username) exists in the database.

### The Vulnerability in Reset Requests
On the initial reset request page ([`/auth?mode=reset`](file:///Users/blk/Developer/Five5%20assessment%20task/app/views/auth.ejs)), insecure applications frequently return differential messages:
- If the email exists: *"A recovery link has been sent to your email."*
- If the email does not exist: *"We could not find an account with that email address."*

### What an Attacker Gains
Nit's Cut caters to bespoke tailoring clients. An attacker with a leaked list of local business executives or public figures could feed those email addresses into the reset form. By observing which ones return "email sent" versus "email not found", the attacker builds a verified list of high-net-worth Nit's Cut customers. This is an information leak that violates client privacy.

### The Uniform Response Defence
A secure application returns the exact same response regardless of whether the email exists:
> *"If an account is associated with this email address, instructions have been sent."*

---

## 5. What the Customer Loses and How the Remaining Guidance Helps

Security controls almost always introduce friction for legitimate users. Removing shape hints is an intentional trade-off:

### What the Customer Loses
1. **Immediate Visual Confirmation:** A customer who receives an email with several numbers (e.g. an order reference `NC-0042` and a reset code `492018`) no longer sees `e.g. 492018` in the field to confirm which number to copy.
2. **Early Error Catching:** If the customer accidentally types 5 digits instead of 6, client-side validation no longer instantly stops them with *"Must be 6 digits"*. They will submit an incomplete code and receive a server rejection.

### How the Remaining Guidance Helps
Rather than leaving the customer with an unlabelled, cryptic box, we replaced the revealing hint with clear, non-leaking guidance:
- **Field Label:** Clearly labelled `Recovery Code`.
- **Instructional Helper Text:** *"Enter the code from your recovery message."*
- **Empty Error Message:** *"Please enter the code from your recovery message."*

This tells the customer exactly where to look (their email inbox or SMS recovery message) without advertising token length or character set constraints in the public HTML.

### Is the Trade-off Worth It?
**Yes.** Asking a legitimate customer to check their recovery message takes minimal effort. In return, the business prevents automated credential stuffers from confirming token formats or enumerating customer accounts.

---

## 6. What Was Preserved Elsewhere

To avoid cargo-culting secrecy onto non-sensitive fields:
1. **Signup Password Policy Preserved:** On [`/auth?mode=signup`](file:///Users/blk/Developer/Five5%20assessment%20task/app/views/auth.ejs), the guidance *"Must be at least 15 characters long. Spaces are allowed."* was deliberately preserved. Under NIST SP 800-63B, registration password rules must be communicated clearly to users so they can choose compliant passphrases.
2. **Order Reference Example Preserved:** On [`/orders/lookup`](file:///Users/blk/Developer/Five5%20assessment%20task/app/views/order-lookup.ejs), the placeholder `placeholder="e.g. 0042"` was deliberately preserved. An order reference is an operational identifier, not a secret. Hiding its format damages customer usability with zero security benefit.

---

## 7. Real Observations from the Running Prototype

To ensure technical honesty during assessment review and viva defence:

1. **Two Fictional Reset-Request Emails Tested:**
   - We submitted `POST /auth/reset` with two distinct fictional addresses:
     - `chinedu.test@example.com` (representing an existing customer).
     - `nonexistent.client@example.com` (representing an unregistered user).
   - **Observed Result:** Both requests returned HTTP `200 OK` and rendered identical responses:
     - Page Title: *"Reset Requested (Prototype) — Nit's Cut"*
     - Header: *"Password Reset Requested (Prototype)"*
     - Body Text: *"Prototype submission received. In this prototype, requesting a reset does not generate a token or send an email."*
   - Neither response leaked whether the address exists.

2. **Accurate Prototype Scope:**
   - In this prototype, the recovery form ([`/auth/recovery`](file:///Users/blk/Developer/Five5%20assessment%20task/app/views/recovery.ejs)) is an isolated demonstration interface.
   - It does **not** look up database records, dispatch live emails, generate cryptographic tokens, track token expiry windows, or enforce server rate limits.
   - Those mechanisms are future backend controls required for production deployment.
