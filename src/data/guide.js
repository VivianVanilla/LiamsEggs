// The words for the training guide. The numbers come from core/training.js, which reads them
// from the same places the game does. `sample` is a color from the `colors` list: a test mines
// it and checks it really raises this stat, so these descriptions can't quietly go wrong.

export const STAT_GUIDE = {
  might: {
    does: 'How hard it hits.',
    food: 'ember',
    colors: 'red, orange and pink',
    sample: [230, 60, 40],
    work: 'Mine vivid colors, or let it beat you at puzzle duels',
    monster: 'bull',
    unlocks: 'technique',
  },
  guard: {
    does: 'How little each hit hurts, plus a little health.',
    food: 'bone',
    colors: 'cyan, blue and violet',
    sample: [40, 90, 230],
    work: null,
    monster: 'crab',
  },
  speed: {
    does: 'How often it attacks and how fast it moves.',
    food: 'spark',
    colors: 'yellow and lime',
    sample: [200, 230, 40],
    work: 'Mine dull colors',
    monster: 'hare',
    unlocks: 'speedster',
  },
  wits: {
    does: 'Dodging, critical hits, shorter waits between moves, and puzzle skill.',
    food: 'ink',
    colors: 'purple and magenta',
    sample: [170, 40, 230],
    work: 'Beat it at puzzle duels',
    monster: 'owl',
    unlocks: 'stand',
  },
  vigor: {
    does: 'Health, and how many people its society can hold.',
    food: 'sap',
    colors: 'green and teal',
    sample: [40, 200, 110],
    work: 'Farm',
    monster: 'croc',
  },
};

// Some ways to spend its limits. `order` is its stats from best to worst, and `stand`,
// `speedster` and `technique` say which powers that leaves in reach. A test builds each to check.
export const BUILD_IDEAS = [
  {
    name: 'Stand user',
    order: ['wits', 'might', 'vigor', 'speed', 'guard'],
    stand: true,
    speedster: false,
    technique: true,
    text: 'Wits first, for a Stand and fast moves, then Might so its hits count. Mind Melons, and beating it at puzzles. The Tactician line helps most.',
  },
  {
    name: 'Speedster',
    order: ['speed', 'might', 'vigor', 'wits', 'guard'],
    stand: false,
    speedster: true,
    technique: true,
    text: 'Speed first, then Might: it hits often and hard, but can\'t take much back. Zip Roots and dull colors.',
  },
  {
    name: 'Sorcerer',
    order: ['might', 'wits', 'vigor', 'speed', 'guard'],
    stand: true,
    speedster: false,
    technique: true,
    text: 'Might first for a cursed technique and Black Flashes, with Wits behind it so its moves come back quickly. Fire Peppers, vivid colors, then Mind Melons.',
  },
  {
    name: 'Two powers',
    order: ['wits', 'speed', 'vigor', 'might', 'guard'],
    stand: true,
    speedster: true,
    technique: false,
    text: 'Only with a Legendary mutation. Two powers take two of its top three stats, so just one stat is left to do anything else. Very strong, very breakable.',
  },
  {
    name: 'Wall',
    order: ['vigor', 'guard', 'might', 'speed', 'wits'],
    stand: false,
    speedster: false,
    technique: true,
    text: 'Vigor and Guard. Almost nothing kills it, but fights take a long time, and only a cursed technique stays in reach. Heart Beets, Stone Beans, farming and Shell Crabs.',
  },
  {
    name: 'Bruiser',
    order: ['might', 'vigor', 'guard', 'speed', 'wits'],
    stand: false,
    speedster: false,
    technique: true,
    text: 'Might, with Vigor behind it. Simple and hard to stop. Fire Peppers, vivid colors and Brawler Bulls.',
  },
];
