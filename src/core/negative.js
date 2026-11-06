// A creature of the Negative Dimension, and the world it lives in. Pure rules with no DOM, so tests
// can run them. The numbers are in data/negative.js; its Adventure is in core/negadventure.js.
//
// A creature of the Negative is a small record of its own, kept in world/data/negative.json, never
// in a .creature file: the two worlds share nothing. In a fight it is drawn and run through a light-
// world "shell" (negShell) that carries its race and gifts, with every number replaced by its own
// (negFightSpec), NEG_SCALE times as big.

import { clamp, num, makeRng, pick, uid } from '../lib/util.js';
import { newCreature, eggRoll, addPassive, emptyPassive, cleanName, hpFromStats } from './creature.js';
import { RACES, NEGATIVE_RACE_IDS, raceMovesOf } from '../data/races.js';
import { TRAITS, NEG_TRAIT_IDS, NEG_TRAIT_ODDS } from '../data/powers.js';
import { ABILITIES } from '../data/paths.js';
import { STANCES, HURT_PLANS, TARGET_PLANS, defaultBattlePlan } from '../data/battle.js';
import {
  NEG_SCALE, ABILITY_KEYS, NEG_MAX_LEVEL, NEG_MAX_SCORE, negXpToNext, NEG_ROSTER_MAX, NEG_PARTY, NEG_EGG, NEG_LEVEL_COUNT,
  CLASSES, CLASS_IDS, SPELL_LEVELS, spellSlots, CAST_POWER,
  NEN_TYPES, NEN_HEXAGON, NEN_AFFINITY, SPECIALIST_ODDS, NEN_POINTS, NEN_TECHNIQUES, NEN_TECHNIQUE_IDS, KO, HATSU_FORMS, MAX_VOWS, VOWS,
  MAX_CIRCLES, ALCHEMY_SHAPES, ALCHEMY_ELEMENTS, ALCHEMY_COSTS, ALCHEMY_INT,
} from '../data/negative.js';

const MAX_NAME = 24;

// ---------- eggs and birth ----------

// Its Nen type, from water divination. The same egg always shows the same thing in the water.
export function nenTypeOf(id) {
  if (eggRoll(id, 'water') < 1 / SPECIALIST_ODDS) return 'specialist';
  const others = NEN_HEXAGON.filter((t) => t !== 'specialist');
  return others[Math.floor(eggRoll(id, 'water type') * others.length) % others.length];
}

// The gifts of the Negative it hatches with.
export const negBornWith = (id) => NEG_TRAIT_IDS.filter((t) => eggRoll(id, `negative:${t}`) < 1 / NEG_TRAIT_ODDS[t]);

// An egg of the Negative is just an id: its race, its gifts and its Nen type all come from it.
export function negEggFromId(id) {
  const race = NEGATIVE_RACE_IDS[Math.floor(eggRoll(id, 'negative race') * NEGATIVE_RACE_IDS.length) % NEGATIVE_RACE_IDS.length];
  return { id, race, traits: negBornWith(id), nenType: nenTypeOf(id) };
}
export const rollNegEgg = (rng = Math.random) => negEggFromId(uid(rng));

export const defaultAlloc = () => Object.fromEntries(NEN_TECHNIQUE_IDS.map((k) => [k, NEN_POINTS / NEN_TECHNIQUE_IDS.length]));

export function newNegCreature(name, egg = rollNegEgg(), now = Date.now()) {
  return {
    dimension: 'negative',
    id: egg.id,
    name: cleanName(name) || 'Nameless',
    born: now,
    race: egg.race,
    traits: egg.traits.slice(),
    nenType: egg.nenType,
    level: 1,
    xp: 0,
    // Its class, picked once and for good, and the spells it has prepared.
    klass: null,
    spells: [],
    // Its aura over the five techniques, Ko, its Hatsu, and the vows it swore.
    nen: { alloc: defaultAlloc(), ko: false, hatsu: null, vows: [] },
    // Its Alchemy circles: { name, shape, element, hp, cd, toll }.
    alchemy: [],
    battle: defaultBattlePlan(),
    // The best level of the Negative's Adventure it has won, and how often it has won and lost there.
    best: 0,
    wins: 0,
    losses: 0,
    dye: null,
  };
}

// ---------- scores and levels ----------

