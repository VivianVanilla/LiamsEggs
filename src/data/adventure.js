// Adventure: a campaign of 50 levels in four acts. Pick three creatures and fight your way through,
// one level at a time. Every fifth level a deadly monster leads the enemy: up to The Last Dragon at
// the end of Act 1, and past it, in Act 2, older and worse things, where the enemy carries forged
// weapons too. In Act 3 every enemy also carries a Legendary mutation, and late in Act 4 two, behind
// the ultimate monsters. From Act 3 on every level climbs faster, so the last two acts need your
// strongest, most finished creatures. Nobody can die here. Only names and numbers; the rules are in
// core/adventure.js.

export const ADVENTURE_PARTY = 3;

export const ADVENTURE_LEVELS = [
  // ---- Act 1: the road to the dragon ----
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
  { name: 'Frostfang Peaks', text: 'Four of them, and the cold is on their side.' },
  { name: 'The Ashen Gate', text: 'The gate to the dragon\'s land, and its keepers.' },
  { name: 'Starfall Crater', text: 'Whatever fell here made them stronger.' },
  { name: 'The Last Bridge', text: 'One bridge, four guards, and no way around.' },
  { name: 'The Dragon\'s Throne', text: 'The Last Dragon waits at the end of everything. Or so everyone thought.', boss: true },
  // ---- Act 2: past the end of the map. The enemy is armed. ----
  { name: 'The Shattered Sky', text: 'Behind the throne, the sky itself is cracked, and something armed comes through.', act: 2 },
  { name: 'Ember Archipelago', text: 'Islands of cooling lava, and a crew that forged its own blades in them.', act: 2 },
  { name: 'The Moonlit Steps', text: 'A stair to the moon, guarded. A Lunarian waits at the top for someone worth following.', act: 2 },
  { name: 'The Drowned City', text: 'A whole city under the waves, and its last defenders.', act: 2 },
  { name: 'The Abyss', text: 'Down where no light reaches, The Abyssal Squid has been waiting to be found.', boss: true, act: 2 },
  { name: 'Thunderhead Spire', text: 'A tower inside a storm cloud. Every step up is a fight.', act: 2 },
  { name: 'The Hall of Champions', text: 'Every champion the world forgot, and a Devil who keeps their score.', act: 2 },
  { name: 'The Last Garden', text: 'The most beautiful place in the world, and the best guarded.', act: 2 },
  { name: 'The Edge of the Map', text: 'Past here the map is blank. Four of them make sure it stays that way.', act: 2 },
  { name: 'The First Flame', text: 'Before The Last Dragon there was The First Dragon. It is awake.', boss: true, act: 2 },
  // ---- Act 3: the Bizarre lands. Every enemy carries a Legendary mutation. ----
  { name: 'The Stone Ruins', text: 'Masks on every wall, and the things that wore them.', act: 3 },
  { name: 'Blood Moon Road', text: 'The road only shows itself under a red moon, and so do its guards.', act: 3 },
  { name: 'The Pillar Halls', text: 'Something sleeps in every pillar. Some of them are awake.', act: 3 },
  { name: 'Ripple Falls', text: 'A waterfall that hums, and fighters who learned its rhythm.', act: 3 },
  { name: 'The Iron Herd', text: 'The Iron Rhino came back, and the herd it leads is bigger than it is.', boss: true, act: 3 },
  { name: 'The Rift Shore', text: 'Where the sky tore open over the sea, and things fell through.', act: 3 },
  { name: 'The Saucer Wreck', text: 'A crashed ship, still humming, still guarded.', act: 3 },
  { name: 'The Hunting Grounds', text: 'Something faster than the eye has been leaving tracks.', act: 3 },
  { name: 'The Deep Trench', text: 'The Sea King\'s children grew up down here.', act: 3 },
  { name: 'The Ghost Throne', text: 'Nobody has ever seen its king standing still.', boss: true, act: 3 },
  // ---- Act 4: the end of all roads. The ultimate monsters lead, and from level 46 every enemy has two Legendary mutations. ----
  { name: 'The Broken Crown', text: 'Kings of every land that fell, still fighting over the crown.', act: 4 },
  { name: 'Thunder Steppe', text: 'Lightning strikes the same place twice here. On purpose.', act: 4 },
  { name: 'The Ink Sea', text: 'Black water as far as you can see, and arms under all of it.', act: 4 },
  { name: 'The Titans\' Stair', text: 'Steps built for something much, much bigger.', act: 4 },
  { name: 'The Storm\'s Eye', text: 'In the middle of the storm, the tiger is waiting.', boss: true, act: 4 },
  { name: 'Leviathan\'s Wake', text: 'Something huge went this way. Its guards stayed behind.', act: 4 },
  { name: 'The Mirror Plains', text: 'Every fighter here looks a little like one of yours.', act: 4 },
  { name: 'The Last Light', text: 'The sun has not set here in a thousand years, and its guards have not rested.', act: 4 },
  { name: 'Before Everything', text: 'The ground here is older than the world around it.', act: 4 },
  { name: 'The First Beast', text: 'Before every monster, there was this one.', boss: true, act: 4 },
];

