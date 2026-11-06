// The forge: weapons from Legendary ore and gems, kept in the household's armory until a creature
// carries one. Pure logic with no DOM, so tests can run it.

import { clamp } from '../lib/util.js';
import { WEAPONS, MAX_ARMORY } from '../data/forge.js';

export const armoryCount = (house, id) => house.armory?.[id] ?? 0;

// Why this weapon can't be made right now, or null if it can.
export function forgeProblem(house, id) {
  const w = WEAPONS[id];
  if (!w || !Object.hasOwn(WEAPONS, id)) return 'There is no such weapon';
  if (armoryCount(house, id) >= MAX_ARMORY) return 'The armory is full of those';
  if (house.ore < w.ore) return `It needs ${w.ore} Legendary ore`;
  if (house.bank.gems < w.gems) return `It needs ${w.gems} gems`;
  return null;
}

export function forgeWeapon(house, id) {
  if (forgeProblem(house, id)) return false;
  const w = WEAPONS[id];
  house.ore -= w.ore;
  house.bank.gems -= w.gems;
  house.armory[id] = armoryCount(house, id) + 1;
  return true;
}

// Takes one out of the armory for this creature. Whatever it carried before goes back in.
export function equipWeapon(house, c, id) {
  if (!Object.hasOwn(WEAPONS, id) || armoryCount(house, id) < 1 || c.dead) return false;
  house.armory[id] -= 1;
  if (c.weapon) house.armory[c.weapon] = clamp(armoryCount(house, c.weapon) + 1, 0, MAX_ARMORY);
  c.weapon = id;
  return true;
}

export function unequipWeapon(house, c) {
  if (!c.weapon) return false;
  house.armory[c.weapon] = clamp(armoryCount(house, c.weapon) + 1, 0, MAX_ARMORY);
  c.weapon = null;
  return true;
}