// A little of each score is its own, from its egg, so no two are quite alike.
const own = (id, k) => Math.floor(eggRoll(id, `score:${k}`) * 12);

// Its six ability scores right now: its race to start with, and its class every level after.
export function negScores(nc) {
  const base = RACES[nc.race]?.neg ?? {};
  const grow = CLASSES[nc.klass]?.grow;
  return Object.fromEntries(ABILITY_KEYS.map((k) => [k, Math.min(NEG_MAX_SCORE, Math.round((base[k] ?? 30) + own(nc.id, k) + (grow?.[k] ?? 3) * (nc.level - 1)))]));
}

export const negPower = (nc) => Object.values(negScores(nc)).reduce((a, b) => a + b, 0);

// Adds XP and levels it up as far as it goes. Returns how many levels it went up.
export function addNegXp(nc, xp) {
  let gained = 0;
  nc.xp += Math.max(0, xp);
  while (nc.level < NEG_MAX_LEVEL && nc.xp >= negXpToNext(nc.level)) {
    nc.xp -= negXpToNext(nc.level);
    nc.level += 1;
    gained += 1;
  }
  if (nc.level >= NEG_MAX_LEVEL) nc.xp = 0;
  return gained;
}

// A Death oath kept: it goes down a level.
export function loseLevel(nc) {
  if (nc.level <= 1) return false;
  nc.level -= 1;
  nc.xp = 0;
  nc.spells = nc.spells.filter((id) => unlockedSpells(nc).includes(id)).slice(0, spellSlots(nc.level));
  return true;
}

// ---------- its class and spells ----------

export function chooseClass(nc, id) {
  if (nc.klass || !Object.hasOwn(CLASSES, id)) return false;
  nc.klass = id;
  nc.spells = [CLASSES[id].spells[0]];
  return true;
}

export const unlockedSpells = (nc) => (CLASSES[nc.klass]?.spells ?? []).filter((_, i) => nc.level >= SPELL_LEVELS[i]);

// Prepares a spell, or puts one away. With every slot full, the oldest makes room.
export function toggleSpell(nc, id) {
  if (!unlockedSpells(nc).includes(id)) return false;
  if (nc.spells.includes(id)) nc.spells = nc.spells.filter((s) => s !== id);
  else nc.spells = [...nc.spells, id].slice(-spellSlots(nc.level));
  return true;
}

// A spell as it really casts, stronger with its class's casting score.
export function spellDef(nc, id, scores = negScores(nc)) {
  const def = ABILITIES[id];
  const cls = CLASSES[nc.klass];
  if (!def || !cls) return def;
  const k = 1 + scores[cls.cast] * CAST_POWER;
  return { ...def, ...(def.power ? { power: def.kind === 'heal' ? Math.min(0.7, def.power * k) : def.power * k } : {}) };
}

// ---------- Nen ----------

// How well it can use a type of Nen, from where the two sit on the hexagon.
export function affinity(natural, type) {
  if (type === 'specialist' && natural !== 'specialist') return 0;
  const i = NEN_HEXAGON.indexOf(natural);
  const j = NEN_HEXAGON.indexOf(type);
  if (i < 0 || j < 0) return 0;
  const d = Math.min(Math.abs(i - j), NEN_HEXAGON.length - Math.abs(i - j));
  return NEN_AFFINITY[d] ?? 0;
}

// How strong its aura is: grows with its level and its Charisma.
export const auraOf = (nc, scores = negScores(nc)) => 0.6 + nc.level / 75 + scores.cha / 2500;

// Its aura over the techniques, as a passive. Ko is on top of these, in the fight itself.
export function nenPassive(nc, scores = negScores(nc)) {
  const aura = auraOf(nc, scores);
  const out = {};
  for (const id of NEN_TECHNIQUE_IDS) {
    const t = NEN_TECHNIQUES[id];
    const points = clamp(num(nc.nen.alloc[id]), 0, NEN_POINTS);
    out[t.key] = Math.min(t.max, points * t.per * aura);
    if (t.reach) out.reach = points * t.reach;
  }
  return out;
}

