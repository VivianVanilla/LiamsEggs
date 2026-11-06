// Powers a creature can earn on top of its job.
//   It can be one of these three, for good, unless a Legendary mutation lets it have two
//   (Twin Soul: any two. Malevolent Soul: a Stand, plus a speedster or a cursed technique):
//     a Stand (JoJo's Bizarre Adventure), from Wits. Its soul decides which one it gets.
//     a speedster, from Speed.
//     a cursed technique (Jujutsu Kaisen), from Might. Its family name decides which one.
//   Quirks (My Hero Academia) are separate, and are paid for with max HP, forever.
// The names and powers come from the shows. The pictures do not: see art/CREDITS.md.
//   Some are born with a gift (Six Eyes, Sharingan, Cursed Body), and parents can pass those on.
//   One For All is a Quirk that grows: a holder can pass it on, which ends the holder for good.
// Pictures: stands/<id>.png, techniques/<id>.png, quirks/<id>.png, powers/speedster.png, legendary/<id>.png.

export const STAND_WITS = 20;
export const SPEEDSTER_SPEED = 20;
export const TECHNIQUE_MIGHT = 20;

// How many of those three a creature can hold.
export const POWER_SLOTS = 1;
export const POWER_SLOTS_LEGENDARY = 2;

// The most max HP a creature can give up, in percent. Quirk costs are whole percents too.
export const MAX_HP_GIVEN = 60;

// `lean` is the stat a creature's soul has to lean on for this Stand to come out.
// `moves` are its arena moves, in POWER_MOVES below.
export const STANDS = {
  // Might
  starplatinum: {
    name: 'Star Platinum', lean: 'might', color: '#7a5bd6', stats: { might: 2, speed: 2 }, movesInStop: true,
    moves: ['oraora', 'starworld'],
    blurb: 'Impossibly fast fists, and a moment of stopped time. It can also move when someone else stops time.',
  },
  theworld: {
    name: 'The World', lean: 'might', color: '#e3bd35', stats: { might: 2, guard: 1 }, movesInStop: true,
    moves: ['mudamuda', 'zawarudo'],
    blurb: 'Stops time. Everything else in the ring just stands there and takes it.',
  },
  kingcrimson: {
    name: 'King Crimson', lean: 'might', color: '#b3203a', stats: { might: 2, wits: 1 },
    moves: ['eraser'],
    blurb: 'Erases a few seconds. Nothing can touch it, and then it is standing behind you.',
  },
  magiciansred: {
    name: "Magician's Red", lean: 'might', color: '#d9542f', stats: { might: 2, vigor: 1 },
    moves: ['crossfire'],
    blurb: 'Crossfire Hurricane. The flames keep burning after they land.',
  },
  // Guard
  stonefree: {
    name: 'Stone Free', lean: 'guard', color: '#4d86c9', stats: { guard: 2, might: 1 },
    moves: ['stringbind', 'orastring'],
    blurb: 'Unravels into string, ties you down, and then hits you anyway.',
  },
  thehand: {
    name: 'The Hand', lean: 'guard', color: '#3a66c9', stats: { guard: 2, might: 1 },
    moves: ['zahando'],
    blurb: 'Erases the space between you. You arrive whether you like it or not.',
  },
  // Speed
  silverchariot: {
    name: 'Silver Chariot', lean: 'speed', color: '#bfc7d4', stats: { speed: 2, wits: 2 },
    moves: ['horahora', 'armoroff'],
    blurb: 'A rapier faster than the eye. Drops its armor to go faster still.',
  },
  stickyfingers: {
    name: 'Sticky Fingers', lean: 'speed', color: '#3f63a8', stats: { speed: 2, might: 1 },
    moves: ['ariari', 'zipper'],
    blurb: 'Zips a door into the floor and comes out next to you.',
  },
  // Vigor
  crazydiamond: {
    name: 'Crazy Diamond', lean: 'vigor', color: '#e58ab8', stats: { vigor: 1, might: 1 },
    moves: ['dorarara', 'restore'],
    blurb: 'Punches hard and fixes anything, including its user.',
  },
  goldexperience: {
    name: 'Gold Experience', lean: 'vigor', color: '#e6c84c', stats: { vigor: 2, speed: 2 },
    moves: ['mudagold', 'lifegiver'],
    blurb: 'Gives life to whatever it touches. The life it gives bites.',
  },
  purplehaze: {
    name: 'Purple Haze', lean: 'vigor', color: '#8a4fb8', stats: { vigor: 2, might: 1 },
    moves: ['haze'],
    blurb: 'A cloud of virus that does not care whose side you are on. Its user catches a little too.',
  },
  // Wits
  hierophant: {
    name: 'Hierophant Green', lean: 'wits', color: '#3fb56a', stats: { wits: 2, speed: 2 },
    moves: ['emerald'],
    blurb: 'Emerald Splash, from clear across the ring.',
  },
  heavensdoor: {
    name: "Heaven's Door", lean: 'wits', color: '#d8c48e', stats: { wits: 3, guard: 1 },
    moves: ['bookify'],
    blurb: 'Opens you up like a book and writes in you that you have no moves.',
  },
  killerqueen: {
    name: 'Killer Queen', lean: 'wits', color: '#d98fb0', stats: { wits: 2, might: 1 },
    moves: ['bomb'],
    blurb: 'Anything it touches is a bomb. The fuse is short.',
  },
};

