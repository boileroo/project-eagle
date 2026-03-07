#!/usr/bin/env tsx
/**
 * kanban - Branch management for the project kanban workflow.
 *
 * Usage:
 *   yarn kanban new <title>        Create a new task doc in kanban/backlog/
 *   yarn kanban work <task-name>   Checkout feature branch, ready to work
 *   yarn kanban ship <task-name>   Squash merge to main, clean up
 *   yarn kanban list               Show all tasks by column + current branch
 *   yarn kanban abort <task-name>  Delete branch without merging, return doc to backlog
 *
 * Workflow:
 *   1. yarn kanban new "Add player search"
 *   2. Edit kanban/backlog/add-player-search.md
 *   3. yarn kanban work add-player-search
 *      → Creates + checks out branch feature/add-player-search
 *      → Prints: opencode, then /implement
 *   4. Review the branch (run app, /review-code in opencode)
 *   5. yarn kanban ship add-player-search   (run from the feature branch)
 *      → Squash merges to main, moves doc to done/, deletes branch
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
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

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function findDoc(
  taskName: string,
): { column: string; filePath: string } | null {
  for (const col of ['backlog', 'doing', 'review', 'done']) {
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

function listTasksInColumn(col: string): string[] {
  const dir = path.join(KANBAN_DIR, col);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));
}

function readComplexity(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const m = content.match(/^complexity:\s*(\d)/m);
    return m ? `C${m[1]}` : '  ';
  } catch {
    return '  ';
  }
}

async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(`${question} (y/N) `, (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase() === 'y');
    });
  });
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function cmdNew(args: string[]): void {
  const title = args.join(' ').trim();
  if (!title) {
    console.error('Usage: yarn kanban new <title>');
    process.exit(1);
  }

  const slug = slugify(title);
  const dest = path.join(KANBAN_DIR, 'backlog', `${slug}.md`);

  if (fs.existsSync(dest)) {
    console.error(`Already exists: kanban/backlog/${slug}.md`);
    process.exit(1);
  }

  const templatePath = path.join(KANBAN_DIR, 'TEMPLATE.md');
  if (!fs.existsSync(templatePath)) {
    console.error('Missing template: kanban/TEMPLATE.md');
    process.exit(1);
  }

  const today = new Date().toISOString().split('T')[0];
  const content = fs
    .readFileSync(templatePath, 'utf-8')
    .replace('YYYY-MM-DD', today!)
    .replace('Task Title', title);

  fs.writeFileSync(dest, content);
  console.log(`Created: kanban/backlog/${slug}.md`);
  console.log();
  console.log('Edit the doc, then run:');
  console.log(`  yarn kanban work ${slug}`);

  // Open in $EDITOR if set
  const editor = process.env['EDITOR'];
  if (editor) {
    try {
      execSync(`${editor} "${dest}"`, { stdio: 'inherit' });
    } catch {
      // Editor might not be interactive in all contexts — ignore
    }
  }
}

function cmdWork(args: string[]): void {
  const taskName = args[0];
  if (!taskName) {
    console.error('Usage: yarn kanban work <task-name>');
    process.exit(1);
  }

  const doc = findDoc(taskName);
  if (!doc) {
    console.error(`No kanban doc found for: ${taskName}`);
    console.error('\nAvailable tasks in backlog:');
    const tasks = listTasksInColumn('backlog');
    if (tasks.length === 0) {
      console.error('  (empty)');
    } else {
      tasks.forEach((t) => console.error(`  ${t}`));
    }
    process.exit(1);
  }

  if (doc.column !== 'backlog') {
    console.error(
      `Task "${taskName}" is already in ${doc.column}/. Use 'list' to check its status.`,
    );
    process.exit(1);
  }

  const branch = branchName(taskName);

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

  console.log();
  console.log('Ready. Start working:');
  console.log('  opencode');
  console.log('  /implement');
}

async function cmdShip(args: string[]): Promise<void> {
  const taskName = args[0];
  if (!taskName) {
    console.error('Usage: yarn kanban ship <task-name>');
    process.exit(1);
  }

  const branch = branchName(taskName);

  // Must be on the feature branch (not main)
  const cb = currentBranch();
  if (cb !== branch) {
    console.error(
      `Must be on branch "${branch}" to ship (currently on: ${cb})`,
    );
    console.error(`Run: git checkout ${branch}`);
    process.exit(1);
  }

  // Check the task doc exists
  const doc = findDoc(taskName);
  if (!doc) {
    console.error(`No kanban doc found for: ${taskName}`);
    process.exit(1);
  }
  if (doc.column !== 'review' && doc.column !== 'doing') {
    console.warn(
      `Warning: task doc is in ${doc.column}/, expected review/. Proceeding anyway.`,
    );
  }

  // Confirm
  const ok = await confirm(`Ship "${taskName}" to main via squash merge?`);
  if (!ok) {
    console.log('Aborted.');
    process.exit(0);
  }

  // Switch to main and squash merge
  console.log('Switching to main...');
  exec('git checkout main');

  console.log(`Squash merging ${branch} → main...`);
  try {
    exec(`git merge --squash "${branch}"`);
  } catch (e) {
    console.error('Merge failed. Resolve conflicts, then commit manually.');
    console.error(String(e));
    process.exit(1);
  }

  // Move doc to done/
  const docSrc = doc.filePath;
  const docDest = path.join(KANBAN_DIR, 'done', `${taskName}.md`);

  if (fs.existsSync(docSrc)) {
    fs.mkdirSync(path.join(KANBAN_DIR, 'done'), { recursive: true });
    fs.renameSync(docSrc, docDest);
  }

  // Commit
  exec('git add -A');
  exec(`git commit -m "ship: ${taskName}"`);
  console.log('Committed to main.');

  // Delete the feature branch
  try {
    exec(`git branch -D "${branch}"`);
    console.log(`Deleted branch: ${branch}`);
  } catch {
    // Branch might already be gone
  }

  console.log();
  console.log(`Shipped: ${taskName}`);
  console.log(`Doc archived at: kanban/done/${taskName}.md`);
}

function cmdList(): void {
  const columns = ['backlog', 'doing', 'review', 'done'];
  const cb = currentBranch();

  let anyTasks = false;
  for (const col of columns) {
    const tasks = listTasksInColumn(col);

    // Always show non-done columns, only show done if there are entries
    if (tasks.length === 0 && col === 'done') continue;

    anyTasks = true;
    console.log(`\n${col.toUpperCase()}`);

    if (tasks.length === 0) {
      console.log('  (empty)');
    } else {
      for (const t of tasks) {
        const fp = path.join(KANBAN_DIR, col, `${t}.md`);
        const complexity = readComplexity(fp);
        console.log(`  ${complexity}  ${t}`);
      }
    }
  }

  if (!anyTasks) {
    console.log('No tasks found. Create one with: yarn kanban new <title>');
  }

  // Show current branch as hint
  if (cb !== 'main') {
    console.log(`\nCurrent branch: ${cb}`);
  }

  console.log();
}

async function cmdAbort(args: string[]): Promise<void> {
  const taskName = args[0];
  if (!taskName) {
    console.error('Usage: yarn kanban abort <task-name>');
    process.exit(1);
  }

  const branch = branchName(taskName);

  const ok = await confirm(
    `Abort "${taskName}"? This will delete the branch (no merge).`,
  );
  if (!ok) {
    console.log('Aborted.');
    process.exit(0);
  }

  // If currently on the feature branch, switch to main first
  const cb = currentBranch();
  if (cb === branch) {
    exec('git checkout main');
    console.log('Switched to main.');
  }

  // Delete branch
  try {
    exec(`git branch -D "${branch}"`);
    console.log(`Deleted branch: ${branch}`);
  } catch {
    // Branch might not exist
  }

  // Move doc back to backlog if it's in doing/
  const docInDoing = path.join(KANBAN_DIR, 'doing', `${taskName}.md`);
  if (fs.existsSync(docInDoing)) {
    const backlogDest = path.join(KANBAN_DIR, 'backlog', `${taskName}.md`);
    fs.renameSync(docInDoing, backlogDest);
    exec('git add -A');
    exec(`git commit -m "kanban: abort ${taskName}, return to backlog"`);
    console.log('Moved doc back to backlog/ and committed.');
  }

  console.log(`Aborted: ${taskName}`);
}

function printHelp(): void {
  console.log('Usage: yarn kanban <command> [args]');
  console.log();
  console.log('Commands:');
  console.log('  new <title>        Create a new task doc in kanban/backlog/');
  console.log('  work <task-name>   Create + checkout feature branch');
  console.log(
    '  ship <task-name>   Squash merge to main, archive doc, delete branch',
  );
  console.log('  list               Show all tasks by column + current branch');
  console.log('  abort <task-name>  Delete branch without merging');
  console.log();
  console.log('Typical workflow:');
  console.log('  yarn kanban new "Add player search"');
  console.log('  yarn kanban work add-player-search');
  console.log('  # opencode → /implement');
  console.log('  yarn kanban ship add-player-search   (from feature branch)');
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const [cmd, ...args] = process.argv.slice(2);

switch (cmd) {
  case 'new':
    cmdNew(args);
    break;
  case 'work':
    cmdWork(args);
    break;
  case 'ship':
    cmdShip(args).catch((e) => {
      console.error(e);
      process.exit(1);
    });
    break;
  case 'list':
    cmdList();
    break;
  case 'abort':
    cmdAbort(args).catch((e) => {
      console.error(e);
      process.exit(1);
    });
    break;
  default:
    printHelp();
    if (cmd) process.exit(1);
    break;
}
