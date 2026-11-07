// What your creatures share: one bank of mined colors, dust and gems, one larder of harvested
// plants, one food store, the Devil Fruits nobody has eaten yet, and the next egg on offer. The
// village lives here too (its work, its Legendary Mine and its expeditions), along with the forge's
// ore and armory, the bag of loot, the Mega Breeder, and how far Adventure has got.
// Pure logic with no DOM, so tests can run it.
//
// A creature in the household simply uses the shared objects as its own bank, larder, fruits and
// store, so everything that mines, harvests, eats or spends works on the shared pool without knowing.

import { clamp, num } from '../lib/util.js';
import { BANK_KEYS, MAX_BANK, bankMax, CROP_IDS } from '../data/crafting.js';
import { FRUITS } from '../data/fruits.js';
import { RACES, DEFAULT_RACE } from '../data/races.js';
import { EXPEDITIONS, PARTY_MAX, EXPEDITIONS_AT_ONCE, LEGENDARY_MINE } from '../data/village.js';
import { WEAPON_IDS, MAX_ARMORY, MAX_ORE } from '../data/forge.js';
import { ITEM_IDS, MAX_ITEMS } from '../data/items.js';
import { ADVENTURE_LEVELS, ADVENTURE_PARTY, ABYSS_LEVELS, GOD_LEVELS } from '../data/adventure.js';
import { BOOSTS } from '../data/universe.js';
import { emptyBank } from './craft.js';
import { sanitizeChosen } from './chosen.js';

export const MAX_STORE = 9999;

const emptyLarder = () => Object.fromEntries(CROP_IDS.map((id) => [id, 0]));
const safeStr = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').slice(0, max);
const safeId = (v) => String(v ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
const creatureIds = (list, max) => (Array.isArray(list) ? [...new Set(list.filter((id) => typeof id === 'string').map((id) => id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)))] : []).filter(Boolean).slice(0, max);
const time = (v) => Math.max(0, num(v));
const counts = (raw, ids, max) => Object.fromEntries(ids.map((id) => [id, Math.floor(clamp(num(raw?.[id]), 0, max))]).filter(([, n]) => n > 0));

// egg is the egg on offer in the Nursery, kept here so closing the note can't roll a new one free.
export const emptyHouse = () => ({
  bank: emptyBank(),
  larder: emptyLarder(),
  store: 0,
  fruits: {},
  egg: null,
  village: { lastTick: 0, carry: {} },
  expeditions: [],
  found: [],
  // Legendary ore for the forge, the weapons nobody is carrying, and the bag of loot.
  ore: 0,
  armory: {},
  items: {},
  // The ids of the legendary Miners working the Legendary Mine.
  mine: [],
  megaBreeder: false,
  // The Bloodline Altar, and the races sacrificed on it.
  altar: false,
  altarRaces: [],
  // Creatures a Bizarre expedition took, still to be moved to the graveyard.
  lost: [],
  // The best Adventure level beaten, and the ids of the party last sent.
  adventure: { best: 0, party: [] },
  // Only after a universe reset (core/universe.js): the Deluxe Breeder, and the creature boosts
  // running, each { name, mult, until }.
  deluxeBreeder: false,
  boosts: [],
  // How many times the universe was reset, and how far Chapter ??? and the God Chapter got. A reset
  // keeps these, so God Mode, once won, stays open for good.
  universe: { resets: 0, abyssBest: 0, godBest: 0, lastReset: 0 },
  // Your Chosen (core/chosen.js): { id, attune } for the one creature your godly power runs
  // through, or null.
  chosen: null,
});

const HOUR = 3600 * 1000;

export const sanitizeUniverse = (raw) => ({
  resets: Math.floor(clamp(num(raw?.resets), 0, 1e6)),
  abyssBest: Math.floor(clamp(num(raw?.abyssBest), 0, ABYSS_LEVELS.length)),
  godBest: Math.floor(clamp(num(raw?.godBest), 0, GOD_LEVELS.length)),
  lastReset: Math.max(0, num(raw?.lastReset)),
});

// Boosts that ran out are gone; none can say it lasts longer than a boost does.
export const sanitizeBoosts = (raw, now = Date.now()) => (Array.isArray(raw) ? raw : [])
  .filter((b) => b && num(b.until) > now)
  .slice(0, BOOSTS.max)
  .map((b) => ({ name: safeStr(b.name, 60), mult: clamp(num(b.mult, 1), 1, BOOSTS.most), until: Math.min(num(b.until), now + BOOSTS.hours * HOUR) }));

