// Races. Every creature is born into one, and each brings an innate bonus, a fight move, a passive
// in every fight, and a specialty in the village. Most creatures are Human, the best workers of all.
// The others come home with expeditions or Adventure, or are bred.
// The names come from the shows (One Piece, Chainsaw Man, JoJo's Bizarre Adventure). The pictures do not: races/<id>.png are
// library pictures placed on the canvas, a Giant is simply drawn bigger and a Tontatta smaller.
//
//   passive   in every fight: taken (less damage taken), hp (more max HP), dodge, crit, speed,
//             reach (hits from further away, in pixels), poisonproof, feast (heals this share of its
//             max HP whenever something on the other side goes down)
//   village   at home: work (everything), colors, gems (more of each), gemsFlat (gems an hour,
//             whatever its job), food (an hour, whatever its job), farm (food and plants),
//             expedition (an expedition with one in it is back this much sooner), expeditionGems,
//             finds (an expedition with one in it is this much likelier to find someone)
// A race only brings its move and its passive at half or more, and its specialty the same way.

export const RACES = {
  human: {
    name: 'Human', stats: {}, color: '#c8c2b4',
    blurb: 'Most creatures are. No bonus in a fight and no weakness either, and the hardest workers of all.',
    village: { work: 0.25, text: 'Works 25% harder in the village, at any job.' },
    from: 'Most eggs.',
  },
  giant: {
    name: 'Giant', stats: { might: 5, vigor: 4, speed: -5 }, size: 1.35, move: 'giantstomp', color: '#c08a4a',
    blurb: 'Enormous, slow, and very hard to knock down. It is drawn a size bigger, in the ring too.',
    passive: { taken: 0.15, text: 'Takes 15% less damage.' },
    village: { colors: 0.5, text: 'Digs 50% more colors in the village.' },
    from: 'Expeditions to the deep forest and the open sea.',
  },
  fishman: {
    name: 'Fish-man', stats: { might: 3, speed: 1, vigor: 1 }, move: 'karate', color: '#3fa7d6',
    blurb: 'Ten times as strong as a human in the water, and strong enough out of it. Knows Fish-Man Karate.',
    passive: { hp: 0.12, text: '12% more max HP.' },
    village: { food: 2, text: 'Catches about 2 food an hour in the village, whatever its job.' },
    from: 'Expeditions along the coast and across the open sea.',
  },
  mink: {
    name: 'Mink', stats: { speed: 6, wits: 1 }, move: 'electro', color: '#ffd24a',
    blurb: 'Born warriors with electricity in their fur. Electro shocks everything close by.',
    passive: { dodge: 0.08, text: '8% more likely to dodge.' },
    village: { expedition: 0.2, text: 'An expedition with a Mink in it is back 20% sooner.' },
    from: 'Expeditions to the deep forest and the open sea.',
  },
  lunarian: {
    name: 'Lunarian', stats: { guard: 3, vigor: 2 }, move: 'lunarflame', color: '#ff9a3c', skin: '#5c3d2e',
    blurb: 'Nearly gone from the world. Dark skin, black wings, and flames burning on its back, and while they burn it shrugs off almost anything.',
    passive: { poisonproof: true, text: 'Poison can\'t touch it.' },
    village: { gems: 0.5, text: 'Finds 50% more gems in the village.' },
    from: 'Expeditions across the open sea and up to the sky island, and Adventure level 23.',
  },
  tontatta: {
    name: 'Tontatta', stats: { speed: 3, might: 2 }, size: 0.75, move: 'tontattarush', color: '#7ed957',
    blurb: 'A tiny dwarf, fast as anything and much stronger than it looks. It is drawn a size smaller.',
    passive: { speed: 0.15, dodge: 0.05, text: 'Moves 15% faster, and 5% more likely to dodge.' },
    village: { farm: 0.5, text: 'Farms 50% more food and plants in the village.' },
    from: 'Expeditions to the deep forest.',
  },
  longarm: {
    name: 'Long-arm', stats: { might: 2, wits: 2 }, move: 'longreach', color: '#b08ad6',
    blurb: 'Arms with an extra joint. It hits from further away than anyone expects.',
    passive: { reach: 24, text: 'Swings from a little further away than anyone else.' },
    village: { expeditionGems: 0.25, text: 'An expedition with a Long-arm in it brings back 25% more gems.' },
    from: 'Expeditions to the deep forest.',
  },
  skypiean: {
    name: 'Skypiean', stats: { wits: 3, speed: 2 }, move: 'impactdial', color: '#9fd8ff',
    blurb: 'From the islands above the clouds, with little wings on its back. Hears what an enemy means to do before it does it.',
    passive: { crit: 0.1, text: 'Mantra: 10% more critical hits.' },
    village: { finds: 1, text: 'An expedition with a Skypiean in it is twice as likely to find someone.' },
    from: 'Expeditions up to the sky island.',
  },
  devil: {
    name: 'Devil', stats: { might: 10, wits: 3, vigor: 1 }, move: 'devilpact', color: '#c9302c',
    blurb: 'Born from what people fear, and very rare. Bred with anything else, it makes a Half-devil.',
    passive: { feast: 0.12, text: 'Heals 12% of its max HP whenever something on the other side goes down.' },
    village: { gemsFlat: 0.25, text: 'Makes deals: about a gem every 4 hours, whatever its job.' },
    from: 'Expeditions across the open sea, very rarely, and Adventure level 27.',
  },
  // From the Bizarre expeditions, which can kill whoever goes. Stronger than any race before them.
  vampire: {
    name: 'Vampire', stats: { might: 5, speed: 5, vigor: 6 }, move: 'stingyeyes', color: '#9b1b3a', skin: '#e6e1ee',
    blurb: 'Made by a stone mask, long ago. Pale, very fast, and it heals from almost anything.',
    passive: { hp: 0.15, feast: 0.15, poisonproof: true, text: '15% more max HP, poison can\'t touch it, and it heals 15% of its max HP whenever something on the other side goes down.' },
    village: { gemsFlat: 0.5, text: 'Works all night: about a gem every 2 hours, whatever its job.' },
    from: 'Bizarre expeditions into the stone ruins.',
  },
  pillarman: {
    name: 'Pillar Man', stats: { might: 12, guard: 8, vigor: 8, speed: 3, wits: 2 }, size: 1.3, move: 'sandstorm', moves: ['sandstorm', 'boilingblood', 'shiningblades'], color: '#d9a441', skin: '#b4835a',
    blurb: 'One of the ancient ones who made the stone masks, asleep inside a pillar for thousands of years. It eats by touching, fights in all three Modes of its kind, and one of them once became the Ultimate Life Form. It is drawn bigger.',
    passive: {
      taken: 0.3, hp: 0.3, absorb: 0.15, evolve: 0.4,
      text: 'Takes 30% less damage and has 30% more max HP. Flesh Absorption: heals 15% of all the damage it deals. Ultimate Life Form: the first time it drops below 30% health in a fight, it evolves, back to full health and hitting 40% harder from then on.',
    },
    village: { colors: 1, gemsFlat: 0.5, text: 'Digs twice as many colors in the village, and finds about a gem every 2 hours whatever its job.' },
    from: 'Bizarre expeditions into the stone ruins, rarely.',
  },
  dragon: {
    name: 'Dragon', stats: { might: 7, guard: 4, speed: 3, vigor: 4 }, move: 'dragonbreath', color: '#e0472b', skin: '#4f8052',
    blurb: 'Scaled, winged and very old. It breathes fire, and it hoards anything that shines.',
    passive: { taken: 0.1, crit: 0.1, reach: 16, text: 'Takes 10% less damage, 10% more critical hits, and swings from a little further away.' },
    village: { gems: 1, text: 'Hoards: finds twice as many gems in the village.' },
    from: 'Bizarre expeditions through the rift in the sky, rarely.',
  },
  cursedalien: {
    name: 'Cursed Alien', stats: { wits: 8, speed: 5, might: 3 }, move: 'abduction', color: '#5fd38a', skin: '#86c76e',
    blurb: 'Fell out of the sky carrying a curse nobody here understands. It knows what you will do, and takes you somewhere else before you do it.',
    passive: { dodge: 0.12, crit: 0.50, text: '12% more likely to dodge, and 50% more critical hits.' },
    village: { finds: 2, text: 'An expedition with a Cursed Alien in it is three times as likely to find someone.' },
    from: 'Bizarre expeditions through the rift in the sky.',
  },
  // ---- From the Negative Dimension (data/negative.js), which only opens after a universe reset ----
  // Nothing in the light world is born one. A creature of these races crossed over from the Negative,
  // or hatched from an egg once one was sacrificed on the Bloodline Altar, or was bred with the Deluxe
  // Breeder. Each is stronger in the light world than any race born here. `neg` is what it brings in
  // the Negative itself: its starting ability scores, at level 1.
  voidling: {
    name: 'Voidling', negative: true, stats: { speed: 12, wits: 8, might: 7, vigor: 5, guard: 3 }, size: 0.82, move: 'voidstep', color: '#7b5cff', skin: '#2b2440',
    blurb: 'A little piece of empty space that learned to want things. It is never quite where it seems to be. Drawn a size smaller.',
    passive: { dodge: 0.18, speed: 0.3, horizon: true, text: '18% more likely to dodge, moves 30% faster, and even moves that never miss can miss it.' },
    village: { expedition: 0.35, finds: 1, text: 'An expedition with a Voidling in it is back 35% sooner, and twice as likely to find someone.' },
    neg: { str: 30, dex: 85, con: 35, int: 45, wis: 40, cha: 55 },
  },
  antiseraph: {
    name: 'Antiseraph', negative: true, stats: { wits: 11, vigor: 10, might: 8, guard: 6 }, move: 'blackhalo', color: '#3a2a55', skin: '#d9d2e9',
    blurb: 'What an angel looks like from the other side. A black halo, wings of ash, and it heals by hurting.',
    passive: { absorb: 0.25, crit: 0.1, poisonproof: true, text: 'Heals 25% of all the damage it deals, 10% more critical hits, and poison can\'t touch it.' },
    village: { gems: 1.5, text: 'Finds two and a half times as many gems in the village.' },
    neg: { str: 40, dex: 45, con: 50, int: 60, wis: 85, cha: 80 },
  },
  abyssaltitan: {
    name: 'Abyssal Titan', negative: true, stats: { might: 16, guard: 12, vigor: 14, speed: -4 }, size: 1.5, move: 'abysscrush', color: '#31324a', skin: '#4a4d6b',
    blurb: 'A giant from the bottom of the Negative, where the dark has weight. Drawn much bigger.',
    passive: { taken: 0.25, hp: 0.4, enrage: 0.6, text: 'Takes 25% less damage, has 40% more max HP, and below half its health it hits 60% harder and swings faster.' },
    village: { colors: 1.5, text: 'Digs two and a half times as many colors in the village.' },
    neg: { str: 95, dex: 20, con: 95, int: 20, wis: 30, cha: 30 },
  },
  hexborn: {
    name: 'Hexborn', negative: true, stats: { wits: 14, might: 8, speed: 6, vigor: 5 }, move: 'grandhex', color: '#6b2a7a', skin: '#8f6a9c',
    blurb: 'Born under a curse, and it passed the curse on to everything it ever touched.',
    passive: { decay: 0.3, crit: 0.08, text: 'Every hit it lands curses: they keep hurting for 3 seconds. 8% more critical hits.' },
    village: { gemsFlat: 1, text: 'Curses luck into gems: about a gem an hour, whatever its job.' },
    neg: { str: 30, dex: 50, con: 40, int: 90, wis: 60, cha: 55 },
  },
  mirrorkin: {
    name: 'Mirrorkin', negative: true, stats: { guard: 12, wits: 9, speed: 6, vigor: 6, might: 4 }, move: 'shatter', color: '#bcd8e8', skin: '#e4f1f7',
    blurb: 'Made of the glass between the two worlds. Hit it, and you hit yourself.',
    passive: { reflect: 0.35, dodge: 0.06, text: 'Throws 35% of every hit it takes back at whoever landed it, and 6% more likely to dodge.' },
    village: { work: 0.5, text: 'Works 50% harder in the village, at any job.' },
    neg: { str: 45, dex: 60, con: 55, int: 55, wis: 55, cha: 50 },
  },
  entropywraith: {
    name: 'Entropy Wraith', negative: true, stats: { wits: 9, vigor: 9, might: 9, speed: 5 }, move: 'heatdeath', color: '#5c6b4a', skin: '#7d8a6a',
    blurb: 'Everything near it is a little older than it was a moment ago.',
    passive: { aura: 0.3, auraRange: 170, poisonproof: true, text: 'Everything on the other side within 170 of it rots: 30% of its hit, every second. Poison can\'t touch it.' },
    village: { farm: 1, text: 'Rot feeds the soil: farms twice as much food and plants in the village.' },
    neg: { str: 50, dex: 45, con: 60, int: 75, wis: 50, cha: 40 },
  },
  chimera: {
    name: 'Chimera', negative: true, stats: { might: 12, vigor: 9, speed: 8, guard: 5 }, move: 'devour', color: '#a8643a', skin: '#c48a5a',
    blurb: 'It eats what it beats, and becomes a little of it. No two are alike for long.',
    passive: { frenzy: 0.04, feast: 0.25, text: 'Every hit it lands makes it 4% stronger for the rest of the fight, up to 60%, and it heals 25% of its max HP whenever something on the other side goes down.' },
    village: { food: 6, text: 'Hunts: about 6 food an hour in the village, whatever its job.' },
    neg: { str: 80, dex: 55, con: 65, int: 30, wis: 35, cha: 45 },
  },
  homunculus: {
    name: 'Homunculus', negative: true, stats: { vigor: 13, might: 10, guard: 8, wits: 5 }, move: 'ouroboros', color: '#8a1f3a', skin: '#d8b8b0',
    blurb: 'Made by alchemy around a red stone full of souls. Every soul in the stone is one more life.',
    passive: { lives: 2, regen: 0.015, text: 'Two extra lives: the first two times it is knocked out, it gets back up with half its health. Heals 1.5% of its max HP every second.' },
    village: { gems: 1, text: 'Its stone glitters: finds twice as many gems in the village.' },
    neg: { str: 65, dex: 45, con: 90, int: 50, wis: 40, cha: 45 },
  },
  dreadwyrm: {
    name: 'Dreadwyrm', negative: true, stats: { might: 13, guard: 8, speed: 7, wits: 7, vigor: 8 }, size: 1.25, move: 'nullbreath', color: '#1f1a33', skin: '#3d3466',
    blurb: 'The dragon the other dragons are afraid of. Its scales drink light. Drawn bigger.',
    passive: { taken: 0.15, crit: 0.15, critMul: 2, reach: 30, text: 'Takes 15% less damage, 15% more critical hits, its critical hits land four times as hard instead of twice, and it swings from further away.' },
    village: { gems: 2, text: 'Hoards the dark: finds three times as many gems in the village.' },
    neg: { str: 85, dex: 55, con: 70, int: 55, wis: 45, cha: 60 },
  },
  halfdevil: {
    name: 'Half-devil', stats: { might: 5, wits: 1, vigor: 1 }, move: 'devilform', color: '#e0503c',
    blurb: 'Half human, half devil. It turns into its devil form in the middle of a fight.',
    from: 'Old saves only: a Devil and a Human now make a creature that is half of each.',
  },
};
const NEGATIVE_FROM = 'Only from the Negative Dimension: one that crossed over, an egg once one is sacrificed on the Bloodline Altar, or a baby from the Deluxe Breeder.';
Object.values(RACES).filter((r) => r.negative).forEach((r) => { r.from = NEGATIVE_FROM; });
export const RACE_IDS = Object.keys(RACES);
// The races of the Negative Dimension, and the ones born in the light world.
export const NEGATIVE_RACE_IDS = RACE_IDS.filter((id) => RACES[id].negative);
export const isNegativeRace = (id) => !!RACES[id]?.negative;
export const DEFAULT_RACE = 'human';
// Every move a race brings: most bring one, a Pillar Man brings all three of its Modes.
export const raceMovesOf = (id) => RACES[id]?.moves ?? (RACES[id]?.move ? [RACES[id].move] : []);

