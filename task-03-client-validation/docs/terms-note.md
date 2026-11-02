# Terms of Service Note — Nit's Cut

Task 3, Step 2: Terms and Conditions Acceptance, Source Attribution, and Adaptation.

---

## 1. Requirement and Provenance

Registration collects customer information (Full Name, Email Address, Password) to establish an online client portal account.

Per the assessment instructions:
> "Terms and conditions. Add acceptance. You are collecting personal data and in most of these businesses taking money, so this is not optional. Write in docs/terms-note.md where your wording came from. Adapting an existing template or getting it checked is the honest answer. Writing your own legal text from scratch is not, and claiming an agent wrote your terms and that is fine is a wrong answer you should be ready to defend against."

**Source Selection:**
Adapted strictly from the account-use provisions of Section 2 (&ldquo;Your Account&rdquo;) of the published **Automattic Terms of Service**.
No commercial deposit, cancellation, refund, or alteration policies have been invented for Nit's Cut. The text is labelled as an **Assessment Draft** in accordance with project guidelines.

---

## 2. Source Attribution and Licence

- **Source Title:** Automattic Terms of Service
- **Publisher:** Automattic Inc.
- **Source URL:** [https://wordpress.com/tos/](https://wordpress.com/tos/)
- **Original Work Licence:** [Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/)
- **Relevant Section:** Section 2 (&ldquo;Your Account&rdquo;), specifically the clauses governing account registration information accuracy and user responsibility for password security.

### Exact Changes Made from Original Work:
1. **Narrowed Scope:** Extracted only the two essential account-use principles: (a) providing complete and accurate contact details for appointment communications, and (b) maintaining confidentiality and security over login credentials.
2. **Excluded Broader Provisions:** Removed the unilateral termination-at-any-time clause, as well as all terms regarding blog publication, domain registration, eCommerce digital sales, payment processor fees, advertising, and content licensing.
3. **Atelier Context:** Adjusted references to apply specifically to Nit's Cut customer account management and appointment communications.

### Licence for Adapted Work:
In accordance with the ShareAlike condition of CC BY-SA 4.0, this adapted text is licensed under the **[Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/)** licence.

---

## 3. Short Adapted Wording (Assessment Draft)

The narrowed text rendered on [`/terms`](file:///Users/blk/Developer/Five5%20assessment%20task/app/views/terms.ejs):

> ### Nit's Cut Account Terms of Service (Assessment Draft)
>
> **1. Account Registration and Accuracy**  
> Where use of Nit's Cut services requires an account, you agree to provide complete and accurate information and to keep the information current so that we can communicate with you regarding your account, orders, and fitting appointments.
>
> **2. Account Security and Password Confidentiality**  
> You are solely responsible and liable for all activities that occur under your account. You are also responsible for maintaining the security of your account, which includes keeping your password secure and confidential.
>
> ---
> *Attribution: Adapted from Section 2 of Automattic Terms of Service (https://wordpress.com/tos/) by Automattic Inc., licensed under CC BY-SA 4.0. Adapted under the same CC BY-SA 4.0 licence.*

---

## 4. UI Implementation and Verification

- **Form Checkbox:** Rendered in [`app/views/auth.ejs`](file:///Users/blk/Developer/Five5%20assessment%20task/app/views/auth.ejs) with `required` attribute and initially unchecked (`checked: false`).
- **Functional Link:** `<a class="auth-link" href="/terms" target="_blank" rel="noopener">Terms of Service</a>`.
- **Target Route:** `GET /terms` returns HTTP 200 and displays the assessment draft notice, the narrowed wording, attribution, and license links.
