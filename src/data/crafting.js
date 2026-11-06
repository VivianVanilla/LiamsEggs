// What mined colors and farm crops turn into. Everything mined goes into two places: its palette,
// which keeps counting forever and sets its look and stats, and its bank, which is what you spend.

// Each color family lines up with the stat that color raises. `bins` are the 12 hue bins in
// core/creature.js: a test checks these agree with its table, so they can't drift apart.
export const PIGMENTS = {
  red:    { name: 'Red',    bins: [11, 0, 1], stat: 'might', hex: '#e0503c' },
  yellow: { name: 'Yellow', bins: [2, 3],     stat: 'speed', hex: '#d9c82e' },
  green:  { name: 'Green',  bins: [4, 5],     stat: 'vigor', hex: '#3fb56a' },
  blue:   { name: 'Blue',   bins: [6, 7, 8],  stat: 'guard', hex: '#3a7bd5' },
  purple: { name: 'Purple', bins: [9, 10],    stat: 'wits',  hex: '#a24fd6' },
};
export const PIGMENT_IDS = Object.keys(PIGMENTS);

// Dull colors become Dust, and each gem found is banked too.
export const BANK_LABELS = { ...Object.fromEntries(PIGMENT_IDS.map((id) => [id, PIGMENTS[id].name])), dust: 'Dust', gems: 'Gems' };
export const BANK_KEYS = Object.keys(BANK_LABELS);
export const MAX_BANK = 99999;

export const familyOfBin = (bin) => PIGMENT_IDS.find((id) => PIGMENTS[id].bins.includes(bin));

// ---------- dye ----------

export const DYE_COST = 15;

// ---------- charms: crafted once, kept forever, and it can only wear so many ----------

export const CHARM_SLOTS = 2;

export const CHARMS = {
  ruby:     { name: 'Ruby Charm',     stats: { might: 3 }, cost: { red: 60, dust: 20, gems: 1 } },
  citrine:  { name: 'Citrine Charm',  stats: { speed: 3 }, cost: { yellow: 60, dust: 20, gems: 1 } },
  emerald:  { name: 'Emerald Charm',  stats: { vigor: 3 }, cost: { green: 60, dust: 20, gems: 1 } },
  sapphire: { name: 'Sapphire Charm', stats: { guard: 3 }, cost: { blue: 60, dust: 20, gems: 1 } },
  amethyst: { name: 'Amethyst Charm', stats: { wits: 3 },  cost: { purple: 60, dust: 20, gems: 1 } },
  prism:    { name: 'Prism Charm',    stats: { might: 1, guard: 1, speed: 1, wits: 1, vigor: 1 }, cost: { red: 20, yellow: 20, green: 20, blue: 20, purple: 20, gems: 2 } },
  ash:      { name: 'Ash Ring',       stats: { guard: 1, vigor: 1 }, cost: { dust: 90 } },
  flint:    { name: 'Flint Ring',     stats: { might: 1, speed: 1 }, cost: { dust: 90 } },
};
export const CHARM_IDS = Object.keys(CHARMS);

// ---------- one-fight items: a paint from the workshop ----------
// It can wear one paint, and its next fight uses it up.
// damage: hits harder. taken: takes less. hp: more max health. move and attack: faster.
// moves: moves are ready sooner. dodge: added to its dodge chance.

export const PAINTS = {
  war:   { name: 'War Paint',   effect: { damage: 0.2 },              text: 'hits 20% harder',                 cost: { red: 30, dust: 10 } },
  shell: { name: 'Shell Paint', effect: { taken: 0.15 },              text: 'takes 15% less damage',           cost: { blue: 30, dust: 10 } },
  quick: { name: 'Quick Paint', effect: { move: 0.3, attack: 0.1 },   text: 'moves 30% and swings 10% faster', cost: { yellow: 30, dust: 10 } },
  mind:  { name: 'Mind Paint',  effect: { moves: 0.2, dodge: 0.04 },  text: 'moves ready 20% sooner, and it dodges a little more', cost: { purple: 30, dust: 10 } },
  life:  { name: 'Life Paint',  effect: { hp: 0.2 },                  text: '20% more health',                 cost: { green: 30, dust: 10 } },
};
export const PAINT_IDS = Object.keys(PAINTS);

// ---------- plants: what a field can grow ----------
// Farmed food, the only food that grows mutations. Every field grows one of these. A harvest goes
// to the Feed note, and also adds a little to the store it feeds itself from when hungry.

// How big a meal one plant counts as (see data/foods.js).
export const PLANT_BYTES = 1024;

export const CROPS = {
  pepper: { name: 'Fire Pepper', family: 'ember', grows: 'claws, flames and magma' },
  root:   { name: 'Zip Root',    family: 'spark', grows: 'antennae, coils and jets' },
  beet:   { name: 'Heart Beet',  family: 'sap',   grows: 'leaves, moss and roots' },
  bean:   { name: 'Stone Bean',  family: 'bone',  grows: 'horns, plates and spikes' },
  melon:  { name: 'Mind Melon',  family: 'ink',   grows: 'gems, halos and glyphs' },
  cap:    { name: 'Mutagen Cap', family: 'goo',   grows: 'extra arms, extra legs and a second head' },
};
export const CROP_IDS = Object.keys(CROPS);

// Watering pushes every growing crop ahead by this much, and can only be done so often.
export const WATER_PUSH_MS = 2 * 60 * 1000;
export const WATER_EVERY_MS = 10 * 60 * 1000;

// ---------- mining: a vein sometimes shows up where it digs ----------
// Rest the mouse on one and click before it fades.

// Mining one spot: it digs there for this many seconds, one chunk every so often (faster with a
// Miner's speed), out of a square this many pixels across, read as cells by cells of color.
export const SPOT_MINE = { seconds: 300, digEvery: 2.4, size: 72, cells: 3 };
export const VEIN_CHANCE = 0.12;
// A bright chunk has this chance of being a gem, plus whatever its job adds.
export const GEM_CHANCE = 0.05;
export const VEIN_SECONDS = 3;
export const VEIN_UNITS = 12;
export const VEIN_GEM_CHANCE = 0.25;
