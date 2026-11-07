// The .creature file: creating it, feeding it, and deriving stats and colors from it.
// Pure logic with no DOM or Node APIs, so everything here can be tested headless.
// .creature files can come from other people, so sanitizeCreature() treats them as untrusted.

import { clamp, num, hashStr, makeRng, pick, mixHex, hexToRgb, hslToHex, rgbToHex, rgbToHsl, uid } from '../lib/util.js';
import { FOODS, FOOD_ORDER, SNACK, nutritionOf, essenceOf, fillOf } from '../data/foods.js';
import { MUTATIONS, MUTATION_THRESHOLDS, MAX_MUTATIONS, familyMutations, FAMILY_ABILITY } from '../data/mutations.js';
import { PATHS, ROOT_PATHS, TIER_XP, ABILITIES } from '../data/paths.js';
import { WEAPONS } from '../data/forge.js';
import { EXPANDER_SLOTS, MAX_EXPANDERS, MAX_SOUL_EXPANDERS } from '../data/items.js';
import {
  STANDS, STAND_IDS, STAND_WITS, QUIRKS, QUIRK_IDS, SPEEDSTER, SPEEDSTER_SPEED, MAX_HP_GIVEN,
  TECHNIQUES, TECHNIQUE_IDS, TECHNIQUE_MIGHT, POWER_SLOTS, POWER_KINDS, POWER_KIND_NAMES, LEGENDARY,
  TRAITS, BORN_TRAIT_IDS, TRAIT_ODDS, SIX_EYES_FAMILY, OFA_ID, ofaLevelFor, ofaStats, ofaLimitBonus, OFA_MOVES,
} from '../data/powers.js';
import { DEADLY_MONSTERS, LEGEND_IDS, TROPHY_POINTS } from '../data/monsters.js';
import { RACES, DEFAULT_RACE, RACE_PICTURES, RACE_BACKS, SKIN_MIX, WILD_RACES, RACE_FULL_SHARE, raceMovesOf } from '../data/races.js';
import { FRUITS, FRUIT_VIGOR } from '../data/fruits.js';
import { AWAKENINGS } from '../data/ascension.js';
import { STANCES, HURT_PLANS, TARGET_PLANS, defaultBattlePlan } from '../data/battle.js';
import { CHARMS, CHARM_SLOTS, PAINTS, CROP_IDS, BANK_KEYS, MAX_BANK, bankMax, familyOfBin } from '../data/crafting.js';
import { emptyBank, bankColor } from './craft.js';

export const FORMAT = 'creature/1';
export const STAT_KEYS = ['might', 'guard', 'speed', 'wits', 'vigor'];
export const STAT_LABELS = { might: 'Might', guard: 'Guard', speed: 'Speed', wits: 'Wits', vigor: 'Vigor' };

export const STAGES = [
  { name: 'Hatchling', at: 0,   scale: 0.8 },
  { name: 'Sprout',    at: 12,  scale: 0.92 },
  { name: 'Scrapper',  at: 40,  scale: 1.05 },
  { name: 'Grown',     at: 90,  scale: 1.18 },
  { name: 'Elder',     at: 180, scale: 1.3 },
];

// 12 hue bins. Which colors it mines shapes which stats it gets.
const HUE_BINS = 12;
export const HUE_STAT = ['might', 'might', 'speed', 'speed', 'vigor', 'vigor', 'guard', 'guard', 'guard', 'wits', 'wits', 'might'];

// No creature can be great at everything. Its best stat can reach the first number, its second
// best the next, and so on. The fourth limit sits just under what a Stand, a speedster or a cursed
// technique needs, so each of those takes a place in its top three stats.
export const STAT_LIMITS = [60, 45, 30, 18, 12];

// The most that work and training monsters can add to any one stat.
export const TRAINING_LIMIT = 10;

const MAX_ABSORBED = 200;
const MAX_REBIRTHS = 50;
const FULL_AT = 92;

export function newCreature(name, now = Date.now()) {
  const id = uid();
  const lineage = lineageFromId(id);
  return {
    format: FORMAT,
    id,
    name: cleanName(name) || 'Creature',
    born: now,
    lastSeen: now,
    growth: 0,
    fullness: 35,
    essence: Object.fromEntries(FOOD_ORDER.map((k) => [k, 0])),
    absorbed: [],
    mutations: [],
    // Limit Expanders it has used: each one makes room for more mutations (data/items.js).
    expanders: 0,
    palette: emptyPalette(),
    training: Object.fromEntries(STAT_KEYS.map((k) => [k, 0])),
    path: { line: [], xp: 0 },
    powers: { stand: null, speedster: false, technique: null, technique2: null, fruit: null, quirks: [] },
    // The kinds of its powers it has awakened with Ascension items: 'stand' (Requiem), 'speedster'
    // (True Speed), 'fruit' (Awakened) and 'technique' (Amplified). See data/ascension.js.
    awakened: [],
    // Its Legendary mutations, the oldest first. It holds one, and more with Legendary Expanders.
    souls: [],
    soulExpanders: 0,
    // Its family. The last name decides its cursed technique; the other side matters to a Cursed Body.
    lineage,
    otherLine: otherLineFromId(id, lineage),
    traits: bornWith(id, lineage),
    parents: [],
    bredAt: 0,
    ofa: null,
    // Once true, its bank, plants and food store are the ones all your creatures share (core/house.js).
    household: false,
    race: DEFAULT_RACE,
    heritage: null,
    pureBlood: false,
    // 'negative' for one that crossed over from the Negative Dimension (core/negative.js).
    origin: null,
    trophies: [],
    // The Legendary road monsters it has beaten (data/monsters.js). They give no trophy.
    legendWins: [],
    // A Legendary mutation it won while it already had one, waiting for you to take it or not.
    soulOffer: null,
    // Each time it was reborn: when, who it absorbed, and which of that one's gifts it took.
    rebirths: [],
    dead: null,
    battle: defaultBattlePlan(),
    bank: emptyBank(),
    look: { dye: null },
    gear: { owned: [], worn: [] },
    // The weapon it carries, from the household's armory (core/forge.js).
    weapon: null,
    prep: { paint: null },
    larder: Object.fromEntries(CROP_IDS.map((id) => [id, 0])),
    // Devil Fruits found and not eaten yet. Shared, like the larder, once it is in the household.
    fruits: {},
    record: { mined: 0, gems: 0, harvested: 0, duelsWon: 0, duelsLost: 0, arenaWins: 0, arenaLosses: 0, monstersBeaten: 0, monstersLost: 0, adventureWins: 0, adventureBest: 0, plantsEaten: 0 },
    farm: { fields: [], animals: [], store: 0, lastTick: now, wateredAt: 0, nextId: 1 },
  };
}

export function cleanName(name) {
  return String(name ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 24);
}

function emptyPalette() {
  return { hues: Array.from({ length: HUE_BINS }, () => ({ r: 0, g: 0, b: 0, n: 0 })), grey: 0, total: 0 };
}

// ---------- growth ----------

export function stageIndex(c) {
  let idx = 0;
  STAGES.forEach((s, i) => { if (c.growth >= s.at) idx = i; });
  return idx;
}
export const stageOf = (c) => STAGES[stageIndex(c)];

export function growthProgress(c) {
  const i = stageIndex(c);
  if (i === STAGES.length - 1) return 1;
  return clamp((c.growth - STAGES[i].at) / (STAGES[i + 1].at - STAGES[i].at), 0, 1);
}

export const isFull = (c) => c.fullness >= FULL_AT;

