// Loot: things Adventure and expeditions bring home, kept in the household's bag until you use one
// on a creature. Only numbers here; the rules are in core/items.js.

export const ITEMS = {
  chamber: {
    name: 'Time Chamber Key', color: '#7fd6ff',
    text: 'A year in the Hyperbolic Time Chamber, over in a moment: one creature comes out Grown and well fed, ready to breed.',
  },
  expander: {
    name: 'Limit Expander', color: '#ff7ad9',
    text: 'Lets one creature hold 2 more mutations than usual. Each creature can take 2 of them.',
  },
  soulexpander: {
    name: 'Legendary Expander', color: '#ffd24a',
    text: 'Makes room for one more Legendary mutation. A creature holds 1, and can take 2 of these, for 3.',
  },
  // Crafted from Ascension Stones in the Negative (data/ascension.js). Each awakens one power for good.
  requiemarrow: {
    name: 'Requiem Arrow', color: '#ffd84a', awakens: 'stand',
    text: 'Pierces a Stand a second time, and it becomes a Requiem. Only for a creature with a Stand.',
  },
  speedstone: {
    name: 'True Speed Stone', color: '#ffe14a', awakens: 'speedster',
    text: 'Takes a speedster past the speed of light: True Speed. Only for a speedster.',
  },
  fruitawakening: {
    name: 'Devil Fruit Awakening', color: '#ff7a2a', awakens: 'fruit',
    text: 'Wakes its Devil Fruit up, so it changes the world around it. Only for a creature that has eaten one.',
  },
  amplification: {
    name: 'Cursed Technique Amplification', color: '#a24fd6', awakens: 'technique',
    text: 'Pushes its cursed technique to its Maximum. Only for a creature with a cursed technique.',
  },
};
export const ITEM_IDS = Object.keys(ITEMS);
// The items that awaken a power, by the kind of power each one awakens.
export const AWAKEN_ITEM_IDS = ITEM_IDS.filter((id) => ITEMS[id].awakens);
// The bag holds at most this many of each.
export const MAX_ITEMS = 99;

// A Time Chamber Key grows it to this stage (Grown), and fills it up to this much.
export const CHAMBER_STAGE = 3;
export const CHAMBER_FULLNESS = 90;
// Each Limit Expander makes room for this many more mutations, and one creature can take this many.
export const EXPANDER_SLOTS = 2;
export const MAX_EXPANDERS = 2;
// Each Legendary Expander makes room for one more Legendary mutation, and one creature can take this many.
export const MAX_SOUL_EXPANDERS = 2;