export const STAND_IDS = Object.keys(STANDS);

// Anyone with a cursed technique sometimes lands a Black Flash on a melee swing.
export const BLACK_FLASH = { chance: 0.1, power: 2.5 };

export const TECHNIQUES = {
  limitless: {
    name: 'Limitless', family: 'Gojo', color: '#7f9fe0', stats: { wits: 2, speed: 1 },
    moves: ['infinity', 'hollowpurple'],
    blurb: 'Nothing quite reaches it for a moment, and then Blue and Red meet in the middle of you.',
  },
  shrine: {
    name: 'Shrine', family: 'Ryomen', color: '#c9302c', stats: { might: 3 },
    moves: ['dismantle', 'malevolent'],
    blurb: 'Invisible cuts from a distance, and a domain that cuts everything in the ring.',
  },
  tenshadows: {
    name: 'Ten Shadows', family: 'Zenin', color: '#4a4560', stats: { wits: 1, vigor: 2 },
    moves: ['divinedogs', 'nue'],
    blurb: 'Calls shikigami out of its own shadow to fight for it.',
  },
  strawdoll: {
    name: 'Straw Doll', family: 'Kugisaki', color: '#c9a35a', stats: { might: 2, wits: 1 },
    moves: ['hairpin', 'resonance'],
    blurb: 'Hammers nails from across the ring, and hurts you through what it already took.',
  },
  ratio: {
    name: 'Ratio Technique', family: 'Nanami', color: '#d9c82e', stats: { might: 2, guard: 1 },
    moves: ['seventhree', 'overtime'],
    blurb: 'Hits the one weak point, seven tenths along. Gets stronger once it is past its hours.',
  },
  speech: {
    name: 'Cursed Speech', family: 'Inumaki', color: '#e4e6ee', stats: { wits: 2, vigor: 1 },
    moves: ['dontmove', 'blastaway'],
    blurb: 'Says it, and you do it. It hurts its own throat a little every time.',
  },
  flames: {
    name: 'Disaster Flames', family: 'Jogo', color: '#ff7a2a', stats: { might: 2, vigor: 1 },
    moves: ['insects', 'meteor'],
    blurb: 'Sends burning insects at you, then drops a small sun on the spot.',
  },
  boogie: {
    name: 'Boogie Woogie', family: 'Todo', color: '#a24fd6', stats: { speed: 2, might: 1 },
    moves: ['clap'],
    blurb: 'One clap and you have swapped places with something, and no idea what just happened.',
  },
};

export const TECHNIQUE_IDS = Object.keys(TECHNIQUES);

