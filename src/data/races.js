// Races. Every creature is born into one, and each brings an innate bonus and a fight move of its
// own. Most creatures are Human. The others come home with expeditions, or are bred: a Devil with
// anything that isn't a Devil makes a Half-devil.
// The names come from the shows (One Piece, Chainsaw Man). The pictures do not: races/<id>.png are
// library pictures placed on the canvas, a Giant is simply drawn bigger and a Tontatta smaller.

export const RACES = {
  human: {
    name: 'Human', stats: {}, color: '#c8c2b4',
    blurb: 'Most creatures are. No bonus, and no weakness either.',
  },
  giant: {
    name: 'Giant', stats: { might: 4, vigor: 4, speed: -2 }, size: 1.35, move: 'giantstomp', color: '#c08a4a',
    blurb: 'Enormous, slow, and very hard to knock down. It is drawn a size bigger, in the ring too.',
  },
  fishman: {
    name: 'Fish-man', stats: { might: 3, speed: 1, vigor: 1 }, move: 'karate', color: '#3fa7d6',
    blurb: 'Ten times as strong as a human in the water, and strong enough out of it. Knows Fish-Man Karate.',
  },
  mink: {
    name: 'Mink', stats: { speed: 3, wits: 1 }, move: 'electro', color: '#ffd24a',
    blurb: 'Born warriors with electricity in their fur. Electro shocks everything close by.',
  },
  lunarian: {
    name: 'Lunarian', stats: { guard: 3, vigor: 2 }, move: 'lunarflame', color: '#ff9a3c',
    blurb: 'Nearly gone from the world. Flames burn on its back, and while they do it shrugs off almost anything.',
  },
  tontatta: {
    name: 'Tontatta', stats: { speed: 3, might: 2 }, size: 0.75, move: 'tontattarush', color: '#7ed957',
    blurb: 'A tiny dwarf, fast as anything and much stronger than it looks. It is drawn a size smaller.',
  },
  longarm: {
    name: 'Long-arm', stats: { might: 2, wits: 2 }, move: 'longreach', color: '#b08ad6',
    blurb: 'Arms with an extra joint. It hits from further away than anyone expects.',
  },
  devil: {
    name: 'Devil', stats: { might: 3, wits: 3, vigor: 1 }, move: 'devilpact', color: '#c9302c',
    blurb: 'Born from what people fear, and very rare. Bred with anything else, it makes a Half-devil.',
  },
  halfdevil: {
    name: 'Half-devil', stats: { might: 2, wits: 1, vigor: 1 }, move: 'devilform', color: '#e0503c',
    blurb: 'Half human, half devil. It turns into its devil form in the middle of a fight.',
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
  devilpact: { name: 'Devil\'s Contract', cry: 'CONTRACT', loud: true, kind: 'bolt', cd: 12, power: 0.6, silence: 3, poison: 0.2, poisonFor: 4, range: 460, speed: 560, color: '#c9302c' },
  devilform: { name: 'Devil Form', cry: 'DEVIL FORM', loud: true, kind: 'buff', cd: 14, dur: 4, atk: 0.5, dodge: 0.15, color: '#e0503c' },
};

// A bred baby is half of each parent's races, rounded to quarters: anything less fades out, so
// races go down to quarters and no further. Each race gives its share of its bonuses, and only a half
// or more brings its move. This many babies of mixed race are born pure-blooded instead, with every
// race in them at full power.
export const PURE_BLOOD_CHANCE = 0.01;
export const MIN_SHARE = 0.25;
