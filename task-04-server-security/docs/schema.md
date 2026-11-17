# Task 4, Step 1: Database schema for Nit's Cut

Status: design document written 2026-11-08 from the learner's approved paper drawing. **Nothing in this document has been implemented.** No migration has been written or run, and the database has not been changed. The new tables below exist only on paper.

Source drawing: [`../evidence/01-schema-drawing.jpg`](../evidence/01-schema-drawing.jpg) (converted from the learner's HEIC photograph; the drawing itself was not edited).

## 0. How to read this document

Every statement in this document carries one of three labels. They are kept apart on purpose.

| Label | Meaning |
|---|---|
| **[BRIEF]** | The Task 4 assessment explicitly requires it. |
| **[EXISTING]** | It already exists in the code or database. It was observed, not designed here. |
| **[PROPOSED]** | A design choice made for this project. The brief does not require it, and it can be changed. |

### What the brief requires for Step 1 [BRIEF]
- At least five tables, including: the people who use the system, their sessions, a money table, **separately** a money-attempts table, and the chunks for a retrieval system.
- For each table: every column with its type and whether it can be empty; every relationship marked one-to-many or many-to-many; every index with one line on why that column and what it costs on writes; any fact stored twice and why that was accepted.
- Two written reasons for the separate money-attempts table, and one paragraph on accounting for a transaction from fourteen months ago.
- The schema drawn on paper first and photographed.

### What already exists [EXISTING]
- One table, `inquiries`, declared in [`app/migrations/001-initial-schema.sql`](../../app/migrations/001-initial-schema.sql), plus one index, `idx_inquiries_created_at`.
- Before Step 3, calling `getDb()` in `app/src/db.js` (for example when `getAllInquiries()` or `createInquiry()` runs) opens `app/data/nits_cut.db`, sets `journal_mode = WAL`, and runs every `.sql` file in `app/migrations/` in name order using `CREATE ... IF NOT EXISTS` (importing `db.js` alone does not run migrations; calling `getDb()` does). Before Step 3, there is no migration-tracking table and `getDb()` does not turn on foreign-key enforcement.
- The actual state of the database file before any Step 3 changes is recorded in section 9 and in [`../evidence/02-database-state-before.png`](../evidence/02-database-state-before.png).

### What is proposed [PROPOSED]
Eight new tables: `users`, `sessions`, `orders`, `payment_attempts`, `payment_attempt_events`, `payments`, `verification_codes`, `document_chunks`. With the existing `inquiries` table that makes **nine**.

## 1. Reconciling the handwriting with the agreed names

The photograph is kept exactly as supplied. This section records where the handwriting differs from the spelling that the typed schema and later code will use. The typed names below are the ones to implement.

| Where in the drawing | As handwritten (my reading) | Agreed name used in this document | Reason |
|---|---|---|---|
| Box 4 title | "Inquries - Existing" | `inquiries` | Spelling slip. It matches the real table name in `001-initial-schema.sql`. |
| Box 5 title | "Payments_attempts" | `payment_attempts` | Singular "payment", as agreed. |
| Box 6 title | "Payment_attempts_events" / "Payment_attempt_events" | `payment_attempt_events` | Singular "attempt", matching the agreed name. |
| Box 6 foreign key | "Payment_attempts_id" | `payment_attempt_id` | Singular, matching the agreed name and the foreign key in box 7. |
| Box 6 timestamp | "Occured_at" | `occurred_at` | Spelling: "occurred". |
| Box 6 note | "Index: (Payment_attempt_id, Occured_at)" | index on (`payment_attempt_id`, `occurred_at`) | Same spelling fixes. |
| Box 5 column | "failure_code" (handwriting is hard to read) | `failure_code` | Read as `failure_code`, the agreed name. Please confirm. |
| Box 8 column | "failed_tries" (handwriting is hard to read) | `failed_tries` | Read as `failed_tries`, the agreed name. Please confirm. |
| Box 8 `purpose` | written twice ("Purpose Purpose") | `purpose` | One column. The second writing is a correction, not a second column. |
| Box 7 `user_id` | squeezed in above `payment_attempt_id` | `user_id` | A real column. It is written small between lines. |
| Box 7 `currency` type | a crossed-out type, then "TEXT" | TEXT | The final written type is TEXT. |
| Box 7 refund reference | "refunded_gateway_reference" | `refund_gateway_reference` | Reconciled to singular noun prefix `refund_gateway_reference` matching the agreed schema specification. |
| Box 3 column | "Item_Count" | `item_count` | Capitalisation only. |
| Other capitals | "Id", "Created_at", "Updated_at" | `id`, `created_at`, `updated_at` | Identifiers are lower case with underscores. |
| Table numbers | 1 users, 2 Sessions, 3 orders, 4 Inquiries, 5 payment attempts, 6 events, 7 Payments, 8 Verification_codes, 9 document_chunks | same | The drawing numbers match this document. |

Anything marked "please confirm" is my best reading of handwriting. If I read a name wrongly, the learner's intended name wins.

## 2. The nine tables

Key: **PK** primary key, **FK** foreign key, **UQ** unique, **NN** required (NOT NULL), **opt** optional (NULL allowed).

All proposed timestamps use one naming rule: a name ending in `_at`, stored as TEXT in ISO 8601 UTC (for example `2026-11-08T15:04:05.000Z`). **[PROPOSED]**

> **Format difference to resolve later:** the existing `inquiries.created_at` is DATETIME with default `CURRENT_TIMESTAMP`. SQLite stores that as `YYYY-MM-DD HH:MM:SS` in UTC with no `T` and no `Z`. The proposed tables use ISO 8601 with `T` and `Z`. Both are UTC and both sort correctly as text, but the formats differ. We will not change `inquiries` in Step 1. **[EXISTING] vs [PROPOSED]**

### Table 1: `users` [PROPOSED]
People who use the system.

| Column | SQLite type | Required? | Key / constraint | Notes |
|---|---|---|---|---|
| `id` | INTEGER | NN | PK | |
| `email` | TEXT | NN | UQ | Stored lower case. |
| `password_hash` | TEXT | NN | | Hash only. Never the password. |
| `full_name` | TEXT | NN | | Single names allowed (see Task 3). |
| `phone` | TEXT | opt | | |
| `role` | TEXT | NN | | For example `client`, `tailor`, `admin`. |
| `email_verified_at` | TEXT | opt | | Empty until the email is verified. |
| `created_at` | TEXT | NN | | |

### Table 2: `sessions` [PROPOSED]
Logged-in sessions.

| Column | SQLite type | Required? | Key / constraint | Notes |
|---|---|---|---|---|
| `id` | INTEGER | NN | PK | |
| `user_id` | INTEGER | NN | FK → `users.id` | |
| `token_hash` | TEXT | NN | UQ | Hash of the session token. The token itself is never stored. |
| `ip_address` | TEXT | opt | | |
| `user_agent` | TEXT | opt | | |
| `created_at` | TEXT | NN | | |
| `expires_at` | TEXT | NN | | |
| `revoked_at` | TEXT | opt | | Set on logout. |

### Table 3: `orders` [PROPOSED]
A tailoring job that the shop has agreed to and that is waiting for, or has received, a deposit. An enquiry is a request. An order is a request the shop accepted.

| Column | SQLite type | Required? | Key / constraint | Notes |
|---|---|---|---|---|
| `id` | INTEGER | NN | PK | |
| `user_id` | INTEGER | NN | FK → `users.id` | The customer. |
| `inquiry_id` | INTEGER | opt | FK → `inquiries.id`, UQ | Optional, so a walk-in order can exist with no enquiry. UQ means one enquiry gives at most one order. |
| `item_count` | INTEGER | NN | | Number of pieces. |
| `total_kobo` | INTEGER | NN | | Agreed price in kobo. |
| `deposit_kobo` | INTEGER | NN | | Deposit asked for, in kobo. |
| `currency` | TEXT | NN | | For example `NGN`. |
| `status` | TEXT | NN | | For example `awaiting_deposit`, `confirmed`, `in_production`, `ready`, `collected`, `cancelled`. |
| `created_at` | TEXT | NN | | |
| `updated_at` | TEXT | NN | | |

Money is whole kobo in INTEGER columns. Never a floating-point type, because floats round.

### Table 4: `inquiries` [EXISTING]
Declared in `001-initial-schema.sql`. **Do not change it in Step 1.** The columns below are copied from the migration and match the live database (section 9).

| Column | SQLite type | Required? | Key / constraint | Notes |
|---|---|---|---|---|
| `id` | INTEGER | NN | PK AUTOINCREMENT | SQLite reports the notnull flag as 0 for an INTEGER PRIMARY KEY, but a rowid key cannot be empty. |
| `client_name` | TEXT | NN | | |
| `phone` | TEXT | NN | | |
| `garment_type` | TEXT | NN | | |
| `fabric_choice` | TEXT | NN | | |
| `fitting_date` | TEXT | NN | | |
| `status` | TEXT | NN | default `'Inquiry Received'` | |
| `created_at` | DATETIME | NN | default `CURRENT_TIMESTAMP` | |

Existing index: `idx_inquiries_created_at` on `created_at`.

### Table 5: `payment_attempts` [PROPOSED]
Every try at taking money for an order, whether it worked, failed, was abandoned, or died on a bad network. This holds the **current** state of each attempt. The full history is in `payment_attempt_events`.

| Column | SQLite type | Required? | Key / constraint | Notes |
|---|---|---|---|---|
| `id` | INTEGER | NN | PK | |
| `order_id` | INTEGER | NN | FK → `orders.id` | |
| `user_id` | INTEGER | NN | FK → `users.id` | |
| `amount_kobo` | INTEGER | NN | | Amount requested. |
| `currency` | TEXT | NN | | |
| `idempotency_key` | TEXT | NN | UQ | Sent to the gateway so a repeated request is not charged twice. |
| `status` | TEXT | NN | | Current state: `pending`, `unresolved`, `succeeded`, `failed`, `abandoned`. |
| `failure_code` | TEXT | opt | | Short code such as `card_declined` or `gateway_timeout`. |
| `gateway_reference` | TEXT | opt | UQ | Empty until the gateway answers. |
| `created_at` | TEXT | NN | | |
| `resolved_at` | TEXT | opt | | When the latest final status was reached. Earlier states are in the events table. |

### Table 6: `payment_attempt_events` [PROPOSED]
An append-only history. One row is **added** every time an attempt changes status. Rows are never edited or deleted.

| Column | SQLite type | Required? | Key / constraint | Notes |
|---|---|---|---|---|
| `id` | INTEGER | NN | PK | |
| `payment_attempt_id` | INTEGER | NN | FK → `payment_attempts.id` | |
| `from_status` | TEXT | opt | | Empty on the first event. |
| `to_status` | TEXT | NN | | |
| `reason` | TEXT | opt | | Short code, for example `gateway_timeout` or `late_gateway_confirmation`. |
| `gateway_reference` | TEXT | opt | | Reference reported with this change, if any. |
| `occurred_at` | TEXT | NN | | |

Index (drawn on the paper): (`payment_attempt_id`, `occurred_at`).

### Table 7: `payments` [PROPOSED]
Money that was actually taken. A row exists only for a confirmed charge.

| Column | SQLite type | Required? | Key / constraint | Notes |
|---|---|---|---|---|
| `id` | INTEGER | NN | PK | |
| `order_id` | INTEGER | NN | FK → `orders.id` | |
| `user_id` | INTEGER | NN | FK → `users.id` | |
| `payment_attempt_id` | INTEGER | NN | FK → `payment_attempts.id`, UQ | The one attempt that produced this payment. |
| `amount_kobo` | INTEGER | NN | | Amount confirmed by the gateway. |
| `currency` | TEXT | NN | | |
| `gateway_reference` | TEXT | NN | UQ | |
| `status` | TEXT | NN | | `succeeded` or `refunded`. |
| `paid_at` | TEXT | NN | | Gateway's confirmation time. |
| `created_at` | TEXT | NN | | When our server recorded the row. |
| `refunded_amount_kobo` | INTEGER | opt | | Empty until refunded. |
| `refund_gateway_reference` | TEXT | opt | UQ | |
| `refunded_at` | TEXT | opt | | |

**Limitation [PROPOSED]:** these three refund columns hold **one** completed refund per payment. That covers one full refund, or one partial refund. They cannot record several partial refunds against the same payment. Supporting that would need a separate `refunds` table, which this design does not include.

### Table 8: `verification_codes` [PROPOSED]
Codes for email verification (used in a later step).

| Column | SQLite type | Required? | Key / constraint | Notes |
|---|---|---|---|---|
| `id` | INTEGER | NN | PK | |
| `user_id` | INTEGER | NN | FK → `users.id` | |
| `code_hash` | TEXT | NN | | Hash of the code. The code itself is not stored. |
| `purpose` | TEXT | NN | | For example `email_verification`. |
| `failed_tries` | INTEGER | NN | default 0 | Wrong guesses so far. |
| `created_at` | TEXT | NN | | |
| `expires_at` | TEXT | NN | | |
| `used_at` | TEXT | opt | | Set once, when the code is consumed. |

### Table 9: `document_chunks` [PROPOSED]
Small pieces of text for a retrieval system. A retrieval system answers a question by finding the few passages that matter, so long documents are cut into chunks and each chunk is stored as its own row. Example: one paragraph of a fictional tailoring care guide, "Senator wear in cotton blend should be washed inside out in cool water. Do not wring the fabric... Dry it flat in shade", becomes one row with `source_file` = `care-guide.md`, `chunk_index` = 2, and the paragraph in `content`.

| Column | SQLite type | Required? | Key / constraint | Notes |
|---|---|---|---|---|
| `id` | INTEGER | NN | PK | |
| `source_file` | TEXT | NN | part of UQ | |
| `chunk_index` | INTEGER | NN | part of UQ | Position within the source file. |
| `content` | TEXT | NN | | The chunk text. |
| `content_hash` | TEXT | NN | | Detects whether the source text changed. |
| `embedding` | BLOB | opt | | Empty until retrieval is built. |
| `created_at` | TEXT | NN | | |

Table-level unique constraint: (`source_file`, `chunk_index`). No foreign keys. This table stands alone, as the drawing notes.

## 3. Relationships

Each line below says what the arrow means. The cardinality is what the drawing's labels show, or what I read from the lines.

| # | Relationship | Meaning | Kind |
|---|---|---|---|
| R1 | `users` → `sessions` | One user can have many sessions. Each session belongs to one user. | one to many |
| R2 | `users` → `orders` | One user can have many orders. Each order belongs to one user. | one to many |
| R3 | `inquiries` → `orders` | One enquiry can become at most one order. An order comes from zero or one enquiry. | one to zero-or-one |
| R4 | `users` → `verification_codes` | One user can have many codes over time. | one to many |
| R5 | `orders` → `payment_attempts` | One order can have many payment attempts. | one to many |
| R6 | `users` → `payment_attempts` | One user can make many payment attempts. | one to many |
| R7 | `payment_attempts` → `payment_attempt_events` | One attempt can have many events. | one to many |
| R8 | `payment_attempts` → `payments` | One payment belongs to exactly one attempt. An attempt has zero or one payment. | one to zero-or-one |
| R9 | `orders` → `payments` | One order can have many payments (for example a deposit and a balance). | one to many |
| R10 | `users` → `payments` | One user can have many payments. | one to many |

There are no many-to-many relationships. **[PROPOSED]** `document_chunks` has no relationships. **[BRIEF]** requires each relationship to be marked one-to-many or many-to-many, which the Kind column does.

**What I could and could not confirm from the photograph.** I can trace R1 to R8 from the lines and their labels (including the long line from `users` to `payment_attempts` and the "1:0..1" on the attempts-to-payments line). I am less sure of the two connections into `payments` (R9 and R10), because the lines run close together near the bottom of the page. I have read them as orders-to-payments and users-to-payments. Please confirm that matches what you drew. If the drawing omits either, the `order_id` and `user_id` columns in `payments` still exist, so the typed design is complete, and the photograph can be annotated by hand rather than redrawn.

## 4. Indexes

An index makes a lookup fast, but every INSERT and UPDATE that touches an indexed column must also update the index. It also takes disk space. In SQLite, a UNIQUE constraint creates an index automatically, so the unique columns below are indexes too. SQLite allows several empty (NULL) values in a UNIQUE column, which is why optional UNIQUE columns work here.

Marked **drawn** means the paper shows it (an explicit note or a UQ flag). Marked **proposed here** means I added it while writing this document; the photograph does not show it.

| Index | Source | Query it helps | Cost when writing |
|---|---|---|---|
| `users(email)` UQ | drawn | Login: find the user by email. Also blocks a second account with the same email. | One extra index write on each signup, and on each email change. |
| `sessions(token_hash)` UQ | drawn | Every request: find the session for a cookie. | One extra index write on each login. Logout only changes `revoked_at`, which is not indexed, so it does not touch this index. |
| `sessions(user_id)` | proposed here | "Log this user out everywhere", and listing a user's sessions. | One extra write per login. Sessions are written often, so this is the most expensive of the lot. |
| `orders(user_id)` | proposed here | A customer's order list. | One extra write per order. Orders are infrequent. |
| `orders(inquiry_id)` UQ | drawn | Find the order made from an enquiry. Blocks a second order from the same enquiry. | One extra write per order. |
| `payment_attempts(order_id)` | proposed here | All attempts for an order, for a checkout screen or an audit. | One extra write per attempt. |
| `payment_attempts(user_id)` | proposed here | A customer's attempts, for support. | One extra write per attempt. |
| `payment_attempts(idempotency_key)` UQ | drawn | Find an attempt by its key on a retry. Blocks duplicate keys. | One extra write per attempt. |
| `payment_attempts(gateway_reference)` UQ | drawn | Match a gateway message to the attempt it belongs to. | One extra write when the reference is first set. |
| `payment_attempts(status, created_at)` | proposed here | Find old attempts still `unresolved`, and measure drop-off. | Rewritten each time `status` changes. This is the index most likely to be rewritten. |
| `payment_attempt_events(payment_attempt_id, occurred_at)` | drawn | One attempt's full history in time order. | One extra write per event. Events are only ever inserted, so the index is never rewritten. |
| `payments(payment_attempt_id)` UQ | drawn | The one payment for an attempt. Enforces "an attempt has zero or one payment". | One extra write per payment. |
| `payments(gateway_reference)` UQ | drawn | Match a gateway confirmation to a stored payment. Blocks a second row from a repeated confirmation. | One extra write per payment. |
| `payments(refund_gateway_reference)` UQ | drawn | Match a refund confirmation to its payment. | Written once, when the refund is recorded. |
| `payments(order_id)` | proposed here | All payments for an order. | One extra write per payment. |
| `payments(user_id)` | proposed here | All of a customer's payments, for support or a tax inquiry. | One extra write per payment. |
| `payments(paid_at)` | proposed here | Payments in a date range, for annual tax filing. | One extra write per payment. |
| `verification_codes(user_id, expires_at)` | proposed here | The newest live code for a user. | One extra write per code issued. |
| `document_chunks(source_file, chunk_index)` UQ | drawn | Re-import a source file without creating duplicate chunks. | Extra cost on a bulk re-import. |
| `idx_inquiries_created_at` on `inquiries(created_at)` | **existing** | Listing recent enquiries by date. | One extra write per enquiry. |

I am keeping the index list modest because the data is small. Indexes marked "proposed here" can be dropped without changing what the schema means. Which of them to create is decided when the migration is written.

## 5. Facts that are stored twice, and how they stay consistent

The brief asks where the same fact appears more than once and why that was accepted. The rule for all of these: the duplicated value is written in the **same database transaction** as the original, and a mismatch is rejected rather than quietly accepted.

| Fact | Where it appears | Why it is accepted | How consistency is kept |
|---|---|---|---|
| Customer (`user_id`) | `orders`, `payment_attempts`, `payments`, `sessions`, `verification_codes` | Tracing a payment to a person without joins makes audits and support lookups simpler. | `payment_attempts.user_id` is copied from the order when the attempt is created, and `payments.user_id` is copied from the attempt. A check query comparing them to `orders.user_id` should return zero rows. |
| Order (`order_id`) | `payment_attempts`, `payments` | Same reason. | `payments.order_id` is copied from the attempt. |
| Amount (`amount_kobo`) and `currency` | `orders.deposit_kobo`, `payment_attempts`, `payments` | These are three different facts that normally match: what was owed, what was requested, and what the gateway confirmed. | A confirmation whose amount or currency differs from the attempt is rejected and logged. It is not stored as a normal payment. |
| Gateway reference | `payment_attempts`, `payment_attempt_events`, `payments` | The reference is the key into the gateway's own records. | `payments.gateway_reference` is copied from the attempt at confirmation. UNIQUE constraints block a second payment with the same reference. |
| Current status | `payment_attempts.status` and the newest event's `to_status` | The attempt row gives a fast current state. The events give history. | The status change and the event insert happen in one transaction. A check query compares each attempt's `status` with its latest event. |
| Final-state time | `payment_attempts.resolved_at` and the matching event's `occurred_at` | Same reason. | Set from the same value in the same transaction. |
| Order confirmed | `orders.status` and the existence of a successful payment | The order row gives a quick state. | The payment insert, attempt update and order update happen together or not at all. |
| Email verified | `users.email_verified_at` and `verification_codes.used_at` | One is the user's state, the other records which code was used. | Both are set in one transaction, with the same timestamp. |
| Customer name and phone | `inquiries` (`client_name`, `phone`) and `users` (`full_name`, `phone`) | The enquiry is a historical record of what the visitor typed. It is not meant to follow later account edits. | Not synchronised, on purpose. The enquiry stays as it was submitted. |
| Chunk fingerprint | `document_chunks.content_hash` and `content` | The hash lets us see that a source changed without comparing the full text. | Computed from `content` when the row is written. |

Consistency checks like these are queries to run, not features of the database. The brief does not ask for them, so they are **[PROPOSED]**. SQLite can also enforce some rules with CHECK constraints or triggers, which can be added later.

**Foreign keys are off by default in SQLite.** The inspected database reports `foreign_keys = 0` for a plain connection, and `app/src/db.js` does not turn it on. Until the application runs `PRAGMA foreign_keys = ON` on each connection, the FK markers in this schema would be documentation only. This needs to be decided when the migrations and connection code are written.

## 6. Why `payment_attempts` is separate from `payments`

The brief asks for both reasons in writing. **[BRIEF]**

1. **Drop-off data tells the business where it loses people.** A `payments` table only ever contains successes. If a customer opens checkout, the card fails, they try again, give up, or lose signal, the shop sees nothing. With a separate attempts table the shop can ask how many attempts failed, at what stage, and how many customers never came back. For Nit's Cut that could show that deposits fail often on slow mobile networks.
2. **Payment records are the source of truth for litigation, government inquiries and annual tax filing.** A tax authority, a court, or a customer disputing a charge needs the whole story, not only the final success. A failed attempt that later turns out to have charged the card is exactly the kind of event that has to be on record. If failures and timeouts were not kept, the records could not show that the customer was charged twice, or why a refund was issued.

### Accounting for a transaction from fourteen months ago **[BRIEF]**

If a tax authority asked me to account for one specific deposit from fourteen months ago, I would start from whatever identifier they gave me: the gateway reference, the customer, the order, or an approximate date and amount. From the `payments` row I would read the confirmed amount, currency, gateway reference, `paid_at` (the gateway's time) and `created_at` (when we recorded it). I would follow `payment_attempt_id` to the successful attempt, then list every attempt for that `order_id`, and for each one read its `payment_attempt_events` in order, to show what was tried, what timed out, what failed and what finally succeeded. The `orders` row shows the agreed price and deposit, and the `users` row shows who paid. I would compare the stored amounts and references with the gateway's own statement for that period and report any difference instead of hiding it. None of these rows is deleted or overwritten: a correction is a new event or a new row. A customer who asks to leave has their personal details anonymised rather than the payment rows removed. Backups would need to keep them for as long as the law requires, and I would confirm that retention period with an accountant, because I have not verified the legal period for Nigeria here.

## 7. Payment attempts, events, retries and refunds **[PROPOSED]**

### The attempt and its events
`payment_attempts.status` is the current state. Each change of state also **adds** a row to `payment_attempt_events`, so the history is never overwritten. History is rebuilt by reading an attempt's events in `occurred_at` order.

### Worked example (fictional data)
Folake Adeyemi's order 31 is for two pieces of senator wear. The total is 18,000,000 kobo (₦180,000), and the deposit is 9,000,000 kobo (₦90,000), which is **my assumed 50%**. The brief does not set a deposit percentage.

1. Attempt 101 (idempotency key `ORD31-DEP-A1`) is created as `pending`. First event: no from-status, to-status `pending`.
2. The request times out. Attempt 101 becomes `unresolved`, with an event. **A timeout stays unresolved until we know whether the customer was charged.** It is not marked failed, because we do not know.
3. If the customer retries while 101 is `unresolved`, we **reuse key `ORD31-DEP-A1`** and ask the gateway about it. We do not create a new attempt. The gateway recognises the key and returns the original outcome, so the customer cannot be charged a second time while the first result is unknown.
4. The gateway reports that 101 never charged. 101 becomes `failed` (event with reason `gateway_reported_not_charged`).
5. Only now does a **genuinely new attempt** make sense. Attempt 102 is created with a new key, `ORD31-DEP-A2`.
6. The gateway confirms 102 with reference `GW-88231`. In one transaction: a `payments` row is inserted (linked to attempt 102), attempt 102 becomes `succeeded` with an event, and order 31 becomes `confirmed`.

The same key is reused while an attempt is `pending` or `unresolved`. A new key is used only after the earlier attempt has reached a final non-charging state (`failed` or `abandoned`).

The assumption here is that the payment gateway honours idempotency keys. This project has no real gateway, so the example is fictional and the behaviour is assumed.

### A late success after an earlier failure
If the gateway later says attempt 101 **was** charged after all, 101 gets a new event (`failed` → `succeeded`, reason `late_gateway_confirmation`). The earlier `failed` event stays. The attempt's current `status` becomes `succeeded`. If attempt 102 had already succeeded, the customer has been charged twice.

### Recording a second charge and its refund
Both charges are real financial events, so both get a `payments` row:
- payment A (attempt 101, `GW-88230`, 9,000,000 kobo)
- payment B (attempt 102, `GW-88231`, 9,000,000 kobo)

Refunding the unexpected charge changes payment A only: its `status` becomes `refunded`, and `refunded_amount_kobo`, `refund_gateway_reference` and `refunded_at` are filled in. Its original amount, reference and `paid_at` are not changed. So the charge and the refund each have their own reference, amount and timestamp. This design supports **one completed refund per payment**.

### A duplicate gateway confirmation
If the gateway sends the same confirmation twice, the UNIQUE constraints on `payments.gateway_reference` and `payments.payment_attempt_id` block a second row. The code then reads the stored payment and **checks that it matches the incoming confirmation** (attempt, order, amount, currency and reference). If it matches, it is a harmless repeat and nothing changes. If it does not match, the request is rejected and logged for investigation.

### The payment insert, attempt update and order update succeed or fail together
These three writes run inside one transaction (`BEGIN IMMEDIATE` ... `COMMIT`). If any step fails, the whole transaction is rolled back. A confirmed order never exists without its payment row, and a payment row never exists beside an attempt still marked `pending`.

## 8. Does the design support email verification? **[PROPOSED]**

Email verification is a later step. The `users` and `verification_codes` tables already hold what it will need.

- **Expiry:** `expires_at`. A code is valid only while now is before it.
- **No reuse:** `used_at`. A code is valid only while `used_at` is empty. A second use finds it filled in.
- **Wrong guesses:** `failed_tries`, so repeated guessing can be stopped.
- **Verified state:** `users.email_verified_at`.
- **Order of checks:** the server looks up the user's newest live code row, hashes the submitted code and compares it with the stored `code_hash`. A wrong code adds one to `failed_tries` and stops. A correct code goes on to the conditional update below.
- **Simultaneous submissions:** the conditional update is `UPDATE verification_codes SET used_at = :now WHERE id = :id AND used_at IS NULL AND expires_at > :now AND failed_tries < :limit`. SQLite lets only one write transaction run at a time. Whichever request runs first changes one row. The second finds `used_at` already set and changes zero rows, so only one can succeed.
- **One transaction:** consuming the code and setting `users.email_verified_at` happen in the same transaction. A crash between them would otherwise leave a spent code on a user who is still unverified.
- **Testing a hashed code:** the hash cannot reveal the original code. During testing the plain code is read from the email that was sent, and the database screenshot shows only `code_hash`. The three failures (expired, wrong code, reused code) are shown by submitting the emailed code at the right and wrong times.
- **Design note for later:** a 6-digit code has only a million possibilities, so a plain hash of it could be guessed quickly if the table were copied. A keyed hash (HMAC with a server-side secret), a short expiry and the `failed_tries` limit all reduce that. The method is decided in the verification step.

## 9. The database as it actually is today **[EXISTING]**

Inspected on 2026-11-08 with `sqlite3 -readonly`, using [`../scripts/inspect-database-readonly.sh`](../scripts/inspect-database-readonly.sh). The application was not started, and no migration or helper that runs migrations was used. The three database files had identical SHA-256 hashes before and after the inspection.

| Item | What was found |
|---|---|
| Tables | `inquiries`, plus SQLite's internal `sqlite_sequence` |
| `inquiries` columns | `id`, `client_name`, `phone`, `garment_type`, `fabric_choice`, `fitting_date`, `status`, `created_at` (matches the migration) |
| Indexes | `idx_inquiries_created_at` on `created_at`, not unique |
| Row counts | `inquiries`: 2 |
| Proposed tables present | 0 of the 8 (none of `users`, `sessions`, `orders`, `payment_attempts`, `payment_attempt_events`, `payments`, `verification_codes`, `document_chunks` exist) |
| Journal mode | `wal` |
| `user_version` | 0 |
| Integrity check | `ok` |
| Migration-tracking table | none |

So the database matches `001-initial-schema.sql` and nothing else. Evidence: [`../evidence/02-database-state-before.png`](../evidence/02-database-state-before.png) (screenshot of the read-only run) and [`../evidence/02-database-state-before.txt`](../evidence/02-database-state-before.txt) (the same output as text, with the hashes).

**One heads-up for the migration step.** Before Step 3, calling `getDb()` in `db.js` runs every `.sql` file in `app/migrations/` the first time a database query is executed in that process (importing `db.js` alone does not execute migrations; calling `getDb()` does). In Step 3, automatic migration execution is removed from `getDb()` and moved to an explicit CLI migration runner (`app/src/migrate.js`) with a `schema_migrations` tracking table.

## 10. What is decided, and what is open

| Item | Label |
|---|---|
| Five-table minimum, with the four required kinds of table | [BRIEF] |
| Column list, relationships, indexes with write cost, duplicated facts | [BRIEF] |
| Both reasons for the attempts table, and the fourteen-month paragraph | [BRIEF] |
| `inquiries` and `idx_inquiries_created_at` as they are today | [EXISTING] |
| `db.js` runs migrations on startup, with no tracking table | [EXISTING] |
| `orders`, `verification_codes`, `payment_attempt_events` as extra tables | [PROPOSED] |
| 50% deposit, ₦180,000 total, and all example IDs and names | [PROPOSED] (fictional) |
| Kobo integers, ISO 8601 text timestamps ending in `_at`, status names | [PROPOSED] |
| Hashes instead of raw session tokens and verification codes | [PROPOSED] |
| One refund per payment, and no raw gateway response stored | [PROPOSED] |
| Indexes marked "proposed here" | [PROPOSED] |
| Assumption that the gateway honours idempotency keys | [PROPOSED] (assumed) |

**Open items for the learner:**
1. Confirm my readings of `failure_code` and `failed_tries`, and of the two arrows into `payments` (sections 1 and 3).
2. Decide whether to keep the extra "proposed here" indexes.
3. Decide how foreign-key enforcement will be turned on.
4. Decide how migrations stay under manual control, given that `db.js` runs them at startup (Step 3).
