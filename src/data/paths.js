// The job tree: 4 paths, each splits twice, ending in 16 final forms.
// `perk` changes how activities play.

import { POWER_MOVES } from './powers.js';
import { MONSTER_MOVES } from './monsters.js';
import { RACE_MOVES } from './races.js';
import { FRUIT_MOVES } from './fruits.js';

export const ROOT_PATHS = ['miner', 'farmer', 'fighter', 'nurse'];

export const PATHS = {
  // ---- MINER ----
  miner: {
    tier: 1, activity: 'mine', name: 'Miner',
    blurb: 'Chips the color out of your screen and wears what it finds.',
    stats: { might: 1, speed: 1 }, perk: { gemChance: 0.05 },
    kids: ['prospector', 'excavator'],
  },
  prospector: {
    tier: 2, parent: 'miner', activity: 'mine', name: 'Prospector',
    blurb: 'Reads colors like tea leaves. Finds far more gems.',
    stats: { wits: 3, speed: 1 }, perk: { gemChance: 0.2 },
    kids: ['hoarder', 'sage'],
  },
  excavator: {
    tier: 2, parent: 'miner', activity: 'mine', name: 'Excavator',
    blurb: 'Hits the screen much harder. Mines faster, gets stronger.',
    stats: { might: 3, guard: 1 }, perk: { mineSpeed: 0.5 },
    kids: ['driller', 'wraith'],
  },
  hoarder: {
    tier: 3, parent: 'prospector', activity: 'mine', name: 'Gem Hoarder',
    blurb: 'Sleeps on a pile of stolen pixels. Armored in gems.',
    stats: { guard: 5, vigor: 3 }, perk: { gemChance: 0.1 }, ability: 'gemshield',
  },
  sage: {
    tier: 3, parent: 'prospector', activity: 'mine', name: 'Spectrum Sage',
    blurb: 'Understands what color actually is. Fires it as a beam.',
    stats: { wits: 6, might: 2 }, perk: { gemChance: 0.1 }, ability: 'prism',
  },
  driller: {
    tier: 3, parent: 'excavator', activity: 'mine', name: 'Titan Driller',
    blurb: 'Grew around its drill. Cracks the ground when it stomps.',
    stats: { might: 5, vigor: 3 }, perk: { mineSpeed: 0.5 }, ability: 'quake',
  },
  wraith: {
    tier: 3, parent: 'excavator', activity: 'mine', name: 'Tunnel Wraith',
    blurb: 'Lives behind your windows. Comes up where you are not looking.',
    stats: { speed: 5, might: 3 }, perk: { mineSpeed: 0.4 }, ability: 'burrow',
  },

  // ---- FARMER ----
  farmer: {
    tier: 1, activity: 'farm', name: 'Farmer',
    blurb: 'Digs fields on your screen, grows food, feeds itself.',
    stats: { vigor: 2 }, perk: { growRate: 0.25, animalCap: 2 },
    kids: ['cultivator', 'rancher'],
  },
  cultivator: {
    tier: 2, parent: 'farmer', activity: 'farm', name: 'Cultivator',
    blurb: 'More fields, faster crops, unsettling patience.',
    stats: { vigor: 3, wits: 1 }, perk: { growRate: 0.5, fieldCap: 2 },
    kids: ['warden', 'monarch'],
  },
  rancher: {
    tier: 2, parent: 'farmer', activity: 'farm', name: 'Rancher',
    blurb: 'Small animals follow it around and breed alarmingly fast.',
    stats: { vigor: 2, speed: 2 }, perk: { animalCap: 6, breedRate: 0.5 },
    kids: ['beastmaster', 'swarm'],
  },
  warden: {
    tier: 3, parent: 'cultivator', activity: 'farm', name: 'Grove Warden',
    blurb: 'Half tree by now. Roots hold anything still.',
    stats: { guard: 4, vigor: 5 }, perk: { growRate: 0.5, fieldCap: 2 }, ability: 'snare',
  },
  monarch: {
    tier: 3, parent: 'cultivator', activity: 'farm', name: 'Harvest Monarch',
    blurb: 'Rules through food. Feasts in the middle of a fight.',
    stats: { vigor: 6, might: 2 }, perk: { growRate: 0.5, fieldCap: 1 }, ability: 'feast',
  },
  beastmaster: {
    tier: 3, parent: 'rancher', activity: 'farm', name: 'Beastmaster',
    blurb: 'Whistles once. The barnyard answers, angrily.',
    stats: { might: 3, vigor: 3, speed: 2 }, perk: { animalCap: 4 }, ability: 'stampede',
  },
  swarm: {
    tier: 3, parent: 'rancher', activity: 'farm', name: 'Swarm Keeper',
    blurb: 'Nobody has counted the beetles. Nobody wants to.',
    stats: { speed: 4, wits: 3, vigor: 1 }, perk: { animalCap: 8, breedRate: 0.5 }, ability: 'swarm',
  },

  // ---- FIGHTER ----
  fighter: {
    tier: 1, activity: 'battle', name: 'Fighter',
    blurb: 'Challenges you to puzzles and learns from every loss.',
    stats: { might: 1, wits: 1 }, perk: { duelXp: 0.25 },
    kids: ['tactician', 'berserker'],
  },
  tactician: {
    tier: 2, parent: 'fighter', activity: 'battle', name: 'Tactician',
    blurb: 'Stops making careless moves. Puzzles get properly hard.',
    stats: { wits: 4 }, perk: { duelSkill: 0.15 },
    kids: ['grandmaster', 'trickster'],
  },
  berserker: {
    tier: 2, parent: 'fighter', activity: 'battle', name: 'Berserker',
    blurb: 'Loses a puzzle, gets angrier, somehow gets stronger.',
    stats: { might: 3, vigor: 1 }, perk: { duelXp: 0.25 },
    kids: ['warlord', 'doom'],
  },
  grandmaster: {
    tier: 3, parent: 'tactician', activity: 'battle', name: 'Grandmaster',
    blurb: 'Has already seen this fight. Dodges before you swing.',
    stats: { wits: 6, speed: 2 }, perk: { duelSkill: 0.15 }, ability: 'foresight',
  },
  trickster: {
    tier: 3, parent: 'tactician', activity: 'battle', name: 'Trickster',
    blurb: 'Cheats, and is very good at it. Scrambles minds.',
    stats: { wits: 4, speed: 4 }, perk: { duelSkill: 0.1 }, ability: 'mindswap',
  },
  warlord: {
    tier: 3, parent: 'berserker', activity: 'battle', name: 'Warlord',
    blurb: 'Screams, and everything around it hits harder.',
    stats: { might: 5, guard: 3 }, perk: { duelXp: 0.25 }, ability: 'warcry',
  },
  doom: {
    tier: 3, parent: 'berserker', activity: 'battle', name: 'Doom Knight',
    blurb: 'Slow. Enormous swing. One mistake is enough.',
    stats: { might: 6, guard: 2 }, perk: { duelXp: 0.25 }, ability: 'reckoning',
  },

  // ---- NURSE ----
  nurse: {
    tier: 1, activity: 'care', name: 'Nurse',
    blurb: 'Looks after whoever else is out. Snacks the hungry ones, and breeding goes better with it around.',
    stats: { vigor: 1, wits: 1 }, perk: { carePicks: 1, careSave: 0.5 },
    kids: ['medic', 'midwife'],
  },
  medic: {
    tier: 2, parent: 'nurse', activity: 'care', name: 'Medic',
    blurb: 'Keeps everyone going. Parents barely feel what an egg took out of them.',
    stats: { vigor: 3, wits: 1 }, perk: { careSave: 0.25 },
    kids: ['surgeon', 'battlemedic'],
  },
  midwife: {
    tier: 2, parent: 'nurse', activity: 'care', name: 'Midwife',
    blurb: 'Eggs it looks after hatch bigger.',
    stats: { vigor: 2, guard: 2 }, perk: { hatchGrowth: 12 },
    kids: ['broodmother', 'nightnurse'],
  },
  surgeon: {
    tier: 3, parent: 'medic', activity: 'care', name: 'Field Surgeon',
    blurb: 'Steady hands. Stitches itself up in the middle of a fight.',
    stats: { wits: 5, vigor: 3 }, perk: { careSave: 0.1 }, ability: 'triage',
  },
  battlemedic: {
    tier: 3, parent: 'medic', activity: 'care', name: 'Battle Medic',
    blurb: 'Runs into the fight with a needle full of something loud.',
    stats: { speed: 4, vigor: 4 }, perk: { carePicks: 1 }, ability: 'adrenaline',
  },
  broodmother: {
    tier: 3, parent: 'midwife', activity: 'care', name: 'Brood Mother',
    blurb: 'Never alone. Its little ones come running when it fights.',
    stats: { vigor: 5, guard: 3 }, perk: { hatchGrowth: 12 }, ability: 'brood',
  },
  nightnurse: {
    tier: 3, parent: 'midwife', activity: 'care', name: 'Night Nurse',
    blurb: 'Puts anything to sleep. Anything.',
    stats: { wits: 4, guard: 4 }, perk: { carePicks: 1 }, ability: 'sedate',
  },
};

