// Fields and small animals. Tile states: 0 wild, 1 tilled, 2 growing, 3 ripe.
// Time-based, so crops keep growing while the game is closed.

import { FRUIT_IDS, FRUIT_FROM_HARVEST } from '../data/fruits.js';
import { clamp, hashStr } from '../lib/util.js';
import { perksOf, addActivityXp, absorbFile, isFull } from '../core/creature.js';
import {
  CROPS, CROP_IDS, PLANT_BYTES, WATER_PUSH_MS, WATER_EVERY_MS,
} from '../data/crafting.js';

export const TILE = 26;
const MAX_COLS = 12;
const MAX_ROWS = 8;
const GROW_MS = 5 * 60 * 1000;
const LAY_MS = 7 * 60 * 1000;
const BREED_MS = 18 * 60 * 1000;

export const ANIMALS = {
  cluck:   { name: 'Cluckling', cost: 2, unlock: 0,  speed: 26, yield: 1 },
  woolbit: { name: 'Woolbit',   cost: 5, unlock: 12, speed: 16, yield: 2 },
  beetle:  { name: 'Beetlet',   cost: 3, unlock: 30, speed: 36, yield: 1 },
};

export const fieldCap = (c) => 1 + perksOf(c).fieldCap + (c.path.line[0] === 'farmer' ? 1 : 0);
export const animalCap = (c) => 2 + perksOf(c).animalCap;
export const growMs = (c) => GROW_MS / (1 + perksOf(c).growRate);

export function addField(c, rect) {
  if (c.farm.fields.length >= fieldCap(c)) return null;
  const cols = clamp(Math.floor(rect.w / TILE), 1, MAX_COLS);
  const rows = clamp(Math.floor(rect.h / TILE), 1, MAX_ROWS);
  const field = {
    id: c.farm.nextId++,
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    cols,
    rows,
    crop: CROP_IDS[0],
    tiles: Array.from({ length: cols * rows }, () => ({ s: 0, t: 0 })),
  };
  c.farm.fields.push(field);
  return field;
}

export function removeField(c, id) {
  c.farm.fields = c.farm.fields.filter((f) => f.id !== id);
}

export function tilePos(field, i) {
  return {
    x: field.x + (i % field.cols) * TILE + TILE / 2,
    y: field.y + Math.floor(i / field.cols) * TILE + TILE / 2,
  };
}

export function farmCounts(c) {
  const out = { wild: 0, tilled: 0, growing: 0, ripe: 0 };
  c.farm.fields.forEach((f) => f.tiles.forEach((t) => {
    if (t.s === 0) out.wild++;
    else if (t.s === 1) out.tilled++;
    else if (t.s === 2) out.growing++;
    else out.ripe++;
  }));
  return out;
}

// Job closest to the creature. Harvest first, then planting, then breaking new ground.
export function nextJob(c, x, y) {
  let best = null;
  let bestScore = Infinity;
  for (const field of c.farm.fields) {
    field.tiles.forEach((tile, i) => {
      if (tile.s === 2) return;
      const pos = tilePos(field, i);
      const priority = tile.s === 3 ? 0 : tile.s === 1 ? 2000 : 4000;
      const score = priority + Math.hypot(pos.x - x, pos.y - y);
      if (score < bestScore) {
        bestScore = score;
        best = { field: field.id, tile: i, kind: tile.s === 3 ? 'harvest' : tile.s === 1 ? 'plant' : 'till', x: pos.x, y: pos.y };
      }
    });
  }
  return best;
}

// A harvest has a very small chance of turning up a Devil Fruit, which goes into the shared pool.
export function doJob(c, job, now, rng = Math.random) {
  const field = c.farm.fields.find((f) => f.id === job.field);
  const tile = field?.tiles[job.tile];
  if (!tile) return null;
  if (job.kind === 'till' && tile.s === 0) {
    tile.s = 1;
    addActivityXp(c, 'farm', 0.4, 'vigor');
    return { kind: 'till' };
  }
  if (job.kind === 'plant' && tile.s === 1) {
    tile.s = 2;
    tile.t = now;
    tile.c = field.crop;
    addActivityXp(c, 'farm', 0.4, 'vigor');
    return { kind: 'plant' };
  }
  if (job.kind === 'harvest' && tile.s === 3) {
    tile.s = 1;
    if (tile.c) c.larder[tile.c] += 1;
    c.farm.store += 1;
    delete tile.c;
    c.record.harvested += 1;
    addActivityXp(c, 'farm', 2.2, 'vigor');
    let fruit = null;
    if (rng() < FRUIT_FROM_HARVEST) {
      fruit = FRUIT_IDS[Math.floor(rng() * FRUIT_IDS.length) % FRUIT_IDS.length];
      c.fruits[fruit] = (c.fruits[fruit] ?? 0) + 1;
    }
    return { kind: 'harvest', fruit };
  }
  return null;
}