// Fullness drains over about 90 minutes. Creatures get grumpy but never die.
export function digestTime(c, seconds) {
  const rate = (100 / 5400) * (c.powers.speedster ? SPEEDSTER.hungerMul : 1);
  c.fullness = clamp(c.fullness - seconds * rate, 0, 100);
}

// ---------- eating ----------

// Simple food: free and always there. It fills it up and helps it grow, and never changes it.
// Returns what it did, or null if it is too full.
export function eatSnack(c) {
  if (isFull(c)) return null;
  const stageBefore = stageIndex(c);
  c.growth += SNACK.growth;
  c.fullness = clamp(c.fullness + SNACK.fullness, 0, 100);
  return { seen: false, nutrition: SNACK.growth, essence: 0, mutation: null, noRoom: false, stageUp: stageIndex(c) > stageBefore };
}

// Farmed food: the only food that grows mutations. sim/farm.js turns a plant into this.

// food: { ext, name, sha, size, snippet }
export function absorbFile(c, food, now = Date.now()) {
  const family = food.ext;
  if (!FOODS[family]) throw new Error('not food');
  const seen = c.absorbed.some((a) => a.sha === food.sha);
  const nutrition = nutritionOf(food.size) * (seen ? 0.5 : 1);
  const essence = seen ? 0 : essenceOf(food.size);
  const stageBefore = stageIndex(c);

  c.growth += nutrition;
  c.fullness = clamp(c.fullness + fillOf(food.size), 0, 100);
  c.essence[family] += essence;
  c.absorbed.push({ ext: family, name: String(food.name).slice(0, 60), sha: food.sha, size: food.size, at: now, snippet: String(food.snippet ?? '').slice(0, 200) });
  if (c.absorbed.length > MAX_ABSORBED) c.absorbed.shift();

  const noRoom = mutationsFull(c);
  const mutation = maybeMutate(c, family, food.sha, now);
  return { seen, nutrition, essence, mutation, noRoom, stageUp: stageIndex(c) > stageBefore };
}

// How many mutations it can hold, with any Limit Expanders it has used.
export const mutationCap = (c) => MAX_MUTATIONS + Math.min(MAX_EXPANDERS, c.expanders ?? 0) * EXPANDER_SLOTS;
export const mutationsFull = (c) => c.mutations.length >= mutationCap(c);

function maybeMutate(c, family, sha, now) {
  if (mutationsFull(c)) return null;
  const owned = c.mutations.filter((m) => MUTATIONS[m.id].family === family).length;
  if (owned >= MUTATION_THRESHOLDS.length || c.essence[family] < MUTATION_THRESHOLDS[owned]) return null;
  const free = familyMutations(family).filter((id) => !c.mutations.some((m) => m.id === id));
  if (!free.length) return null;
  const seed = parseInt(String(sha).slice(0, 8), 16) || hashStr(String(sha));
  const id = free[seed % free.length];
  const m = { id, from: sha ? String(sha).slice(0, 12) : '', at: now };
  c.mutations.push(m);
  return m;
}

// ---------- colors ----------

export function addColor(c, r, g, b, units) {
  const [h, s, l] = rgbToHsl(r, g, b);
  const pal = c.palette;
  pal.total += units;
  if (s < 0.14 || l < 0.08 || l > 0.94) {
    pal.grey += units;
    c.bank.dust = clamp(c.bank.dust + units, 0, MAX_BANK);
    return { grey: true, hue: h };
  }
  const bin = Math.floor(h / 30) % HUE_BINS;
  bankColor(c, bin, units);
  const slot = pal.hues[bin];
  const n = slot.n + units;
  slot.r = (slot.r * slot.n + r * units) / n;
  slot.g = (slot.g * slot.n + g * units) / n;
  slot.b = (slot.b * slot.n + b * units) / n;
  slot.n = n;
  return { grey: false, hue: h, bin };
}

// Colors it has mined the most, biggest first.
export function topSwatches(c, count = 6) {
  return c.palette.hues
    .filter((h) => h.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, count)
    .map((h) => ({ hex: rgbToHex(h.r, h.g, h.b), n: h.n }));
}

// Screen colors can be muddy. Keep the hue, but always wear it clean and bright.
export function wearable(hex) {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  return hslToHex(h, clamp(s * 1.2, 0.55, 0.92), clamp(l, 0.56, 0.76));
}

export function creatureColors(c) {
  const WHITE = '#fbfaf6';
  const swatches = topSwatches(c, 2).map((s) => ({ ...s, hex: wearable(s.hex) }));
  // Before it has mined anything, it takes a faint tint from what it has eaten.
  const topFood = FOOD_ORDER.slice().sort((a, b) => c.essence[b] - c.essence[a])[0];
  const foodTint = c.essence[topFood] > 0 ? FOODS[topFood].color : null;
  const coloured = c.palette.hues.reduce((sum, h) => sum + h.n, 0);
  let body = WHITE;
  if (foodTint) body = mixHex(body, foodTint, clamp(c.essence[topFood] / 24, 0.08, 0.32));
  if (swatches.length) body = mixHex(body, swatches[0].hex, clamp(coloured / 300, 0.15, 0.92));
  const accent = swatches[1]?.hex ?? swatches[0]?.hex ?? foodTint ?? '#ff6b5e';
  // Some races have a skin of their own, which shades whatever colors it wears.
  const skins = fullRaces(c).filter((race) => race.skin);
  skins.forEach((race) => { body = mixHex(body, race.skin, SKIN_MIX / skins.length); });
  // A dye from the workshop covers all of that, until it is washed off.
  return { body: c.look.dye ?? body, accent, tinted: !!c.look.dye || !!foodTint || swatches.length > 0 || skins.length > 0 };
}

// ---------- stats ----------

export function pathNodes(c) {
  return c.path.line.map((id) => PATHS[id]).filter(Boolean);
}

// Where every point of every stat comes from, before limits. The training guide shows this
// same table, so it can't disagree with the real numbers.
export function statSources(c) {
  const table = () => Object.fromEntries(STAT_KEYS.map((k) => [k, 0]));
  const add = (into, stats) => Object.entries(stats ?? {}).forEach(([k, v]) => { into[k] += v; });
  const sources = { start: table(), age: table(), race: table(), training: table(), mutations: table(), food: table(), colors: table(), job: table(), powers: table(), charms: table(), trophies: table() };
  const stage = stageIndex(c);
  STAT_KEYS.forEach((k) => {
    sources.start[k] = 3;
    sources.age[k] = stage * 2;
    sources.training[k] = Math.min(TRAINING_LIMIT, Math.floor(c.training[k] ?? 0));
  });
  add(sources.race, raceStats(c));
  c.mutations.forEach((m) => add(sources.mutations, MUTATIONS[m.id]?.stats));
  FOOD_ORDER.forEach((fam) => {
    const stat = FOODS[fam].stat;
    if (stat) sources.food[stat] += Math.floor(c.essence[fam] * 0.25);
  });
  c.palette.hues.forEach((h, i) => {
    if (h.n > 0) sources.colors[HUE_STAT[i]] += Math.floor(Math.sqrt(h.n) / 4);
  });
  pathNodes(c).forEach((node) => add(sources.job, node.stats));
  powerDefs(c).forEach((def) => add(sources.powers, def.stats));
  c.gear.worn.forEach((id) => add(sources.charms, CHARMS[id].stats));
  c.trophies.forEach((id) => { sources.trophies[DEADLY_MONSTERS[id].trophy] += TROPHY_POINTS; });
  return sources;
}

export function rawStats(c) {
  const sources = Object.values(statSources(c));
  return Object.fromEntries(STAT_KEYS.map((k) => [k, sources.reduce((sum, table) => sum + table[k], 0)]));
}

