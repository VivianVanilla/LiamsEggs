// Being reborn. A creature that has beaten every ultimate monster can absorb another of yours: that
// one is gone for good, and it takes up to REBORN.takes of that one's gifts. Then it goes back to
// being a Hatchling and loses everything else. It keeps only its name, family, race, look, farm and
// gifts, so it climbs all the way back with more in it, and can do it all again.
// Pure rules with no DOM, so tests can run them.

import { STAT_KEYS } from './creature.js';
import { emptyBank } from './craft.js';
import { ULTIMATE_IDS, REBORN, LEGEND_WINS_FOR_ULTIMATE } from '../data/monsters.js';
import { TRAITS, OFA_ID } from '../data/powers.js';
import { MAX_ARMORY } from '../data/forge.js';
import { FOOD_ORDER } from '../data/foods.js';

// The ultimate monsters come out once it has won LEGEND_WINS_FOR_ULTIMATE fights on the Legendary
// road, any of them. This is how many more it needs.
export const ultimateWinsLeft = (c) => Math.max(0, LEGEND_WINS_FOR_ULTIMATE - (c.legendWins?.length ?? 0));
export const ultimatesOpen = (c) => ultimateWinsLeft(c) === 0;
// And it can be reborn once every ultimate monster is beaten too.
export const rebornLeft = (c) => ULTIMATE_IDS.filter((id) => !c.trophies.includes(id));
export const canBeReborn = (c) => ultimatesOpen(c) && rebornLeft(c).length === 0;
export const timesReborn = (c) => c.rebirths?.length ?? 0;

// The gifts it could take from that one: any it doesn't have yet, born, bred or earned.
export const takeable = (c, other) => (other?.traits ?? []).filter((id) => Object.hasOwn(TRAITS, id) && !c.traits.includes(id));

// Why it can't be reborn by absorbing that one with those picks, or null if it can.
export function rebornProblem(c, other, picks = []) {
  if (c.dead) return `${c.name} is gone`;
  if (!canBeReborn(c)) return 'It has to beat every ultimate monster first';
  if (!other) return 'Pick a creature for it to absorb';
  if (other.id === c.id) return 'It can\'t absorb itself';
  if (other.dead) return `${other.name} is gone`;
  const keys = [...new Set(picks)];
  if (keys.length > REBORN.takes) return `It can only take ${REBORN.takes}`;
  const can = takeable(c, other);
  if (!keys.every((id) => can.includes(id))) return `${other.name} doesn't have that to give`;
  return null;
}

// Everything it was, gone: a Hatchling again. What it shares with the household stays with the
// household, and the weapon it carried goes back into the armory.
export function startOver(c, house, now = Date.now()) {
  if (c.weapon && house) house.armory[c.weapon] = Math.min(MAX_ARMORY, (house.armory[c.weapon] ?? 0) + 1);
  c.weapon = null;
  c.growth = 0;
  c.essence = Object.fromEntries(FOOD_ORDER.map((k) => [k, 0]));
  c.absorbed = [];
  c.mutations = [];
  c.expanders = 0;
  c.palette = { hues: c.palette.hues.map(() => ({ r: 0, g: 0, b: 0, n: 0 })), grey: 0, total: 0 };
  c.training = Object.fromEntries(STAT_KEYS.map((k) => [k, 0]));
  c.path = { line: [], xp: 0 };
  c.powers = { stand: null, speedster: false, technique: null, technique2: null, fruit: null, quirks: [] };
  c.ofa = null;
  c.souls = [];
  c.soulExpanders = 0;
  c.soulOffer = null;
  c.trophies = [];
  c.legendWins = [];
  c.gear = { owned: [], worn: [] };
  c.prep = { paint: null };
  c.record = Object.fromEntries(Object.keys(c.record).map((k) => [k, 0]));
  // A creature living outside the household still has its own bank, and that goes too.
  if (!c.household) c.bank = emptyBank();
  c.lastSeen = now;
  return c;
}

// It absorbs that one and is reborn. That one is marked gone, absorbed by it. Returns
// { took } or { problem }, and changes nothing if there is a problem.
export function beReborn(c, other, picks, house, now = Date.now()) {
  const problem = rebornProblem(c, other, picks);
  if (problem) return { problem };
  const took = [...new Set(picks)];
  other.dead = { at: now, by: 'absorbed', to: c.name };
  startOver(c, house, now);
  c.traits = [...c.traits, ...took];
  c.rebirths = [...(c.rebirths ?? []), { at: now, absorbed: other.name, took }].slice(-50);
  return { took };
}

// What being reborn would cost it, for the warning before it happens.
export function rebornLosses(c) {
  const lost = [];
  if (c.powers.quirks.includes(OFA_ID)) lost.push('One For All, and the line of everyone who held it');
  if (c.powers.stand || c.powers.speedster || c.powers.technique || c.powers.fruit) lost.push('its powers');
  if (c.powers.quirks.some((id) => id !== OFA_ID)) lost.push('its Quirks, and the max HP they cost come back');
  if (c.souls.length) lost.push(c.souls.length === 1 ? 'its Legendary mutation' : `its ${c.souls.length} Legendary mutations`);
  if (c.soulExpanders) lost.push('its Legendary Expanders');
  if (c.mutations.length) lost.push(`${c.mutations.length} mutation${c.mutations.length === 1 ? '' : 's'}`);
  if (c.path.line.length) lost.push('its job');
  if (c.trophies.length) lost.push(`${c.trophies.length} trophies`);
  if (c.gear.owned.length) lost.push('its charms');
  if (c.weapon) lost.push('its weapon, which goes back to the armory');
  return lost;
}
