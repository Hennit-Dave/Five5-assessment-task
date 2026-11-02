# Task 3: The Form, Attacked from Both Sides

Status: Step 1 completed locally on branch `feature/task-03-client-validation`. Step 2 pending.

## Progress
- **Step 1 (Collapse the authentication pages):**
  - Counted baseline pages: original application had 2 user-facing pages and 0 authentication pages. Intermediate separate-page baseline had 5 pages (3 authentication pages).
  - Consolidated `/signup`, `/login`, and `/reset` into a single `/auth` route selecting active form via `?mode=login|signup|reset`.
  - Added progressive enhancement in `app/public/js/auth.js` with client-side history manipulation (`history.pushState`), keyboard/screen-reader focus management on `h1`, and Back/Forward browser navigation handling.
  - Reduced user-facing page count from 5 to 3 (authentication pages reduced from 3 to 1).
  - Captured browser URL address bar states in `evidence/03-url-states.png`.
  - Verified 0 server requests, 0 new Document loads, DOM marker survival, and unchanged `performance.timeOrigin` across 6 client switches in `evidence/04-form-switch-logs.txt`.
  - Documented SPA rationale, UX differences, and trade-offs/SSO counter-cases in `docs/spa-rationale.md`.
