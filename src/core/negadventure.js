// The Negative Dimension's own Adventure: 30 levels for a party of its own creatures. Nobody dies,
// and whoever wins the last level can cross over to the light world (core/negative.js). Pure logic
// with no DOM, so tests can play whole levels.

import { makeRng, clamp } from '../lib/util.js';
import { Bout } from '../sim/arena.js';
import { deadlyMonsterStats } from '../sim/challenges.js';
import { DEADLY_MONSTERS } from '../data/monsters.js';
import { sanitizeNeg, wildNegCreature, addNegXp, loseLevel } from './negative.js';
import { NEG_TRAIT_IDS } from '../data/powers.js';
import { MAX_STONES } from '../data/ascension.js';
import { FOE_REFLECT } from '../data/battle.js';
import {
  NEG_LEVELS, NEG_LEVEL_COUNT, NEG_PARTY, NEG_ENEMIES, NEG_TOUGHER, NEG_BOSSES, NEG_BOSS_STATS, NEG_REWARD, NEG_SCALE, enemyLevel,
  ELITE_LEVELS, ELITE_COUNT, ELITE, ELITE_BOSSES, ELITE_REWARD,
} from '../data/negative.js';

export const negLevelInfo = (n) => NEG_LEVELS[n - 1] ?? null;
export const negBossOf = (n) => NEG_BOSSES[n] ?? null;
export function negBossMonster(n) {
  const boss = negBossOf(n);
  if (!boss) return null;
  const def = DEADLY_MONSTERS[boss.monster];
  return { ...def, name: boss.name, ...(boss.moves ? { moves: boss.moves } : {}), ...(boss.passive ? { passive: boss.passive } : {}) };
}
export const negToughness = (n) => 1 + (n - 1) * NEG_TOUGHER;

// Who level n sends. The same seed always sends the same ones.
export function negLevelEnemies(n, seed) {
  const rng = makeRng(seed);
  const boss = negBossOf(n);
  const full = Math.min(NEG_ENEMIES.max, 1 + Math.floor(n / NEG_ENEMIES.moreEvery));
  const count = boss ? Math.max(1, Math.floor(full / 2)) : full;
  const fighters = Array.from({ length: count }, () => wildNegCreature(Math.floor(rng() * 2 ** 31), enemyLevel(n)));
  return { fighters, boss };
}

export function negPartyProblem(party) {
  if (!party.length) return 'Pick who goes';
  if (party.length > NEG_PARTY) return `At most ${NEG_PARTY} go`;
  if (new Set(party.map((c) => c.id)).size < party.length) return 'Each one can only go once';
  if (party.some((c) => !c.klass)) return `${party.find((c) => !c.klass).name} has to choose a class first`;
  return null;
}

export function negLevelProblem(world, n) {
  if (!Number.isInteger(n) || n < 1 || n > NEG_LEVEL_COUNT) return 'There is no such level';
  if (n > world.adventure.best + 1) return `Beat level ${world.adventure.best + 1} first`;
  return null;
}

// A ring of the Negative: the party as copies down the left, so nothing in the ring touches them, and
// the enemy and its boss (`bossDef` at `bossMul` times its Challenges stats) down the right, all of
// them `tough` times as strong.
function negRing(party, fighters, bossDef, bossMul, tough, { seed = 1, cx, cy, r, sizeMul } = {}) {
  const ours = party.map((c) => sanitizeNeg(JSON.parse(JSON.stringify(c))));
  const bout = new Bout([...ours, ...fighters], { seed, cx, cy, r, sizeMul });
  bout.fighters.forEach((f, i) => { f.team = i < ours.length ? 0 : 1; });
  if (bossDef) {
    const stats = deadlyMonsterStats(bossDef, seed);
    const m = bout.addMonster(bossDef, Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, Math.round(v * bossMul)])));
    // Everything in the Negative is NEG_SCALE times as big.
    m.maxHp *= NEG_SCALE;
    m.hp = m.maxHp;
    m.atk *= NEG_SCALE;
    m.ringMul = NEG_SCALE;
  }
  bout.fighters.filter((f) => f.team !== 0).forEach((f) => {
    f.maxHp *= tough;
    f.hp = f.maxHp;
    f.atk *= tough;
    // Its mirrors throw back only a tenth of what they say.
    f.reflectMul = FOE_REFLECT;
  });
  bout.lineUp();
  return bout;
}

// Sets level n up in a ring.
export function startNegLevel(n, party, opts = {}) {
  const { fighters, boss } = negLevelEnemies(n, opts.seed ?? 1);
  const bout = negRing(party, fighters, boss && negBossMonster(n), NEG_BOSS_STATS * (boss?.power ?? 1), negToughness(n), opts);
  bout.negative = n;
  return bout;
}

export const negLevelWon = (bout) => bout.done && !bout.fighters.some((f) => f.team !== 0 && f.alive && !f.minion);

// What a level pays, win or lose: Void Shards for a win, more the first time, and XP for everyone.
export function negReward(n, best, won) {
  const first = won && n > best;
  const xp = Math.round((NEG_REWARD.xp + NEG_REWARD.xpPerLevel * n) * (won ? 1 : NEG_REWARD.lossXp));
  const shards = !won ? 0 : first ? NEG_REWARD.shards + NEG_REWARD.shardsPerLevel * n : NEG_REWARD.replayShards + Math.floor(n / 3);
  return { first, won, xp, shards };
}

