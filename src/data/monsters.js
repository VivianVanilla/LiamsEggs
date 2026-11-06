// Monsters for the Challenges note. Each one's picture is monsters/<id>.png (see data/art-list.js).
//   Training monsters can't kill it. They scale to the creature, and beating one has a small
//   chance of training the stat they are known for.
//   Deadly monsters have fixed strength. Losing means it dies forever. Beating one earns a
//   trophy, the only thing that can push a stat past its limit.

export const TRAINING_CHANCE = 0.25;

// How much fullness a fight burns, and how full it has to be to start one.
export const FIGHT_HUNGER = { training: 6, deadly: 15 };
export const MIN_FULLNESS_TO_FIGHT = 10;

// What one trophy adds to its stat, and to that stat's limit.
export const TROPHY_POINTS = 3;

// `focus` is how much of the creature's own stat they bring in their specialty, `rest` in the others.
export const TRAINING_SCALE = { focus: 1.2, rest: 0.85 };

// A deadly monster's strength changes from one to the next, so no fight near its level is a sure
// thing. It spawns between these two shares of the stats listed below.
export const DEADLY_ROLL = { low: 0.8, high: 1.25 };

export const TRAINING_MONSTERS = {
  bull: { name: 'Brawler Bull', stat: 'might', size: 78, moves: [] },
  crab: { name: 'Shell Crab', stat: 'guard', size: 62, moves: ['bonewall'] },
  hare: { name: 'Dart Hare', stat: 'speed', size: 58, moves: [] },
  owl:  { name: 'Riddle Owl', stat: 'wits', size: 66, moves: ['hex'] },
  croc: { name: 'Bog Croc', stat: 'vigor', size: 74, moves: [] },
};

export const TRAINING_IDS = Object.keys(TRAINING_MONSTERS);
TRAINING_IDS.forEach((id) => { TRAINING_MONSTERS[id].id = id; });

// Weakest first. `trophy` is the stat it gives if beaten. `soul` is the Legendary mutation it gives
// too (data/powers.js): beating that monster is the only way to get it.
export const DEADLY_MONSTERS = {
  rat: {
    name: 'Pit Rat', trophy: 'speed', size: 70, moves: [],
    stats: { might: 7, guard: 3, speed: 12, wits: 3, vigor: 3 },
    blurb: 'Starving, fast, and it has already decided.',
  },
  scorpion: {
    name: 'Iron Scorpion', trophy: 'guard', size: 84, moves: ['sting'],
    stats: { might: 10, guard: 16, speed: 6, wits: 5, vigor: 6 },
    blurb: 'The shell shrugs off most of it. The tail does not miss.',
  },
  spider: {
    name: 'Web Witch', trophy: 'wits', size: 88, moves: ['webshot', 'sting'], stance: 'mid',
    stats: { might: 12, guard: 8, speed: 12, wits: 20, vigor: 9 },
    blurb: 'Ties you up, then takes its time.',
  },
  serpent: {
    name: 'Bog Serpent', trophy: 'vigor', size: 104, moves: ['sting', 'regrow'],
    stats: { might: 15, guard: 10, speed: 14, wits: 12, vigor: 24 },
    blurb: 'Hard to kill, and the poison keeps working while it heals.',
  },
  eagle: {
    name: 'Storm Eagle', trophy: 'speed', size: 112, moves: ['stoop', 'zap'], stance: 'bounce',
    stats: { might: 19, guard: 10, speed: 34, wits: 16, vigor: 14 },
    blurb: 'Comes down out of nowhere, again and again.',
  },
  tortoise: {
    name: 'Old Shell', trophy: 'guard', size: 124, moves: ['bonewall', 'quake'], stance: 'hold',
    stats: { might: 18, guard: 44, speed: 6, wits: 10, vigor: 30 },
    blurb: 'It has outlived everything that ever tried this.',
  },
  squid: {
    name: 'Deep Squid', trophy: 'wits', size: 130, moves: ['hex', 'inkcloud', 'mindswap'], stance: 'mid',
    stats: { might: 22, guard: 16, speed: 16, wits: 46, vigor: 26 },
    blurb: 'It knows what you are about to do, and it would rather you didn\'t.',
  },
  mammoth: {
    name: 'Hill Mammoth', trophy: 'vigor', size: 150, moves: ['regrow', 'quake', 'warcry'],
    stats: { might: 32, guard: 26, speed: 12, wits: 10, vigor: 58 },
    blurb: 'You will get tired long before it does.',
  },
  rex: {
    name: 'Old Rex', trophy: 'might', soul: 'malevolentsoul', size: 170, moves: ['reckoning', 'quake', 'stoop'],
    stats: { might: 58, guard: 30, speed: 22, wits: 12, vigor: 34 },
    blurb: 'One bite is most of a fight.',
  },
  dragon: {
    name: 'The Last Dragon', trophy: 'might', size: 190, moves: ['prominence', 'flame', 'warcry', 'stoop'], soul: 'twinsoul',
    stats: { might: 50, guard: 36, speed: 28, wits: 28, vigor: 38 },
    blurb: 'There is a reason it is the last one.',
  },
};

