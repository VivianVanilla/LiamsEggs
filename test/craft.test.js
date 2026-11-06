// Battle plans, the one-of-three power rule and the Legendary mutations, family names, crafting,
// plants that grow mutations, and the sheet that explains all of it.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  newCreature, computeStats, statSources, parseCreature, serializeCreature, sanitizeCreature, absorbFile, addColor, creatureColors, wildCreature,
  canAwakenStand, awakenStand, canBecomeSpeedster, becomeSpeedster, canLearnTechnique, learnTechnique, hasPowerRoom, powersHeld, powerSlots, lineageOf, lastName, fullName,
  abilitiesOf, movesOf, HUE_STAT, TRAINING_LIMIT, STAT_KEYS, eatSnack, pathChoice, STAGES,
} from '../src/core/creature.js';
import {
  canAfford, pay, applyDye, washDye, hueFamily, craftCharm, wearCharm, removeCharm, craftPaint, prepEffects, useUpPrep, emptyBank,
} from '../src/core/craft.js';
import { buildSheet, allMutations, describeMove, moveRange, moveList, statText, perkText } from '../src/core/sheet.js';
import { trainingPlan } from '../src/core/training.js';
import { ABILITIES, PATHS } from '../src/data/paths.js';
import { MUTATION_IDS, MUTATIONS, MAX_MUTATIONS } from '../src/data/mutations.js';
import {
  STANDS, TECHNIQUES, TECHNIQUE_IDS, TECHNIQUE_MIGHT, LEGENDARY, LEGENDARY_ID, MALEVOLENT_ID, LEGENDARY_ONE_IN, BLACK_FLASH,
} from '../src/data/powers.js';
import { BANK_KEYS, PIGMENTS, PIGMENT_IDS, familyOfBin, CHARMS, CHARM_IDS, CHARM_SLOTS, PAINTS, PAINT_IDS, DYE_COST, CROPS, CROP_IDS, WATER_PUSH_MS, WATER_EVERY_MS } from '../src/data/crafting.js';
import { FOODS, FOOD_ORDER, SNACK } from '../src/data/foods.js';
import { STANCES, STANCE_IDS, HURT_PLANS, TARGET_PLANS, HOLD_GUARD, HOLD_PATIENCE, BERSERK_HIT, BERSERK_TAKEN, MID_GAP, THROW } from '../src/data/battle.js';
import { ART_FILES } from '../src/data/art-list.js';
import { Bout, finishBout } from '../src/sim/arena.js';
import { practiceStances } from '../src/sim/practice.js';
import { settleChallenge } from '../src/sim/challenges.js';
import { addField, doJob, nextJob, tickFarm, growMs, setFieldCrop, waterFields, waterReadyIn, eatPlant, TILE } from '../src/sim/farm.js';

// An egg's born-with gifts are random, and some change how a fight goes, so the creatures made
// here have none. traits.test.js tests the gifts themselves.
const plainCreature = (...args) => Object.assign(newCreature(...args), { traits: [] });

const NONE = () => ({ stand: null, speedster: false, technique: null, quirks: [] });

// ---------- behaviour in a fight ----------

// Two tough fighters who can't finish each other, so what is measured is only how the fight goes.
function sparring(myStance, { mySpeed = 0, foeSpeed = 0, seconds = 20, foeStance = 'close' } = {}) {
  const me = plainCreature('Me');
  const foe = plainCreature('Foe');
  me.battle.stance = myStance;
  foe.battle.stance = foeStance;
  me.essence.spark = mySpeed;
  foe.essence.spark = foeSpeed;
  const bout = new Bout([me, foe], { seed: 11, cx: 500, cy: 400, r: 300 });
  const [fme, ffoe] = bout.fighters;
  fme.hp = fme.maxHp = 1e7;
  ffoe.hp = ffoe.maxHp = 1e7;
  let inReach = 0;
  let frames = 0;
  for (let i = 0; i < seconds * 30; i++) {
    bout.tick(1 / 30);
    bout.events.length = 0;
    frames++;
    if (Math.hypot(fme.x - ffoe.x, fme.y - ffoe.y) <= fme.size + ffoe.size + 16) inReach++;
  }
  return { bout, me: fme, foe: ffoe, taken: 1e7 - fme.hp, dealt: 1e7 - ffoe.hp, inReachShare: inReach / frames };
}

test('keeping close stays in reach and trades blows', () => {
  const close = sparring('close');
  assert.ok(close.inReachShare > 0.7, `in reach ${close.inReachShare}`);
  assert.ok(close.taken > 0 && close.dealt > 0);
});

test('mid range keeps its distance from a slower enemy and throws things from there', () => {
  const mid = sparring('mid', { mySpeed: 120 });
  assert.ok(mid.inReachShare < 0.15, `it should rarely be in reach: ${mid.inReachShare}`);
  assert.ok(mid.dealt > 0, 'its thrown shots land');
  const close = sparring('close', { mySpeed: 120 });
  assert.ok(mid.taken < close.taken * 0.4, `taken ${mid.taken} vs ${close.taken}`);
  assert.ok(mid.dealt < close.dealt, 'but it deals less than getting stuck in');
});

test('mid range can\'t escape something faster than it', () => {
  const caught = sparring('mid', { foeSpeed: 120 });
  assert.ok(caught.inReachShare > 0.5, `in reach ${caught.inReachShare}`);
});

test('bouncing rewards a Speed lead and does nothing for a slower fighter', () => {
  const fastBounce = sparring('bounce', { mySpeed: 120 });
  const fastClose = sparring('close', { mySpeed: 120 });
  assert.ok(fastBounce.taken < fastClose.taken * 0.5, `fast: taken ${fastBounce.taken} vs ${fastClose.taken}`);
  assert.ok(fastBounce.dealt > fastClose.dealt * 0.5, 'it still lands plenty');

  const slowBounce = sparring('bounce', { foeSpeed: 120 });
  const slowClose = sparring('close', { foeSpeed: 120 });
  assert.ok(slowBounce.taken > slowClose.taken * 0.6, `slow: taken ${slowBounce.taken} vs ${slowClose.taken}`);
});

