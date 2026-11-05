// Stat limits, the mutation limit, the training guide and Challenges.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  newCreature, computeStats, rawStats, statSources, statLimits, parseCreature, serializeCreature, sanitizeCreature, absorbFile,
  addColor, wildCreature, canAwakenStand, canBecomeSpeedster, canLearnTechnique, mutationsFull, STAT_KEYS, STAT_LIMITS, TRAINING_LIMIT, STAGES,
} from '../src/core/creature.js';
import { statTable, trainingPlan, jobsAhead, unlockNote } from '../src/core/training.js';
import { MAX_MUTATIONS, MUTATION_IDS, MUTATIONS } from '../src/data/mutations.js';
import { STAT_GUIDE, BUILD_IDEAS } from '../src/data/guide.js';
import { FOODS } from '../src/data/foods.js';
import { ABILITIES } from '../src/data/paths.js';
import { ART_FILES } from '../src/data/art-list.js';
import {
  TRAINING_MONSTERS, TRAINING_IDS, DEADLY_MONSTERS, DEADLY_IDS, TRAINING_CHANCE, TROPHY_POINTS, FIGHT_HUNGER, MIN_FULLNESS_TO_FIGHT, DEADLY_ROLL,
} from '../src/data/monsters.js';
import { applyDuelResult } from '../src/sim/puzzles.js';
import { finishBout } from '../src/sim/arena.js';
import {
  startChallenge, settleChallenge, payForFight, fightProblem, trainingFull, oddsOfWinning, wonChallenge, deadlyMonsterStats, trainingMonsterStats,
} from '../src/sim/challenges.js';

// A creature pushed absurdly far in everything at once.
function everything() {
  const c = newCreature('Everything');
  c.growth = 5000;
  STAT_KEYS.forEach((k) => { c.training[k] = 40; });
  Object.keys(c.essence).forEach((k) => { c.essence[k] = 500; });
  c.palette.hues.forEach((h) => { h.n = 100000; });
  return c;
}

// Raises stats through food, in the order given, with far more than any limit in the first ones.
const FOOD_FOR = { might: 'ember', guard: 'bone', speed: 'spark', wits: 'ink', vigor: 'sap' };
function buildInOrder(order) {
  const c = newCreature('Built');
  order.forEach((stat, i) => { c.essence[FOOD_FOR[stat]] = (5 - i) * 100; });
  return c;
}

// ---------- limits ----------

test('nothing can be maxed on every stat: however far it is pushed, the limits hold', () => {
  const c = everything();
  const stats = computeStats(c);
  assert.deepEqual(Object.values(stats).sort((a, b) => b - a), STAT_LIMITS);
  const sum = Object.values(stats).reduce((a, b) => a + b, 0);
  assert.equal(sum, STAT_LIMITS.reduce((a, b) => a + b, 0));
  assert.equal(new Set(STAT_LIMITS).size, STAT_LIMITS.length, 'no two ranks share a limit');
});

test('limits come from rank, so every stat can be the one it is great at', () => {
  for (const stat of STAT_KEYS) {
    const c = everything();
    c.essence[FOOD_FOR[stat]] = 5000; // sanitizing isn't involved here, so this can go past 500
    assert.equal(computeStats(c)[stat], STAT_LIMITS[0], `${stat} can be the best stat`);
  }
});

test('limits never touch a creature that is under them', () => {
  const c = newCreature('Ordinary');
  c.training.vigor = 6;
  c.essence.sap = 8;
  const raw = rawStats(c);
  assert.deepEqual(computeStats(c), raw);
  assert.equal(statLimits(c).vigor, STAT_LIMITS[0]);
});

test('passing another stat takes its place: the old best falls back to the next limit', () => {
  const c = newCreature('Shifting');
  c.essence.ember = 400; // Might, way past 60
  c.essence.spark = 240; // Speed, past 45
  assert.equal(computeStats(c).might, STAT_LIMITS[0]);
  assert.equal(computeStats(c).speed, STAT_LIMITS[1]);
  c.essence.spark = 600;
  assert.equal(computeStats(c).speed, STAT_LIMITS[0]);
  assert.equal(computeStats(c).might, STAT_LIMITS[1]);
});