// Spreads its aura: sets one technique, and takes or gives the difference to the others evenly, so it
// always adds up to NEN_POINTS.
export function setAlloc(nc, id, value) {
  if (!NEN_TECHNIQUE_IDS.includes(id)) return false;
  const alloc = { ...nc.nen.alloc };
  alloc[id] = Math.round(clamp(num(value), 0, NEN_POINTS));
  let left = NEN_POINTS - alloc[id];
  const others = NEN_TECHNIQUE_IDS.filter((k) => k !== id);
  const had = others.reduce((s, k) => s + alloc[k], 0);
  others.forEach((k, i) => {
    const share = i === others.length - 1 ? left : Math.round(had > 0 ? (alloc[k] / had) * (NEN_POINTS - alloc[id]) : (NEN_POINTS - alloc[id]) / others.length);
    alloc[k] = clamp(share, 0, left);
    left -= alloc[k];
  });
  nc.nen.alloc = alloc;
  return true;
}

export const vowMul = (vows) => vows.reduce((m, id) => m * (VOWS[id]?.mul ?? 1), 1);

// Why this Hatsu can't be made, or null if it can.
export function hatsuProblem(nc, type, form) {
  if (!Object.hasOwn(HATSU_FORMS, type) || !Object.hasOwn(HATSU_FORMS[type], form)) return 'There is no such Hatsu';
  if (affinity(nc.nenType, type) <= 0) return 'Only a Specialist can use Specialization';
  return null;
}

export function setHatsu(nc, type, form, name = '') {
  if (hatsuProblem(nc, type, form)) return false;
  nc.nen.hatsu = { type, form, name: cleanName(name).slice(0, MAX_NAME) };
  return true;
}

export function toggleVow(nc, id) {
  if (!Object.hasOwn(VOWS, id)) return false;
  if (nc.nen.vows.includes(id)) nc.nen.vows = nc.nen.vows.filter((v) => v !== id);
  else if (nc.nen.vows.length < MAX_VOWS) nc.nen.vows = [...nc.nen.vows, id];
  else return false;
  return true;
}

// Makes a move this many times as strong: its hit, and a little of how long what it leaves lasts.
function scaleMove(def, k) {
  const d = { ...def };
  const soft = Math.min(2, Math.sqrt(Math.max(0, k)));
  if (d.power) d.power = d.kind === 'heal' ? Math.min(0.7, d.power * k) : d.power * k;
  if (d.atk) d.atk = Math.min(2, d.atk * k);
  if (d.guard) d.guard = Math.min(0.8, d.guard * soft);
  if (d.dodge) d.dodge = Math.min(0.9, d.dodge * soft);
  if (d.speed) d.speed *= soft;
  ['stun', 'confuse', 'silence'].forEach((key) => { if (d[key]) d[key] *= soft; });
  if (d.kind === 'timestop') d.dur = Math.min(3, d.dur * Math.min(1.8, soft));
  if (d.kind === 'summon') d.count = clamp(Math.round(d.count * soft), 1, 5);
  return d;
}

// How strong its Hatsu is: its affinity with that type, its vows, and its aura, multiplied.
export const hatsuStrength = (nc, scores = negScores(nc)) => (nc.nen.hatsu ? affinity(nc.nenType, nc.nen.hatsu.type) * vowMul(nc.nen.vows) * auraOf(nc, scores) : 0);

// Its Hatsu as an arena move, with everything its vows cost it.
export function hatsuDef(nc, scores = negScores(nc)) {
  const h = nc.nen.hatsu;
  const form = h && HATSU_FORMS[h.type]?.[h.form];
  if (!form) return null;
  const d = scaleMove(form.def, hatsuStrength(nc, scores));
  const name = h.name || form.name;
  d.name = name;
  d.cry = name.toUpperCase();
  d.loud = true;
  d.color = NEN_TYPES[h.type].color;
  const vows = nc.nen.vows;
  if (vows.includes('cornered')) d.cornered = true;
  if (vows.includes('blood')) d.recoil = (d.recoil ?? 0) + 0.1;
  if (vows.includes('spoken')) d.cd *= 1.6;
  if (vows.includes('close') && d.range) d.range = Math.min(d.range, 170);
  if (vows.includes('patience')) d.after = 10;
  return d;
}

// ---------- Alchemy ----------

export const circleWorth = (circle) => 1
  + circle.hp * ALCHEMY_COSTS.hp.worth
  + (circle.cd - ALCHEMY_COSTS.cd.min) * ALCHEMY_COSTS.cd.worth
  + circle.toll * ALCHEMY_COSTS.toll.worth;

