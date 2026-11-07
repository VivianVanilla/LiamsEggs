// The Negative Dimension. It opens after a universe reset (core/universe.js), and it runs on rules
// of its own: no mutations, no jobs, no Stands or techniques or fruits or Quirks. A creature of the
// Negative has six ability scores instead of five stats, levels instead of growing up, and three
// systems instead of the anime powers of the light world:
//   a class, Dungeons & Dragons style, with the spells it prepares;
//   Nen, Hunter x Hunter style: a Nen type found by water divination, aura spread over five
//     techniques, vows that make its Hatsu stronger for a price, and the Hatsu itself;
//   Alchemy, Fullmetal Alchemist style: up to three circles, each a move it designs itself by
//     choosing a shape, an element and what it pays for it, in health, in time and in strength.
// Everything is bigger here: scores in the hundreds, health in the thousands, NEG_SCALE times what a
// light-world fight runs on. The two worlds never meet in a fight. A creature that wins the last
// level of the Negative's own Adventure can cross over to the light world, keeping only its race and
// its gifts (data/races.js, data/powers.js). Only names and numbers here; the rules are in
// core/negative.js.

export const NEG_SCALE = 10;

export const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
export const ABILITY_LABELS = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
export const ABILITY_SHORT = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
// What each score does in a fight, for the notes.
export const ABILITY_TEXT = {
  str: 'how hard it hits',
  dex: 'how fast it moves and swings',
  con: 'how much health it has, and how much it shrugs off',
  int: 'dodging and critical hits, and the power of a Wizard\'s spells and every Alchemy circle',
  wis: 'dodging and critical hits, how soon its moves come back, and the power of a Cleric\'s spells',
  cha: 'how strong its aura is, for all of its Nen, and the power of a Warlock\'s or Paladin\'s spells',
};
export const NEG_MAX_LEVEL = 60;
export const NEG_MAX_SCORE = 999;
// XP from one level to the next.
export const negXpToNext = (level) => 40 + 12 * level;

export const NEG_ROSTER_MAX = 12;
export const NEG_PARTY = 3;
// Eggs of the Negative: the first few are free to keep, then each costs Void Shards, and rolling a
// different egg costs a few more.
export const NEG_EGG = { free: 3, cost: 30, roll: 3 };

// ---------- classes ----------

// `hitDie` multiplies its health. `grow` is what each level adds to each score. `cast` is the score
// its spells grow with. `feature` works in every fight, the same way a race's passive does.
// `spells` unlock at SPELL_LEVELS, in order.
export const SPELL_LEVELS = [1, 8, 20, 35];
// How many spells it can have prepared at once.
export const spellSlots = (level) => 1 + Math.floor(level / 20);

