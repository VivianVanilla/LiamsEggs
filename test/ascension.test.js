// Past Chapter ???: the Negative races outclassing Pillar Men, auto rolling eggs of the Negative, a
// Hatsu carried over as a gift, the Elite Negative and its Ascension Stones, awakened powers, the God
// Chapter, and God Mode.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newCreature, wildCreature, parseCreature, serializeCreature, computeStats, statLimits, fightPassive, movesOf, awakenedKinds, awakenBoost, raceMoves, powerOf,
  STAT_KEYS, TRAINING_LIMIT, hasRoomFor,
} from '../src/core/creature.js';
import { emptyHouse, sanitizeHouse } from '../src/core/house.js';
import { breed, giftsOf } from '../src/core/family.js';
import { startOver } from '../src/core/reborn.js';
import { itemProblem, useItem, addItem, itemCount } from '../src/core/items.js';
import { tuningOf } from '../src/core/sheet.js';
import { runBout, finishBout, godFactor, voidFactor } from '../src/sim/arena.js';
import {
  ABYSS_COUNT, GOD_COUNT, godProblem, godToughness, abyssToughness, startGod, godReward, winGod, godEnemies,
} from '../src/core/adventure.js';
import { resetUniverse, abyssBeaten, godModeOpen } from '../src/core/universe.js';
import {
  newNegCreature, negEggFromId, rollNegEgg, emptyNegWorld, sanitizeNegWorld, setHatsu, crossOver, hatsuGiftOf, wildNegCreature,
  emptyNegWant, negMatches, negMatchChance, autoRollNeg, negWantsAnything, craftProblem, craftAscension,
} from '../src/core/negative.js';
import { eliteProblem, eliteReward, settleElite, startElite, eliteToughness, eliteEnemies } from '../src/core/negadventure.js';
import {
  godMake, makeProblem, emptyMake, godRing, ringProblem, RING_MONSTER_IDS, godRain, godBag, godNegative, godRecall, GOD_BLESSINGS, GOD_GIFTS,
} from '../src/core/god.js';
import { RACES, NEGATIVE_RACE_IDS, raceMovesOf } from '../src/data/races.js';
import { TRAITS, TRAIT_IDS, BORN_TRAIT_IDS, NEG_TRAIT_IDS, NEG_TRAIT_ODDS, HATSU_TRAIT_IDS, STANDS, tuneMove } from '../src/data/powers.js';
import { ABILITIES } from '../src/data/paths.js';
import { ITEMS, AWAKEN_ITEM_IDS } from '../src/data/items.js';
import { AWAKENINGS, AWAKEN_KINDS, ASCENSION_RECIPES, GOD_GUARD, GOD_FULL } from '../src/data/ascension.js';
import { HATSU_FORMS, NEG_EGG, NEG_LEVEL_COUNT, ELITE_COUNT, ELITE_REWARD, HATSU_LIGHT } from '../src/data/negative.js';
import { ABYSS, GOD_LEVELS } from '../src/data/adventure.js';
import { STAGES } from '../src/core/creature.js';