// Races with a picture of their own, in races/<id>.png. The rest only change size or nothing.
// RACE_BACKS also have races/<id>-back.png, drawn behind the body, for wings and the like.
// A race with `skin` shades the body toward that color by SKIN_MIX, once it is at least half that
// race. A dye from the workshop still covers everything.
export const RACE_PICTURES = ['fishman', 'mink', 'lunarian', 'devil', 'halfdevil', 'vampire', 'cursedalien', ...NEGATIVE_RACE_IDS];
export const RACE_BACKS = ['lunarian', 'pillarman', 'dragon', 'antiseraph', 'chimera', 'dreadwyrm'];
export const SKIN_MIX = 0.65;
export const RACE_IDEAS = {
  fishman: 'a wave around its feet',
  mink: 'paw prints and a spark of lightning',
  lunarian: 'small flames on its shoulders',
  devil: 'a trident',
  halfdevil: 'a saw',
  vampire: 'drops of blood by its head',
  cursedalien: 'a flying saucer over its head',
  voidling: 'a hole in the ground under its feet, and two dark moons around its head',
  antiseraph: 'a black halo',
  abyssaltitan: 'fists of stone, and chains at its wrists',
  hexborn: 'a crystal ball, and a cobweb on its shoulder',
  mirrorkin: 'a hand mirror, and a glint',
  entropywraith: 'an hourglass on its chest, and dead leaves at its feet',
  chimera: 'a bone with meat on it',
  homunculus: 'a red stone in its chest, and an alembic',
  dreadwyrm: 'purple flames on its shoulders',
};
export const RACE_BACK_IDEAS = {
  lunarian: 'two big black wings, and a fire burning between them',
  pillarman: 'the stone pillar it slept in, behind it',
  dragon: 'two big red wings',
  antiseraph: 'two wings of ash',
  chimera: 'a snake for a tail',
  dreadwyrm: 'two huge dark purple wings',
};