// Each stat's limit right now, from where it ranks against the others. A trophy adds to its own
// stat's limit wherever that stat ranks.
export function statLimits(c, raw = rawStats(c)) {
  const ranked = STAT_KEYS.slice().sort((a, b) => raw[b] - raw[a] || STAT_KEYS.indexOf(a) - STAT_KEYS.indexOf(b));
  const limits = {};
  ranked.forEach((k, rank) => { limits[k] = STAT_LIMITS[rank]; });
  c.trophies.forEach((id) => { limits[DEADLY_MONSTERS[id].trophy] += TROPHY_POINTS; });
  const level = ofaLevel(c);
  if (level) Object.entries(ofaLimitBonus(level)).forEach(([k, v]) => { limits[k] += v; });
  // An awakened power lifts every limit.
  const lift = awakenedKinds(c).reduce((sum, kind) => sum + AWAKENINGS[kind].limits, 0);
  if (lift) STAT_KEYS.forEach((k) => { limits[k] += lift; });
  return limits;
}

export function computeStats(c) {
  const raw = rawStats(c);
  const limits = statLimits(c, raw);
  return Object.fromEntries(STAT_KEYS.map((k) => [k, clamp(Math.round(raw[k]), 1, limits[k])]));
}

// Its Stand, its speedster powers, its techniques and its Quirks, whichever it has.
function powerDefs(c) {
  const { stand, speedster, technique, technique2, fruit, quirks } = c.powers;
  const level = ofaLevel(c);
  return [
    stand && STANDS[stand], speedster && SPEEDSTER, technique && TECHNIQUES[technique], technique2 && TECHNIQUES[technique2], fruit && FRUITS[fruit], ...c.souls.map((id) => LEGENDARY[id]),
    ...quirks.map((id) => (id === OFA_ID ? { ...QUIRKS[id], stats: ofaStats(level) } : QUIRKS[id])),
    ...awakenedKinds(c).map((kind) => AWAKENINGS[kind]),
  ].filter(Boolean);
}

// ---------- awakened powers ----------

// The kinds of power it has awakened, and still has. A power it no longer holds can't stay awakened.
export const awakenedKinds = (c) => (c.awakened ?? []).filter((kind) => Object.hasOwn(AWAKENINGS, kind) && !!c.powers?.[kind]);
export const isAwakened = (c, kind) => awakenedKinds(c).includes(kind);

// The moves each kind of power it holds brings, for an awakening to make stronger.
function powerMoves(c, kind) {
  const { stand, technique, technique2, fruit } = c.powers;
  if (kind === 'stand') return stand ? STANDS[stand].moves : [];
  if (kind === 'speedster') return c.powers.speedster ? [SPEEDSTER.move] : [];
  if (kind === 'technique') return [technique && TECHNIQUES[technique].moves, technique2 && TECHNIQUES[technique2].moves].filter(Boolean).flat();
  if (kind === 'fruit') return fruit ? FRUITS[fruit].moves : [];
  return [];
}

// How much harder each of its moves hits because its power is awakened: { moveId: times }.
export function awakenBoost(c) {
  const out = {};
  for (const kind of awakenedKinds(c)) powerMoves(c, kind).forEach((id) => { out[id] = Math.max(out[id] ?? 1, AWAKENINGS[kind].movePower); });
  return out;
}

// How much bigger its race is drawn, in the ring too. Only Giants are.
// ---------- race ----------
// Its heritage: which races it is, in quarters. Most are all one race. A bred mix can be half one and
// half another, or down to quarters. Each race gives its share of its bonuses, only a half or more
// brings its move, and a pure-blooded mix gets every race in it at full power.
// Old saves only say `race`, and a Half-devil from before mixing is half Devil, half Human.
const fromRace = (id) => (id === 'halfdevil' ? { devil: 0.5, [DEFAULT_RACE]: 0.5 } : { [Object.hasOwn(RACES, id) ? id : DEFAULT_RACE]: 1 });
export const heritageOf = (c) => c.heritage ?? fromRace(c.race);
export const raceParts = (c) => Object.entries(heritageOf(c)).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
const raceShare = (c, share) => (c.pureBlood ? 1 : share);

export function raceStats(c) {
  const out = {};
  for (const [id, share] of raceParts(c)) {
    for (const [k, v] of Object.entries(RACES[id].stats ?? {})) out[k] = (out[k] ?? 0) + v * raceShare(c, share);
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Math.round(v)]).filter(([, v]) => v));
}

// A race brings its moves at half or more. Less than all Devil makes a Half-devil's move instead.
export function raceMoves(c) {
  return raceParts(c)
    .filter(([id, share]) => raceMovesOf(id).length && (c.pureBlood || share >= 0.5))
    .flatMap(([id, share]) => (id === 'devil' && share < 1 && !c.pureBlood ? [RACES.halfdevil.move] : raceMovesOf(id)));
}

// How much of it is from the Negative Dimension, from 0 to 1. A Pure-blood with any Negative race in
// it counts as all of it. Only Negative blood can wound what lives in Chapter ???.
export function negativeShare(c) {
  const parts = raceParts(c).filter(([id]) => RACES[id].negative);
  if (!parts.length) return 0;
  return c.pureBlood ? 1 : Math.min(1, parts.reduce((s, [, share]) => s + share, 0));
}

export const raceSize = (c) => raceParts(c).reduce((m, [id, share]) => m * (1 + ((RACES[id].size ?? 1) - 1) * raceShare(c, share)), 1);

// The races it is enough of to have their passive and specialty: half or more, or pure-blooded.
const fullRaces = (c) => raceParts(c).filter(([, share]) => c.pureBlood || share >= RACE_FULL_SHARE).map(([id]) => RACES[id]);

// What a passive can hold, everywhere: races, Legendary mutations, gifts of the Negative, classes,
// Nen and bosses all use these, and sim/arena.js makes each one work.
//   taken, hp, dodge, crit, speed, reach, feast   as they always were
//   absorb      heals this share of all the damage it deals
//   reflect     this share of every hit it takes goes back to whoever landed it (a tenth of that
//               from whatever your creatures fight: FOE_REFLECT in data/battle.js)
//   regen       heals this share of its max HP every second
//   echo        each move it uses has this chance to go off twice
//   execute     this much more damage against anything below half its health
//   frenzy      each hit it lands adds this much damage for the rest of the fight, up to 60%
//   evolve      once below 30% health: back to full, and this much harder hits from then on
//   lives       this many times it gets back up with half its health
//   critMul     critical hits land this much harder on top of twice
//   cooldown    its moves come back this much sooner
//   damage      everything it does lands this much harder
//   monsterDmg  this much more damage against monsters
//   aura        everything on the other side within auraRange takes this share of its hit every second
//   decay       every hit it lands leaves them hurting: this share of its hit a second, for 3 seconds
//   enrage      below half its health it hits this much harder, and swings faster
//   twice       this share of its swings land twice
//   poisonproof, unstoppable (no stun, confusion or silence), horizon (even sure hits can miss it),
//   nullField (every 6 seconds, silences what is near it)   yes or no
//   nullSilence a Null Field silences for this many seconds longer
const PASSIVE_FLAGS = new Set(['poisonproof', 'unstoppable', 'horizon', 'nullField']);
export const emptyPassive = () => ({
  taken: 0, hp: 0, dodge: 0, crit: 0, speed: 0, reach: 0, poisonproof: false, feast: 0, absorb: 0, reflect: 0, regen: 0, unstoppable: false,
  echo: 0, execute: 0, frenzy: 0, evolve: 0, lives: 0, critMul: 0, cooldown: 0, damage: 0, monsterDmg: 0, aura: 0, auraRange: 0, nullField: false,
  decay: 0, enrage: 0, horizon: false, twice: 0, nullSilence: 0,
});

