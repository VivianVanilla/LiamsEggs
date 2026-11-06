// The household's bag of loot, and using what is in it. Pure logic with no DOM, so tests can run it.

import { clamp } from '../lib/util.js';
import { ITEMS, MAX_ITEMS, CHAMBER_STAGE, CHAMBER_FULLNESS, MAX_EXPANDERS, MAX_SOUL_EXPANDERS } from '../data/items.js';
import { STAGES, stageIndex } from './creature.js';

export const itemCount = (house, id) => house.items?.[id] ?? 0;

export function addItem(house, id, n = 1) {
  if (!Object.hasOwn(ITEMS, id)) return;
  house.items[id] = clamp(itemCount(house, id) + n, 0, MAX_ITEMS);
}

// Each item in the table has its own chance. Returns the ids that came up.
export const rollDrops = (table, rng = Math.random) => Object.entries(table ?? {}).filter(([id, p]) => Object.hasOwn(ITEMS, id) && rng() < p).map(([id]) => id);

// Why this item can't be used on this creature, or null if it can.
export function itemProblem(house, id, c) {
  if (!Object.hasOwn(ITEMS, id)) return 'There is no such thing';
  if (itemCount(house, id) < 1) return `You have no ${ITEMS[id].name}`;
  if (!c || c.dead) return 'It only works on a living creature';
  if (id === 'chamber' && stageIndex(c) >= CHAMBER_STAGE) return `${c.name} is already ${STAGES[CHAMBER_STAGE].name}`;
  if (id === 'expander' && (c.expanders ?? 0) >= MAX_EXPANDERS) return `${c.name} has already taken ${MAX_EXPANDERS}`;
  if (id === 'soulexpander' && (c.soulExpanders ?? 0) >= MAX_SOUL_EXPANDERS) return `${c.name} has already taken ${MAX_SOUL_EXPANDERS}`;
  return null;
}

export function useItem(house, id, c) {
  if (itemProblem(house, id, c)) return false;
  house.items[id] -= 1;
  if (id === 'chamber') {
    c.growth = Math.max(c.growth, STAGES[CHAMBER_STAGE].at);
    c.fullness = Math.max(c.fullness, CHAMBER_FULLNESS);
  }
  if (id === 'expander') c.expanders = (c.expanders ?? 0) + 1;
  if (id === 'soulexpander') c.soulExpanders = (c.soulExpanders ?? 0) + 1;
  return true;
}