// The level is over: pays it, levels the party up, and moves the campaign on. A Death oath kept
// costs a level. `party` is the real creatures. Returns the reward, with who went up and down.
export function settleNegLevel(world, party, n, won) {
  const reward = negReward(n, world.adventure.best, won);
  world.shards += reward.shards;
  reward.up = [];
  reward.down = [];
  for (const nc of party) {
    if (won) {
      nc.wins += 1;
      nc.best = Math.max(nc.best, n);
    } else {
      nc.losses += 1;
      if (nc.nen.vows.includes('oath') && loseLevel(nc)) reward.down.push(nc.name);
    }
    const gained = addNegXp(nc, reward.xp);
    if (gained) reward.up.push({ name: nc.name, level: nc.level });
  }
  if (won) world.adventure.best = Math.max(world.adventure.best, n);
  return reward;
}

// ---------- the Elite Negative ----------

// It opens once Chapter ??? is beaten in the light world (eliteOpen in core/universe.js), and pays
// Ascension Stones.
export const eliteInfo = (k) => ELITE_LEVELS[k - 1] ?? null;
export const eliteBossOf = (k) => ELITE_BOSSES[k] ?? null;
export function eliteBossMonster(k) {
  const boss = eliteBossOf(k);
  if (!boss) return null;
  return { ...DEADLY_MONSTERS[boss.monster], name: boss.name, moves: boss.moves, passive: boss.passive };
}
export const eliteToughness = (k) => ELITE.tough * ELITE.grow ** (k - 1);

// Who Elite level k sends: wild creatures at the top of everything, each with more gifts of the
// Negative than any egg hatches with. The same seed always sends the same ones.
export function eliteEnemies(k, seed) {
  const rng = makeRng(seed);
  const boss = eliteBossOf(k);
  const full = Math.min(NEG_ENEMIES.max, ELITE.enemies + Math.floor(k / ELITE.moreEvery));
  const count = boss ? Math.max(1, Math.floor(full / 2)) : full;
  const fighters = Array.from({ length: count }, () => {
    const nc = wildNegCreature(Math.floor(rng() * 2 ** 31), ELITE.level);
    const more = NEG_TRAIT_IDS.filter((id) => !nc.traits.includes(id));
    for (let i = 0; i < ELITE.gifts && more.length; i++) nc.traits.push(more.splice(Math.floor(rng() * more.length) % more.length, 1)[0]);
    return nc;
  });
  return { fighters, boss };
}

// Why Elite level k can't be fought yet, or null if it can. `open` is whether Chapter ??? is beaten.
export function eliteProblem(world, k, open) {
  if (!open) return 'The Elite Negative only opens once Chapter ??? is beaten';
  if (!Number.isInteger(k) || k < 1 || k > ELITE_COUNT) return 'There is no such level';
  const best = world.elite?.best ?? 0;
  if (k > best + 1) return `Beat Elite ${best + 1} first`;
  return null;
}

export function startElite(k, party, opts = {}) {
  const { fighters, boss } = eliteEnemies(k, opts.seed ?? 1);
  const bout = negRing(party, fighters, boss && eliteBossMonster(k), ELITE.bossStats * (boss?.power ?? 1), eliteToughness(k), opts);
  bout.negative = k;
  bout.elite = k;
  return bout;
}

// What an Elite level pays, win or lose: Ascension Stones and Void Shards for a win, more the first
// time, and XP for everyone.
export function eliteReward(k, best, won) {
  const first = won && k > best;
  const boss = !!eliteBossOf(k);
  const xp = Math.round((ELITE_REWARD.xp + ELITE_REWARD.xpPerLevel * k) * (won ? 1 : ELITE_REWARD.lossXp));
  const shards = !won ? 0 : first ? ELITE_REWARD.shards + ELITE_REWARD.shardsPerLevel * k : ELITE_REWARD.replayShards + k * 5;
  const stones = !won ? 0 : first ? (boss ? ELITE_REWARD.bossStones : ELITE_REWARD.stones) : boss ? ELITE_REWARD.replayBossStones : 0;
  return { first, won, xp, shards, stones };
}

// The level is over: pays it and levels the party up, the same way as a level of the Negative.
export function settleElite(world, party, k, won) {
  const reward = eliteReward(k, world.elite?.best ?? 0, won);
  world.shards += reward.shards;
  world.stones = clamp((world.stones ?? 0) + reward.stones, 0, MAX_STONES);
  reward.up = [];
  reward.down = [];
  for (const nc of party) {
    if (won) nc.wins += 1;
    else {
      nc.losses += 1;
      if (nc.nen.vows.includes('oath') && loseLevel(nc)) reward.down.push(nc.name);
    }
    const gained = addNegXp(nc, reward.xp);
    if (gained) reward.up.push({ name: nc.name, level: nc.level });
  }
  if (won) world.elite = { best: Math.max(world.elite?.best ?? 0, k) };
  return reward;
}
