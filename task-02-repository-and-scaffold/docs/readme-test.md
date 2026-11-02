# README User Test & Empirical Setup Verification

File: `docs/readme-test.md`  
Task: Task 2 — Step 7 Repository Readme Testing  
Status: Instructions Prepared for Independent Tester; Awaiting Human Feedback  
Date: 2026-11-01  

---

> [!IMPORTANT]
> **Honest Evidence Note:**
> Per assessment requirements, the README must be tested by someone who has never seen the project, and their verbatim feedback recorded. An automated or agent-run setup test does not replace the human test. This document outlines the tested setup instructions prepared for a real tester and reserves Section 3 for their actual verbatim feedback.

---

## 1. Agent setup check (2 November 2026)

The root README now uses `cd Five5-assessment-task`, the directory created by its GitHub clone command. For this local check, the committed application was extracted to a fresh temporary directory without an existing node_modules. With Node v24.16.0 and npm 12.0.2, npm install installed 78 packages. npm reported that the better-sqlite3 install script was blocked, but opening an in-memory SQLite database succeeded on this Mac. Running npm start on a free local port returned HTTP 200 for both / and /services. This verified the committed app locally. The GitHub clone path and independent tester experience still need a real tester once the matching revision is available to them.

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
