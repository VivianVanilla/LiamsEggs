// Puzzle rules and the creature's AI. `skill` is 0..1, from its Wits and job.

import { clamp } from '../lib/util.js';
import { computeStats, perksOf, addActivityXp } from '../core/creature.js';

export function duelSkill(c) {
  const { wits } = computeStats(c);
  return clamp(0.08 + wits / 45 + perksOf(c).duelSkill, 0.08, 1);
}

// ---------- Stick Pile: take 1 to 3, whoever takes the last stick loses ----------

export function nimMove(n, skill, r = Math.random) {
  const safe = (n - 1) % 4; // leaving 1 mod 4 is a forced win
  const random = 1 + Math.floor(r() * Math.min(3, n));
  if (safe === 0) return Math.min(n, random); // already losing, so hope for a mistake
  return r() < skill ? safe : Math.min(n, random);
}

// ---------- Four Stones: drop stones, four in a row wins ----------

export const FOUR_COLS = 7;
export const FOUR_ROWS = 6;

export const newFour = () => Array(FOUR_COLS * FOUR_ROWS).fill(0);

export function fourLegal(board) {
  const out = [];
  for (let col = 0; col < FOUR_COLS; col++) if (board[col] === 0) out.push(col);
  return out;
}

export function fourDrop(board, col, who) {
  for (let row = FOUR_ROWS - 1; row >= 0; row--) {
    const i = row * FOUR_COLS + col;
    if (board[i] === 0) {
      const next = board.slice();
      next[i] = who;
      return { board: next, index: i };
    }
  }
  return null;
}

const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];

export function fourWinner(board) {
  for (let i = 0; i < board.length; i++) {
    const who = board[i];
    if (!who) continue;
    const x = i % FOUR_COLS;
    const y = Math.floor(i / FOUR_COLS);
    for (const [dx, dy] of DIRS) {
      const cells = [i];
      for (let k = 1; k < 4; k++) {
        const nx = x + dx * k;
        const ny = y + dy * k;
        if (nx < 0 || ny < 0 || nx >= FOUR_COLS || ny >= FOUR_ROWS || board[ny * FOUR_COLS + nx] !== who) break;
        cells.push(ny * FOUR_COLS + nx);
      }
      if (cells.length === 4) return { who, cells };
    }
  }
  return null;
}

function fourScore(board, who) {
  let score = 0;
  for (let row = 0; row < FOUR_ROWS; row++) {
    const v = board[row * FOUR_COLS + 3];
    if (v === who) score += 3;
    else if (v) score -= 3;
  }
  return score;
}

function negamax(board, who, depth, alpha, beta) {
  const win = fourWinner(board);
  if (win) return win.who === who ? 1000 + depth : -1000 - depth;
  const legal = fourLegal(board);
  if (!legal.length) return 0;
  if (depth === 0) return fourScore(board, who);
  let best = -Infinity;
  for (const col of orderMoves(legal)) {
    const score = -negamax(fourDrop(board, col, -who).board, -who, depth - 1, -beta, -alpha);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

const orderMoves = (legal) => legal.slice().sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3));

export function fourMove(board, who, skill, r = Math.random) {
  const legal = fourLegal(board);
  if (!legal.length) return null;
  // Low skill sometimes just plays anywhere, but even a hatchling takes an instant win.
  for (const col of legal) if (fourWinner(fourDrop(board, col, who).board)) return col;
  if (r() > 0.25 + skill * 0.75) return legal[Math.floor(r() * legal.length)];
  const depth = 1 + Math.round(skill * 5);
  let bestCol = legal[0];
  let bestScore = -Infinity;
  for (const col of orderMoves(legal)) {
    const score = -negamax(fourDrop(board, col, who).board, -who, depth - 1, -Infinity, Infinity) + r() * 0.5;
    if (score > bestScore) {
      bestScore = score;
      bestCol = col;
    }
  }
  return bestCol;
}

// ---------- Light Race: same scrambled grid, first to turn every light off wins ----------

export function lightsPress(board, size, i) {
  const next = board.slice();
  const x = i % size;
  const y = Math.floor(i / size);
  [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < size && ny < size) next[ny * size + nx] ^= 1;
  });
  return next;
}

export function makeLights(size, presses, r = Math.random) {
  let board = Array(size * size).fill(0);
  const used = new Set();
  while (used.size < presses) used.add(Math.floor(r() * board.length));
  used.forEach((i) => { board = lightsPress(board, size, i); });
  // Scrambling can cancel out to a blank board, which would be no puzzle at all.
  if (board.every((v) => !v)) return makeLights(size, presses, r);
  return { board, solution: [...used] };
}

export const lightsSolved = (board) => board.every((v) => !v);

// Milliseconds the creature takes per press. Higher skill thinks faster.
export const lightsDelay = (skill, r = Math.random) => 3200 - skill * 2300 + r() * 900;

// ---------- Echo: repeat a growing sequence ----------

// Chance the creature keeps a sequence of this length in its head.
export function echoRecallChance(len, skill) {
  return clamp(1.06 - (len / (5 + skill * 13)) ** 2.2, 0.02, 0.995);
}

// ---------- rewards ----------

export function applyDuelResult(c, won, kind) {
  // "won" is from the player's side. Beating it teaches it more than losing does.
  const perks = perksOf(c);
  const base = won ? 22 : 15;
  const xp = base * (1 + perks.duelXp);
  addActivityXp(c, 'battle', xp, won ? 'wits' : 'might');
  if (won) c.record.duelsLost += 1;
  else c.record.duelsWon += 1;
  c.fullness = clamp(c.fullness - 3, 0, 100);
  return { xp, kind };
}
