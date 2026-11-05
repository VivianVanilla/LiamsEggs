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

// Weakest first. `trophy` is the stat it gives if beaten.
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
    name: 'Old Rex', trophy: 'might', size: 170, moves: ['reckoning', 'quake', 'stoop'],
    stats: { might: 58, guard: 30, speed: 22, wits: 12, vigor: 34 },
    blurb: 'One bite is most of a fight.',
  },
  dragon: {
    name: 'The Last Dragon', trophy: 'might', size: 190, moves: ['prominence', 'flame', 'warcry', 'stoop'], legendary: true,
    stats: { might: 50, guard: 36, speed: 28, wits: 28, vigor: 38 },
    blurb: 'There is a reason it is the last one.',
  },
};

export const DEADLY_IDS = Object.keys(DEADLY_MONSTERS);
DEADLY_IDS.forEach((id) => { DEADLY_MONSTERS[id].id = id; });

// Moves only monsters use, added to ABILITIES in data/paths.js.
export const MONSTER_MOVES = {
  sting:    { name: 'Sting',      kind: 'bolt', cd: 7,  power: 0.4, poison: 0.25, poisonFor: 5, range: 300, speed: 620, color: '#b6e06a' },
  webshot:  { name: 'Web Shot',   kind: 'bolt', cd: 9,  power: 0.3, stun: 1.4, range: 420, speed: 520, color: '#e8e8f0' },
  stoop:    { name: 'Dive',       kind: 'dash', cd: 7,  power: 1.8, range: 800, color: '#ffe16a' },
  inkcloud: { name: 'Ink Cloud',  kind: 'nova', cd: 10, power: 0.5, range: 200, poison: 0.3, poisonFor: 5, color: '#7a6ad0' },
};
