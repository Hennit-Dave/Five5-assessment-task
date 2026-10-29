---
trigger: always_on
---
# Code review and commit rules

Before a commit:
1. Inspect git status and the diff. Keep the change focused; do not overwrite unrelated user work.
2. Explain what changed and why. Review code for correctness, input handling and exposed secrets.
3. Run checks appropriate to the actual change. Do not invent successful tests. For documentation-only work, verify paths, consistency and required files rather than claiming application tests.
4. Inspect staged content for credentials, tokens, real customer data, local environment files and original assessment text. .gitignore alone is not a secret scanner and does not untrack existing files.
5. Update relevant documentation and evidence only with actual results. Preserve originals where comparisons matter.
6. Stage explicit files or reviewed folders. Inspect the staged diff and file list before committing. Never blindly stage all workspace changes.
7. Use a clear message describing the change, e.g. feat: add order progress view, fix: reject invalid order dates, or docs: record design decisions.
8. Commit only within the user's authorized scope. Do not manufacture dates, identity, mistakes or commit counts. Use configured Git identity; ask if none is configured.
9. Do not bypass failed checks or hooks, push remotely or rewrite shared history without explicit authorization. A local commit request is not authorization to publish.
10. After committing, report commit ID, checks performed, remaining issues and whether anything was pushed.

These are agent instructions, not executable Git hooks. Add stack-specific automated checks only after the application stack and commands are known.
