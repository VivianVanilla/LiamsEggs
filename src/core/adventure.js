// Adventure: three creatures fight their way through 60 levels in five acts, one ring at a time,
// and after a universe reset through the 25 levels of Chapter ??? too. Nobody can die here: the party
// fights as copies, so nothing that happens in a level touches the real ones. Pure logic with no DOM,
// so tests can play whole levels.

import { makeRng } from '../lib/util.js';
import { parseCreature, serializeCreature, wildCreature } from './creature.js';
import { withoutHouse } from './house.js';
import { addItem, rollDrops } from './items.js';
import { gainGems } from './universe.js';
import { Bout } from '../sim/arena.js';
import { deadlyMonsterStats } from '../sim/challenges.js';
import { DEADLY_MONSTERS } from '../data/monsters.js';
import { LEGENDARY, BORN_TRAIT_IDS, NEG_TRAIT_IDS } from '../data/powers.js';
import { NEGATIVE_RACE_IDS } from '../data/races.js';
import { STAT_KEYS, TRAINING_LIMIT } from './creature.js';
import { clamp } from '../lib/util.js';
import { MAX_ORE, WEAPON_IDS } from '../data/forge.js';
import {
  ADVENTURE_PARTY, ADVENTURE_LEVELS, ADVENTURE_BOSSES, ADVENTURE_MAX_ENEMIES, ADVENTURE_MORE_EVERY, ADVENTURE_SEASONED, ADVENTURE_ARMED,
  ADVENTURE_TOUGHER, ADVENTURE_SOULS, ADVENTURE_STEEPER, ADVENTURE_ACTS, ADVENTURE_GEMS_PER_LEVEL, ADVENTURE_FINISH_GEMS, ADVENTURE_PRIZES, ADVENTURE_REPLAY_ORE, ADVENTURE_DROPS, ADVENTURE_DROPS_PER_LEVEL,
  ADVENTURE_ELITE, ADVENTURE_ELITE_GIFTS, ABYSS_LEVELS, ABYSS, ABYSS_BOSSES,
} from '../data/adventure.js';

export const LEVEL_COUNT = ADVENTURE_LEVELS.length;
export const levelInfo = (n) => ADVENTURE_LEVELS[n - 1] ?? null;
// The boss of level n, as { monster, name, power, moves, passive, twin }, or null.
export const bossOf = (n) => ADVENTURE_BOSSES[n] ?? null;
// The act level n is in, from 1.
export const actOf = (n) => ADVENTURE_ACTS.filter((a) => n >= a.from).length;
// How many Legendary mutations each wild fighter carries at level n.
export const soulsAt = (n) => Object.entries(ADVENTURE_SOULS).filter(([, from]) => n >= from).length;

// A boss as the ring takes it: the Challenges monster under the boss's own name, with its own moves
// and passive if it has them.
function asMonster(boss) {
  if (!boss) return null;
  const def = DEADLY_MONSTERS[boss.monster];
  if (!boss.name && !boss.moves && !boss.passive) return def;
  return { ...def, ...(boss.name ? { name: boss.name } : {}), ...(boss.moves ? { moves: boss.moves } : {}), ...(boss.passive ? { passive: boss.passive } : {}) };
}
export const bossMonster = (n) => asMonster(bossOf(n));

// A wild fighter for a level: as seasoned as the level says, armed from Act 2, Legendary from Act 3,
// and from Act 5 an Elder trained to the limit, born with gifts of its own.
function levelFighter(rng, n, souls) {
  const level = n >= ADVENTURE_SEASONED[3] ? 3 : n >= ADVENTURE_SEASONED[2] ? 2 : 1;
  const c = wildCreature(Math.floor(rng() * 2 ** 31), level);
  if (n >= ADVENTURE_ARMED) c.weapon = WEAPON_IDS[Math.floor(rng() * WEAPON_IDS.length) % WEAPON_IDS.length];
  const left = Object.keys(LEGENDARY);
  c.souls = Array.from({ length: souls }, () => left.splice(Math.floor(rng() * left.length) % left.length, 1)[0]);
  if (n >= ADVENTURE_ELITE) elite(c, rng);
  return c;
}