test('backing up always stays inside the ring', () => {
  for (const stance of ['mid', 'bounce']) {
    const { me, bout } = sparring(stance, { mySpeed: 200, seconds: 40 });
    assert.ok(Math.hypot(me.x - bout.cx, (me.y - bout.cy) * 1.35) < bout.r * 1.1, `${stance} went outside`);
  }
});

test('holding its ground stands still, takes less, and only walks in if nothing comes', () => {
  const bout = new Bout([plainCreature('A'), plainCreature('B')], { seed: 3, cx: 500, cy: 400, r: 300 });
  const [a, b] = bout.fighters;
  a.plan.stance = 'hold';
  b.plan.stance = 'hold';
  const start = { x: a.x, y: a.y };
  const moved = () => Math.hypot(a.x - start.x, a.y - start.y);
  for (let i = 0; i < 30 * (HOLD_PATIENCE - 0.5); i++) bout.tick(1 / 30);
  assert.ok(moved() < 1, 'it waits');
  assert.equal(a.holding, true);
  for (let i = 0; i < 30 * 2; i++) bout.tick(1 / 30);
  assert.ok(moved() > 5, 'then it gets bored and walks in');

  const hurtBy = (holding) => {
    const fresh = new Bout([plainCreature('A'), plainCreature('B')], { seed: 3 });
    const f = fresh.fighters[0];
    f.holding = holding;
    fresh.hurt(f, 100, null, { silent: true });
    return f.maxHp - f.hp;
  };
  assert.ok(Math.abs(hurtBy(true) / hurtBy(false) - (1 - HOLD_GUARD)) < 1e-9);
});

test('what it does when hurt', () => {
  const bout = new Bout([plainCreature('A'), plainCreature('B')], { seed: 3 });
  const [a] = bout.fighters;
  a.plan.hurt = 'backoff';
  assert.equal(bout.stanceNow(a), 'close');
  a.hp = a.maxHp * 0.2;
  assert.equal(bout.stanceNow(a), 'mid', 'badly hurt, it backs off');

  const taken = (rule, hp) => {
    const fresh = new Bout([plainCreature('A'), plainCreature('B')], { seed: 3 });
    const f = fresh.fighters[0];
    f.plan.hurt = rule;
    f.hp = f.maxHp * hp;
    const before = f.hp;
    fresh.hurt(f, 10, null, { silent: true });
    return before - f.hp;
  };
  assert.ok(Math.abs(taken('berserk', 0.2) / taken('fight', 0.2) - BERSERK_TAKEN) < 1e-9, 'all out takes more');
  assert.ok(Math.abs(taken('berserk', 0.9) / taken('fight', 0.9) - 1) < 1e-9, 'but only once it is hurt');

  const dealt = (rule) => {
    let total = 0;
    for (let seed = 1; seed < 200; seed++) {
      const fresh = new Bout([plainCreature('A'), plainCreature('B')], { seed });
      const [f, foe] = fresh.fighters;
      f.plan.hurt = rule;
      f.crit = 0;
      foe.dodge = 0;
      f.hp = f.maxHp * 0.2;
      const before = foe.hp;
      fresh.strike(f, foe, 1, { sure: true });
      total += before - foe.hp;
    }
    return total;
  };
  assert.ok(Math.abs(dealt('berserk') / dealt('fight') - BERSERK_HIT) < 0.05, 'and hits harder');
});

test('who it goes for', () => {
  const bout = new Bout([plainCreature('Me'), plainCreature('Hurt'), plainCreature('Healthy')], { seed: 3, r: 200 });
  const [me, hurt, healthy] = bout.fighters;
  hurt.hp = hurt.maxHp * 0.2;
  me.plan.target = 'weak';
  assert.equal(bout.chooseTarget(me, [healthy, hurt]), hurt);
  me.plan.target = 'strong';
  assert.equal(bout.chooseTarget(me, [hurt, healthy]), healthy);
});

test('a move switched off is never used, and every stance can finish a fight', () => {
  const c = wildCreature(4, 3);
  c.powers = NONE();
  c.battle.off = abilitiesOf(c);
  const bout = new Bout([c, plainCreature('X')], { seed: 1 });
  assert.equal(bout.fighters[0].abilities.length, 0);
  assert.ok(abilitiesOf(c).length > 0, 'it still knows them');
  for (const stance of STANCE_IDS) {
    for (let seed = 1; seed <= 6; seed++) {
      const a = wildCreature(seed * 3, 3);
      const b = wildCreature(seed * 7, 3);
      a.battle.stance = stance;
      b.battle.stance = stance;
      const done = finishBout(new Bout([a, b], { seed }));
      assert.ok(done.done && done.winner, `${stance} finished`);
      assert.ok(done.t <= 151);
    }
  }
});

test('a battle plan survives saving, and a hostile one is defused', () => {
  const c = plainCreature('Planner');
  c.battle = { stance: 'bounce', hurt: 'berserk', target: 'weak', off: ['zap'] };
  assert.deepEqual(parseCreature(serializeCreature(c)).battle, c.battle);
  const evil = sanitizeCreature({ format: 'creature/1', battle: { stance: '__proto__', hurt: 'constructor', target: 5, off: ['zap', 'zap', '__proto__', 7, 'nothing'] } });
  assert.deepEqual(evil.battle, { stance: 'close', hurt: 'fight', target: 'near', off: ['zap'] });
  assert.equal(sanitizeCreature({ format: 'creature/1' }).battle.stance, 'close', 'old saves keep close');
  STANCE_IDS.forEach((id) => assert.ok(STANCES[id].name && STANCES[id].blurb));
  Object.values(HURT_PLANS).forEach((p) => assert.ok(p.name && p.blurb));
  Object.values(TARGET_PLANS).forEach((p) => assert.ok(p.name && p.blurb));
  assert.ok(MID_GAP > 0 && THROW.dodgeable);
});

test('practice fights use copies and answer for every stance', () => {
  const c = wildCreature(5, 3);
  const before = serializeCreature(c);
  const results = practiceStances(c, 6);
  assert.deepEqual(Object.keys(results), STANCE_IDS);
  Object.values(results).forEach((share) => assert.ok(share >= 0 && share <= 1));
  assert.equal(serializeCreature(c), before, 'the real creature is untouched');
});

