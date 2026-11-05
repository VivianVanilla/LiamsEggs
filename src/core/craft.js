// Spending what it has mined and grown: dyes, charms, paints. Pure logic, no DOM.

import { clamp } from '../lib/util.js';
import {
  CHARMS, CHARM_SLOTS, PAINTS, DYE_COST, PIGMENTS, BANK_KEYS, MAX_BANK, familyOfBin,
} from '../data/crafting.js';

// ---------- the bank ----------

export const emptyBank = () => Object.fromEntries(BANK_KEYS.map((k) => [k, 0]));

export function bankColor(c, bin, units) {
  const family = familyOfBin(bin);
  c.bank[family] = clamp(c.bank[family] + units, 0, MAX_BANK);
}

export const canAfford = (c, cost) => Object.entries(cost).every(([k, v]) => c.bank[k] >= v);

export function pay(c, cost) {
  if (!canAfford(c, cost)) return false;
  Object.entries(cost).forEach(([k, v]) => { c.bank[k] -= v; });
  return true;
}

// ---------- dye ----------

export function hueFamily(rgb) {
  const [r, g, b] = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return null;
  let h;
  if (max === r) h = ((g - b) / (max - min)) % 6;
  else if (max === g) h = (b - r) / (max - min) + 2;
  else h = (r - g) / (max - min) + 4;
  h = (h * 60 + 360) % 360;
  return familyOfBin(Math.floor(h / 30) % 12);
}

// Dyes it one of the colors it has mined, paying in that color. `hex` is what it will wear.
export function applyDye(c, hex, family) {
  if (!Object.hasOwn(PIGMENTS, family) || !pay(c, { [family]: DYE_COST })) return false;
  c.look.dye = hex;
  return true;
}

export function washDye(c) {
  c.look.dye = null;
}

// ---------- charms ----------

export const hasCharm = (c, id) => c.gear.owned.includes(id);
export const isWorn = (c, id) => c.gear.worn.includes(id);

export function craftCharm(c, id) {
  if (!Object.hasOwn(CHARMS, id) || hasCharm(c, id) || !pay(c, CHARMS[id].cost)) return false;
  c.gear.owned.push(id);
  // It goes straight on if there is room.
  if (c.gear.worn.length < CHARM_SLOTS) c.gear.worn.push(id);
  return true;
}

export function wearCharm(c, id) {
  if (!hasCharm(c, id) || isWorn(c, id) || c.gear.worn.length >= CHARM_SLOTS) return false;
  c.gear.worn.push(id);
  return true;
}

export function removeCharm(c, id) {
  c.gear.worn = c.gear.worn.filter((x) => x !== id);
}

// ---------- paints, used up by its next fight ----------

export function craftPaint(c, id) {
  if (!Object.hasOwn(PAINTS, id) || c.prep.paint || !pay(c, PAINTS[id].cost)) return false;
  c.prep.paint = id;
  return true;
}

// What the paint it is wearing does, if it has one on.
export function prepEffects(c) {
  const total = { damage: 0, taken: 0, hp: 0, move: 0, attack: 0, moves: 0, dodge: 0 };
  Object.entries(PAINTS[c.prep.paint]?.effect ?? {}).forEach(([k, v]) => { total[k] += v; });
  return total;
}

export function useUpPrep(c) {
  c.prep = { paint: null };
}
