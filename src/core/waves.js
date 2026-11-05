// Holding the line: waves of raiders come at your village, and your three mains plus the strongest
// at home fight them in a ring on your screen. Nobody can die here; it is a test of your village.
// Pure logic with no DOM, so tests can play whole waves.

import { makeRng } from '../lib/util.js';
import { parseCreature, serializeCreature, wildCreature, powerOf } from './creature.js';
import { withoutHouse } from './house.js';
import { Bout } from '../sim/arena.js';
import { deadlyMonsterStats } from '../sim/challenges.js';
import { DEADLY_MONSTERS, DEADLY_IDS } from '../data/monsters.js';
import { WAVE_FROM_VILLAGE, WAVE_MAX_RAIDERS, WAVE_TOUGHER, WAVE_BOSS_EVERY } from '../data/village.js';

// Who holds the line: the mains, and the strongest at home.
export function defenders(mains, villagers) {
  const home = villagers.slice().sort((a, b) => powerOf(b) - powerOf(a)).slice(0, WAVE_FROM_VILLAGE);
  return [...mains, ...home];
}

// What wave n brings: more raiders, from tougher villages, and every fifth wave a monster from the
// Challenges note leading them, from the Pit Rat up to The Last Dragon.
export function waveEnemies(n, seed) {
  const rng = makeRng(seed);
  const count = Math.min(WAVE_MAX_RAIDERS, 1 + Math.floor(n / 2));
  // The top villages send their best a few at a time, so the waves climb rather than jump.
  const levelOf = (i) => (n <= 3 ? 1 : n <= 7 ? 2 : i < n - 7 ? 3 : 2);
  const raiders = Array.from({ length: count }, (_, i) => wildCreature(Math.floor(rng() * 2 ** 31), levelOf(i)));
  const boss = n % WAVE_BOSS_EVERY === 0 ? DEADLY_IDS[Math.min(DEADLY_IDS.length - 1, n / WAVE_BOSS_EVERY - 1)] : null;
  return { raiders, boss };
}

// How much harder than usual everything in wave n hits and lasts.
export const waveToughness = (n) => 1 + Math.max(0, n - 12) * WAVE_TOUGHER;

// Sets wave n up in a ring. The defenders are copies, so nothing that happens here touches them.
export function startWave(n, line, { seed = 1, cx = 500, cy = 400, r = 300, sizeMul = 1 } = {}) {
  const { raiders, boss } = waveEnemies(n, seed);
  const ours = line.map((c) => parseCreature(serializeCreature(withoutHouse(c))));
  const bout = new Bout([...ours, ...raiders], { seed, cx, cy, r, sizeMul });
  bout.fighters.forEach((f, i) => { f.team = i < ours.length ? 0 : 1; });
  if (boss) bout.addMonster(DEADLY_MONSTERS[boss], deadlyMonsterStats(DEADLY_MONSTERS[boss], seed));
  const tough = waveToughness(n);
  bout.fighters.filter((f) => f.team !== 0).forEach((f) => {
    f.maxHp *= tough;
    f.hp = f.maxHp;
    f.atk *= tough;
  });
  bout.lineUp();
  bout.wave = n;
  return bout;
}

export const waveHeld = (bout) => bout.fighters.some((f) => f.team === 0 && f.alive && !f.minion);

// Gems for reaching a wave for the first time: its number. Beating it again pays nothing.
export const waveReward = (n, best) => (n > best ? n : 0);
