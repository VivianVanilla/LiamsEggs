// Races, Devil Fruits, rolling eggs, the village, expeditions, raids and waves.

import test from 'node:test';
import assert from 'node:assert/strict';

import { makeRng } from '../src/lib/util.js';
import {
  newCreature, parseCreature, serializeCreature, computeStats, abilitiesOf, wildCreature, raceSize, raceName, eatFruit, fruitProblem,
  canAwakenStand, canBecomeSpeedster, canLearnTechnique, powersHeld, choosePath, STAGES,
} from '../src/core/creature.js';
import { emptyHouse, sanitizeHouse, joinHouse, withoutHouse } from '../src/core/house.js';
import {
  workOf, villageOutput, runVillage, hoursDue, expeditionProblem, startExpedition, expeditionHaul, finishExpeditions, takeFound, awayBases,
  villageDefense, winChance, setHostile, incomingRaid, raidVillage, raidProblem, raidDue, putOffRaids,
} from '../src/core/village.js';
import { defenders, waveEnemies, startWave, waveHeld, waveReward, waveToughness } from '../src/core/waves.js';
import { eggFromId, rollEgg, matches, matchChance, hyperRoll, hatchEgg } from '../src/core/roll.js';
import { breed, racesFor } from '../src/core/family.js';
import { nextStep } from '../src/core/advice.js';
import { breedingGuide } from '../src/core/breedguide.js';
import { chanceSections } from '../src/core/odds.js';
import { doJob, addField } from '../src/sim/farm.js';
import { finishBout } from '../src/sim/arena.js';
import { RACES, RACE_IDS, babyRaces, RACE_MOVES } from '../src/data/races.js';
import { FRUITS, FRUIT_IDS, FRUIT_VIGOR, FRUIT_MOVES, FRUIT_FROM_EXPEDITION } from '../src/data/fruits.js';
import { ABILITIES } from '../src/data/paths.js';
import { EXPEDITIONS, EXPEDITION_IDS, PARTY_MAX, EXPEDITIONS_AT_ONCE, VILLAGE_WORK, MAX_CARE_BOOST, HOSTILE_VILLAGES, WAVE_FROM_VILLAGE } from '../src/data/village.js';
import { TRAIT_ODDS, TECHNIQUE_IDS } from '../src/data/powers.js';
import { BREED_STAGE } from '../src/data/family.js';

