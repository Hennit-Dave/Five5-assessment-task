# Scaffolding Prompt Documentation

*Assessment Deliverable: `docs/scaffold-prompt.md`*

---

## 1. First Draft (Written by Learner)

*Verbatim first draft written personally by the learner, preserving original wording, punctuation, and spelling:*

```markdown
Read the context file before doing anything- read the business brief, the task 1 tokens, task 2 layout tokens and the rules files before doing anything, summarize all what youve read twice to understand what this task is all about and wait for my aproval before cre4ating any files, make sure to follow the the single source of truth which are the context files and the design tokens, if you dont understand intead of assuming stop and ask, make sure you use the system token.css and nc-layout-token.css without inventing raw styling values.
Build a minimalistic homescreen for now using the project setup :package.json, express server, layout, static. asseets do not build the full tailkoring database or bookinf flow yet. Report and list every file you propose to create and every assumption that was made on the file, this is a must.
Before you give me a response make sure to always check your plan against  excact instructions before responding.
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

*Learner Review & Rationale Analysis:*

The learner's original first draft successfully captured all eight required assessment constraints in raw, direct instructions:
1. **Mandatory Context Consumption:** Required reading the business brief, Task 1 tokens, Task 2 layout tokens, and rules before doing anything.
2. **Double Understanding & Approval Gate:** Instructed the agent to summarize understanding and wait for explicit approval before creating any files.
3. **Single Source of Truth:** Enforced context files and design tokens as the sole authority, explicitly commanding: *"if you dont understand intead of assuming stop and ask"*.
4. **Token Integrity:** Barred invented raw styling values in favor of `token.css` and `nc-layout-token.css`.
5. **Strict Scope Discipline (Point 6):** Explicitly commanded: *"Build a minimalistic homescreen for now using the project setup :package.json, express server, layout, static. asseets do not build the full tailkoring database or bookinf flow yet."* This was critical to prevent the agent from over-scaffolding mock data or unvetted auth.
6. **Accountability:** Mandated a complete proposed file manifest and stated assumptions list (*"this is a must"*).
7. **Self-Audit:** Required checking the plan against exact instructions before responding.

Between the learner's first draft and the agent-assisted refinement, the core intent and scope were preserved 100%, with three practical technical enhancements:
1. **Deterministic File Paths:** Replaced generic file mentions with exact repository relative paths (`task-01-design-system/docs/business-brief.md`, `task-01-design-system/tokens/generated/nc-tokens.css`, `task-02-repository-and-scaffold/tokens/nc-layout-tokens.css`, `docs/layout-tokens.md`) so the agent would not search the wrong directory.
2. **Explicit Evidence Capture Targets:** Added explicit destination paths (`task-02-repository-and-scaffold/evidence/01-agent-plan.txt` and `02-files-created.txt`) to satisfy assessment proof requirements before file creation.
3. **Standardized Script and Port Contract:** Clarified standard npm script names (`"start"`, `"dev"`) and configurable port defaulting to `3000`, ensuring future server diagnostics and port-collision tests in Steps 4 and 5 would execute deterministically.
