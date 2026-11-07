// The universe: resetting it, and what opens after. Creature boosts, the gem multiplier they make,
// and the Deluxe Breeder live here too. Pure rules with no DOM, so tests can run them. The numbers
// are in data/universe.js.

import { clamp, num } from '../lib/util.js';
import { emptyHouse } from './house.js';
import { powerOf, negativeShare } from './creature.js';
import { MAX_GEMS } from '../data/crafting.js';
import { ADVENTURE_LEVELS, ABYSS_LEVELS, GOD_LEVELS } from '../data/adventure.js';
import { BOOSTS, DELUXE_BREEDER } from '../data/universe.js';

const HOUR = 3600 * 1000;

// ---------- the reset ----------

// How many times the universe has been reset. Once is enough to open the Negative and Chapter ???.
export const resetsOf = (house) => house.universe?.resets ?? 0;
export const afterReset = (house) => resetsOf(house) > 0;

// Past Chapter ???: the Elite Negative and the God Chapter open once it is beaten, and God Mode once
// the God Chapter is. A reset keeps all three.
export const abyssBeaten = (house) => (house.universe?.abyssBest ?? 0) >= ABYSS_LEVELS.length;
export const godModeOpen = (house) => (house.universe?.godBest ?? 0) >= GOD_LEVELS.length;

// It cracks once the last level of Adventure is beaten.
export const universeCracked = (house) => house.adventure.best >= ADVENTURE_LEVELS.length;

export function resetProblem(house) {
  if (!universeCracked(house)) return `Beat Adventure level ${ADVENTURE_LEVELS.length}, The End of All Things, first`;
  return null;
}

// The household after a reset: nothing at all, except that the universe remembers it happened, and
// how far Chapter ??? got. Killing the creatures is up to whoever asked, since their files live
// outside the household. Returns the new household, or null if it can't happen yet.
export function resetUniverse(house, now = Date.now()) {
  if (resetProblem(house)) return null;
  const fresh = emptyHouse();
  fresh.universe = {
    resets: resetsOf(house) + 1,
    abyssBest: house.universe?.abyssBest ?? 0,
    godBest: house.universe?.godBest ?? 0,
    lastReset: now,
  };
  return fresh;
}

// ---------- creature boosts ----------

// What sacrificing it would multiply your gems by, for an hour.
export function boostFor(c) {
  const worth = 1
    + powerOf(c) / BOOSTS.perPower
    + (c.rebirths?.length ?? 0) * BOOSTS.perRebirth
    + negativeShare(c) * BOOSTS.perNegative
    + (c.trophies?.length ?? 0) * BOOSTS.perTrophy;
  return Math.round(clamp(worth, BOOSTS.least, BOOSTS.most) * 10) / 10;
}

export const activeBoosts = (house, now = Date.now()) => (house.boosts ?? []).filter((b) => b.until > now);

// Every gem you earn is multiplied by this: all the boosts running, multiplied together.
export const gemMultiplier = (house, now = Date.now()) => (afterReset(house) ? activeBoosts(house, now).reduce((m, b) => m * b.mult, 1) : 1);

export function boostProblem(house, c, now = Date.now()) {
  if (!afterReset(house)) return 'Creature boosts only exist after a universe reset';
  if (!c || c.dead) return 'It has to be alive';
  if (activeBoosts(house, now).length >= BOOSTS.max) return `Only ${BOOSTS.max} boosts can run at once`;
  return null;
}

// It is gone for good, and its worth multiplies your gems for the next hour. Returns the boost, or
// null if it can't happen.
export function addBoost(house, c, now = Date.now()) {
  if (boostProblem(house, c, now)) return null;
  const boost = { name: String(c.name).slice(0, 60), mult: boostFor(c), until: now + BOOSTS.hours * HOUR };
  house.boosts = [...activeBoosts(house, now), boost];
  c.dead = { at: now, by: 'a creature boost' };
  return boost;
}

// Every gem anything earns comes through here, so boosts count for all of it. Returns how many it was
// once multiplied.
export function gainGems(house, gems, now = Date.now()) {
  const got = Math.max(0, num(gems)) * gemMultiplier(house, now);
  house.bank.gems = clamp(house.bank.gems + got, 0, MAX_GEMS);
  return got;
}

// ---------- the Deluxe Breeder ----------

export function deluxeProblem(house) {
  if (!afterReset(house)) return 'It only exists after a universe reset';
  if (house.deluxeBreeder) return 'You already have the Deluxe Breeder';
  if (house.bank.gems < DELUXE_BREEDER.cost) return `It costs ${DELUXE_BREEDER.cost.toLocaleString('en-US')} gems`;
  return null;
}

export function buyDeluxe(house) {
  if (deluxeProblem(house)) return false;
  house.bank.gems -= DELUXE_BREEDER.cost;
  house.deluxeBreeder = true;
  return true;
}
