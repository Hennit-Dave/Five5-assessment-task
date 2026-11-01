# Task 2 Interview Defence: 15 Mastered Technical Answers

File: `docs/interview-answers.md`  
Task: Task 2 — Step 10 Interview Defence  
Author: Learner (Nit's Cut Client Portal)  
Word Count Constraint: Strictly under 200 words per answer.

---

### 1. What is the difference between Git Flow and trunk-based development, and why have a lot of teams moved toward trunk-based?

Git Flow relies on multiple long-lived branches—`main`, `develop`, feature, release, and hotfix branches. Features live on isolated branches for weeks before merging into `develop`, culminating in a formal release branch.

Trunk-based development centers on a single branch (`main`), with developers merging small, short-lived feature branches (lasting hours to a day) or committing directly to trunk behind feature flags.

Teams moved toward trunk-based development because long-lived branches inevitably lead to painful merge conflicts ("merge hell") and delayed feedback. In modern CI/CD environments, batching weeks of changes into a release branch slows delivery and hides regressions. By contrast, trunk-based development forces developers to integrate small, verified batches continuously. Automated test suites run on every commit, identifying regressions immediately when they are easiest to fix. When paired with automated canary deployments and feature flags, trunk-based workflows drastically reduce lead time for changes and lower mean time to recovery (MTTR), which DevOps Research and Assessment (DORA) benchmarks consistently link to high software delivery performance.

---

### 2. What does git push --force actually do, and why is --force-with-lease generally safer?

`git push --force` (`-f`) unconditionally overwrites the target branch reference on the remote server with your local branch tip. Any remote commits not present in your local history are permanently unlinked and lost, risking the destruction of collaborators' work.

`git push --force-with-lease` adds a protective lease check: Git verifies that the remote ref matches your local tracking branch (`origin/branch`). If someone else pushed commits to the remote that you have not fetched, the push is rejected, preventing accidental overwrites.

However, `--force-with-lease` is not foolproof. If an editor extension or automated background fetch updates your remote tracking branch without your knowledge, the lease check passes and upstream commits can still be overwritten. Modern Git versions provide `--force-if-includes` to verify that the fetched remote tip is actually an ancestor of your local commit, providing full protection when rebasing personal feature branches.

---

### 3. Why is rewriting history, through rebase, amend or force push, dangerous on a shared branch?

Rewriting history through `rebase`, `commit --amend`, or force-pushing creates new commit hashes for existing changes, severing the ancestral line between your local history and everyone else's.

On an isolated feature branch, this is harmless and keeps history tidy. But on a shared branch (like `main` or a team release branch), other developers have already branched off or pulled those existing commit hashes into their local trees. When you force-push rewritten history, their local branches point to commits that no longer exist on the remote.

When those developers next pull or merge, Git attempts to reconcile diverging parallel histories that contain identical changes under different hashes. This causes massive artificial merge conflicts, duplicate commits ("commit doubling"), and can silently reintroduce bugs that were already resolved. Furthermore, audit trails, signed tags, continuous integration builds, and release deployments keyed to earlier commit SHAs become disconnected or invalid. Once a commit is shared with collaborators or deployed, history must be treated as immutable; corrections should always be made via new forward-moving commits (`git revert`).

---

### 4. What is the difference between git merge and git rebase, and when would you actually pick one over the other?

`git merge` joins two branches by creating a merge commit with two parents. It preserves the authentic chronological sequence, original commit timestamps, and distinct identities of all commits from both branches.

`git rebase` unwinds your feature branch commits, advances your branch base to the latest commit of the target branch, and reapplies your changes as brand-new commits with new hashes. It creates a linear history without merge bubbles.

I choose `git rebase` locally on personal, unpushed feature branches to incorporate the latest changes from `main` before submitting a pull request. This ensures tests run against current code and presents a clean, readable review diff.

I choose `git merge` when integrating a completed feature branch into a shared branch like `main`. Merging preserves the historical boundary of when a feature landed and prevents destructive history rewrites on shared branches.

---

### 5. What causes a merge conflict, and what is actually happening in the file when you see the conflict markers?

A merge conflict occurs when Git attempts to combine two branches that have modified the exact same region of a file since their common ancestor, or where one branch edited a file that the other branch deleted or renamed. Because Git cannot guess authorial intent, it halts the operation and asks the human to resolve the ambiguity.

Inside the conflicted file, Git injects conflict markers directly into the text:
`<<<<<<< HEAD` marks the start of the changes from the currently checked-out branch.
`=======` acts as the dividing line between the two conflicting versions.
`>>>>>>> <branch_name>` marks the end of the changes coming from the branch being merged or rebased.

Between these markers, Git preserves both versions verbatim. The file remains in an unmerged state in Git's index until a developer manually reviews both sets of changes, edits the code into a coherent, functioning whole, deletes the five-character marker lines completely, stages the resolved file (`git add <file>`), and completes the merge or rebase commit.

---

### 6. What is the difference between the working directory, the staging area and the repository?

These represent Git’s three fundamental local states:

1. **Working Directory (Working Tree):** The sandbox of unpacked files on your local filesystem that you see and edit in your IDE. Changes here are completely untracked or modified relative to Git's database until staged.
2. **Staging Area (Index):** A binary cache (stored in `.git/index`) that acts as an airlock between your disk and your version history. It holds the exact snapshot of files you have marked with `git add` to be included in the next commit. It lets you compose focused, cohesive commits by staging only specific files or line chunks rather than everything modified on disk.
3. **Repository (`.git` Object Store):** The permanent, immutable database where Git stores compressed snapshots (blobs), directory trees, commits, and branch pointers. Once a snapshot is committed here (`git commit`), it has an immutable SHA-1/SHA-256 hash and cannot be lost through ordinary file edits.

In summary: you edit in the working directory, stage curated changes into the index, and permanently commit the index into the repository.

---

### 7. What is branch protection, and what does it typically enforce?

Branch protection is a repository security and governance configuration enforced by Git hosting platforms (like GitHub, GitLab, or Bitbucket) on critical branches, typically `main` or production release branches. It prevents unauthorized, unverified, or destructive changes from reaching the core codebase.

Typical rules enforced by branch protection include:
1. **Blocking Direct Pushes:** Developers cannot push directly to `main` (`git push origin main`); all changes must arrive via a pull request.
2. **Disallowing Force Pushes and Deletion:** Prohibits `git push --force` and branch deletion, ensuring history cannot be destroyed or rewritten.
3. **Mandatory Peer Reviews:** Requires approval from at least one or more designated code owners (`CODEOWNERS`) before a pull request can merge.
4. **Passing Status Checks:** Mandates that continuous integration pipelines—such as unit tests, automated security scans, and build jobs—pass green before merge.
5. **Enforcing Up-To-Date Branches:** Requires the feature branch to be synchronized with the latest `main` commit before merging, avoiding hidden regressions.
6. **Requiring Signed Commits:** Enforces GPG/SSH cryptographic commit signatures to verify author identity and prevent commit spoofing.

---

### 8. Walk me through a technical project you built end to end.

In the Nit's Cut project, I built a server-rendered client portal for a Nigerian bespoke tailoring business.

I started by translating Figma design tokens into CSS custom properties (`192` primitives, `57` Light and `57` Dark semantic roles) and added layout and spacing tokens, avoiding hardcoded ad-hoc styles.

Next, I scaffolded a minimal application in Node.js, Express, and EJS in an `app/` folder, self-hosting Cormorant Garamond and Manrope `.woff2` fonts to avoid runtime CDN dependencies.

For persistence, I used SQLite via `better-sqlite3`, running versioned migrations on startup and executing parameterized queries with prepared statements. Rather than trusting HTTP response codes alone, I verified persistence by querying the SQLite database file on disk directly, confirming two distinct inquiries persisted minutes apart (`17:48:43` and `17:51:01 UTC`) with unique primary keys.

Finally, I tested failure resilience by intentionally severing the database connection path, verifying the application surfaced an explicit HTTP 500 error card rather than hiding data loss behind visual success.

---

### 9. Tell me about a time when something you built broke in production.

I have not yet operated a commercial production application at scale, so rather than manufacturing an unverified production incident, I will explain the deliberate failure exercise from this project where our database connection broke.

During our local database resilience test, I deliberately misconfigured `DATABASE_PATH` to point to a non-existent directory (`/dev/null/broken_directory/nits_cut.db`) and submitted a client inquiry form.

In an unhardened application, route handlers often swallow database errors in generic catch blocks and redirect to a confirmation screen, resulting in "false success" where customers believe their booking is secured but zero records are stored.

When our handler caught the SQLite filesystem exception, it logged the error (`ENOTDIR`), returned an explicit HTTP `500 Internal Server Error`, and rendered a visible alert notifying the user that their inquiry was not stored. Direct inspection of the database verified that zero rows were inserted. This exercise taught me that user-facing confirmation must never decouple from verified storage commits.

---

### 10. How do you approach learning a new technical platform or codebase quickly when starting a new engagement?

When entering an unfamiliar codebase or platform, I avoid reading files aimlessly and instead trace the execution path of a single end-to-end user transaction.

First, I locate the system boundary and configuration: package manifests (`package.json`), environment schemas, Dockerfiles, and CI pipelines. These reveal the runtime version, external dependencies, and how the system boots.

Second, I trace one write path from ingress to storage. In an Express app, I follow a `POST` request from the router through middleware, validation, controller logic, and database query to the storage engine. Seeing how data enters, mutates, and persists reveals the team's true architectural discipline more than documentation.

Third, I examine the test suite and recent Git commits. Well-written tests demonstrate intended business invariants, while recent pull request discussions and revert commits expose current architectural pain points, flaky dependencies, and unwritten operational conventions.

Finally, I build and run the project locally, intentionally causing a small failure (like breaking a database path or tweaking a route) to verify how the logging, error propagation, and diagnostic tools behave in real time before touching production code.

---

### 11. What is the difference between code that is correct and code that is complete?

Code that is "correct" satisfies functional happy-path requirements: given valid input under normal conditions, it computes the expected output or renders the specified screen. For example, a form handler that inserts a record into SQLite when inputs are valid and the database is reachable is correct.

Code that is "complete" anticipates operational reality, edge cases, and the entire software lifecycle. Complete code accounts for:
1. **Input Handling & Validation:** Rejecting malformed data and preventing SQL injection through prepared statements with bound parameters.
2. **Defensive Failure Handling:** Catching database disconnects, logging machine-readable errors, and returning semantic HTTP 500 status codes with clear user-facing alerts instead of swallowing errors.
3. **Observability:** Logging process IDs, request durations, and status codes for production triage.
4. **Accessibility & Resilience:** Self-hosting font assets for flaky networks, supporting keyboard navigation, and maintaining WCAG contrast ratios.
5. **Maintainability:** Documenting versioned migrations and keeping clean Git history so successors can maintain the system safely.

Correct code passes a demo; complete code survives in production.

---

### 12. How do you design software for a customer who will need to maintain it after you are gone?

Designing for a customer who must maintain the system independently means prioritizing transparency, simplicity, and standard tools over clever, opaque abstractions.

First, I choose proven, vanilla technologies with broad community support and minimal magic. In Nit's Cut, we chose standard Node.js, Express, and raw SQL prepared statements with `better-sqlite3` rather than a sprawling full-stack framework with heavy build steps and complex ORM abstractions that break during routine package updates.

Second, I externalize configuration into clear environment variables (`PORT`, `DATABASE_PATH`) with robust fallbacks, and manage schema changes through numbered, self-documenting SQL migrations (`001-initial-schema.sql`) rather than automatic ORM syncs that obscure database state.

Third, I eliminate hidden dependencies. Self-hosting web fonts locally removes runtime reliance on third-party CDNs that could change or fail.

Fourth, I write a comprehensive, tested `README.md` containing copy-pasteable startup commands, prerequisites, and a troubleshooting guide tested on someone unfamiliar with the project.

Finally, I implement semantic logging that outputs clear error messages, status codes, and durations. When something inevitably fails, the client's internal engineers can identify the problem in seconds without needing my presence.

---

### 13. Your first page load took a specific number of milliseconds. Where did that time go? Name the parts you can measure and the parts you are guessing about.

In our development server diagnostics (`evidence/04-first-load.txt`), cold initial page load took **25.25 ms** from client request to full HTML response, dropping tenfold to **2.47 ms** on subsequent reload.

**What We Can Measure:**
1. **Internal Server Request Duration:** Our Express timing middleware recorded exactly **6 ms** on the initial load and **1 ms** on reload.
2. **Payload Size:** Exactly **3,596 bytes** of rendered HTML returned with HTTP `200 OK`.
3. **Client Round Trip:** Exactly **25.25 ms** recorded by the Node client timer.

**What We Are Estimating / Guessing:**
The remaining ~19 ms gap between the 6 ms internal processing time and the 25.25 ms round trip cannot be isolated without kernel-level socket tracing, but it comprises:
1. **Disk I/O:** Reading four EJS templates (`home.ejs`, `head.ejs`, `header.ejs`, `footer.ejs`) from the filesystem on cold start before memory caching.
2. **V8 Compilation:** JIT-compiling Express routing regexes and EJS template renderers on the first tick.
3. **Loopback Socket Setup:** Initial TCP handshake and HTTP parser initialization over `127.0.0.1:3000`.

---

### 14. Your application reported success to the user while writing nothing to the database. Explain the mechanism that allowed that, and name the one check that would have caught it in thirty seconds.

The mechanism is **unhandled asynchronous promise rejection or exception swallowing combined with unconditional redirection**.

A route handler wraps a database write in a generic `try/catch` block that catches an error, logs nothing, and still calls `res.redirect('/success')`. Alternatively, omitting `await` before an async database call allows the server to send an immediate HTTP 200/302 response while the background query rejects unnoticed. The browser displays a confirmation message, while the database writes zero rows.

**The One Check That Catches It in Thirty Seconds:**
**Query the database directly on disk for the submitted record.**

Never trust UI success screens, browser Network tabs, or server status codes alone (a faulty handler can emit HTTP 201 without persisting data). Open SQLite and run:
`SELECT COUNT(*) FROM inquiries;`
If the row count did not increment and the record ID does not exist in storage, data was lost. Direct storage inspection proves persistence in seconds.

---

### 15. Wrong-answer analysis. A candidate says: "I always check my app is working by signing up a test user and confirming I get taken to the dashboard. If the dashboard loads, the backend is working." Say what is wrong with this, what it would miss, and what you would do instead.

**What is Wrong:**
The candidate confuses visual redirection with persistence. Navigating to the dashboard only proves the browser received an HTTP response; it offers zero proof that records were written to disk. In Aisha's scenario, four weeks of signups redirected smoothly while conversion remained zero because zero users were stored.

**What It Misses:**
1. Swallowed exceptions where handlers redirect despite query failures.
2. Unawaited promises that reject after sending responses.
3. Broken connection strings or missing migrations.
4. Optimistic UI updates disguising backend failures.

**What I Would Do Instead:**
1. **Query Storage Directly:** Inspect SQLite (`SELECT * FROM users WHERE email = ?`) to verify records, primary keys, and timestamps exist on disk.
2. **Automate Integration Assertions:** Write automated tests asserting database state after submission.
3. **Inspect Server Logs:** Verify the driver executed the parameterized `INSERT`.
