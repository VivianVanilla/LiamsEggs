// The village: everyone not out on your screen lives here and works for the pool you all share.
// Legendary Miners can work the Legendary Mine for ore instead, and expeditions leave from here.
// Pure logic with no DOM, so tests can run it. Everything it changes lives in the household
// (core/house.js).

import { clamp, hashStr, makeRng } from '../lib/util.js';
import { stageIndex, powerOf, perksOf, fullName, newCreature, isFinalForm } from './creature.js';
import { MAX_STORE } from './house.js';
import { addItem, rollDrops } from './items.js';
import { PATHS } from '../data/paths.js';
import { PIGMENT_IDS, CROP_IDS, MAX_BANK, familyOfBin } from '../data/crafting.js';
import { FRUIT_IDS, FRUIT_FROM_HARVEST, FRUIT_FROM_EXPEDITION } from '../data/fruits.js';
import { MAX_ORE } from '../data/forge.js';
import {
  VILLAGE_WORK, WORK_PER_STAGE, MAX_CARE_BOOST, VILLAGE_CATCHUP_HOURS, LEGENDARY_MINE, EXPEDITIONS, PARTY_MAX, EXPEDITIONS_AT_ONCE,
  PARTY_GEMS_PER_100,
} from '../data/village.js';

const HOUR = 3600 * 1000;
const between = (rng, [lo, hi]) => lo + Math.floor(rng() * (hi - lo + 1));
const pickFruit = (rng) => FRUIT_IDS[Math.floor(rng() * FRUIT_IDS.length) % FRUIT_IDS.length];
const addFruit = (house, id) => { house.fruits[id] = Math.min(99, (house.fruits[id] ?? 0) + 1); };

// ---------- working ----------

export const workKind = (c) => PATHS[c.path.line[0]]?.activity ?? 'none';
const stageFactor = (c) => Math.max(0.25, 1 + (stageIndex(c) - 3) * WORK_PER_STAGE);

// The color family it has mined most, which is what it digs up in the village too.
function favouriteColor(c) {
  let best = 0;
  let family = PIGMENT_IDS[hashStr(`${c.id}:color`) % PIGMENT_IDS.length];
  c.palette.hues.forEach((h, bin) => {
    if (h.n > best) {
      best = h.n;
      family = familyOfBin(bin);
    }
  });
  return family;
}
const favouriteCrop = (c) => c.farm.fields[0]?.crop ?? CROP_IDS[hashStr(`${c.id}:crop`) % CROP_IDS.length];

// What one villager brings in each hour, before the nurses' help. One working the Legendary Mine
// brings up ore and nothing else.
export function workOf(c, inMine = false) {
  const kind = inMine ? 'legendary' : workKind(c);
  const w = inMine ? {} : VILLAGE_WORK[kind] ?? VILLAGE_WORK.none;
  const k = stageFactor(c);
  return {
    kind,
    colors: (w.colors ?? 0) * k,
    color: favouriteColor(c),
    gems: (w.gems ?? 0) * k * (1 + perksOf(c).gemChance * 4),
    store: (w.store ?? 0) * k,
    plants: (w.plants ?? 0) * k,
    crop: favouriteCrop(c),
    ore: inMine ? LEGENDARY_MINE.ore * k : 0,
    boost: w.boost ?? 0,
  };
}

const careBoost = (works) => Math.min(MAX_CARE_BOOST, works.reduce((s, w) => s + w.boost, 0));
const worksOf = (list, mine) => list.map((c) => workOf(c, mine.includes(c.id)));

// The whole village, per hour. mine is the ids working the Legendary Mine.
export function villageOutput(list, mine = []) {
  const works = worksOf(list, mine);
  const boost = careBoost(works);
  const total = { colors: 0, gems: 0, store: 0, plants: 0, ore: 0, boost };
  works.forEach((w) => {
    ['colors', 'gems', 'store', 'plants', 'ore'].forEach((k) => { total[k] += w[k]; });
  });
  ['colors', 'gems', 'store', 'plants', 'ore'].forEach((k) => { total[k] *= 1 + boost; });
  return total;
}

// How many hours of work are due since the last time, counting at most a few while it was closed.
export function hoursDue(house, now) {
  const last = house.village.lastTick || now;
  house.village.lastTick = now;
  return Math.min(VILLAGE_CATCHUP_HOURS, Math.max(0, (now - last) / HOUR));
}

// Puts this many hours of village work into the shared pool. Fractions carry over to next time, so
// a little every minute adds up exactly. Every plant harvested has the farming chance of a fruit.
export function runVillage(house, list, hours, rng = Math.random) {
  const works = worksOf(list, house.mine ?? []);
  const boost = 1 + careBoost(works);
  const carry = house.village.carry;
  const take = (key, amount) => {
    carry[key] = (carry[key] ?? 0) + amount;
    const whole = Math.floor(carry[key]);
    carry[key] -= whole;
    return whole;
  };
  const gained = { colors: 0, gems: 0, store: 0, plants: 0, ore: 0, fruits: [] };
  for (const w of works) {
    const colors = take(`color:${w.color}`, w.colors * boost * hours);
    house.bank[w.color] = clamp(house.bank[w.color] + colors, 0, MAX_BANK);
    gained.colors += colors;
    const plants = take(`plant:${w.crop}`, w.plants * boost * hours);
    house.larder[w.crop] = Math.min(MAX_BANK, house.larder[w.crop] + plants);
    gained.plants += plants;
    for (let i = 0; i < plants; i++) {
      if (rng() < FRUIT_FROM_HARVEST) {
        const fruit = pickFruit(rng);
        addFruit(house, fruit);
        gained.fruits.push(fruit);
      }
    }
  }
  gained.gems = take('gems', works.reduce((s, w) => s + w.gems, 0) * boost * hours);
  house.bank.gems = clamp(house.bank.gems + gained.gems, 0, MAX_BANK);
  gained.store = take('store', works.reduce((s, w) => s + w.store, 0) * boost * hours);
  house.store = clamp(house.store + gained.store, 0, MAX_STORE);
  gained.ore = take('ore', works.reduce((s, w) => s + w.ore, 0) * boost * hours);
  house.ore = clamp((house.ore ?? 0) + gained.ore, 0, MAX_ORE);
  return gained;
}