export function addPassive(out, passive) {
  for (const [k, v] of Object.entries(passive ?? {})) {
    if (k === 'text') continue;
    if (PASSIVE_FLAGS.has(k)) out[k] = out[k] || !!v;
    else if (k === 'auraRange') out[k] = Math.max(out[k] ?? 0, v);
    else out[k] = (out[k] ?? 0) + v;
  }
  return out;
}

// What its races do for it in a fight, all added together.
export function racePassive(c) {
  const out = emptyPassive();
  for (const race of fullRaces(c)) addPassive(out, race.passive);
  return out;
}

// Its races, its Legendary mutations, its gifts of the Negative and its awakened powers, together:
// everything that works in every fight.
export function fightPassive(c) {
  const out = racePassive(c);
  c.souls.forEach((id) => addPassive(out, LEGENDARY[id].passive));
  (c.traits ?? []).forEach((id) => addPassive(out, TRAITS[id]?.passive));
  awakenedKinds(c).forEach((kind) => addPassive(out, AWAKENINGS[kind].passive));
  return out;
}

// What its races do for it at home in the village, all added together.
export function raceVillage(c) {
  const out = { work: 0, colors: 0, gems: 0, gemsFlat: 0, food: 0, farm: 0, expedition: 0, expeditionGems: 0, finds: 0 };
  for (const race of fullRaces(c)) {
    for (const [k, v] of Object.entries(race.village ?? {})) if (k !== 'text') out[k] += v;
  }
  return out;
}

const SHARE_WORDS = { 0.75: 'Three-quarter', 0.5: 'Half', 0.25: 'Quarter' };
export function raceName(c) {
  const parts = raceParts(c);
  const others = parts.filter(([id]) => id !== DEFAULT_RACE);
  if (!others.length) return RACES[DEFAULT_RACE].name;
  if (parts.length === 1) return RACES[parts[0][0]].name;
  if (c.pureBlood) return `Pure-blood ${others.map(([id]) => RACES[id].name).join('-')}`;
  return others.map(([id, share]) => `${SHARE_WORDS[share] ?? 'Part'}-${RACES[id].name}`).join(' ');
}

// The race pictures it wears: every race it is at least half of.
const racesShown = (c) => raceParts(c)
  .filter(([id, share]) => c.pureBlood || share >= 0.5)
  .map(([id, share]) => (id === 'devil' && share < 1 && !c.pureBlood ? 'halfdevil' : id));
export const racePictures = (c) => racesShown(c).filter((id) => RACE_PICTURES.includes(id));

// The races it shows with a picture behind the body, like a Lunarian's wings or a Pillar Man's pillar.
export const raceBackPictures = (c) => racesShown(c).filter((id) => RACE_BACKS.includes(id));

// One For All's level, from its stockpile. 0 if it doesn't hold it.
export const ofaLevel = (c) => (c.powers.quirks.includes(OFA_ID) ? ofaLevelFor(c.ofa?.stockpile ?? 0) : 0);

// The full-health number shown in the menu and used in the arena. Every Quirk it holds has
// taken its share out of this for good, so the price can't be left out of a .creature file.
export function maxHpOf(c, stats = computeStats(c)) {
  return Math.round(hpFromStats(stats) * (1 - hpGivenUp(c) / 100));
}

export const hpFromStats = (s) => (55 + s.vigor * 6 + s.guard * 2) * 3.2;

export const hpGivenUp = (c) => c.powers.quirks.reduce((sum, id) => sum + QUIRKS[id].cost, 0);

// ---------- powers ----------

// Wits are the price of entry for every Stand, so they count for less when reading its soul.
export function soulLean(c) {
  const s = computeStats(c);
  const weight = (k) => s[k] * (k === 'wits' ? 0.7 : 1);
  return STAT_KEYS.slice().sort((a, b) => weight(b) - weight(a))[0];
}

// The Stand this creature would get right now. The same creature always gets the same one
// from the same lean, and what it leans on is the only part anyone can steer.
export function standFor(c) {
  const lean = soulLean(c);
  const options = STAND_IDS.filter((id) => STANDS[id].lean === lean);
  return options[hashStr(c.id) % options.length];
}

// Everyone is born into a family. Only gems change it (changeFamily in core/family.js). Its last name decides its cursed technique.
// A bred creature takes the last name its breeder chose; any other gets one from its egg.
export function lineageFromId(id) {
  return TECHNIQUE_IDS[hashStr(`${id}:lineage`) % TECHNIQUE_IDS.length];
}

// The other side of its family. Only a Cursed Body can use that side's technique.
export function otherLineFromId(id, lineage) {
  const others = TECHNIQUE_IDS.filter((t) => t !== lineage);
  return others[hashStr(`${id}:other side`) % others.length];
}

// A number from 0 to 1 that is always the same for this egg and this question. The raw hash gets
// mixed first: its low bits alone line up between questions, which once meant some families could
// never hatch with some gifts, and Sharingan and Cursed Body never came together.
export const eggRoll = (id, question) => makeRng(hashStr(`${id}:${question}`))();

// What it hatched with. The same egg always hatches with the same gifts.
export function bornWith(id, lineage) {
  return BORN_TRAIT_IDS.filter((t) => (t !== 'sixeyes' || lineage === SIX_EYES_FAMILY) && eggRoll(id, t) < 1 / TRAIT_ODDS[t]);
}

export const lineageOf = (c) => c.lineage ?? lineageFromId(c.id);
export const otherLineOf = (c) => c.otherLine ?? otherLineFromId(c.id, lineageOf(c));
export const lastName = (c) => TECHNIQUES[lineageOf(c)].family;
export const fullName = (c) => `${c.name} ${lastName(c)}`;
export const hasTrait = (c, id) => (c.traits ?? []).includes(id);

// A Stand, speedster powers, a cursed technique and a Devil Fruit each take a slot. It has
// POWER_SLOTS basic slots, which take any of them, and each Legendary mutation adds one more, which
// takes only what its soul says (`slot` in data/powers.js).
export const powersHeld = (c) => [c.powers.stand, c.powers.speedster, c.powers.technique, c.powers.fruit].filter(Boolean).length;

// How many Legendary mutations it can hold: one, and one more for each Legendary Expander.
export const soulCap = (c) => 1 + Math.min(MAX_SOUL_EXPANDERS, c.soulExpanders ?? 0);

// Its slots, in order: the basic ones, then one for each Legendary mutation.
const slotsOf = (souls) => [
  ...Array.from({ length: POWER_SLOTS }, () => ({ soul: null, takes: POWER_KINDS })),
  ...souls.map((id) => ({ soul: id, takes: LEGENDARY[id]?.slot ?? POWER_KINDS })),
];

// Which slot each of these powers sits in (an index into slotsOf), or null if they can't all have
// one. There are only ever a few, so it just tries every way. The narrowest slots are tried first,
// so whatever is left free takes the most.
function placeIn(kinds, slots) {
  if (kinds.length > slots.length) return null;
  const order = slots.map((_, i) => i).sort((a, b) => slots[a].takes.length - slots[b].takes.length);
  const at = [];
  const used = new Set();
  const place = (i) => {
    if (i === kinds.length) return true;
    for (const s of order) {
      if (used.has(s) || !slots[s].takes.includes(kinds[i])) continue;
      used.add(s);
      at[i] = s;
      if (place(i + 1)) return true;
      used.delete(s);
    }
    return false;
  };
  return place(0) ? at : null;
}
const fits = (kinds, souls) => placeIn(kinds, slotsOf(souls)) !== null;
const heldKinds = (powers) => POWER_KINDS.filter((k) => powers[k]);