// Advance crops, eggs and breeding to `now`. Safe to call with a long gap after a restart.
// scale speeds up time for testing (CREATURE_SPEED).
export function tickFarm(c, now, r = Math.random, scale = 1) {
  const events = [];
  const farm = c.farm;
  const grow = growMs(c) / scale;
  for (const field of farm.fields) {
    for (const tile of field.tiles) {
      if (tile.s === 2 && now - tile.t >= grow) tile.s = 3;
    }
  }
  const lay = LAY_MS / scale;
  const cap = animalCap(c);
  const elapsed = now - farm.lastTick;
  farm.lastTick = now;

  for (const a of farm.animals) {
    const info = ANIMALS[a.kind];
    let laps = 0;
    while (now - a.lay >= lay && laps < 40) {
      a.lay += lay;
      laps++;
      // Each animal eats one crop's worth for every two yields, if there is food around.
      if (farm.store >= 0.5) {
        farm.store = farm.store - 0.5 + info.yield;
        addActivityXp(c, 'farm', 0.6, 'vigor');
        events.push({ kind: 'egg', animal: a.id });
      }
    }
    if (laps === 40) a.lay = now;
  }

  const perks = perksOf(c);
  const pairs = Math.floor(farm.animals.length / 2);
  const breedChance = pairs * (elapsed / (BREED_MS / scale)) * (1 + perks.breedRate);
  if (farm.store >= 6 && farm.animals.length >= 2 && farm.animals.length < cap && r() < Math.min(0.9, breedChance)) {
    const parent = farm.animals[Math.floor(r() * farm.animals.length)];
    farm.store -= 2;
    const baby = { id: farm.nextId++, kind: parent.kind, x: parent.x + 12, y: parent.y + 6, lay: now };
    farm.animals.push(baby);
    addActivityXp(c, 'farm', 4, 'vigor');
    events.push({ kind: 'birth', animal: baby.id, name: ANIMALS[parent.kind].name });
  }
  return events;
}

export const animalUnlocked = (c, kind) => c.record.harvested >= ANIMALS[kind].unlock;

export function adoptAnimal(c, kind, x, y, now) {
  const info = ANIMALS[kind];
  if (!info || !animalUnlocked(c, kind)) return null;
  if (c.farm.store < info.cost || c.farm.animals.length >= animalCap(c)) return null;
  c.farm.store -= info.cost;
  const a = { id: c.farm.nextId++, kind, x, y, lay: now };
  c.farm.animals.push(a);
  addActivityXp(c, 'farm', 3, 'vigor');
  return a;
}

// ---------- things to do with a farm besides wait ----------

export function setFieldCrop(c, fieldId, crop) {
  const field = c.farm.fields.find((f) => f.id === fieldId);
  if (!field || !Object.hasOwn(CROPS, crop)) return false;
  field.crop = crop;
  return true;
}

export const waterReadyIn = (c, now) => Math.max(0, c.farm.wateredAt + WATER_EVERY_MS - now);

// Pushes every growing crop ahead. It has to wait a while before it can water again.
export function waterFields(c, now) {
  if (waterReadyIn(c, now) > 0) return 0;
  let watered = 0;
  c.farm.fields.forEach((field) => field.tiles.forEach((tile) => {
    if (tile.s === 2) {
      tile.t -= WATER_PUSH_MS;
      watered++;
    }
  }));
  if (watered) c.farm.wateredAt = now;
  return watered;
}

// Farmed food, the only food that can grow a mutation.
// Returns what eating it did, or null if it can't: none left, or too full.
export function eatPlant(c, id, now = Date.now()) {
  if (!Object.hasOwn(CROPS, id) || c.larder[id] < 1 || isFull(c)) return null;
  c.larder[id] -= 1;
  const seed = `${c.id}:${id}:${c.absorbed.length}:${now}`;
  const part = (salt) => hashStr(`${salt}:${seed}`).toString(16).padStart(8, '0');
  return absorbFile(c, { ext: CROPS[id].family, name: CROPS[id].name, sha: `${part('a')}${part('b')}`, size: PLANT_BYTES, snippet: '' }, now);
}

// Self-feeding: the whole point of the farmer path.
export function eatFromStore(c) {
  if (c.farm.store < 1 || c.fullness >= 75) return false;
  c.farm.store -= 1;
  c.fullness = clamp(c.fullness + 12, 0, 100);
  c.growth += 0.8;
  return true;
}
