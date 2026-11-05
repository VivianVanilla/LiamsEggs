// The village: everyone not out on your screen lives here and works for the pool you all share.
// Expeditions leave from it, and with hostile mode on, raids come at it. Pure logic with no DOM, so
// tests can run it. Everything it changes lives in the household (core/house.js).

import { clamp, hashStr, makeRng } from '../lib/util.js';
import { stageIndex, powerOf, perksOf, fullName, newCreature } from './creature.js';
import { MAX_STORE } from './house.js';
import { PATHS } from '../data/paths.js';
import { PIGMENT_IDS, CROP_IDS, MAX_BANK, familyOfBin } from '../data/crafting.js';
import { FRUIT_IDS, FRUIT_FROM_HARVEST, FRUIT_FROM_EXPEDITION } from '../data/fruits.js';
import {
  VILLAGE_WORK, WORK_PER_STAGE, MAX_CARE_BOOST, VILLAGE_CATCHUP_HOURS, EXPEDITIONS, PARTY_MAX, EXPEDITIONS_AT_ONCE, PARTY_GEMS_PER_100,
  HOSTILE_VILLAGES, HOSTILE_NAMES, HOSTILE_START, HOSTILE_GROWTH_PER_DAY, RAID_EVERY_HOURS, RAID_LOSS, RAID_LOOT, RAID_KNOCKBACK, RAID_REST_HOURS,
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

// What one villager brings in each hour, before the nurses' help.
export function workOf(c) {
  const kind = workKind(c);
  const w = VILLAGE_WORK[kind] ?? VILLAGE_WORK.none;
  const k = stageFactor(c);
  return {
    kind,
    colors: (w.colors ?? 0) * k,
    color: favouriteColor(c),
    gems: (w.gems ?? 0) * k * (1 + perksOf(c).gemChance * 4),
    store: (w.store ?? 0) * k,
    plants: (w.plants ?? 0) * k,
    crop: favouriteCrop(c),
    guard: w.guard ?? 0,
    boost: w.boost ?? 0,
  };
}

const careBoost = (works) => Math.min(MAX_CARE_BOOST, works.reduce((s, w) => s + w.boost, 0));

// The whole village, per hour.
export function villageOutput(list) {
  const works = list.map(workOf);
  const boost = careBoost(works);
  const total = { colors: 0, gems: 0, store: 0, plants: 0, boost };
  works.forEach((w) => {
    total.colors += w.colors;
    total.gems += w.gems;
    total.store += w.store;
    total.plants += w.plants;
  });
  ['colors', 'gems', 'store', 'plants'].forEach((k) => { total[k] *= 1 + boost; });
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
  const works = list.map(workOf);
  const boost = 1 + careBoost(works);
  const carry = house.village.carry;
  const take = (key, amount) => {
    carry[key] = (carry[key] ?? 0) + amount;
    const whole = Math.floor(carry[key]);
    carry[key] -= whole;
    return whole;
  };
  const gained = { colors: 0, gems: 0, store: 0, plants: 0, fruits: [] };
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
  return gained;
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

// What a party brings home: gems, sometimes a creature of another race, and very rarely a Devil
// Fruit. The same expedition always brings back the same thing.
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
  return { gems, find, fruit };
}

// Brings home every expedition that is due. Gems and fruits go straight into the pool; a creature
// they found waits in house.found until you name it.
export function finishExpeditions(house, now = Date.now()) {
  const done = house.expeditions.filter((e) => e.end <= now);
  if (!done.length) return [];
  house.expeditions = house.expeditions.filter((e) => e.end > now);
  return done.map((exp) => {
    const haul = expeditionHaul(exp);
    house.bank.gems = clamp(house.bank.gems + haul.gems, 0, MAX_BANK);
    if (haul.fruit) addFruit(house, haul.fruit);
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

// ---------- hostile villages ----------

// How well your village holds off a raid: everyone at home, fighters twice over, and your mains at
// half strength, since they are out on your screen.
export function villageDefense(list, mains = []) {
  const home = list.reduce((s, c) => s + powerOf(c) * (workKind(c) === 'battle' ? VILLAGE_WORK.battle.guard : 1), 0);
  return Math.round(home + mains.reduce((s, c) => s + powerOf(c) * 0.5, 0));
}

// The chance that a side this strong beats a side that strong.
export const winChance = (mine, theirs) => (mine <= 0 ? 0 : mine ** 1.5 / (mine ** 1.5 + Math.max(1, theirs) ** 1.5));

const raidGap = (rng) => (RAID_EVERY_HOURS[0] + rng() * (RAID_EVERY_HOURS[1] - RAID_EVERY_HOURS[0])) * HOUR;

function note(house, now, text) {
  house.hostile.log.push({ at: now, text });
  house.hostile.log = house.hostile.log.slice(-20);
}

// Hostile mode on makes three hostile villages, sized against your defence. Off clears them away.
export function setHostile(house, on, defense, now = Date.now(), rng = Math.random) {
  house.hostile.on = on;
  if (!on) {
    house.hostile.villages = [];
    house.hostile.nextRaid = 0;
    return;
  }
  if (!house.hostile.villages.length) {
    const names = HOSTILE_NAMES.slice().sort(() => rng() - 0.5).slice(0, HOSTILE_VILLAGES);
    house.hostile.villages = names.map((name, i) => ({
      id: `h${i}${Math.floor(rng() * 1e6)}`,
      name,
      power: Math.round(Math.max(60, defense) * HOSTILE_START[i]),
      raidedAt: 0,
    }));
  }
  house.hostile.nextRaid = now + raidGap(rng);
  note(house, now, 'Hostile mode is on. Three villages nearby are watching yours.');
}

// They grow stronger with time.
export function growHostile(house, hours) {
  for (const v of house.hostile.villages) v.power *= (1 + HOSTILE_GROWTH_PER_DAY) ** (hours / 24);
}

export const raidDue = (house, now) => house.hostile.on && house.hostile.villages.length > 0 && now >= house.hostile.nextRaid;

// They only raid while the game is open, so a raid that came due while it was closed waits.
export function putOffRaids(house, now, rng = Math.random) {
  if (house.hostile.on && house.hostile.nextRaid < now) house.hostile.nextRaid = now + raidGap(rng);
}

// A raid on your village. Held off, it leaves a few gems behind; lost, it takes some of the pool.
export function incomingRaid(house, defense, now = Date.now(), rng = Math.random) {
  const v = house.hostile.villages[Math.floor(rng() * house.hostile.villages.length)];
  house.hostile.nextRaid = now + raidGap(rng);
  const won = rng() < winChance(defense, v.power);
  const result = { village: v.name, won, gems: 0, colors: 0, store: 0 };
  if (won) {
    result.gems = between(rng, RAID_LOOT.gems);
    house.bank.gems = clamp(house.bank.gems + result.gems, 0, MAX_BANK);
    note(house, now, `${v.name} raided the village and was beaten off. They left ${result.gems} gems behind.`);
  } else {
    PIGMENT_IDS.forEach((p) => {
      const lost = Math.floor(house.bank[p] * RAID_LOSS.colors);
      house.bank[p] -= lost;
      result.colors += lost;
    });
    result.store = Math.floor(house.store * RAID_LOSS.store);
    house.store -= result.store;
    result.gems = Math.min(house.bank.gems, between(rng, RAID_LOSS.gems));
    house.bank.gems -= result.gems;
    note(house, now, `${v.name} raided the village and got away with ${result.colors} colors, ${result.store} food and ${result.gems} gems.`);
  }
  return result;
}

// Why you can't raid that village right now, or null if you can.
export function raidProblem(house, id, now = Date.now()) {
  if (!house.hostile.on) return 'Hostile mode is off';
  if (!house.hostile.villages.some((v) => v.id === id)) return 'That village is gone';
  if (now < house.hostile.restUntil) return `Your raiders are resting for ${Math.ceil((house.hostile.restUntil - now) / 60000)} more min`;
  return null;
}

// Your raid on one of them, with the village's whole defence as the raiding party.
export function raidVillage(house, id, attack, now = Date.now(), rng = Math.random) {
  if (raidProblem(house, id, now)) return null;
  const v = house.hostile.villages.find((x) => x.id === id);
  const won = rng() < winChance(attack, v.power);
  house.hostile.restUntil = now + RAID_REST_HOURS * HOUR;
  v.raidedAt = now;
  const result = { village: v.name, won, gems: 0, colors: 0, color: null };
  if (won) {
    result.gems = between(rng, RAID_LOOT.gems);
    result.colors = between(rng, RAID_LOOT.colors);
    result.color = PIGMENT_IDS[Math.floor(rng() * PIGMENT_IDS.length) % PIGMENT_IDS.length];
    house.bank.gems = clamp(house.bank.gems + result.gems, 0, MAX_BANK);
    house.bank[result.color] = clamp(house.bank[result.color] + result.colors, 0, MAX_BANK);
    v.power *= 1 - RAID_KNOCKBACK;
    note(house, now, `You raided ${v.name} and won: ${result.gems} gems and ${result.colors} colors.`);
  } else {
    note(house, now, `You raided ${v.name} and were driven off.`);
  }
  return result;
}
