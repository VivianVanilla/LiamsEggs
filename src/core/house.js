// What your creatures share: one bank of mined colors, dust and gems, one larder of harvested
// plants, one food store, the Devil Fruits nobody has eaten yet, and the next egg on offer. The
// village lives here too: its work, its expeditions, and with hostile mode on, its raids.
// Pure logic with no DOM, so tests can run it.
//
// A creature in the household simply uses the shared objects as its own bank, larder, fruits and
// store, so everything that mines, harvests, eats or spends works on the shared pool without knowing.

import { clamp, num } from '../lib/util.js';
import { BANK_KEYS, MAX_BANK, CROP_IDS } from '../data/crafting.js';
import { FRUITS } from '../data/fruits.js';
import { RACES } from '../data/races.js';
import { EXPEDITIONS, PARTY_MAX, EXPEDITIONS_AT_ONCE, HOSTILE_VILLAGES } from '../data/village.js';
import { emptyBank } from './craft.js';

export const MAX_STORE = 9999;

const emptyLarder = () => Object.fromEntries(CROP_IDS.map((id) => [id, 0]));
const safeStr = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').slice(0, max);
const safeId = (v) => String(v ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
const time = (v) => Math.max(0, num(v));

// egg is the egg on offer in the Roll note, kept here so closing the note can't roll a new one free.
export const emptyHouse = () => ({
  bank: emptyBank(),
  larder: emptyLarder(),
  store: 0,
  fruits: {},
  egg: null,
  village: { lastTick: 0, carry: {} },
  expeditions: [],
  found: [],
  hostile: { on: false, villages: [], nextRaid: 0, restUntil: 0, log: [] },
  waves: { best: 0 },
});

// The household file can be edited by hand, so it gets cleaned like a .creature file.
export function sanitizeHouse(raw) {
  const house = emptyHouse();
  BANK_KEYS.forEach((k) => { house.bank[k] = clamp(num(raw?.bank?.[k]), 0, MAX_BANK); });
  CROP_IDS.forEach((id) => { house.larder[id] = Math.floor(clamp(num(raw?.larder?.[id]), 0, MAX_BANK)); });
  house.store = clamp(num(raw?.store), 0, MAX_STORE);
  Object.keys(FRUITS).forEach((id) => {
    const n = Math.floor(clamp(num(raw?.fruits?.[id]), 0, 99));
    if (n) house.fruits[id] = n;
  });
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
    }));
  house.found = (Array.isArray(raw?.found) ? raw.found : [])
    .filter((f) => f && Object.hasOwn(RACES, f.race))
    .slice(0, 12)
    .map((f) => ({ race: f.race, where: Object.hasOwn(EXPEDITIONS, f.where) ? f.where : null, at: time(f.at) }));
  const hostile = raw?.hostile ?? {};
  house.hostile.on = hostile.on === true;
  house.hostile.villages = house.hostile.on && Array.isArray(hostile.villages)
    ? hostile.villages.slice(0, HOSTILE_VILLAGES).filter((v) => v && typeof v.name === 'string').map((v) => ({
      id: safeId(v.id) || 'v', name: safeStr(v.name, 40), power: clamp(num(v.power, 50), 1, 100000), raidedAt: time(v.raidedAt),
    }))
    : [];
  house.hostile.nextRaid = time(hostile.nextRaid);
  house.hostile.restUntil = time(hostile.restUntil);
  house.hostile.log = (Array.isArray(hostile.log) ? hostile.log : []).slice(-20).filter((l) => l && typeof l.text === 'string').map((l) => ({ at: time(l.at), text: safeStr(l.text, 200) }));
  house.waves.best = Math.floor(clamp(num(raw?.waves?.best), 0, 999));
  return house;
}

// Brings a creature into the household. The first time, whatever it had of its own goes into the
// shared pool, once. From then on its bank, larder, fruits and food store are the shared ones.
export function joinHouse(house, c) {
  if (!c.household) {
    BANK_KEYS.forEach((k) => { house.bank[k] = clamp(house.bank[k] + num(c.bank?.[k]), 0, MAX_BANK); });
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