// The Legendary road. Fights to the death like the ones above, but a win gives no trophy and nothing
// else: only the Legendary mutation in `soul`. Weakest first.
const LEGEND_ROAD = {
  rhino: {
    name: 'The Iron Rhino', soul: 'ironsoul', size: 150, moves: ['bonewall', 'quake', 'stoop'], stance: 'hold',
    stats: { might: 40, guard: 56, speed: 16, wits: 14, vigor: 52 },
    blurb: 'Nothing has ever made it take a step back.',
  },
  leopard: {
    name: 'The Ghost Leopard', soul: 'ghostsoul', size: 140, moves: ['stoop', 'snare', 'hex'], stance: 'bounce',
    stats: { might: 42, guard: 24, speed: 54, wits: 44, vigor: 32 },
    blurb: 'You only ever see where it was.',
  },
  shark: {
    name: 'The Sea King', soul: 'tidesoul', size: 170, moves: ['stoop', 'regrow', 'quake'],
    stats: { might: 52, guard: 32, speed: 38, wits: 24, vigor: 60 },
    blurb: 'The sea belongs to it, and so does anything that falls in.',
  },
  gorilla: {
    name: 'The Silverback', soul: 'warsoul', size: 160, moves: ['reckoning', 'warcry', 'quake'],
    stats: { might: 62, guard: 36, speed: 30, wits: 20, vigor: 56 },
    blurb: 'It beats its chest once. That is the only warning.',
  },
};
Object.values(LEGEND_ROAD).forEach((m) => { m.road = 'legend'; });
Object.assign(DEADLY_MONSTERS, LEGEND_ROAD);

// Any this many wins on the Legendary road bring out the ultimate monsters.
export const LEGEND_WINS_FOR_ULTIMATE = 2;

// The ultimate monsters. Fights to the death like the ones above, and each gives a trophy the same
// way, but they only come out for a creature with LEGEND_WINS_FOR_ULTIMATE wins on the Legendary
// road. Beating all of them lets it be reborn (core/reborn.js). Weakest first.
const ULTIMATES = {
  lobster: {
    name: 'Abyss Crawler', trophy: 'guard', size: 160, moves: ['bonewall', 'quake', 'snare'], stance: 'hold',
    stats: { might: 60, guard: 80, speed: 24, wits: 32, vigor: 66 },
    blurb: 'It came up from the bottom of the sea, and nothing down there could crack it.',
  },
  tiger: {
    name: 'Thunder Tiger', trophy: 'speed', size: 150, moves: ['stoop', 'zap', 'warcry'], stance: 'bounce',
    stats: { might: 64, guard: 40, speed: 66, wits: 38, vigor: 54 },
    blurb: 'You see the lightning. The tiger was already there.',
  },
  kraken: {
    name: 'The Kraken', trophy: 'wits', size: 190, moves: ['inkcloud', 'mindswap', 'webshot', 'hex'], stance: 'mid',
    stats: { might: 62, guard: 48, speed: 38, wits: 54, vigor: 74 },
    blurb: 'Eight arms, and it always knows which one you are watching.',
  },
  leviathan: {
    name: 'The Leviathan', trophy: 'vigor', size: 210, moves: ['regrow', 'quake', 'inkcloud', 'warcry'],
    stats: { might: 68, guard: 52, speed: 30, wits: 36, vigor: 105 },
    blurb: 'The sea itself, angry. Every wound closes before the next one lands.',
  },
  behemoth: {
    name: 'The Behemoth', trophy: 'might', size: 220, moves: ['reckoning', 'quake', 'stoop', 'warcry'],
    stats: { might: 104, guard: 58, speed: 36, wits: 32, vigor: 86 },
    blurb: 'The first and the last of the great beasts. The ground gives up before it does.',
  },
};
Object.values(ULTIMATES).forEach((m) => { m.ultimate = true; });
Object.assign(DEADLY_MONSTERS, ULTIMATES);
Object.keys(DEADLY_MONSTERS).forEach((id) => { DEADLY_MONSTERS[id].id = id; });

// The deadly monsters that give trophies, the Legendary road, and the ultimate ones, each weakest first.
export const DEADLY_IDS = Object.keys(DEADLY_MONSTERS).filter((id) => !DEADLY_MONSTERS[id].ultimate && !DEADLY_MONSTERS[id].road);
export const LEGEND_IDS = Object.keys(DEADLY_MONSTERS).filter((id) => DEADLY_MONSTERS[id].road === 'legend');
export const ULTIMATE_IDS = Object.keys(DEADLY_MONSTERS).filter((id) => DEADLY_MONSTERS[id].ultimate);

// Being reborn: it absorbs another creature, takes this many of its gifts, and goes back to being a
// Hatchling with nothing else but its name, family, race, look and gifts.
export const REBORN = { takes: 2 };

// Moves only monsters use, added to ABILITIES in data/paths.js.
export const MONSTER_MOVES = {
  sting:    { name: 'Sting',      kind: 'bolt', cd: 7,  power: 0.4, poison: 0.25, poisonFor: 5, range: 300, speed: 620, color: '#b6e06a' },
  webshot:  { name: 'Web Shot',   kind: 'bolt', cd: 9,  power: 0.3, stun: 1.4, range: 420, speed: 520, color: '#e8e8f0' },
  stoop:    { name: 'Dive',       kind: 'dash', cd: 7,  power: 1.8, range: 800, color: '#ffe16a' },
  inkcloud: { name: 'Ink Cloud',  kind: 'nova', cd: 10, power: 0.5, range: 200, poison: 0.3, poisonFor: 5, color: '#7a6ad0' },
};