test('no stance beats every other for an ordinary creature', () => {
  const rate = (stance) => {
    let wins = 0;
    const rounds = 80;
    for (let seed = 0; seed < rounds; seed++) {
      const me = wildCreature(9000 + seed, 3);
      me.powers = NONE();
      me.battle.stance = stance;
      const rival = wildCreature(40000 + seed, 3);
      rival.powers = NONE();
      rival.battle.stance = 'close';
      if (finishBout(new Bout(seed % 2 ? [rival, me] : [me, rival], { seed: seed + 1 })).winner?.c === me) wins++;
    }
    return wins / rounds;
  };
  for (const stance of STANCE_IDS) {
    const r = rate(stance);
    assert.ok(r > 0.3 && r < 0.75, `${stance} won ${r}`);
  }
});

// ---------- a Stand, a speedster or a cursed technique ----------

// Past the line for all three: Wits, Speed and Might in its top three.
function readyForAll() {
  const c = plainCreature('Ready');
  c.essence.ink = 100;
  c.essence.spark = 90;
  c.essence.ember = 80;
  return c;
}

test('it can only be one of the three', () => {
  for (const first of ['stand', 'speedster', 'technique']) {
    const c = readyForAll();
    assert.ok(canAwakenStand(c) && canBecomeSpeedster(c) && canLearnTechnique(c), 'all three are open to start with');
    assert.equal(powerSlots(c), 1);
    if (first === 'stand') assert.ok(awakenStand(c));
    if (first === 'speedster') assert.ok(becomeSpeedster(c));
    if (first === 'technique') assert.ok(learnTechnique(c));
    assert.equal(powersHeld(c), 1);
    assert.equal(hasPowerRoom(c), false);
    assert.equal(canAwakenStand(c), false, `${first} closes off a Stand`);
    assert.equal(canBecomeSpeedster(c), false, `${first} closes off speedster`);
    assert.equal(canLearnTechnique(c), false, `${first} closes off a technique`);
    assert.equal(awakenStand(c), null);
    assert.equal(becomeSpeedster(c), false);
    assert.equal(learnTechnique(c), false);
    assert.equal(powersHeld(c), 1, 'still just the one');
  }
});

test('a Legendary mutation makes room for exactly one more', () => {
  const c = readyForAll();
  c.legendary = LEGENDARY_ID;
  assert.equal(powerSlots(c), 2);
  assert.ok(learnTechnique(c));
  assert.ok(becomeSpeedster(c));
  assert.equal(powersHeld(c), 2);
  assert.equal(canAwakenStand(c), false, 'two is the limit');
  assert.equal(awakenStand(c), null);
  const back = parseCreature(serializeCreature(c));
  assert.equal(back.legendary, LEGENDARY_ID);
  assert.equal(back.powers.technique, lineageOf(c));
  assert.equal(back.powers.speedster, true);
});

test('a Malevolent Soul holds a Stand and one other, but never the other two together', () => {
  const maker = () => {
    const c = readyForAll();
    c.legendary = MALEVOLENT_ID;
    return c;
  };
  assert.ok(LEGENDARY[MALEVOLENT_ID].apart && !LEGENDARY[LEGENDARY_ID].apart);
  assert.ok(fs.existsSync(`art/legendary/${MALEVOLENT_ID}.png`));

  // A Stand and a speedster.
  const a = maker();
  assert.ok(awakenStand(a));
  assert.ok(becomeSpeedster(a));
  assert.equal(powersHeld(a), 2);
  assert.equal(canLearnTechnique(a), false, 'two is the limit');

  // A Stand and a technique, in either order.
  const b = maker();
  assert.ok(learnTechnique(b));
  assert.equal(canAwakenStand(b), true);
  assert.equal(canBecomeSpeedster(b), false, 'a technique and a speedster are the same category');
  assert.equal(becomeSpeedster(b), false);
  assert.ok(awakenStand(b));
  assert.equal(powersHeld(b), 2);

  // A speedster closes off a technique, and the other way around.
  const d = maker();
  assert.ok(becomeSpeedster(d));
  assert.equal(canLearnTechnique(d), false);
  assert.equal(learnTechnique(d), false);
  assert.equal(canAwakenStand(d), true, 'but it can still awaken a Stand');
  assert.equal(powersHeld(d), 1);

  // Twin Soul has no such rule.
  const e = readyForAll();
  e.legendary = LEGENDARY_ID;
  assert.ok(becomeSpeedster(e));
  assert.ok(learnTechnique(e), 'any two');
  assert.equal(powersHeld(e), 2);

  // A file gets the same rule, and it survives a save.
  const back = parseCreature(serializeCreature(a));
  assert.equal(back.legendary, MALEVOLENT_ID);
  assert.deepEqual([!!back.powers.stand, back.powers.speedster], [true, true]);
  const evil = sanitizeCreature({ format: 'creature/1', legendary: MALEVOLENT_ID, powers: { speedster: true, technique: 'shrine' } });
  assert.equal(evil.powers.speedster, true);
  assert.equal(evil.powers.technique, null, 'a file can\'t hold both of the same category');
  const fine = sanitizeCreature({ format: 'creature/1', legendary: MALEVOLENT_ID, powers: { stand: 'theworld', technique: 'shrine' } });
  assert.equal(powersHeld(fine), 2);

  // Its bonus really counts, and the sheet explains it.
  const plain = plainCreature('Plain');
  const cruel = parseCreature(serializeCreature(plain));
  cruel.legendary = MALEVOLENT_ID;
  assert.equal(computeStats(cruel).might, computeStats(plain).might + LEGENDARY[MALEVOLENT_ID].stats.might);
  assert.ok(buildSheet(cruel)[0].rows[0].detail.includes('Stand'));
});

test('a file can\'t hold more powers than it has places for', () => {
  const all = { stand: 'theworld', speedster: true, technique: 'shrine', quirks: ['engine'] };
  const plain = sanitizeCreature({ format: 'creature/1', powers: all });
  assert.equal(powersHeld(plain), 1);
  assert.deepEqual(plain.powers.quirks, ['engine'], 'Quirks are separate');
  const legend = sanitizeCreature({ format: 'creature/1', powers: all, legendary: LEGENDARY_ID });
  assert.equal(powersHeld(legend), 2);
  const fake = sanitizeCreature({ format: 'creature/1', powers: all, legendary: '__proto__' });
  assert.equal(fake.legendary, null);
  assert.equal(powersHeld(fake), 1);
  assert.equal(sanitizeCreature({ format: 'creature/1', powers: { technique: 'constructor' } }).powers.technique, null);
});