export const freshCircle = () => ({ name: '', shape: 'spike', element: 'earth', hp: 0.06, cd: 8, toll: 0 });

// A circle as it really fires: its shape and element, as strong as what it paid, and Intelligence.
export function circleDef(circle, scores) {
  const shape = ALCHEMY_SHAPES[circle.shape];
  const el = ALCHEMY_ELEMENTS[circle.element];
  if (!shape || !el) return null;
  const k = circleWorth(circle) * (1 + (scores?.int ?? 0) * ALCHEMY_INT);
  const soft = Math.min(1.8, Math.sqrt(k));
  const d = { ...shape.def };
  if (d.kind === 'heal') d.power = Math.min(0.6, d.power * k);
  else if (d.kind === 'buff') d.guard = Math.min(0.8, d.guard * k);
  else if (d.kind === 'summon') d.count = clamp(1 + Math.floor((k - 1) / 0.9), 1, 4);
  else d.power *= k * (el.power ?? 1);
  if (d.kind !== 'heal' && d.kind !== 'buff' && d.kind !== 'summon') {
    const r = el.rider ?? {};
    if (r.stun) d.stun = r.stun * soft;
    if (r.confuse) d.confuse = r.confuse * soft;
    if (r.poison) { d.poison = r.poison * soft; d.poisonFor = r.poisonFor; }
    if (r.push) d.push = r.push;
    if (r.drain) d.drain = r.drain;
  }
  d.cd = circle.cd;
  if (circle.hp > 0) d.recoil = circle.hp;
  if (circle.toll > 0) d.toll = circle.toll;
  d.name = circle.name || `${el.name} ${shape.name}`;
  d.cry = d.name.toUpperCase();
  d.loud = true;
  d.color = { earth: '#b08a5a', fire: '#ff7a2a', ice: '#9fdcff', air: '#e0f0ff', iron: '#b8c0cc', lightning: '#ffe14a', flesh: '#d0405a' }[circle.element] ?? '#ffffff';
  return d;
}

// Why this circle can't be drawn, or null if it can.
export function circleProblem(circle) {
  if (!circle || !Object.hasOwn(ALCHEMY_SHAPES, circle.shape)) return 'Pick a shape';
  if (!Object.hasOwn(ALCHEMY_ELEMENTS, circle.element)) return 'Pick an element';
  for (const [k, c] of Object.entries(ALCHEMY_COSTS)) {
    const v = circle[k];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < c.min - 1e-9 || v > c.max + 1e-9) return `${c.name} has to be between ${c.min} and ${c.max}`;
  }
  return null;
}

const cleanCircle = (raw) => ({
  name: cleanName(raw?.name).slice(0, MAX_NAME),
  shape: Object.hasOwn(ALCHEMY_SHAPES, raw?.shape) ? raw.shape : 'spike',
  element: Object.hasOwn(ALCHEMY_ELEMENTS, raw?.element) ? raw.element : 'earth',
  hp: clamp(num(raw?.hp), ALCHEMY_COSTS.hp.min, ALCHEMY_COSTS.hp.max),
  cd: clamp(num(raw?.cd, 8), ALCHEMY_COSTS.cd.min, ALCHEMY_COSTS.cd.max),
  toll: clamp(num(raw?.toll), ALCHEMY_COSTS.toll.min, ALCHEMY_COSTS.toll.max),
});

// Draws a circle into place `i`, or a new one at the end. Returns false if it can't.
export function setCircle(nc, i, circle) {
  if (circleProblem(circle)) return false;
  const list = nc.alchemy.slice();
  if (i >= 0 && i < list.length) list[i] = cleanCircle(circle);
  else if (list.length < MAX_CIRCLES) list.push(cleanCircle(circle));
  else return false;
  nc.alchemy = list;
  return true;
}

export function eraseCircle(nc, i) {
  if (i < 0 || i >= nc.alchemy.length) return false;
  nc.alchemy = nc.alchemy.filter((_, k) => k !== i);
  return true;
}

// ---------- in a fight ----------