export const powerSlots = (c) => slotsOf(c.souls).length;
export const hasPowerRoom = (c) => powersHeld(c) < powerSlots(c);

// Every slot it has: where it comes from (a soul's id, or null for a basic one), what it takes, and
// which power sits in it (null while it is free).
export function slotPlan(c) {
  const slots = slotsOf(c.souls);
  const kinds = heldKinds(c.powers);
  const at = placeIn(kinds, slots) ?? [];
  return slots.map((slot, s) => ({ ...slot, holds: kinds[at.indexOf(s)] ?? null }));
}

// Whether a set of powers has room for this one, under the souls it has.
function roomFor(powers, souls, kind) {
  const held = heldKinds(powers);
  return !held.includes(kind) && fits([...held, kind], souls);
}

export const hasRoomFor = (c, kind) => roomFor(c.powers, c.souls, kind);

// Whether everything it holds now would still fit under these Legendary mutations.
export const fitsSouls = (c, souls) => fits(heldKinds(c.powers), souls);

// What a slot takes, in words: "any power", or "a Stand", or "speedster powers or a cursed technique".
export const slotTakes = (takes) => (takes.length === POWER_KINDS.length ? 'any power' : takes.map((k) => POWER_KIND_NAMES[k]).join(' or '));

// Why it has no room for this kind of power, or null if it has.
export function roomProblem(c, kind) {
  if (heldKinds(c.powers).includes(kind)) return 'It already has it';
  if (hasRoomFor(c, kind)) return null;
  if (powersHeld(c) >= powerSlots(c)) {
    return c.souls.length ? `All ${powerSlots(c)} of its slots are full` : 'Its one slot already holds a power. Each Legendary mutation adds a slot';
  }
  const free = slotPlan(c).filter((s) => !s.holds);
  return `Its free slot${free.length > 1 ? 's only take' : ' only takes'} ${slotTakes([...new Set(free.flatMap((s) => s.takes))])}`;
}

export const canAwakenStand = (c) => hasRoomFor(c, 'stand') && computeStats(c).wits >= STAND_WITS;
export const canBecomeSpeedster = (c) => hasRoomFor(c, 'speedster') && computeStats(c).speed >= SPEEDSTER_SPEED;
export const canLearnTechnique = (c) => hasRoomFor(c, 'technique') && computeStats(c).might >= TECHNIQUE_MIGHT;
// A Cursed Body can also awaken the other side of its family's technique, once it has its own.
// It shares its first technique's place, so it never needs a Legendary mutation.
export const canLearnSecondTechnique = (c) => hasTrait(c, 'cursedbody') && !!c.powers.technique && !c.powers.technique2
  && otherLineOf(c) !== c.powers.technique && computeStats(c).might >= TECHNIQUE_MIGHT;
export const powerReady = (c) => canAwakenStand(c) || canBecomeSpeedster(c) || canLearnTechnique(c) || canLearnSecondTechnique(c);

export function awakenStand(c) {
  if (!canAwakenStand(c)) return null;
  c.powers.stand = standFor(c);
  return c.powers.stand;
}

export function becomeSpeedster(c) {
  if (!canBecomeSpeedster(c)) return false;
  c.powers.speedster = true;
  return true;
}

export function learnTechnique(c) {
  if (!canLearnTechnique(c)) return false;
  c.powers.technique = lineageOf(c);
  return true;
}

export function learnSecondTechnique(c) {
  if (!canLearnSecondTechnique(c)) return false;
  c.powers.technique2 = otherLineOf(c);
  return true;
}

// A Devil Fruit needs its Vigor and a free slot that takes one, like any other power. It is for good.
export const fruitProblem = (c) => {
  if (c.powers.fruit) return 'It has already eaten one';
  const room = roomProblem(c, 'fruit');
  if (room) return room;
  if (computeStats(c).vigor < FRUIT_VIGOR) return `It needs ${FRUIT_VIGOR} Vigor`;
  return null;
};
export function eatFruit(c, id) {
  if (!Object.hasOwn(FRUITS, id) || fruitProblem(c)) return false;
  c.powers.fruit = id;
  return true;
}

export const canGainQuirk = (c, id) => Object.hasOwn(QUIRKS, id)
  && !c.powers.quirks.includes(id)
  && hpGivenUp(c) + QUIRKS[id].cost <= MAX_HP_GIVEN;

export function gainQuirk(c, id) {
  if (!canGainQuirk(c, id)) return false;
  c.powers.quirks.push(id);
  // Bought fresh, One For All starts a new line with nothing stockpiled.
  if (id === OFA_ID) c.ofa = { stockpile: 0, holders: [] };
  return true;
}

// A Stand's chart, read from the stats that actually run its fights. Potential is the one
// that falls: a Stand has the most room to grow in a young creature.
export function standCard(c) {
  const s = computeStats(c);
  const grade = (v) => 'EDCBA'[clamp(Math.floor((v - 4) / 8), 0, 4)];
  return [
    ['Power', grade(s.might)],
    ['Speed', grade(s.speed)],
    ['Range', grade(s.wits)],
    ['Durability', grade(s.guard)],
    ['Precision', grade((s.wits + s.speed) / 2)],
    ['Potential', 'ABCDE'[stageIndex(c)]],
  ];
}

export const powerOf = (c) => {
  const s = computeStats(c);
  return STAT_KEYS.reduce((sum, k) => sum + s[k], 0);
};

export function perksOf(c) {
  const p = { gemChance: 0, mineSpeed: 0, growRate: 0, breedRate: 0, animalCap: 0, fieldCap: 0, duelXp: 0, duelSkill: 0, carePicks: 0, careSave: 0, hatchGrowth: 0 };
  pathNodes(c).forEach((node) => {
    Object.entries(node.perk ?? {}).forEach(([k, v]) => { p[k] = (p[k] ?? 0) + v; });
  });
  if (c.powers.speedster) p.mineSpeed += SPEEDSTER.mineSpeed;
  return p;
}

// Every arena move it knows, and where it got each one.
export function movesOf(c) {
  const list = [];
  raceMoves(c).forEach((id) => list.push({ id, from: `Being ${raceName(c)}` }));
  FOOD_ORDER.forEach((fam) => {
    const owned = c.mutations.filter((m) => MUTATIONS[m.id].family === fam).length;
    if (owned >= 2) list.push({ id: FAMILY_ABILITY[fam], from: `2 or more ${FOODS[fam].label} mutations` });
  });
  const fin = pathNodes(c).find((n) => n.ability);
  if (fin) list.push({ id: fin.ability, from: fin.name });
  if (c.powers.stand) STANDS[c.powers.stand].moves.forEach((id) => list.push({ id, from: STANDS[c.powers.stand].name }));
  if (c.powers.speedster) list.push({ id: SPEEDSTER.move, from: 'Being a speedster' });
  if (c.powers.technique) TECHNIQUES[c.powers.technique].moves.forEach((id) => list.push({ id, from: TECHNIQUES[c.powers.technique].name }));
  if (c.powers.technique2) TECHNIQUES[c.powers.technique2].moves.forEach((id) => list.push({ id, from: `${TECHNIQUES[c.powers.technique2].name} (Cursed Body)` }));
  if (c.powers.fruit) FRUITS[c.powers.fruit].moves.forEach((id) => list.push({ id, from: FRUITS[c.powers.fruit].name }));
  c.souls.filter((id) => LEGENDARY[id]?.move).forEach((id) => list.push({ id: LEGENDARY[id].move, from: LEGENDARY[id].name }));
  (c.traits ?? []).filter((id) => TRAITS[id]?.move).forEach((id) => list.push({ id: TRAITS[id].move, from: TRAITS[id].name }));
  awakenedKinds(c).forEach((kind) => list.push({ id: AWAKENINGS[kind].move, from: AWAKENINGS[kind].name }));
  const level = ofaLevel(c);
  c.powers.quirks.forEach((id) => {
    if (id !== OFA_ID) {
      list.push({ id: QUIRKS[id].move, from: QUIRKS[id].name });
      return;
    }
    OFA_MOVES.filter(([, at]) => at <= level).forEach(([move, at]) => list.push({ id: move, from: at > 1 ? `One For All, level ${at}` : 'One For All' }));
  });
  return list;
}