// Rare. It doesn't take up one of its mutation places.
export const LEGENDARY = {
  twinsoul: {
    name: 'Twin Soul', color: '#ffe14a', stats: { might: 1, guard: 1, speed: 1, wits: 1, vigor: 1 },
    blurb: 'A second soul growing beside the first. It can hold any two of a Stand, speedster powers and a cursed technique, instead of one.',
  },
  malevolentsoul: {
    name: 'Malevolent Soul', color: '#c9302c', stats: { might: 3, vigor: 2 }, apart: true, fruit: true,
    blurb: 'Something cruel has moved in. It can hold a Stand, plus one more: speedster powers, a cursed technique or a Devil Fruit.',
  },
};
export const LEGENDARY_ID = 'twinsoul';
export const MALEVOLENT_ID = 'malevolentsoul';

// What a soul with `apart` keeps separate: it can't hold two powers from one category. A soul with
// `fruit` can hold a Devil Fruit beside its other power; without it, a fruit goes with nothing.
export const POWER_CATEGORIES = { stand: 'stand', speedster: 'other', technique: 'other', fruit: 'other' };

// One new mutation in this many comes with a Twin Soul, and The Last Dragon always gives one.
// Any other win to the death has this chance of a Malevolent Soul. A creature only ever has one.
export const LEGENDARY_ONE_IN = 25;
export const LEGENDARY_FROM_TROPHY = 0.15;

// `cost` is the percent of max HP given up for good. `behind` puts its picture behind the body.
export const QUIRKS = {
  oneforall: {
    name: 'One For All', cost: 30, color: '#7ee05a', stats: { might: 6, speed: 2 }, move: 'smash',
    blurb: 'Stacked power from everyone who held it. Hits like a truck and hurts itself doing it. It can be passed on, and grows each time.',
  },
  allforone: {
    name: 'All For One', cost: 35, color: '#6a4a8c', stats: { wits: 1 }, move: 'steal',
    blurb: 'Takes a move away from an enemy and keeps it for the rest of the fight.',
  },
  decay: {
    name: 'Decay', cost: 30, color: '#9a8f7a', stats: { might: 2 }, move: 'decaytouch',
    blurb: 'Whatever it touches keeps falling apart.',
  },
  halfhalf: {
    name: 'Half-Cold Half-Hot', cost: 25, color: '#7fc4ff', stats: { might: 2, guard: 2 }, move: 'flashfreeze',
    blurb: 'Fire on one side, ice on the other. Burns you and freezes you in place.',
  },
  hellflame: {
    name: 'Hellflame', cost: 25, color: '#ff7a2a', stats: { might: 3, vigor: 1 }, move: 'prominence',
    blurb: 'A huge sheet of fire that leaves everything burning.',
  },
  explosion: {
    name: 'Explosion', cost: 20, color: '#ffb02e', stats: { might: 3 }, move: 'howitzer',
    blurb: 'Sweats nitroglycerin. Everything close by gets blown back.',
  },
  erasure: {
    name: 'Erasure', cost: 15, color: '#c9ccd6', stats: { wits: 3 }, move: 'erased',
    blurb: 'One look and your moves stop working for a while.',
  },
  darkshadow: {
    name: 'Dark Shadow', cost: 20, color: '#4a4560', stats: { vigor: 2 }, move: 'shadow', behind: true,
    blurb: 'A living shadow comes out and fights for it.',
  },
  zerogravity: {
    name: 'Zero Gravity', cost: 15, color: '#f2a6c0', stats: { wits: 1, speed: 1 }, move: 'floataway',
    blurb: 'One touch and you drift off the ground, helpless.',
  },
  engine: {
    name: 'Engine', cost: 15, color: '#8fa3c2', stats: { speed: 4 }, move: 'recipro',
    blurb: 'Engines in its legs. Bursts ahead and hits harder for a few seconds.',
  },
  hardening: {
    name: 'Hardening', cost: 15, color: '#c26a4a', stats: { guard: 3 }, move: 'unbreakable',
    blurb: 'Goes hard as rock and shrugs most of it off.',
  },
  electrification: {
    name: 'Electrification', cost: 10, color: '#ffe14a', stats: { speed: 1 }, move: 'shock',
    blurb: 'Zaps everything nearby, then short-circuits its own brain for a moment.',
  },
};

