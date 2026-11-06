// Races, Devil Fruits, rolling eggs, the village, the Legendary Mine and expeditions.

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
  isLegendaryMiner, mineProblem, joinMine, leaveMine, tidyMine,
} from '../src/core/village.js';
import { eggFromId, rollEgg, matches, matchChance, hyperRoll, hatchEgg } from '../src/core/roll.js';
import { breed, mixHeritage } from '../src/core/family.js';
import { nextStep } from '../src/core/advice.js';
import { breedingGuide } from '../src/core/breedguide.js';
import { chanceSections } from '../src/core/odds.js';
import { doJob, addField } from '../src/sim/farm.js';
import { RACES, RACE_IDS, RACE_MOVES } from '../src/data/races.js';
import { FRUITS, FRUIT_IDS, FRUIT_VIGOR, FRUIT_MOVES, FRUIT_FROM_EXPEDITION } from '../src/data/fruits.js';
import { ABILITIES, TIER_XP } from '../src/data/paths.js';
import { EXPEDITIONS, PARTY_MAX, EXPEDITIONS_AT_ONCE, VILLAGE_WORK, MAX_CARE_BOOST, LEGENDARY_MINE } from '../src/data/village.js';

// Humans work this much harder than their job alone, in the village.
const HUMAN = 1 + RACES.human.village.work;
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

