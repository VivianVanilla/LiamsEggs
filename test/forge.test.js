// The forge and its weapons, and the bag of loot: Time Chamber Keys and Limit Expanders.

import test from 'node:test';
import assert from 'node:assert/strict';

import { newCreature, wildCreature, parseCreature, serializeCreature, mutationCap, mutationsFull, absorbFile, stageIndex, abilitiesOf } from '../src/core/creature.js';
import { emptyHouse, sanitizeHouse } from '../src/core/house.js';
import { forgeProblem, forgeWeapon, equipWeapon, unequipWeapon, armoryCount } from '../src/core/forge.js';
import { itemProblem, useItem, addItem, itemCount, rollDrops } from '../src/core/items.js';
import { breedProblem } from '../src/core/family.js';
import { buildSheet } from '../src/core/sheet.js';
import { Bout, runBout } from '../src/sim/arena.js';
import { WEAPONS, WEAPON_IDS, MAX_ARMORY } from '../src/data/forge.js';
import { ITEMS, ITEM_IDS, MAX_ITEMS, CHAMBER_STAGE, EXPANDER_SLOTS, MAX_EXPANDERS } from '../src/data/items.js';
import { MAX_MUTATIONS, MUTATION_IDS, MUTATIONS } from '../src/data/mutations.js';
import { DEADLY_MONSTERS } from '../src/data/monsters.js';
import { deadlyMonsterStats } from '../src/sim/challenges.js';

