# Scaffolding Prompt Documentation

*Assessment Deliverable: `docs/scaffold-prompt.md`*

---

## 1. First Draft (Written by Learner)

*(Awaiting learner paste of actual original prompt beginning "Read the context file before doing anything…" to preserve authentic raw wording and spelling without agent reconstruction.)*

```markdown
[Pending learner paste: Raw first draft beginning "Read the context file before doing anything..."]
```

---

## 2. Final Tightened Version (Agent-Assisted)

```markdown
Before writing application code, read the current AGENTS.md and applicable rules, the business brief (task-01-design-system/docs/business-brief.md), Task 2 assessment requirements, Task 1 design-system documentation and generated tokens (task-01-design-system/tokens/generated/nc-tokens.css), and Task 2 layout tokens (task-02-repository-and-scaffold/tokens/nc-layout-tokens.css and docs/layout-tokens.md).

Treat the approved context files and design tokens as the sole source of truth. If files disagree or an important requirement is unclear, stop and ask me rather than making an unsupported assumption.

Summarise your understanding in simple words. List every file you propose to create or modify, explain its purpose, and state every assumption you made. If you identify no assumptions, explain what you checked.

Save your plan and stated assumptions in task-02-repository-and-scaffold/evidence/01-agent-plan.txt before asking for approval. This planning record is the only file you may create or update at this stage. Wait for my explicit approval before creating application files, writing code, or running installation commands.

After approval, build only the project setup and a minimal home screen inside the root-level app/ directory.

Use Node.js, Express, and server-rendered HTML with EJS. SQLite with better-sqlite3 is the chosen database approach for later steps; do not build database tables, migrations, authentication, booking flows, or the full tailoring product now.

The initial scope is strictly limited to:
1. package.json in app/ with clear scripts ("start", "dev") configuring a configurable port (defaulting to 3000).
2. The Express application server (e.g., app/src/server.js) serving static assets cleanly and rendering views via EJS.
3. An EJS layout shell or shared partials (head, header, footer) reusing Task 1 local font assets and loading nc-tokens.css followed by nc-layout-tokens.css.
4. A minimal Nit's Cut home screen demonstrating the brand, typographic hierarchy, and layout structure without mock product workflows.
5. Necessary public static assets mounted under app/public/.

Use the existing nc-tokens.css and nc-layout-tokens.css. Interface colours must use semantic roles (--nc-color-*) rather than raw colours or direct primitive references (--nc-ref-*). Use the provided typography (--nc-type-*), shadow (--nc-shadow-*), spacing, radius, and layout tokens. If a needed design value is missing, identify it and propose a documented token instead of silently inventing an ad-hoc value in component styles.

After implementation, list every file actually created or modified, its purpose, all assumptions, and the checks performed. Save this file report in task-02-repository-and-scaffold/evidence/02-files-created.txt.

Before each response, check your plan or completed work against these instructions and report any unmet requirement honestly. Do not expand the scope without my approval.
```

---

## 3. Comparison and Rationale (What Changed and Why)

*Learner Review & Agent Assistance Note:*

The initial draft written by the learner incorporated all core assessment requirements, setting strict scope boundaries and demanding that the plan be saved to `evidence/01-agent-plan.txt` before any code is scaffolded.

Between the learner's first draft and the agent-assisted final version, the scope was kept strictly minimal with three practical clarifications:
1. **Explicit Paths to Context Files:** Added exact file paths for `business-brief.md`, `nc-tokens.css`, `nc-layout-tokens.css`, and `docs/layout-tokens.md` so the agent cannot look in the wrong directory or assume paths.
2. **Deterministic Script and Port Structure:** Explicitly specified that `app/package.json` should provide standard `"start"` and `"dev"` scripts with a configurable port (defaulting to `3000`), which ensures the upcoming server diagnostics, first-load measurements, and deliberate port-conflict experiments in Steps 4 and 5 run reliably.
3. **Static Asset and Layout Pipeline:** Clarified the static asset mounting under `app/public/` and confirmed that local font assets (`fonts/`) should be served directly rather than introducing remote network calls.