// Their fight moves, added to ABILITIES in data/paths.js.
export const RACE_MOVES = {
  giantstomp: { name: 'Giant Stomp', cry: 'GIANT STOMP', loud: true, kind: 'nova', cd: 10, power: 1.3, range: 170, stun: 0.6, color: '#c08a4a' },
  karate: { name: 'Fish-Man Karate', cry: 'FISH-MAN KARATE', loud: true, kind: 'bolt', cd: 8, power: 1, range: 480, speed: 700, color: '#3fa7d6' },
  electro: { name: 'Electro', cry: 'ELECTRO', loud: true, kind: 'nova', cd: 9, power: 0.9, range: 150, stun: 1, color: '#ffd24a' },
  lunarflame: { name: 'Lunarian Flame', cry: 'LUNARIAN FLAME', loud: true, kind: 'buff', cd: 14, dur: 4, guard: 0.5, atk: 0.2, color: '#ff9a3c' },
  tontattarush: { name: 'Tontatta Rush', cry: 'TONTATTA RUSH', loud: true, kind: 'dash', cd: 6, power: 1.2, range: 700, color: '#7ed957' },
  longreach: { name: 'Long Reach', cry: 'LONG REACH', loud: true, kind: 'bolt', cd: 7, power: 1.1, range: 320, speed: 900, color: '#b08ad6' },
  impactdial: { name: 'Impact Dial', cry: 'IMPACT', loud: true, kind: 'bolt', cd: 9, power: 1.4, stun: 0.5, range: 260, speed: 800, color: '#9fd8ff' },
  devilpact: { name: 'Devil\'s Contract', cry: 'CONTRACT', loud: true, kind: 'bolt', cd: 12, power: 0.6, silence: 3, poison: 0.2, poisonFor: 4, range: 460, speed: 560, color: '#c9302c' },
  stingyeyes: { name: 'Space Ripper Stingy Eyes', cry: 'SPACE RIPPER STINGY EYES', loud: true, kind: 'bolt', cd: 8, power: 1.6, range: 560, speed: 1200, color: '#e8f4ff' },
  sandstorm: { name: 'Divine Sandstorm', cry: 'DIVINE SANDSTORM', loud: true, kind: 'cone', cd: 10, power: 1.7, range: 220, stun: 0.8, color: '#d9b26a' },
  dragonbreath: { name: 'Dragon Breath', cry: 'DRAGON BREATH', loud: true, kind: 'cone', cd: 9, power: 1.8, range: 230, poison: 0.25, poisonFor: 4, color: '#ff6a2a' },
  abduction: { name: 'Abduction Beam', cry: 'ABDUCTION', loud: true, kind: 'bolt', cd: 10, power: 0.8, stun: 1.8, silence: 2, range: 520, speed: 650, color: '#7dff9a' },
  devilform: { name: 'Devil Form', cry: 'DEVIL FORM', loud: true, kind: 'buff', cd: 14, dur: 4, atk: 0.5, dodge: 0.15, color: '#e0503c' },
  // A Pillar Man's other two Modes, beside Wind Mode's sandstorm.
  boilingblood: { name: 'Heat Mode: Boiling Blood', cry: 'HEAT MODE: BOILING BLOOD', loud: true, kind: 'bolt', cd: 9, volley: 4, power: 0.5, poison: 0.35, poisonFor: 4, range: 460, speed: 700, color: '#ff5a3a' },
  shiningblades: { name: 'Light Mode: Shining Blades', cry: 'LIGHT MODE: SHINING BLADES', loud: true, kind: 'dash', cd: 11, power: 2.8, range: 700, color: '#fff3b0' },
  // The races of the Negative.
  voidstep: { name: 'Void Step', cry: 'VOID STEP', loud: true, kind: 'dash', cd: 6, power: 1.8, range: 700, selfBuff: { left: 0.8, dodge: 1 }, color: '#9a7cff' },
  blackhalo: { name: 'Black Halo', cry: 'BLACK HALO', loud: true, kind: 'nova', cd: 10, power: 1.6, range: 220, silence: 2, color: '#5a3a8a' },
  abysscrush: { name: 'Abyss Crush', cry: 'ABYSS CRUSH', loud: true, kind: 'nova', cd: 11, power: 2.4, range: 200, stun: 1.2, push: 70, color: '#4a4d6b' },
  grandhex: { name: 'Grand Hex', cry: 'GRAND HEX', loud: true, kind: 'bolt', cd: 10, power: 0.8, silence: 4, poison: 0.4, poisonFor: 6, range: 520, speed: 600, color: '#b05ac8' },
  shatter: { name: 'Shatter', cry: 'SHATTER', loud: true, kind: 'cone', cd: 9, power: 1.9, range: 210, confuse: 1.2, color: '#d8f0ff' },
  heatdeath: { name: 'Heat Death', cry: 'HEAT DEATH', loud: true, kind: 'nova', cd: 12, power: 1.2, range: 260, poison: 0.5, poisonFor: 6, color: '#8a9a6a' },
  devour: { name: 'Devour', cry: 'DEVOUR', loud: true, kind: 'pull', cd: 9, power: 2.2, range: 520, color: '#c48a5a' },
  ouroboros: { name: 'Ouroboros', cry: 'OUROBOROS', loud: true, kind: 'heal', cd: 14, power: 0.35, atk: 0.4, dur: 4, color: '#c9304a' },
  nullbreath: { name: 'Null Breath', cry: 'NULL BREATH', loud: true, kind: 'cone', cd: 9, power: 2.6, range: 260, silence: 2, poison: 0.3, poisonFor: 4, color: '#5a4a9a' },
};

// Seasoned wild rivals are sometimes another race: the chance of each, by how seasoned they are.
export const WILD_RACES = {
  2: { giant: 0.04, fishman: 0.04, mink: 0.04, tontatta: 0.03, longarm: 0.03 },
  3: { giant: 0.04, fishman: 0.04, mink: 0.04, tontatta: 0.03, longarm: 0.03, lunarian: 0.02, skypiean: 0.015, devil: 0.005 },
};

// A bred baby is half of each parent's races, rounded to quarters: anything less fades out, so
// races go down to quarters and no further. Each race gives its share of its bonuses, and only a half
// or more brings its move, its passive and its specialty. This many babies of mixed race are born
// pure-blooded instead, with every race in them at full power.
export const PURE_BLOOD_CHANCE = 0.01;
export const MIN_SHARE = 0.25;
// The share of a race that brings its move, passive and specialty.
export const RACE_FULL_SHARE = 0.5;
