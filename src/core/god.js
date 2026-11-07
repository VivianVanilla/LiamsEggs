// God Mode: what opens once God, the last level of the God Chapter, is beaten (core/adventure.js).
// It stays open for good, through any universe reset. Three things:
//   the Maker: any creature you want, of any race, with any gifts, powers, job and awakenings;
//   the God Ring: put anyone in the ring against anyone, your creatures and any monster or boss,
//     as strong as you like, and nothing that happens there touches anyone;
//   the tools: gems, ore, loot, Void Shards and stones, and everyone fed, grown, trained and awakened.
// Pure rules with no DOM, so tests can run them. The note is in ui/god.js.

import { clamp } from '../lib/util.js';
import {
  newCreature, parseCreature, serializeCreature, fitsSouls, STAT_KEYS, TRAINING_LIMIT, STAGES,
} from './creature.js';
import { withoutHouse } from './house.js';
import { addItem } from './items.js';
import { godModeOpen } from './universe.js';
import { Bout } from '../sim/arena.js';
import { deadlyMonsterStats } from '../sim/challenges.js';
import { RACES, DEFAULT_RACE } from '../data/races.js';
import {
  TRAITS, STANDS, TECHNIQUES, TECHNIQUE_IDS, QUIRKS, LEGENDARY, MAX_HP_GIVEN, POWER_KINDS, OFA_ID, OFA_LEVEL_AT,
} from '../data/powers.js';
import { FRUITS } from '../data/fruits.js';
import { PATHS, TIER_XP } from '../data/paths.js';
import { WEAPONS } from '../data/forge.js';
import { DEADLY_MONSTERS } from '../data/monsters.js';
import { GOD_BOSSES, ABYSS_BOSSES } from '../data/adventure.js';
import { ITEM_IDS } from '../data/items.js';
import { MAX_GEMS } from '../data/crafting.js';
import { MAX_ORE } from '../data/forge.js';
import { MAX_STONES } from '../data/ascension.js';

export { godModeOpen };

// ---------- the Maker ----------

// The races the Maker can make: every race there is, but the old Half-devil.
export const MAKER_RACES = Object.keys(RACES).filter((id) => id !== 'halfdevil');
// The final forms of every job, for the Maker to start a creature in.
export const FINAL_FORMS = Object.keys(PATHS).filter((id) => PATHS[id].tier === 3);
export const MAKER_SOULS = Object.keys(LEGENDARY);

export const emptyMake = () => ({
  name: '',
  race: DEFAULT_RACE,
  // A second race makes it half of each, or all of both with pureBlood.
  race2: null,
  pureBlood: false,
  traits: [],
  stand: null,
  speedster: false,
  technique: null,
  fruit: null,
  quirks: [],
  souls: [],
  awaken: false,
  job: null,
  stage: STAGES.length - 1,
  trained: true,
  trophies: false,
  weapon: null,
});

// The fewest Legendary mutations, starting from `souls`, that fit these powers. Up to three: a
// creature can't hold more. Returns null if nothing fits.
function soulsFor(c, souls) {
  const wanted = [...new Set(souls)].filter((id) => Object.hasOwn(LEGENDARY, id)).slice(0, 3);
  if (fitsSouls(c, wanted)) return wanted;
  const others = MAKER_SOULS.filter((id) => !wanted.includes(id));
  const room = 3 - wanted.length;
  // Every way to add one, two or three more, fewest first.
  for (let n = 1; n <= room; n++) {
    const pick = (from, k) => (k === 0 ? [[]] : from.flatMap((id, i) => pick(from.slice(i + 1), k - 1).map((rest) => [id, ...rest])));
    for (const more of pick(others, n)) if (fitsSouls(c, [...wanted, ...more])) return [...wanted, ...more];
  }
  return null;
}

// The quirks it can take, in order, until they cost more max HP than it can give.
function quirksThatFit(ids) {
  let given = 0;
  return [...new Set(ids)].filter((id) => {
    if (!Object.hasOwn(QUIRKS, id) || given + QUIRKS[id].cost > MAX_HP_GIVEN) return false;
    given += QUIRKS[id].cost;
    return true;
  });
}

