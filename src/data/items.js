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
};
export const ITEM_IDS = Object.keys(ITEMS);
// The bag holds at most this many of each.
export const MAX_ITEMS = 99;

// A Time Chamber Key grows it to this stage (Grown), and fills it up to this much.
export const CHAMBER_STAGE = 3;
export const CHAMBER_FULLNESS = 90;
// Each Limit Expander makes room for this many more mutations, and one creature can take this many.
export const EXPANDER_SLOTS = 2;
export const MAX_EXPANDERS = 2;