export const QUIRK_IDS = Object.keys(QUIRKS);

// Speedsters also run faster on your screen and get hungry faster.
export const SPEEDSTER = {
  stats: { speed: 3 },
  move: 'machpunch',
  walkMul: 4,
  hungerMul: 2.5,
  mineSpeed: 2.0,
  arenaMove: 1.8,
  arenaAttack: 0.85,
  arenaDodge: 0.06,
};

// Arena moves, added to ABILITIES in data/paths.js. `cry` is what shows on screen when it is
// used, if that differs from its name. `loud` shows it bigger.
export const POWER_MOVES = {
  // Stands. A rush sends the Stand itself over to land a string of hits.
  oraora:     { name: 'Ora Rush',        cry: 'ORA ORA ORA',       loud: true, kind: 'rush', cd: 8,    hits: 5, power: 0.3, every: 0.11, range: 420, color: '#b79cff' },
  starworld:  { name: 'Stopped Time',    cry: 'STAR PLATINUM: THE WORLD', loud: true, kind: 'timestop', cd: 22, dur: 1.2, color: '#b79cff' },
  mudamuda:   { name: 'Muda Rush',       cry: 'MUDA MUDA MUDA',    loud: true, kind: 'rush', cd: 8,    hits: 5, power: 0.3, every: 0.11, range: 420, color: '#ffe16a' },
  zawarudo:   { name: 'The World',       cry: 'ZA WARUDO',         loud: true, kind: 'timestop', cd: 24, dur: 2.2, color: '#ffe16a' },
  eraser:     { name: 'Erased Time',     cry: 'TIME ERASED',       loud: true, kind: 'dash', cd: 11,   power: 2, range: 700, selfBuff: { left: 1.3, dodge: 1 }, color: '#ff4a64' },
  crossfire:  { name: 'Crossfire Hurricane', cry: 'CROSSFIRE HURRICANE', loud: true, kind: 'cone', cd: 8, power: 1.1, range: 170, poison: 0.15, poisonFor: 4, color: '#ff7a3c' },
  stringbind: { name: 'String Bind',     loud: true, kind: 'bolt', cd: 11,   power: 0.4, stun: 1.1, range: 460, speed: 560, color: '#7fb4ff' },
  orastring:  { name: 'Ora Rush',        cry: 'ORA ORA',           loud: true, kind: 'rush', cd: 9,    hits: 4, power: 0.3, every: 0.12, range: 420, color: '#7fb4ff' },
  zahando:    { name: 'Erased Space',    cry: 'ZA HANDO',          loud: true, kind: 'pull', cd: 9,    power: 1.9, range: 700, color: '#6f95f0' },
  horahora:   { name: 'Rapier Rush',     cry: 'HORA HORA HORA',    loud: true, kind: 'rush', cd: 8,    hits: 6, power: 0.25, every: 0.08, range: 460, color: '#e6ebf5' },
  armoroff:   { name: 'Armor Off',       loud: true, kind: 'buff', cd: 15,   dur: 3, dodge: 0.3, speed: 1, atk: 0.15, color: '#e6ebf5' },
  ariari:     { name: 'Ari Rush',        cry: 'ARI ARI ARI',       loud: true, kind: 'rush', cd: 9,    hits: 4, power: 0.32, every: 0.11, range: 420, color: '#7f9fe0' },
  zipper:     { name: 'Zipper Door',     loud: true, kind: 'dash', cd: 10,   power: 1.3, range: 700, color: '#7f9fe0' },
  dorarara:   { name: 'Dora Rush',       cry: 'DORARARARA',        loud: true, kind: 'rush', cd: 9,    hits: 4, power: 0.3, every: 0.11, range: 420, color: '#ffaad2' },
  restore:    { name: 'Restoration',     loud: true, kind: 'heal', cd: 16,   power: 0.12, color: '#ffaad2' },
  mudagold:   { name: 'Muda Rush',       cry: 'MUDA MUDA',         loud: true, kind: 'rush', cd: 9,    hits: 4, power: 0.32, every: 0.11, range: 420, color: '#ffe16a' },
  lifegiver:  { name: 'Life Giver',      loud: true, kind: 'summon', cd: 14, count: 2, minion: 'bug', color: '#ffe16a' },
  haze:       { name: 'Virus Cloud',     cry: 'UBASHAAA',          loud: true, kind: 'nova', cd: 11,   power: 0.4, range: 190, poison: 0.25, poisonFor: 6, selfPoison: 0.15, color: '#c98cff' },
  emerald:    { name: 'Emerald Splash',  cry: 'EMERALD SPLASH',    loud: true, kind: 'bolt', cd: 8,    power: 0.42, volley: 5, range: 560, speed: 640, color: '#5fe08f' },
  bookify:    { name: 'Heaven\'s Door',  cry: 'HEAVEN\'S DOOR',    loud: true, kind: 'bolt', cd: 12,   power: 0.5, stun: 1.2, silence: 4, range: 420, speed: 520, color: '#f0e0b0' },
  bomb:       { name: 'First Bomb',      cry: 'KILLER QUEEN',      boom: 'BITES THE DUST', loud: true, kind: 'bomb', cd: 9, power: 2.2, fuse: 2, range: 520, color: '#ff9ac8' },

  // Cursed techniques
  infinity:     { name: 'Infinity',        cry: 'INFINITY',          loud: true, kind: 'buff', cd: 17,  dur: 1.5, dodge: 1, color: '#9fc4ff' },
  hollowpurple: { name: 'Hollow Purple',   cry: 'HOLLOW PURPLE',     loud: true, kind: 'bolt', cd: 13,  power: 2.2, range: 600, speed: 520, color: '#a24fd6' },
  dismantle:    { name: 'Dismantle',       cry: 'DISMANTLE',         loud: true, kind: 'bolt', cd: 7,   power: 0.55, range: 500, speed: 900, color: '#ff6b5e' },
  malevolent:   { name: 'Malevolent Shrine', cry: 'DOMAIN EXPANSION', loud: true, kind: 'nova', cd: 22, power: 1, range: 420, poison: 0.2, poisonFor: 4, color: '#c9302c' },
  divinedogs:   { name: 'Divine Dogs',     cry: 'DIVINE DOGS',       loud: true, kind: 'summon', cd: 18, count: 2, minion: 'hound', color: '#9a93c0' },
  nue:          { name: 'Nue',             cry: 'NUE',               loud: true, kind: 'bolt', cd: 11,  power: 0.4, stun: 0.9, range: 480, speed: 620, color: '#ffe16a' },
  hairpin:      { name: 'Hairpin',         cry: 'HAIRPIN',           boom: 'BOOM', loud: true, kind: 'bomb', cd: 8, power: 1, fuse: 1.2, range: 460, color: '#c9a35a' },
  resonance:    { name: 'Resonance',       cry: 'RESONANCE',         loud: true, kind: 'bolt', cd: 12,  power: 0.3, poison: 0.25, poisonFor: 6, range: 500, speed: 700, color: '#ff8a7a' },
  seventhree:   { name: 'Seven to Three',  cry: 'SEVEN TO THREE',    loud: true, kind: 'cone', cd: 9,   power: 1.5, range: 130, color: '#e6c84c' },
  overtime:     { name: 'Overtime',        cry: 'OVERTIME',          loud: true, kind: 'buff', cd: 16,  dur: 4, atk: 0.2, color: '#ffe16a' },
  dontmove:     { name: 'Don\'t Move',     cry: 'DON\'T MOVE',       loud: true, kind: 'bolt', cd: 12,  power: 0.2, stun: 1.4, range: 420, speed: 800, recoil: 0.02, color: '#e4e6ee' },
  blastaway:    { name: 'Blast Away',      cry: 'BLAST AWAY',        loud: true, kind: 'nova', cd: 10,  power: 1.15, range: 180, recoil: 0.02, color: '#e4e6ee' },
  insects:      { name: 'Ember Insects',   cry: 'EMBER INSECTS',     loud: true, kind: 'bolt', cd: 9,   power: 0.24, volley: 4, range: 480, speed: 560, color: '#ff8a3c' },
  meteor:       { name: 'Maximum: Meteor', cry: 'MAXIMUM: METEOR',   boom: 'METEOR', loud: true, kind: 'bomb', cd: 17, power: 2, fuse: 2.5, range: 560, color: '#ff7a2a' },
  clap:         { name: 'Boogie Woogie',   cry: 'BOOGIE WOOGIE',     loud: true, kind: 'pull', cd: 8,   power: 0.85, confuse: 0.8, range: 520, color: '#c98cff' },

  // Speedster
  machpunch:  { name: 'Mach Punch',      kind: 'dash', cd: 7, power: 1.2, range: 800, color: '#ffe14a' },

  // Quirks
  smash:      { name: 'Detroit Smash',   cry: 'DETROIT SMASH',     loud: true, kind: 'dash', cd: 9,    power: 4.8, range: 700, recoil: 0.04, ofa: true, color: '#8ef06a' },
  steal:      { name: 'Steal',           cry: 'ALL FOR ONE',       loud: true, kind: 'steal', cd: 18,  range: 460, color: '#b08ad6' },
  decaytouch: { name: 'Decay',           cry: 'DECAY',             loud: true, kind: 'bolt', cd: 10,   power: 0.3, poison: 0.9, poisonFor: 6, range: 420, speed: 520, color: '#c9bea6' },
  flashfreeze:{ name: 'Flashfreeze Heatwave', cry: 'FLASHFREEZE HEATWAVE', loud: true, kind: 'cone', cd: 8, power: 1.5, range: 170, stun: 0.9, color: '#8fd0ff' },
  prominence: { name: 'Prominence Burn', cry: 'PROMINENCE BURN',   loud: true, kind: 'cone', cd: 9,    power: 2, range: 190, poison: 0.3, poisonFor: 4, color: '#ff8a3c' },
  howitzer:   { name: 'Howitzer Impact', cry: 'HOWITZER IMPACT',   loud: true, kind: 'nova', cd: 7.5,  power: 1.7, range: 170, color: '#ffc04a' },
  erased:     { name: 'Erasure',         cry: 'ERASED',            loud: true, kind: 'bolt', cd: 9,    power: 0.3, silence: 5.5, range: 480, speed: 760, color: '#e4e6ee' },
  shadow:     { name: 'Dark Shadow',     cry: 'DARK SHADOW',       loud: true, kind: 'summon', cd: 14, count: 1, minion: 'shadow', color: '#9a93c0' },
  floataway:  { name: 'Zero Gravity',    cry: 'ZERO GRAVITY',      loud: true, kind: 'bolt', cd: 9,    power: 0.3, stun: 2.2, range: 460, speed: 520, color: '#ffc0d8' },
  recipro:    { name: 'Recipro Burst',   cry: 'RECIPRO BURST',     loud: true, kind: 'buff', cd: 10,   dur: 4, speed: 1.2, atk: 0.7, color: '#b0c4e6' },
  unbreakable:{ name: 'Unbreakable',     cry: 'UNBREAKABLE',       loud: true, kind: 'buff', cd: 12,   dur: 3.5, guard: 0.5, color: '#e08a64' },
  shock:      { name: 'Shock',           cry: 'INDISCRIMINATE SHOCK', loud: true, kind: 'nova', cd: 9, power: 1.1, range: 150, stun: 1.4, selfConfuse: 0.7, color: '#ffe14a' },

  // What earlier holders left inside One For All. `ofa` moves get stronger with its level.
  blackwhip:  { name: 'Blackwhip',       cry: 'BLACKWHIP',         loud: true, kind: 'pull', cd: 10,   power: 0.8, stun: 0.8, range: 560, color: '#7a6aa8' },
  dangersense:{ name: 'Danger Sense',    cry: 'DANGER SENSE',      loud: true, kind: 'buff', cd: 12,   dur: 2.5, dodge: 0.6, color: '#9fe0ff' },
  usasmash:   { name: 'United States of Smash', cry: 'UNITED STATES OF SMASH', loud: true, kind: 'dash', cd: 20, power: 6, range: 700, recoil: 0.08, ofa: true, color: '#8ef06a' },
};