const clean = (s) => typeof s === 'string' && s.length > 0 && !/undefined|NaN|null|\[object/.test(s);
const elder = (name, seed = 1, race = 'human') => {
  const c = wildCreature(seed, 3);
  c.name = name;
  c.growth = 400;
  c.fullness = 100;
  c.traits = [];
  c.race = race;
  c.heritage = null;
  c.souls = [];
  c.powers = { stand: null, speedster: false, technique: null, technique2: null, fruit: null, quirks: [] };
  c.weapon = null;
  STAT_KEYS.forEach((k) => { c.training[k] = TRAINING_LIMIT; });
  c.battle.stance = 'close';
  return c;
};
// A household where Chapter ??? is beaten, after one reset.
const pastAbyss = () => {
  const house = emptyHouse();
  house.universe = { resets: 1, abyssBest: ABYSS_COUNT, godBest: 0, lastReset: 1 };
  return house;
};

// ---------- the races of the Negative ----------

test('every race of the Negative beats a Pillar Man far more often than not, and brings two moves', () => {
  const ROUNDS = 24;
  for (const id of NEGATIVE_RACE_IDS) {
    assert.equal(raceMovesOf(id).length, 2, `${id} brings two moves`);
    raceMovesOf(id).forEach((m) => assert.ok(ABILITIES[m], `${id} ${m}`));
    assert.ok(clean(RACES[id].passive.text) && clean(RACES[id].village.text), id);
    let won = 0;
    for (let i = 0; i < ROUNDS; i++) {
      const a = elder('Neg', 900 + i, id);
      const b = elder('Kars', 900 + i, 'pillarman');
      Object.assign(b, { mutations: a.mutations.map((m) => ({ ...m })), essence: { ...a.essence }, palette: JSON.parse(JSON.stringify(a.palette)), path: JSON.parse(JSON.stringify(a.path)) });
      const bout = runBout(i % 2 ? [a, b] : [b, a], i + 1);
      if (bout.winner?.c === a) won += 1;
    }
    assert.ok(won / ROUNDS > 0.6, `${RACES[id].name} beat a Pillar Man ${won} of ${ROUNDS}`);
  }
});

test('every race of the Negative does better at home than a Pillar Man: a gem an hour or more on top of its trade', () => {
  const pillar = RACES.pillarman.village;
  for (const id of NEGATIVE_RACE_IDS) {
    const v = RACES[id].village;
    assert.ok((v.gemsFlat ?? 0) > pillar.gemsFlat, `${id} finds more gems than a Pillar Man, whatever its job`);
  }
});

// ---------- auto rolling eggs of the Negative ----------

test('auto roll keeps rolling until an egg matches, spends shards for every roll, and stops when they run out', () => {
  const world = emptyNegWorld();
  world.shards = NEG_EGG.roll * 400;
  let seed = 7;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const want = { ...emptyNegWant(), races: ['dreadwyrm'] };
  assert.ok(negWantsAnything(want) && !negWantsAnything(emptyNegWant()));
  const res = autoRollNeg(world, want, 400, rng);
  assert.ok(res.found);
  assert.equal(res.egg.race, 'dreadwyrm');
  assert.equal(world.egg.id, res.egg.id, 'what it landed on is the egg on offer');
  assert.equal(world.shards, NEG_EGG.roll * (400 - res.rolls));
  // With almost nothing to spend, it stops when the shards do.
  world.shards = NEG_EGG.roll * 2 + 1;
  const poor = autoRollNeg(world, { races: [], traits: NEG_TRAIT_IDS.slice(0, 3), nen: [] }, 1000, rng);
  assert.ok(!poor.found && poor.rolls === 2 && world.shards === 1);
});

test('auto roll matches races and Nen types as any of, gifts as all of, and its odds are the real odds', () => {
  const egg = { race: 'voidling', traits: ['blacksun', 'entropy'], nenType: 'emitter' };
  assert.ok(negMatches(egg, { races: ['voidling', 'chimera'], traits: ['blacksun'], nen: [] }));
  assert.ok(!negMatches(egg, { races: [], traits: ['blacksun', 'godslayer'], nen: [] }));
  assert.ok(negMatches(egg, { races: [], traits: [], nen: ['emitter', 'specialist'] }));
  assert.ok(!negMatches(egg, { races: [], traits: [], nen: ['specialist'] }));
  // Over many eggs, what matches comes up about as often as it says.
  const want = { races: ['homunculus', 'chimera', 'dreadwyrm'], traits: [], nen: ['enhancer', 'specialist'] };
  let hits = 0;
  const N = 6000;
  for (let i = 0; i < N; i++) if (negMatches(negEggFromId(`roll${i}`), want)) hits += 1;
  assert.ok(Math.abs(hits / N - negMatchChance(want)) < 0.02, `${hits / N} vs ${negMatchChance(want)}`);
  assert.equal(negMatchChance({ races: [], traits: ['godslayer'], nen: [] }), 1 / NEG_TRAIT_ODDS.godslayer);
});

// ---------- a Hatsu carried over ----------

test('a Hatsu can cross over as a gift: a move of its own, a little of its Nen type, and it passes down', () => {
  assert.equal(HATSU_TRAIT_IDS.length, Object.values(HATSU_FORMS).reduce((n, forms) => n + Object.keys(forms).length, 0));
  HATSU_TRAIT_IDS.forEach((id) => {
    assert.ok(!BORN_TRAIT_IDS.includes(id) && !NEG_TRAIT_IDS.includes(id), `${id} never hatches`);
    assert.ok(ABILITIES[TRAITS[id].move] && clean(TRAITS[id].blurb) && TRAITS[id].passive, id);
  });
  const world = emptyNegWorld();
  const make = () => {
    const nc = newNegCreature('Gon', negEggFromId('00000000000000aa'));
    nc.best = NEG_LEVEL_COUNT;
    world.creatures.push(nc);
    return nc;
  };
  const a = make();
  assert.equal(hatsuGiftOf(a), null, 'no Hatsu, nothing to bring');
  setHatsu(a, 'enhancer', 'rock', 'Jajanken');
  assert.equal(hatsuGiftOf(a), 'hatsurock');
  const without = crossOver(world, a, 5, { keepHatsu: false });
  assert.ok(!without.traits.includes('hatsurock'));
  const b = make();
  setHatsu(b, 'enhancer', 'rock');
  const light = crossOver(world, b, 6, { keepHatsu: true });
  assert.ok(light.traits.includes('hatsurock'));
  assert.ok(movesOf(light).some((m) => m.id === 'hatsurock'), 'it knows the Hatsu as a move');
  assert.ok(Math.abs(ABILITIES.hatsurock.power - HATSU_FORMS.enhancer.rock.def.power * HATSU_LIGHT) < 0.01);
  assert.ok(fightPassive(light).taken >= TRAITS.hatsurock.passive.taken);
  assert.deepEqual(parseCreature(serializeCreature(light)).traits, light.traits, 'kept in its file');
  // It passes down like any born-with gift, with the Deluxe Breeder for its Negative blood.
  light.growth = 200;
  light.fullness = 100;
  const mate = elder('Mate', 3);
  mate.growth = 200;
  const gift = giftsOf(light, mate).find((g) => g.id === 'hatsurock');
  assert.ok(gift);
  const { baby } = breed(light, mate, { family: 'a', look: 'a', style: 'a', gifts: [gift.key] }, 'Kid', 7, { deluxe: true });
  assert.ok(baby.traits.includes('hatsurock'));
});

// ---------- the Elite Negative ----------

test('the Elite Negative opens once Chapter ??? is beaten, goes one level at a time, and pays Ascension Stones', () => {
  const world = emptyNegWorld();
  assert.ok(eliteProblem(world, 1, false), 'shut until Chapter ??? is beaten');
  assert.equal(eliteProblem(world, 1, true), null);
  assert.ok(eliteProblem(world, 2, true), 'one at a time');
  assert.ok(eliteToughness(ELITE_COUNT) > eliteToughness(1));
  assert.equal(eliteReward(1, 0, true).stones, ELITE_REWARD.stones);
  assert.equal(eliteReward(5, 0, true).stones, ELITE_REWARD.bossStones);
  assert.equal(eliteReward(5, 9, true).stones, ELITE_REWARD.replayBossStones, 'a boss beaten again still pays');
  assert.equal(eliteReward(3, 9, true).stones, 0);
  assert.equal(eliteReward(1, 0, false).stones, 0);
  const party = [wildNegCreature(1, 60)];
  const reward = settleElite(world, party, 1, true);
  assert.equal(world.stones, reward.stones);
  assert.equal(world.elite.best, 1);
  // Kept in negative.json, and a file can't claim more than there is.
  const back = sanitizeNegWorld(JSON.parse(JSON.stringify({ ...world, elite: { best: 99 }, stones: 5 })));
  assert.deepEqual([back.elite.best, back.stones], [ELITE_COUNT, 5]);
  // Its levels set up a ring and play out.
  for (const k of [1, 5, ELITE_COUNT]) {
    const bout = finishBout(startElite(k, [wildNegCreature(2, 60), wildNegCreature(3, 60)], { seed: k, r: 260 }));
    assert.ok(bout.done && bout.elite === k, `elite ${k}`);
    assert.ok(eliteEnemies(k, 1).fighters.every((nc) => nc.level === 60));
  }
});

test('Ascension Stones and Void Shards craft the four awakening items into the bag', () => {
  assert.equal(AWAKEN_ITEM_IDS.length, 4);
  assert.deepEqual(AWAKEN_ITEM_IDS.map((id) => ITEMS[id].awakens).sort(), AWAKEN_KINDS.slice().sort());
  const world = emptyNegWorld();
  const house = emptyHouse();
  const recipe = ASCENSION_RECIPES.requiemarrow;
  assert.ok(craftProblem(world, house, 'requiemarrow'));
  world.stones = recipe.stones;
  world.shards = recipe.shards;
  assert.equal(craftProblem(world, house, 'requiemarrow'), null);
  assert.equal(craftAscension(world, house, 'requiemarrow'), true);
  assert.deepEqual([world.stones, world.shards, itemCount(house, 'requiemarrow')], [0, 0, 1]);
  assert.equal(craftAscension(world, house, 'requiemarrow'), false, 'nothing left to craft with');
  // And the bag keeps it.
  assert.equal(sanitizeHouse(JSON.parse(JSON.stringify(house))).items.requiemarrow, 1);
});

// ---------- awakened powers ----------

test('an awakening item only works on a creature with that power, and awakens it for good', () => {
  const house = emptyHouse();
  AWAKEN_ITEM_IDS.forEach((id) => addItem(house, id, 2));
  const c = elder('Giorno', 4);
  assert.match(itemProblem(house, 'requiemarrow', c), /doesn't have/);
  c.powers.stand = 'goldexperience';
  const before = { stats: computeStats(c), limits: statLimits(c), passive: fightPassive(c), boost: tuningOf(c).boost };
  assert.equal(itemProblem(house, 'requiemarrow', c), null);
  assert.equal(useItem(house, 'requiemarrow', c), true);
  assert.deepEqual(awakenedKinds(c), ['stand']);
  assert.match(itemProblem(house, 'requiemarrow', c), /already/);
  const a = AWAKENINGS.stand;
  // Limits go by how its stats rank, so every limit together goes up by the lift on each.
  const sum = (o) => STAT_KEYS.reduce((n, k) => n + o[k], 0);
  assert.equal(sum(statLimits(c)), sum(before.limits) + STAT_KEYS.length * a.limits);
  assert.ok(powerOf(c) > STAT_KEYS.reduce((s, k) => s + before.stats[k], 0));
  assert.ok(fightPassive(c).lives > before.passive.lives && fightPassive(c).reflect > before.passive.reflect);
  assert.ok(movesOf(c).some((m) => m.id === a.move), 'it learns the Requiem move');
  const standMove = STANDS.goldexperience.moves[0];
  assert.equal(awakenBoost(c)[standMove], a.movePower);
  assert.equal(before.boost[standMove], undefined);
  const tuned = tuneMove(standMove, ABILITIES[standMove], tuningOf(c));
  if (ABILITIES[standMove].power) assert.ok(tuned.power > ABILITIES[standMove].power);
  // Kept in its file, but only while it has the power.
  assert.deepEqual(parseCreature(serializeCreature(c)).awakened, ['stand']);
  const raw = JSON.parse(serializeCreature(c));
  raw.powers.stand = null;
  raw.awakened = ['stand', 'fruit', 'nonsense'];
  assert.deepEqual(parseCreature(JSON.stringify(raw)).awakened, []);
});

test('every awakening says what it does, and a rebirth takes it away with the power', () => {
  AWAKEN_KINDS.forEach((kind) => {
    const a = AWAKENINGS[kind];
    assert.ok(clean(a.name) && clean(a.blurb) && clean(a.passive.text) && ABILITIES[a.move] && ITEMS[a.item], kind);
    assert.ok(a.movePower > 1 && a.limits > 0);
  });
  const c = elder('Phoenix', 5);
  c.powers.speedster = true;
  c.awakened = ['speedster'];
  startOver(c, emptyHouse(), 9);
  assert.deepEqual(c.awakened, []);
  c.powers.speedster = true;
  assert.deepEqual(awakenedKinds(c), [], 'getting the power back does not bring the awakening back');
});

// ---------- the God Chapter ----------

test('the God Chapter opens once Chapter ??? is beaten, starts past its end, and only awakened powers wound it', () => {
  assert.equal(GOD_COUNT, GOD_LEVELS.length);
  assert.ok(godProblem(emptyHouse(), 1));
  const house = pastAbyss();
  assert.ok(abyssBeaten(house));
  assert.equal(godProblem(house, 1), null);
  assert.ok(godProblem(house, 2), 'one at a time');
  assert.ok(godToughness(GOD_COUNT) > godToughness(1));
  // The guard: nothing awakened barely scratches it, one about half, two or more in full.
  assert.ok(Math.abs(godFactor({ godShare: 0 }, GOD_GUARD) - (1 - GOD_GUARD)) < 1e-9);
  assert.ok(Math.abs(godFactor({ godShare: 1 / GOD_FULL }, GOD_GUARD) - (1 - GOD_GUARD / 2)) < 1e-9);
  assert.equal(godFactor({ godShare: 1 }, GOD_GUARD), 1);
  const plain = elder('Plain', 7, 'dreadwyrm');
  const woke = elder('Woke', 8, 'dreadwyrm');
  woke.souls = ['twinsoul', 'malevolentsoul'];
  woke.soulExpanders = 1;
  woke.powers.stand = 'theworld';
  woke.powers.speedster = true;
  woke.awakened = ['stand', 'speedster'];
  const bout = startGod(1, [plain, woke], { seed: 3, r: 260 });
  const foes = bout.fighters.filter((f) => f.team !== 0);
  assert.ok(foes.length > 0 && foes.every((f) => f.godGuard === GOD_GUARD && f.voidGuard === ABYSS.voidGuard));
  const [p, w] = bout.fighters.filter((f) => f.team === 0);
  assert.equal(p.godShare, 0);
  assert.equal(w.godShare, 1);
  assert.ok(godFactor(w, GOD_GUARD) * voidFactor(w, ABYSS.voidGuard) > godFactor(p, GOD_GUARD) * voidFactor(p, ABYSS.voidGuard) * 5);
  assert.ok(finishBout(bout).done);
  assert.ok(godEnemies(GOD_COUNT, 1).boss, 'God waits at the end');
});

test('beating God opens God Mode for good, through any reset', () => {
  const house = pastAbyss();
  house.adventure.best = 60;
  assert.ok(!godModeOpen(house));
  assert.ok(!godReward(1, 0).godMode);
  const last = godReward(GOD_COUNT, GOD_COUNT - 1, () => 1);
  assert.ok(last.godMode && last.gems > 0 && last.items.includes('requiemarrow'));
  house.universe.godBest = GOD_COUNT - 1;
  winGod(house, GOD_COUNT, () => 1);
  assert.ok(godModeOpen(house));
  const after = resetUniverse(house, 99);
  assert.ok(godModeOpen(after) && abyssBeaten(after), 'a reset keeps it');
  assert.ok(godModeOpen(sanitizeHouse(JSON.parse(JSON.stringify(after)))), 'and so does the household file');
  assert.ok(abyssToughness(ABYSS_COUNT) > 0);
});

// ---------- God Mode ----------

test('the Maker makes any creature, fitting its powers under Legendary mutations by itself', () => {
  assert.ok(makeProblem(emptyMake()), 'it needs a name');
  const make = {
    ...emptyMake(), name: 'Deity', race: 'dreadwyrm', race2: 'pillarman', pureBlood: true, traits: ['sixeyes', 'blacksun', 'hatsurock', 'ultrainstinct'],
    stand: 'starplatinum', speedster: true, technique: 'limitless', fruit: 'gura', quirks: ['oneforall', 'hellflame'], awaken: true, job: 'hoarder', weapon: 'dragonslayer', trophies: true,
  };
  assert.equal(makeProblem(make), null);
  const c = godMake(make, 10);
  assert.equal(c.name, 'Deity');
  assert.ok(c.pureBlood && c.heritage.dreadwyrm === 0.5 && c.heritage.pillarman === 0.5);
  assert.deepEqual(c.traits, make.traits);
  assert.deepEqual([c.powers.stand, c.powers.speedster, c.powers.technique, c.powers.fruit], ['starplatinum', true, 'limitless', 'gura']);
  assert.equal(c.lineage, 'limitless', 'it joins the family whose technique it has');
  assert.ok(c.souls.length <= 3 && c.souls.length >= 3, 'four powers need three Legendary mutations');
  assert.deepEqual(awakenedKinds(c).sort(), ['fruit', 'speedster', 'stand', 'technique']);
  assert.deepEqual(c.powers.quirks, ['oneforall', 'hellflame']);
  assert.equal(c.weapon, 'dragonslayer');
  assert.ok(c.trophies.length > 0 && c.growth >= STAGES[STAGES.length - 1].at);
  // It is a real creature: the same after a trip through its file.
  assert.deepEqual(JSON.parse(serializeCreature(parseCreature(serializeCreature(c)))).powers, JSON.parse(serializeCreature(c)).powers);
  // Without the room for them, powers still fit: the Maker adds the Legendary mutations they need.
  const two = godMake({ ...emptyMake(), name: 'Two', stand: 'theworld', fruit: 'mera' });
  assert.deepEqual([two.powers.stand, two.powers.fruit], ['theworld', 'mera']);
  assert.equal(two.souls.length, 1);
});

test('the God Ring puts anyone against anyone, monsters and bosses too, and touches nobody', () => {
  const a = elder('Left', 11);
  const b = elder('Right', 12);
  assert.ok(ringProblem({ left: [a] }), 'it takes two');
  assert.ok(ringProblem({ left: [a], right: [] }), 'and both sides');
  assert.equal(ringProblem({ left: [a], monsters: ['rat'] }), null);
  const hp = a.fullness;
  const bout = godRing({ left: [a], right: [b], monsters: ['god10', 'rex'], might: 10 }, { seed: 4, r: 260 });
  const right = bout.fighters.filter((f) => f.team !== 0);
  assert.equal(right.length, 3);
  assert.ok(right.some((f) => f.monster?.name === 'God'));
  assert.ok(finishBout(bout).done && bout.godRing);
  assert.equal(a.fullness, hp, 'copies fight, not the real ones');
  const ffa = godRing({ left: [a, b], monsters: ['rat'], freeForAll: true }, { seed: 5, r: 260 });
  assert.equal(new Set(ffa.fighters.map((f) => f.team)).size, 3, 'everyone for themselves');
  RING_MONSTER_IDS.forEach((id) => assert.ok(id));
});

test('the tools fill the household and the Negative, and bless every creature', () => {
  const house = emptyHouse();
  godRain(house);
  assert.equal(house.bank.gems, GOD_GIFTS.gems);
  godBag(house);
  Object.keys(ITEMS).forEach((id) => assert.equal(itemCount(house, id), GOD_GIFTS.items, id));
  const world = emptyNegWorld();
  godNegative(world);
  assert.deepEqual([world.shards, world.stones], [GOD_GIFTS.shards, GOD_GIFTS.stones]);
  house.expeditions = [{ end: 1e15 }];
  godRecall(house, 50);
  assert.equal(house.expeditions[0].end, 50);
  const c = newCreature('Blessed');
  c.powers.fruit = 'mera';
  Object.values(GOD_BLESSINGS).forEach((b) => b.apply(c));
  assert.equal(c.fullness, 100);
  assert.ok(c.growth >= 400 && STAT_KEYS.every((k) => c.training[k] === TRAINING_LIMIT));
  assert.deepEqual(awakenedKinds(c), ['fruit']);
});
