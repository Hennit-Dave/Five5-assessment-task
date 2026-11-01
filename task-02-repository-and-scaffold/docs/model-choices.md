# Model Choices: Strategic Model Selection Across the Development Lifecycle

File: `docs/model-choices.md`  
Task: Task 2 — Step 3 Model Selection  
Author: Learner (Nit's Cut Client Portal)  
Status: Draft awaiting learner confirmation of actual secondary model/tool used  
Date: 2026-11-01  

---

> [!IMPORTANT]
> **Honest Evidence Note:**
> Per assessment instructions and commit quality rules, model choices and comparison observations must reflect tools the learner actually used rather than invented benchmarks. The sections below outline the architectural criteria and pending empirical comparisons awaiting learner input.

---

## 1. Candidate Model Classes for Nit's Cut

In evaluating AI models for building and maintaining the Nit's Cut tailoring portal, two distinct model classes serve different engineering needs:

1. **Google Antigravity Agent (Deliberate Planning & Multi-File Architecture):**  
   - **Characteristics:** Reads context files, cross-examines requirements against design tokens, inventories assumptions, and pauses for explicit human approval before modifying code.
   - **Intended Role in Nit's Cut:** Project scaffolding, design token integration, and multi-step diagnostic triage (e.g. tracking down socket collisions and verifying persistent SQLite writes).

2. **Fast Direct Generation Model (Mechanical Code Implementation):**  
   - **Characteristics:** Emits code directly with minimal pre-planning overhead.
   - **Intended Role in Nit's Cut:** Drafting self-contained SQL migration scripts (`001-initial-schema.sql`), writing repetitive form fields, or creating test fixtures where architectural contracts are already settled.

---

## 2. Practical Dimensions for Comparison

When comparing a deliberate planning agent against a fast code generation model, four dimensions must be evaluated empirically:

| Dimension | Deliberate Agent (Antigravity) | Direct Generation Model |
|---|---|---|
| **Pre-Execution Planning** | High. Generates file manifest and assumption log before writing code. | Low. Emits implementation immediately into target files. |
| **Design Token Adherence** | High. Bound to existing CSS custom properties (`var(--nc-*)`) without introducing raw hexes. | Vulnerable to inserting raw hex codes or inventing ad-hoc CSS variable names. |
| **Scope Discipline** | High. Respects minimal scaffold constraints without generating unrequested features. | Tendency to over-scaffold unrequested auth, routing, and boilerplate. |
| **Failure Diagnosis** | Systematic. Can trace PIDs, inspect filesystem paths, and isolate error codes. | Often attempts speculative fixes or full-file rewrites without identifying root causes. |

---

## 3. The Switch: Awaiting Learner's Actual Tool Experience

*(Pending confirmation from learner)*

To complete this section honestly:
- Did you use a second model or coding tool (e.g., Open Code, Claude, ChatGPT, Cursor, GitHub Copilot) during Task 2?
- If yes: which specific task was it used on, where did it struggle (e.g., hallucinating token names or over-scaffolding), and why did you switch back?
- If no: this requirement must be completed by performing an actual comparison on an upcoming task feature rather than inventing a failed model choice.
