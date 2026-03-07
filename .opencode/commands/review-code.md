---
description: Review the current branch's changes. Pass --light for a quick sanity check (Haiku, 0.33x PRU) or --thorough for a deep review (GPT-5.3-Codex, 1x PRU). Defaults to --light.
agent: project-manager
---

Review the changes on the current branch against main.

**Step 1: Determine review depth**
Check the arguments provided: `$ARGUMENTS`

- If `--thorough` is present → use @expert-reviewer
- Otherwise (including `--light` or no argument) → use @light-reviewer

**Step 2: Gather context**
Run `git diff main...HEAD` to get the full diff for this branch.
Run `git log main..HEAD --oneline` to summarise the commits.
Find the task doc: check `kanban/review/` and `kanban/doing/` for a file matching the branch name (`feature/<task-name>` → `<task-name>.md`). If found, read it for the `## Done When` criteria.

**Step 3: Dispatch to reviewer**
Pass the diff, commit list, and Done When criteria to the chosen reviewer subagent.

**Step 4: Output**
Present the reviewer's findings as:

- **Status**: Pass / Needs changes / Has issues
- **Findings**: Grouped by severity (Critical / Warning / Suggestion)
- **Done When**: Whether each acceptance criterion is met

Do not commit anything.
