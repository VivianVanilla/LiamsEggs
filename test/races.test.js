// What races do in a fight and at home, the gifts a creature earns, Malevolent Soul with a Devil
// Fruit, and hurrying an expedition home with plants.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  newCreature, wildCreature, parseCreature, serializeCreature, racePassive, raceVillage, abilitiesOf, fruitProblem, eatFruit, canAwakenStand,
  canLearnTechnique, choosePath, STAGES, TRAINING_LIMIT,
} from '../src/core/creature.js';
import { emptyHouse } from '../src/core/house.js';
import { earnTraits, earnProgress, stillToEarn } from '../src/core/earned.js';
import { giftsOf } from '../src/core/family.js';
import { workOf, partyBonus, startExpedition, expeditionHaul, hurryExpedition, hurryProblem, hurryCost, larderTotal, finishExpeditions } from '../src/core/village.js';
import { Bout } from '../src/sim/arena.js';
import { RACES, RACE_IDS, WILD_RACES } from '../src/data/races.js';
import { ABILITIES } from '../src/data/paths.js';
import { TRAITS, EARNED_TRAIT_IDS, EARN_RULES, BORN_TRAIT_IDS, EIGHT_GATES, DOMAIN } from '../src/data/powers.js';
import { EXPEDITIONS, HURRY_PLANTS, VILLAGE_WORK } from '../src/data/village.js';
import { CROP_IDS } from '../src/data/crafting.js';

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

// A fighter with no moves, so only what is being tested changes anything.
function fighter(extra = {}, seed = 5) {
  const c = wildCreature(seed, 2);
  c.traits = [];
  c.race = 'human';
  Object.assign(c, extra);
  c.battle.off = abilitiesOf(c);
  return c;
}

// ---------- races ----------

test('every race reads properly: a move, a passive and a specialty, and where it comes from', () => {
  for (const id of RACE_IDS) {
    const r = RACES[id];
    assert.ok(r.name && clean(r.blurb) && clean(r.from), id);
    if (r.move) assert.ok(ABILITIES[r.move], `${id} move`);
    if (r.passive) assert.ok(clean(r.passive.text), `${id} passive`);
    if (r.village) assert.ok(clean(r.village.text), `${id} specialty`);
  }
  for (const id of ['human', 'giant', 'fishman', 'mink', 'lunarian', 'tontatta', 'longarm', 'skypiean', 'devil']) {
    assert.ok(RACES[id].village, `${id} has a specialty`);
    if (id !== 'human') assert.ok(RACES[id].passive, `${id} has a passive`);
  }
});

test('a race only brings its passive and specialty at half or more, or pure-blooded', () => {
  const giant = grown('Big', { race: 'giant' });
  assert.equal(racePassive(giant).taken, RACES.giant.passive.taken);
  assert.equal(raceVillage(giant).colors, RACES.giant.village.colors);
  const half = grown('Half', { heritage: { giant: 0.5, human: 0.5 } });
  assert.equal(racePassive(half).taken, RACES.giant.passive.taken);
  assert.equal(raceVillage(half).work, RACES.human.village.work, 'and the Human half works hard');
  const quarter = grown('Quarter', { heritage: { giant: 0.25, human: 0.75 } });
  assert.equal(racePassive(quarter).taken, 0);
  quarter.pureBlood = true;
  assert.equal(racePassive(quarter).taken, RACES.giant.passive.taken, 'a Pure-blood has all of every race');
});

test('races change a fight: Giants take less, Fish-men last longer, Minks dodge, Lunarians shrug off poison', () => {
  const human = new Bout([fighter(), fighter({}, 6)], { seed: 2 }).fighters[0];
  const giant = new Bout([fighter({ race: 'giant' }), fighter({}, 6)], { seed: 2 }).fighters[0];
  assert.ok(giant.takenMul < human.takenMul);
  const fish = new Bout([fighter({ race: 'fishman' }), fighter({}, 6)], { seed: 2 }).fighters[0];
  assert.ok(fish.maxHp > human.maxHp);
  const mink = new Bout([fighter({ race: 'mink' }), fighter({}, 6)], { seed: 2 }).fighters[0];
  assert.ok(mink.dodge > human.dodge);
  const longarm = new Bout([fighter({ race: 'longarm' }), fighter({}, 6)], { seed: 2 }).fighters[0];
  assert.ok(longarm.reach > 0);
  const bout = new Bout([fighter({ race: 'lunarian' }), fighter({}, 6)], { seed: 2 });
  const [moon, rival] = bout.fighters;
  bout.riders(rival, moon, { poison: 0.5, poisonFor: 4 });
  assert.equal(moon.poison, null, 'poison can\'t touch a Lunarian');
});

