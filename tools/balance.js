// Prints how fair arena fights are, what each power, gift and weapon is worth, and how hard each
// Adventure level is for a few kinds of party. Run: node tools/balance.js

import { wildCreature, newCreature, computeStats, pathTitle, parseCreature, serializeCreature, powerOf, STAGES } from '../src/core/creature.js';
import { startChallenge, wonChallenge } from '../src/sim/challenges.js';
import { finishBout } from '../src/sim/arena.js';
import { DEADLY_IDS, ULTIMATE_IDS, DEADLY_MONSTERS, TRAINING_IDS, TRAINING_MONSTERS } from '../src/data/monsters.js';
import { runBout } from '../src/sim/arena.js';
import { PATHS, TIER_XP } from '../src/data/paths.js';
import { STANDS, STAND_IDS, QUIRKS, QUIRK_IDS, TECHNIQUES, TECHNIQUE_IDS, OFA_LEVEL_AT, TRAITS } from '../src/data/powers.js';
import { WEAPONS, WEAPON_IDS } from '../src/data/forge.js';
import { LEVEL_COUNT, startLevel, levelWon } from '../src/core/adventure.js';

const NO_POWERS = () => ({ stand: null, speedster: false, technique: null, technique2: null, quirks: [] });

// Adventure: how often a party of three wins each level.
function adventure(seeds = 12) {
  const party = (level, base, extra) => [0, 1, 2].map((i) => {
    const c = wildCreature(base + i * 7919, level);
    extra?.(c);
    return c;
  });
  const kinds = {
    'wild level 1': (s) => party(1, s),
    'wild level 2': (s) => party(2, s),
    'final forms': (s) => party(3, s),
    'elders, armed': (s) => party(3, s, (c) => { c.growth = 200; c.weapon = 'dragonslayer'; c.training = { might: 10, guard: 10, speed: 10, wits: 10, vigor: 10 }; }),
  };
  console.log('\nAdventure, share of levels won:');
  console.log(`  ${'level'.padEnd(6)}${Object.keys(kinds).map((k) => k.padStart(15)).join('')}`);
  for (let n = 1; n <= LEVEL_COUNT; n++) {
    const cells = Object.values(kinds).map((make) => {
      let won = 0;
      for (let s = 0; s < seeds; s++) if (levelWon(finishBout(startLevel(n, make(1000 + s * 31), { seed: 500 + s * 13 + n })))) won++;
      return `${Math.round((won / seeds) * 100)}%`.padStart(15);
    });
    console.log(`  ${String(n).padEnd(6)}${cells.join('')}`);
  }
}

// Final forms against each other. Build a creature on each final-form line.
const finals = Object.entries(PATHS).filter(([, n]) => n.tier === 3).map(([id]) => id);
function finalCreature(id, seed) {
  const c = wildCreature(seed, 3);
  const line = [id];
  while (PATHS[line[0]].parent) line.unshift(PATHS[line[0]].parent);
  c.path.line = line;
  c.path.xp = TIER_XP[3];
  c.powers = NO_POWERS();
  c.battle.stance = 'close';
  return c;
}
const wins = Object.fromEntries(finals.map((id) => [id, 0]));
const durations = [];
const ROUNDS = 8;
for (const a of finals) {
  for (const b of finals) {
    if (a === b) continue;
    for (let i = 0; i < ROUNDS; i++) {
      const ca = finalCreature(a, 500 + i);
      const cb = finalCreature(b, 500 + i);
      ca.mutations = cb.mutations.map((m) => ({ ...m }));
      ca.essence = { ...cb.essence };
      ca.palette = JSON.parse(JSON.stringify(cb.palette));
      const bout = runBout([ca, cb], i + 1);
      durations.push(bout.t);
      if (bout.winner?.c === ca) wins[a]++;
      else if (bout.winner?.c === cb) wins[b]++;
    }
  }
}
const total = (finals.length - 1) * ROUNDS * 2;
console.log('\nFinal form win rate (same mutations and colors, only job differs):');
Object.entries(wins).sort((x, y) => y[1] - x[1]).forEach(([id, w]) => {
  console.log(`  ${PATHS[id].name.padEnd(16)} ${(100 * w / total).toFixed(0).padStart(3)}%`);
});
durations.sort((a, b) => a - b);
console.log(`Fight length: median ${durations[Math.floor(durations.length / 2)].toFixed(0)}s, longest ${durations[durations.length - 1].toFixed(0)}s`);
const sample = wildCreature(1, 3);
console.log(`\nSample level 3 wild: ${sample.name}, ${pathTitle(sample)}, ${JSON.stringify(computeStats(sample))}`);