export const CLASSES = {
  fighter: {
    name: 'Fighter', color: '#c0c6cf', hitDie: 1.3, cast: 'str',
    grow: { str: 10, dex: 5, con: 8, int: 2, wis: 3, cha: 3 },
    feature: { twice: 0.3, text: 'Extra Attack: 30% of its swings land twice.' },
    spells: ['secondwind', 'cleave', 'actionsurge', 'indomitable'],
    blurb: 'Trained for every weapon and every kind of fight. Nothing fancy, and nothing missing.',
  },
  barbarian: {
    name: 'Barbarian', color: '#c2412b', hitDie: 1.5, cast: 'str',
    grow: { str: 11, dex: 4, con: 10, int: 1, wis: 2, cha: 2 },
    feature: { enrage: 0.6, taken: 0.1, text: 'Rage: takes 10% less damage, and below half its health it hits 60% harder and swings faster.' },
    spells: ['rage', 'recklessstrike', 'frenzyslam', 'earthshaker'],
    blurb: 'All of it goes into the next swing, and the next one after that.',
  },
  rogue: {
    name: 'Rogue', color: '#4a4a5a', hitDie: 1, cast: 'dex',
    grow: { str: 4, dex: 12, con: 5, int: 5, wis: 3, cha: 6 },
    feature: { execute: 0.5, crit: 0.1, text: 'Sneak Attack: 10% more critical hits, and 50% harder hits against anything below half its health.' },
    spells: ['sneakattack', 'cunningaction', 'poisonblade', 'assassinate'],
    blurb: 'Never where you are looking, always where you are weakest.',
  },
  monk: {
    name: 'Monk', color: '#d9a441', hitDie: 1.1, cast: 'wis',
    grow: { str: 6, dex: 10, con: 6, int: 2, wis: 8, cha: 2 },
    feature: { dodge: 0.12, speed: 0.2, text: 'Unarmored Defense: 12% more likely to dodge, and moves 20% faster.' },
    spells: ['flurry', 'stunningstrike', 'patientdefense', 'quiveringpalm'],
    blurb: 'Its own body is the only weapon it trusts.',
  },
  paladin: {
    name: 'Paladin', color: '#f2d66b', hitDie: 1.35, cast: 'cha',
    grow: { str: 9, dex: 3, con: 8, int: 2, wis: 4, cha: 8 },
    feature: { poisonproof: true, taken: 0.15, regen: 0.006, text: 'Divine Health: poison can\'t touch it, it takes 15% less damage, and it heals a little every second.' },
    spells: ['divinesmite', 'layonhands', 'auraofprotection', 'holyavenger'],
    blurb: 'Sworn to an oath, and the oath makes it very hard to put down.',
  },
  wizard: {
    name: 'Wizard', color: '#7f9fe0', hitDie: 0.8, cast: 'int',
    grow: { str: 2, dex: 5, con: 4, int: 13, wis: 6, cha: 4 },
    feature: { cooldown: 0.3, text: 'Arcane Recovery: every move comes back 30% sooner.' },
    spells: ['magicmissile', 'fireball', 'holdperson', 'meteorswarm'],
    blurb: 'Fragile, and the most dangerous thing in any room it is in.',
  },
  cleric: {
    name: 'Cleric', color: '#ffe8a0', hitDie: 1.15, cast: 'wis',
    grow: { str: 5, dex: 3, con: 7, int: 3, wis: 12, cha: 5 },
    feature: { regen: 0.015, hp: 0.15, text: 'Channel Divinity: 15% more health, and it heals 1.5% of it every second.' },
    spells: ['curewounds', 'guidingbolt', 'spiritguardians', 'massheal'],
    blurb: 'Something answers when it prays, and the answer usually hurts someone else.',
  },
  warlock: {
    name: 'Warlock', color: '#6a3aa8', hitDie: 1, cast: 'cha',
    grow: { str: 3, dex: 5, con: 5, int: 6, wis: 3, cha: 13 },
    feature: { absorb: 0.12, damage: 0.1, text: 'Pact of the Void: everything it does lands 10% harder, and it heals 12% of the damage it deals.' },
    spells: ['eldritchblast', 'hexcurse', 'hungerofhadar', 'darkonesblessing'],
    blurb: 'Made a deal with something at the bottom of the Negative. It is still paying.',
  },
};
export const CLASS_IDS = Object.keys(CLASSES);
// A class's spells grow this much more powerful for every point of its casting score.
export const CAST_POWER = 1 / 1200;

