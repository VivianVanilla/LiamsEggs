// Ascension: what opens past Chapter ???. Beating Chapter ??? opens the Elite Negative (in
// data/negative.js), and every win there pays Ascension Stones. Stones and Void Shards craft four
// things, each of which awakens one of the light world's powers into something far stronger:
//   a Requiem Arrow pierces a Stand a second time, and it becomes a Requiem;
//   a True Speed Stone takes a speedster past the speed of light;
//   a Devil Fruit Awakening wakes the fruit up, so it changes the world around it, not just its eater;
//   a Cursed Technique Amplification pushes a cursed technique to its Maximum.
// An awakened power is what the God Chapter (data/adventure.js) has to be fought with: what lives
// there barely feels anything that isn't. Beating the God Chapter opens God Mode (core/god.js).
// Only names and numbers here; the rules are in core/creature.js and core/items.js.

// What each awakening does, by the kind of power it needs (POWER_KINDS in data/powers.js).
//   item       the item that awakens it (data/items.js)
//   stats      added on top of the power's own stats
//   limits     added to every stat's limit, so the stats really do go up
//   movePower  every move the power already had hits this many times as hard
//   move       a new move of its own (AWAKEN_MOVES below)
//   passive    works in every fight, like a race's (core/creature.js fightPassive)
export const AWAKENINGS = {
  stand: {
    name: 'Requiem', item: 'requiemarrow', color: '#ffd84a',
    stats: { might: 8, wits: 8, guard: 6, speed: 4 }, limits: 12, movePower: 1.75, move: 'returntozero',
    passive: { lives: 1, reflect: 0.35, horizon: true, cooldown: 0.2, damage: 10, text: 'Every move it has comes back 20% sooner and lands 1000% harder, 35% of every hit it takes goes back to whoever landed it, even moves that never miss can miss it, and the first time it would be knocked out, that is returned to zero: it gets back up with half its health.' },
    blurb: 'Pierced by the Arrow a second time, its Stand becomes a Requiem: something that doesn\'t follow the rules the others do.',
  },
  speedster: {
    name: 'True Speed', item: 'speedstone', color: '#ffe14a',
    stats: { speed: 14, wits: 6, might: 4 }, limits: 12, movePower: 2, move: 'infinitemass',
    passive: { speed: 10, dodge: 0.18, twice: 0.90, cooldown: 0.35, horizon: true, text: 'Moves 1000% faster, 18% more likely to dodge, and even moves that never miss can miss it. 90% of its swings land twice, and its moves come back 30% sooner.' },
    blurb: 'Past the speed of light, where everything else is standing still. Its Speed Force move hits twice as hard.',
  },
  fruit: {
    name: 'Awakened', item: 'fruitawakening', color: '#ff7a2a',
    stats: { vigor: 10, might: 8, guard: 6 }, limits: 12, movePower: 1.8, move: 'awakening',
    passive: { hp: 0.6, damage: 6.35, aura: 0.4, auraRange: 230, regen: 0.01, text: '60% more max HP, everything it does lands 635% harder, it heals 1% of its health every second, and the world around it obeys its fruit: everything on the other side within 230 takes 40% of its hit every second.' },
    blurb: 'The fruit wakes up. It stops being something its eater has and starts being the world around it.',
  },
  technique: {
    name: 'Amplified', item: 'amplification', color: '#a24fd6',
    stats: { might: 12, wits: 6, vigor: 4 }, limits: 12, movePower: 1.8, move: 'maximumtechnique',
    passive: { damage: 1.4, crit: 0.2, critMul: 1, absorb: 0.15, execute: 2.4, text: 'Everything it does lands 140% harder, and 240% harder still on anything below half its health. 20% more critical hits, which land three times as hard instead of twice, and it heals 15% of all the damage it deals.' },
    blurb: 'Its cursed technique, pushed to its Maximum: cursed energy poured through it until the technique itself changes.',
  },
};
export const AWAKEN_KINDS = Object.keys(AWAKENINGS);

// Each awakening's own move, added to ABILITIES in data/paths.js.
export const AWAKEN_MOVES = {
  returntozero: { name: 'Return to Zero', cry: 'REQUIEM: RETURN TO ZERO', loud: true, kind: 'nova', cd: 14, power: 3.2, range: 300, stun: 1.5, silence: 4, color: '#ffd84a' },
  infinitemass: { name: 'Infinite Mass Punch', cry: 'INFINITE MASS PUNCH', loud: true, kind: 'dash', cd: 10, power: 5, stun: 1, range: 800, color: '#ffe14a' },
  awakening: { name: 'Awakening', cry: 'AWAKENING', loud: true, kind: 'nova', cd: 13, power: 3.5, range: 320, stun: 1.2, push: 90, color: '#ff7a2a' },
  maximumtechnique: { name: 'Maximum Technique', cry: 'MAXIMUM TECHNIQUE', boom: 'MAXIMUM', loud: true, kind: 'bomb', cd: 15, power: 6, fuse: 1.5, splash: 240, range: 650, color: '#a24fd6' },
};

// What crafting each one costs, in Ascension Stones and Void Shards. Crafted in the Negative's
// Ascension tab, and it goes into the household's bag (data/items.js), to be used in the Nursery.
export const ASCENSION_RECIPES = {
  requiemarrow: { stones: 3, shards: 300 },
  speedstone: { stones: 3, shards: 300 },
  fruitawakening: { stones: 3, shards: 300 },
  amplification: { stones: 3, shards: 300 },
};
export const MAX_STONES = 9999;

// God-touched: what lives in the God Chapter takes only (1 - GOD_GUARD) of a hit from a creature
// with no awakened power, and full hits from one with GOD_FULL or more of them. In between, it
// climbs evenly: one awakened power lands about half.
export const GOD_GUARD = 0.9;
export const GOD_FULL = 2;