// One power against a different creature of the same level with no powers. With no power at all
// this comes out at about 50%. The second number is against its own twin, which any edge wins.
function powerRate(give, rounds = 300) {
  let field = 0;
  let twin = 0;
  for (let seed = 0; seed < rounds; seed++) {
    const a = wildCreature(9000 + seed, 3);
    a.powers = NO_POWERS();
    a.ofa = null;
    // Gifts it happened to hatch with would muddy the comparison.
    a.traits = [];
    a.battle.stance = 'close';
    const b = parseCreature(serializeCreature(a));
    give(b);
    const rival = wildCreature(40000 + seed, 3);
    rival.powers = NO_POWERS();
    rival.ofa = null;
    rival.traits = [];
    rival.battle.stance = 'close';
    const order = seed % 2 ? [a, b] : [b, a];
    if (runBout(order, seed + 1).winner?.c === b) twin++;
    if (runBout(seed % 2 ? [rival, b] : [b, rival], seed + 1).winner?.c === b) field++;
  }
  return [Math.round((100 * field) / rounds), Math.round((100 * twin) / rounds)];
}
const row = (name, [field, twin]) => console.log(`  ${name.padEnd(30)} ${String(field).padStart(3)}%   twin ${String(twin).padStart(3)}%`);
const report = (rows) => rows.sort((x, y) => y[1][0] - x[1][0]).forEach(([name, rates]) => row(name, rates));

console.log('\nWin rate against a rival with no powers:');
row('No power at all', powerRate(() => {}));
row('Speedster', powerRate((c) => { c.powers.speedster = true; }));
console.log('Stands:');
report(STAND_IDS.map((id) => [STANDS[id].name, powerRate((c) => { c.powers.stand = id; })]));
console.log('Cursed techniques:');
report(TECHNIQUE_IDS.map((id) => [TECHNIQUES[id].name, powerRate((c) => { c.powers.technique = id; })]));
console.log('Quirks:');
report(QUIRK_IDS.map((id) => [`${QUIRKS[id].name} (-${QUIRKS[id].cost}% HP)`, powerRate((c) => { c.powers.quirks.push(id); })]));
console.log('One For All, by level:');
[1, 2, 3, 4, 5, 6, 7].forEach((level) => row(`One For All level ${level}`, powerRate((c) => {
  c.powers.quirks.push('oneforall');
  c.ofa = { stockpile: OFA_LEVEL_AT[level - 1], holders: [] };
})));
console.log('Born with:');
row('Sharingan alone', powerRate((c) => { c.traits = ['sharingan']; }));
row('Limitless', powerRate((c) => { c.powers.technique = 'limitless'; }));
row('Limitless with Six Eyes', powerRate((c) => { c.powers.technique = 'limitless'; c.traits = ['sixeyes']; }));
row('Shrine', powerRate((c) => { c.powers.technique = 'shrine'; }));
row('Cursed Body: Shrine and Ten Shadows', powerRate((c) => { c.powers.technique = 'shrine'; c.powers.technique2 = 'tenshadows'; c.traits = ['cursedbody']; }));
row('Cursed Body: Limitless and Shrine, Six Eyes', powerRate((c) => { c.powers.technique = 'limitless'; c.powers.technique2 = 'shrine'; c.traits = ['cursedbody', 'sixeyes']; }));
['titanshifter', 'saiyan', 'haki', 'sunbreathing', 'ninetails', 'onepunch', 'rinnegan', 'slayermark', 'ackerman', 'scarleteyes'].forEach((id) => row(TRAITS[id].name, powerRate((c) => { c.traits = [id]; })));
console.log('Weapons:');
WEAPON_IDS.forEach((id) => row(WEAPONS[id].name, powerRate((c) => { c.weapon = id; })));
adventure();

// Each stance for a few kinds of creature, against unrelated rivals with no powers who keep close.
function stanceRate(make, stance, rounds = 200) {
  let wins = 0;
  for (let seed = 0; seed < rounds; seed++) {
    const me = make(9000 + seed);
    me.powers = me.powers ?? NO_POWERS();
    me.battle.stance = stance;
    const rival = wildCreature(40000 + seed, 3);
    rival.powers = NO_POWERS();
    rival.battle.stance = 'close';
    if (runBout(seed % 2 ? [rival, me] : [me, rival], seed + 1).winner?.c === me) wins++;
  }
  return Math.round((100 * wins) / rounds);
}
const onJob = (id, seed) => {
  const c = finalCreature(id, seed);
  return c;
};
const KINDS = [
  ['Ordinary', (seed) => { const c = wildCreature(seed, 3); c.powers = NO_POWERS(); return c; }],
  ['Fast', (seed) => { const c = wildCreature(seed, 3); c.powers = NO_POWERS(); c.essence.spark += 80; return c; }],
  ['Speedster', (seed) => { const c = wildCreature(seed, 3); c.powers = { ...NO_POWERS(), speedster: true }; c.essence.spark += 40; return c; }],
  ['Spectrum Sage', (seed) => onJob('sage', seed)],
  ['Doom Knight', (seed) => onJob('doom', seed)],
  ['Grove Warden', (seed) => onJob('warden', seed)],
];
console.log('\nStances, win rate against rivals who keep close:');
console.log(`  ${''.padEnd(16)} ${['close', 'mid', 'bounce', 'hold'].map((s) => s.padStart(8)).join('')}`);
KINDS.forEach(([name, make]) => {
  console.log(`  ${name.padEnd(16)} ${['close', 'mid', 'bounce', 'hold'].map((s) => `${stanceRate(make, s)}%`.padStart(8)).join('')}`);
});