// Every spell, as an arena move (added to ABILITIES in data/paths.js). `splash` on a bomb hits
// everything that close to the target too.
export const NEG_MOVES = {
  secondwind:       { name: 'Second Wind',        cry: 'SECOND WIND',        loud: true, kind: 'heal', cd: 14, power: 0.25, color: '#c0c6cf' },
  cleave:           { name: 'Cleave',             cry: 'CLEAVE',             loud: true, kind: 'cone', cd: 7,  power: 1.6, range: 170, color: '#e0e6ef' },
  actionsurge:      { name: 'Action Surge',       cry: 'ACTION SURGE',       loud: true, kind: 'buff', cd: 14, dur: 3, speed: 0.8, atk: 0.5, color: '#ffffff' },
  indomitable:      { name: 'Indomitable',        cry: 'INDOMITABLE',        loud: true, kind: 'buff', cd: 15, dur: 4, guard: 0.6, color: '#c0c6cf' },
  rage:             { name: 'Rage',               cry: 'RAGE',               loud: true, kind: 'buff', cd: 15, dur: 6, atk: 0.5, guard: 0.3, color: '#ff4a3a' },
  recklessstrike:   { name: 'Reckless Strike',    cry: 'RECKLESS STRIKE',    loud: true, kind: 'dash', cd: 8,  power: 2.4, range: 650, color: '#ff6a4a' },
  frenzyslam:       { name: 'Frenzy Slam',        cry: 'FRENZY SLAM',        loud: true, kind: 'nova', cd: 9,  power: 1.6, range: 160, stun: 0.8, color: '#c2412b' },
  earthshaker:      { name: 'Earthshaker',        cry: 'EARTHSHAKER',        loud: true, kind: 'nova', cd: 16, power: 2.4, range: 240, stun: 1.4, color: '#a0703a' },
  sneakattack:      { name: 'Sneak Attack',       cry: 'SNEAK ATTACK',       loud: true, kind: 'dash', cd: 8,  power: 2.8, range: 700, color: '#8a8aa0' },
  cunningaction:    { name: 'Cunning Action',     cry: 'CUNNING ACTION',     loud: true, kind: 'buff', cd: 10, dur: 2.5, dodge: 0.6, speed: 0.8, color: '#6a6a80' },
  poisonblade:      { name: 'Poisoned Blade',     cry: 'POISONED BLADE',     loud: true, kind: 'bolt', cd: 8,  power: 0.6, poison: 0.6, poisonFor: 5, range: 420, speed: 900, color: '#8fe05a' },
  assassinate:      { name: 'Assassinate',        cry: 'ASSASSINATE',        loud: true, kind: 'dash', cd: 18, power: 4.4, range: 750, color: '#2a2a3a' },
  flurry:           { name: 'Flurry of Blows',    cry: 'FLURRY OF BLOWS',    loud: true, kind: 'bolt', cd: 6,  volley: 5, power: 0.36, range: 200, speed: 1000, color: '#ffd66b' },
  stunningstrike:   { name: 'Stunning Strike',    cry: 'STUNNING STRIKE',    loud: true, kind: 'dash', cd: 9,  power: 1.4, stun: 1.5, range: 600, color: '#ffe8a0' },
  patientdefense:   { name: 'Patient Defense',    cry: 'PATIENT DEFENSE',    loud: true, kind: 'buff', cd: 10, dur: 2, dodge: 0.8, color: '#f2e6c9' },
  quiveringpalm:    { name: 'Quivering Palm',     cry: 'QUIVERING PALM',     boom: 'SHATTERED', loud: true, kind: 'bomb', cd: 18, power: 4, fuse: 3, range: 220, color: '#d9a441' },
  divinesmite:      { name: 'Divine Smite',       cry: 'DIVINE SMITE',       loud: true, kind: 'dash', cd: 8,  power: 2.2, range: 650, color: '#fff2a0' },
  layonhands:       { name: 'Lay on Hands',       cry: 'LAY ON HANDS',       loud: true, kind: 'heal', cd: 18, power: 0.35, color: '#fff6c0' },
  auraofprotection: { name: 'Aura of Protection', cry: 'AURA OF PROTECTION', loud: true, kind: 'buff', cd: 14, dur: 5, guard: 0.45, color: '#f2d66b' },
  holyavenger:      { name: 'Holy Avenger',       cry: 'HOLY AVENGER',       loud: true, kind: 'cone', cd: 12, power: 2.4, range: 200, color: '#ffffff' },
  magicmissile:     { name: 'Magic Missile',      cry: 'MAGIC MISSILE',      loud: true, kind: 'bolt', cd: 6,  volley: 3, power: 0.55, range: 620, speed: 900, color: '#b0a0ff' },
  fireball:         { name: 'Fireball',           cry: 'FIREBALL',           boom: 'FWOOM', loud: true, kind: 'bomb', cd: 11, power: 2.4, fuse: 1, splash: 170, range: 600, color: '#ff7a2a' },
  holdperson:       { name: 'Hold Person',        cry: 'HOLD PERSON',        loud: true, kind: 'bolt', cd: 13, power: 0.2, stun: 2.4, range: 520, speed: 800, color: '#d0c8ff' },
  meteorswarm:      { name: 'Meteor Swarm',       cry: 'METEOR SWARM',       boom: 'IMPACT', loud: true, kind: 'bomb', cd: 20, power: 3.6, fuse: 2, splash: 220, range: 700, color: '#ff5a2a' },
  curewounds:       { name: 'Cure Wounds',        cry: 'CURE WOUNDS',        loud: true, kind: 'heal', cd: 12, power: 0.3, color: '#fff0a0' },
  guidingbolt:      { name: 'Guiding Bolt',       cry: 'GUIDING BOLT',       loud: true, kind: 'bolt', cd: 8,  power: 1.6, range: 560, speed: 800, color: '#fff8d0' },
  spiritguardians:  { name: 'Spirit Guardians',   cry: 'SPIRIT GUARDIANS',   loud: true, kind: 'nova', cd: 12, power: 0.8, range: 200, poison: 0.4, poisonFor: 5, color: '#ffe8a0' },
  massheal:         { name: 'Mass Heal',          cry: 'MASS HEAL',          loud: true, kind: 'heal', cd: 26, power: 0.6, color: '#ffffff' },
  eldritchblast:    { name: 'Eldritch Blast',     cry: 'ELDRITCH BLAST',     loud: true, kind: 'bolt', cd: 5,  volley: 2, power: 0.9, range: 620, speed: 850, push: 30, color: '#9a5aff' },
  hexcurse:         { name: 'Hex',                cry: 'HEX',                loud: true, kind: 'bolt', cd: 10, power: 0.3, poison: 0.5, poisonFor: 8, silence: 2, range: 520, speed: 700, color: '#7a3ab0' },
  hungerofhadar:    { name: 'Hunger of Hadar',    cry: 'HUNGER OF HADAR',    loud: true, kind: 'nova', cd: 13, power: 1, range: 240, confuse: 1.5, poison: 0.3, poisonFor: 4, color: '#2a1a3a' },
  darkonesblessing: { name: 'Dark One\'s Blessing', cry: 'DARK ONE\'S BLESSING', loud: true, kind: 'heal', cd: 15, power: 0.2, atk: 0.4, dur: 4, color: '#6a3aa8' },
};

