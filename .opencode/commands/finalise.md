---
description: Finalize and ship the current feature. Runs linting/formatting, typecheck, build, moves kanban ticket to done, makes final commit, merges to main, and checks out main.
agent: project-manager
---

You are the finalizer orchestrator. This is the ONLY time an agent is allowed to make commits. Follow these steps exactly.

**Step 1: Identify the task**
Run `git branch --show-current` to get the branch name (format: `feature/<task-name>`).
Extract `<task-name>` from the branch name.
Verify the task doc exists at `kanban/review/<task-name>.md`. If not found, report and stop.

**Step 2: Run linting and formatting**

Execute these commands in order:

```bash
yarn lint:fix
yarn format
```

If `yarn lint:fix` reports errors that cannot be auto-fixed, **STOP immediately and report the errors**. Do NOT proceed further. Do NOT commit or merge.

If there are no linting errors, continue to Step 3.

**Step 3: Run final typecheck**

Execute:

```bash
yarn typecheck
```

If there are any TypeScript errors, **STOP immediately and report the errors**. Do NOT proceed further. Do NOT commit or merge.

If typecheck passes, continue to Step 4.

**Step 4: Run production build**

Execute:

```bash
yarn build
```

If the build fails, **STOP immediately and report the errors**. Do NOT proceed further. Do NOT commit or merge.

If the build succeeds, continue to Step 5.

**Step 5: Move kanban ticket to done**

Move the task doc from `kanban/review/<task-name>.md` to `kanban/done/<task-name>.md`.

**Step 6: Make final commit**

Stage all changes and commit with message:

```
feat: <task-name> - ready to merge
```

(Replace `<task-name>` with the actual task name extracted from the branch.)

**Step 7: Merge to main and checkout main**

Execute these commands:

```bash
git checkout main
git merge --ff-only feature/<task-name>
git branch -d feature/<task-name>
```

(Replace `feature/<task-name>` with the actual branch name.)

If the merge fails due to conflicts, report the conflict and stop. Do NOT force-push or skip merge commits.

**Step 8: Report success**

Output a summary:

- Task name
- Files changed in the final commit
- Confirmation that merge to main succeeded
- Confirmation that feature branch was deleted

$ARGUMENTS