test('a cursed technique takes enough Might, a real choice, and gives its moves and stats', () => {
  const weak = plainCreature('Weak');
  weak.essence.ember = (TECHNIQUE_MIGHT - 4) * 4;
  assert.equal(computeStats(weak).might, TECHNIQUE_MIGHT - 1);
  assert.equal(learnTechnique(weak), false);
  weak.essence.ember += 4;
  const before = computeStats(weak);
  const family = TECHNIQUES[lineageOf(weak)];
  assert.ok(learnTechnique(weak));
  assert.equal(weak.powers.technique, lineageOf(weak));
  Object.entries(family.stats).forEach(([k, v]) => {
    const expected = Math.min(before[k] + v, 60);
    assert.equal(computeStats(weak)[k], expected, k);
  });
  family.moves.forEach((m) => assert.ok(abilitiesOf(weak).includes(m), m));
  assert.ok(movesOf(weak).some((m) => m.from === family.name));
});

test('its last name decides its technique, for good, and nobody picks it', () => {
  const c = plainCreature('Heir');
  assert.equal(fullName(c), `Heir ${lastName(c)}`);
  assert.equal(TECHNIQUES[lineageOf(c)].family, lastName(c));
  const back = parseCreature(serializeCreature(c));
  assert.equal(lastName(back), lastName(c), 'it keeps its name through a save');
  assert.equal(JSON.parse(serializeCreature(c)).lastName, lastName(c), 'and the file says so');

  // Every family turns up, each with its own name and technique.
  const seen = new Set();
  for (let i = 0; i < 400; i++) {
    const x = plainCreature(`N${i}`);
    x.id = `family${i}`;
    seen.add(lineageOf(x));
  }
  assert.equal(seen.size, TECHNIQUE_IDS.length);
  assert.equal(new Set(TECHNIQUE_IDS.map((id) => TECHNIQUES[id].family)).size, TECHNIQUE_IDS.length, 'no two techniques share a family');

  // A file can't claim someone else's technique.
  const claimed = sanitizeCreature({ format: 'creature/1', id: 'abc', name: 'Faker', powers: { technique: 'limitless' } });
  assert.equal(claimed.powers.technique, lineageOf(claimed));
  // Wild rivals follow the same rule.
  for (let seed = 0; seed < 200; seed++) {
    const w = wildCreature(seed, 3);
    if (w.powers.technique) assert.equal(w.powers.technique, lineageOf(w));
  }
});

test('every technique is wired up, and Black Flash really happens', () => {
  const files = ART_FILES.map((a) => a.file);
  for (const id of TECHNIQUE_IDS) {
    TECHNIQUES[id].moves.forEach((move) => assert.ok(ABILITIES[move], `${id} move ${move}`));
    assert.ok(files.includes(`techniques/${id}.png`) && fs.existsSync(`art/techniques/${id}.png`), `${id} art`);
  }
  assert.ok(fs.existsSync(`art/legendary/${LEGENDARY_ID}.png`));

  const c = plainCreature('Sorcerer');
  c.powers.technique = 'ratio';
  let flashes = 0;
  const swings = 2000;
  const bout = new Bout([c, plainCreature('Dummy')], { seed: 9 });
  const [me, foe] = bout.fighters;
  foe.hp = foe.maxHp = 1e9;
  foe.dodge = 0;
  for (let i = 0; i < swings; i++) {
    bout.swing(me, foe);
    bout.events.forEach((e) => { if (e.name === 'BLACK FLASH') flashes++; });
    bout.events.length = 0;
  }
  const share = flashes / swings;
  assert.ok(Math.abs(share - BLACK_FLASH.chance) < 0.03, `flash rate ${share}`);
  const plain = new Bout([plainCreature('Plain'), plainCreature('Dummy')], { seed: 9 });
  plain.swing(plain.fighters[0], plain.fighters[1]);
  assert.ok(!plain.events.some((e) => e.name === 'BLACK FLASH'), 'only technique holders');
});

test('the Legendary mutation is rare, comes from the file, and doesn\'t take a mutation place', () => {
  // Over many creatures that each grow one mutation, about 1 in 25 gets it.
  let found = 0;
  const N = 3000;
  for (let i = 0; i < N; i++) {
    const c = plainCreature('Lucky');
    const hex = (n) => n.toString(16).padStart(8, '0');
    absorbFile(c, { ext: 'ink', name: 'a', sha: `${hex(i * 2654435761 >>> 0)}${hex((i * 40503 + 7) >>> 0)}aa`, size: 32 * 1024, snippet: '' });
    if (c.legendary) {
      found++;
      assert.equal(c.mutations.length, 1, 'it comes on top of the mutation itself');
    }
  }
  const share = found / N;
  assert.ok(share > (1 / LEGENDARY_ONE_IN) * 0.5 && share < (1 / LEGENDARY_ONE_IN) * 1.8, `share ${share}`);

  const c = plainCreature('Twice');
  c.legendary = LEGENDARY_ID;
  for (let i = 0; i < MAX_MUTATIONS + 3; i++) c.mutations.push({ id: MUTATION_IDS[i], from: '', at: 0 });
  c.mutations.length = MAX_MUTATIONS;
  const stats = computeStats(c);
  c.legendary = null;
  const without = computeStats(c);
  assert.ok(STAT_KEYS.every((k) => stats[k] >= without[k]), 'it only ever helps');
  assert.equal(c.mutations.length, MAX_MUTATIONS);
});