// ---------- Nen ----------

// Its Nen type is found by water divination, a glass of water with a leaf on it, and is decided by its
// egg. The hexagon says how well it can use each type: its own at 100%, the two beside it at 80%,
// the two after those at 60%, and the one across at 40%. Only a Specialist can use Specialization.
export const NEN_TYPES = {
  enhancer: { name: 'Enhancement', color: '#ffb347', water: 'The water rose, and spilled over the glass.', text: 'Makes what it already has stronger: its body, its fists, its armor.' },
  transmuter: { name: 'Transmutation', color: '#6fe7ff', water: 'The water tastes different now.', text: 'Changes what its aura is like: lightning, rubber, anything.' },
  conjurer: { name: 'Conjuration', color: '#c98cff', water: 'Something grew in the water.', text: 'Makes real things out of aura: chains, weapons, creatures.' },
  specialist: { name: 'Specialization', color: '#ffffff', water: 'Something else happened entirely.', text: 'Rare, and like nothing else. Only a Specialist can use it.' },
  manipulator: { name: 'Manipulation', color: '#7ee05a', water: 'The leaf on the water moved by itself.', text: 'Takes control of things, and of other people.' },
  emitter: { name: 'Emission', color: '#ff6b5e', water: 'The water changed color.', text: 'Sends its aura away from its body and keeps it strong.' },
};
export const NEN_HEXAGON = Object.keys(NEN_TYPES);
export const NEN_AFFINITY = [1, 0.8, 0.6, 0.4];
// One egg in this many is a Specialist.
export const SPECIALIST_ODDS = 12;

// Its aura, spread over five techniques: NEN_POINTS points in all, put wherever you like. Each point
// gives `per` of what it does, times how strong its aura is (auraOf in core/negative.js), up to `max`.
export const NEN_POINTS = 100;
export const NEN_TECHNIQUES = {
  ten: { name: 'Ten', key: 'taken', per: 0.004, max: 0.6, text: 'Aura held close as armor: takes less damage.' },
  ren: { name: 'Ren', key: 'damage', per: 0.006, max: 1, text: 'Aura pushed out hard: everything it does lands harder.' },
  gyo: { name: 'Gyo', key: 'crit', per: 0.003, max: 0.4, text: 'Aura in the eyes: sees weak spots, for more critical hits.' },
  en: { name: 'En', key: 'dodge', per: 0.0025, max: 0.3, reach: 0.6, text: 'Aura spread around it: feels everything coming, dodges more and reaches further.' },
  zetsu: { name: 'Zetsu', key: 'regen', per: 0.0002, max: 0.03, text: 'Aura shut in and resting: heals a little every second.' },
};
export const NEN_TECHNIQUE_IDS = Object.keys(NEN_TECHNIQUES);
// Ko: every `every`th swing pours all of its aura into one fist, for `power` times the damage plus
// one more for every `perRen` points of Ren, and leaves it wide open: for `open` seconds after, it
// takes `openTaken` times the damage.
export const KO = { every: 6, power: 3, perRen: 40, open: 1.5, openTaken: 2 };