test('a hostile file gets the same limits', () => {
  const evil = sanitizeCreature({
    format: 'creature/1',
    name: 'Cheat',
    growth: 1e9,
    training: { might: 1e9, guard: 1e9, speed: 1e9, wits: 1e9, vigor: 1e9 },
    essence: { bone: 1e9, sap: 1e9, spark: 1e9, ink: 1e9, ember: 1e9, goo: 1e9 },
    palette: { hues: Array.from({ length: 12 }, () => ({ r: 1, g: 1, b: 1, n: 1e12 })) },
    stats: { might: 99, guard: 99, speed: 99, wits: 99, vigor: 99 },
  });
  assert.deepEqual(Object.values(computeStats(evil)).sort((a, b) => b - a), STAT_LIMITS);
});

test('a Stand and a speedster both take a place in its top three', () => {
  // Four stats pushed well past 20: only three of them can actually be 20 or more.
  const c = newCreature('Spread');
  ['might', 'vigor', 'guard', 'wits'].forEach((stat, i) => { c.essence[FOOD_FOR[stat]] = 400 - i * 10; });
  const stats = computeStats(c);
  assert.ok(STAT_LIMITS[3] < 20, 'the fourth limit stops short of what the powers need');
  assert.ok(stats.wits < 20);
  assert.equal(canAwakenStand(c), false, 'Wits came fourth, so no Stand');
  c.essence.ink = 500;
  assert.equal(canAwakenStand(c), true, 'moving Wits up opens it');
});

test('Liamsaurus-style stats come through untouched', () => {
  const c = newCreature('Today');
  c.growth = STAGES[3].at;
  c.training.vigor = 31;
  const raw = rawStats(c);
  assert.deepEqual(computeStats(c), raw, 'nothing near a limit yet');
});

// ---------- mutation limit ----------

test('a creature stops mutating at the limit, however much it eats', () => {
  const c = newCreature('Hungry');
  let n = 0;
  let sawNoRoom = false;
  for (const fam of Object.keys(FOODS)) {
    for (let i = 0; i < 12; i++) {
      n++;
      const res = absorbFile(c, { ext: fam, name: `f${n}`, sha: `${n.toString(16).padStart(8, '0')}cafe`, size: 32 * 1024, snippet: '' });
      assert.ok(c.mutations.length <= MAX_MUTATIONS);
      if (res.noRoom) {
        sawNoRoom = true;
        assert.equal(res.mutation, null, 'nothing grows once it is full');
      }
    }
  }
  assert.equal(c.mutations.length, MAX_MUTATIONS);
  assert.ok(mutationsFull(c));
  assert.ok(sawNoRoom);
  assert.ok(MAX_MUTATIONS < MUTATION_IDS.length, 'it can never have them all');
});

test('a file can\'t hold more mutations than the limit', () => {
  const evil = sanitizeCreature({ format: 'creature/1', name: 'Many', mutations: MUTATION_IDS.map((id) => ({ id })) });
  assert.equal(evil.mutations.length, MAX_MUTATIONS);
  const back = parseCreature(serializeCreature(evil));
  assert.equal(back.mutations.length, MAX_MUTATIONS);
});

test('wild rivals fit under the mutation limit', () => {
  for (let seed = 0; seed < 50; seed++) assert.ok(wildCreature(seed, 3).mutations.length <= MAX_MUTATIONS);
});

// ---------- the guide tells the truth ----------

test('the guide\'s table of sources adds up to the real stats', () => {
  for (let seed = 0; seed < 40; seed++) {
    const c = wildCreature(seed, 1 + (seed % 3));
    const sources = statSources(c);
    const raw = rawStats(c);
    for (const k of STAT_KEYS) {
      assert.equal(Object.values(sources).reduce((sum, table) => sum + table[k], 0), raw[k], k);
    }
  }
});

