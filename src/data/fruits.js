// Devil Fruits (One Piece): the fourth power, and the one tied to Vigor. Each is very strong, and a
// creature that eats one can never also have a Stand, speedster powers or a cursed technique, not
// even with a Legendary mutation. Quirks are separate, as always. Fruits are rare: they turn up in
// farm harvests and on expeditions, and go into the pool your creatures share until one eats it.
// Like every Devil Fruit eater, it can't swim. That changes nothing here; it is just true.

export const FRUIT_VIGOR = 20;
export const FRUIT_FROM_HARVEST = 0.001;
export const FRUIT_FROM_EXPEDITION = 0.01;

export const FRUITS = {
  gomu: {
    name: 'Gum-Gum Fruit', type: 'Paramecia', color: '#e0503c', stats: { vigor: 4, might: 3, guard: 2 }, moves: ['gumpistol', 'gearsecond'],
    blurb: 'Its body turns to rubber. Punches stretch across the ring, and Gear Second makes it faster and harder.',
  },
  mera: {
    name: 'Flame-Flame Fruit', type: 'Logia', color: '#ff7a2a', stats: { vigor: 3, might: 4 }, moves: ['firefist', 'flameemperor'],
    blurb: 'It is fire. Fire Fist from across the ring, and whatever it hits keeps burning.',
  },
  hie: {
    name: 'Ice-Ice Fruit', type: 'Logia', color: '#8fd0ff', stats: { vigor: 3, wits: 2, guard: 2 }, moves: ['iceage', 'icesaber'],
    blurb: 'Freezes everything near it solid for a moment, then cuts with a sword of ice.',
  },
  goro: {
    name: 'Rumble-Rumble Fruit', type: 'Logia', color: '#ffe14a', stats: { vigor: 3, speed: 2, wits: 2 }, moves: ['elthor', 'sango'],
    blurb: 'Lightning. Strikes from clear across the ring, and nothing outruns it.',
  },
  ope: {
    name: 'Op-Op Fruit', type: 'Paramecia', color: '#7fd0c0', stats: { vigor: 3, wits: 4 }, moves: ['shambles', 'gammaknife'],
    blurb: 'Makes a Room, and inside it swaps anything for anything. Then operates.',
  },
  yami: {
    name: 'Dark-Dark Fruit', type: 'Logia', color: '#6a5a8c', stats: { vigor: 4, might: 2, wits: 1 }, moves: ['blackhole', 'liberation'],
    blurb: 'Darkness that pulls everything in, and takes their moves away for a while.',
  },
  gura: {
    name: 'Tremor-Tremor Fruit', type: 'Paramecia', color: '#e6ebf5', stats: { vigor: 4, might: 4 }, moves: ['tremor', 'seaquake'],
    blurb: 'Cracks the air itself. The strongest Paramecia there is.',
  },
  pika: {
    name: 'Glint-Glint Fruit', type: 'Logia', color: '#fff6a0', stats: { vigor: 3, speed: 4 }, moves: ['yatanokagami', 'amaterasu'],
    blurb: 'Light. It moves at the speed of it, and rains it down on you.',
  },
};
export const FRUIT_IDS = Object.keys(FRUITS);

// Their fight moves, added to ABILITIES in data/paths.js.
export const FRUIT_MOVES = {
  gumpistol: { name: 'Gum-Gum Pistol', cry: 'GUM-GUM PISTOL', loud: true, kind: 'dash', cd: 7, power: 1.6, range: 600, color: '#e0503c' },
  gearsecond: { name: 'Gear Second', cry: 'GEAR SECOND', loud: true, kind: 'buff', cd: 16, dur: 5, atk: 0.5, speed: 0.8, color: '#ff8a8a' },
  firefist: { name: 'Fire Fist', cry: 'FIRE FIST', loud: true, kind: 'bolt', cd: 8, power: 1.8, poison: 0.25, poisonFor: 3, range: 560, speed: 600, color: '#ff7a2a' },
  flameemperor: { name: 'Flame Emperor', cry: 'FLAME EMPEROR', loud: true, kind: 'nova', cd: 20, power: 1.6, range: 260, poison: 0.2, poisonFor: 4, color: '#ff5a2a' },
  iceage: { name: 'Ice Age', cry: 'ICE AGE', loud: true, kind: 'nova', cd: 16, power: 0.6, range: 300, stun: 2.2, color: '#8fd0ff' },
  icesaber: { name: 'Ice Saber', cry: 'ICE SABER', loud: true, kind: 'dash', cd: 8, power: 1.4, range: 600, color: '#b8e4ff' },
  elthor: { name: 'El Thor', cry: 'EL THOR', loud: true, kind: 'bolt', cd: 10, power: 2.2, range: 620, speed: 1200, color: '#ffe14a' },
  sango: { name: 'Sango', cry: '200 MILLION VOLT SANGO', loud: true, kind: 'nova', cd: 14, power: 1.2, range: 220, stun: 0.8, color: '#fff08a' },
  shambles: { name: 'Shambles', cry: 'ROOM. SHAMBLES', loud: true, kind: 'pull', cd: 10, power: 1, confuse: 1.5, range: 600, color: '#7fd0c0' },
  gammaknife: { name: 'Gamma Knife', cry: 'GAMMA KNIFE', loud: true, kind: 'dash', cd: 14, power: 2.6, range: 600, color: '#9ff0e0' },
  blackhole: { name: 'Black Hole', cry: 'BLACK HOLE', loud: true, kind: 'pull', cd: 12, power: 0.8, silence: 4, range: 560, color: '#6a5a8c' },
  liberation: { name: 'Liberation', cry: 'LIBERATION', loud: true, kind: 'nova', cd: 16, power: 1.3, range: 240, color: '#8a7ab0' },
  tremor: { name: 'Tremor', cry: 'GURA GURA', loud: true, kind: 'nova', cd: 10, power: 1.8, range: 260, color: '#e6ebf5' },
  seaquake: { name: 'Seaquake', cry: 'SEAQUAKE', loud: true, kind: 'cone', cd: 16, power: 2.4, range: 200, stun: 0.6, color: '#d0dcf0' },
  yatanokagami: { name: 'Yata no Kagami', cry: 'YATA NO KAGAMI', loud: true, kind: 'dash', cd: 6, power: 1.8, range: 800, selfBuff: { left: 0.6, dodge: 1 }, color: '#fff6a0' },
  amaterasu: { name: 'Amaterasu', cry: 'AMATERASU', loud: true, kind: 'bolt', cd: 12, power: 0.5, volley: 6, range: 600, speed: 900, color: '#fffad0' },
};
