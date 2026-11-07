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
  // ---- Act 5: the end of everything. Every enemy is an Elder trained to the limit, born with two gifts
  // and carrying three Legendary mutations, and every other level a boss that was never meant to fall. ----
  { name: 'The Unmade Road', text: 'Past the First Beast there is no road. They make one out of whoever walks it.', act: 5 },
  { name: 'The Hollow Sea', text: 'The Hollow Kraken is bigger on the inside, and it is very hungry inside.', boss: true, act: 5 },
  { name: 'The Bone Choir', text: 'A thousand champions singing one note. It is the note things die to.', act: 5 },
  { name: 'The Tyrant\'s Grave', text: 'Old Rex never died. It just got tired of waiting for someone worth eating.', boss: true, act: 5 },
  { name: 'The Weeping Gate', text: 'The gate cries for everyone it ever let through. It has not let anyone through in a long time.', act: 5 },
  { name: 'The Leviathan Below', text: 'The Starving Leviathan has died twice already. It did not take either time.', boss: true, act: 5 },
  { name: 'The Last Army', text: 'Every army that ever lost, back for one more war.', act: 5 },
  { name: 'The Twin Storms', text: 'Two Thunder Tigers, and the storm between them is a third.', boss: true, act: 5 },
  { name: 'The Silence Before', text: 'Nothing moves here. Nothing has to.', act: 5 },
  { name: 'The End of All Things', text: 'It is not a monster. It is what is left when everything else is gone, and it would like you to be gone too.', boss: true, act: 5 },
];

// Where each act starts, and what it says at the top.
export const ADVENTURE_ACTS = [
  { from: 1, title: 'Act 1: the road to the dragon' },
  { from: 21, title: 'Act 2: past the end of the map. The enemy is armed.' },
  { from: 31, title: 'Act 3: the Bizarre lands. Every enemy carries a Legendary mutation.' },
  { from: 41, title: 'Act 4: the end of all roads. The ultimate monsters lead, and from level 46 every enemy carries two Legendary mutations.' },
  { from: 51, title: 'Act 5: the end of everything. Every enemy is an Elder trained to the limit, born with two gifts and carrying three Legendary mutations, and the bosses were never meant to fall.' },
];

// Who leads each boss level: a monster from the Challenges note, sometimes older and stronger, with
// its own name, and `power` times its usual strength. A boss can bring `moves` of its own instead,
// and a `passive` that works like a race's (data/races.js), only much worse. `twin` sends that many
// of it at once.
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
  // Act 5. Each one fights in a way nothing before it did.
  52: {
    monster: 'kraken', name: 'The Hollow Kraken', power: 0.8, moves: ['inkcloud', 'mindswap', 'tendrils', 'oblivion'],
    passive: { regen: 0.012, unstoppable: true, text: 'Nothing can stun, confuse or silence it, it heals 1.2% of its health every second, and it keeps calling living shadows up out of the dark.' },
  },
  54: {
    monster: 'rex', name: 'Rex Eternal', power: 0.85, moves: ['reckoning', 'worldbreak', 'stoop', 'warcry'],
    passive: { unstoppable: true, enrage: 1, absorb: 0.15, text: 'Nothing can stun, confuse or silence it, it heals 15% of the damage it deals, and below half its health it hits twice as hard.' },
  },
  56: {
    monster: 'leviathan', name: 'The Starving Leviathan', power: 0.7, moves: ['regrow', 'devourstar', 'inkcloud', 'worldbreak'],
    passive: { lives: 2, aura: 0.25, auraRange: 200, poisonproof: true, text: 'It gets back up twice, everything within 200 of it rots every second, and poison can\'t touch it.' },
  },
  58: {
    monster: 'tiger', name: 'Thunder Tiger', power: 0.6, twin: 2, moves: ['stoop', 'zap', 'warcry', 'oblivion'],
    passive: { reflect: 0.25, dodge: 0.15, frenzy: 0.03, text: 'There are two of them. Each throws 2.5% of every hit back, dodges more, and gets stronger with every hit it lands.' },
  },
  60: {
    monster: 'behemoth', name: 'The End of All Things', power: 0.62, moves: ['endtime', 'worldbreak', 'lastlight', 'tendrils', 'oblivion'],
    passive: {
      unstoppable: true, lives: 2, enrage: 0.8, aura: 0.2, auraRange: 220, nullField: true, reflect: 0.15, regen: 0.006,
      text: 'Everything at once: nothing stops it, it gets back up twice, it rots and silences everything around it, it throws hits back, it heals, it stops time, and below half its health it hits 80% harder.',
    },
  },
};