// Makes the creature `make` describes. It goes through the same cleaning as any .creature file, so
// whatever it is, it is a creature the game can really have.
export function godMake(make, now = Date.now()) {
  const c = newCreature(make.name || 'Made', now);
  // Its race, or two.
  const race = MAKER_RACES.includes(make.race) ? make.race : DEFAULT_RACE;
  const race2 = MAKER_RACES.includes(make.race2) && make.race2 !== race ? make.race2 : null;
  c.race = race === DEFAULT_RACE && race2 ? race2 : race;
  c.heritage = race2 ? { [race]: 0.5, [race2]: 0.5 } : null;
  c.pureBlood = !!race2 && !!make.pureBlood;
  c.traits = [...new Set(make.traits ?? [])].filter((id) => Object.hasOwn(TRAITS, id));
  // A cursed technique is its family's, so it joins the family that has it.
  if (make.technique && Object.hasOwn(TECHNIQUES, make.technique)) {
    c.lineage = make.technique;
    if (c.otherLine === c.lineage) c.otherLine = TECHNIQUE_IDS.find((t) => t !== c.lineage);
  }
  c.powers = {
    stand: Object.hasOwn(STANDS, make.stand) ? make.stand : null,
    speedster: !!make.speedster,
    technique: make.technique && Object.hasOwn(TECHNIQUES, make.technique) ? make.technique : null,
    technique2: null,
    fruit: Object.hasOwn(FRUITS, make.fruit) ? make.fruit : null,
    quirks: quirksThatFit(make.quirks ?? []),
  };
  // Enough Legendary mutations to hold every power picked.
  c.souls = soulsFor(c, make.souls ?? []) ?? [];
  c.soulExpanders = Math.max(0, c.souls.length - 1);
  if (c.powers.quirks.includes(OFA_ID)) c.ofa = { stockpile: OFA_LEVEL_AT[OFA_LEVEL_AT.length - 1], holders: [] };
  if (make.awaken) c.awakened = POWER_KINDS.filter((kind) => c.powers[kind]);
  // Its job, all the way to the final form picked.
  if (FINAL_FORMS.includes(make.job)) {
    const line = [make.job];
    while (PATHS[line[0]].parent) line.unshift(PATHS[line[0]].parent);
    c.path = { line, xp: TIER_XP[3] };
  }
  const stage = clamp(Math.floor(make.stage ?? STAGES.length - 1), 0, STAGES.length - 1);
  c.growth = stage === STAGES.length - 1 ? Math.max(400, STAGES[stage].at) : STAGES[stage].at;
  c.fullness = 100;
  if (make.trained) STAT_KEYS.forEach((k) => { c.training[k] = TRAINING_LIMIT; });
  if (make.trophies) c.trophies = Object.keys(DEADLY_MONSTERS).filter((id) => DEADLY_MONSTERS[id].trophy);
  c.weapon = Object.hasOwn(WEAPONS, make.weapon) ? make.weapon : null;
  return parseCreature(serializeCreature(c), now);
}

// Why the Maker can't make this, or null if it can.
export function makeProblem(make) {
  if (!String(make.name ?? '').trim()) return 'Name it first';
  const c = newCreature('x');
  c.powers = { stand: make.stand || null, speedster: !!make.speedster, technique: make.technique || null, technique2: null, fruit: make.fruit || null, quirks: [] };
  if (!soulsFor(c, make.souls ?? [])) return 'Those powers don\'t all fit, even with three Legendary mutations';
  return null;
}

// ---------- the God Ring ----------

// What can be thrown into the ring besides your creatures: every monster from the Challenges, and
// the bosses of Chapter ??? and the God Chapter.
export const RING_MONSTERS = {
  ...Object.fromEntries(Object.entries(DEADLY_MONSTERS).map(([id, def]) => [id, { def, power: 1 }])),
  ...Object.fromEntries(Object.entries(ABYSS_BOSSES).map(([k, b]) => [`abyss${k}`, { def: { ...DEADLY_MONSTERS[b.monster], name: b.name, moves: b.moves, passive: b.passive }, power: b.power ?? 1 }])),
  ...Object.fromEntries(Object.entries(GOD_BOSSES).map(([k, b]) => [`god${k}`, { def: { ...DEADLY_MONSTERS[b.monster], name: b.name, moves: b.moves, passive: b.passive }, power: b.power ?? 1 }])),
};
export const RING_MONSTER_IDS = Object.keys(RING_MONSTERS);
// How much stronger the right side can be made.
export const RING_MIGHT = [1, 3, 10, 30, 100];