test('winning to the death can grow it, and The Last Dragon always does', () => {
  const dragon = plainCreature('Slayer');
  const res = settleChallenge(dragon, 'dragon', true, 0.99);
  assert.equal(res.legendary, LEGENDARY_ID);
  assert.equal(dragon.legendary, LEGENDARY_ID);
  assert.equal(settleChallenge(dragon, 'rex', true, 0).legendary, null, 'only once');

  const lucky = plainCreature('Lucky');
  assert.equal(settleChallenge(lucky, 'rat', true, 0.01).legendary, MALEVOLENT_ID, 'an ordinary kill can only leave a Malevolent Soul');
  assert.equal(settleChallenge(lucky, 'scorpion', true, 0.01).legendary, null, 'and a creature only ever has one soul');
  assert.equal(settleChallenge(lucky, 'dragon', true, 0.01).legendary, null);
  assert.equal(lucky.legendary, MALEVOLENT_ID);
  const unlucky = plainCreature('Unlucky');
  assert.equal(settleChallenge(unlucky, 'rat', true, 0.99).legendary, null);
  const training = plainCreature('Student');
  assert.equal(settleChallenge(training, 'crab', true, 0).legendary, null, 'training monsters never give it');
});

test('wild rivals follow the same rule', () => {
  let any = 0;
  for (let seed = 0; seed < 300; seed++) {
    const c = wildCreature(seed, 3);
    assert.ok(powersHeld(c) <= powerSlots(c), `seed ${seed}`);
    if (powersHeld(c)) any++;
  }
  assert.ok(any > 100 && any < 300, `${any} of 300 had a power`);
});

// ---------- the bank and the workshop ----------

test('color families line up with the stats those colors raise', () => {
  HUE_STAT.forEach((stat, bin) => {
    const family = familyOfBin(bin);
    assert.ok(family, `bin ${bin} belongs to a family`);
    assert.equal(PIGMENTS[family].stat, stat, `bin ${bin}`);
  });
  STAT_KEYS.forEach((stat) => assert.ok(PIGMENT_IDS.some((id) => PIGMENTS[id].stat === stat), stat));
});

test('whatever it mines also lands in the bank to spend', () => {
  const c = plainCreature('Miner');
  addColor(c, 230, 60, 40, 10);
  addColor(c, 40, 90, 230, 7);
  addColor(c, 128, 128, 128, 5);
  assert.equal(c.bank.red, 10);
  assert.equal(c.bank.blue, 7);
  assert.equal(c.bank.dust, 5);
  assert.equal(c.palette.total, 22, 'its palette still counts everything');
  const statsBefore = computeStats(c);
  assert.ok(pay(c, { red: 10, dust: 5 }));
  assert.equal(c.bank.red, 0);
  assert.deepEqual(computeStats(c), statsBefore, 'spending never lowers its stats');
  assert.equal(pay(c, { red: 1 }), false);
  assert.equal(canAfford(c, { blue: 7 }), true);
  assert.equal(canAfford(c, { blue: 8 }), false);
});

test('a save from before the bank gets to spend what it already mined', () => {
  const c = plainCreature('Old');
  addColor(c, 230, 60, 40, 30);
  addColor(c, 128, 128, 128, 12);
  c.record.gems = 3;
  const raw = JSON.parse(serializeCreature(c));
  delete raw.bank;
  const back = sanitizeCreature(raw);
  assert.equal(back.bank.red, 30);
  assert.equal(back.bank.dust, 12);
  assert.equal(back.bank.gems, 3);
  // A save with a bank keeps what is actually in it, even if that is less than it mined.
  c.bank.red = 2;
  assert.equal(parseCreature(serializeCreature(c)).bank.red, 2);
  const evil = sanitizeCreature({ format: 'creature/1', bank: { red: 1e99, blue: -5, dust: 'x', constructor: 9 } });
  assert.deepEqual(Object.keys(evil.bank).sort(), BANK_KEYS.slice().sort());
  assert.ok(evil.bank.red <= 99999);
  assert.equal(evil.bank.blue, 0);
  assert.equal(evil.bank.dust, 0);
});

test('charms cost what they say, are kept, and only two can be worn', () => {
  const c = plainCreature('Crafter');
  assert.equal(craftCharm(c, 'ruby'), false, 'it can\'t afford one');
  c.bank = { ...emptyBank(), red: 200, blue: 200, dust: 300, gems: 5 };
  const before = computeStats(c).might;
  assert.ok(craftCharm(c, 'ruby'));
  assert.equal(c.bank.red, 200 - CHARMS.ruby.cost.red);
  assert.equal(c.bank.gems, 5 - CHARMS.ruby.cost.gems);
  assert.equal(computeStats(c).might, before + CHARMS.ruby.stats.might, 'it goes straight on');
  assert.equal(statSources(c).charms.might, CHARMS.ruby.stats.might);
  assert.equal(craftCharm(c, 'ruby'), false, 'one of each');
  assert.ok(craftCharm(c, 'sapphire'));
  assert.ok(craftCharm(c, 'ash'));
  assert.deepEqual(c.gear.owned, ['ruby', 'sapphire', 'ash']);
  assert.equal(c.gear.worn.length, CHARM_SLOTS, 'the third has no room');
  assert.equal(wearCharm(c, 'ash'), false);
  removeCharm(c, 'ruby');
  assert.equal(computeStats(c).might, before);
  assert.ok(wearCharm(c, 'ash'));
  assert.equal(craftCharm(c, '__proto__'), false);
  const back = parseCreature(serializeCreature(c));
  assert.deepEqual(back.gear, c.gear);
});

test('charms in a file have to be owned, real and within the limit', () => {
  const evil = sanitizeCreature({ format: 'creature/1', gear: { owned: ['ruby', 'ruby', '__proto__', 'citrine', 'emerald'], worn: ['sapphire', 'ruby', 'citrine', 'emerald'] } });
  assert.deepEqual(evil.gear.owned, ['ruby', 'citrine', 'emerald']);
  assert.deepEqual(evil.gear.worn, ['ruby', 'citrine']);
});

test('charms still count against stat limits', () => {
  const c = plainCreature('Capped');
  STAT_KEYS.forEach((k) => { c.training[k] = 40; });
  Object.keys(c.essence).forEach((k) => { c.essence[k] = 500; });
  c.bank = { ...emptyBank(), red: 100, dust: 100, gems: 5 };
  const before = computeStats(c);
  craftCharm(c, 'ruby');
  assert.deepEqual(computeStats(c), before, 'already at its limits, it adds nothing');
  const sheet = buildSheet(c).find((s) => s.title.startsWith('Charms'));
  assert.ok(sheet.rows[0].limited.includes('Might'), 'and the sheet says so');
});

