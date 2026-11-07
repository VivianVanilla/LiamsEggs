// The forge: weapons made from Legendary ore and gems. Only numbers here; the rules are in
// core/forge.js, and what each one does in a fight is in sim/arena.js.
//
// Legendary ore only comes out of the Legendary Mine in your village (core/village.js), where only
// legendary Miners can work, and from the bosses in Adventure. A weapon is made once and goes into
// the household's armory; a creature carries one at a time, and it is saved in its .creature file.
//
//   damage      it hits this much harder, with everything
//   crit        this much more chance of a critical hit
//   stunChance  each swing that lands has this chance to stun for `stun` seconds
//   poison      a swing that lands poisons: this share of its attack every second, for `poisonFor`
//   lifesteal   it heals this share of the damage its swings deal
//   monster     this much more damage again against monsters

export const WEAPONS = {
  starblade: {
    name: 'Starforged Blade', ore: 6, gems: 5, color: '#9fd3ff',
    damage: 0.2,
    text: 'hits 20% harder',
  },
  katana: {
    name: 'Crimson Katana', ore: 10, gems: 10, color: '#ff4a5a',
    crit: 0.25,
    text: 'has a 25% higher chance of a critical hit',
  },
  hammer: {
    name: 'Thunder Hammer', ore: 14, gems: 15, color: '#ffe14a',
    damage: 0.15, stunChance: 0.2, stun: 0.8,
    text: 'hits 15% harder, and 1 swing in 5 stuns for a moment',
  },
  fang: {
    name: 'Venom Fang', ore: 14, gems: 15, color: '#8fe05a',
    poison: 0.5, poisonFor: 3,
    text: 'poisons whatever it cuts for 3 seconds',
  },
  scythe: {
    name: 'Soul Reaper Scythe', ore: 22, gems: 25, color: '#b48aff',
    damage: 0.1, lifesteal: 0.25,
    text: 'hits 10% harder, and heals it for a quarter of the damage its swings deal',
  },
  dragonslayer: {
    name: 'Dragonslayer', ore: 35, gems: 40, color: '#ff9a3a',
    damage: 0.35, monster: 0.5,
    text: 'hits 35% harder, and half as hard again against monsters',
  },
  soulsplitkatana: {
    name: 'Soul Split Katana', ore: 50, gems: 500000, color: '#e6d7ff',
    ignoreDodge: 0.25,
    text: 'ignores the target\'s dodge chance 25% of the time',
  },
};
export const WEAPON_IDS = Object.keys(WEAPONS);

// The armory holds at most this many of each, and the household this much ore.
export const MAX_ARMORY = 99;
export const MAX_ORE = 9999;