// ---------- born with ----------

// Rare gifts it hatched with, or got from a parent. Nobody can buy or train one. The creature has
// no face, so none of these has a picture.
export const TRAITS = {
  sixeyes: {
    name: 'Six Eyes', color: '#7fd0ff',
    blurb: 'Sees cursed energy down to the last drop. With Limitless, Infinity comes up on its own every 4 seconds.',
  },
  sharingan: {
    name: 'Sharingan', color: '#ff3b30',
    blurb: 'Copies the first move an opponent uses in a fight, and can use it for the rest of that fight.',
  },
  cursedbody: {
    name: 'Cursed Body', color: '#8a4fb8',
    blurb: 'Can hold two cursed techniques: its own family\'s, and the one from the other side of its family.',
  },
  titanshifter: {
    name: 'Titan Shifter', color: '#c9733e',
    blurb: 'Once a fight, the moment it drops below half its health, it shifts into a Titan: twice as big, and it hits twice as hard.',
  },
  saiyan: {
    name: 'Saiyan Blood', color: '#ffd23a',
    blurb: 'Once a fight has gone on for 15 seconds, it goes Super Saiyan: 40% more damage, and 30% faster.',
  },
  haki: {
    name: 'Conqueror\'s Haki', color: '#a33be0',
    blurb: 'As every fight starts, anything with less max HP than it is stunned for 6 seconds, and everything else flinches for a moment.',
  },
  sunbreathing: {
    name: 'Sun Breathing', color: '#ff7a2f',
    blurb: 'Breathes through the pain: it heals 1% of its max HP every second of a fight.',
  },
  ninetails: {
    name: 'Nine-Tails Chakra', color: '#ff8c1a',
    blurb: 'The first time it would be knocked out in a fight, the fox inside wakes up: it stays up with 30% of its health, and hits 30% harder from then on.',
  },
  onepunch: {
    name: 'One Punch', color: '#f2d66b',
    blurb: 'Every 10th swing is a Serious Punch, for five times the damage.',
  },

  // Earned, not born: a creature gets these by what it does (EARN_RULES below), and keeps them for
  // good. They never pass on to a baby.
  ultrainstinct: {
    name: 'Ultra Instinct', color: '#bcd4ff', earned: true,
    blurb: 'Its body moves before it thinks: 15% more likely to dodge anything that can be dodged.',
  },
  eightgates: {
    name: 'Eight Inner Gates', color: '#3ec46d', earned: true,
    blurb: 'Below a quarter of its health it forces the gates open: 50% more damage and 30% faster for the rest of the fight.',
  },
  domain: {
    name: 'Domain Expansion', color: '#6b35a8', earned: true,
    blurb: 'Eight seconds into a fight it opens its domain: for 6 seconds nothing can dodge its hits, and they land 30% harder.',
  },
  observation: {
    name: 'Observation Haki', color: '#7a5cff', earned: true,
    blurb: 'Sees what is coming: 10% more likely to dodge, and 10% more critical hits.',
  },
  gourmet: {
    name: 'Gourmet Cells', color: '#ff6f91', earned: true,
    blurb: 'Every swing that lands heals it for 3% of its max HP.',
  },
  willofd: {
    name: 'Will of D.', color: '#ffcf33', earned: true,
    blurb: 'Hits 10% harder, and shrugs off the first stun or confusion in every fight.',
  },
};
export const TRAIT_IDS = Object.keys(TRAITS);
export const BORN_TRAIT_IDS = TRAIT_IDS.filter((id) => !TRAITS[id].earned);
export const EARNED_TRAIT_IDS = TRAIT_IDS.filter((id) => TRAITS[id].earned);