// ---------- the Legendary Mine ----------

// A Miner in its final form, or a Miner with a Legendary mutation.
export const isLegendaryMiner = (c) => !c.dead && workKind(c) === 'mine' && (isFinalForm(c) || !!c.legendary);

// Why this one can't start working the Legendary Mine, or null if it can.
export function mineProblem(house, c) {
  if (c.dead) return `${c.name} is gone`;
  if (house.mine.includes(c.id)) return `${c.name} already works there`;
  if (!isLegendaryMiner(c)) return 'Only legendary Miners can work it: a Miner in its final form, or one with a Legendary mutation';
  if (house.mine.length >= LEGENDARY_MINE.slots) return `It only has room for ${LEGENDARY_MINE.slots}`;
  return null;
}

export function joinMine(house, c) {
  if (mineProblem(house, c)) return false;
  house.mine.push(c.id);
  return true;
}

export function leaveMine(house, id) {
  house.mine = house.mine.filter((x) => x !== id);
}

// Lets go of anyone who is gone, or no longer a legendary Miner. everyone is every creature you have.
export function tidyMine(house, everyone) {
  const ok = new Set(everyone.filter(isLegendaryMiner).map((c) => c.id));
  const before = house.mine.length;
  house.mine = house.mine.filter((id) => ok.has(id));
  return house.mine.length !== before;
}

// ---------- expeditions ----------

export const awayBases = (house) => new Set(house.expeditions.flatMap((e) => e.party.map((m) => m.base)));

// Why this party can't set off, or null if it can. party: [{ base, c }].
export function expeditionProblem(house, where, party) {
  if (!Object.hasOwn(EXPEDITIONS, where)) return 'There is nowhere like that';
  if (!party.length) return 'Pick who goes first';
  if (party.length > PARTY_MAX) return `At most ${PARTY_MAX} go together`;
  if (house.expeditions.length >= EXPEDITIONS_AT_ONCE) return `At most ${EXPEDITIONS_AT_ONCE} expeditions can be out at once`;
  if (party.some((p) => p.c.dead)) return 'Someone in that party is gone';
  const away = awayBases(house);
  if (party.some((p) => away.has(p.base))) return 'Someone in that party is already away';
  if (party.some((p) => (house.mine ?? []).includes(p.c.id))) return 'Someone in that party is working the Legendary Mine';
  return null;
}

export function startExpedition(house, where, party, now = Date.now()) {
  if (expeditionProblem(house, where, party)) return null;
  const exp = {
    id: `${now.toString(36)}${house.expeditions.length}`,
    where,
    start: now,
    end: now + EXPEDITIONS[where].hours * HOUR,
    party: party.map((p) => ({ base: p.base, name: fullName(p.c), power: powerOf(p.c) })),
  };
  house.expeditions.push(exp);
  return exp;
}

// What a party brings home: gems, sometimes a creature of another race, now and then loot, and
// very rarely a Devil Fruit. The same expedition always brings back the same thing.
export function expeditionHaul(exp) {
  const rng = makeRng(hashStr(`${exp.id}:${exp.start}:haul`));
  const place = EXPEDITIONS[exp.where];
  const power = exp.party.reduce((s, p) => s + p.power, 0);
  const gems = between(rng, place.gems) + Math.floor((power / 100) * PARTY_GEMS_PER_100);
  const roll = rng();
  let find = null;
  let edge = 0;
  for (const [race, chance] of Object.entries(place.finds)) {
    edge += chance;
    if (roll < edge) {
      find = race;
      break;
    }
  }
  const fruit = rng() < FRUIT_FROM_EXPEDITION ? pickFruit(rng) : null;
  const items = rollDrops(place.items, rng);
  return { gems, find, fruit, items };
}

// Brings home every expedition that is due. Gems, fruits and loot go straight into the pool; a
// creature they found waits in house.found until you name it.
export function finishExpeditions(house, now = Date.now()) {
  const done = house.expeditions.filter((e) => e.end <= now);
  if (!done.length) return [];
  house.expeditions = house.expeditions.filter((e) => e.end > now);
  return done.map((exp) => {
    const haul = expeditionHaul(exp);
    house.bank.gems = clamp(house.bank.gems + haul.gems, 0, MAX_BANK);
    if (haul.fruit) addFruit(house, haul.fruit);
    haul.items.forEach((id) => addItem(house, id));
    if (haul.find) house.found.push({ race: haul.find, where: exp.where, at: now });
    return { exp, ...haul };
  });
}

// A creature an expedition found, named and ready to live in the village.
export function takeFound(house, index, name, now = Date.now()) {
  const found = house.found[index];
  if (!found) return null;
  house.found.splice(index, 1);
  const c = newCreature(name, now);
  c.race = found.race;
  return c;
}