// The Hatsu: the one ability it makes its own. Pick its type, and what it does. Its power is its
// affinity with that type, times its vows, times its aura.
export const HATSU_FORMS = {
  enhancer: {
    rock: { name: 'Rock', text: 'All its aura in one fist, from across the ring.', def: { kind: 'dash', cd: 12, power: 3.2, range: 650 } },
    ironbody: { name: 'Iron Body', text: 'Its whole body hardens, and hits harder for it.', def: { kind: 'buff', cd: 14, dur: 5, guard: 0.5, atk: 0.4 } },
  },
  transmuter: {
    lightning: { name: 'Lightning Palm', text: 'Its aura turns to lightning, and the lightning stuns.', def: { kind: 'bolt', cd: 9, power: 1.5, stun: 1.2, range: 460, speed: 1100 } },
    elastic: { name: 'Elastic Snare', text: 'Its aura stretches, sticks, and snaps back with them on it.', def: { kind: 'pull', cd: 9, power: 1.3, stun: 1, range: 600 } },
  },
  conjurer: {
    chains: { name: 'Judgment Chain', text: 'A chain of aura that binds them and stops their moves.', def: { kind: 'bolt', cd: 13, power: 0.6, stun: 2, silence: 3, range: 520, speed: 700 } },
    familiar: { name: 'Familiar', text: 'Conjures shadow beasts to fight beside it.', def: { kind: 'summon', cd: 15, count: 2, minion: 'shadow' } },
  },
  specialist: {
    stolentime: { name: 'Stolen Time', text: 'Takes a few seconds that belonged to everyone else.', def: { kind: 'timestop', cd: 24, dur: 1.6 } },
    emperor: { name: 'Emperor Aura', text: 'Every type at once, for a little while: faster, harder and harder to hit.', def: { kind: 'buff', cd: 14, dur: 5, atk: 0.6, dodge: 0.3, speed: 0.6 } },
    thief: { name: 'Thief\'s Book', text: 'Steals one of their moves and keeps it for the fight.', def: { kind: 'steal', cd: 16, range: 480 } },
  },
  manipulator: {
    needle: { name: 'Puppet Needle', text: 'A needle of aura, and they fight for nobody for a while.', def: { kind: 'bolt', cd: 10, power: 0.5, confuse: 2.6, range: 520, speed: 900 } },
    command: { name: 'Command', text: 'One word, and everything close by forgets which side it is on.', def: { kind: 'nova', cd: 12, power: 0.6, confuse: 1.8, range: 220 } },
  },
  emitter: {
    cannon: { name: 'Aura Cannon', text: 'One huge shot of aura, from as far as it can see.', def: { kind: 'bolt', cd: 10, power: 2.4, range: 680, speed: 800 } },
    barrage: { name: 'Hundred Shots', text: 'More shots than anyone can count.', def: { kind: 'bolt', cd: 9, volley: 6, power: 0.42, range: 560, speed: 760 } },
  },
};
// Vows and limitations: each makes its Hatsu `mul` times as strong, for the price it says. It can
// swear up to MAX_VOWS of them, and they multiply.
export const MAX_VOWS = 3;
export const VOWS = {
  cornered: { name: 'Only when cornered', mul: 1.6, text: 'Its Hatsu only works below half its health.' },
  blood: { name: 'Paid in blood', mul: 1.5, text: 'Every use costs it 10% of its max health.' },
  spoken: { name: 'Spoken aloud', mul: 1.35, text: 'It has to say the whole name out loud: its Hatsu takes 60% longer to come back.' },
  close: { name: 'Only up close', mul: 1.3, text: 'Its Hatsu only works on something within 170 of it.' },
  patience: { name: 'Patience', mul: 1.4, text: 'Never in the first 10 seconds of a fight.' },
  oath: { name: 'Death oath', mul: 2, text: 'If its party loses a fight, it loses a whole level.' },
};
export const VOW_IDS = Object.keys(VOWS);