// How each earned gift is earned. record: a count in its record; training: how many stats are
// trained to the limit; trophies: wins to the death, with technique: holding a cursed technique.
export const EARN_RULES = {
  ultrainstinct: { record: 'adventureWins', need: 10, how: 'Win 10 Adventure levels with it in the party.' },
  eightgates: { training: true, need: 3, how: 'Train three of its stats all the way, to the training limit.' },
  domain: { trophies: true, technique: true, need: 3, how: 'Hold a cursed technique, and win 3 fights to the death.' },
  observation: { record: 'arenaWins', need: 15, how: 'Win 15 fights in the arena.' },
  gourmet: { record: 'plantsEaten', need: 50, how: 'Eat 50 plants from the farm.' },
  willofd: { record: 'adventureBest', need: 20, how: 'Beat Adventure level 20, The Dragon\'s Throne, with it in the party.' },
};

// One hatchling in this many is born with each. Six Eyes is only ever born into the Gojo family,
// though a parent can pass it to anyone.
export const TRAIT_ODDS = { sixeyes: 5, sharingan: 12, cursedbody: 12, titanshifter: 25, saiyan: 30, haki: 25, sunbreathing: 20, ninetails: 40, onepunch: 30 };
export const SIX_EYES_FAMILY = 'limitless';
export const SIX_EYES_EVERY = 4;
// A copy is never quite as strong as the real thing.
export const SHARINGAN_COPY = 0.7;