// Act 5's own rules. From ADVENTURE_ELITE on, every wild fighter is an Elder trained to the limit,
// born with ADVENTURE_ELITE_GIFTS gifts.
export const ADVENTURE_ELITE = 51;
export const ADVENTURE_ELITE_GIFTS = 2;

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
export const ADVENTURE_SOULS = { 1: 31, 2: 46, 3: 51 };
// From level `from` on, each level adds `more` on top of ADVENTURE_TOUGHER. Tuned so three fully
// trained creatures with every trophy and three Legendary mutations win Act 3 most of the time, the
// start of Act 4 about half the time, and level 50 rarely; anything less finished stops at Act 3.
// Act 5 climbs much faster again: by its last level the enemy is far past anything before it.
export const ADVENTURE_STEEPER = [{ from: 31, more: 0.02 }, { from: 51, more: 0.09 }];

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
  51: { gems: 400, ore: 40 },
  52: { gems: 800, ore: 60, items: { soulexpander: 1, chamber: 2 } },
  53: { gems: 500, ore: 45, items: { expander: 2 } },
  54: { gems: 1000, ore: 70, items: { soulexpander: 1, chamber: 2 } },
  55: { gems: 600, ore: 50, items: { expander: 2, chamber: 2 } },
  56: { gems: 1300, ore: 90, items: { soulexpander: 1, expander: 2 } },
  57: { gems: 750, ore: 60, items: { chamber: 3 } },
  58: { gems: 1700, ore: 110, items: { soulexpander: 1, expander: 2, chamber: 2 } },
  59: { gems: 900, ore: 70, items: { expander: 2, chamber: 2 } },
  60: { gems: 5000, ore: 300, items: { soulexpander: 2, expander: 3, chamber: 5 } },
};
// Beating a boss level again still knocks a little ore loose.
export const ADVENTURE_REPLAY_ORE = 1;
// Every win, first time or not, has these chances of an item, plus a little more for each level.
export const ADVENTURE_DROPS = { chamber: 0.08, expander: 0.02 };
export const ADVENTURE_DROPS_PER_LEVEL = { chamber: 0.004, expander: 0.0015 };

// ---- Chapter ???: the Abyss Between ----
// Only after a universe reset (core/universe.js). 25 levels between the two worlds, each one harder
// than the last by ABYSS.grow times, on top of everything Act 5 ended on. Whatever lives here is
// void-touched: anything without Negative blood only does `voidGuard` less damage to it, so the only
// way through is a creature that crossed over from the Negative Dimension, or one bred from one.
// A creature half Negative or more hits it at full strength, and a quarter halfway.
export const ABYSS_LEVELS = [
  { name: 'Static', text: 'The first thing past the end is a sound, and the sound has teeth.' },
  { name: 'The Hum Under Everything', text: 'It was always there. You only hear it now.' },
  { name: 'Where Colors Go', text: 'Every color your creatures ever mined ends up here, and it remembers them.' },
  { name: 'The Wrong Stars', text: 'Someone moved the stars. They did not put them back.' },
  { name: 'The Grey Shepherd', text: 'It herds whatever falls between the worlds. It would like to herd you.', boss: true },
  { name: 'Teeth in the Fog', text: 'The fog has a mouth, and the mouth has a lot of friends.' },
  { name: 'The Backwards River', text: 'Water runs uphill here, and so does anything that tries to run.' },
  { name: 'Hollow Saints', text: 'They were holy, once. Now they are only hollow.' },
  { name: 'The Long Fall', text: 'You have been falling the whole time. So have they.' },
  { name: 'The Eye That Opens Inward', text: 'It does not look at you. It looks at what you are.', boss: true },
  { name: 'Glass Rain', text: 'Every drop is a little mirror, and every mirror wants out.' },
  { name: 'The Crowd of One', text: 'There is only one of them. There are hundreds of them.' },
  { name: 'Echo Fields', text: 'Every fight anyone ever lost is still happening here.' },
  { name: 'The Unlit Lighthouse', text: 'It guides ships the other way.' },
  { name: 'Mother of Moths', text: 'Everything here flies to her. Nothing flies away.', boss: true },
  { name: 'The Hunger Clock', text: 'Every tick, something gets eaten.' },
  { name: 'The Bleeding Map', text: 'The map of both worlds, and the place where they tear.' },
  { name: 'The Second Moon', text: 'The Lunarians had a second moon. This is where it went.' },
  { name: 'Nowhere, Again', text: 'You have been here before. So has everything waiting for you.' },
  { name: 'The Inverted Dragon', text: 'The Last Dragon, the First Dragon, and this one, which is neither.', boss: true },
  { name: 'The Breath Between', text: 'The two worlds breathe in and out. You are standing in the lungs.' },
  { name: 'The Choir of Static', text: 'They are singing the first sound, backwards.' },
  { name: 'The Edge of the Edge', text: 'Past here, even the Negative ends.' },
  { name: 'What Waits', text: 'It has waited since before the first universe. It is done waiting.' },
  { name: '???', text: 'The question at the bottom of everything. Nobody has ever heard the answer.', boss: true },
];
export const ABYSS = {
  voidGuard: 0.9,
  // Each level is this many times harder than the one before it, starting from where Act 5 ended.
  grow: 1.17,
  start: 1.15,
  // The first win of level k pays gems * gemsGrow ** (k - 1), and ore.
  gems: 800,
  gemsGrow: 1.55,
  ore: 60,
  // How many fight on the other side, and how many gifts of the Negative each is born with.
  enemies: 3,
  moreEvery: 8,
  negGifts: 1,
};
// Who leads each boss level of Chapter ???, the same way as ADVENTURE_BOSSES.
export const ABYSS_BOSSES = {
  5: { monster: 'mammoth', name: 'The Grey Shepherd', power: 1.1, moves: ['quake', 'regrow', 'tendrils', 'worldbreak'], passive: { regen: 0.01, lives: 1, text: 'Heals 1% every second, gets back up once, and keeps calling living shadows.' } },
  10: { monster: 'squid', name: 'The Eye That Opens Inward', power: 1.2, moves: ['mindswap', 'oblivion', 'inkcloud', 'hex'], passive: { unstoppable: true, nullField: true, text: 'Nothing stops it, and every 6 seconds nothing near it can use a move.' } },
  15: { monster: 'spider', name: 'Mother of Moths', power: 1.4, twin: 2, moves: ['webshot', 'tendrils', 'sting', 'devourstar'], passive: { absorb: 0.2, frenzy: 0.03, text: 'There are two of her. Each heals from what she deals and grows stronger with every hit.' } },
  20: { monster: 'dragon', name: 'The Inverted Dragon', power: 1, moves: ['prominence', 'devourstar', 'lastlight', 'endtime'], passive: { enrage: 1, reflect: 0.2, unstoppable: true, text: 'Nothing stops it, it throws 2% of every hit back, and below half its health it hits twice as hard.' } },
  25: {
    monster: 'behemoth', name: 'The Question', power: 0.9, moves: ['endtime', 'worldbreak', 'lastlight', 'oblivion', 'tendrils'],
    passive: { unstoppable: true, lives: 3, enrage: 1, aura: 0.25, auraRange: 240, nullField: true, reflect: 0.2, regen: 0.008, text: 'Every answer at once, and three more lives to give them with.' },
  },
};

