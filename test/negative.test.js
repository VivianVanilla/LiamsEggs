// Chapter 5, the harder Ultimate road, the reworked Legendary mutations and Pillar Men, the universe
// reset, creature boosts, the Deluxe Breeder, Chapter ???, and the Negative Dimension.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newCreature, wildCreature, parseCreature, serializeCreature, abilitiesOf, fightPassive, negativeShare, raceMoves, movesOf,
} from '../src/core/creature.js';
import { emptyHouse, sanitizeHouse } from '../src/core/house.js';
import { breed } from '../src/core/family.js';
import { startChallenge } from '../src/sim/challenges.js';
import { Bout, finishBout, voidFactor } from '../src/sim/arena.js';
import { FOE_REFLECT } from '../src/data/battle.js';
import {
  LEVEL_COUNT, levelEnemies, startLevel, bossOf, levelToughness, ABYSS_COUNT, abyssProblem, startAbyss, abyssToughness, abyssReward, winAbyss, winLevel,
} from '../src/core/adventure.js';
import {
  resetProblem, resetUniverse, afterReset, boostFor, boostProblem, addBoost, gemMultiplier, gainGems, deluxeProblem, buyDeluxe, activeBoosts,
} from '../src/core/universe.js';
import {
  newNegCreature, negEggFromId, negScores, chooseClass, unlockedSpells, toggleSpell, affinity, setAlloc, setHatsu, hatsuProblem, toggleVow, hatsuDef,
  circleDef, circleWorth, setCircle, sanitizeNeg, sanitizeNegWorld, emptyNegWorld, keepNegEgg, keepCost, crossProblem, crossOver, wildNegCreature,
  negFightSpec, addNegXp, nenTypeOf,
} from '../src/core/negative.js';
import { startNegLevel, negLevelWon, settleNegLevel, negLevelEnemies } from '../src/core/negadventure.js';
import { RACES, RACE_IDS, NEGATIVE_RACE_IDS, raceMovesOf } from '../src/data/races.js';
import { TRAITS, BORN_TRAIT_IDS, NEG_TRAIT_IDS, NEG_TRAIT_ODDS, LEGENDARY } from '../src/data/powers.js';
import { ULTIMATE_IDS, REBORN, DEADLY_MONSTERS } from '../src/data/monsters.js';
import { ABILITIES } from '../src/data/paths.js';
import { ADVENTURE_BOSSES, ADVENTURE_ELITE, ABYSS } from '../src/data/adventure.js';
import { BOOSTS, DELUXE_BREEDER } from '../src/data/universe.js';
import {
  NEG_SCALE, CLASS_IDS, CLASSES, NEN_POINTS, NEN_TECHNIQUE_IDS, MAX_VOWS, VOWS, NEG_LEVEL_COUNT, NEG_MAX_LEVEL, NEG_EGG, spellSlots,
} from '../src/data/negative.js';
import { MAX_BANK } from '../src/data/crafting.js';

