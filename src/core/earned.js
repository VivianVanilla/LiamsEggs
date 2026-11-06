// Gifts a creature earns by what it does, rather than by birth: Ultra Instinct, the Eight Inner
// Gates, Domain Expansion, Observation Haki, Gourmet Cells and the Will of D. Once earned, they are
// its for good, saved in its .creature file with its born-with gifts, but they never pass on to a
// baby. Pure logic with no DOM, so tests can run it.

import { EARN_RULES, EARNED_TRAIT_IDS } from '../data/powers.js';
import { TRAINING_LIMIT } from './creature.js';

// How far along it is to earning one: { have, need, done, how }.
export function earnProgress(c, id) {
  const rule = EARN_RULES[id];
  let have = 0;
  if (rule.record) have = c.record?.[rule.record] ?? 0;
  else if (rule.training) have = Object.values(c.training).filter((v) => v >= TRAINING_LIMIT).length;
  else if (rule.trophies) have = rule.technique && !c.powers.technique ? 0 : c.trophies.length;
  return { have: Math.min(have, rule.need), need: rule.need, done: have >= rule.need, how: rule.how };
}

// Gives it every gift it has earned and doesn't have yet, and returns the new ones.
export function earnTraits(c) {
  if (c.dead) return [];
  const got = EARNED_TRAIT_IDS.filter((id) => !c.traits.includes(id) && earnProgress(c, id).done);
  c.traits.push(...got);
  return got;
}

// Every earned gift it doesn't have yet, with how far along it is.
export const stillToEarn = (c) => EARNED_TRAIT_IDS.filter((id) => !c.traits.includes(id)).map((id) => ({ id, ...earnProgress(c, id) }));
