// Adventure: three creatures fight their way through 20 levels, one ring at a time. Nobody can die
// here: the party fights as copies, so nothing that happens in a level touches the real ones. Pure
// logic with no DOM, so tests can play whole levels.

import { clamp, makeRng } from '../lib/util.js';
import { parseCreature, serializeCreature, wildCreature } from './creature.js';
import { withoutHouse } from './house.js';
import { addItem, rollDrops } from './items.js';
import { Bout } from '../sim/arena.js';
import { deadlyMonsterStats } from '../sim/challenges.js';
import { DEADLY_MONSTERS } from '../data/monsters.js';
import { MAX_BANK } from '../data/crafting.js';
import { MAX_ORE } from '../data/forge.js';
import {
  ADVENTURE_PARTY, ADVENTURE_LEVELS, ADVENTURE_BOSSES, ADVENTURE_MAX_ENEMIES, ADVENTURE_MORE_EVERY, ADVENTURE_SEASONED, ADVENTURE_TOUGHER, ADVENTURE_GEMS_PER_LEVEL,
  ADVENTURE_FINISH_GEMS, ADVENTURE_PRIZES, ADVENTURE_REPLAY_ORE, ADVENTURE_DROPS, ADVENTURE_DROPS_PER_LEVEL,
} from '../data/adventure.js';

export const LEVEL_COUNT = ADVENTURE_LEVELS.length;
export const levelInfo = (n) => ADVENTURE_LEVELS[n - 1] ?? null;
export const bossOf = (n) => ADVENTURE_BOSSES[n] ?? null;

// Who level n sends: wild fighters, more and more seasoned as it goes, and on a boss level fewer of
// them behind a deadly monster. The same seed always sends the same ones.
export function levelEnemies(n, seed) {
  const rng = makeRng(seed);
  const boss = bossOf(n);
  const full = Math.min(ADVENTURE_MAX_ENEMIES, 1 + Math.floor(n / ADVENTURE_MORE_EVERY));
  const count = boss ? Math.floor(full / 2) : full;
  const level = n >= ADVENTURE_SEASONED[3] ? 3 : n >= ADVENTURE_SEASONED[2] ? 2 : 1;
  const fighters = Array.from({ length: count }, () => wildCreature(Math.floor(rng() * 2 ** 31), level));
  return { fighters, boss };
}

// How much harder than usual everything on the other side hits and lasts at level n.
export const levelToughness = (n) => 1 + (n - 1) * ADVENTURE_TOUGHER;

// Why this party can't set off, or null if it can.
export function partyProblem(party) {
  if (!party.length) return 'Pick who goes';
  if (party.length > ADVENTURE_PARTY) return `At most ${ADVENTURE_PARTY} go`;
  if (new Set(party.map((c) => c.id)).size < party.length) return 'Each one can only go once';
  if (party.some((c) => c.dead)) return 'Someone in that party is gone';
  return null;
}

// Why level n can't be played yet, or null if it can. Beaten levels can always be played again.
export function levelProblem(adventure, n) {
  if (!Number.isInteger(n) || n < 1 || n > LEVEL_COUNT) return 'There is no such level';
  if (n > adventure.best + 1) return `Beat level ${adventure.best + 1} first`;
  return null;
}

// Sets level n up in a ring, the party down the left and the enemy down the right.
export function startLevel(n, party, { seed = 1, cx, cy, r, sizeMul } = {}) {
  const { fighters, boss } = levelEnemies(n, seed);
  const ours = party.map((c) => parseCreature(serializeCreature(withoutHouse(c))));
  const bout = new Bout([...ours, ...fighters], { seed, cx, cy, r, sizeMul });
  bout.fighters.forEach((f, i) => { f.team = i < ours.length ? 0 : 1; });
  if (boss) bout.addMonster(DEADLY_MONSTERS[boss], deadlyMonsterStats(DEADLY_MONSTERS[boss], seed));
  const tough = levelToughness(n);
  bout.fighters.filter((f) => f.team !== 0).forEach((f) => {
    f.maxHp *= tough;
    f.hp = f.maxHp;
    f.atk *= tough;
  });
  bout.lineUp();
  bout.adventure = n;
  return bout;
}

// A level is won when nothing on the other side is left standing.
export const levelWon = (bout) => bout.done && !bout.fighters.some((f) => f.team !== 0 && f.alive && !f.minion);

// What winning level n pays, given the best level beaten before. Only the first win pays gems and
// prizes; every win has a chance of an item.
export function levelReward(n, best, rng = Math.random) {
  const first = n > best;
  const reward = { first, gems: 0, ore: 0, items: [] };
  if (first) {
    const prize = ADVENTURE_PRIZES[n] ?? {};
    reward.gems = n * ADVENTURE_GEMS_PER_LEVEL + (n === LEVEL_COUNT ? ADVENTURE_FINISH_GEMS : 0);
    reward.ore = prize.ore ?? 0;
    Object.entries(prize.items ?? {}).forEach(([id, k]) => { for (let i = 0; i < k; i++) reward.items.push(id); });
  } else if (bossOf(n)) {
    reward.ore = ADVENTURE_REPLAY_ORE;
  }
  const chances = Object.fromEntries(Object.entries(ADVENTURE_DROPS).map(([id, p]) => [id, p + n * (ADVENTURE_DROPS_PER_LEVEL[id] ?? 0)]));
  reward.items.push(...rollDrops(chances, rng));
  return reward;
}

// Pays a won level into the household and moves the campaign on.
export function winLevel(house, n, rng = Math.random) {
  const reward = levelReward(n, house.adventure.best, rng);
  house.bank.gems = clamp(house.bank.gems + reward.gems, 0, MAX_BANK);
  house.ore = clamp(house.ore + reward.ore, 0, MAX_ORE);
  reward.items.forEach((id) => addItem(house, id));
  house.adventure.best = Math.max(house.adventure.best, n);
  return reward;
}
