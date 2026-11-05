// The village. Your three mains are out on your screen; every other creature lives in the village
// and works, by its job, for the pool everyone shares. From there they go on expeditions, and with
// hostile mode on, other villages raid yours. Only numbers here; the rules are in core/village.js.

// What one villager brings in each hour, by its first job, for a Grown one. Each stage smaller or
// bigger than Grown works a quarter less or more.
export const VILLAGE_WORK = {
  mine: { colors: 20, gems: 0.25 },
  farm: { store: 4, plants: 1.5 },
  battle: { guard: 2 },
  care: { boost: 0.15 },
  none: { colors: 6, store: 1 },
};
export const WORK_PER_STAGE = 0.25;
// Every nurse in the village makes everyone else work this much harder, up to the most.
export const MAX_CARE_BOOST = 0.45;
// While the game is closed, the village keeps working for this long at most.
export const VILLAGE_CATCHUP_HOURS = 8;

// Where expeditions go. `finds` is the chance the party comes home with a creature of that race.
// Every expedition also has a small chance of a Devil Fruit: see FRUIT_FROM_EXPEDITION in fruits.js.
export const EXPEDITIONS = {
  coast: { name: 'Along the coast', hours: 1, gems: [1, 3], finds: { fishman: 0.03 } },
  forest: { name: 'Through the deep forest', hours: 3, gems: [3, 7], finds: { mink: 0.03, tontatta: 0.02, longarm: 0.02, giant: 0.015 } },
  sea: { name: 'Across the open sea', hours: 6, gems: [6, 14], finds: { fishman: 0.04, giant: 0.03, mink: 0.03, lunarian: 0.01, devil: 0.015 } },
};
export const EXPEDITION_IDS = Object.keys(EXPEDITIONS);
export const PARTY_MAX = 3;
export const EXPEDITIONS_AT_ONCE = 3;
// A strong party brings back more: this many extra gems for every 100 power between them.
export const PARTY_GEMS_PER_100 = 1;

// Defending the village against waves. Your mains and this many of the strongest at home hold the
// line. A wave brings at most this many raiders. Past wave 12, every wave hits and lasts this much
// harder than the last. Each new best wave pays its number in gems, once.
export const WAVE_FROM_VILLAGE = 3;
export const WAVE_MAX_RAIDERS = 6;
export const WAVE_TOUGHER = 0.08;
export const WAVE_BOSS_EVERY = 5;

// Hostile mode. Off until you turn it on.
export const HOSTILE_VILLAGES = 3;
export const HOSTILE_NAMES = ['Redfang Camp', 'Mudwall Hold', 'Thornback Village', 'Saltmarsh Gang', 'Ashpeak Clan', 'Gloomhollow'];
// How strong each one starts, against your village's defence when hostile mode is turned on.
export const HOSTILE_START = [0.6, 0.9, 1.3];
export const HOSTILE_GROWTH_PER_DAY = 0.05;
// They only raid while the game is open, somewhere in this many hours after the last raid.
export const RAID_EVERY_HOURS = [1, 3];
// Losing a raid on your village costs this share of colors and food, and a few gems.
export const RAID_LOSS = { colors: 0.1, store: 0.15, gems: [1, 3] };
// Winning one, either way round, brings back this much.
export const RAID_LOOT = { gems: [2, 6], colors: [10, 40] };
// Beating a village knocks it back by this share.
export const RAID_KNOCKBACK = 0.2;
// After raiding someone, your raiders rest this long before they can go again.
export const RAID_REST_HOURS = 1;
