# OpenCode Workflow Guide

This guide explains the simplified workflow for implementing features.

## Overview

The workflow is split into three phases:

1. **Start** (`yarn kanban work <task>`)
2. **Implement** (Plan/Build in OpenCode)
3. **Ship** (`/finalise`)

---

## Phase 1: Start

### Command

```bash
yarn kanban work <task-name>
```

### What happens

1. Creates/checks out a feature branch: `feature/<task-name>`
2. Moves the task doc from `kanban/backlog/` to `kanban/doing/`
3. Prints instructions to start coding

### Prerequisites

- You must have a task doc at `kanban/backlog/<task-name>.md`
- You must be on the `main` branch
- The task doc should follow the template in `kanban/TEMPLATE.md`

### Example

```bash
# Task doc already created at: kanban/backlog/add-dark-mode.md
yarn kanban work add-dark-mode
# → Creates feature/add-dark-mode branch
# → Moves doc to kanban/doing/add-dark-mode.md
# → Ready to start coding
```

---

## Phase 2: Implement

### Open OpenCode

```bash
opencode
```

### Use Plan Mode (Tab)

Switch to Plan mode using the **Tab** key to think through your implementation before making changes:

```
<TAB>  # Switch to Plan mode
What's the approach for building this feature?
```

Plan mode has read-only access and won't modify files. Iterate on the plan until you're confident.

### Switch to Build Mode (Tab)

Once you have a solid plan, switch back to Build mode using **Tab**:

```
<TAB>  # Switch back to Build mode
Implement the feature now.
```

Build mode has full access to write and execute code.

### Optional: Get a Code Review

After implementation, switch to Reviewer mode using **Tab**:

```
<TAB>  # Cycle to Reviewer mode
Review my changes for any issues.
```

Or mention the reviewer directly:

```
@reviewer review my changes for any issues
```

The reviewer will analyze your implementation against the project conventions and suggest improvements. You'll be prompted to select your preferred model.

### Optional: UI/UX Polish

If your changes include UI, switch to UI Expert mode using **Tab**:

```
<TAB>  # Cycle to UI Expert mode
Review the UI and UX.
```

Or mention the UI expert directly:

```
@ui-expert review the UI and UX
```

The UI expert will suggest improvements to visual hierarchy, spacing, accessibility, and consistency without touching business logic.

### All Changes Are Staged

Agents only stage changes. No commits are made. Review staged changes before finalizing:

```bash
git diff --staged
git status
```

---

## Phase 3: Ship

### Move Task Doc to Review (Manual)

Before finalizing, move the task doc from `doing/` to `review/`:

```bash
mv kanban/doing/<task-name>.md kanban/review/<task-name>.md
git add kanban/
git commit -m "kanban: move to review"
```

Or if you're confident, skip this step — `/finalise` can handle it.

### Run Finalise

```bash
/finalise
```

### What happens

1. **Lint & Format** — Runs `yarn lint:fix` and `yarn format`. Stops if there are non-fixable errors.
2. **Typecheck** — Runs `yarn typecheck`. Stops on any TypeScript errors.
3. **Build** — Runs `yarn build`. Stops on build failure.
4. **Move doc** — Moves task doc from `kanban/review/` to `kanban/done/`
5. **Commit** — Creates a final commit: `feat: <task-name> - ready to merge`
6. **Merge** — Merges feature branch into `main` with fast-forward merge
7. **Cleanup** — Deletes the feature branch and checks out `main`

### Result

- Your feature is merged to `main` only if it passes all quality gates
- Task doc is in `kanban/done/` as a record of what was implemented
- Feature branch is deleted
- You're on the `main` branch ready for the next task

---

## Full Example Workflow

```bash
# Step 1: Create a task doc
# kanban/backlog/add-notifications.md already exists

# Step 2: Start the task
yarn kanban work add-notifications
# → Checks out feature/add-notifications
# → Moves doc to kanban/doing/

# Step 3: Open OpenCode
opencode

# Step 4: Plan it out (Tab to Plan mode)
<TAB>
What's the approach for the notification system?
# → Get a plan

# Step 5: Build it (Tab back to Build mode)
<TAB>
Go ahead and implement the notification system.
# → Implementation is staged

# Step 6: Review the code (Tab to Reviewer mode, optional)
<TAB>
Review my changes for any issues.
# → Get feedback

# Step 7: Finalize
/finalise
# → Quality checks pass ✓
# → Merged to main ✓
# → Done!
```

---

## Troubleshooting

### Task doc not found when running `yarn kanban work`

Make sure the doc exists at `kanban/backlog/<task-name>.md`. You can create one manually by copying `kanban/TEMPLATE.md` and filling in the details.

### Lint/format/typecheck/build errors during `/finalise`

The `/finalise` command will detect and report the error and **will NOT proceed** with committing or merging. This is by design — we prevent broken code from reaching `main`.

To fix:

1. Go back to your feature branch: `git checkout feature/<task-name>`
2. Fix the issues in your code
3. Stage the fixes: `git add .`
4. Retry `/finalise`

### Merge conflicts on `/finalise`

If the merge fails, you have diverged from `main`. Fix it:

```bash
git fetch origin main  # Get latest main
git rebase origin/main  # Rebase your feature onto main
# Resolve conflicts...
# Then retry /finalise
```

---

## Key Principles

- **You control the workflow** — No automatic orchestration. You decide when to Plan, Build, Review, and Ship.
- **No forced commits** — Agents only stage changes. You have full visibility before anything is committed.
- **Quality gates** — `/finalise` runs all quality checks before merge.
- **Fast-forward merges** — Feature branches must not diverge from `main`. Keep your branch up-to-date.

---

## Commands Summary

| Command                   | Purpose                                                    |
| ------------------------- | ---------------------------------------------------------- |
| `yarn kanban work <task>` | Create branch & move task doc to doing/                    |
| `opencode`                | Start OpenCode session                                     |
| `<TAB>`                   | Cycle through agents (Plan → Build → Reviewer → UI Expert) |
| `/finalise`               | Lint, typecheck, build, commit, merge to main              |

---

## File Locations

- **Task docs** — `kanban/{backlog,doing,review,done}/<task-name>.md`
- **Agents** — `.opencode/agents/{ui-expert,reviewer}.md`
- **Commands** — `.opencode/commands/finalise.md`
- **Instructions** — `AGENTS.md`