// Every move it takes into a fight, and where each one comes from.
export function negMoveList(nc, scores = negScores(nc)) {
  const list = [];
  raceMovesOf(nc.race).forEach((id) => ABILITIES[id] && list.push({ id, def: ABILITIES[id], from: RACES[nc.race].name }));
  nc.spells.filter((id) => unlockedSpells(nc).includes(id)).forEach((id) => list.push({ id, def: spellDef(nc, id, scores), from: `${CLASSES[nc.klass].name} spell` }));
  const hatsu = hatsuDef(nc, scores);
  if (hatsu) list.push({ id: 'hatsu', def: hatsu, from: `Hatsu (${NEN_TYPES[nc.nen.hatsu.type].name})` });
  nc.alchemy.forEach((circle, i) => {
    const def = circleDef(circle, scores);
    if (def) list.push({ id: `alchemy${i}`, def, from: 'Alchemy' });
  });
  return list;
}

// What it brings into a fight: the five stats the ring runs on, read from its six scores, and how
// much bigger than a light-world fight its health and hits are.
export function negFightSpec(nc) {
  const s = negScores(nc);
  const cls = CLASSES[nc.klass];
  const eq = {
    might: s.str / NEG_SCALE,
    speed: s.dex / NEG_SCALE,
    vigor: s.con / NEG_SCALE,
    guard: (s.con + s.dex) / (2 * NEG_SCALE),
    wits: (s.int + s.wis) / (2 * NEG_SCALE),
  };
  const passive = addPassive(addPassive(emptyPassive(), cls?.feature), nenPassive(nc, s));
  const ren = clamp(num(nc.nen.alloc.ren), 0, NEN_POINTS);
  return {
    eq,
    hpMul: NEG_SCALE * (cls?.hitDie ?? 1),
    atkMul: NEG_SCALE,
    passive,
    moves: negMoveList(nc, s),
    ko: nc.nen.ko ? { every: KO.every, power: KO.power + ren / KO.perRen } : null,
  };
}

export const negMaxHp = (nc) => {
  const { eq, hpMul, passive } = negFightSpec(nc);
  const shell = negShell(nc);
  const race = RACES[shell.race]?.passive?.hp ?? 0;
  const gifts = shell.traits.reduce((s, id) => s + (TRAITS[id]?.passive?.hp ?? 0), 0);
  return Math.round(hpFromStats(eq) * hpMul * (1 + passive.hp + race + gifts));
};

// A light-world creature wearing its race and gifts, for drawing it and for the passives it brings.
// Made again whenever how it looks changes.
const shells = new WeakMap();
export function negShell(nc) {
  const key = `${nc.race}:${nc.level}:${nc.dye}:${nc.traits.join()}:${nc.name}`;
  const had = shells.get(nc);
  if (had?.key === key) return had.c;
  const c = newCreature(nc.name);
  c.id = `negative${nc.id}`;
  c.race = nc.race;
  c.traits = nc.traits.filter((id) => Object.hasOwn(TRAITS, id));
  c.growth = nc.level >= 25 ? 180 : nc.level >= 10 ? 90 : 40;
  c.look.dye = nc.dye ?? null;
  c.battle = { ...defaultBattlePlan(), ...nc.battle, off: [], heart: null };
  shells.set(nc, { key, c });
  return c;
}

// ---------- wild ones, for its Adventure ----------

const SYL_A = ['Vr', 'Kh', 'Zh', 'Ny', 'Ul', 'Ix', 'Mor', 'Ves', 'Gol', 'Thr', 'Sk', 'Ob'];
const SYL_B = ['eth', 'ul', 'orr', 'ax', 'ynn', 'oth', 'ess', 'ug', 'ire', 'aal', 'om', 'ix'];