const clean = (s) => !/undefined|NaN|null|\[object/.test(s);

// ---------- the forge ----------

test('every weapon reads properly, and the dearer ones cost more of both', () => {
  WEAPON_IDS.forEach((id) => {
    const w = WEAPONS[id];
    assert.ok(w.name && clean(w.text) && /^#[0-9a-f]{6}$/i.test(w.color), id);
    assert.ok(w.ore > 0 && w.gems > 0, id);
  });
  for (let i = 1; i < WEAPON_IDS.length; i++) assert.ok(WEAPONS[WEAPON_IDS[i]].ore >= WEAPONS[WEAPON_IDS[i - 1]].ore);
  assert.equal(WEAPONS.soulsplitkatana.name, 'Soul Split Katana');
  assert.equal(WEAPONS.soulsplitkatana.gems, 500000);
});

test('forging takes ore and gems into the armory, and carrying one takes it out', () => {
  const house = emptyHouse();
  assert.match(forgeProblem(house, 'starblade'), /ore/);
  house.ore = 50;
  assert.match(forgeProblem(house, 'starblade'), /gems/);
  house.bank.gems = 50;
  assert.equal(forgeProblem(house, 'nope'), 'There is no such weapon');
  assert.ok(forgeWeapon(house, 'starblade'));
  assert.equal(house.ore, 50 - WEAPONS.starblade.ore);
  assert.equal(house.bank.gems, 50 - WEAPONS.starblade.gems);
  assert.equal(armoryCount(house, 'starblade'), 1);
  const c = newCreature('Wielder');
  assert.equal(equipWeapon(house, c, 'katana'), false, 'nothing in the armory to carry');
  assert.ok(equipWeapon(house, c, 'starblade'));
  assert.equal(c.weapon, 'starblade');
  assert.equal(armoryCount(house, 'starblade'), 0);
  // Swapping puts the old one back.
  forgeWeapon(house, 'katana');
  assert.ok(equipWeapon(house, c, 'katana'));
  assert.equal(armoryCount(house, 'starblade'), 1);
  assert.ok(unequipWeapon(house, c));
  assert.equal(c.weapon, null);
  assert.equal(armoryCount(house, 'katana'), 1);
  assert.equal(unequipWeapon(house, c), false);
  // A full armory makes no more.
  house.armory.starblade = MAX_ARMORY;
  assert.match(forgeProblem(house, 'starblade'), /full/);
});

test('the Soul Split Katana costs 500,000 gems to forge', () => {
  const house = emptyHouse();
  house.ore = WEAPONS.soulsplitkatana.ore;
  house.bank.gems = WEAPONS.soulsplitkatana.gems - 1;
  assert.match(forgeProblem(house, 'soulsplitkatana'), /500000 gems/);
  house.bank.gems += 1;
  assert.equal(forgeProblem(house, 'soulsplitkatana'), null);
  assert.equal(forgeWeapon(house, 'soulsplitkatana'), true);
  assert.equal(house.bank.gems, 0);
});

test('a weapon is saved with its creature, and a file can only claim one that exists', () => {
  const c = newCreature('Armed');
  c.weapon = 'dragonslayer';
  const back = parseCreature(serializeCreature(c));
  assert.equal(back.weapon, 'dragonslayer');
  assert.equal(JSON.parse(serializeCreature(c)).summary.weapon, WEAPONS.dragonslayer.name);
  assert.ok(buildSheet(c).some((s) => s.title === 'Weapon'));
  const raw = JSON.parse(serializeCreature(c));
  raw.weapon = 'lightsaber';
  assert.equal(parseCreature(JSON.stringify(raw)).weapon, null);
  raw.weapon = '__proto__';
  assert.equal(parseCreature(JSON.stringify(raw)).weapon, null);
  // The armory and ore survive a save, and nonsense is cleaned away.
  const house = emptyHouse();
  house.ore = 12;
  house.armory = { scythe: 2 };
  const again = sanitizeHouse(JSON.parse(JSON.stringify(house)));
  assert.deepEqual([again.ore, again.armory], [12, { scythe: 2 }]);
  assert.deepEqual(sanitizeHouse({ armory: { scythe: 1e6, laser: 4 }, ore: 1e9 }).armory, { scythe: MAX_ARMORY });
});

test('in a fight, each weapon does what it says', () => {
  const fighter = (weapon) => {
    const c = wildCreature(5, 2);
    c.weapon = weapon;
    c.traits = [];
    const bout = new Bout([c, wildCreature(6, 2)], { seed: 3 });
    return bout.fighters[0];
  };
  const bare = fighter(null);
  assert.ok(Math.abs(fighter('starblade').atk - bare.atk * (1 + WEAPONS.starblade.damage)) < 1e-9);
  assert.ok(Math.abs(fighter('katana').crit - (bare.crit + WEAPONS.katana.crit)) < 1e-9);
  // Hits that land: poison, stun, lifesteal.
  const hitWith = (weapon, rng) => {
    const c = wildCreature(7, 3);
    c.weapon = weapon;
    c.traits = [];
    c.battle.off = abilitiesOf(c);
    const rival = wildCreature(8, 1);
    rival.traits = [];
    const bout = new Bout([c, rival], { seed: 4 });
    const [me, them] = bout.fighters;
    them.dodge = 0;
    them.hp = them.maxHp = 1e6;
    me.hp = me.maxHp * 0.5;
    if (rng) bout.rand = rng;
    bout.swing(me, them);
    return { me, them };
  };
  assert.ok(hitWith('fang').them.poison, 'the Venom Fang poisons');
  assert.ok(hitWith('hammer', () => 0).them.stun > 0, 'the Thunder Hammer stuns, sometimes');
  assert.equal(hitWith('hammer', () => 0.99).them.stun, 0);
  const { me } = hitWith('scythe');
  assert.ok(me.hp > me.maxHp * 0.5, 'the Soul Reaper Scythe heals');
  // The Dragonslayer hits monsters harder.
  const slayer = wildCreature(9, 3);
  slayer.weapon = 'dragonslayer';
  const bout = new Bout([slayer], { seed: 5 });
  const dragon = bout.addMonster(DEADLY_MONSTERS.dragon, deadlyMonsterStats(DEADLY_MONSTERS.dragon, 5));
  const [mine] = bout.fighters;
  mine.crit = 0;
  dragon.dodge = 0;
  bout.rand = () => 0.5;
  const before = dragon.hp;
  bout.strike(mine, dragon, 1);
  const dealt = before - dragon.hp;
  const plainHit = mine.atk * 1 * (0.85 + 0.5 * 0.3) * (30 / (30 + dragon.def));
  assert.ok(Math.abs(dealt - plainHit * (1 + WEAPONS.dragonslayer.monster)) < 1e-6, `${dealt} against ${plainHit}`);
});

test('the Soul Split Katana gets past dodge half the time, and cuts through a quarter of Guard', () => {
  const c = wildCreature(21, 2);
  c.weapon = 'soulsplitkatana';
  c.traits = [];
  const rival = wildCreature(22, 2);
  rival.traits = [];
  const bout = new Bout([c, rival], { seed: 8 });
  const [me, them] = bout.fighters;
  me.crit = 0;
  them.dodge = 1;
  them.hp = them.maxHp = 1e9;
  const hit = (rolls) => {
    let i = 0;
    const before = them.hp;
    bout.rand = () => rolls[i++] ?? 0.5;
    bout.strike(me, them, 1);
    return before - them.hp;
  };
  assert.ok(hit([0.49, 0.5, 0.5]) > 0, 'a roll under half ignores dodge');
  assert.equal(hit([0.5, 0.5]), 0, 'half or more does not');
  // It hits as if the target had three quarters of its Guard, and a plain blade does not.
  them.dodge = 0;
  them.def = 60;
  const swing = me.atk * (0.85 + 0.5 * 0.3) * (them.takenMul ?? 1);
  const dealt = hit([0.99, 0.99, 0.5, 0.5]);
  assert.ok(Math.abs(dealt - swing * (30 / (30 + 60 * 0.75))) < 1e-6, `${dealt}`);
  me.weapon = null;
  const plain = hit([0.99, 0.5, 0.5]);
  assert.ok(Math.abs(plain - swing * (30 / (30 + 60))) < 1e-6, `${plain}`);
});

test('a weapon helps win fights, and the best ones help most', () => {
  const rate = (weapon) => {
    let wins = 0;
    for (let seed = 0; seed < 80; seed++) {
      const me = wildCreature(9000 + seed, 3);
      me.weapon = weapon;
      me.traits = [];
      const rival = wildCreature(40000 + seed, 3);
      rival.traits = [];
      if (runBout(seed % 2 ? [rival, me] : [me, rival], seed + 1).winner?.c === me) wins++;
    }
    return wins / 80;
  };
  const none = rate(null);
  const best = rate('dragonslayer');
  assert.ok(best > none + 0.08, `${best} against ${none}`);
  WEAPON_IDS.forEach((id) => assert.ok(rate(id) >= none - 0.02, id));
});

// ---------- loot ----------

test('every item reads properly, and the bag keeps count, up to a limit', () => {
  ITEM_IDS.forEach((id) => assert.ok(ITEMS[id].name && clean(ITEMS[id].text), id));
  const house = emptyHouse();
  assert.equal(itemCount(house, 'chamber'), 0);
  addItem(house, 'chamber', 3);
  addItem(house, 'nonsense');
  assert.deepEqual(house.items, { chamber: 3 });
  addItem(house, 'chamber', 500);
  assert.equal(itemCount(house, 'chamber'), MAX_ITEMS);
  assert.deepEqual(rollDrops({ chamber: 1, expander: 0, fake: 1 }, () => 0.5), ['chamber']);
});

test('a Time Chamber Key grows a hatchling straight up to Grown and fed, ready to breed', () => {
  const house = emptyHouse();
  const baby = newCreature('Tiny');
  baby.fullness = 5;
  assert.match(itemProblem(house, 'chamber', baby), /no Time Chamber/);
  addItem(house, 'chamber', 1);
  assert.match(breedProblem(baby), /has to be a/);
  assert.ok(useItem(house, 'chamber', baby));
  assert.equal(stageIndex(baby), CHAMBER_STAGE);
  assert.equal(breedProblem(baby), null, 'old enough and fed enough to breed');
  assert.equal(itemCount(house, 'chamber'), 0);
  // Not on something already that big, and not on the dead.
  addItem(house, 'chamber', 2);
  assert.match(itemProblem(house, 'chamber', baby), /already Grown/);
  const elder = newCreature('Old');
  elder.growth = 500;
  assert.match(itemProblem(house, 'chamber', elder), /already/);
  const ghost = newCreature('Ghost');
  ghost.dead = { at: 1, by: 'x' };
  assert.match(itemProblem(house, 'chamber', ghost), /living/);
  assert.equal(useItem(house, 'chamber', ghost), false);
  assert.equal(itemCount(house, 'chamber'), 2);
});

test('a Limit Expander makes room for 2 more mutations, twice at most, and that survives a save', () => {
  const house = emptyHouse();
  addItem(house, 'expander', 5);
  const c = newCreature('Mutant');
  assert.equal(mutationCap(c), MAX_MUTATIONS);
  c.mutations = MUTATION_IDS.slice(0, MAX_MUTATIONS).map((id) => ({ id, from: '', at: 0 }));
  assert.ok(mutationsFull(c));
  assert.ok(useItem(house, 'expander', c));
  assert.equal(mutationCap(c), MAX_MUTATIONS + EXPANDER_SLOTS);
  assert.ok(!mutationsFull(c));
  // It really grows new ones again.
  const family = MUTATIONS[MUTATION_IDS.find((id) => !c.mutations.some((m) => m.id === id))].family;
  c.essence[family] = 0;
  let grew = null;
  for (let i = 0; i < 400 && !grew; i++) grew = absorbFile(c, { ext: family, name: `f${i}`, sha: `${(i + 1).toString(16).padStart(8, '0')}abcdef12`, size: 4096, snippet: '' }).mutation;
  assert.ok(grew, 'a new mutation grew past the old limit');
  assert.ok(useItem(house, 'expander', c));
  assert.equal(c.expanders, MAX_EXPANDERS);
  assert.match(itemProblem(house, 'expander', c), /already taken/);
  const back = parseCreature(serializeCreature(c));
  assert.equal(back.expanders, MAX_EXPANDERS);
  assert.equal(back.mutations.length, c.mutations.length, 'a save keeps every mutation it has room for');
  // A file can't claim more expanders, or more mutations, than it could have.
  const raw = JSON.parse(serializeCreature(c));
  raw.expanders = 50;
  assert.equal(parseCreature(JSON.stringify(raw)).expanders, MAX_EXPANDERS);
  raw.expanders = 0;
  assert.equal(parseCreature(JSON.stringify(raw)).mutations.length, Math.min(c.mutations.length, MAX_MUTATIONS));
});
