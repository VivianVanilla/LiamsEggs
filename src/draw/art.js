// Puts the hand-made pictures from the art folder on screen. Nothing here invents a picture:
// if a file does not exist yet, a plain dashed box with its file name stands in for it.
// The creature is one still image, stacked from layers and rebuilt only when it changes.

import { STAGES, stageIndex, creatureColors, raceSize, racePictures } from '../core/creature.js';
import { ART_FILES, BEHIND_BODY } from '../data/art-list.js';
import { QUIRKS } from '../data/powers.js';

const images = new Map();
const tintCache = new Map();
let base = '';

export async function loadArt() {
  const listing = await window.api.listArt();
  base = listing.base;
  const known = new Set(ART_FILES.map((a) => a.file));
  await Promise.all(listing.files.filter((f) => known.has(f)).map((file) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      images.set(file, img);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = artUrl(file);
  })));
}

export const hasArt = (file) => images.has(file);
export const artUrl = (file) => base + encodeURI(file);

function missingBox(ctx, file, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  if (w >= 50) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `11px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(file.split('/').pop(), x + w / 2, y + h / 2 + 4, w - 6);
  }
  ctx.restore();
}

// Height is `size`, width keeps the picture's shape, and it stands bottom-center on (x, feetY).
function placed(img, x, feetY, size) {
  const w = (size * img.naturalWidth) / img.naturalHeight;
  return [x - w / 2, feetY - size, w, size];
}

export function drawArt(ctx, file, x, feetY, size) {
  const img = images.get(file);
  if (img) ctx.drawImage(img, ...placed(img, x, feetY, size));
  else missingBox(ctx, file, x - size / 2, feetY - size, size, size);
}

// A copy of a picture with a color laid over it, keeping its lines and its transparent parts.
function tintedCopy(img, color) {
  const copy = document.createElement('canvas');
  copy.width = img.naturalWidth;
  copy.height = img.naturalHeight;
  const cx = copy.getContext('2d');
  cx.drawImage(img, 0, 0);
  cx.globalCompositeOperation = 'multiply';
  cx.fillStyle = color;
  cx.fillRect(0, 0, copy.width, copy.height);
  cx.globalCompositeOperation = 'destination-in';
  cx.drawImage(img, 0, 0);
  return copy;
}

export function drawTinted(ctx, file, x, feetY, size, color) {
  const img = images.get(file);
  if (!img) {
    missingBox(ctx, file, x - size / 2, feetY - size, size, size);
    return;
  }
  const key = `${file}|${color}`;
  if (!tintCache.has(key)) tintCache.set(key, tintedCopy(img, color));
  ctx.drawImage(tintCache.get(key), ...placed(img, x, feetY, size));
}

// ---------- the creature ----------

const BASE_SIZE = 120;
const rigs = new WeakMap();
let pictureScale = 1;

// From the Size setting. Every creature and animal picks it up the next time it is drawn.
export function setPictureScale(value) {
  pictureScale = value;
}

function rigOf(c) {
  let rig = rigs.get(c);
  if (!rig || rig.pictureScale !== pictureScale) {
    rig = { size: Math.round(BASE_SIZE * STAGES[stageIndex(c)].scale * pictureScale * raceSize(c)), sprite: null, pictureScale };
    rigs.set(c, rig);
  }
  return rig;
}

// Call whenever its look changes: a new mutation, new colors, a new job, or it grew.
export const dropRig = (c) => rigs.delete(c);
export const heightOf = (c) => rigOf(c).size;

// Stacks its layers: mutations and Quirks behind, the tinted body, mutations in front, what it
// wears for its powers, Quirks in front, its current job, its charms.
function paintCreature(ctx, c, x, feetY, size) {
  const layer = (file) => {
    const img = images.get(file);
    if (img) ctx.drawImage(img, ...placed(img, x, feetY, size));
  };
  const ids = c.mutations.map((m) => m.id);
  const { speedster, quirks } = c.powers;
  ids.filter((id) => BEHIND_BODY.has(id)).forEach((id) => layer(`mutations/${id}.png`));
  quirks.filter((id) => QUIRKS[id].behind).forEach((id) => layer(`quirks/${id}.png`));
  const body = images.get('creature/body.png');
  if (body) ctx.drawImage(tintedCopy(body, creatureColors(c).body), ...placed(body, x, feetY, size));
  else missingBox(ctx, 'creature/body.png', x - size / 2, feetY - size, size, size);
  ids.filter((id) => !BEHIND_BODY.has(id)).forEach((id) => layer(`mutations/${id}.png`));
  racePictures(c).forEach((id) => layer(`races/${id}.png`));
  if (speedster) layer('powers/speedster.png');
  if (c.powers.technique) layer(`techniques/${c.powers.technique}.png`);
  if (c.powers.technique2) layer(`techniques/${c.powers.technique2}.png`);
  if (c.legendary) layer(`legendary/${c.legendary}.png`);
  quirks.filter((id) => !QUIRKS[id].behind).forEach((id) => layer(`quirks/${id}.png`));
  const job = c.path.line[c.path.line.length - 1];
  if (job) layer(`jobs/${job}.png`);
  // Worn charms hang small at its neck.
  const charm = size * 0.085;
  c.gear.worn.forEach((id, i) => {
    const img = images.get(`crafts/${id}.png`);
    if (img) ctx.drawImage(img, x + (i ? 0.02 : -0.02 - 0.085) * size, feetY - size * 0.765, charm, charm);
  });
}

function spriteOf(c) {
  const rig = rigOf(c);
  if (!rig.sprite) {
    const dpr = window.devicePixelRatio || 1;
    const w = rig.size * 2;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w * dpr);
    canvas.height = Math.ceil(rig.size * dpr);
    const cx = canvas.getContext('2d');
    cx.scale(dpr, dpr);
    paintCreature(cx, c, rig.size, rig.size, rig.size);
    rig.sprite = { canvas, w };
  }
  return rig.sprite;
}

// Draws it standing on (x, y). flat lays the picture on its side, for a knocked-out fighter.
export function drawCreature(ctx, c, x, y, { dir = 1, alpha = 1, flat = false } = {}) {
  const { canvas, w } = spriteOf(c);
  const size = heightOf(c);
  ctx.save();
  if (alpha !== 1) ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  if (flat) {
    ctx.translate(-dir * size * 0.5, -size * 0.1);
    ctx.rotate(dir * Math.PI * 0.5);
  }
  // Pictures face right; a box with a file name in it stays readable either way.
  if (hasArt('creature/body.png')) ctx.scale(dir, 1);
  ctx.drawImage(canvas, -w / 2, -size, w, size);
  ctx.restore();
}

// ---------- its Stand and its afterimages ----------

const STAND_SIZE = 1.15;
const STAND_ALPHA = 0.85;

// A Stand is its own still picture, so in a fight it can leave its user's side.
export function drawStand(ctx, c, x, y, dir = 1) {
  const img = images.get(`stands/${c.powers.stand}.png`);
  if (!img) return;
  ctx.save();
  ctx.globalAlpha *= STAND_ALPHA;
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.drawImage(img, ...placed(img, 0, 0, heightOf(c) * STAND_SIZE));
  ctx.restore();
}

// Where a Stand floats when it is just keeping its user company.
export const standSpot = (c, x, y, dir) => ({ x: x - dir * heightOf(c) * 0.32, y: y - heightOf(c) * 0.03 });

// A speedster leaves copies of the same still picture where it just was.
export function drawAfterimages(ctx, c, trail, x, y) {
  trail.forEach((p, i) => {
    if (Math.hypot(p.x - x, p.y - y) > AFTERIMAGE_GAP) drawCreature(ctx, c, p.x, p.y, { dir: p.dir, alpha: 0.1 + i * 0.05 });
  });
}

export const AFTERIMAGE_GAP = 10;

// Small picture for the note panels. Only repainted if the creature changed.
export function drawPortrait(canvas, c) {
  const rig = rigOf(c);
  if (canvas.painted === rig) return;
  canvas.painted = rig;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 84;
  const h = canvas.clientHeight || 96;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const size = Math.min(h - 2, w);
  const stand = images.get(`stands/${c.powers.stand}.png`);
  if (stand) {
    ctx.globalAlpha = STAND_ALPHA;
    ctx.drawImage(stand, ...placed(stand, w / 2 - size * 0.2, h - 1, size));
    ctx.globalAlpha = 1;
  }
  paintCreature(ctx, c, w / 2, h - 1, size);
}

// ---------- monsters ----------

export const monsterHeight = (def) => def.size * pictureScale;

export function drawMonster(ctx, def, x, y, { dir = 1, alpha = 1, flat = false } = {}) {
  const file = `monsters/${def.id}.png`;
  const size = monsterHeight(def);
  ctx.save();
  if (alpha !== 1) ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  if (flat) {
    ctx.translate(-dir * size * 0.5, -size * 0.1);
    ctx.rotate(dir * Math.PI * 0.5);
  }
  if (hasArt(file)) ctx.scale(dir, 1);
  drawArt(ctx, file, 0, 0, size);
  ctx.restore();
}

// ---------- small animals ----------

const ANIMAL_SIZE = { cluck: 30, woolbit: 36, beetle: 22, blob: 32, shadow: 58 };

export function drawAnimal(ctx, kind, x, y, { dir = 1, mul = 1 } = {}) {
  const file = `animals/${kind}.png`;
  ctx.save();
  ctx.translate(x, y);
  if (hasArt(file)) ctx.scale(dir, 1);
  drawArt(ctx, file, 0, 0, ANIMAL_SIZE[kind] * mul * pictureScale);
  ctx.restore();
}
