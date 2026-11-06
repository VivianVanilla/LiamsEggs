// Worlds on their own git branches. The game's code lives on main; each person's creatures and
// saves live on a branch of their own, world-<name>, checked out in worlds/<name>. Pulling game
// updates on main never touches anyone's world, and saving a world never touches main.
//
//   npm run world -- new <name> [--copy]   make worlds/<name> on branch world-<name>
//                                          (--copy starts it from the creatures in world/)
//   npm run world -- save <name> [words]   commit everything in that world, as a snapshot
//   npm run world -- push <name>           send that world's branch to GitHub
//   npm run world -- list                  show the worlds on this computer
//
// Then play one with:  Creature.exe <name>   (make Creature.exe first with: npm run exe)

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORLDS = path.join(ROOT, 'worlds');

const git = (args, cwd = ROOT, quiet = false) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: quiet ? ['ignore', 'pipe', 'ignore'] : ['ignore', 'pipe', 'inherit'] }).trim();
const tryGit = (args, cwd = ROOT) => {
  try {
    return git(args, cwd, true);
  } catch {
    return null;
  }
};
const fail = (text) => {
  console.error(text);
  process.exit(1);
};

// A name that works as a folder and a branch: letters, numbers, - and _ only.
function cleanName(raw) {
  const name = String(raw ?? '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!name) fail('Give it a name, like: npm run world -- new liam');
  return name;
}

// What a world's branch never keeps: files that were eaten (they could be anything someone dragged
// onto a creature) and half-written saves.
const WORLD_IGNORE = `# Files the creatures ate. They could be anything, so they stay on this computer.
/digested/
*.tmp
`;

function copyDir(from, to) {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'digested' || entry.name.endsWith('.tmp')) continue;
    const a = path.join(from, entry.name);
    const b = path.join(to, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(b, { recursive: true });
      copyDir(a, b);
    } else {
      fs.copyFileSync(a, b);
    }
  }
}

function newWorld(name, copy) {
  const dir = path.join(WORLDS, name);
  const branch = `world-${name}`;
  if (fs.existsSync(path.join(dir, '.git'))) {
    console.log(`worlds/${name} is already set up, on branch ${branch}.`);
    return;
  }
  fs.mkdirSync(WORLDS, { recursive: true });
  if (tryGit(['show-ref', '--verify', `refs/heads/${branch}`]) !== null) {
    git(['worktree', 'add', dir, branch]);
  } else if (tryGit(['ls-remote', '--exit-code', '--heads', 'origin', branch])) {
    // Someone already made this world on another computer: bring it here.
    git(['fetch', 'origin', `${branch}:${branch}`]);
    git(['worktree', 'add', dir, branch]);
  } else {
    // A brand new branch with nothing of main's in it: only this world's saves.
    git(['worktree', 'add', '--orphan', '-b', branch, dir]);
    fs.writeFileSync(path.join(dir, '.gitignore'), WORLD_IGNORE);
    // Saves are kept exactly as the game writes them, with no line-ending changes.
    fs.writeFileSync(path.join(dir, '.gitattributes'), '* -text\n');
    const current = path.join(ROOT, 'world');
    if (copy && fs.existsSync(current)) {
      copyDir(current, dir);
      console.log('Copied the creatures from world/ into it.');
    }
  }
  // A launcher to double-click. Like the worlds themselves, it never goes on main.
  fs.writeFileSync(path.join(ROOT, `Play ${name}.cmd`), `@echo off\r\nrem Plays ${name}'s world, from worlds\\${name}.\r\nstart "" "%~dp0Creature.exe" ${name}\r\n`);
  console.log(`\nMade worlds/${name} on branch ${branch}.`);
  console.log(`Play it:       double-click "Play ${name}.cmd", or run Creature.exe ${name}`);
  if (!fs.existsSync(path.join(ROOT, 'Creature.exe'))) console.log('               (make Creature.exe first: npm run exe)');
  console.log(`Save it:       npm run world -- save ${name}`);
}

function saveWorld(name, words) {
  const dir = path.join(WORLDS, name);
  if (!fs.existsSync(path.join(dir, '.git'))) fail(`There is no worlds/${name} yet. Make it with: npm run world -- new ${name}`);
  git(['add', '-A'], dir);
  if (!tryGit(['status', '--porcelain'], dir)) {
    console.log('Nothing has changed since the last save.');
    return;
  }
  const stamp = new Date().toLocaleString();
  git(['commit', '-m', words || `World saved ${stamp}`], dir);
  console.log(`Saved worlds/${name}. To put it on GitHub too: npm run world -- push ${name}`);
}

function pushWorld(name) {
  const dir = path.join(WORLDS, name);
  if (!fs.existsSync(path.join(dir, '.git'))) fail(`There is no worlds/${name} yet.`);
  git(['push', '-u', 'origin', `world-${name}`], dir);
  console.log(`Sent world-${name} to GitHub.`);
}

function listWorlds() {
  const names = fs.existsSync(WORLDS) ? fs.readdirSync(WORLDS).filter((n) => fs.existsSync(path.join(WORLDS, n, '.git'))) : [];
  if (!names.length) {
    console.log('No worlds yet. Make one with: npm run world -- new <name>');
    return;
  }
  for (const name of names) {
    const last = tryGit(['log', '-1', '--format=%cr: %s'], path.join(WORLDS, name)) ?? 'not saved yet';
    console.log(`${name.padEnd(16)} branch world-${name}, last save ${last}`);
  }
}

const [command, rawName, ...rest] = process.argv.slice(2);
if (command === 'list' || !command) listWorlds();
else if (command === 'new') newWorld(cleanName(rawName), rest.includes('--copy'));
else if (command === 'save') saveWorld(cleanName(rawName), rest.join(' '));
else if (command === 'push') pushWorld(cleanName(rawName));
else fail(`Don't know "${command}". Try new, save, push or list.`);