export function wildNegCreature(seed, level) {
  const r = makeRng(seed);
  const nc = newNegCreature(`${pick(r, SYL_A)}${pick(r, SYL_B)}`, negEggFromId(`nwild${(seed >>> 0).toString(16)}`));
  nc.level = clamp(level, 1, NEG_MAX_LEVEL);
  chooseClass(nc, pick(r, CLASS_IDS));
  const spells = unlockedSpells(nc);
  nc.spells = spells.slice().sort(() => r() - 0.5).slice(0, spellSlots(nc.level));
  // Its aura, spread anyhow.
  const weights = NEN_TECHNIQUE_IDS.map(() => 0.3 + r());
  const total = weights.reduce((a, b) => a + b, 0);
  nc.nen.alloc = Object.fromEntries(NEN_TECHNIQUE_IDS.map((k, i) => [k, Math.round((weights[i] / total) * NEN_POINTS)]));
  nc.nen.ko = r() < 0.3;
  if (nc.level >= 3) {
    const type = r() < 0.7 ? nc.nenType : pick(r, NEN_HEXAGON.filter((t) => affinity(nc.nenType, t) > 0));
    setHatsu(nc, type, pick(r, Object.keys(HATSU_FORMS[type])));
    if (r() < 0.5) toggleVow(nc, pick(r, ['blood', 'spoken', 'patience', 'close']));
  }
  const circles = nc.level >= 25 ? 2 : nc.level >= 6 ? 1 : 0;
  for (let i = 0; i < circles; i++) {
    setCircle(nc, -1, {
      name: '',
      shape: pick(r, ['spike', 'wave', 'burst', 'lance', 'rain']),
      element: pick(r, Object.keys(ALCHEMY_ELEMENTS)),
      hp: Math.round(r() * 8) * 0.02,
      cd: 6 + Math.floor(r() * 10),
      toll: 0,
    });
  }
  nc.battle.stance = pick(r, ['close', 'close', 'mid', 'bounce', 'hold']);
  return nc;
}

// ---------- the world of the Negative ----------

export const emptyNegWorld = () => ({
  creatures: [],
  // Void Shards: the money of the Negative.
  shards: 0,
  egg: null,
  // How many eggs have been kept, for the free ones.
  kept: 0,
  adventure: { best: 0, party: [] },
  // Everyone that crossed over to the light world.
  crossed: [],
});

const safeStr = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').slice(0, max);
const safeId = (v) => String(v ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);

// negative.json can be edited by hand, so it gets cleaned like a .creature file.
export function sanitizeNeg(raw, now = Date.now()) {
  const id = safeId(raw?.id) || uid();
  const egg = negEggFromId(id);
  const nc = newNegCreature(raw?.name, egg, now);
  nc.born = clamp(num(raw?.born, now), 0, now);
  // Its race and gifts are whatever its egg gave it: a file can't pick others.
  nc.level = Math.floor(clamp(num(raw?.level, 1), 1, NEG_MAX_LEVEL));
  nc.xp = clamp(num(raw?.xp), 0, negXpToNext(nc.level));
  if (Object.hasOwn(CLASSES, raw?.klass)) {
    nc.klass = raw.klass;
    const can = unlockedSpells(nc);
    nc.spells = Array.isArray(raw.spells) ? [...new Set(raw.spells)].filter((s) => can.includes(s)).slice(0, spellSlots(nc.level)) : [];
  }
  const alloc = raw?.nen?.alloc;
  if (alloc && typeof alloc === 'object') {
    const clean = Object.fromEntries(NEN_TECHNIQUE_IDS.map((k) => [k, Math.round(clamp(num(alloc[k]), 0, NEN_POINTS))]));
    const sum = Object.values(clean).reduce((a, b) => a + b, 0);
    if (sum > 0 && sum <= NEN_POINTS) nc.nen.alloc = clean;
  }
  nc.nen.ko = raw?.nen?.ko === true;
  const hatsu = raw?.nen?.hatsu;
  if (hatsu) setHatsu(nc, hatsu.type, hatsu.form, safeStr(hatsu.name, MAX_NAME));
  (Array.isArray(raw?.nen?.vows) ? [...new Set(raw.nen.vows)] : []).forEach((v) => toggleVow(nc, v));
  (Array.isArray(raw?.alchemy) ? raw.alchemy.slice(0, MAX_CIRCLES) : []).forEach((circle) => {
    const clean = cleanCircle(circle);
    if (!circleProblem(clean)) nc.alchemy.push(clean);
  });
  const b = raw?.battle;
  nc.battle.stance = Object.hasOwn(STANCES, b?.stance) ? b.stance : nc.battle.stance;
  nc.battle.hurt = Object.hasOwn(HURT_PLANS, b?.hurt) ? b.hurt : nc.battle.hurt;
  nc.battle.target = Object.hasOwn(TARGET_PLANS, b?.target) ? b.target : nc.battle.target;
  nc.best = Math.floor(clamp(num(raw?.best), 0, NEG_LEVEL_COUNT));
  nc.wins = Math.floor(clamp(num(raw?.wins), 0, 1e7));
  nc.losses = Math.floor(clamp(num(raw?.losses), 0, 1e7));
  nc.dye = typeof raw?.dye === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw.dye) ? raw.dye : null;
  return nc;
}