function elite(c, rng) {
  c.growth = Math.max(c.growth, 200);
  STAT_KEYS.forEach((k) => { c.training[k] = TRAINING_LIMIT; });
  const gifts = BORN_TRAIT_IDS.filter((id) => id !== 'sixeyes' && !c.traits.includes(id));
  for (let i = 0; i < ADVENTURE_ELITE_GIFTS && gifts.length; i++) c.traits.push(gifts.splice(Math.floor(rng() * gifts.length) % gifts.length, 1)[0]);
}

// Who level n sends: wild fighters, more and more seasoned as it goes, armed from Act 2, Legendary
// from Act 3, elite in Act 5, and on a boss level fewer of them behind a deadly monster. The same
// seed always sends the same ones.
export function levelEnemies(n, seed) {
  const rng = makeRng(seed);
  const boss = bossOf(n);
  const full = Math.min(ADVENTURE_MAX_ENEMIES, 1 + Math.floor(n / ADVENTURE_MORE_EVERY));
  const count = boss ? Math.floor(full / 2) : full;
  const fighters = Array.from({ length: count }, () => levelFighter(rng, n, soulsAt(n)));
  return { fighters, boss };
}

// How much harder than usual everything on the other side hits and lasts at level n. Each act from
// the third on climbs faster.
export const levelToughness = (n) => 1 + (n - 1) * ADVENTURE_TOUGHER
  + ADVENTURE_STEEPER.reduce((sum, s) => sum + Math.max(0, n - s.from + 1) * s.more, 0);

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

// Sets a ring up: the party down the left, the enemy and its bosses down the right, everything on
// the other side `tough` times as strong.
function setUpRing(party, fighters, boss, tough, { seed = 1, cx, cy, r, sizeMul } = {}) {
  const ours = party.map((c) => parseCreature(serializeCreature(withoutHouse(c))));
  const bout = new Bout([...ours, ...fighters], { seed, cx, cy, r, sizeMul });
  bout.fighters.forEach((f, i) => { f.team = i < ours.length ? 0 : 1; });
  if (boss) {
    const def = asMonster(boss);
    const power = boss.power ?? 1;
    for (let i = 0; i < (boss.twin ?? 1); i++) {
      const stats = deadlyMonsterStats(def, seed + i * 7919);
      bout.addMonster(def, Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, Math.round(v * power)])));
    }
  }
  bout.fighters.filter((f) => f.team !== 0).forEach((f) => {
    f.maxHp *= tough;
    f.hp = f.maxHp;
    f.atk *= tough;
  });
  bout.lineUp();
  return bout;
}

// Sets level n up in a ring, the party down the left and the enemy down the right.
export function startLevel(n, party, opts = {}) {
  const { fighters, boss } = levelEnemies(n, opts.seed ?? 1);
  const bout = setUpRing(party, fighters, boss, levelToughness(n), opts);
  bout.adventure = n;
  return bout;
}

// A level is won when nothing on the other side is left standing.
export const levelWon = (bout) => bout.done && !bout.fighters.some((f) => f.team !== 0 && f.alive && !f.minion);

// What winning level n pays, given the best level beaten before. Only the first win pays gems and
// prizes; every win has a chance of an item. These are the gems before any creature boost.
export function levelReward(n, best, rng = Math.random) {
  const first = n > best;
  const reward = { first, gems: 0, ore: 0, items: [], found: null };
  if (first) {
    const prize = ADVENTURE_PRIZES[n] ?? {};
    reward.gems = n * ADVENTURE_GEMS_PER_LEVEL + (prize.gems ?? 0) + (n === LEVEL_COUNT ? ADVENTURE_FINISH_GEMS : 0);
    reward.ore = prize.ore ?? 0;
    reward.found = prize.found ?? null;
    Object.entries(prize.items ?? {}).forEach(([id, k]) => { for (let i = 0; i < k; i++) reward.items.push(id); });
  } else if (bossOf(n)) {
    reward.ore = ADVENTURE_REPLAY_ORE;
  }
  const chances = Object.fromEntries(Object.entries(ADVENTURE_DROPS).map(([id, p]) => [id, p + n * (ADVENTURE_DROPS_PER_LEVEL[id] ?? 0)]));
  reward.items.push(...rollDrops(chances, rng));
  return reward;
}

// Pays a reward into the household. Its gems go through any creature boosts running, so the reward
// says how many it really came to.
function payReward(house, reward, now) {
  reward.gems = Math.floor(gainGems(house, reward.gems, now));
  house.ore = clamp(house.ore + reward.ore, 0, MAX_ORE);
  reward.items.forEach((id) => addItem(house, id));
  if (reward.found) house.found.push({ race: reward.found, where: null, at: now });
  return reward;
}