test('a dye costs that color, shows on it, and washes off', () => {
  const c = plainCreature('Dyed');
  const natural = creatureColors(c).body;
  assert.equal(applyDye(c, '#ff0000', 'red'), false, 'it can\'t afford it');
  c.bank.red = DYE_COST;
  assert.equal(applyDye(c, '#ff0000', '__proto__'), false);
  assert.ok(applyDye(c, '#ff0000', 'red'));
  assert.equal(c.bank.red, 0);
  assert.equal(creatureColors(c).body, '#ff0000');
  assert.equal(parseCreature(serializeCreature(c)).look.dye, '#ff0000');
  washDye(c);
  assert.equal(creatureColors(c).body, natural);
  assert.equal(sanitizeCreature({ format: 'creature/1', look: { dye: 'url(evil)' } }).look.dye, null);
  assert.equal(hueFamily([230, 60, 40]), 'red');
  assert.equal(hueFamily([170, 40, 230]), 'purple');
  assert.equal(hueFamily([128, 128, 128]), null, 'greys have no family');
});

test('a paint changes the next fight and then it is gone', () => {
  const c = plainCreature('Painted');
  c.bank = { ...emptyBank(), red: 100, green: 100, blue: 100, dust: 100 };
  const plain = new Bout([parseCreature(serializeCreature(c)), plainCreature('X')], { seed: 1 }).fighters[0];
  assert.ok(craftPaint(c, 'war'));
  assert.equal(craftPaint(c, 'shell'), false, 'one paint at a time');
  assert.equal(c.bank.red, 100 - PAINTS.war.cost.red);
  const painted = new Bout([parseCreature(serializeCreature(c)), plainCreature('X')], { seed: 1 }).fighters[0];
  assert.ok(Math.abs(painted.atk / plain.atk - (1 + PAINTS.war.effect.damage)) < 1e-9);
  useUpPrep(c);
  assert.equal(c.prep.paint, null);
  assert.deepEqual(prepEffects(c), { damage: 0, taken: 0, hp: 0, move: 0, attack: 0, moves: 0, dodge: 0 });

  // Each kind of effect reaches the fighter.
  const effectOf = (prep) => {
    const x = plainCreature('E');
    x.prep = prep;
    return new Bout([x, plainCreature('X')], { seed: 1 }).fighters[0];
  };
  const base = effectOf({ paint: null });
  assert.ok(effectOf({ paint: 'life' }).maxHp > base.maxHp);
  assert.ok(effectOf({ paint: 'shell' }).takenMul < 1);
  assert.ok(effectOf({ paint: 'quick' }).moveSpeed > base.moveSpeed);
  assert.ok(effectOf({ paint: 'quick' }).attackEvery < base.attackEvery);
  assert.ok(effectOf({ paint: 'mind' }).cdMul < base.cdMul);
  assert.ok(effectOf({ paint: 'mind' }).dodge > base.dodge);
  assert.equal(sanitizeCreature({ format: 'creature/1', prep: { paint: '__proto__' } }).prep.paint, null);
  assert.deepEqual(sanitizeCreature({ format: 'creature/1', prep: { paint: 'war', meal: 'skewer' } }).prep, { paint: 'war' }, 'old meals are ignored');
});

test('everything craftable has its picture', () => {
  const files = ART_FILES.map((a) => a.file);
  const wanted = [
    ...CHARM_IDS.map((id) => `crafts/${id}.png`),
    ...CROP_IDS.map((id) => `farm/${id}.png`),
    'fx/bolt.png',
  ];
  for (const file of wanted) {
    assert.ok(files.includes(file), `${file} on the list`);
    assert.ok(fs.existsSync(`art/${file}`), `${file} exists`);
  }
  assert.equal(new Set(files).size, files.length, 'no duplicates');
  PAINT_IDS.forEach((id) => assert.ok(PAINTS[id].text));
});

// ---------- the farm ----------

function farmWith(crop) {
  const c = plainCreature('Grower');
  const field = addField(c, { x: 0, y: 0, w: TILE, h: TILE });
  setFieldCrop(c, field.id, crop);
  doJob(c, nextJob(c, 0, 0), 1000); // till
  doJob(c, nextJob(c, 0, 0), 1000); // plant
  return { c, field, tile: field.tiles[0] };
}

test('a harvest gives farmed food, plus a little for its store, and seeds cost nothing', () => {
  const { c, tile } = farmWith('pepper');
  const bank = { ...c.bank };
  assert.equal(tile.c, 'pepper');
  assert.deepEqual(c.bank, bank, 'seeds are free');
  tickFarm(c, 1000 + growMs(c) - 1);
  assert.equal(tile.s, 2, 'not ripe yet');
  tickFarm(c, 1000 + growMs(c) + 1);
  assert.equal(tile.s, 3);
  doJob(c, nextJob(c, 0, 0), 2000);
  assert.equal(c.larder.pepper, 1);
  assert.equal(c.farm.store, 1, 'it can feed itself from this');
  assert.equal(tile.c, undefined);
});

test('a new field already grows something, and a crop from an older save still pays out', () => {
  const c = plainCreature('Old');
  const field = addField(c, { x: 0, y: 0, w: TILE, h: TILE });
  assert.equal(field.crop, CROP_IDS[0]);
  field.tiles[0] = { s: 3, t: 0 }; // planted before plants had kinds
  doJob(c, nextJob(c, 0, 0), 2000);
  assert.equal(c.farm.store, 1);
  assert.ok(CROP_IDS.every((id) => c.larder[id] === 0));
  const back = sanitizeCreature({ format: 'creature/1', farm: { fields: [{ cols: 1, rows: 1, crop: null, tiles: [{ s: 2, t: 0 }] }] } });
  assert.equal(back.farm.fields[0].crop, CROP_IDS[0]);
});