// A Hatsu carried over. When a creature crosses over to the light world it can bring its Hatsu with
// it as a gift in its blood: one gift for each form, `hatsu<form>`, that teaches the form as a move
// at HATSU_LIGHT times its base strength (no vows: those stay in the Negative), and leaves a little
// of its Nen type in every fight (HATSU_BLOOD). It passes on by breeding like any born-with gift, and
// no egg ever hatches with one. data/powers.js adds these to TRAITS, data/paths.js the moves.
export const HATSU_LIGHT = 1.25;
export const HATSU_BLOOD = {
  enhancer: { taken: 0.1, text: 'takes 10% less damage' },
  transmuter: { speed: 0.12, text: 'moves 12% faster' },
  conjurer: { hp: 0.12, text: 'has 12% more max HP' },
  specialist: { cooldown: 0.15, text: 'its moves come back 15% sooner' },
  manipulator: { crit: 0.1, text: 'lands 10% more critical hits' },
  emitter: { reach: 30, text: 'swings from a little further away' },
};
export const hatsuGiftId = (form) => `hatsu${form}`;
const lighter = (def) => {
  const d = { ...def };
  if (d.power) d.power = d.kind === 'heal' ? Math.min(0.7, d.power * HATSU_LIGHT) : Math.round(d.power * HATSU_LIGHT * 100) / 100;
  if (d.kind === 'summon') d.count = Math.min(5, d.count + 1);
  return d;
};
export const HATSU_MOVES = {};
export const HATSU_TRAITS = {};
for (const [type, forms] of Object.entries(HATSU_FORMS)) {
  for (const [form, f] of Object.entries(forms)) {
    const id = hatsuGiftId(form);
    HATSU_MOVES[id] = { ...lighter(f.def), name: f.name, cry: f.name.toUpperCase(), loud: true, color: NEN_TYPES[type].color };
    const { text, ...passive } = HATSU_BLOOD[type];
    HATSU_TRAITS[id] = {
      name: `Hatsu: ${f.name}`, color: NEN_TYPES[type].color, hatsu: true, nenType: type, move: id, passive,
      blurb: `A Hatsu of ${NEN_TYPES[type].name} that crossed over from the Negative, and runs in the family now. ${f.text} Its ${NEN_TYPES[type].name} stays in the blood too: it ${text}.`,
    };
  }
}

// ---------- Alchemy ----------

// Up to MAX_CIRCLES transmutation circles, each one a move it designs. Pick a shape and an element,
// then pay for it: the more it pays, in health each use, in time before it comes back, and in toll
// (a share of its own attack, gone for the rest of the fight each use), the stronger it is.
// Equivalent exchange: nothing for nothing.
export const MAX_CIRCLES = 3;
export const ALCHEMY_SHAPES = {
  spike: { name: 'Spike', text: 'A spike thrown up out of the ground under one of them.', def: { kind: 'bolt', power: 0.7, range: 520, speed: 900 } },
  rain: { name: 'Rain', text: 'A shower of shards at one of them.', def: { kind: 'bolt', volley: 4, power: 0.22, range: 540, speed: 760 } },
  wave: { name: 'Wave', text: 'A wall of ground rolled over everything in front of it.', def: { kind: 'cone', power: 0.8, range: 190 } },
  burst: { name: 'Burst', text: 'Everything around it, all at once.', def: { kind: 'nova', power: 0.7, range: 190 } },
  lance: { name: 'Lance', text: 'Rides a lance of stone straight at them.', def: { kind: 'dash', power: 0.9, range: 650 } },
  mend: { name: 'Mend', text: 'Rebuilds its own body.', def: { kind: 'heal', power: 0.1 } },
  wall: { name: 'Wall', text: 'Raises armor out of the ground around itself.', def: { kind: 'buff', guard: 0.2, dur: 3 } },
  golem: { name: 'Golem', text: 'Raises beasts of stone to fight for it.', def: { kind: 'summon', count: 1, minion: 'beast' } },
};
export const ALCHEMY_ELEMENTS = {
  earth: { name: 'Earth', rider: { stun: 0.8 }, text: 'stuns' },
  fire: { name: 'Fire', rider: { poison: 0.3, poisonFor: 4 }, text: 'burns for 4 seconds' },
  ice: { name: 'Ice', power: 0.8, rider: { stun: 1.5 }, text: 'freezes them solid, but hits softer' },
  air: { name: 'Air', rider: { push: 80 }, text: 'throws them back' },
  iron: { name: 'Iron', power: 1.25, text: 'nothing else, but hits a quarter harder' },
  lightning: { name: 'Lightning', rider: { confuse: 1 }, text: 'confuses' },
  flesh: { name: 'Flesh', rider: { drain: 0.3 }, text: 'heals it for 30% of the damage' },
};
// What it can pay, and what each step of it is worth: `worth` more power for each whole unit paid.
export const ALCHEMY_COSTS = {
  hp: { name: 'Health', min: 0, max: 0.3, step: 0.02, worth: 4, text: 'of its max health, every use' },
  cd: { name: 'Time', min: 4, max: 20, step: 1, worth: 0.12, text: 'seconds before it comes back' },
  toll: { name: 'Toll', min: 0, max: 0.1, step: 0.01, worth: 6, text: 'of its attack, gone for the rest of the fight, every use' },
};
// Intelligence makes every circle this much stronger per point.
export const ALCHEMY_INT = 1 / 1500;