// ---- The God Chapter: the true final chapter ----
// Opens once Chapter ??? is beaten. 10 levels past the end of Chapter ???, each GOD.grow times harder
// than the one before. Whatever lives here is void-touched like Chapter ???, and god-touched too
// (GOD_GUARD in data/ascension.js): anything without an awakened power barely scratches it, one
// awakened power lands about half, two or more in full. Awakening takes Ascension Stones from the
// Elite Negative. Beating the last level opens God Mode (core/god.js).
export const GOD_LEVELS = [
  { name: 'The Stair Up', text: 'Past the bottom of everything, a stair goes up. Something is coming down it.' },
  { name: 'The Antechamber', text: 'Every champion that ever ascended waits here to be tested again.' },
  { name: 'The Garden of First Things', text: 'The first tree, the first river, and the first fight.' },
  { name: 'The Hall of Requiems', text: 'Every Stand that was ever pierced twice still stands guard here.' },
  { name: 'The Herald', text: 'It announces God. It has never had to announce anyone twice.', boss: true },
  { name: 'The Speed of Thought', text: 'Nothing here moves. Everything here has already arrived.' },
  { name: 'The Awakened Sea', text: 'An ocean that ate a Devil Fruit, and woke up.' },
  { name: 'The Domain of Domains', text: 'Every domain ever expanded, folded up inside each other.' },
  { name: 'The Throne Room', text: 'The floor is made of every universe that was ever reset.' },
  { name: 'God', text: 'It made the first universe, and every one after it. Beat it, and you make the rest.', boss: true },
];
export const GOD = {
  // Starts at this share of how hard the end of Chapter ??? is, and each level is this many times
  // harder than the last. What lives here is stronger than anything in Chapter ??? to begin with, and
  // only awakened powers wound it, so even the first level is past the end of Chapter ???.
  start: 0.12,
  grow: 1.25,
  // How many fight on the other side, how many gifts of the Negative each is born with, and how many
  // of them come with an awakened power of their own.
  enemies: 3,
  moreEvery: 5,
  negGifts: 2,
  // The first win of level k pays gems * gemsGrow ** (k - 1), ore, and Ascension items.
  gems: 60000,
  gemsGrow: 1.6,
  ore: 300,
};
export const GOD_BOSSES = {
  5: {
    monster: 'behemoth', name: 'The Herald', power: 1.4, moves: ['endtime', 'lastlight', 'worldbreak', 'returntozero'],
    passive: { unstoppable: true, lives: 2, reflect: 0.25, regen: 0.008, horizon: true, text: 'Nothing stops it, even moves that never miss can miss it, it throws 2.5% of every hit back, slowly mends, and gets back up twice.' },
  },
  10: {
    monster: 'dragon', name: 'God', power: 2.2, moves: ['endtime', 'lastlight', 'worldbreak', 'returntozero', 'maximumtechnique', 'awakening', 'infinitemass'],
    passive: { unstoppable: true, lives: 4, enrage: 1, aura: 0.3, auraRange: 260, nullField: true, reflect: 0.25, regen: 0.01, horizon: true, absorb: 0.15, text: 'Every awakened power at once. Nothing stops it, nothing near it can use a move for long, everything near it withers, it throws 2.5% of every hit back, heals from what it deals, hits twice as hard below half its health, and gets back up four times.' },
  },
};
