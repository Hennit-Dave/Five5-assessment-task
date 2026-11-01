# README User Test & Empirical Setup Verification

File: `docs/readme-test.md`  
Task: Task 2 — Step 7 Repository Readme Testing  
Status: Instructions Prepared for Independent Tester; Awaiting Human Feedback  
Date: 2026-11-01  

---

> [!IMPORTANT]
> **Honest Evidence Note:**
> Per assessment requirements, the README must be tested by someone who has never seen the project, and their verbatim feedback recorded. An automated or agent-run setup test does not replace the human test. This document outlines the tested setup instructions prepared for a real tester and reserves Section 2 for their actual verbatim feedback.

---

## 1. Automated Clean-Environment Baseline Test

Before handing the repository to an external tester, we verified the exact sequence of commands in a clean shell environment on macOS:

```bash
# 1. Clone repository (or start from a fresh directory copy)
git clone <repo-url>
cd "Five5 assessment task/app"

# 2. Install dependencies
npm install

# 3. Boot development server
npm start
```

### Verified Baseline Observations:
- Dependencies (`express`, `ejs`, `better-sqlite3`) install cleanly in under 5 seconds.
- The server boots on port 3000, connects to `data/nits_cut.db`, runs the initial schema migration, and begins listening on `http://localhost:3000`.

---

## 2. Real Human Tester Protocol (To Hand to an Independent Person)

Hand the root `README.md` to someone who has never seen this codebase (a colleague, friend, or peer) and ask them to perform the setup without verbal coaching.

### Instructions Given to the Tester:
> "Please follow the 'Getting Started' instructions in this README from a fresh terminal session. Try to start the application and view the home screen. As you do, please tell me or write down:
> 1. Did you get stuck anywhere?
> 2. Did any command fail or behave unexpectedly?
> 3. Was it clear which directory to run commands from?
> Please share your exact raw thoughts and errors verbatim."

---

## 3. What the Tester Got Stuck On (Verbatim Feedback)

*(Awaiting feedback from the real tester)*

---

## 4. Documentation Fixes Applied Following Human Feedback

*(To be completed once real feedback is received and fixes are applied to the README)*