export const abilitiesOf = (c) => movesOf(c).map((m) => m.id);

// ---------- path ----------

export function pathChoice(c) {
  const { line, xp } = c.path;
  if (line.length === 0) return stageIndex(c) >= 1 ? ROOT_PATHS : null;
  if (line.length === 1 && xp >= TIER_XP[2]) return PATHS[line[0]].kids;
  if (line.length === 2 && xp >= TIER_XP[3]) return PATHS[line[1]].kids;
  return null;
}

export function choosePath(c, id) {
  const options = pathChoice(c);
  if (!options || !options.includes(id)) return false;
  c.path.line.push(id);
  return true;
}

export const isFinalForm = (c) => c.path.line.length === 3;

export function pathTitle(c) {
  const nodes = pathNodes(c);
  return nodes.length ? nodes[nodes.length - 1].name : 'No job yet';
}

export function nextTierProgress(c) {
  const { line, xp } = c.path;
  if (line.length === 1) return { at: TIER_XP[2], xp };
  if (line.length === 2) return { at: TIER_XP[3], xp };
  return null;
}

// Only the creature's chosen path levels up its job. Other jobs still give a little training.
export function addActivityXp(c, activity, amount, stat = null) {
  const root = PATHS[c.path.line[0]];
  const onPath = root?.activity === activity;
  if (onPath) c.path.xp += amount;
  if (stat) c.training[stat] = clamp((c.training[stat] ?? 0) + amount * (onPath ? 0.02 : 0.008), 0, 40);
  c.growth += amount * 0.06;
}

// ---------- untrusted input ----------

const safeStr = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max);
const safeNum = (v, lo, hi, d = 0) => clamp(num(v, d), lo, hi);

function validLine(line) {
  if (!Array.isArray(line)) return [];
  const out = [];
  for (const id of line) {
    if (typeof id !== 'string' || !Object.hasOwn(PATHS, id)) break;
    const node = PATHS[id];
    const parent = out[out.length - 1];
    if (out.length === 0 ? node.tier !== 1 : node.parent !== parent) break;
    out.push(id);
    if (out.length === 3) break;
  }
  return out;
}

export function sanitizeCreature(raw, now = Date.now()) {
  if (!raw || typeof raw !== 'object' || typeof raw.format !== 'string' || !raw.format.startsWith('creature/')) {
    throw new Error('Not a .creature file');
  }
  const c = newCreature(raw.name, now);
  c.name = cleanName(raw.name) || 'Nameless';
  c.id = safeStr(raw.id, 64).replace(/[^a-zA-Z0-9_-]/g, '') || c.id;
  // A save from before families were written down keeps the one its id always gave it.
  c.lineage = typeof raw.lineage === 'string' && Object.hasOwn(TECHNIQUES, raw.lineage) ? raw.lineage : lineageFromId(c.id);
  c.otherLine = typeof raw.otherLine === 'string' && Object.hasOwn(TECHNIQUES, raw.otherLine) && raw.otherLine !== c.lineage ? raw.otherLine : otherLineFromId(c.id, c.lineage);
  // The same goes for gifts: an older save gets the ones its egg always had.
  c.traits = Array.isArray(raw.traits) ? [...new Set(raw.traits)].filter((t) => typeof t === 'string' && Object.hasOwn(TRAITS, t)) : bornWith(c.id, c.lineage);
  c.parents = Array.isArray(raw.parents)
    ? raw.parents.slice(0, 2).filter((p) => p && typeof p === 'object').map((p) => ({ id: safeStr(p.id, 64).replace(/[^a-zA-Z0-9_-]/g, ''), name: safeStr(p.name, 60) }))
    : [];
  c.born = safeNum(raw.born, 0, now, now);
  c.lastSeen = safeNum(raw.lastSeen, 0, now, now);
  c.growth = safeNum(raw.growth, 0, 5000);
  c.fullness = safeNum(raw.fullness, 0, 100, 35);
  FOOD_ORDER.forEach((k) => { c.essence[k] = safeNum(raw.essence?.[k], 0, 500); });
  STAT_KEYS.forEach((k) => { c.training[k] = safeNum(raw.training?.[k], 0, 40); });

  if (Array.isArray(raw.absorbed)) {
    c.absorbed = raw.absorbed.slice(-MAX_ABSORBED).filter((a) => a && Object.hasOwn(FOODS, a.ext)).map((a) => ({
      ext: a.ext,
      name: safeStr(a.name, 60),
      sha: safeStr(a.sha, 64).replace(/[^a-fA-F0-9]/g, ''),
      size: safeNum(a.size, 0, 1024 * 1024),
      at: safeNum(a.at, 0, now),
      snippet: safeStr(a.snippet, 200),
    }));
  }
  c.expanders = Math.floor(safeNum(raw.expanders, 0, MAX_EXPANDERS));
  if (Array.isArray(raw.mutations)) {
    const seen = new Set();
    for (const m of raw.mutations) {
      if (seen.size >= mutationCap(c)) break;
      if (!m || typeof m.id !== 'string' || !Object.hasOwn(MUTATIONS, m.id) || seen.has(m.id)) continue;
      seen.add(m.id);
      c.mutations.push({ id: m.id, from: safeStr(m.from, 12), at: safeNum(m.at, 0, now) });
    }
  }
  if (raw.palette && Array.isArray(raw.palette.hues)) {
    for (let i = 0; i < HUE_BINS; i++) {
      const h = raw.palette.hues[i];
      if (!h) continue;
      c.palette.hues[i] = { r: safeNum(h.r, 0, 255), g: safeNum(h.g, 0, 255), b: safeNum(h.b, 0, 255), n: safeNum(h.n, 0, 100000) };
    }
    c.palette.grey = safeNum(raw.palette.grey, 0, 1e6);
    c.palette.total = safeNum(raw.palette.total, 0, 2e6);
  }
  c.path.line = validLine(raw.path?.line);
  c.path.xp = safeNum(raw.path?.xp, 0, 100000);
  c.soulExpanders = Math.floor(safeNum(raw.soulExpanders, 0, MAX_SOUL_EXPANDERS));
  // Saves from before a creature could hold more than one say `legendary` instead.
  const souls = Array.isArray(raw.souls) ? raw.souls : typeof raw.legendary === 'string' ? [raw.legendary] : [];
  c.souls = [...new Set(souls)].filter((id) => typeof id === 'string' && Object.hasOwn(LEGENDARY, id)).slice(0, soulCap(c));
  c.bredAt = safeNum(raw.bredAt, 0, now);
  c.household = raw.household === true;
  c.race = typeof raw.race === 'string' && Object.hasOwn(RACES, raw.race) ? raw.race : DEFAULT_RACE;
  // A mix has to be in quarters that add up to a whole creature, or it is read as its main race.
  if (raw.heritage && typeof raw.heritage === 'object') {
    const parts = Object.entries(raw.heritage).filter(([id, s]) => Object.hasOwn(RACES, id) && id !== 'halfdevil' && [0.25, 0.5, 0.75, 1].includes(s));
    if (parts.length && Math.abs(parts.reduce((n, [, s]) => n + s, 0) - 1) < 1e-9) c.heritage = Object.fromEntries(parts);
  }
  c.pureBlood = raw.pureBlood === true;
  c.origin = raw.origin === 'negative' ? 'negative' : null;
  c.powers = sanitizePowers(raw.powers, c);
  // A power can only be awakened while it has that power.
  c.awakened = Array.isArray(raw.awakened) ? [...new Set(raw.awakened)].filter((kind) => typeof kind === 'string' && Object.hasOwn(AWAKENINGS, kind) && !!c.powers[kind]) : [];
  c.ofa = c.powers.quirks.includes(OFA_ID)
    ? { stockpile: safeNum(raw.ofa?.stockpile, 0, 1e6), holders: Array.isArray(raw.ofa?.holders) ? raw.ofa.holders.slice(-12).map((n) => safeStr(n, 60)) : [] }
    : null;
  c.trophies = Array.isArray(raw.trophies)
    ? [...new Set(raw.trophies)].filter((id) => typeof id === 'string' && Object.hasOwn(DEADLY_MONSTERS, id) && DEADLY_MONSTERS[id].trophy)
    : [];
  c.legendWins = Array.isArray(raw.legendWins) ? [...new Set(raw.legendWins)].filter((id) => LEGEND_IDS.includes(id)) : [];
  c.soulOffer = typeof raw.soulOffer === 'string' && Object.hasOwn(LEGENDARY, raw.soulOffer) && !c.souls.includes(raw.soulOffer) ? raw.soulOffer : null;
  c.rebirths = Array.isArray(raw.rebirths)
    ? raw.rebirths.slice(-MAX_REBIRTHS).filter((r) => r && typeof r === 'object').map((r) => ({
      at: safeNum(r.at, 0, now),
      absorbed: safeStr(r.absorbed, 60),
      took: Array.isArray(r.took) ? [...new Set(r.took)].filter((id) => typeof id === 'string' && Object.hasOwn(TRAITS, id)).slice(0, 8) : [],
    }))
    : [];
  // Once dead, always dead. A file can't come back by leaving out a date or a killer.
  c.dead = raw.dead ? { at: safeNum(raw.dead.at, 0, now), by: safeStr(raw.dead.by, 40), ...(raw.dead.to ? { to: safeStr(raw.dead.to, 40) } : {}) } : null;
  c.battle = sanitizeBattle(raw.battle);
  c.look = { dye: typeof raw.look?.dye === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw.look.dye) ? raw.look.dye : null };
  c.gear = sanitizeGear(raw.gear);
  c.weapon = typeof raw.weapon === 'string' && Object.hasOwn(WEAPONS, raw.weapon) ? raw.weapon : null;
  c.prep = {
    paint: typeof raw.prep?.paint === 'string' && Object.hasOwn(PAINTS, raw.prep.paint) ? raw.prep.paint : null,
  };
  CROP_IDS.forEach((id) => { c.larder[id] = Math.floor(safeNum(raw.larder?.[id], 0, MAX_BANK)); });
  Object.keys(FRUITS).forEach((id) => {
    const n = Math.floor(safeNum(raw.fruits?.[id], 0, 99));
    if (n) c.fruits[id] = n;
  });
  Object.keys(c.record).forEach((k) => { c.record[k] = Math.floor(safeNum(raw.record?.[k], 0, 1e7)); });
  c.farm = sanitizeFarm(raw.farm, now);
  c.bank = raw.bank ? sanitizeBank(raw.bank) : bankFromHistory(c);
  return c;
}

