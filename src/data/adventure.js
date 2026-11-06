// Adventure: a campaign of 20 levels. Pick three creatures and fight your way through, one level at
// a time. Every fifth level, a deadly monster from Challenges leads the enemy, up to The Last Dragon
// at the end. Nobody can die here. Only names and numbers; the rules are in core/adventure.js.

export const ADVENTURE_PARTY = 3;

export const ADVENTURE_LEVELS = [
  { name: 'The Meadow Path', text: 'A lone scrapper blocks the road out of the village.' },
  { name: 'Bramble Hollow', text: 'Something has been eating the berries. It does not want to share.' },
  { name: 'Old Mill Crossing', text: 'The miller\'s guard dog grew up. A lot.' },
  { name: 'Fogbank Marsh', text: 'Two shapes in the fog, and neither of them is friendly.' },
  { name: 'The Serpent\'s Den', text: 'The Bog Serpent coils around the only way through.', boss: true },
  { name: 'Rattlebone Pass', text: 'A gang of seasoned fighters charges a toll.' },
  { name: 'Ember Steppe', text: 'Hot wind, cracked ground, and a camp of rivals.' },
  { name: 'The Sunken Road', text: 'Three of them wait where the road goes under.' },
  { name: 'Stormwatch Ridge', text: 'Lightning on the ridge, and veterans who like it.' },
  { name: 'The Iron Shell', text: 'Old Shell has not moved in a hundred years. Today it does.', boss: true },
  { name: 'Glasswind Desert', text: 'The sand cuts. So do the creatures that live in it.' },
  { name: 'The Hollow Woods', text: 'Final forms only, this deep in the woods.' },
  { name: 'Black Tide Coast', text: 'The tide brings in four fighters and takes out anyone who loses.' },
  { name: 'The Ruined Keep', text: 'The old champions still hold the keep.' },
  { name: 'Tyrant\'s Valley', text: 'The ground shakes before you even see Old Rex.', boss: true },
  { name: 'Frostfang Peaks', text: 'Five of them, and the cold is on their side.' },
  { name: 'The Ashen Gate', text: 'The gate to the dragon\'s land, and its keepers.' },
  { name: 'Starfall Crater', text: 'Whatever fell here made them stronger.' },
  { name: 'The Last Bridge', text: 'One bridge, five guards, and no way around.' },
  { name: 'The Dragon\'s Throne', text: 'The Last Dragon waits at the end of everything.', boss: true },
];

// Which monster leads each boss level.
export const ADVENTURE_BOSSES = { 5: 'serpent', 10: 'tortoise', 15: 'rex', 20: 'dragon' };

// Level n brings min(ADVENTURE_MAX_ENEMIES, 1 + floor(n / ADVENTURE_MORE_EVERY)) wild fighters; a boss
// level brings half that many with its monster. They are seasoned (wild level 2) from
// ADVENTURE_SEASONED[2] on and final forms (wild level 3) from ADVENTURE_SEASONED[3] on. Everything on
// the other side hits and lasts this much harder for every level after the first.
export const ADVENTURE_MAX_ENEMIES = 4;
export const ADVENTURE_MORE_EVERY = 5;
export const ADVENTURE_SEASONED = { 2: 5, 3: 12 };
export const ADVENTURE_TOUGHER = 0.04;

// The first time a level is beaten, it pays this many gems for each level number, the last one pays
// a bonus on top, and some hand over ore and items as well.
export const ADVENTURE_GEMS_PER_LEVEL = 2;
export const ADVENTURE_FINISH_GEMS = 100;
export const ADVENTURE_PRIZES = {
  3: { items: { chamber: 1 } },
  5: { ore: 4, items: { expander: 1 } },
  8: { items: { chamber: 1 } },
  10: { ore: 8, items: { expander: 1 } },
  13: { items: { chamber: 1 } },
  15: { ore: 12, items: { expander: 1 } },
  18: { items: { chamber: 1 } },
  20: { ore: 20, items: { expander: 1, chamber: 1 } },
};
// Beating a boss level again still knocks a little ore loose.
export const ADVENTURE_REPLAY_ORE = 1;
// Every win, first time or not, has these chances of an item, plus a little more for each level.
export const ADVENTURE_DROPS = { chamber: 0.08, expander: 0.02 };
export const ADVENTURE_DROPS_PER_LEVEL = { chamber: 0.005, expander: 0.002 };
