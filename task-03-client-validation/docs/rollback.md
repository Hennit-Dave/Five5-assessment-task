# Roll Back Without Hallucination (Task 3, Step 9)

## 1. Executive Summary: Why Naming the Commit ID is Safer

> **Core Principle:** Referencing a specific Git commit SHA provides an immutable, cryptographically verified pointer to an exact tree state, preventing AI agents from hallucinating past code or silently overwriting concurrent modifications. In contrast, describing a change in natural language requires the agent to reconstruct historical state through ambiguous verbal interpretation, which frequently re-introduces discarded defects or mangles working logic.

When an engineer directs an AI coding agent with vague phrasing such as *"undo the last two versions"* or *"revert the name validation changes"*, the agent must infer:
1. What boundary defines a "version" (a prompt turn, a file edit, an unsaved buffer, or a Git commit).
2. Which files were touched and what their exact line-by-line syntax was prior to the instruction.
3. Whether secondary changes (e.g. documentation updates, design token tweaks, or unrelated bug fixes) should be discarded or preserved.

Because large language models generate tokens based on probabilistic plausibility rather than deterministic state retrieval, conversational rollback invites hallucination. An agent attempting to reconstruct earlier code from memory may re-introduce previously fixed bugs, introduce syntax discrepancies, or alter unrelated files. Pointing directly to a Git commit hash (`4888362` or `360930d`) anchors the operation to a cryptographically hashed Merkle tree, allowing Git's deterministic engine to execute the restoration without guessing.

---

## 2. The Experimental Regret: The Multi-Word Name Anti-Pattern

In Nit's Cut client validation architecture, the **Category 2 Name Rule** explicitly accommodates mononymic users (e.g. *Dapo*, *Chinedu*, *Zendaya*):
- Requires at least two characters (`val.length >= 2`).
- Requires at least one Unicode letter (`LETTER_REGEX = /\p{L}/u`).
- Explicitly permits single-word names without requiring a surname.

### The Experimental Mistake
In commit `360930d` on branch `demo/step-9-rollback`, an experimental validation rule was introduced to require multi-word names:

```javascript
// Regretted experiment: requires at least two words separated by a space
var TWO_WORD_NAME_REGEX = /^\S+\s+\S+/;

function validateName(input, isBlur) {
  var val = input.value.trim();
  if (!val) {
    return isBlur ? setError(input, 'Please enter your name so we know who to address when you visit the shop.') : clearError(input);
  }
  if (val.length < 2 || !LETTER_REGEX.test(val)) {
    return setError(input, 'Please enter at least two characters, including a letter.');
  }
  if (!TWO_WORD_NAME_REGEX.test(val)) {
    return setError(input, 'Please enter both your first and last name.');
  }
  return clearError(input);
}
```

### Why This Change is Regretted
Imposing a mandatory two-word requirement violates internationalization standards and real-world cultural naming conventions:
1. **Mononyms:** Many individuals legally possess only a single name.
2. **Cultural naming diversity:** In several cultures (e.g. parts of Nigeria, Indonesia, Myanmar, and Southern India), people commonly have single names or non-Western family name structures.
3. **Accessibility defect:** The form displays a blocking error banner (`⚠ Please enter both your first and last name.`), sets `aria-invalid="true"`, keeps the submit button in an inactive state (`aria-disabled="true"`), and blocks submission with zero network requests dispatched.

---

## 3. Empirical Test Sequence Across Three Code States

The form was tested under headless Chrome via the Chrome DevTools Protocol (CDP) across the three sequential Git states using the legitimate fictional single name **"Dapo"** (with email `dapo.test@example.com`, password `correct-horse-battery-staple-15`, and Terms checked):

| Metric / Observation | State 1: Starting (`4888362`) | State 2: Experimental (`360930d`) | State 3: Restored (`f6217b9`) |
|---|---|---|---|
| **Full Name Input** | `"Dapo"` | `"Dapo"` | `"Dapo"` |
| **Field `aria-invalid`** | `null` (valid) | `"true"` (invalid) | `null` (valid) |
| **Visible Error Banner** | None (`""`, hidden) | `"⚠ Please enter both your first and last name."` | None (`""`, hidden) |
| **Submit Button State** | Active (`aria-disabled` removed) | Inactive (`aria-disabled="true"`) | Active (`aria-disabled` removed) |
| **Submit Click Outcome** | Submits form | Guard blocks submit; focus to `#signup-name` | Submits form |
| **POST Requests Sent** | **1** to `/auth/signup` | **0** | **1** to `/auth/signup` |
| **Rendered View** | `Signup Received (Prototype)` (200 OK) | Form stays open (`Create your account`) | `Signup Received (Prototype)` (200 OK) |

---

## 4. Deterministic History Inspection and Rollback Command

### Step A: Inspect Recent Commits
To locate the exact commit SHA rather than guessing, the Git history was inspected:

```bash
git log --oneline -n 5
```

**Observed Git Log:**
```text
360930d (HEAD -> demo/step-9-rollback) feat(auth): require multi-word full name on signup
4888362 (feature/task-03-client-validation) docs(task-03): document direct request attack and client validation limits (Step 8)
534d593 feat(task-03): implement inactive button states, password toggle, and back-navigation guards (Step 7)
57670c9 feat(task-03): unify account screens, automate system appearance, and enhance NC brand badge
59bb8bc fix(task-03): improve auth form accessibility and record VoiceOver retests
```

### Step B: Identify the Target Commit
- **Experimental Regretted Commit:** `360930d`
- **Known-Good Baseline Commit:** `4888362`

### Step C: Execute Reversal by Specific Commit ID
Rather than running an ambiguous undo or interactive rebase that could rewrite history, the experimental change was deterministically inverted using `git revert`:

```bash
git revert --no-edit 360930d
```

**Git Execution Output:**
```text
[demo/step-9-rollback f6217b9] Revert "feat(auth): require multi-word full name on signup"
 Date: Tue Nov 3 08:35:19 2026 -0600
 1 file changed, 3 insertions(+), 6 deletions(-)
```

---

## 5. Byte-for-Byte Verification Against Known-Good Baseline

To prove that the rollback accurately restored the codebase without lingering differences or accidental mutations, `git diff --exit-code` was executed against the known-good baseline `4888362`:

```bash
git diff --exit-code 4888362 HEAD
```

- **Output:** None (clean exit).
- **Exit Status:** `0`

An exit status of `0` confirms that all tracked files at HEAD (`f6217b9`) are identical byte-for-byte to `4888362`. At the same time, Git preserves an auditable, non-destructive trail of the experiment (`360930d`) and its remediation (`f6217b9`).

---

## 6. Deliverable Artifacts

- **Evidence Transcript:** [`task-03-client-validation/evidence/17-commit-list-and-rollback.txt`](file:///Users/blk/Developer/Five5%20assessment%20task/task-03-client-validation/evidence/17-commit-list-and-rollback.txt)
- **Local Demonstration Branch:** `demo/step-9-rollback` (preserved locally for inspection).
