// Rolling eggs. An egg's family and born-with gifts come from its id, so an egg is just an id, and
// a roll is a new id. Pure logic with no DOM, so tests can run it.

import { uid } from '../lib/util.js';
import { newCreature, lineageFromId, otherLineFromId, bornWith } from './creature.js';
import { TECHNIQUE_IDS, TRAIT_IDS, TRAIT_ODDS, SIX_EYES_FAMILY } from '../data/powers.js';

export const eggFromId = (id) => {
  const lineage = lineageFromId(id);
  return { id, lineage, otherLine: otherLineFromId(id, lineage), traits: bornWith(id, lineage) };
};

export const rollEgg = (rng = Math.random) => eggFromId(uid(rng));

// want: { traits: ['sixeyes', ...], family: technique id or null }. An egg matches when it has every
// gift asked for, and the family if one was asked for.
export const matches = (egg, want) => want.traits.every((t) => egg.traits.includes(t)) && (!want.family || egg.lineage === want.family);

// The chance one roll matches, worked out from the same odds the eggs are rolled with.
export function matchChance(want) {
  const sixEyes = want.traits.includes('sixeyes');
  if (sixEyes && want.family && want.family !== SIX_EYES_FAMILY) return 0;
  let p = want.family || sixEyes ? 1 / TECHNIQUE_IDS.length : 1;
  want.traits.forEach((t) => { p /= TRAIT_ODDS[t]; });
  return p;
}

// Keeps rolling until an egg matches or the budget of rolls runs out. Returns the last egg rolled.
export function hyperRoll(want, budget, rng = Math.random) {
  let egg = null;
  for (let rolls = 1; rolls <= budget; rolls++) {
    egg = rollEgg(rng);
    if (matches(egg, want)) return { egg, rolls, found: true };
  }
  return { egg, rolls: budget, found: false };
}

// The egg you keep hatches into a creature with exactly that family and those gifts.
export function hatchEgg(egg, name, now = Date.now()) {
  const c = newCreature(name, now);
  c.id = egg.id;
  c.lineage = egg.lineage;
  c.otherLine = egg.otherLine;
  c.traits = TRAIT_IDS.filter((t) => egg.traits.includes(t));
  return c;
}