// Path XP needed before each sub-path choice opens.
export const TIER_XP = { 2: 80, 3: 300 };

// Arena moves. Family abilities come from mutations, signatures from the final form.
export const ABILITIES = {
  // family
  bonewall:  { name: 'Bone Wall',    kind: 'buff',   cd: 11, dur: 3,   guard: 0.45, color: '#efe6cf' },
  regrow:    { name: 'Regrow',       kind: 'heal',   cd: 10, power: 0.18, color: '#7ed957' },
  zap:       { name: 'Zap',          kind: 'bolt',   cd: 4.5, power: 0.9, range: 420, speed: 620, color: '#6fe7ff' },
  hex:       { name: 'Hex',          kind: 'bolt',   cd: 8,  power: 0.3, stun: 1.0, range: 380, speed: 360, color: '#b78cff' },
  flame:     { name: 'Flame',        kind: 'cone',   cd: 5.5, power: 1.3, range: 130, color: '#ff8a3c' },
  spawnling: { name: 'Spawnling',    kind: 'summon', cd: 13, count: 1, minion: 'blob', color: '#c6f135' },
  // signatures
  gemshield: { name: 'Gem Shield',   kind: 'buff',   cd: 10, dur: 4,   guard: 0.65, color: '#c79bff' },
  prism:     { name: 'Prism Beam',   kind: 'bolt',   cd: 5.5,  power: 2.9, range: 520, speed: 900, color: '#ffffff', rainbow: true },
  quake:     { name: 'Quake',        kind: 'nova',   cd: 9,  power: 0.95, range: 165, stun: 0.6, color: '#c08a4a' },
  burrow:    { name: 'Burrow Strike', kind: 'dash',  cd: 6,  power: 2.7, range: 600, color: '#55556a' },
  snare:     { name: 'Root Snare',   kind: 'bolt',   cd: 7,  power: 1.1, stun: 2.2, range: 420, speed: 420, color: '#4faf33' },
  feast:     { name: 'Feast',        kind: 'heal',   cd: 14, power: 0.13, atk: 0.2, dur: 4, color: '#ffd24a' },
  stampede:  { name: 'Stampede',     kind: 'summon', cd: 15, count: 2, minion: 'beast', color: '#d9a066' },
  swarm:     { name: 'Swarm',        kind: 'summon', cd: 10, count: 4, minion: 'bug', color: '#8a7a2a' },
  foresight: { name: 'Foresight',    kind: 'buff',   cd: 10, dur: 5.5,   dodge: 0.52, crit: 0.6, color: '#9fc4ff' },
  mindswap:  { name: 'Mind Swap',    kind: 'bolt',   cd: 8,  power: 0.7, confuse: 2.5, range: 420, speed: 460, color: '#ff6fc8' },
  warcry:    { name: 'War Cry',      kind: 'buff',   cd: 11, dur: 5,   atk: 0.6, color: '#ff5a4a' },
  reckoning: { name: 'Reckoning',    kind: 'cone',   cd: 8,  power: 1.55, range: 150, color: '#d04aff' },
  triage:    { name: 'Triage',       kind: 'heal',   cd: 12, power: 0.24, color: '#ff9cc0' },
  adrenaline: { name: 'Adrenaline Shot', kind: 'buff', cd: 11, dur: 4,  atk: 0.4, speed: 0.6, color: '#ff6fa0' },
  brood:     { name: 'Brood',        kind: 'summon', cd: 12, count: 2, minion: 'blob', color: '#ffd6e8' },
  sedate:    { name: 'Sedative Dart', kind: 'bolt',  cd: 8,  power: 0.4, stun: 2, range: 460, speed: 640, color: '#b8a8ff' },
  // Stands, speedsters and Quirks
  ...POWER_MOVES,
  // Monsters from the Challenges note
  ...MONSTER_MOVES,
  // Races
  ...RACE_MOVES,
  // Devil Fruits
  ...FRUIT_MOVES,
};
