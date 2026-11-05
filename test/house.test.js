// What your creatures share, and the list of chances.

import test from 'node:test';
import assert from 'node:assert/strict';

import { newCreature, parseCreature, serializeCreature, addColor, choosePath } from '../src/core/creature.js';
import { emptyHouse, sanitizeHouse, joinHouse, withoutHouse, MAX_STORE } from '../src/core/house.js';
import { pay } from '../src/core/craft.js';
import { addField, doJob, eatFromStore, eatPlant } from '../src/sim/farm.js';
import { chanceSections } from '../src/core/odds.js';
import { TRAIT_ODDS, LEGENDARY_ONE_IN, BLACK_FLASH, TECHNIQUE_IDS } from '../src/data/powers.js';
import { TRAINING_CHANCE } from '../src/data/monsters.js';
import { GEM_CHANCE, VEIN_CHANCE, MAX_BANK } from '../src/data/crafting.js';

const clean = (s) => !/undefined|NaN|null|\[object/.test(s);

test('the first time a creature joins, what it had goes into the shared pool, once', () => {
  const house = emptyHouse();
  const c = newCreature('Saver');
  c.bank.red = 40;
  c.bank.gems = 2;
  c.larder.pepper = 3;
  c.farm.store = 7;
  joinHouse(house, c);
  assert.equal(c.household, true);
  assert.deepEqual([house.bank.red, house.bank.gems, house.larder.pepper, house.store], [40, 2, 3, 7]);
  // Its bank, larder and store now are the shared ones.
  assert.equal(c.bank, house.bank);
  assert.equal(c.larder, house.larder);
  c.farm.store += 1;
  assert.equal(house.store, 8);
  // Joining again, or loading its own saved file, adds nothing more.
  joinHouse(house, c);
  const back = parseCreature(serializeCreature(withoutHouse(c)));
  assert.equal(back.household, true);
  assert.deepEqual([back.bank.red, back.larder.pepper, back.farm.store], [0, 0, 0], 'its own file holds none of the pool');
  joinHouse(house, back);
  assert.deepEqual([house.bank.red, house.bank.gems, house.larder.pepper, house.store], [40, 2, 3, 8]);
});

test('what one creature mines, grows or stores, every other one can use', () => {
  const house = emptyHouse();
  const miner = joinHouse(house, newCreature('Miner'));
  const farmer = joinHouse(house, newCreature('Farmer'));
  const nurse = joinHouse(house, newCreature('Nurse'));
  addColor(miner, 230, 40, 40, 30);
  assert.ok(farmer.bank.red >= 30, 'the miner\'s red is in the farmer\'s bank');
  assert.ok(pay(nurse, { red: 30 }), 'and the nurse can spend it');
  assert.equal(miner.bank.red, house.bank.red);
  // A harvest by the farmer feeds the miner.
  farmer.growth = 20;
  choosePath(farmer, 'farmer');
  const field = addField(farmer, { x: 100, y: 100, w: 40, h: 40 });
  assert.ok(field);
  const tile = field.tiles[0];
  tile.s = 3;
  tile.c = 'pepper';
  doJob(farmer, { kind: 'harvest', field: field.id, tile: 0, x: 0, y: 0 }, Date.now());
  assert.equal(miner.larder.pepper, 1, 'the farmer\'s harvest is in the miner\'s larder');
  miner.fullness = 20;
  assert.ok(eatPlant(miner, 'pepper', Date.now()));
  assert.equal(house.larder.pepper, 0);
  assert.ok(house.store >= 1, 'a harvest tops up the shared store');
  nurse.fullness = 10;
  assert.ok(eatFromStore(nurse));
});

test('the household file is cleaned like any file', () => {
  const house = sanitizeHouse({ bank: { red: -5, blue: 1e12, gems: 'lots', __proto__: { evil: 1 } }, larder: { pepper: 2.7, nonsense: 9 }, store: 1e9 });
  assert.equal(house.bank.red, 0);
  assert.equal(house.bank.blue, MAX_BANK);
  assert.equal(house.bank.gems, 0);
  assert.equal(house.larder.pepper, 2);
  assert.ok(!Object.hasOwn(house.larder, 'nonsense'));
  assert.equal(house.store, MAX_STORE);
  assert.deepEqual(sanitizeHouse(null), emptyHouse());
});

test('the chances list shows the real numbers, and reads properly', () => {
  const c = newCreature('Curious');
  c.traits = ['sixeyes'];
  const sections = chanceSections(c);
  const rows = sections.flatMap((s) => s.rows);
  rows.forEach((r) => assert.ok(clean(`${r.name} ${r.odds} ${r.detail}`), r.name));
  const find = (name) => rows.find((r) => r.name === name);
  assert.equal(find('Six Eyes').odds, `1 in ${TRAIT_ODDS.sixeyes}`);
  assert.ok(find('Six Eyes').has);
  assert.ok(find('Six Eyes').detail.includes(`1 in ${TRAIT_ODDS.sixeyes * TECHNIQUE_IDS.length} of all eggs`));
  assert.equal(find('Sharingan').odds, `1 in ${TRAIT_ODDS.sharingan}`);
  assert.ok(!find('Sharingan').has);
  assert.equal(find('Twin Soul').odds, `1 in ${LEGENDARY_ONE_IN}`);
  assert.equal(find('Black Flash').odds, `${Math.round(BLACK_FLASH.chance * 100)}%`);
  assert.equal(find('Training monster').odds, `${Math.round(TRAINING_CHANCE * 100)}%`);
  assert.equal(find('Gem').odds, `${Math.round(GEM_CHANCE * 100)}%`);
  assert.equal(find('Vein').odds, `${Math.round(VEIN_CHANCE * 100)}%`);
  // A Miner's job finds more gems, and the list says so.
  c.growth = 20;
  choosePath(c, 'miner');
  assert.ok(Number.parseInt(chanceSections(c).flatMap((s) => s.rows).find((r) => r.name === 'Gem').odds, 10) > GEM_CHANCE * 100);
  assert.ok(chanceSections(null).length === sections.length, 'it works without a creature too');
});