const clean = (s) => !/undefined|NaN|null|\[object/.test(s);
const HOUR = 3600 * 1000;
const NOW = 1_800_000_000_000;

function grown(name, extra = {}) {
  const c = newCreature(name, NOW - HOUR);
  c.growth = STAGES[3].at;
  c.fullness = 90;
  c.traits = [];
  return Object.assign(c, extra);
}

// ---------- races ----------

test('every race is wired up: its stats, its move, and its size', () => {
  RACE_IDS.forEach((id) => {
    const r = RACES[id];
    assert.ok(r.name && clean(r.blurb), id);
    if (r.move) assert.ok(ABILITIES[r.move] && RACE_MOVES[r.move], `${id} move`);
  });
  const giant = grown('Big', { race: 'giant' });
  const human = grown('Plain');
  assert.equal(raceSize(giant), RACES.giant.size);
  assert.ok(computeStats(giant).might > computeStats(human).might);
  assert.ok(abilitiesOf(giant).includes('giantstomp'));
  assert.equal(raceName(human), 'Human');
  const back = parseCreature(serializeCreature(giant));
  assert.equal(back.race, 'giant');
  const raw = JSON.parse(serializeCreature(giant));
  raw.race = 'dragonborn';
  assert.equal(parseCreature(JSON.stringify(raw)).race, 'human', 'unknown races fall back to Human');
});

test('a Devil with anything else always makes a Half-devil; other pairs pick a parent', () => {
  assert.deepEqual(babyRaces('devil', 'human'), ['halfdevil']);
  assert.deepEqual(babyRaces('mink', 'devil'), ['halfdevil']);
  assert.deepEqual(babyRaces('devil', 'devil'), ['devil']);
  assert.deepEqual(babyRaces('giant', 'mink'), ['giant', 'mink']);
  const a = grown('Dad', { race: 'devil' });
  const b = grown('Mom');
  assert.deepEqual(racesFor(a, b), ['halfdevil']);
  const { baby } = breed(a, b, { family: 'a', look: 'a', style: 'a', race: 'devil', gifts: [] }, 'Hybrid', NOW);
  assert.equal(baby.race, 'halfdevil', 'a choice outside the rules is ignored');
  const c = grown('Fish', { race: 'fishman' });
  const d = grown('Fur', { race: 'mink' });
  assert.equal(breed(c, d, { family: 'a', look: 'a', style: 'a', race: 'mink', gifts: [] }, 'Mix', NOW).baby.race, 'mink');
});

test('seasoned wild rivals are sometimes another race, the same for a seed', () => {
  let others = 0;
  for (let seed = 0; seed < 400; seed++) {
    const a = wildCreature(seed, 3);
    assert.equal(a.race, wildCreature(seed, 3).race);
    if (a.race !== 'human') others += 1;
    assert.equal(wildCreature(seed, 1).race, 'human');
  }
  assert.ok(others > 30 && others < 120, `${others} of 400`);
});

// ---------- Devil Fruits ----------

test('a Devil Fruit needs Vigor and no other power, and then nothing else fits', () => {
  const c = grown('Eater');
  assert.match(fruitProblem(c), new RegExp(`${FRUIT_VIGOR} Vigor`));
  c.training.vigor = 40;
  c.essence.sap = 120;
  assert.equal(fruitProblem(c), null);
  assert.ok(eatFruit(c, 'mera'));
  assert.equal(powersHeld(c), 1);
  FRUITS.mera.moves.forEach((id) => assert.ok(abilitiesOf(c).includes(id)));
  // Even maxed out, it can't add a Stand, speed or technique, Legendary mutation or not.
  c.training.wits = 40;
  c.training.speed = 40;
  c.training.might = 40;
  c.legendary = 'twinsoul';
  assert.ok(!canAwakenStand(c) && !canBecomeSpeedster(c) && !canLearnTechnique(c));
  assert.equal(eatFruit(c, 'gomu'), false, 'one fruit only');
  // And something with a power already can't eat one.
  const stand = grown('Stander');
  stand.training.vigor = 40;
  stand.essence.sap = 120;
  stand.powers.stand = 'theworld';
  assert.match(fruitProblem(stand), /already has a power/);
  // Saved files hold it, and a file can't claim a fruit on top of another power.
  assert.equal(parseCreature(serializeCreature(c)).powers.fruit, 'mera');
  const raw = JSON.parse(serializeCreature(stand));
  raw.powers.fruit = 'gura';
  assert.equal(parseCreature(JSON.stringify(raw)).powers.fruit, null);
  FRUIT_IDS.forEach((id) => FRUITS[id].moves.forEach((m) => assert.ok(ABILITIES[m] && FRUIT_MOVES[m], `${id} ${m}`)));
});

test('a harvest can turn up a Devil Fruit, into the shared pool', () => {
  const house = emptyHouse();
  const farmer = joinHouse(house, grown('Grower'));
  choosePath(farmer, 'farmer');
  const field = addField(farmer, { x: 0, y: 0, w: 60, h: 30 });
  field.tiles[0].s = 3;
  field.tiles[0].c = 'pepper';
  const res = doJob(farmer, { kind: 'harvest', field: field.id, tile: 0 }, NOW, () => 0);
  assert.ok(FRUIT_IDS.includes(res.fruit));
  assert.equal(house.fruits[res.fruit], 1);
  field.tiles[1].s = 3;
  assert.equal(doJob(farmer, { kind: 'harvest', field: field.id, tile: 1 }, NOW, () => 0.99).fruit, null);
  // Fruits travel with the pool, never in a creature's own file.
  assert.deepEqual(JSON.parse(serializeCreature(withoutHouse(farmer))).fruits, {});
  assert.equal(sanitizeHouse(JSON.parse(JSON.stringify(house))).fruits[res.fruit], 1);
});

// ---------- rolling eggs ----------

test('an egg is its id: the same id always hatches the same family and gifts', () => {
  for (let i = 0; i < 50; i++) {
    const egg = rollEgg();
    assert.deepEqual(eggFromId(egg.id), egg);
    const c = hatchEgg(egg, 'Hatched', NOW);
    assert.deepEqual([c.id, c.lineage, c.otherLine, c.traits], [egg.id, egg.lineage, egg.otherLine, egg.traits]);
    const back = parseCreature(serializeCreature(c));
    assert.deepEqual([back.lineage, back.traits], [egg.lineage, egg.traits]);
  }
});

test('the roll odds shown are the real ones, and gifts are spread evenly over families', () => {
  const rng = makeRng(42);
  const want = { traits: ['sixeyes'], family: null };
  assert.equal(1 / matchChance(want), TRAIT_ODDS.sixeyes * TECHNIQUE_IDS.length);
  assert.equal(matchChance({ traits: ['sixeyes'], family: 'shrine' }), 0);
  let hits = 0;
  const both = { traits: ['sharingan', 'cursedbody'], family: null };
  let bothHits = 0;
  const N = 60000;
  for (let i = 0; i < N; i++) {
    const egg = rollEgg(rng);
    if (matches(egg, want)) hits += 1;
    if (matches(egg, both)) bothHits += 1;
  }
  assert.ok(Math.abs(hits / N - matchChance(want)) < 0.006, `six eyes ${hits}`);
  assert.ok(Math.abs(bothHits / N - matchChance(both)) < 0.003 && bothHits > 0, `sharingan and cursed body ${bothHits}`);
});

test('hyper roll stops as soon as it lands one, and never spends past its budget', () => {
  const res = hyperRoll({ traits: [], family: 'limitless' }, 100, makeRng(7));
  assert.ok(res.found && res.egg.lineage === 'limitless' && res.rolls >= 1 && res.rolls <= 100);
  const none = hyperRoll({ traits: ['sixeyes', 'sharingan', 'cursedbody'], family: null }, 5, makeRng(8));
  assert.ok(!none.found || none.rolls <= 5);
  assert.ok(none.rolls <= 5);
});

// ---------- the village ----------

test('villagers work by their job, and nurses make everyone work harder, up to a point', () => {
  const miner = grown('Digger');
  choosePath(miner, 'miner');
  const farmer = grown('Planter');
  choosePath(farmer, 'farmer');
  const nurses = [1, 2, 3, 4].map((i) => {
    const n = grown(`Nurse ${i}`);
    choosePath(n, 'nurse');
    return n;
  });
  assert.equal(workOf(miner).colors, VILLAGE_WORK.mine.colors);
  assert.ok(workOf(farmer).store > 0 && workOf(farmer).plants > 0);
  const plain = villageOutput([miner, farmer]);
  const cared = villageOutput([miner, farmer, ...nurses]);
  assert.equal(cared.boost, MAX_CARE_BOOST);
  assert.ok(Math.abs(cared.colors - plain.colors * (1 + MAX_CARE_BOOST)) < 1e-9);
  const young = newCreature('Tiny');
  young.traits = [];
  assert.ok(workOf(young).colors < VILLAGE_WORK.none.colors, 'a hatchling helps less');
});

test('village work adds up exactly over many small steps', () => {
  const miner = grown('Digger');
  choosePath(miner, 'miner');
  const a = emptyHouse();
  const b = emptyHouse();
  runVillage(a, [miner], 10, () => 0.5);
  for (let i = 0; i < 600; i++) runVillage(b, [miner], 10 / 600, () => 0.5);
  const color = workOf(miner).color;
  assert.equal(a.bank[color], 200);
  assert.ok(Math.abs(b.bank[color] - 200) <= 1, `${b.bank[color]}`);
  assert.equal(Math.floor(a.bank.gems), Math.floor(b.bank.gems + 0.0001));
  // While the game was closed it only counts so much.
  const house = emptyHouse();
  house.village.lastTick = NOW - 48 * HOUR;
  assert.ok(hoursDue(house, NOW) <= 8);
  assert.equal(hoursDue(house, NOW), 0, 'and it starts counting again from now');
});

// ---------- expeditions ----------

test('an expedition takes its party away until it is back, and brings home gems', () => {
  const house = emptyHouse();
  const party = ['A', 'B'].map((n) => ({ base: n, c: grown(n) }));
  assert.ok(expeditionProblem(house, 'nowhere', party));
  assert.match(expeditionProblem(house, 'coast', []), /Pick who goes/);
  assert.match(expeditionProblem(house, 'coast', [1, 2, 3, 4].map((i) => ({ base: `p${i}`, c: grown(`p${i}`) }))), new RegExp(`At most ${PARTY_MAX}`));
  const exp = startExpedition(house, 'sea', party, NOW);
  assert.ok(exp && exp.end === NOW + EXPEDITIONS.sea.hours * HOUR);
  assert.ok(awayBases(house).has('A'));
  assert.match(expeditionProblem(house, 'coast', [party[0]]), /already away/);
  assert.deepEqual(finishExpeditions(house, exp.end - 1), [], 'not back early');
  const [back] = finishExpeditions(house, exp.end);
  assert.deepEqual(back.gems, expeditionHaul(exp).gems, 'the same expedition always brings the same');
  assert.ok(back.gems >= EXPEDITIONS.sea.gems[0]);
  assert.equal(house.bank.gems, back.gems);
  assert.equal(house.expeditions.length, 0);
  assert.ok(!awayBases(house).has('A'));
  for (let i = 0; i < EXPEDITIONS_AT_ONCE; i++) startExpedition(house, 'coast', [{ base: `x${i}`, c: grown(`x${i}`) }], NOW);
  assert.match(expeditionProblem(house, 'coast', [{ base: 'y', c: grown('y') }]), /at once/);
});

test('expedition finds and Devil Fruits come up as often as the table says', () => {
  const counts = {};
  let fruits = 0;
  const N = 20000;
  for (let i = 0; i < N; i++) {
    const exp = { id: `e${i}`, where: 'sea', start: NOW + i, end: NOW + i, party: [{ base: 'a', name: 'A', power: 50 }] };
    const haul = expeditionHaul(exp);
    if (haul.find) counts[haul.find] = (counts[haul.find] ?? 0) + 1;
    if (haul.fruit) fruits += 1;
  }
  for (const [race, chance] of Object.entries(EXPEDITIONS.sea.finds)) {
    assert.ok(Math.abs((counts[race] ?? 0) / N - chance) < 0.006, `${race}: ${counts[race]} of ${N}`);
  }
  assert.ok(Math.abs(fruits / N - FRUIT_FROM_EXPEDITION) < 0.004, `fruits ${fruits}`);
});

test('a creature an expedition found waits to be named, and comes as that race', () => {
  const house = emptyHouse();
  house.found.push({ race: 'devil', where: 'sea', at: NOW });
  const c = takeFound(house, 0, 'Pochita', NOW);
  assert.equal(c.race, 'devil');
  assert.equal(house.found.length, 0);
  assert.equal(takeFound(house, 0, 'Nobody', NOW), null);
});

// ---------- hostile villages ----------

test('hostile mode makes rival villages that raid while the game is open, and turning it off clears them', () => {
  const house = emptyHouse();
  assert.equal(raidDue(house, NOW), false, 'nothing raids with it off');
  setHostile(house, true, 100, NOW, makeRng(3));
  assert.equal(house.hostile.villages.length, HOSTILE_VILLAGES);
  assert.ok(house.hostile.nextRaid > NOW);
  assert.ok(raidDue(house, house.hostile.nextRaid));
  // Raids that came due while the game was closed are put off, not run.
  putOffRaids(house, house.hostile.nextRaid + 10 * HOUR, makeRng(4));
  assert.ok(house.hostile.nextRaid > NOW + 10 * HOUR);
  setHostile(house, false, 100, NOW);
  assert.deepEqual(house.hostile.villages, []);
});

test('a raid held off pays gems, a raid lost takes some of the pool', () => {
  const house = emptyHouse();
  setHostile(house, true, 100, NOW, makeRng(5));
  house.bank.red = 1000;
  house.store = 100;
  house.bank.gems = 10;
  const won = incomingRaid(house, 1e6, NOW, () => 0);
  assert.ok(won.won && won.gems > 0);
  const lost = incomingRaid(house, 0, NOW, () => 0.999);
  assert.ok(!lost.won && lost.colors > 0 && lost.store > 0);
  assert.ok(house.bank.red < 1000 && house.store < 100);
  assert.ok(house.hostile.log.length >= 3);
  house.hostile.log.forEach((l) => assert.ok(clean(l.text)));
});

test('raiding them back works, and your raiders rest after', () => {
  const house = emptyHouse();
  setHostile(house, true, 100, NOW, makeRng(6));
  const target = house.hostile.villages[0];
  const before = target.power;
  const res = raidVillage(house, target.id, 1e6, NOW, () => 0);
  assert.ok(res.won && res.gems > 0 && target.power < before);
  assert.match(raidProblem(house, target.id, NOW + 1000), /resting/);
  assert.equal(raidVillage(house, target.id, 1e6, NOW + 1000), null);
  assert.ok(winChance(200, 100) > 0.5 && winChance(100, 200) < 0.5 && winChance(0, 10) === 0);
});

test('fighters guard the village twice over, and mains count half', () => {
  const guard = grown('Guard');
  choosePath(guard, 'fighter');
  const farmer = grown('Farmer');
  choosePath(farmer, 'farmer');
  const main = grown('Main');
  const def = villageDefense([guard, farmer], [main]);
  assert.ok(def > villageDefense([farmer, farmer], [main]));
});

// ---------- waves ----------

test('the strongest at home join the mains on the line', () => {
  const home = [10, 50, 30, 40, 20].map((g) => grown(`h${g}`, { growth: g * 4 }));
  const line = defenders([grown('Main')], home);
  assert.equal(line.length, 1 + WAVE_FROM_VILLAGE);
});

test('waves get bigger and tougher, with a monster every fifth one', () => {
  assert.equal(waveEnemies(1, 1).raiders.length, 1);
  assert.ok(waveEnemies(10, 1).raiders.length > waveEnemies(2, 1).raiders.length);
  assert.ok(waveEnemies(5, 1).boss && !waveEnemies(4, 1).boss);
  assert.ok(waveToughness(20) > waveToughness(5));
  const line = [wildCreature(11, 3), wildCreature(12, 3), wildCreature(13, 3)];
  const bout = startWave(5, line, { seed: 9 });
  const ours = bout.fighters.filter((f) => f.team === 0);
  const theirs = bout.fighters.filter((f) => f.team !== 0);
  assert.equal(ours.length, 3);
  assert.ok(theirs.length >= 2);
  assert.ok(ours.every((f) => f.x < bout.cx) && theirs.every((f) => f.x > bout.cx), 'two sides across the ring');
  // The defenders are copies: fighting changes nothing about the real ones.
  const growthBefore = line[0].growth;
  finishBout(bout);
  assert.equal(line[0].growth, growthBefore);
  assert.equal(typeof waveHeld(bout), 'boolean');
  assert.equal(waveReward(3, 2), 3);
  assert.equal(waveReward(2, 5), 0, 'no pay for a wave already beaten');
});

test('easy waves are held by a decent village', () => {
  const line = [wildCreature(21, 3), wildCreature(22, 3), wildCreature(23, 2)];
  let held = 0;
  for (let s = 1; s <= 8; s++) if (waveHeld(finishBout(startWave(1, line, { seed: s })))) held += 1;
  assert.ok(held >= 7, `${held} of 8`);
});

// ---------- words ----------

test('the guide pages and tips read properly', () => {
  breedingGuide().forEach((s) => s.rows.forEach((r) => assert.ok(clean(`${r.name} ${r.detail}`), r.name)));
  chanceSections(null).forEach((s) => s.rows.forEach((r) => assert.ok(clean(`${r.name} ${r.odds} ${r.detail}`), r.name)));
  const c = grown('Tipped');
  c.fullness = 10;
  assert.equal(nextStep(c).go, 'feed');
  c.fullness = 90;
  c.growth = 0;
  assert.match(nextStep(c).text, /more snack/);
  c.growth = STAGES[BREED_STAGE].at + 1;
  c.path.line = ['miner'];
  c.mutations.push({ id: 'claws', from: '', at: 0 });
  c.palette.total = 10;
  assert.equal(nextStep(c, { out: 1, home: 2, away: 0 }).go, 'expeditions');
  for (const opts of [{ out: 3 }, { out: 1 }, { out: 3, home: 1, away: 1 }]) {
    const tip = nextStep(c, opts);
    assert.ok(!tip || clean(tip.text));
  }
});