const clean = (s) => typeof s === 'string' && s.length > 0 && !/undefined|NaN|null|\[object/.test(s);
const grown = (name, seed = 1) => {
  const c = wildCreature(seed, 3);
  c.name = name;
  c.growth = 200;
  c.fullness = 100;
  c.traits = [];
  return c;
};
const cracked = () => {
  const house = emptyHouse();
  house.adventure.best = LEVEL_COUNT;
  return house;
};
const afterOne = () => resetUniverse(cracked(), 1000);

// ---------- races ----------

test('nine races of the Negative, each saying everything it does, in both worlds', () => {
  assert.equal(NEGATIVE_RACE_IDS.length, 9);
  for (const id of NEGATIVE_RACE_IDS) {
    const r = RACES[id];
    assert.ok(clean(r.name) && clean(r.blurb) && clean(r.passive?.text) && clean(r.village?.text) && clean(r.from), id);
    assert.ok(raceMovesOf(id).every((m) => ABILITIES[m]), `${id} moves are real`);
    assert.ok(r.neg && Object.keys(r.neg).length === 6, `${id} starts the Negative with six scores`);
    assert.ok(Object.values(r.stats).reduce((a, b) => a + b, 0) >= 25, `${id} is strong in the light world`);
  }
  // Every race in the game says what it does in a fight, except Humans, who are simply the best workers.
  RACE_IDS.filter((id) => id !== 'human' && id !== 'halfdevil').forEach((id) => assert.ok(clean(RACES[id].passive?.text), id));
});

test('a Pillar Man fights in all three Modes, absorbs, and becomes the Ultimate Life Form once', () => {
  const c = grown('Kars', 7);
  c.race = 'pillarman';
  assert.deepEqual(raceMoves(c), ['sandstorm', 'boilingblood', 'shiningblades']);
  assert.ok(abilitiesOf(c).includes('shiningblades'));
  const p = fightPassive(c);
  assert.ok(p.absorb > 0 && p.evolve > 0 && p.taken >= 0.3 && p.hp >= 0.3);
  const bout = new Bout([c, grown('Foe', 8)], { seed: 3 });
  const f = bout.fighters[0];
  assert.equal(f.evolve, 'ready');
  bout.hurt(f, f.maxHp * 0.75 / f.takenMul * (30 + f.def) / 30, bout.fighters[1]);
  assert.equal(f.evolve, 'used', 'it evolved below 30%');
  assert.ok(Math.abs(f.hp - f.maxHp) < 1, 'back to full health');
});

// ---------- Legendary mutations ----------

test('every Legendary mutation brings its own move and a passive worth a second power', () => {
  for (const [id, l] of Object.entries(LEGENDARY)) {
    assert.ok(ABILITIES[l.move], `${id} has a move`);
    assert.ok(clean(l.passive?.text), `${id} says what it does`);
    const c = grown('Soul');
    c.souls = [id];
    assert.ok(movesOf(c).some((m) => m.id === l.move), `${id} teaches its move`);
  }
  const iron = grown('Iron');
  iron.souls = ['ironsoul'];
  const p = fightPassive(iron);
  assert.ok(p.taken >= 0.35 && p.reflect > 0 && p.unstoppable, 'Iron Soul is a wall that hits back and cannot be stunned');
  const f = new Bout([iron, grown('Foe', 4)], { seed: 2 }).fighters[0];
  new Bout([iron], {}).stunFor(f, 5);
  assert.equal(f.stun, 0, 'nothing stuns an Iron Soul');
  const ghost = grown('Ghost');
  ghost.souls = ['ghostsoul'];
  assert.ok(fightPassive(ghost).dodge >= 0.2 && fightPassive(ghost).horizon);
});

// ---------- the Ultimate road ----------

test('every rebirth makes the ultimate monsters 1.5 times as strong again for it', () => {
  const c = grown('Again');
  const hp = (rebirths) => {
    c.rebirths = Array.from({ length: rebirths }, () => ({ at: 0, absorbed: 'x', took: [] }));
    return startChallenge(c, ULTIMATE_IDS[0], { seed: 5 }).fighters.find((f) => f.monster).maxHp;
  };
  assert.equal(REBORN.harder, 1.5);
  assert.ok(Math.abs(hp(1) / hp(0) - 1.5) < 1e-9);
  assert.ok(Math.abs(hp(3) / hp(0) - 1.5 ** 3) < 1e-9);
  c.rebirths = [{ at: 0, absorbed: 'x', took: [] }];
  assert.equal(startChallenge(c, 'rat', { seed: 5 }).fighters.find((f) => f.monster).maxHp, startChallenge(grown('Fresh'), 'rat', { seed: 5 }).fighters.find((f) => f.monster).maxHp, 'only the ultimate ones');
});

// ---------- Chapter 5 ----------

test('Act 5: elite enemies with three souls and gifts, twin bosses, and bosses that cannot be stopped', () => {
  const { fighters } = levelEnemies(ADVENTURE_ELITE, 4);
  assert.ok(fighters.length > 0);
  fighters.forEach((c) => {
    assert.equal(c.souls.length, 3);
    assert.ok(c.growth >= 200 && Object.values(c.training).every((v) => v === 10));
    assert.ok(c.traits.length >= 2);
  });
  assert.equal(bossOf(58).twin, 2);
  const party = [grown('A', 1), grown('B', 2), grown('C', 3)];
  const twins = startLevel(58, party, { seed: 2 }).fighters.filter((f) => f.monster);
  assert.equal(twins.length, 2, 'two Thunder Tigers');
  const end = startLevel(60, party, { seed: 2 }).fighters.find((f) => f.monster);
  assert.ok(end.unstoppable && end.lives === 2 && end.nullField, 'The End of All Things does everything');
  assert.ok(levelToughness(60) > levelToughness(50) * 1.3, 'and Act 5 climbs much faster');
  assert.ok(Object.values(ADVENTURE_BOSSES).every((b) => DEADLY_MONSTERS[b.monster] && (b.moves ?? []).every((m) => ABILITIES[m])));
});

// ---------- the universe ----------

test('the universe can only be reset after level 60, and the reset wipes everything but itself', () => {
  assert.ok(resetProblem(emptyHouse()));
  assert.equal(resetUniverse(emptyHouse()), null);
  const house = cracked();
  house.bank.gems = 5000;
  house.ore = 300;
  house.altar = true;
  house.megaBreeder = true;
  house.universe.abyssBest = 4;
  const fresh = resetUniverse(house, 1234);
  assert.equal(fresh.bank.gems, 0);
  assert.equal(fresh.ore, 0);
  assert.equal(fresh.adventure.best, 0);
  assert.equal(fresh.altar, false);
  assert.equal(fresh.megaBreeder, false);
  assert.deepEqual([fresh.universe.resets, fresh.universe.abyssBest], [1, 4]);
  assert.ok(afterReset(fresh));
  // A household file keeps it, and can't claim what only a reset opens.
  assert.equal(sanitizeHouse(JSON.parse(JSON.stringify(fresh))).universe.resets, 1);
  assert.equal(sanitizeHouse({ deluxeBreeder: true, boosts: [{ name: 'x', mult: 50, until: Date.now() + 1e6 }] }).deluxeBreeder, false);
  assert.deepEqual(sanitizeHouse({ boosts: [{ name: 'x', mult: 50, until: Date.now() + 1e6 }] }).boosts, []);
});

test('creature boosts: up to three at once, each for an hour, and they multiply every gem', () => {
  const now = 1e9;
  const house = afterOne();
  assert.ok(boostProblem(emptyHouse(), grown('X'), now), 'not before a reset');
  const strong = grown('Strong');
  const worth = boostFor(strong);
  assert.ok(worth > 1 && worth <= BOOSTS.most);
  const neg = grown('Void');
  neg.race = 'dreadwyrm';
  assert.ok(boostFor(neg) > boostFor({ ...neg, race: 'human' }), 'Negative blood is worth more');
  const b1 = addBoost(house, strong, now);
  assert.ok(b1 && strong.dead, 'it is gone');
  addBoost(house, grown('Two', 2), now);
  addBoost(house, grown('Three', 3), now);
  assert.ok(boostProblem(house, grown('Four', 4), now), 'three at once at most');
  const mult = gemMultiplier(house, now);
  assert.ok(Math.abs(mult - activeBoosts(house, now).reduce((m, b) => m * b.mult, 1)) < 1e-9);
  house.bank.gems = 0;
  gainGems(house, 10, now);
  assert.ok(Math.abs(house.bank.gems - 10 * mult) < 1e-6);
  assert.equal(gemMultiplier(house, now + BOOSTS.hours * 3600e3 + 1), 1, 'and an hour later they are over');
  // Far more gems than any color: the Deluxe Breeder costs more than a bank of colors can hold.
  assert.ok(DELUXE_BREEDER.cost > MAX_BANK);
  house.bank.gems = 1e9;
  gainGems(house, 1e9, now);
  assert.ok(house.bank.gems > 1e9);
});

test('Negative blood only breeds with the Deluxe Breeder, and its babies are half Negative', () => {
  const house = afterOne();
  const a = grown('Light', 1);
  const b = grown('Dark', 2);
  b.race = 'antiseraph';
  const choice = { family: 'a', look: 'a', style: 'a', gifts: [] };
  assert.match(breed(a, b, choice, 'Baby', 1, null).problem, /Deluxe Breeder/);
  assert.ok(deluxeProblem(house));
  house.bank.gems = DELUXE_BREEDER.cost;
  assert.equal(buyDeluxe(house), true);
  assert.equal(house.bank.gems, 0);
  // A roll that misses the 1-in-100 Pure-blood, which would make it all Negative.
  const { baby } = breed(a, b, choice, 'Baby', 1, { deluxe: true }, () => 0.99);
  assert.equal(negativeShare(baby), 0.5);
  assert.equal(baby.heritage.antiseraph, 0.5);
});

// ---------- Chapter ??? ----------

test('Chapter ??? only opens after a reset, grows harder every level, and only Negative blood wounds it', () => {
  assert.equal(ABYSS_COUNT, 25);
  assert.ok(abyssProblem(emptyHouse(), 1));
  const house = afterOne();
  assert.equal(abyssProblem(house, 1), null);
  assert.ok(abyssProblem(house, 2), 'one at a time');
  assert.ok(abyssToughness(25) > abyssToughness(1) * 20, 'exponentially harder');
  assert.ok(abyssReward(10, 0).gems > abyssReward(5, 0).gems * 5, 'and paying more and more');
  winAbyss(house, 1, () => 1);
  assert.equal(house.universe.abyssBest, 1);
  const light = grown('Light');
  const dark = grown('Dark');
  dark.race = 'voidling';
  const bout = startAbyss(1, [light, dark], { seed: 3 });
  const [l, d] = bout.fighters.filter((f) => f.team === 0);
  const foe = bout.fighters.find((f) => f.team !== 0);
  assert.equal(foe.voidGuard, ABYSS.voidGuard);
  assert.ok(Math.abs(voidFactor(l, foe.voidGuard) - (1 - ABYSS.voidGuard)) < 1e-9, 'light blood barely scratches it');
  assert.equal(voidFactor(d, foe.voidGuard), 1, 'Negative blood lands in full');
  assert.equal(voidFactor({ voidShare: 0.25 }, foe.voidGuard), 1 - ABYSS.voidGuard / 2, 'a quarter, halfway');
});

// ---------- the Negative Dimension ----------

test('an egg of the Negative decides its race, gifts and Nen type, and the light world never hatches those gifts', () => {
  assert.equal(NEG_TRAIT_IDS.length, 10);
  NEG_TRAIT_IDS.forEach((id) => {
    assert.ok(!BORN_TRAIT_IDS.includes(id) && TRAITS[id].passive && NEG_TRAIT_ODDS[id], id);
    assert.ok(clean(TRAITS[id].blurb), id);
  });
  const a = negEggFromId('0123456789abcdef');
  assert.deepEqual(a, negEggFromId('0123456789abcdef'), 'the same egg is the same egg');
  assert.ok(NEGATIVE_RACE_IDS.includes(a.race));
  const seen = new Set();
  for (let i = 0; i < 600; i++) seen.add(nenTypeOf(`egg${i}`));
  assert.equal(seen.size, 6, 'every Nen type turns up, Specialists too');
});

test('a class is for good, decides how its scores grow, and how many spells it prepares', () => {
  const nc = newNegCreature('Mage', negEggFromId('aaaaaaaaaaaaaaaa'));
  const before = negScores(nc);
  assert.ok(chooseClass(nc, 'wizard'));
  assert.equal(chooseClass(nc, 'fighter'), false, 'once');
  nc.level = 40;
  const after = negScores(nc);
  assert.ok(after.int - before.int >= 39 * CLASSES.wizard.grow.int - 1, 'a Wizard grows Intelligence');
  assert.ok(Object.values(after).every((v) => v <= 999));
  assert.equal(unlockedSpells(nc).length, 4);
  CLASSES.wizard.spells.forEach((id) => toggleSpell(nc, id));
  assert.equal(nc.spells.length, spellSlots(40));
  assert.equal(CLASS_IDS.length, 8);
  CLASS_IDS.forEach((id) => CLASSES[id].spells.forEach((s) => assert.ok(ABILITIES[s], s)));
});

test('Nen: the hexagon, aura that always adds up, vows that multiply, and only Specialists specialize', () => {
  assert.equal(affinity('enhancer', 'enhancer'), 1);
  assert.equal(affinity('enhancer', 'transmuter'), 0.8);
  assert.equal(affinity('enhancer', 'emitter'), 0.8);
  assert.equal(affinity('enhancer', 'manipulator'), 0.6);
  assert.equal(affinity('enhancer', 'specialist'), 0);
  assert.equal(affinity('specialist', 'specialist'), 1);
  const nc = newNegCreature('Gon', negEggFromId('bbbbbbbbbbbbbbbb'));
  nc.nenType = 'enhancer';
  chooseClass(nc, 'monk');
  setAlloc(nc, 'ren', 70);
  assert.equal(NEN_TECHNIQUE_IDS.reduce((s, k) => s + nc.nen.alloc[k], 0), NEN_POINTS);
  assert.equal(nc.nen.alloc.ren, 70);
  assert.ok(hatsuProblem(nc, 'specialist', 'stolentime'));
  assert.ok(setHatsu(nc, 'enhancer', 'rock', 'Jajanken'));
  const plain = hatsuDef(nc).power;
  assert.ok(toggleVow(nc, 'oath') && toggleVow(nc, 'blood') && toggleVow(nc, 'patience'));
  assert.equal(toggleVow(nc, 'cornered'), false, `at most ${MAX_VOWS}`);
  const sworn = hatsuDef(nc);
  assert.ok(Math.abs(sworn.power / plain - VOWS.oath.mul * VOWS.blood.mul * VOWS.patience.mul) < 1e-9);
  assert.ok(sworn.recoil >= 0.1 && sworn.after === 10 && sworn.name === 'Jajanken');
});

test('Alchemy: what a circle pays decides how strong it is', () => {
  const cheap = { name: '', shape: 'spike', element: 'iron', hp: 0, cd: 4, toll: 0 };
  const dear = { ...cheap, hp: 0.3, cd: 20, toll: 0.1 };
  assert.equal(circleWorth(cheap), 1);
  assert.ok(circleDef(dear, { int: 0 }).power > circleDef(cheap, { int: 0 }).power * 4);
  assert.ok(circleDef(dear, { int: 900 }).power > circleDef(dear, { int: 0 }).power, 'and Intelligence helps');
  const d = circleDef(dear, { int: 0 });
  assert.deepEqual([d.recoil, d.cd, d.toll], [0.3, 20, 0.1]);
  const nc = newNegCreature('Ed');
  assert.ok(setCircle(nc, -1, dear) && setCircle(nc, -1, cheap) && setCircle(nc, -1, cheap));
  assert.equal(setCircle(nc, -1, cheap), false, 'three at most');
  assert.equal(setCircle(nc, 0, { ...cheap, hp: 2 }), false, 'nobody pays more than it has');
});

test('a Null Field in the blood silences for 4 seconds, twice a boss\'s', () => {
  const c = wildCreature(31, 2);
  c.traits = ['nullfield'];
  const rival = wildCreature(32, 2);
  rival.traits = [];
  const bout = new Bout([c, rival], { seed: 1 });
  const [me, them] = bout.fighters;
  Object.assign(them, { x: me.x + 40, y: me.y, unstoppable: false, silence: 0 });
  me.nullClock = 0;
  bout.tickNullField(me, 0.01);
  assert.equal(them.silence, 4);
  const end = startLevel(60, [grown('A', 1), grown('B', 2), grown('C', 3)], { seed: 2 }).fighters.find((f) => f.monster);
  assert.equal(end.nullSilence, 2, 'a boss\'s Null Field is as it always was');
});

test('what you fight throws back only a tenth of what its mirror says, and your mirrors throw back all of it', () => {
  const bout = startLevel(60, [grown('A', 1), grown('B', 2), grown('C', 3)], { seed: 2 });
  const me = bout.fighters.find((f) => f.team === 0);
  const boss = bout.fighters.find((f) => f.monster);
  const foe = bout.fighters.find((f) => f.team === 1 && !f.monster);
  assert.deepEqual([me.reflectMul, boss.reflectMul, foe.reflectMul], [undefined, FOE_REFLECT, FOE_REFLECT]);
  Object.assign(me, { hp: 1e7, maxHp: 1e7, reflect: 0.5 });
  Object.assign(boss, { hp: 1e7, maxHp: 1e7, reflect: 0.5, lives: 0 });
  let before = me.hp;
  const dealt = bout.hurt(boss, 1000, me);
  assert.ok(Math.abs(before - me.hp - dealt * 0.5 * FOE_REFLECT) < 1e-6, 'the boss throws back a tenth');
  before = boss.hp;
  const taken = bout.hurt(me, 1000, boss);
  assert.ok(Math.abs(before - boss.hp - taken * 0.5) < 1e-6, 'yours throw back all of it');
  // The Negative's rings, and every monster in Challenges, the same way.
  const neg = startNegLevel(1, [wildNegCreature(4, 10)], { seed: 1 });
  assert.ok(neg.fighters.filter((f) => f.team !== 0).every((f) => f.reflectMul === FOE_REFLECT));
  assert.equal(neg.fighters.find((f) => f.team === 0).reflectMul, undefined);
  assert.equal(startChallenge(grown('D', 4), 'crab', { seed: 1 }).fighters.find((f) => f.monster).reflectMul, FOE_REFLECT);
  // In a free-for-all, nobody is the monster.
  assert.ok(new Bout([grown('E', 5), grown('F', 6)], { seed: 1 }).fighters.every((f) => f.reflectMul === undefined));
});

test('a fight in the Negative runs on numbers ten times as big', () => {
  const a = wildNegCreature(11, 30);
  const b = wildNegCreature(12, 30);
  const bout = new Bout([a, b], { seed: 4 });
  const [fa] = bout.fighters;
  assert.equal(fa.neg, a);
  assert.ok(fa.maxHp > 5000, `${fa.maxHp} health`);
  assert.equal(fa.voidShare, 1);
  const spec = negFightSpec(a);
  assert.ok(spec.moves.length >= 2);
  finishBout(bout);
  assert.ok(bout.done && bout.winner);
});

test('the Negative\'s world file is cleaned, and can\'t pick a creature\'s race or gifts', () => {
  const nc = newNegCreature('Real', negEggFromId('cccccccccccccccc'));
  const raw = JSON.parse(JSON.stringify(nc));
  raw.race = 'human';
  raw.traits = ['blacksun', 'godslayer', 'nope'];
  raw.level = 9999;
  raw.nen.alloc = { ten: 1000, ren: 1000 };
  raw.alchemy = [{ shape: 'spike', element: 'fire', hp: 5, cd: 1, toll: 9 }];
  const back = sanitizeNeg(raw);
  assert.equal(back.race, nc.race);
  assert.deepEqual(back.traits, nc.traits);
  assert.equal(back.level, NEG_MAX_LEVEL);
  assert.equal(NEN_TECHNIQUE_IDS.reduce((s, k) => s + back.nen.alloc[k], 0), NEN_POINTS);
  assert.ok(back.alchemy.every((c) => c.hp <= 0.3 && c.cd >= 4 && c.toll <= 0.1));
  const world = sanitizeNegWorld({ creatures: [raw, raw], shards: -5, adventure: { best: 99, party: [raw.id, 'ghost'] } });
  assert.equal(world.creatures.length, 1);
  assert.equal(world.shards, 0);
  assert.equal(world.adventure.best, NEG_LEVEL_COUNT);
  assert.deepEqual(world.adventure.party, [raw.id]);
});

test('its Adventure: XP win or lose, Void Shards for wins, a Death oath kept, and crossing over at the end', () => {
  const world = emptyNegWorld();
  const kept = Array.from({ length: NEG_EGG.free }, (_, i) => keepNegEgg(world, `Free${i}`));
  assert.ok(kept.every(Boolean));
  assert.equal(keepCost(world), NEG_EGG.cost, 'the free ones run out');
  assert.equal(keepNegEgg(world, 'Broke'), null, 'and then it costs Void Shards');
  const [a, b] = kept;
  chooseClass(a, 'fighter');
  chooseClass(b, 'cleric');
  const won = settleNegLevel(world, [a, b], 1, true);
  assert.ok(won.shards > 0 && won.xp > 0 && world.shards === won.shards);
  assert.equal(a.best, 1);
  assert.equal(world.adventure.best, 1);
  addNegXp(a, 5000);
  const level = a.level;
  toggleVow(a, 'oath');
  const lost = settleNegLevel(world, [a], 2, false);
  assert.equal(lost.shards, 0);
  assert.equal(a.level, level - 1, 'the oath was kept');
  assert.ok(crossProblem(a));
  a.best = NEG_LEVEL_COUNT;
  a.dye = '#123456';
  assert.equal(crossProblem(a), null);
  const light = crossOver(world, a, 5);
  assert.equal(light.race, a.race);
  assert.deepEqual(light.traits, a.traits);
  assert.equal(light.origin, 'negative');
  assert.equal(light.growth, 0, 'a Hatchling');
  assert.ok(!world.creatures.includes(a) && world.crossed.length === 1);
  assert.equal(negativeShare(light), 1);
  // And it keeps all of that in its .creature file.
  const back = parseCreature(serializeCreature(light));
  assert.deepEqual([back.race, back.origin, back.traits], [light.race, 'negative', light.traits]);
});

test('every level of its Adventure sets up a ring, the last one behind the Negative King', () => {
  const party = [wildNegCreature(1, 20), wildNegCreature(2, 20)];
  for (const n of [1, 10, 20, NEG_LEVEL_COUNT]) {
    const bout = startNegLevel(n, party, { seed: 7 });
    assert.ok(bout.fighters.some((f) => f.team === 0) && bout.fighters.some((f) => f.team !== 0), `level ${n}`);
    assert.equal(bout.negative, n);
  }
  assert.ok(startNegLevel(NEG_LEVEL_COUNT, party, { seed: 7 }).fighters.some((f) => f.monster?.name === 'The Negative King'));
  assert.ok(negLevelEnemies(29, 3).fighters.every((c) => c.level > 40));
  const bout = finishBout(startNegLevel(1, [wildNegCreature(5, 10)], { seed: 2 }));
  assert.equal(typeof negLevelWon(bout), 'boolean');
  assert.ok(NEG_SCALE >= 10);
});