test('a snack is free, fills it and grows it, and never changes it', () => {
  const c = plainCreature('Snacker');
  c.fullness = 40;
  const stats = computeStats(c);
  const res = eatSnack(c);
  assert.ok(res);
  assert.equal(c.growth, SNACK.growth);
  assert.equal(c.fullness, 40 + SNACK.fullness);
  assert.equal(res.mutation, null);
  assert.deepEqual(computeStats(c), stats, 'this first bit of growth changes no stats');
  for (let i = 0; i < 300; i++) {
    c.fullness = 0;
    eatSnack(c);
  }
  assert.equal(c.mutations.length, 0, 'no amount of snacks mutates it');
  assert.equal(c.legendary, null);
  assert.ok(Object.values(c.essence).every((v) => v === 0), 'and they add no essence');
  assert.equal(c.absorbed.length, 0);
  c.fullness = 95;
  const growth = c.growth;
  assert.equal(eatSnack(c), null, 'too full');
  assert.equal(c.growth, growth);
});

test('snacks alone can get a new creature to its first job', () => {
  const c = plainCreature('Starter');
  let snacks = 0;
  let stageUp = false;
  while (c.growth < STAGES[1].at) {
    c.fullness = 0;
    stageUp = eatSnack(c).stageUp;
    snacks++;
  }
  assert.ok(snacks <= 3, `${snacks} snacks`);
  assert.ok(stageUp, 'and it says so when it grows');
  assert.ok(pathChoice(c), 'it can pick a job');
});

test('every food family has a plant, and every plant has its picture', () => {
  assert.deepEqual(CROP_IDS.map((id) => CROPS[id].family).sort(), FOOD_ORDER.slice().sort());
  CROP_IDS.forEach((id) => {
    assert.ok(CROPS[id].grows);
    assert.equal(FOODS[CROPS[id].family].label, CROPS[id].name, 'one name for each food');
  });
});

test('crops survive a save, and bad ones in a file are ignored', () => {
  const { c } = farmWith('bean');
  const back = parseCreature(serializeCreature(c));
  assert.equal(back.farm.fields[0].crop, 'bean');
  assert.equal(back.farm.fields[0].tiles[0].c, 'bean');
  const evil = sanitizeCreature({ format: 'creature/1', farm: { fields: [{ cols: 1, rows: 1, crop: '__proto__', tiles: [{ s: 2, t: 0, c: 'constructor' }] }] } });
  assert.equal(evil.farm.fields[0].crop, CROP_IDS[0], 'every field grows something');
  assert.equal(evil.farm.fields[0].tiles[0].c, undefined);
  assert.equal(setFieldCrop(c, 999, 'bean'), false);
  assert.equal(setFieldCrop(c, c.farm.fields[0].id, 'nonsense'), false);
  assert.equal(setFieldCrop(c, c.farm.fields[0].id, null), false, 'there is no growing nothing');
});

test('watering pushes crops ahead, and has to wait before the next time', () => {
  const { c, tile } = farmWith('pepper');
  const now = 1_700_000_000_000;
  const t = tile.t;
  assert.equal(waterReadyIn(c, now), 0);
  assert.equal(waterFields(c, now), 1);
  assert.equal(tile.t, t - WATER_PUSH_MS);
  assert.equal(waterReadyIn(c, now), WATER_EVERY_MS);
  assert.equal(waterFields(c, now + 1000), 0, 'too soon');
  assert.equal(tile.t, t - WATER_PUSH_MS);
  assert.equal(waterFields(c, now + WATER_EVERY_MS), 1);
  const empty = plainCreature('Dry');
  assert.equal(waterFields(empty, now), 0, 'nothing to water');
  assert.equal(waterReadyIn(empty, now), 0, 'and it does not use up the wait');
});

test('eating farmed food grows mutations of its family', () => {
  for (const id of CROP_IDS) {
    const { family } = CROPS[id];
    const c = plainCreature('Eater');
    c.larder[id] = 3;
    c.fullness = 0;
    const first = eatPlant(c, id, 1000);
    assert.ok(first, id);
    assert.equal(c.larder[id], 2);
    assert.equal(c.essence[family], 1, 'one plant is one essence');
    assert.equal(first.seen, false);
    assert.ok(c.growth > 0 && c.fullness > 0, 'and it feeds it');
    const second = eatPlant(c, id, 1000);
    assert.equal(second.seen, false, 'two plants are never the same file');
    assert.ok(second.mutation, `${id}: the second plant crosses the first threshold`);
    assert.equal(MUTATIONS[second.mutation.id].family, family);
    assert.equal(c.mutations.length, 1);
  }
});

test('eating plants raises the stat its family raises, and it needs room to eat', () => {
  const c = plainCreature('Picky');
  c.larder.melon = 40;
  const wits = computeStats(c).wits;
  for (let i = 0; i < 20; i++) {
    c.fullness = 0;
    assert.ok(eatPlant(c, 'melon', i));
  }
  assert.ok(computeStats(c).wits > wits);
  c.fullness = 95;
  const left = c.larder.melon;
  assert.equal(eatPlant(c, 'melon', 99), null, 'too full');
  assert.equal(c.larder.melon, left, 'and it keeps the plant');
  c.fullness = 0;
  c.larder.bean = 0;
  assert.equal(eatPlant(c, 'bean', 99), null, 'none left');
  assert.equal(eatPlant(c, '__proto__', 99), null);
  assert.equal(eatPlant(c, 'constructor', 99), null);
});

test('plants respect the mutation limit, and can bring a Legendary mutation', () => {
  const c = plainCreature('Full');
  let legendary = 0;
  for (const id of CROP_IDS) {
    c.larder[id] = 60;
    for (let i = 0; i < 60; i++) {
      c.fullness = 0;
      if (eatPlant(c, id, i * 1000 + id.length)?.legendary) legendary++;
    }
  }
  assert.ok(c.mutations.length <= MAX_MUTATIONS);
  assert.equal(c.mutations.length, MAX_MUTATIONS);
  assert.ok(legendary <= 1, 'only ever one');
});

// ---------- the sheet says what everything does ----------