test('every food, color and monster the guide names really raises that stat', () => {
  for (const stat of STAT_KEYS) {
    const guide = STAT_GUIDE[stat];
    assert.equal(FOODS[guide.food].stat, stat, `${stat} food`);
    assert.equal(TRAINING_MONSTERS[guide.monster].stat, stat, `${stat} monster`);
    const c = newCreature('Sample');
    const before = rawStats(c);
    addColor(c, ...guide.sample, 900);
    const after = rawStats(c);
    assert.ok(after[stat] > before[stat], `${stat}: mining the sample color raises it`);
    STAT_KEYS.filter((k) => k !== stat).forEach((k) => assert.equal(after[k], before[k], `${stat}: mining it leaves ${k} alone`));
  }
});

test('what the guide says about puzzle duels matches the code', () => {
  const beaten = newCreature('Beaten');
  applyDuelResult(beaten, true, 'four'); // you won, so it lost
  assert.ok(beaten.training.wits > 0, 'beating it at puzzles trains its Wits');
  assert.equal(beaten.training.might, 0);
  const winner = newCreature('Winner');
  applyDuelResult(winner, false, 'four'); // it won
  assert.ok(winner.training.might > 0, 'it beating you trains its Might');
  assert.equal(winner.training.wits, 0);
  assert.ok(STAT_GUIDE.wits.work.toLowerCase().includes('beat it'));
  assert.ok(STAT_GUIDE.might.work.toLowerCase().includes('let it beat you'));
});