function sanitizeBattle(raw) {
  const pick = (table, key, fallback) => (typeof key === 'string' && Object.hasOwn(table, key) ? key : fallback);
  const plan = defaultBattlePlan();
  plan.stance = pick(STANCES, raw?.stance, plan.stance);
  plan.hurt = pick(HURT_PLANS, raw?.hurt, plan.hurt);
  plan.target = pick(TARGET_PLANS, raw?.target, plan.target);
  if (Array.isArray(raw?.off)) plan.off = [...new Set(raw.off)].filter((id) => typeof id === 'string' && Object.hasOwn(ABILITIES, id));
  plan.heart = typeof raw?.heart === 'string' && Object.hasOwn(ABILITIES, raw.heart) ? raw.heart : null;
  return plan;
}

function sanitizeGear(raw) {
  const real = (list) => (Array.isArray(list) ? [...new Set(list)].filter((id) => typeof id === 'string' && Object.hasOwn(CHARMS, id)) : []);
  const owned = real(raw?.owned);
  return { owned, worn: real(raw?.worn).filter((id) => owned.includes(id)).slice(0, CHARM_SLOTS) };
}

function sanitizeBank(raw) {
  return Object.fromEntries(BANK_KEYS.map((k) => [k, safeNum(raw[k], 0, bankMax(k))]));
}

// A save from before the bank existed still gets to spend everything it already mined.
function bankFromHistory(c) {
  const bank = emptyBank();
  c.palette.hues.forEach((h, bin) => { bank[familyOfBin(bin)] += h.n; });
  bank.dust = c.palette.grey;
  bank.gems = c.record.gems;
  return sanitizeBank(bank);
}

// Files saved before powers existed simply come back with none.
function sanitizePowers(raw, c) {
  const { souls, lineage } = c;
  const powers = { stand: null, speedster: false, technique: null, technique2: null, fruit: null, quirks: [] };
  // A file can't hold more of these than its slots take.
  if (typeof raw?.stand === 'string' && Object.hasOwn(STANDS, raw.stand) && roomFor(powers, souls, 'stand')) powers.stand = raw.stand;
  if (raw?.speedster === true && roomFor(powers, souls, 'speedster')) powers.speedster = true;
  // Whatever a file claims, the only technique it can have is the one its family has.
  if (typeof raw?.technique === 'string' && Object.hasOwn(TECHNIQUES, raw.technique) && roomFor(powers, souls, 'technique')) powers.technique = lineage;
  // Only a Cursed Body holds a second, and only the one from the other side of its family.
  if (powers.technique && raw?.technique2 && hasTrait(c, 'cursedbody') && c.otherLine !== lineage) powers.technique2 = c.otherLine;
  // A Devil Fruit only if a slot is still free for it.
  if (typeof raw?.fruit === 'string' && Object.hasOwn(FRUITS, raw.fruit) && roomFor(powers, souls, 'fruit')) powers.fruit = raw.fruit;
  if (Array.isArray(raw?.quirks)) {
    let given = 0;
    for (const id of raw.quirks) {
      if (typeof id !== 'string' || !Object.hasOwn(QUIRKS, id) || powers.quirks.includes(id)) continue;
      if (given + QUIRKS[id].cost > MAX_HP_GIVEN) continue;
      given += QUIRKS[id].cost;
      powers.quirks.push(id);
    }
  }
  return powers;
}