// The monsters in the Challenges note, against creatures from barely started to fully built.
function builtCreature(seed, level, extra) {
  const c = wildCreature(seed, level);
  c.powers = NO_POWERS();
  c.battle.stance = 'close';
  if (extra === 'trained') {
    Object.keys(c.training).forEach((k) => { c.training[k] = 6; });
  }
  if (extra === 'maxed') {
    c.growth = STAGES[STAGES.length - 1].at;
    c.essence.ember = 240;
    c.essence.sap = 180;
    c.essence.bone = 120;
    Object.keys(c.training).forEach((k) => { c.training[k] = 10; });
  }
  return c;
}
const LADDER = [
  ['new', (seed) => { const c = newCreature('New'); c.id = `new${seed}`; c.growth = STAGES[1].at; return c; }],
  ['Lv 1', (seed) => builtCreature(seed, 1)],
  ['Lv 2', (seed) => builtCreature(seed, 2)],
  ['Lv 3', (seed) => builtCreature(seed, 3)],
  ['trained', (seed) => builtCreature(seed, 3, 'trained')],
  ['maxed', (seed) => builtCreature(seed, 3, 'maxed')],
  ['all in', (seed) => {
    const c = builtCreature(seed, 3, 'maxed');
    c.powers.stand = 'theworld';
    c.powers.quirks.push('oneforall');
    c.trophies.push('rat', 'scorpion', 'spider', 'serpent', 'eagle', 'tortoise', 'squid', 'mammoth');
    return c;
  }],
  // Every deadly monster beaten, ready for the ultimate ones.
  ['endgame', (seed) => {
    const c = builtCreature(seed, 3, 'maxed');
    c.powers.stand = 'starplatinum';
    c.powers.quirks.push('oneforall');
    c.ofa = { stockpile: 280, holders: [] };
    c.weapon = 'dragonslayer';
    c.trophies.push(...DEADLY_IDS);
    return c;
  }],
];
console.log('\nChallenges, how often it wins:');
console.log(`  ${''.padEnd(18)} ${LADDER.map(([name]) => name.padStart(8)).join('')}`);
console.log(`  ${'(its power)'.padEnd(18)} ${LADDER.map(([, make]) => String(powerOf(make(7))).padStart(8)).join('')}`);
const challengeRate = (make, id, rounds = 40) => {
  let wins = 0;
  for (let i = 0; i < rounds; i++) {
    if (wonChallenge(finishBout(startChallenge(make(600 + i), id, { seed: i * 7919 + 1, r: 200 })))) wins++;
  }
  return `${Math.round((100 * wins) / rounds)}%`.padStart(8);
};
TRAINING_IDS.forEach((id) => console.log(`  ${TRAINING_MONSTERS[id].name.padEnd(18)} ${LADDER.map(([, make]) => challengeRate(make, id)).join('')}`));
[...DEADLY_IDS, ...ULTIMATE_IDS].forEach((id) => console.log(`  ${DEADLY_MONSTERS[id].name.padEnd(18)} ${LADDER.map(([, make]) => challengeRate(make, id)).join('')}`));

// The races of the Negative against a Pillar Man, the strongest race born in the light world: the
// same Elder twice, trained to the limit, with nothing but its race told apart. Every one of them
// should win far more often than not.
{
  const { RACES, NEGATIVE_RACE_IDS } = await import('../src/data/races.js');
  const elderOf = (race, seed) => {
    const c = wildCreature(seed, 3);
    Object.assign(c, { growth: 200, race, heritage: null, pureBlood: false, traits: [], souls: [], weapon: null, powers: NO_POWERS() });
    c.powers.fruit = null;
    Object.keys(c.training).forEach((k) => { c.training[k] = 10; });
    c.battle.stance = 'close';
    return c;
  };
  const ROUNDS_VS = 60;
  console.log('\nThe races of the Negative against a Pillar Man:');
  for (const id of NEGATIVE_RACE_IDS) {
    let won = 0;
    for (let i = 0; i < ROUNDS_VS; i++) {
      const a = elderOf(id, 900 + i);
      const b = elderOf('pillarman', 900 + i);
      Object.assign(b, { mutations: a.mutations.map((m) => ({ ...m })), essence: { ...a.essence }, palette: JSON.parse(JSON.stringify(a.palette)), path: JSON.parse(JSON.stringify(a.path)) });
      if (runBout(i % 2 ? [a, b] : [b, a], i + 1).winner?.c === a) won++;
    }
    console.log(`  ${RACES[id].name.padEnd(16)} wins ${String(Math.round((100 * won) / ROUNDS_VS)).padStart(3)}%`);
  }
}
