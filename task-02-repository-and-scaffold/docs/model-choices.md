# Model Choices: Strategic Model Selection Across the Development Lifecycle

File: `docs/model-choices.md`  
Task: Task 2 — Step 3 Model Selection  
Author: Learner (Nit's Cut Client Portal)  
Status: Complete (Empirical model run and learner comparison recorded)  
Date: 2026-11-02  

---

## 1. Candidate Model Classes for Nit's Cut

In evaluating AI models for building and maintaining the Nit's Cut tailoring portal, two distinct model configurations serve different engineering needs:

1. **Deliberate Planning & Multi-File Architecture (`Gemini 3.8 Flash (Medium)` in Google Antigravity):**  
   - **Characteristics:** Reads context files, cross-examines requirements against design tokens, inventories assumptions, and pauses for explicit human approval before modifying code.
   - **Intended Role in Nit's Cut:** Project scaffolding, design token integration, and multi-step diagnostic triage (e.g. tracking down socket collisions and verifying persistent SQLite writes).

2. **Focused Low-Effort Direct Execution (`Gemini 4 Argon (Low)` in Google Antigravity):**  
   - **Characteristics:** High-reasoning model operating with a low thinking-effort budget for targeted, minimal-diff implementation and verification tasks.
   - **Intended Role in Nit's Cut:** Implementing surgical server-side and template fixes (such as preserving user form inputs across HTTP 400 validation errors) where scope boundaries and design tokens are already established.

---

## 2. Recorded Feature Trial: Incomplete Enquiry Form Preservation (2026-11-02)

### Coding Tool & Model Configuration
- **Coding Tool Name:** Google Antigravity
- **Exact Model & Effort Label Displayed in Interface:** `Gemini 4 Argon (Low)` *(switched from `Gemini 3.8 Flash (Medium)`)*

### Verbatim Prompt Used
```text
Work in `/Users/blk/Developer/Five5 assessment task`. For Task 2, fix the Nit's Cut enquiry form so a customer can correct a missing field without typing everything again.

1. Read the project rules, then inspect the `POST /inquiries` route and its EJS form. Explain what currently happens when the server receives an incomplete enquiry.
2. Make the smallest change that preserves the customer's name, phone, garment selection, fabric choice and fitting date when validation fails. Keep the missing field empty, show the validation message, and return HTTP 400. Render entered text safely using EJS escaping. Keep the existing design tokens and successful submission behaviour.
3. Test with a temporary SQLite database and fictional details. Send a POST request directly to the server with four fields filled and one omitted, because the browser's `required` fields can prevent the request from reaching the server. Check that the response is 400, that all four submitted values appear in their original form controls, and that the database row count is unchanged. Then supply the missing field, resubmit, and verify that exactly one new row exists with the expected values.
4. Save the test commands and actual results in the Task 2 evidence folder. In `docs/model-choices.md`, record the coding tool's name, the exact model and effort label displayed in the interface, this prompt verbatim, the files changed, and any retries or fixes. Leave space for me to write my own comparison with Antigravity.

Stop after this feature and its evidence. Report what passed and anything you could not verify. Leave the changes local for review.
```

### Files Changed
1. `app/src/server.js` — Normalized and trimmed `req.body` fields into `formData` in `POST /inquiries` and passed `formData` into `res.status(400).render('home', ...)` when validation fails.
2. `app/views/home.ejs` — Populated `value="<%= locals.formData ? formData.<field> : ... %>"` on text/tel/date inputs and `selected` on the matching `<option>` in `#garmentType` using standard EJS HTML escaping (`<%= %>`).
3. `task-02-repository-and-scaffold/evidence/21-incomplete-enquiry-form-preservation.txt` — Recorded exact test commands, HTTP 400 and HTTP 201 responses, rendered HTML form controls, and SQLite row queries against temporary database `/tmp/nits_cut_form_test.db`.
4. `task-02-repository-and-scaffold/docs/evidence-index.md` — Indexed `evidence/21-incomplete-enquiry-form-preservation.txt`.
5. `task-02-repository-and-scaffold/docs/model-choices.md` — Recorded this trial metadata and verbatim prompt.

### Retries or Fixes During Execution
- **Application Code / Template Logic:** Zero retries needed. Both `app/src/server.js` and `app/views/home.ejs` worked on the first edit.
- **Test Execution Environment:** Standard sandboxed `curl` calls to `http://localhost:3099/inquiries` exited with code `7` (macOS sandbox blocks loopback TCP connections from child processes). Each `curl` command was immediately retried with sandbox bypass enabled and succeeded on the first retry.

--- 

## 3. Learner's Own Comparison Notes

### Why I tested this model/setting

I tested Gemini 4 Argon (Low) because I wanted to see whether I could get a working result with fewer corrections. While using Gemini 3.8 Flash (Medium), I had noticed bugs and sometimes had to go back to steps it had left unfinished.

### How it compared with my primary Antigravity workflow

I used both models inside Antigravity. In my experience, Flash sometimes missed instructions or left part of the work undone. With Argon, I gave it one specific job: keep the customer’s details in the enquiry form when a required field is missing. Its test showed that the form kept the details, the incomplete enquiry saved no row, and the corrected enquiry saved one row.

### Which I would choose for future tasks

I would choose Argon for my next coding task. What I preferred about this run was that I could check the result for myself: I could see what the customer would see in the form and what was actually saved in the database. I’d especially use Argon again for a focused fix with a clear way to test it.