// Sets up a fight. left and right are creatures (copies are made, so nothing in the ring touches
// them), monsters are RING_MONSTERS ids for the right side, and `might` makes everything on the right
// that many times as strong. With freeForAll, everyone fights everyone instead.
export function godRing({ left = [], right = [], monsters = [], might = 1, freeForAll = false }, { seed = 1, cx, cy, r, sizeMul } = {}) {
  const copy = (c) => parseCreature(serializeCreature(withoutHouse(c)));
  const ours = left.map(copy);
  const theirs = right.map(copy);
  const bout = new Bout([...ours, ...theirs], { seed, cx, cy, r, sizeMul });
  bout.fighters.forEach((f, i) => { f.team = freeForAll ? i : i < ours.length ? 0 : 1; });
  monsters.filter((id) => Object.hasOwn(RING_MONSTERS, id)).forEach((id, i) => {
    const { def, power } = RING_MONSTERS[id];
    const stats = deadlyMonsterStats(def, seed + i * 7919);
    const m = bout.addMonster(def, Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, Math.round(v * power)])));
    if (freeForAll) m.team = bout.fighters.length;
  });
  const k = clamp(Number(might) || 1, 1, 1000);
  bout.fighters.filter((f) => f.team !== 0 || freeForAll).forEach((f) => {
    if (freeForAll && !f.monster) return;
    f.maxHp *= k;
    f.hp = f.maxHp;
    f.atk *= k;
  });
  bout.lineUp();
  bout.godRing = true;
  return bout;
}

export const ringProblem = ({ left = [], right = [], monsters = [], freeForAll = false }) => {
  const count = left.length + right.length + monsters.length;
  if (count < 2) return 'Put at least two in the ring';
  if (count > 12) return 'At most 12 at once';
  if (!freeForAll && (!left.length || (!right.length && !monsters.length))) return 'Both sides need someone';
  return null;
};

// ---------- the tools ----------

export const GOD_GIFTS = { gems: 1e6, shards: 1e5, stones: 12, items: 10 };

// Things for the whole household.
export function godRain(house) {
  house.bank.gems = clamp(house.bank.gems + GOD_GIFTS.gems, 0, MAX_GEMS);
}
export function godForge(house) {
  house.ore = MAX_ORE;
}
export function godBag(house) {
  ITEM_IDS.forEach((id) => addItem(house, id, GOD_GIFTS.items));
}
export function godNegative(world) {
  world.shards += GOD_GIFTS.shards;
  world.stones = clamp((world.stones ?? 0) + GOD_GIFTS.stones, 0, MAX_STONES);
}
// Every expedition is home, right now.
export function godRecall(house, now = Date.now()) {
  house.expeditions.forEach((e) => { e.end = Math.min(e.end, now); });
}

// Things for one creature. Each returns whether it changed anything.
export const GOD_BLESSINGS = {
  feed: { name: 'Feed', text: 'full', apply: (c) => { const was = c.fullness; c.fullness = 100; return was < 100; } },
  grow: { name: 'Grow up', text: 'an Elder', apply: (c) => { const was = c.growth; c.growth = Math.max(c.growth, 400); return was < c.growth; } },
  train: { name: 'Train', text: 'trained to the limit', apply: (c) => { const was = STAT_KEYS.some((k) => (c.training[k] ?? 0) < TRAINING_LIMIT); STAT_KEYS.forEach((k) => { c.training[k] = TRAINING_LIMIT; }); return was; } },
  awaken: { name: 'Awaken', text: 'every power it has awakened', apply: (c) => { const kinds = POWER_KINDS.filter((kind) => c.powers[kind]); const was = (c.awakened ?? []).length; c.awakened = kinds; return kinds.length > was; } },
};
export const GOD_BLESSING_IDS = Object.keys(GOD_BLESSINGS);