// A Miner all the way to its final form.
function legendaryMiner(name) {
  const c = grown(name);
  choosePath(c, 'miner');
  c.path.xp = TIER_XP[3];
  choosePath(c, 'prospector');
  choosePath(c, 'hoarder');
  return c;
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

test('a baby is half of each parent\'s races, and its babies are quarters', () => {
  const devil = grown('Dad', { race: 'devil' });
  const human = grown('Mom');
  assert.deepEqual(mixHeritage(devil, human), { devil: 0.5, human: 0.5 });
  const { baby } = breed(devil, human, { family: 'a', look: 'a', style: 'a', gifts: [] }, 'Hybrid', NOW);
  assert.deepEqual(baby.heritage, { devil: 0.5, human: 0.5 });
  assert.equal(baby.race, 'devil', 'its race for short is the one it is most of, after Human');
  assert.match(raceName(baby), /Devil/);
  assert.deepEqual(mixHeritage(grown('Half', { heritage: baby.heritage }), grown('Plain')), { devil: 0.25, human: 0.75 });
  assert.deepEqual(mixHeritage(grown('Fish', { race: 'fishman' }), grown('Fur', { race: 'mink' })), { fishman: 0.5, mink: 0.5 });
  const back = parseCreature(serializeCreature(baby));
  assert.deepEqual(back.heritage, baby.heritage);
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
  c.souls = ['twinsoul'];
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
  assert.equal(workOf(miner).colors, VILLAGE_WORK.mine.colors * HUMAN);
  assert.ok(workOf(farmer).store > 0 && workOf(farmer).plants > 0);
  const plain = villageOutput([miner, farmer]);
  const cared = villageOutput([miner, farmer, ...nurses]);
  assert.equal(cared.boost, MAX_CARE_BOOST);
  assert.ok(Math.abs(cared.colors - plain.colors * (1 + MAX_CARE_BOOST)) < 1e-9);
  const young = newCreature('Tiny');
  young.traits = [];
  assert.ok(workOf(young).colors < VILLAGE_WORK.none.colors, 'a hatchling helps less');
});

test('fighters in the village go hunting: food, and now and then a gem', () => {
  const hunter = grown('Hunter');
  choosePath(hunter, 'fighter');
  const w = workOf(hunter);
  assert.equal(w.kind, 'battle');
  assert.equal(w.store, VILLAGE_WORK.battle.store * HUMAN);
  assert.ok(w.gems > 0);
  const house = emptyHouse();
  runVillage(house, [hunter], 20, () => 0.5);
  assert.equal(house.store, VILLAGE_WORK.battle.store * HUMAN * 20);
  assert.ok(house.bank.gems >= 1);
});

test('village work adds up exactly over many small steps', () => {
  const miner = grown('Digger');
  choosePath(miner, 'miner');
  const a = emptyHouse();
  const b = emptyHouse();
  runVillage(a, [miner], 10, () => 0.5);
  for (let i = 0; i < 600; i++) runVillage(b, [miner], 10 / 600, () => 0.5);
  const color = workOf(miner).color;
  const want = VILLAGE_WORK.mine.colors * HUMAN * 10;
  assert.equal(a.bank[color], want);
  assert.ok(Math.abs(b.bank[color] - want) <= 1, `${b.bank[color]}`);
  assert.equal(Math.floor(a.bank.gems), Math.floor(b.bank.gems + 0.0001));
  // While the game was closed it only counts so much.
  const house = emptyHouse();
  house.village.lastTick = NOW - 48 * HOUR;
  assert.ok(hoursDue(house, NOW) <= 8);
  assert.equal(hoursDue(house, NOW), 0, 'and it starts counting again from now');
});

// ---------- the Legendary Mine ----------

test('only legendary Miners can work the Legendary Mine, three at most', () => {
  const house = emptyHouse();
  const plainMiner = grown('Plain Miner');
  choosePath(plainMiner, 'miner');
  assert.equal(isLegendaryMiner(plainMiner), false);
  assert.match(mineProblem(house, plainMiner), /legendary Miners/);
  // A Legendary mutation is enough, even without a final form.
  const lucky = grown('Lucky');
  choosePath(lucky, 'miner');
  lucky.souls = ['twinsoul'];
  assert.ok(isLegendaryMiner(lucky));
  const farmer = grown('Farmer');
  choosePath(farmer, 'farmer');
  farmer.souls = ['twinsoul'];
  assert.equal(isLegendaryMiner(farmer), false, 'it has to be a Miner');
  const crew = [1, 2, 3, 4].map((i) => legendaryMiner(`Deep ${i}`));
  crew.slice(0, LEGENDARY_MINE.slots).forEach((c) => assert.ok(joinMine(house, c)));
  assert.match(mineProblem(house, crew[0]), /already works there/);
  assert.match(mineProblem(house, crew[3]), new RegExp(`room for ${LEGENDARY_MINE.slots}`));
  leaveMine(house, crew[0].id);
  assert.ok(joinMine(house, crew[3]));
  // Anyone gone, or no longer there at all, loses their place.
  crew[1].dead = { at: NOW, by: 'x' };
  assert.ok(tidyMine(house, crew));
  assert.deepEqual(house.mine, [crew[2].id, crew[3].id]);
  assert.equal(tidyMine(house, [crew[2]]), true);
  assert.deepEqual(house.mine, [crew[2].id]);
  assert.deepEqual(sanitizeHouse(JSON.parse(JSON.stringify(house))).mine, house.mine);
});

test('the Legendary Mine brings up ore instead of colors, and nurses help it too', () => {
  const house = emptyHouse();
  const deep = legendaryMiner('Deep');
  joinMine(house, deep);
  const w = workOf(deep, true);
  assert.equal(w.ore, LEGENDARY_MINE.ore * HUMAN);
  assert.equal(w.colors, 0);
  runVillage(house, [deep], 6, () => 0.5);
  assert.equal(house.ore, Math.floor(6 * w.ore));
  assert.equal(house.bank[w.color], 0, 'no colors while it is down the mine');
  const nurse = grown('Nurse');
  choosePath(nurse, 'nurse');
  assert.ok(villageOutput([deep, nurse], house.mine).ore > villageOutput([deep], house.mine).ore);
  // Out of the mine, it digs colors like any Miner.
  leaveMine(house, deep.id);
  runVillage(house, [deep], 1, () => 0.5);
  assert.equal(house.ore, Math.floor(6 * w.ore));
  assert.ok(house.bank[w.color] > 0);
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

test('a Legendary Miner at work can\'t go on an expedition', () => {
  const house = emptyHouse();
  const deep = legendaryMiner('Deep');
  joinMine(house, deep);
  assert.match(expeditionProblem(house, 'coast', [{ base: 'Deep', c: deep }]), /Legendary Mine/);
});

test('expedition finds, loot and Devil Fruits come up as often as the table says', () => {
  const counts = {};
  const items = {};
  let fruits = 0;
  const N = 20000;
  for (let i = 0; i < N; i++) {
    const exp = { id: `e${i}`, where: 'sea', start: NOW + i, end: NOW + i, party: [{ base: 'a', name: 'A', power: 50 }] };
    const haul = expeditionHaul(exp);
    if (haul.find) counts[haul.find] = (counts[haul.find] ?? 0) + 1;
    if (haul.fruit) fruits += 1;
    haul.items.forEach((id) => { items[id] = (items[id] ?? 0) + 1; });
  }
  for (const [race, chance] of Object.entries(EXPEDITIONS.sea.finds)) {
    assert.ok(Math.abs((counts[race] ?? 0) / N - chance) < 0.006, `${race}: ${counts[race]} of ${N}`);
  }
  for (const [id, chance] of Object.entries(EXPEDITIONS.sea.items)) {
    assert.ok(Math.abs((items[id] ?? 0) / N - chance) < 0.008, `${id}: ${items[id]} of ${N}`);
  }
  assert.ok(Math.abs(fruits / N - FRUIT_FROM_EXPEDITION) < 0.004, `fruits ${fruits}`);
  // Loot goes into the bag when they are back.
  const house = emptyHouse();
  let i = 0;
  while (!expeditionHaul({ id: `l${i}`, where: 'sea', start: NOW, end: NOW, party: [] }).items.length) i += 1;
  house.expeditions.push({ id: `l${i}`, where: 'sea', start: NOW, end: NOW, party: [] });
  const [back] = finishExpeditions(house, NOW);
  back.items.forEach((id) => assert.ok(house.items[id] >= 1, id));
});

test('a creature an expedition found waits to be named, and comes as that race', () => {
  const house = emptyHouse();
  house.found.push({ race: 'devil', where: 'sea', at: NOW });
  const c = takeFound(house, 0, 'Pochita', NOW);
  assert.equal(c.race, 'devil');
  assert.equal(house.found.length, 0);
  assert.equal(takeFound(house, 0, 'Nobody', NOW), null);
});

test('an old household file loses its raids and waves, and keeps everything else', () => {
  const house = sanitizeHouse({
    bank: { gems: 12 }, store: 30, hostile: { on: true, villages: [{ name: 'Redfang Camp', power: 50 }] }, waves: { best: 7 },
  });
  assert.equal(house.bank.gems, 12);
  assert.equal(house.store, 30);
  assert.equal(house.hostile, undefined);
  assert.equal(house.waves, undefined);
  assert.deepEqual(house.adventure, { best: 0, party: [] });
  assert.equal(house.megaBreeder, false);
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
  assert.equal(nextStep(c, { out: 1, home: 0, away: 0 }).go, 'nursery:eggs');
  assert.equal(nextStep(c, { out: 3, home: 0, away: 0 }).go, 'nursery');
  for (const opts of [{ out: 3 }, { out: 1 }, { out: 3, home: 1, away: 1 }]) {
    const tip = nextStep(c, opts);
    assert.ok(!tip || clean(tip.text));
  }
});