// Where each act starts, and what it says at the top.
export const ADVENTURE_ACTS = [
  { from: 1, title: 'Act 1: the road to the dragon' },
  { from: 21, title: 'Act 2: past the end of the map. The enemy is armed.' },
  { from: 31, title: 'Act 3: the Bizarre lands. Every enemy carries a Legendary mutation.' },
  { from: 41, title: 'Act 4: the end of all roads. The ultimate monsters lead, and from level 46 every enemy carries two Legendary mutations.' },
];

// Who leads each boss level: a monster from the Challenges note, sometimes older and stronger, with
// its own name, and `power` times its usual strength.
export const ADVENTURE_BOSSES = {
  5: { monster: 'serpent' },
  10: { monster: 'tortoise' },
  15: { monster: 'rex' },
  20: { monster: 'dragon' },
  25: { monster: 'squid', name: 'The Abyssal Squid', power: 1.3 },
  30: { monster: 'dragon', name: 'The First Dragon', power: 1.05 },
  // The level's own toughness comes on top, so a `power` under 1 is still far stronger than the
  // monster in the Challenges note.
  35: { monster: 'rhino', name: 'The Iron Matriarch', power: 1.3 },
  40: { monster: 'leopard', name: 'The Pale King', power: 1.3 },
  45: { monster: 'tiger', name: 'The Storm Tiger', power: 0.75 },
  50: { monster: 'behemoth', name: 'The First Beast', power: 0.6 },
};

// Level n brings min(ADVENTURE_MAX_ENEMIES, 1 + floor(n / ADVENTURE_MORE_EVERY)) wild fighters; a boss
// level brings half that many with its monster. They are seasoned (wild level 2) from
// ADVENTURE_SEASONED[2] on and final forms (wild level 3) from ADVENTURE_SEASONED[3] on, and from
// ADVENTURE_ARMED on every one of them carries a forged weapon. Everything on the other side hits and
// lasts this much harder for every level after the first.
export const ADVENTURE_MAX_ENEMIES = 4;
export const ADVENTURE_MORE_EVERY = 5;
export const ADVENTURE_SEASONED = { 2: 5, 3: 12 };
export const ADVENTURE_ARMED = 21;
export const ADVENTURE_TOUGHER = 0.04;
// From ADVENTURE_SOULS[k] on, every wild fighter carries k Legendary mutations, picked at random.
export const ADVENTURE_SOULS = { 1: 31, 2: 46 };
// From level `from` on, each level adds `more` on top of ADVENTURE_TOUGHER. Tuned so three fully
// trained creatures with every trophy and three Legendary mutations win Act 3 most of the time, the
// start of Act 4 about half the time, and level 50 rarely; anything less finished stops at Act 3.
export const ADVENTURE_STEEPER = [{ from: 31, more: 0.02 }];

// The first time a level is beaten, it pays this many gems for each level number, the last one pays
// a bonus on top, and some hand over more: gems, ore, items, or a rare creature that wants to join
// you (it waits in the village to be named).
export const ADVENTURE_GEMS_PER_LEVEL = 2;
export const ADVENTURE_FINISH_GEMS = 250;
export const ADVENTURE_PRIZES = {
  3: { items: { chamber: 1 } },
  5: { ore: 4, items: { expander: 1 } },
  8: { items: { chamber: 1 } },
  10: { ore: 8, items: { expander: 1 } },
  13: { items: { chamber: 1 } },
  15: { ore: 12, items: { expander: 1 } },
  18: { items: { chamber: 1 } },
  20: { gems: 100, ore: 20, items: { expander: 1, chamber: 1 } },
  21: { ore: 10 },
  22: { items: { chamber: 1 } },
  23: { found: 'lunarian', items: { expander: 1 } },
  24: { ore: 12 },
  25: { ore: 25, items: { expander: 1, chamber: 1 } },
  26: { items: { chamber: 1 } },
  27: { found: 'devil' },
  28: { ore: 15, items: { expander: 1 } },
  29: { items: { chamber: 1, expander: 1 } },
  30: { gems: 250, ore: 40, items: { expander: 2, chamber: 2 } },
  31: { ore: 15 },
  32: { items: { chamber: 1 } },
  33: { ore: 18, items: { expander: 1 } },
  35: { gems: 150, ore: 30, items: { expander: 1, chamber: 1 } },
  37: { ore: 20, items: { chamber: 2 } },
  39: { items: { expander: 1, chamber: 1 } },
  40: { gems: 300, ore: 50, items: { soulexpander: 1, expander: 1 } },
  42: { ore: 25, items: { chamber: 2 } },
  44: { items: { expander: 2 } },
  45: { gems: 250, ore: 40, items: { expander: 1, chamber: 2 } },
  47: { ore: 30, items: { chamber: 2 } },
  49: { items: { expander: 2, chamber: 2 } },
  50: { ore: 80, items: { soulexpander: 1, expander: 2, chamber: 3 } },
};
// Beating a boss level again still knocks a little ore loose.
export const ADVENTURE_REPLAY_ORE = 1;
// Every win, first time or not, has these chances of an item, plus a little more for each level.
export const ADVENTURE_DROPS = { chamber: 0.08, expander: 0.02 };
export const ADVENTURE_DROPS_PER_LEVEL = { chamber: 0.004, expander: 0.0015 };
