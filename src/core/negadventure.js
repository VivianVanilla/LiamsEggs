// The Negative Dimension's own Adventure: 30 levels for a party of its own creatures. Nobody dies,
// and whoever wins the last level can cross over to the light world (core/negative.js). Pure logic
// with no DOM, so tests can play whole levels.

import { makeRng } from '../lib/util.js';
import { Bout } from '../sim/arena.js';
import { deadlyMonsterStats } from '../sim/challenges.js';
import { DEADLY_MONSTERS } from '../data/monsters.js';
import { sanitizeNeg, wildNegCreature, addNegXp, loseLevel } from './negative.js';
import {
  NEG_LEVELS, NEG_LEVEL_COUNT, NEG_PARTY, NEG_ENEMIES, NEG_TOUGHER, NEG_BOSSES, NEG_BOSS_STATS, NEG_REWARD, NEG_SCALE, enemyLevel,
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

// Sets level n up in a ring. The party fights as copies, so nothing in the ring touches them.
export function startNegLevel(n, party, { seed = 1, cx, cy, r, sizeMul } = {}) {
  const { fighters, boss } = negLevelEnemies(n, seed);
  const ours = party.map((c) => sanitizeNeg(JSON.parse(JSON.stringify(c))));
  const bout = new Bout([...ours, ...fighters], { seed, cx, cy, r, sizeMul });
  bout.fighters.forEach((f, i) => { f.team = i < ours.length ? 0 : 1; });
  if (boss) {
    const def = negBossMonster(n);
    const stats = deadlyMonsterStats(def, seed);
    const m = bout.addMonster(def, Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, Math.round(v * NEG_BOSS_STATS * (boss.power ?? 1))])));
    // Everything in the Negative is NEG_SCALE times as big.
    m.maxHp *= NEG_SCALE;
    m.hp = m.maxHp;
    m.atk *= NEG_SCALE;
    m.ringMul = NEG_SCALE;
  }
  const tough = negToughness(n);
  bout.fighters.filter((f) => f.team !== 0).forEach((f) => {
    f.maxHp *= tough;
    f.hp = f.maxHp;
    f.atk *= tough;
  });
  bout.lineUp();
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