// The household file can be edited by hand, so it gets cleaned like a .creature file. Old saves
// lose their hostile villages and waves, which no longer exist.
export function sanitizeHouse(raw) {
  const house = emptyHouse();
  BANK_KEYS.forEach((k) => { house.bank[k] = clamp(num(raw?.bank?.[k]), 0, bankMax(k)); });
  CROP_IDS.forEach((id) => { house.larder[id] = Math.floor(clamp(num(raw?.larder?.[id]), 0, MAX_BANK)); });
  house.store = clamp(num(raw?.store), 0, MAX_STORE);
  house.fruits = counts(raw?.fruits, Object.keys(FRUITS), 99);
  if (typeof raw?.egg?.id === 'string' && /^[a-f0-9]{16}$/.test(raw.egg.id)) house.egg = { id: raw.egg.id };
  house.village.lastTick = time(raw?.village?.lastTick);
  for (const [k, v] of Object.entries(raw?.village?.carry ?? {}).slice(0, 40)) {
    if (/^[a-z]+(:[a-z]+)?$/.test(k)) house.village.carry[k] = clamp(num(v), 0, 1);
  }
  house.expeditions = (Array.isArray(raw?.expeditions) ? raw.expeditions : [])
    .filter((e) => e && Object.hasOwn(EXPEDITIONS, e.where) && Array.isArray(e.party))
    .slice(0, EXPEDITIONS_AT_ONCE)
    .map((e) => ({
      id: safeId(e.id) || 'x',
      where: e.where,
      start: time(e.start),
      end: time(e.end),
      party: e.party.slice(0, PARTY_MAX).filter((p) => p && typeof p.base === 'string').map((p) => ({ base: safeStr(p.base, 40), name: safeStr(p.name, 60), power: clamp(num(p.power), 0, 1000) })),
      bonus: { gems: clamp(num(e.bonus?.gems), 0, 1), finds: clamp(num(e.bonus?.finds), 0, 2) },
    }));
  house.found = (Array.isArray(raw?.found) ? raw.found : [])
    .filter((f) => f && Object.hasOwn(RACES, f.race))
    .slice(0, 12)
    .map((f) => ({ race: f.race, where: Object.hasOwn(EXPEDITIONS, f.where) ? f.where : null, at: time(f.at) }));
  house.ore = Math.floor(clamp(num(raw?.ore), 0, MAX_ORE));
  house.armory = counts(raw?.armory, WEAPON_IDS, MAX_ARMORY);
  house.items = counts(raw?.items, ITEM_IDS, MAX_ITEMS);
  house.mine = creatureIds(raw?.mine, LEGENDARY_MINE.slots);
  house.megaBreeder = raw?.megaBreeder === true;
  house.altar = raw?.altar === true;
  house.altarRaces = house.altar && Array.isArray(raw?.altarRaces)
    ? [...new Set(raw.altarRaces)].filter((id) => typeof id === 'string' && Object.hasOwn(RACES, id) && id !== DEFAULT_RACE && id !== 'halfdevil')
    : [];
  house.lost = (Array.isArray(raw?.lost) ? raw.lost : [])
    .filter((l) => l && typeof l.base === 'string')
    .slice(0, 30)
    .map((l) => ({ base: safeStr(l.base, 40), by: safeStr(l.by, 60) }));
  house.adventure.best = Math.floor(clamp(num(raw?.adventure?.best), 0, ADVENTURE_LEVELS.length));
  house.adventure.party = creatureIds(raw?.adventure?.party, ADVENTURE_PARTY);
  house.universe = sanitizeUniverse(raw?.universe);
  // What only a reset opens can't be in a household that never had one.
  house.deluxeBreeder = house.universe.resets > 0 && raw?.deluxeBreeder === true;
  house.boosts = house.universe.resets > 0 ? sanitizeBoosts(raw?.boosts) : [];
  house.chosen = sanitizeChosen(raw?.chosen);
  return house;
}

// Brings a creature into the household. The first time, whatever it had of its own goes into the
// shared pool, once. From then on its bank, larder, fruits and food store are the shared ones.
export function joinHouse(house, c) {
  if (!c.household) {
    BANK_KEYS.forEach((k) => { house.bank[k] = clamp(house.bank[k] + num(c.bank?.[k]), 0, bankMax(k)); });
    CROP_IDS.forEach((id) => { house.larder[id] = Math.min(MAX_BANK, house.larder[id] + Math.floor(num(c.larder?.[id]))); });
    Object.entries(c.fruits ?? {}).forEach(([id, n]) => {
      if (Object.hasOwn(FRUITS, id)) house.fruits[id] = Math.min(99, (house.fruits[id] ?? 0) + Math.floor(num(n)));
    });
    house.store = clamp(house.store + num(c.farm.store), 0, MAX_STORE);
    c.household = true;
  }
  c.bank = house.bank;
  c.larder = house.larder;
  c.fruits = house.fruits;
  Object.defineProperty(c.farm, 'store', {
    get: () => house.store,
    set: (v) => { house.store = clamp(num(v), 0, MAX_STORE); },
    enumerable: true,
    configurable: true,
  });
  return c;
}

// The creature as its own file should hold it: what belongs to everyone stays out, so nothing can
// be counted twice if that file is ever loaded on its own.
export function withoutHouse(c) {
  if (!c.household) return c;
  return { ...c, bank: emptyBank(), larder: emptyLarder(), fruits: {}, farm: { ...c.farm, store: 0 } };
}
