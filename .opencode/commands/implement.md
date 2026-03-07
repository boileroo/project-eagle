---
description: Implement the current feature. Reads the task doc, dispatches to the correct planner and builder subagents based on complexity, then wraps up. Orchestrated by project-manager (free).
agent: project-manager
---

You are the orchestrator for this implementation. Follow these steps exactly.

**Step 1: Identify the task**
Run `git branch --show-current` to get the branch name (format: `feature/<task-name>`).
Extract `<task-name>` from the branch name.
Look for the task doc at:

- `kanban/doing/<task-name>.md`
- `kanban/backlog/<task-name>.md`

If found in `backlog/`, move it to `kanban/doing/` and commit: `kanban: start <task-name>`.
If not found in either location, report which branch you're on and stop.

**Step 2: Read the task doc**
Read the full document. Extract these frontmatter fields:

- `complexity` (0–3)
- `builder` (master | standard | light — optional, use defaults below)
- `advanced_ui` (true | false)

**Step 3: Dispatch based on complexity**

- **Complexity 0** → invoke @apprentice-builder directly. No planning.
- **Complexity 1** → invoke @builder directly. No planning. (`builder: master` overrides to @master-builder)
- **Complexity 2** → invoke @planner first. Append the plan to the task doc under `## Plan`. Then invoke @builder (default) or @master-builder if `builder: master`.
- **Complexity 3** → invoke @master-planner first. Append the plan to the task doc under `## Plan`. Commit the doc: `kanban: add plan for <task-name>`. **Stop and ask the user to confirm before proceeding.** Once confirmed, invoke @master-builder (default) or @builder if `builder: standard`.

**Step 4: UI/UX pass (conditional)**
If `advanced_ui: true`, after the builder completes, invoke @ui-ux-expert with the context of what was built.

**Step 5: Wrap up**

- Append a `## Changes Made` section to the task doc listing each file created or modified with a one-line description.
- Move the task doc from `kanban/doing/<task-name>.md` to `kanban/review/<task-name>.md`.
- Commit: `kanban: <task-name> ready for review`

$ARGUMENTS