export function sanitizeNegWorld(raw, now = Date.now()) {
  const world = emptyNegWorld();
  const seen = new Set();
  for (const c of Array.isArray(raw?.creatures) ? raw.creatures.slice(0, NEG_ROSTER_MAX) : []) {
    if (!c || typeof c !== 'object') continue;
    const nc = sanitizeNeg(c, now);
    if (seen.has(nc.id)) continue;
    seen.add(nc.id);
    world.creatures.push(nc);
  }
  world.shards = Math.floor(clamp(num(raw?.shards), 0, 1e12));
  if (typeof raw?.egg?.id === 'string' && /^[a-f0-9]{16}$/.test(raw.egg.id)) world.egg = { id: raw.egg.id };
  world.kept = Math.floor(clamp(num(raw?.kept), 0, 1e6));
  world.adventure.best = Math.floor(clamp(num(raw?.adventure?.best), 0, NEG_LEVEL_COUNT));
  world.adventure.party = (Array.isArray(raw?.adventure?.party) ? raw.adventure.party : []).map(safeId).filter((id) => seen.has(id)).slice(0, NEG_PARTY);
  world.crossed = (Array.isArray(raw?.crossed) ? raw.crossed : []).slice(-50)
    .filter((x) => x && Object.hasOwn(RACES, x.race))
    .map((x) => ({ name: safeStr(x.name, 60), race: x.race, at: clamp(num(x.at), 0, now) }));
  return world;
}

// ---------- eggs ----------

export function negEggOnOffer(world) {
  if (!world.egg) world.egg = { id: uid() };
  return negEggFromId(world.egg.id);
}

// What keeping the egg on offer costs: nothing for the first few.
export const keepCost = (world) => (world.kept < NEG_EGG.free ? 0 : NEG_EGG.cost);

export function keepProblem(world) {
  if (world.creatures.length >= NEG_ROSTER_MAX) return `The Negative only holds ${NEG_ROSTER_MAX} of yours at once`;
  if (world.shards < keepCost(world)) return `It costs ${keepCost(world)} Void Shards`;
  return null;
}

// Hatches the egg on offer, and puts a new one in its place. Returns the creature, or null.
export function keepNegEgg(world, name, now = Date.now()) {
  if (keepProblem(world) || !cleanName(name)) return null;
  world.shards -= keepCost(world);
  const nc = newNegCreature(name, negEggOnOffer(world), now);
  world.creatures.push(nc);
  world.kept += 1;
  world.egg = null;
  return nc;
}

export function rollNegEggFor(world, rng = Math.random) {
  if (world.shards < NEG_EGG.roll) return false;
  world.shards -= NEG_EGG.roll;
  world.egg = { id: rollNegEgg(rng).id };
  return true;
}

// Lets one go for good.
export function releaseNeg(world, id) {
  const before = world.creatures.length;
  world.creatures = world.creatures.filter((c) => c.id !== id);
  world.adventure.party = world.adventure.party.filter((x) => x !== id);
  return world.creatures.length < before;
}

// ---------- crossing over ----------

// Only one that has won the last level of the Negative's Adventure can cross over.
export function crossProblem(nc) {
  if (!nc) return 'Pick one first';
  if (nc.best < NEG_LEVEL_COUNT) return `It has to win level ${NEG_LEVEL_COUNT} of the Negative first, with it in the party. Its best is ${nc.best || 'none yet'}.`;
  return null;
}

// It leaves the Negative for good, and arrives in the light world as a Hatchling of its race, with
// its gifts and nothing else. Returns the new light-world creature, or null.
export function crossOver(world, nc, now = Date.now()) {
  if (crossProblem(nc) || !world.creatures.includes(nc)) return null;
  const c = newCreature(nc.name, now);
  c.race = nc.race;
  c.heritage = null;
  // Only its own gifts: an egg of the light world would have rolled others.
  c.traits = nc.traits.filter((id) => Object.hasOwn(TRAITS, id));
  c.origin = 'negative';
  c.look.dye = nc.dye ?? null;
  releaseNeg(world, nc.id);
  world.crossed.push({ name: nc.name, race: nc.race, at: now });
  world.crossed = world.crossed.slice(-50);
  return c;
}