test('the plan for a stat reads properly, for creatures at every point', () => {
  const creatures = [newCreature('New'), wildCreature(1, 1), wildCreature(2, 2), wildCreature(3, 3), everything()];
  for (const c of creatures) {
    for (const stat of STAT_KEYS) {
      const plan = trainingPlan(c, stat);
      assert.ok(plan.length >= 5, `${stat} has real options`);
      for (const row of plan) {
        const text = `${row.title} ${row.detail}`;
        assert.ok(!/undefined|NaN|null|\[object/.test(text), text);
      }
    }
    const table = statTable(c);
    assert.equal(table.length, 5);
    table.forEach((row, i) => assert.equal(row.limit >= STAT_LIMITS[i], true));
  }
});

test('the plan only offers jobs it can still reach', () => {
  const c = newCreature('Rancher');
  c.path.line = ['farmer', 'rancher'];
  assert.deepEqual(jobsAhead(c).sort(), ['beastmaster', 'swarm']);
  const planned = trainingPlan(c, 'speed').find((r) => r.title === 'Jobs ahead');
  assert.ok(planned.detail.includes('Swarm Keeper'));
  assert.ok(!planned.detail.includes('Tunnel Wraith'), 'not on its path');
  c.path.line = ['farmer', 'rancher', 'swarm'];
  assert.deepEqual(jobsAhead(c), []);
  assert.equal(trainingPlan(c, 'speed').find((r) => r.title === 'Jobs ahead'), undefined);
});

test('the plan shows when a route has run out', () => {
  const c = newCreature('Full');
  c.training.guard = TRAINING_LIMIT;
  const monster = trainingPlan(c, 'guard').find((r) => r.title.startsWith('Beat the'));
  assert.ok(monster.done);
  for (let i = 0; i < MAX_MUTATIONS; i++) c.mutations.push({ id: MUTATION_IDS[i], from: '', at: 0 });
  assert.ok(trainingPlan(c, 'guard').find((r) => r.title.startsWith('Mutations')).done);
  assert.ok(unlockNote(newCreature('X'), 'wits').includes('20'));
  assert.equal(unlockNote(newCreature('X'), 'guard'), null);
});

test('every build idea can really do what it claims', () => {
  for (const idea of BUILD_IDEAS) {
    const c = buildInOrder(idea.order);
    const ranked = statTable(c).map((row) => row.stat);
    assert.deepEqual(ranked, idea.order, `${idea.name} ranks as described`);
    assert.equal(canAwakenStand(c), idea.stand, `${idea.name} and a Stand`);
    assert.equal(canBecomeSpeedster(c), idea.speedster, `${idea.name} and a speedster`);
    assert.equal(canLearnTechnique(c), idea.technique, `${idea.name} and a cursed technique`);
  }
});

// ---------- challenges ----------

test('every monster is wired up, and every stat has trophies to win', () => {
  const files = ART_FILES.map((a) => a.file);
  for (const id of [...TRAINING_IDS, ...DEADLY_IDS]) {
    const m = TRAINING_MONSTERS[id] ?? DEADLY_MONSTERS[id];
    assert.equal(m.id, id);
    assert.ok(files.includes(`monsters/${id}.png`), `${id} is on the art list`);
    assert.ok(fs.existsSync(`art/monsters/${id}.png`), `${id} picture exists`);
    m.moves.forEach((move) => assert.ok(ABILITIES[move], `${id} move ${move}`));
  }
  STAT_KEYS.forEach((stat) => {
    assert.ok(DEADLY_IDS.some((id) => DEADLY_MONSTERS[id].trophy === stat), `a trophy for ${stat}`);
    assert.ok(TRAINING_IDS.some((id) => TRAINING_MONSTERS[id].stat === stat), `a training monster for ${stat}`);
  });
  assert.ok(new Set([...TRAINING_IDS, ...DEADLY_IDS]).size === TRAINING_IDS.length + DEADLY_IDS.length, 'no id is both');
});

test('a training monster can\'t kill it, and only sometimes teaches it anything', () => {
  const c = newCreature('Student');
  const lost = settleChallenge(c, 'crab', false, 0);
  assert.equal(lost.died, false);
  assert.equal(c.dead, null);
  assert.equal(c.training.guard, 0, 'losing teaches nothing');
  assert.equal(c.record.monstersLost, 1);

  const unlucky = settleChallenge(c, 'crab', true, TRAINING_CHANCE);
  assert.equal(unlucky.trained, null);
  assert.equal(c.training.guard, 0, 'a win without the luck teaches nothing');
  assert.equal(c.record.monstersBeaten, 1);

  const lucky = settleChallenge(c, 'crab', true, TRAINING_CHANCE - 0.001);
  assert.equal(lucky.trained, 'guard');
  assert.equal(c.training.guard, 1);
  assert.equal(computeStats(c).guard, computeStats(newCreature('Base')).guard + 1);
  assert.equal(c.dead, null);
});

test('training stops at its limit', () => {
  const c = newCreature('Full');
  c.training.speed = TRAINING_LIMIT - 0.5;
  assert.equal(trainingFull(c, 'speed'), false);
  settleChallenge(c, 'hare', true, 0);
  assert.equal(c.training.speed, TRAINING_LIMIT, 'it stops exactly at the limit');
  assert.ok(trainingFull(c, 'speed'));
  assert.equal(settleChallenge(c, 'hare', true, 0).trained, null);
  assert.equal(c.training.speed, TRAINING_LIMIT);
});

test('losing a deadly fight kills it forever', () => {
  const c = wildCreature(5, 2);
  const before = serializeCreature(c);
  const result = settleChallenge(c, 'dragon', false, 0, 12345);
  assert.equal(result.died, true);
  assert.deepEqual(c.dead, { at: 12345, by: 'The Last Dragon' });
  const back = parseCreature(serializeCreature(c));
  assert.deepEqual(back.dead, { at: 12345, by: 'The Last Dragon' }, 'it is still dead after a save and load');
  assert.equal(fightProblem(back, 'rat'), 'it is dead');
  assert.equal(parseCreature(before).dead, null, 'a copy from before it died is unaffected');
  // A file that still says it died comes back dead, even with the details missing.
  assert.ok(sanitizeCreature({ format: 'creature/1', name: 'Ghost', dead: true }).dead);
  assert.equal(sanitizeCreature({ format: 'creature/1', name: 'Fine' }).dead, null);
});

test('beating a deadly monster is the only way past a limit, and each one only pays once', () => {
  const c = everything();
  const beforeStats = computeStats(c);
  const beforeLimits = statLimits(c);
  const res = settleChallenge(c, 'rat', true, 1);
  assert.equal(res.trophy, 'speed');
  assert.deepEqual(c.trophies, ['rat']);
  assert.equal(statLimits(c).speed, beforeLimits.speed + TROPHY_POINTS);
  assert.equal(computeStats(c).speed, beforeStats.speed + TROPHY_POINTS, 'it can now go further');
  settleChallenge(c, 'rat', true, 1);
  assert.deepEqual(c.trophies, ['rat'], 'the same monster gives nothing twice');
  assert.equal(fightProblem(c, 'rat'), 'it already beat this one');
  // Even with every trophy, nothing gets close to maxed everywhere.
  DEADLY_IDS.forEach((id) => settleChallenge(c, id, true, 1));
  const top = STAT_LIMITS[0] + TROPHY_POINTS * 2;
  Object.values(computeStats(c)).forEach((v) => assert.ok(v <= top));
  assert.ok(Object.values(computeStats(c)).sort((a, b) => a - b)[0] < 25, 'its worst stat is still its worst');
});

test('trophies in a file have to be real', () => {
  const evil = sanitizeCreature({ format: 'creature/1', name: 'Fake', trophies: ['rat', 'rat', '__proto__', 'constructor', 5, null, 'crab', 'dragon'] });
  assert.deepEqual(evil.trophies, ['rat', 'dragon'], 'real deadly monsters only, once each');
  assert.deepEqual(sanitizeCreature({ format: 'creature/1', name: 'None', trophies: 'all' }).trophies, []);
});

test('fights need a full enough stomach and burn fullness either way', () => {
  const c = newCreature('Empty');
  c.fullness = MIN_FULLNESS_TO_FIGHT - 1;
  assert.equal(fightProblem(c, 'crab'), 'too hungry to fight');
  c.fullness = 50;
  assert.equal(fightProblem(c, 'crab'), null);
  payForFight(c, 'crab');
  assert.equal(c.fullness, 50 - FIGHT_HUNGER.training);
  payForFight(c, 'dragon');
  assert.equal(c.fullness, 50 - FIGHT_HUNGER.training - FIGHT_HUNGER.deadly);
});

test('a fight uses a copy: nothing happens to the real creature until it is settled', () => {
  const c = wildCreature(9, 3);
  c.powers = { stand: 'theworld', speedster: true, quirks: ['hardening'] };
  const before = serializeCreature(c);
  const bout = finishBout(startChallenge(c, 'squid', { seed: 3, r: 200 }));
  assert.ok(bout.done);
  assert.equal(serializeCreature(c), before);
  assert.notEqual(bout.fighters[0].c, c);
});

test('challenge fights always end with a winner, and it is never a summon', () => {
  let seed = 1;
  for (const id of [...TRAINING_IDS, ...DEADLY_IDS]) {
    for (const level of [1, 2, 3]) {
      seed++;
      const bout = finishBout(startChallenge(wildCreature(seed, level), id, { seed, r: 200 }));
      assert.ok(bout.done, `${id} finished`);
      assert.ok(bout.t <= 151, `${id} took ${bout.t}`);
      assert.ok(bout.winner, `${id} has a winner`);
      assert.equal(bout.winner.minion, null);
      assert.ok(bout.winner.c || bout.winner.monster);
    }
  }
});

test('a monster\'s Stand-free moves work, and a Stand can still rush it', () => {
  const c = wildCreature(4, 3);
  c.powers = { stand: 'starplatinum', speedster: false, quirks: [] };
  const bout = startChallenge(c, 'scorpion', { seed: 5, r: 200 });
  const [me, monster] = bout.fighters;
  assert.equal(monster.monster.id, 'scorpion');
  assert.equal(monster.team, 1);
  assert.ok(me.x < monster.x, 'they line up across the ring');
  assert.ok(Math.abs(me.stand.x - me.x) < me.size * 3, 'its Stand came with it');
  finishBout(bout);
  assert.ok(bout.done);
});

test('deadly monsters vary from one to the next, within limits, and the same seed repeats', () => {
  const def = DEADLY_MONSTERS.rex;
  const seen = new Set();
  for (let seed = 1; seed < 80; seed++) {
    const s = deadlyMonsterStats(def, seed * 7919);
    assert.deepEqual(deadlyMonsterStats(def, seed * 7919), s);
    seen.add(s.might);
    assert.ok(s.might >= Math.floor(def.stats.might * DEADLY_ROLL.low) && s.might <= Math.ceil(def.stats.might * DEADLY_ROLL.high));
  }
  assert.ok(seen.size > 8, 'they really do differ');
});

test('training monsters size themselves to it, leading with their own stat', () => {
  const c = wildCreature(2, 3);
  const s = computeStats(c);
  const crab = trainingMonsterStats(c, TRAINING_MONSTERS.crab);
  assert.ok(crab.guard >= s.guard, 'its specialty is at least as good as yours');
  assert.ok(crab.might < s.might, 'the rest are weaker');
  const small = trainingMonsterStats(newCreature('New'), TRAINING_MONSTERS.crab);
  Object.values(small).forEach((v) => assert.ok(v >= 3));
});

test('the odds it is shown are about right, and the monsters get harder as they go', () => {
  const c = wildCreature(21, 3);
  c.powers = { stand: null, speedster: false, quirks: [] };
  const rat = oddsOfWinning(c, 'rat');
  const dragon = oddsOfWinning(c, 'dragon');
  assert.ok(rat > 0.9, `a grown creature beats a rat: ${rat}`);
  assert.ok(dragon < 0.1, `and not a dragon: ${dragon}`);

  // Compare with real fights it has not seen, using other seeds.
  const mid = oddsOfWinning(c, 'tortoise', 60);
  let wins = 0;
  for (let i = 0; i < 60; i++) {
    if (wonChallenge(finishBout(startChallenge(c, 'tortoise', { seed: 100000 + i * 37, r: 200 })))) wins++;
  }
  assert.ok(Math.abs(mid - wins / 60) < 0.25, `odds said ${mid}, real fights gave ${wins / 60}`);

  // Across many creatures, each monster is at least about as hard as the one before.
  const rate = (id) => {
    let won = 0;
    for (let i = 0; i < 40; i++) {
      const fighter = wildCreature(700 + i, 3);
      fighter.powers = { stand: null, speedster: false, quirks: [] };
      if (wonChallenge(finishBout(startChallenge(fighter, id, { seed: i * 104729 + 1, r: 200 })))) won++;
    }
    return won / 40;
  };
  const rates = DEADLY_IDS.map(rate);
  for (let i = 1; i < rates.length; i++) {
    assert.ok(rates[i] <= rates[i - 1] + 0.2, `${DEADLY_IDS[i]} (${rates[i]}) should not be much easier than ${DEADLY_IDS[i - 1]} (${rates[i - 1]})`);
  }
  assert.ok(rates[0] > rates[rates.length - 1] + 0.5);
});

test('every mutation\'s stats are in the guide\'s plan where they apply', () => {
  const c = newCreature('Open');
  const plan = trainingPlan(c, 'wits').find((r) => r.title.startsWith('Mutations'));
  const best = MUTATION_IDS.filter((id) => MUTATIONS[id].stats.wits).sort((a, b) => MUTATIONS[b].stats.wits - MUTATIONS[a].stats.wits)[0];
  assert.ok(plan.detail.includes(MUTATIONS[best].name));
});