// Pays a won level into the household and moves the campaign on. A creature that wants to join
// waits in the village, like one an expedition found.
export function winLevel(house, n, rng = Math.random, now = Date.now()) {
  const reward = payReward(house, levelReward(n, house.adventure.best, rng), now);
  house.adventure.best = Math.max(house.adventure.best, n);
  return reward;
}

// The party's real creatures get credit for a win, toward the gifts that are earned in Adventure.
export function creditParty(party, n) {
  for (const c of party) {
    c.record.adventureWins = (c.record.adventureWins ?? 0) + 1;
    c.record.adventureBest = Math.max(c.record.adventureBest ?? 0, n);
  }
}

// ---------- Chapter ??? ----------

export const ABYSS_COUNT = ABYSS_LEVELS.length;
export const abyssInfo = (k) => ABYSS_LEVELS[k - 1] ?? null;
export const abyssBossOf = (k) => ABYSS_BOSSES[k] ?? null;
export const abyssBossMonster = (k) => asMonster(abyssBossOf(k));

// Each level of it is ABYSS.grow times harder than the last, starting past the end of Act 5.
export const abyssToughness = (k) => levelToughness(LEVEL_COUNT) * ABYSS.start * ABYSS.grow ** (k - 1);

// Only after a universe reset, and one level at a time.
export function abyssProblem(house, k) {
  if (!(house.universe?.resets > 0)) return 'Chapter ??? only opens after a universe reset';
  if (!Number.isInteger(k) || k < 1 || k > ABYSS_COUNT) return 'There is no such level';
  const best = house.universe.abyssBest ?? 0;
  if (k > best + 1) return `Beat ?${best + 1} first`;
  return null;
}

// Who lives there: Act 5's elites, every one of them a race of the Negative with its gifts.
export function abyssEnemies(k, seed) {
  const rng = makeRng(seed);
  const boss = abyssBossOf(k);
  const full = Math.min(ADVENTURE_MAX_ENEMIES, ABYSS.enemies + Math.floor(k / ABYSS.moreEvery));
  const count = boss ? Math.floor(full / 2) : full;
  const fighters = Array.from({ length: count }, () => {
    const c = levelFighter(rng, LEVEL_COUNT, 3);
    c.race = NEGATIVE_RACE_IDS[Math.floor(rng() * NEGATIVE_RACE_IDS.length) % NEGATIVE_RACE_IDS.length];
    c.heritage = null;
    const gifts = NEG_TRAIT_IDS.slice();
    for (let i = 0; i < ABYSS.negGifts; i++) c.traits.push(gifts.splice(Math.floor(rng() * gifts.length) % gifts.length, 1)[0]);
    return c;
  });
  return { fighters, boss };
}

// Everything on the other side is void-touched: only Negative blood wounds it properly.
export function startAbyss(k, party, opts = {}) {
  const { fighters, boss } = abyssEnemies(k, opts.seed ?? 1);
  const bout = setUpRing(party, fighters, boss, abyssToughness(k), opts);
  bout.fighters.filter((f) => f.team !== 0).forEach((f) => { f.voidGuard = ABYSS.voidGuard; });
  bout.adventure = 'abyss';
  bout.abyss = k;
  return bout;
}

// The first win of each level pays more than the last, and every win after that a little.
export function abyssReward(k, best, rng = Math.random) {
  const first = k > best;
  const gems = Math.round(ABYSS.gems * ABYSS.gemsGrow ** (k - 1));
  const reward = { first, gems: first ? gems : Math.round(gems * 0.05), ore: first ? ABYSS.ore + k * 4 : 2, items: [], found: null };
  if (first) {
    reward.items.push('chamber', 'expander');
    if (abyssBossOf(k)) reward.items.push('soulexpander', 'expander', 'chamber');
  }
  reward.items.push(...rollDrops({ chamber: 0.3, expander: 0.15 }, rng));
  return reward;
}

export function winAbyss(house, k, rng = Math.random, now = Date.now()) {
  const reward = payReward(house, abyssReward(k, house.universe.abyssBest ?? 0, rng), now);
  house.universe.abyssBest = Math.max(house.universe.abyssBest ?? 0, k);
  return reward;
}