// ---------- its own Adventure ----------

// 30 levels for a party of up to NEG_PARTY. Nobody dies here either. Whoever wins the last one with it
// in the party can cross over to the light world. Level n sends wild creatures of the Negative at
// level enemyLevel(n), more of them as it goes, and the boss levels send something worse.
export const NEG_LEVELS = [
  { name: 'The Upside-Down Field', text: 'The grass grows down. The thing in the grass grows up.' },
  { name: 'Ashfall Village', text: 'It snows ash here, and the villagers do not like visitors.' },
  { name: 'The Reverse Bridge', text: 'It goes back the way you came, and someone is on it.' },
  { name: 'Mirror Pond', text: 'Your reflection got out first.' },
  { name: 'The Hollow Orchard', text: 'The fruit is empty. The trees are not.' },
  { name: 'The Shadow Market', text: 'Everything is for sale. Mostly you.' },
  { name: 'Black Snow Pass', text: 'Cold that makes things stronger, if they are from here.' },
  { name: 'The Inverted Tower', text: 'You climb down to reach the top.' },
  { name: 'Glasswater Docks', text: 'Ships of glass, crews of shadow.' },
  { name: 'The Inverted Shell', text: 'Old Shell has a twin down here, and its shell faces in.', boss: true },
  { name: 'Bone Lantern Road', text: 'The lanterns are lit with something you should not look at.' },
  { name: 'The Silent Choir', text: 'They sing with their hands, and their hands are sharp.' },
  { name: 'Hexwood', text: 'Every tree is a Hexborn that stood still too long.' },
  { name: 'The Drowned Sky', text: 'The sky is underwater, and so are you.' },
  { name: 'The Clockless City', text: 'Nobody here knows what time it is, so it is always time to fight.' },
  { name: 'The Rust Cathedral', text: 'The Antiseraphs pray here, to something that answers.' },
  { name: 'The Weeping Mines', text: 'Miners of the Negative dig for light, and they have found some.' },
  { name: 'Moth Plains', text: 'A sky full of moths, all flying away from the sun.' },
  { name: 'The Starless Coast', text: 'The sea here reflects nothing.' },
  { name: 'The Inverted Rex', text: 'One bite takes something out of you that you did not know you had.', boss: true },
  { name: 'The Hungry Library', text: 'Every book is open, and every book is reading you.' },
  { name: 'The Null Gardens', text: 'Where Null Fields grow, nothing can use a move.' },
  { name: 'The Stitched Mountains', text: 'Someone sewed the mountains together. The stitches are watching.' },
  { name: 'The Mirrorkin Halls', text: 'Every hall is a mirror, and every mirror hits back.' },
  { name: 'The Antiseraph Spire', text: 'A tower of black halos, all the way up.' },
  { name: 'The Titan Graves', text: 'The Abyssal Titans bury their dead standing up. They do not stay buried.' },
  { name: 'The Dreadwyrm Nest', text: 'The eggs are hatching, and the mothers are home.' },
  { name: 'The Edge of the Negative', text: 'You can see the light world from here. Something does not want you to.' },
  { name: 'The Thin Place', text: 'The wall between the worlds is paper here. The guards are not.' },
  { name: 'The Negative King', text: 'It rules everything on this side. Beat it, and whoever did can cross over.', boss: true },
];
export const NEG_LEVEL_COUNT = NEG_LEVELS.length;
export const enemyLevel = (n) => Math.min(NEG_MAX_LEVEL, Math.round(1 + (n - 1) * 1.9));
export const NEG_ENEMIES = { max: 4, moreEvery: 7 };
// Everything on the other side hits and lasts this much harder for every level after the first.
export const NEG_TOUGHER = 0.02;
export const NEG_BOSSES = {
  10: { monster: 'tortoise', name: 'The Inverted Shell', power: 1.2, passive: { reflect: 0.3, unstoppable: true, text: 'Its shell faces inward: it throws 3% of every hit back, and nothing can stop it.' } },
  20: { monster: 'rex', name: 'The Inverted Rex', power: 1.1, moves: ['reckoning', 'quake', 'stoop', 'oblivion'], passive: { absorb: 0.2, enrage: 0.6, text: 'Heals from every bite, and below half its health it bites 60% harder.' } },
  30: { monster: 'dragon', name: 'The Negative King', power: 0.9, moves: ['prominence', 'devourstar', 'worldbreak', 'endtime'], passive: { lives: 1, unstoppable: true, nullField: true, text: 'Nothing stops it, every 6 seconds it silences everything near it, and it gets back up once.' } },
};
// Boss stats in the Negative are this many times their Challenges stats, before NEG_SCALE.
export const NEG_BOSS_STATS = 1.4;