test('a Devil heals whenever something on the other side goes down', () => {
  const bout = new Bout([fighter({ race: 'devil' }), fighter({}, 6), fighter({}, 7)], { seed: 3 });
  const [devil, a] = bout.fighters;
  bout.fighters.forEach((f, i) => { f.team = i === 0 ? 0 : 1; });
  devil.hp = devil.maxHp * 0.5;
  a.def = 0;
  bout.hurt(a, a.maxHp * 10, devil);
  assert.ok(devil.hp > devil.maxHp * 0.5, `${devil.hp / devil.maxHp}`);
});

test('races at home: Humans work harder, Giants dig more, Tontattas farm more, Fish-men fish', () => {
  const job = (race, path) => {
    const c = grown(`${race} ${path}`, { race });
    choosePath(c, path);
    return workOf(c);
  };
  assert.ok(job('human', 'miner').colors > job('mink', 'miner').colors, 'a Human out-digs a Mink');
  assert.ok(job('giant', 'miner').colors > job('mink', 'miner').colors, 'a Giant out-digs a Mink');
  assert.ok(job('tontatta', 'farmer').plants > job('mink', 'farmer').plants);
  assert.ok(job('fishman', 'miner').store > 0, 'a Fish-man brings food home from any job');
  assert.ok(job('devil', 'farmer').gems > 0, 'and a Devil makes deals for gems');
  assert.equal(job('mink', 'miner').colors, VILLAGE_WORK.mine.colors, 'a Mink just does its job');
});

test('races on an expedition: a Mink gets home sooner, a Long-arm brings more, a Skypiean finds more', () => {
  const house = emptyHouse();
  const mink = grown('Zip', { race: 'mink' });
  const exp = startExpedition(house, 'sea', [{ base: 'Zip', c: mink }], NOW);
  assert.equal(exp.end - exp.start, EXPEDITIONS.sea.hours * HOUR * (1 - RACES.mink.village.expedition));
  assert.deepEqual(partyBonus([{ c: grown('A', { race: 'longarm' }) }, { c: grown('B', { race: 'longarm' }) }]).gems, RACES.longarm.village.expeditionGems, 'the best of each, never added up');
  let plain = 0;
  let sky = 0;
  for (let i = 0; i < 4000; i++) {
    const base = { id: `x${i}`, where: 'sky', start: NOW + i, end: NOW + i, party: [{ base: 'a', name: 'A', power: 50 }] };
    if (expeditionHaul({ ...base, bonus: { gems: 0, finds: 0 } }).find) plain++;
    if (expeditionHaul({ ...base, bonus: { gems: 0, finds: RACES.skypiean.village.finds } }).find) sky++;
  }
  assert.ok(sky > plain * 1.6, `${sky} against ${plain}`);
});

test('seasoned wild rivals turn up as every race, but hatchlings are always Human', () => {
  const seen = new Set();
  for (let seed = 0; seed < 3000; seed++) {
    seen.add(wildCreature(seed, 3).race);
    assert.equal(wildCreature(seed, 1).race, 'human');
  }
  Object.keys(WILD_RACES[3]).forEach((id) => assert.ok(seen.has(id), id));
});

// ---------- earned gifts ----------

test('earned gifts read properly, and say how to earn them', () => {
  assert.equal(EARNED_TRAIT_IDS.length, 6);
  EARNED_TRAIT_IDS.forEach((id) => {
    assert.ok(TRAITS[id].earned && clean(TRAITS[id].blurb) && clean(EARN_RULES[id].how), id);
    assert.ok(!BORN_TRAIT_IDS.includes(id), `${id} is never born`);
  });
});

test('each gift is earned by doing its thing, once', () => {
  const c = grown('Doer');
  assert.deepEqual(earnTraits(c), []);
  assert.equal(stillToEarn(c).length, 6);
  c.record.arenaWins = 15;
  assert.deepEqual(earnTraits(c), ['observation']);
  assert.deepEqual(earnTraits(c), [], 'only once');
  c.record.plantsEaten = 50;
  c.training.might = TRAINING_LIMIT;
  c.training.speed = TRAINING_LIMIT;
  c.training.wits = TRAINING_LIMIT;
  assert.deepEqual(earnTraits(c).sort(), ['eightgates', 'gourmet']);
  c.trophies = ['rat', 'scorpion', 'spider'];
  assert.equal(earnProgress(c, 'domain').done, false, 'a domain needs a cursed technique too');
  c.powers.technique = c.lineage;
  assert.deepEqual(earnTraits(c), ['domain']);
  const back = parseCreature(serializeCreature(c));
  assert.ok(['observation', 'gourmet', 'eightgates', 'domain'].every((id) => back.traits.includes(id)), 'they last through a save');
});

test('earned gifts never pass on to a baby', () => {
  const a = grown('Earner');
  a.traits = ['observation', 'sharingan'];
  const keys = giftsOf(a, grown('Other')).map((g) => g.key);
  assert.ok(keys.includes('trait:sharingan'));
  assert.ok(!keys.includes('trait:observation'));
});

