# OpenCode Workflow Guide

This guide explains the complete workflow for implementing features using OpenCode agents.

## Workflow Overview

The workflow is split into three phases:

1. **Plan** (`/implement` command)
2. **Review** (manual — you review staged changes)
3. **Finalize** (`/finalise` command)

### Key Principle: Agents Do NOT Commit

**Agents only stage changes.** Only the `/finalise` command is permitted to make commits. This ensures you can review all changes before they are committed and merged.

---

## Phase 1: Implement

### Command

```bash
/implement
```

### What happens

1. The project-manager agent reads your task doc from `kanban/doing/<task-name>.md` (or moves it from backlog if needed)
2. Based on task `complexity`, dispatches the appropriate subagent(s):
   - **Complexity 0** → @apprentice-builder
   - **Complexity 1** → @builder
   - **Complexity 2** → @planner, then @builder
   - **Complexity 3** → @master-planner, then @master-builder
3. If `advanced_ui: true`, the @ui-ux-expert reviews the implementation afterward
4. The builder(s) implement your feature and **stage all changes** (do not commit)
5. Agents output a summary of changes made

### What you get

- All implementation changes staged in git (use `git diff --staged` to review)
- A summary of files modified
- Your task doc remains in `kanban/doing/`

### Your action

Review the staged changes:

```bash
git diff --staged
git status
```

If changes look good, proceed to Phase 2. If you need fixes, tell the agents what to change and they'll update the staged changes.

---

## Phase 2: Review (Manual)

### What you do

1. Inspect all staged changes thoroughly
2. Test the feature locally if needed
3. Verify code style and adherence to project conventions
4. Update the task doc manually if needed:
   - Add a `## Changes Made` section with file descriptions
   - Or run `/review-code` to have an agent review the changes

### When ready

Proceed to Phase 3: Finalize.

---

## Phase 3: Finalize

### Command

```bash
/finalise
```

### What happens

1. Runs `yarn lint:fix` and `yarn format` to ensure code style is perfect
2. **If linting fails**, stops immediately without committing or merging
3. Runs `yarn typecheck` for TypeScript validation
4. **If typecheck fails**, stops immediately without committing or merging
5. Runs `yarn build` to validate the production build
6. **If build fails**, stops immediately without committing or merging
7. Moves the task doc from `kanban/review/<task-name>.md` to `kanban/done/<task-name>.md`
8. **Makes the FINAL COMMIT** (the only agent-made commit allowed): `feat: <task-name> - ready to merge`
9. Merges the feature branch into `main` with fast-forward merge (if possible)
10. Deletes the feature branch
11. Checks out `main` and reports success

### Result

- Your feature is merged to `main` only if it passes all quality gates (lint, typecheck, build)
- Task doc is in `kanban/done/` with a record of what was done
- Feature branch is deleted
- You're on the `main` branch

---

## Example Workflow

```bash
# Step 1: Start a feature branch
git checkout -b feature/add-dark-mode

# Step 2: Run the implement command
/implement
# → Agents implement the feature and stage changes

# Step 3: Review staged changes
git diff --staged
git status

# Step 4: Test and verify everything looks good
yarn dev
# Test the feature...

# Step 5: Finalize and merge
/finalise
# → Linting, formatting, final commit, merge to main

# Now you're on main with your feature merged!
```

---

## Important Notes

### No Force-Push

The `/finalise` command uses `--ff-only` (fast-forward only) for merges. This means:

- If your feature branch diverged from main, the merge will fail
- Keep your feature branch in sync with `main` before finalizing
- If merge fails, resolve conflicts on your feature branch first, then retry `/finalise`

### Manual File Moves

If you need to move task docs manually between kanban folders, use:

```bash
mv kanban/doing/<task-name>.md kanban/review/<task-name>.md
```

(The `/finalise` command moves from `review/` → `done/`, so you must have it in `review/` first if you're skipping the standard workflow.)

### Cancelling Work

If you abandon a feature:

```bash
git checkout main
git branch -D feature/<task-name>  # Delete the branch locally
# Move task doc to kanban/backlog or delete it
```

---

## Troubleshooting

### Merge conflicts on `/finalise`

If the merge fails, you have diverged from `main`. Fix it:

```bash
git fetch origin main  # Get latest main
git rebase origin/main  # Rebase your feature onto main
# Resolve conflicts...
# Then retry /finalise
```

### Lint/format/typecheck/build errors during `/finalise`

The command will detect and report errors from any of the quality gates (linting, formatting, typecheck, or build) and **will NOT proceed with committing or merging**. If this happens:

1. Go back to your feature branch: `git checkout feature/<task-name>`
2. Fix the issues manually or re-run `/implement` on your feature branch with updated task doc
3. Stage your fixes: `git add .`
4. Retry `/finalise`

The command is designed to prevent broken code from reaching `main` — this is by design!

### Task doc not found

The `/finalise` command expects `kanban/review/<task-name>.md`. If it's not there:

```bash
mv kanban/doing/<task-name>.md kanban/review/<task-name>.md
```

Then retry.

---

## Summary of Commands

| Command        | Purpose                                      | Commits? |
| -------------- | -------------------------------------------- | -------- |
| `/implement`   | Plan & implement feature using agents        | ✗ No     |
| `/finalise`    | Finalize, merge to main, and ship            | ✓ Yes    |
| `/review-code` | Have an agent review code changes            | ✗ No     |
| `git commit`   | Make manual commits (use before `/finalise`) | ✓ Yes    |