function sanitizeFarm(raw, now) {
  const farm = { fields: [], animals: [], store: safeNum(raw?.store, 0, 9999), lastTick: safeNum(raw?.lastTick, 0, now, now), wateredAt: safeNum(raw?.wateredAt, 0, now), nextId: 1 };
  if (Array.isArray(raw?.fields)) {
    for (const f of raw.fields.slice(0, 12)) {
      if (!f || !Array.isArray(f.tiles)) continue;
      const cols = Math.floor(safeNum(f.cols, 1, 12, 1));
      const rows = Math.floor(safeNum(f.rows, 1, 10, 1));
      farm.fields.push({
        id: farm.nextId++,
        x: safeNum(f.x, 0, 20000),
        y: safeNum(f.y, 0, 20000),
        cols,
        rows,
        crop: CROP_IDS.includes(f.crop) ? f.crop : CROP_IDS[0],
        tiles: Array.from({ length: cols * rows }, (_, i) => {
          const tile = { s: Math.floor(safeNum(f.tiles[i]?.s, 0, 3)), t: safeNum(f.tiles[i]?.t, 0, now) };
          if (CROP_IDS.includes(f.tiles[i]?.c)) tile.c = f.tiles[i].c;
          return tile;
        }),
      });
    }
  }
  if (Array.isArray(raw?.animals)) {
    for (const a of raw.animals.slice(0, 60)) {
      if (!a || !['cluck', 'woolbit', 'beetle'].includes(a.kind)) continue;
      farm.animals.push({ id: farm.nextId++, kind: a.kind, x: safeNum(a.x, 0, 20000), y: safeNum(a.y, 0, 20000), lay: safeNum(a.lay, 0, now, now) });
    }
  }
  return farm;
}

export function parseCreature(text, now = Date.now()) {
  if (!String(text).trim()) throw new Error('That .creature file is empty');
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('That file is not a readable .creature file');
  }
  return sanitizeCreature(raw, now);
}

// The saved file. `stats` is there for humans reading it; it is always recomputed on load.
export function serializeCreature(c) {
  const out = {
    format: FORMAT,
    id: c.id,
    name: c.name,
    lastName: lastName(c),
    lineage: lineageOf(c),
    otherLine: otherLineOf(c),
    traits: c.traits,
    parents: c.parents,
    bredAt: c.bredAt,
    household: c.household === true,
    race: c.race,
    heritage: c.heritage ?? null,
    pureBlood: c.pureBlood === true,
    origin: c.origin ?? null,
    awakened: awakenedKinds(c),
    born: c.born,
    lastSeen: c.lastSeen,
    summary: {
      stage: stageOf(c).name,
      race: raceName(c),
      job: pathTitle(c),
      finalForm: isFinalForm(c),
      power: powerOf(c),
      maxHp: maxHpOf(c),
      colors: creatureColors(c),
      stand: c.powers.stand ? STANDS[c.powers.stand].name : null,
      speedster: c.powers.speedster,
      technique: c.powers.technique ? TECHNIQUES[c.powers.technique].name : null,
      secondTechnique: c.powers.technique2 ? TECHNIQUES[c.powers.technique2].name : null,
      legendary: c.souls.length ? c.souls.map((id) => LEGENDARY[id].name) : null,
      quirks: c.powers.quirks.map((id) => QUIRKS[id].name),
      devilFruit: c.powers.fruit ? FRUITS[c.powers.fruit].name : null,
      oneForAllLevel: ofaLevel(c) || null,
      bornWith: c.traits.map((id) => TRAITS[id].name),
      timesReborn: c.rebirths?.length || null,
      weapon: c.weapon ? WEAPONS[c.weapon].name : null,
    },
    stats: computeStats(c),
    growth: round2(c.growth),
    fullness: round2(c.fullness),
    essence: c.essence,
    mutations: c.mutations,
    expanders: c.expanders ?? 0,
    palette: {
      hues: c.palette.hues.map((h) => ({ r: Math.round(h.r), g: Math.round(h.g), b: Math.round(h.b), n: round2(h.n) })),
      grey: round2(c.palette.grey),
      total: round2(c.palette.total),
    },
    training: c.training,
    path: c.path,
    powers: c.powers,
    ofa: c.ofa,
    souls: c.souls,
    soulExpanders: c.soulExpanders ?? 0,
    trophies: c.trophies,
    legendWins: c.legendWins ?? [],
    soulOffer: c.soulOffer ?? null,
    rebirths: c.rebirths ?? [],
    dead: c.dead,
    battle: c.battle,
    bank: c.bank,
    look: c.look,
    gear: c.gear,
    weapon: c.weapon ?? null,
    prep: c.prep,
    larder: c.larder,
    fruits: c.fruits,
    record: c.record,
    farm: c.farm,
    absorbed: c.absorbed,
  };
  return JSON.stringify(out, null, 2);
}
const round2 = (v) => Math.round(v * 100) / 100;

// ---------- wild rivals, so the arena works before you have friends' files ----------

const SYL_A = ['Gr', 'Sk', 'Bl', 'Th', 'Kr', 'Zo', 'Mu', 'Va', 'Pe', 'Ni', 'Dr', 'Ol', 'Wi', 'Fe'];
const SYL_B = ['ub', 'arg', 'ix', 'onk', 'ee', 'ump', 'ello', 'azz', 'ort', 'ibble', 'unk', 'ash'];

export function wildCreature(seed, level = 1, now = Date.now()) {
  const r = makeRng(seed);
  const c = newCreature(`${pick(r, SYL_A)}${pick(r, SYL_B)}`, now);
  c.id = `wild${(seed >>> 0).toString(16)}`;
  c.lineage = lineageFromId(c.id);
  c.otherLine = otherLineFromId(c.id, c.lineage);
  c.traits = bornWith(c.id, c.lineage);
  // Seasoned rivals are sometimes Giants, Fish-men or Minks. Decided by its id, so the same seed is
  // always the same rival.
  if (level >= 2) {
    const roll = eggRoll(c.id, 'race');
    let edge = 0;
    c.race = Object.entries(WILD_RACES[Math.min(3, level)]).find(([, chance]) => roll < (edge += chance))?.[0] ?? DEFAULT_RACE;
  }
  c.growth = 15 + level * 45 + r() * 20;
  c.fullness = 60;
  const families = FOOD_ORDER.slice();
  const fams = [pick(r, families), pick(r, families)];
  const mutationCount = 1 + level * 2;
  for (let i = 0; i < mutationCount; i++) {
    const fam = fams[i % fams.length];
    const free = familyMutations(fam).filter((id) => !c.mutations.some((m) => m.id === id));
    if (!free.length) continue;
    const id = pick(r, free);
    c.mutations.push({ id, from: 'wild', at: now });
    c.essence[fam] += 4;
  }
  // Tier follows level, so a level 3 wild is a real final form.
  let node = pick(r, ROOT_PATHS);
  c.path.line.push(node);
  for (let t = 1; t < Math.min(3, level); t++) {
    node = pick(r, PATHS[node].kids);
    c.path.line.push(node);
  }
  c.path.xp = TIER_XP[3] * (level / 3);
  const hue = Math.floor(r() * 360);
  const bins = 1 + Math.floor(r() * 2);
  for (let i = 0; i < bins; i++) {
    const [rr, gg, bb] = hslRgb((hue + i * 70) % 360, 0.75, 0.55);
    addColor(c, rr, gg, bb, 60 + r() * 200 * level);
  }
  // The toughest rivals turn up with powers, so you can meet them before you have your own.
  if (level >= 3) {
    const power = r();
    if (power < 0.3) c.powers.stand = standFor(c);
    else if (power < 0.5) c.powers.speedster = true;
    else if (power < 0.7) c.powers.technique = lineageOf(c);
    if (r() < 0.35) c.powers.quirks.push(pick(r, QUIRK_IDS));
    if (c.powers.quirks.includes(OFA_ID)) c.ofa = { stockpile: 0, holders: [] };
  }
  // Rivals don't all fight the same way.
  c.battle.stance = pick(r, ['close', 'close', 'close', 'mid', 'bounce', 'hold']);
  return c;
}

function hslRgb(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return [f(0), f(8), f(4)];
}