// What the anime gifts do in a fight. See sim/arena.js.
export const TITAN = { below: 0.5, size: 2, damage: 2 };
export const SAIYAN = { after: 15, damage: 0.4, speed: 0.3 };
// Conqueror's Haki stuns anything with less max HP for this long, and anything else for a moment.
export const HAKI = { weaker: 6, stronger: 1.5 };
// Of its max HP, every second.
export const SUN_BREATHING = 0.01;
export const NINE_TAILS = { hp: 0.3, damage: 0.3 };
export const ONE_PUNCH = { every: 10, power: 5 };
// And the earned ones.
export const ULTRA_DODGE = 0.15;
export const EIGHT_GATES = { below: 0.25, damage: 0.5, speed: 0.3 };
export const DOMAIN = { at: 8, lasts: 6, damage: 0.3 };
export const OBSERVATION = { dodge: 0.1, crit: 0.1 };
export const GOURMET_HEAL = 0.03;
export const WILL_DAMAGE = 0.1;

// ---------- One For All ----------

// It stockpiles power. Passing it on ends the holder for good and adds the holder's power to the
// stockpile, and the stockpile sets its level. A weak holder adds little; a strong one adds a lot.
export const OFA_ID = 'oneforall';
export const OFA_LEVEL_AT = [0, 40, 100, 180, 280, 400, 540];
export const OFA_MAX_LEVEL = OFA_LEVEL_AT.length;
export const ofaLevelFor = (stockpile) => Math.max(1, OFA_LEVEL_AT.filter((at) => stockpile >= at).length);
// What each level gives. Its limits rise with it, so a long line really does get that strong.
export const ofaStats = (level) => ({ might: 6 + 2 * (level - 1), speed: 2 + Math.floor((level - 1) / 2) });
export const ofaLimitBonus = (level) => ({ might: 2 * (level - 1), speed: Math.floor((level - 1) / 2) });
// Its smashes hit harder at every level, and hurt it a little more.
export const ofaHit = (level) => 1 + 0.12 * (level - 1);
export const ofaHurt = (level) => 1 + 0.2 * (level - 1);
// The moves it holds, and the level each one comes with.
export const OFA_MOVES = [['smash', 1], ['blackwhip', 3], ['dangersense', 5], ['usasmash', 7]];

// A move as this fighter really uses it: Six Eyes keeps Infinity coming, and One For All's level
// scales its smashes.
export function tuneMove(id, def, { sixEyes = false, ofaLevel = 0 } = {}) {
  let d = def;
  if (sixEyes && id === 'infinity') d = { ...d, cd: SIX_EYES_EVERY, auto: true };
  if (d.ofa && ofaLevel > 1) d = { ...d, power: d.power * ofaHit(ofaLevel), ...(d.recoil ? { recoil: d.recoil * ofaHurt(ofaLevel) } : {}) };
  return d;
}
