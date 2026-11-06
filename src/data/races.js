// Races. Every creature is born into one, and each brings an innate bonus, a fight move, a passive
// in every fight, and a specialty in the village. Most creatures are Human, the best workers of all.
// The others come home with expeditions or Adventure, or are bred.
// The names come from the shows (One Piece, Chainsaw Man). The pictures do not: races/<id>.png are
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
    name: 'Lunarian', stats: { guard: 3, vigor: 2 }, move: 'lunarflame', color: '#ff9a3c',
    blurb: 'Nearly gone from the world. Flames burn on its back, and while they do it shrugs off almost anything.',
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
  halfdevil: {
    name: 'Half-devil', stats: { might: 5, wits: 1, vigor: 1 }, move: 'devilform', color: '#e0503c',
    blurb: 'Half human, half devil. It turns into its devil form in the middle of a fight.',
    from: 'Old saves only: a Devil and a Human now make a creature that is half of each.',
  },
};
export const RACE_IDS = Object.keys(RACES);
export const DEFAULT_RACE = 'human';

// Races with a picture of their own, in races/<id>.png. The rest only change size or nothing.
export const RACE_PICTURES = ['fishman', 'mink', 'lunarian', 'devil', 'halfdevil'];
export const RACE_IDEAS = {
  fishman: 'a wave around its feet',
  mink: 'paw prints and a spark of lightning',
  lunarian: 'flames on its shoulders',
  devil: 'a trident',
  halfdevil: 'a saw',
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
  devilform: { name: 'Devil Form', cry: 'DEVIL FORM', loud: true, kind: 'buff', cd: 14, dur: 4, atk: 0.5, dodge: 0.15, color: '#e0503c' },
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