const clean = (text) => !/undefined|NaN|null|\[object/.test(String(text));

test('every move in the game has a sentence that reads properly', () => {
  for (const [id, def] of Object.entries(ABILITIES)) {
    const line = describeMove(def);
    assert.ok(line.length > 15 && clean(line), `${id}: ${line}`);
    assert.ok(['far', 'near', 'any'].includes(moveRange(def)), id);
  }
  assert.ok(describeMove(ABILITIES.oraora).includes('5 hits'), 'it uses the real numbers');
  assert.ok(describeMove(ABILITIES.zap).includes(`${ABILITIES.zap.cd} seconds`));
});

test('the sheet lists what it has and what each thing does', () => {
  const c = plainCreature('Shown');
  c.growth = 40;
  c.mutations.push({ id: 'mindgem', from: '', at: 0 }, { id: 'bigbrain', from: '', at: 0 });
  c.path.line = ['fighter', 'tactician', 'grandmaster'];
  c.powers.stand = 'theworld';
  c.powers.quirks.push('oneforall');
  c.legendary = LEGENDARY_ID;
  c.powers.technique = 'shrine';
  c.trophies.push('rat');
  c.bank = { ...emptyBank(), dust: 500 };
  craftCharm(c, 'ash');
  craftPaint.call(null, c, 'war');
  const sections = buildSheet(c);
  const titled = (start) => sections.find((s) => s.title.startsWith(start));

  const mutations = titled('Mutations');
  assert.equal(mutations.rows[0].effect, '+2 Wits');
  assert.equal(mutations.rows[1].effect, `+${MUTATIONS.bigbrain.stats.wits} Wits`);
  assert.ok(mutations.rows[0].detail.includes('Hex'), 'and which move it counts toward');

  assert.equal(titled('Its job').rows.length, 3);
  assert.ok(titled('Its job').rows[2].detail.includes('Foresight'));
  const powers = titled('Powers').rows.map((r) => r.name).join();
  assert.ok(powers.includes('The World') && powers.includes('Shrine') && powers.includes('One For All'));
  assert.ok(titled('Powers').note.includes('30%'));
  assert.equal(titled('Legendary').rows[0].name, LEGENDARY[LEGENDARY_ID].name);
  assert.equal(titled('Charms').rows[0].name, CHARMS.ash.name);
  assert.ok(titled('Trophies').rows[0].effect.includes('Speed'));

  for (const section of sections) {
    assert.ok(clean(section.title));
    for (const row of section.rows) assert.ok(clean(`${row.name} ${row.effect} ${row.detail} ${row.limited}`), row.name);
  }
  assert.ok(sections[0].title.startsWith('Legendary'), 'the big news comes first');
  assert.ok(STANDS.theworld.moves.every((m) => titled('Powers').rows[0].detail.includes(ABILITIES[m].name)));

  // Some eggs hatch with a gift, which gets its own section, so this one is made giftless.
  const plain = plainCreature('Empty');
  plain.traits = [];
  const none = buildSheet(plain);
  assert.deepEqual(none.map((s) => s.title).sort(), ['Gifts it can still earn', 'Its race does', 'Mutations (0 of 8)'].sort(),
    'an empty creature has its mutations, what being Human does, and the gifts it can still earn');
  assert.ok(none.find((s) => s.title.startsWith('Mutations')).empty);
});

test('the sheet says when a limit means something adds nothing', () => {
  const c = plainCreature('Limited');
  STAT_KEYS.forEach((k) => { c.training[k] = 40; });
  Object.keys(c.essence).forEach((k) => { c.essence[k] = 500; });
  c.mutations.push({ id: 'claws', from: '', at: 0 });
  const row = buildSheet(c).find((s) => s.title.startsWith('Mutations')).rows[0];
  assert.ok(row.limited.includes('Might'));
  const free = plainCreature('Free');
  free.mutations.push({ id: 'claws', from: '', at: 0 });
  assert.equal(buildSheet(free)[0].rows[0].limited, '');
});

test('the full mutation list covers every mutation, once, with its effect', () => {
  const c = plainCreature('Curious');
  c.mutations.push({ id: 'horns', from: '', at: 0 });
  const families = allMutations(c);
  const rows = families.flatMap((f) => f.rows);
  assert.equal(rows.length, MUTATION_IDS.length);
  assert.equal(new Set(rows.map((r) => r.id)).size, MUTATION_IDS.length);
  assert.ok(rows.find((r) => r.id === 'horns').owned);
  assert.ok(!rows.find((r) => r.id === 'claws').owned);
  rows.forEach((r) => assert.ok(r.effect.length > 0 && clean(r.effect), r.id));
  families.forEach((f) => assert.ok(clean(f.move)));
});

test('the moves list shows which are on, and where each came from', () => {
  const c = plainCreature('Mover');
  c.mutations.push({ id: 'horns', from: '', at: 0 }, { id: 'plates', from: '', at: 0 });
  c.powers.stand = 'hierophant';
  const moves = moveList(c);
  assert.deepEqual(moves.map((m) => m.id), ['bonewall', 'emerald']);
  assert.ok(moves[0].from.includes('Stone Bean'));
  assert.equal(moves[1].from, 'Hierophant Green');
  assert.ok(moves.every((m) => m.on));
  c.battle.off.push('emerald');
  assert.equal(moveList(c)[1].on, false);
});

test('perks read properly on every job', () => {
  for (const [id, node] of Object.entries(PATHS)) {
    const text = perkText(node.perk);
    assert.ok(clean(text), id);
    if (Object.keys(node.perk ?? {}).length) assert.ok(text.length > 0, `${id} has words for its perks`);
  }
  assert.equal(statText({ might: 2, speed: -1, wits: 0 }), '+2 Might, -1 Speed');
  assert.equal(statText({ might: 1, guard: 1, speed: 1, wits: 1, vigor: 1 }), '+1 to every stat');
});

test('the training plan includes plants and crafting, and still reads properly', () => {
  for (const stat of STAT_KEYS) {
    const plan = trainingPlan(plainCreature('Plan'), stat);
    assert.ok(plan.some((r) => r.title === 'Wear a charm'), stat);
    const plant = CROPS[CROP_IDS.find((id) => FOODS[CROPS[id].family].stat === stat)];
    assert.ok(plan.some((r) => r.title === `Feed it ${plant.name}`), stat);
    plan.forEach((r) => assert.ok(clean(`${r.title} ${r.detail}`), r.title));
  }
});