test('in a fight: the gates open low, the domain opens on time, and the Will of D. shrugs off a stun', () => {
  const bout = new Bout([fighter({ traits: ['eightgates', 'domain', 'willofd'] }), fighter({}, 6)], { seed: 4 });
  const [me, them] = bout.fighters;
  me.def = 0;
  const { atk } = me;
  bout.hurt(me, me.maxHp * 0.8, null);
  assert.equal(me.gates, 'on');
  assert.ok(Math.abs(me.atk - atk * (1 + EIGHT_GATES.damage)) < 1e-9);
  bout.stunFor(me, 2);
  assert.equal(me.stun, 0, 'the first stun is shrugged off');
  bout.stunFor(me, 2);
  assert.equal(me.stun, 2, 'the second one lands');
  me.hp = me.maxHp = them.hp = them.maxHp = 1e7;
  me.stun = them.stun = 100;
  for (let i = 0; i < (DOMAIN.at + 0.5) * 30; i++) bout.tick(1 / 30);
  assert.equal(me.domain, 'on');
  assert.ok(me.domainUntil > bout.t);
  them.dodge = 1;
  const before = them.hp;
  bout.strike(me, them, 1);
  assert.ok(them.hp < before, 'nothing dodges inside a domain');
});

// ---------- Malevolent Soul with a Devil Fruit ----------

test('a Malevolent Soul can hold a Stand and a Devil Fruit, but a fruit still goes with nothing else', () => {
  const evil = grown('Evil', { legendary: 'malevolentsoul' });
  evil.training.vigor = 40;
  evil.essence.sap = 200;
  evil.powers.stand = 'theworld';
  assert.equal(fruitProblem(evil), null, 'a Stand and a fruit');
  assert.ok(eatFruit(evil, 'mera'));
  assert.equal(parseCreature(serializeCreature(evil)).powers.fruit, 'mera', 'and a save keeps both');
  assert.equal(parseCreature(serializeCreature(evil)).powers.stand, 'theworld');
  // Fruit first, then a Stand.
  const later = grown('Later', { legendary: 'malevolentsoul' });
  later.training.vigor = 40;
  later.essence.sap = 200;
  assert.ok(eatFruit(later, 'gomu'));
  later.training.wits = 40;
  later.essence.ink = 200;
  assert.ok(canAwakenStand(later), 'a Stand can still come after the fruit');
  later.training.might = 40;
  later.essence.ember = 200;
  assert.equal(canLearnTechnique(later), false, 'but not a technique: that is the fruit\'s place');
  // A technique and a fruit together is still too much, and so is a fruit for a Twin Soul.
  const both = grown('Both', { legendary: 'malevolentsoul' });
  both.training.vigor = 40;
  both.essence.sap = 200;
  both.powers.technique = both.lineage;
  assert.match(fruitProblem(both), /only makes room for a Devil Fruit beside a Stand/);
  const twin = grown('Twin', { legendary: 'twinsoul' });
  twin.training.vigor = 40;
  twin.essence.sap = 200;
  twin.powers.stand = 'theworld';
  assert.match(fruitProblem(twin), /can't go with any other/);
  const raw = JSON.parse(serializeCreature(twin));
  raw.powers.fruit = 'mera';
  assert.equal(parseCreature(JSON.stringify(raw)).powers.fruit, null, 'a Twin Soul file can\'t claim one beside its Stand');
});

// ---------- hurrying an expedition home ----------

test('plants from the larder bring an expedition home sooner: 200 for every hour', () => {
  const house = emptyHouse();
  const exp = startExpedition(house, 'sea', [{ base: 'a', c: grown('Walker') }], NOW);
  assert.equal(hurryCost(HOUR), HURRY_PLANTS);
  assert.match(hurryProblem(house, exp, HOUR, NOW), /plants/);
  house.larder[CROP_IDS[0]] = 150;
  house.larder[CROP_IDS[1]] = 400;
  const res = hurryExpedition(house, exp.id, HOUR, NOW);
  assert.deepEqual(res, { cut: HOUR, cost: HURRY_PLANTS });
  assert.equal(larderTotal(house), 350);
  assert.equal(house.larder[CROP_IDS[1]], 200, 'from the biggest pile first');
  assert.equal(exp.end - exp.start, (EXPEDITIONS.sea.hours - 1) * HOUR);
  // Never past now: the last bit costs its share of an hour.
  const left = exp.end - (NOW + 4.5 * HOUR);
  assert.equal(left, 0.5 * HOUR);
  const last = hurryExpedition(house, exp.id, 5 * HOUR, NOW + 4.5 * HOUR);
  assert.deepEqual(last, { cut: 0.5 * HOUR, cost: HURRY_PLANTS / 2 });
  assert.equal(finishExpeditions(house, NOW + 4.5 * HOUR).length, 1, 'and it is home');
  assert.match(hurryProblem(house, exp, HOUR, NOW + 5 * HOUR), /on their way home|not out/);
});
