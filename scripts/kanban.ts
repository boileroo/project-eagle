#!/usr/bin/env tsx
/**
 * kanban work - Start a new task by creating a feature branch and moving the task doc to doing/.
 *
 * Usage:
 *   yarn kanban work <task-name>   Create/checkout feature branch, move doc to doing/
 *
 * Workflow:
 *   1. Create task doc manually: kanban/backlog/<task-name>.md
 *   2. yarn kanban work <task-name>
 *      → Creates/checks out branch feature/<task-name>
 *      → Moves doc to kanban/doing/
 *      → Ready to start coding
 *   3. Code in OpenCode, using Plan/Build modes as needed
 *   4. /finalise when done
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const KANBAN_DIR = path.join(PROJECT_ROOT, 'kanban');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function exec(cmd: string, opts?: { cwd?: string }): string {
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      cwd: opts?.cwd ?? PROJECT_ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    const msg = err.stderr ?? err.stdout ?? err.message ?? String(e);
    throw new Error(msg.trim());
  }
}

function findDoc(
  taskName: string,
): { column: string; filePath: string } | null {
  for (const col of ['backlog', 'doing']) {
    const fp = path.join(KANBAN_DIR, col, `${taskName}.md`);
    if (fs.existsSync(fp)) return { column: col, filePath: fp };
  }
  return null;
}

function branchName(taskName: string): string {
  return `feature/${taskName}`;
}

function currentBranch(): string {
  return exec('git branch --show-current');
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

function cmdWork(taskName: string): void {
  if (!taskName) {
    console.error('Usage: yarn kanban work <task-name>');
    process.exit(1);
  }

  const doc = findDoc(taskName);
  if (!doc) {
    console.error(`No kanban doc found for: ${taskName}`);
    console.error('Make sure kanban/backlog/<task-name>.md exists.');
    process.exit(1);
  }

  // Ensure we're on main
  const cb = currentBranch();
  if (cb !== 'main') {
    console.error(`Must run from main branch (currently on: ${cb})`);
    console.error('Run: git checkout main');
    process.exit(1);
  }

  // Warn if main has uncommitted changes
  try {
    const status = exec('git status --porcelain');
    if (status) {
      console.warn(
        'Warning: main has uncommitted changes. Branch will include current state.',
      );
    }
  } catch {
    // ignore
  }

  // Create or checkout the branch
  const branch = branchName(taskName);
  const branchExists = (() => {
    try {
      exec(`git rev-parse --verify "${branch}"`);
      return true;
    } catch {
      return false;
    }
  })();

  if (branchExists) {
    exec(`git checkout "${branch}"`);
    console.log(`Checked out existing branch: ${branch}`);
  } else {
    exec(`git checkout -b "${branch}"`);
    console.log(`Created and checked out branch: ${branch}`);
  }

  // Move doc from backlog to doing (if it's in backlog)
  if (doc.column === 'backlog') {
    const docDest = path.join(KANBAN_DIR, 'doing', `${taskName}.md`);
    fs.mkdirSync(path.join(KANBAN_DIR, 'doing'), { recursive: true });
    fs.renameSync(doc.filePath, docDest);
    exec('git add kanban/');
    exec(`git commit -m "kanban: start ${taskName}"`);
    console.log('Moved task doc to doing/ and committed.');
  }

  console.log();
  console.log('Ready. Open OpenCode:');
  console.log('  opencode');
  console.log();
  console.log('Then use Plan/Build modes (Tab) to implement the task.');
  console.log('Ship with: /finalise');
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const [cmd, ...args] = process.argv.slice(2);

if (cmd === 'work') {
  cmdWork(args[0]);
} else if (!cmd) {
  console.error('Usage: yarn kanban work <task-name>');
  process.exit(1);
} else {
  console.error(`Unknown command: ${cmd}`);
  console.error('Usage: yarn kanban work <task-name>');
  process.exit(1);
}