// What winning pays: Void Shards, the money of the Negative, and XP for everyone in the party.
// Losing still pays a share of the XP.
export const NEG_REWARD = { shards: 10, shardsPerLevel: 3, replayShards: 2, xp: 25, xpPerLevel: 14, lossXp: 0.4 };

// ---------- the Elite Negative ----------

// There is more under the Negative. Once Chapter ??? is beaten in the light world, the Negative's
// Adventure opens ELITE_LEVELS more: wild creatures at the top of everything (ELITE.level), each
// born with ELITE.gifts more gifts of the Negative, starting ELITE.tough times as strong as usual and
// ELITE.grow times stronger every level, more of them from level ELITE.moreEvery. Every first win pays Ascension Stones, the boss levels
// more, and a boss beaten again still pays one. Stones craft what awakens the light world's powers
// (data/ascension.js).
export const ELITE_LEVELS = [
  { name: 'Under the Floor', text: 'Under the bottom of the Negative there is another floor, and something is standing on it.' },
  { name: 'The Elite Barracks', text: 'Everything the Negative King kept back for a war that never came.' },
  { name: 'The Unmade Road', text: 'Every step undoes the one before it. The guards have had a long time to practise.' },
  { name: 'Hall of the Returned', text: 'The ones who crossed over and came back, stronger and angrier.' },
  { name: 'The Stone Warden', text: 'It guards the first Ascension Stone, and it has never once let go of it.', boss: true },
  { name: 'The Forge of Stones', text: 'Where Ascension Stones are made, out of whatever loses here.' },
  { name: 'The Lightless Choir', text: 'They sing the note that comes after the last one.' },
  { name: 'The Mirror of Both Worlds', text: 'It shows the light world, and the light world looks back.' },
  { name: 'The Last Wall', text: 'Past it, nothing in either world has rules.' },
  { name: 'The Ascended King', text: 'The Negative King, after it found the stones. Beat it, and they are yours.', boss: true },
];
export const ELITE_COUNT = ELITE_LEVELS.length;
export const ELITE = { level: 60, tough: 1, grow: 1.08, enemies: 2, moreEvery: 8, gifts: 1, bossStats: 1.6 };
export const ELITE_BOSSES = {
  5: { monster: 'leviathan', name: 'The Stone Warden', power: 1.5, moves: ['quake', 'bonewall', 'worldbreak', 'tendrils'], passive: { taken: 0.3, reflect: 0.25, unstoppable: true, regen: 0.006, text: 'Made of the stones it guards: it takes 30% less damage, throws 2.5% of every hit back, nothing stops it, and it slowly mends.' } },
  10: { monster: 'dragon', name: 'The Ascended King', power: 1.6, moves: ['prominence', 'devourstar', 'lastlight', 'endtime', 'worldbreak'], passive: { lives: 2, unstoppable: true, nullField: true, reflect: 0.2, absorb: 0.15, text: 'Nothing stops it, every 6 seconds it silences everything near it, it throws 2% of every hit back and heals from what it deals, and it gets back up twice.' } },
};
// What an Elite win pays. Ascension Stones: `stones` for a first win, `bossStones` for the first win
// of a boss level, and `replayBossStones` every time a boss level is beaten again.
export const ELITE_REWARD = { stones: 1, bossStones: 3, replayBossStones: 1, shards: 150, shardsPerLevel: 30, replayShards: 25, xp: 600, xpPerLevel: 40, lossXp: 0.4 };
