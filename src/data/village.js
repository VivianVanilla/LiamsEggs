// The village. Your three mains are out on your screen; every other creature lives in the village
// and works, by its job, for the pool everyone shares. Legendary Miners can work the Legendary Mine
// instead, and parties set off from the village on expeditions. Only numbers here; the rules are in
// core/village.js.

// What one villager brings in each hour, by its first job, for a Grown one. Each stage smaller or
// bigger than Grown works a quarter less or more.
export const VILLAGE_WORK = {
  mine: { colors: 20, gems: 0.25 },
  farm: { store: 4, plants: 1.5 },
  // Fighters go hunting: some food, and now and then a gem off something they beat.
  battle: { store: 2, gems: 0.1 },
  care: { boost: 0.15 },
  none: { colors: 6, store: 1 },
};
export const WORK_PER_STAGE = 0.25;
// Every nurse in the village makes everyone else work this much harder, up to the most.
export const MAX_CARE_BOOST = 0.45;
// While the game is closed, the village keeps working for this long at most.
export const VILLAGE_CATCHUP_HOURS = 8;

// The Legendary Mine. Only legendary Miners can work it: a Miner in its final form, or a Miner with
// a Legendary mutation. It has room for `slots` of them, and each brings up `ore` Legendary ore an
// hour (for a Grown one, like the rest of the village), the metal the forge makes weapons from.
export const LEGENDARY_MINE = { slots: 3, ore: 1 };

// Where expeditions go. `finds` is the chance the party comes home with a creature of that race, and
// `items` the chance of each kind of loot (data/items.js). Every expedition also has a small chance
// of a Devil Fruit: see FRUIT_FROM_EXPEDITION in fruits.js. `kind` is the group it is listed in.
// `danger` is the most each one who goes can have of not coming back: see EXPEDITION_DANGER.
export const EXPEDITION_KINDS = { sea: 'Sea expeditions', bizarre: 'Bizarre expeditions' };
export const EXPEDITIONS = {
  coast: {
    kind: 'sea', name: 'Along the coast', hours: 1, gems: [1, 3],
    finds: { fishman: 0.03 },
    items: { chamber: 0.06, expander: 0.01 },
  },
  forest: {
    kind: 'sea', name: 'Through the deep forest', hours: 3, gems: [3, 7],
    finds: { mink: 0.03, tontatta: 0.02, longarm: 0.02, giant: 0.015 },
    items: { chamber: 0.1, expander: 0.03 },
  },
  sea: {
    kind: 'sea', name: 'Across the open sea', hours: 6, gems: [6, 14],
    finds: { fishman: 0.04, giant: 0.03, mink: 0.03, lunarian: 0.01, devil: 0.015 },
    items: { chamber: 0.15, expander: 0.06 },
  },
  sky: {
    kind: 'sea', name: 'Up to the sky island', hours: 8, gems: [10, 20],
    finds: { skypiean: 0.06, lunarian: 0.02 },
    items: { chamber: 0.2, expander: 0.08 },
  },
  // The only places Legendary Expanders and the four strongest races come from, and the only ones
  // that can kill.
  ruins: {
    kind: 'bizarre', name: 'Into the stone ruins', hours: 6, gems: [12, 24], danger: 0.3,
    finds: { vampire: 0.06, pillarman: 0.025 },
    items: { chamber: 0.15, expander: 0.08, soulexpander: 0.05 },
  },
  rift: {
    kind: 'bizarre', name: 'Through the rift in the sky', hours: 10, gems: [18, 34], danger: 0.4,
    finds: { cursedalien: 0.05, dragon: 0.025 },
    items: { chamber: 0.2, expander: 0.1, soulexpander: 0.08 },
  },
};
// On a dangerous expedition, each one has `danger` less its share of `safePower` (its power when it
// set off), and never less than `least`. If nobody comes back, nothing they found does either.
export const EXPEDITION_DANGER = { safePower: 160, least: 0.03 };
export const EXPEDITION_IDS = Object.keys(EXPEDITIONS);
export const PARTY_MAX = 3;
export const EXPEDITIONS_AT_ONCE = 3;
// A strong party brings back more: this many extra gems for every 100 power between them.
export const PARTY_GEMS_PER_100 = 1;
// An expedition out can be hurried home, for this many plants from the larder per hour taken off.
export const HURRY_PLANTS = 200;
