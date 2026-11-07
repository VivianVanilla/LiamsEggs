// Everything on screen besides the creature: dropped files, fields and the arena.
// Pictures all come from the art folder. The only things drawn here are plain game marks:
// text, health bars, border lines, and squares showing colors actually mined from your screen.

import { clamp } from '../lib/util.js';
import { TILE, growMs, tilePos } from '../sim/farm.js';
import { drawArt, drawTinted, drawCreature, drawStand, drawAfterimages, drawAnimal, drawMonster, monsterHeight, heightOf, hasArt } from './art.js';
import { CHOSEN_COLOR } from '../data/chosen.js';

// Your Chosen glows gold, out on your screen and in every fight.
export const CHOSEN_GLOW = `drop-shadow(0 0 3px ${CHOSEN_COLOR}) drop-shadow(0 0 7px ${CHOSEN_COLOR})`;

const TEXT_EDGE = 'rgba(10,12,20,0.72)';
const FONT = '"Segoe UI", system-ui, sans-serif';

// ---------- floating text, mined squares and holes ----------

export class Fx {
  constructor() {
    this.chunks = [];
    this.floats = [];
    this.holes = [];
  }

  // A square of mined color that flies to a moving target.
  homing(x, y, color, target, size = 6) {
    this.chunks.push({ x, y, color, size, target, t: 0, sx: x, sy: y, arc: 30 + Math.random() * 50 });
  }

  float(x, y, text, color = '#fff', size = 14, life = 1.4) {
    if (this.floats.length > 60) this.floats.shift();
    const float = { x, y, text, color, size, life, t: 0 };
    this.floats.push(float);
    return float;
  }

  // Big text for a named move. Two at once stack up rather than landing on top of each other.
  shout(x, y, text, color, size = 23, life = 2) {
    const heightNow = (f) => f.y - (f.t / f.life) * 30;
    const taken = (top) => this.floats.some((f) => f.loud && Math.abs(heightNow(f) - top) < size + 2 && Math.abs(f.x - x) < 190);
    let top = y;
    for (let tries = 0; tries < 6 && taken(top); tries++) top -= size + 3;
    this.float(x, top, text, color, size, life).loud = true;
  }

  // The rumbling letters that hang around a Stand user.
  menace(x, y, color) {
    [[-54, -92, 26], [50, -70, 21], [-40, -34, 18]].forEach(([dx, dy, size]) => this.float(x + dx, y + dy, 'ゴゴゴ', color, size, 2.6));
  }

  hole(x, y, w, h, color) {
    this.holes.push({ x, y, w, h, color, t: 0 });
  }

  // True while something is mid-flight or fading, so the screen has to keep redrawing.
  busy() {
    return this.chunks.length + this.floats.length > 0 || this.holes.some((h) => h.t > 38);
  }

  update(dt) {
    for (const p of this.chunks) {
      p.t += dt * 1.9;
      const k = Math.min(1, p.t);
      p.x = p.sx + (p.target.x - p.sx) * k;
      p.y = p.sy + (p.target.y - 26 - p.sy) * k - Math.sin(k * Math.PI) * p.arc;
    }
    this.chunks = this.chunks.filter((p) => p.t < 1);
    this.floats.forEach((f) => { f.t += dt; });
    this.floats = this.floats.filter((f) => f.t < f.life);
    this.holes.forEach((h) => { h.t += dt; });
    this.holes = this.holes.filter((h) => h.t < 45);
  }

  drawGround(ctx) {
    for (const h of this.holes) {
      const fade = h.t > 38 ? 1 - (h.t - 38) / 7 : 1;
      ctx.globalAlpha = 0.72 * fade;
      ctx.fillStyle = '#101014';
      ctx.fillRect(h.x + 1, h.y + 1, h.w - 2, h.h - 2);
      ctx.globalAlpha = 0.65 * fade;
      ctx.strokeStyle = h.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(h.x + 1, h.y + 1, h.w - 2, h.h - 2);
    }
    ctx.globalAlpha = 1;
  }

  drawTop(ctx) {
    for (const p of this.chunks) {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    // Text near the edge of the screen slides in far enough to be read in full.
    const room = ctx.canvas.width / (ctx.getTransform().a || 1);
    for (const f of this.floats) {
      const k = f.t / f.life;
      ctx.globalAlpha = k < 0.7 ? 1 : (1 - k) / 0.3;
      ctx.font = `600 ${f.size}px ${FONT}`;
      ctx.strokeStyle = TEXT_EDGE;
      ctx.lineWidth = 2.8;
      const half = ctx.measureText(f.text).width / 2 + 4;
      const x = Math.min(Math.max(f.x, half), Math.max(half, room - half));
      const y = f.y - k * 30;
      ctx.strokeText(f.text, x, y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, x, y);
    }
    ctx.globalAlpha = 1;
  }
}

// A hint that bobs up and down over something, in big letters. Text only.
export function drawHint(ctx, text, x, y, t) {
  const bob = Math.sin(t * 6) * 4;
  ctx.save();
  ctx.font = '900 17px "Segoe UI Black", "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#000';
  ctx.strokeText(text, x, y + bob);
  ctx.fillStyle = Math.floor(t * 3) % 2 ? '#ffd60a' : '#ff9500';
  ctx.fillText(text, x, y + bob);
  ctx.font = '900 15px "Segoe UI Black", "Arial Black", sans-serif';
  ctx.strokeText('\u25BC', x, y + 16 + bob);
  ctx.fillText('\u25BC', x, y + 16 + bob);
  ctx.restore();
}

function label(ctx, text, x, y, size = 11, color = '#fff') {
  ctx.font = `600 ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = TEXT_EDGE;
  ctx.lineWidth = 2.6;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

// ---------- files lying about ----------

export function drawFileSprite(ctx, ext, x, y, name = '') {
  drawArt(ctx, `food/${ext}.png`, x, y, 34);
  if (name) label(ctx, name, x, y + 13, 10.5);
}

// ---------- speech ----------

export function drawBubble(ctx, text, x, y, screenW) {
  ctx.font = `500 12.5px ${FONT}`;
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > 180 && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20;
  const lh = 16.5;
  const h = lines.length * lh + 10;
  const bx = clamp(x - w / 2, 6, screenW - w - 6);
  const by = Math.max(6, y - h - 4);
  ctx.fillStyle = 'rgba(255,255,255,0.97)';
  ctx.strokeStyle = 'rgba(10,12,20,0.45)';
  ctx.lineWidth = 1;
  ctx.fillRect(bx, by, w, h);
  ctx.strokeRect(bx + 0.5, by + 0.5, w - 1, h - 1);
  ctx.fillStyle = '#14151d';
  ctx.textAlign = 'left';
  lines.forEach((l, i) => ctx.fillText(l, bx + 10, by + 17 + i * lh));
}

// ---------- fields ----------

export function drawFields(ctx, c, now, speed) {
  const grow = growMs(c) / speed;
  for (const field of c.farm.fields) {
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(field.x - 0.5, field.y - 0.5, field.cols * TILE + 1, field.rows * TILE + 1);
    field.tiles.forEach((tile, i) => {
      if (tile.s === 0) return;
      const { x, y } = tilePos(field, i);
      const feet = y + TILE / 2;
      drawArt(ctx, 'farm/soil.png', x, feet, TILE);
      if (tile.s === 2) drawArt(ctx, (now - tile.t) / grow < 0.5 ? 'farm/crop-1.png' : 'farm/crop-2.png', x, feet, TILE);
      else if (tile.s === 3) drawArt(ctx, tile.c ? `farm/${tile.c}.png` : 'farm/crop-3.png', x, feet, TILE);
    });
  }
}

// ---------- arena ----------

export function drawArenaFloor(ctx, bout) {
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = bout.stopLeft > 0 ? '#9a9aa2' : bout.deadly || bout.t > 60 ? '#ff6b5e' : 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.ellipse(bout.cx, bout.cy, bout.r * 1.04, bout.r * 0.7, 0, 0, Math.PI * 2);
  ctx.stroke();
}

const MINION_ART = { bug: 'beetle', beast: 'woolbit', blob: 'blob', shadow: 'shadow', hound: 'shadow' };

// Thrown shots and ranged moves, each tinted to its move's color.
const BOLT_SIZE = 15;

export function drawBolts(ctx, bout) {
  if (!hasArt('fx/bolt.png')) return;
  for (const b of bout.bolts) drawTinted(ctx, 'fx/bolt.png', b.x, b.y + BOLT_SIZE / 2, BOLT_SIZE, b.def.color);
}

// A vein of color showing where it just dug. Rest the mouse on it and click before it fades.
export function drawVeins(ctx, veins) {
  ctx.lineWidth = 2;
  for (const v of veins) {
    ctx.globalAlpha = clamp(v.left * 1.5, 0.25, 1);
    ctx.fillStyle = v.color;
    ctx.fillRect(v.x, v.y, v.size, v.size);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(v.x - 1, v.y - 1, v.size + 2, v.size + 2);
    ctx.strokeStyle = '#14151d';
    ctx.strokeRect(v.x - 3, v.y - 3, v.size + 6, v.size + 6);
  }
  ctx.globalAlpha = 1;
}

export function drawFighter(ctx, f, bout) {
  // Stopped time drains the color out of everyone caught in it. Your Chosen glows through it.
  const filters = [f.alive && bout?.frozen(f) && 'grayscale(1)', f.alive && f.chosen && CHOSEN_GLOW].filter(Boolean);
  if (filters.length) ctx.filter = filters.join(' ');
  if (f.minion) {
    ctx.globalAlpha = f.alive ? 1 : clamp(1 - f.deadT / 0.6, 0, 1);
    drawAnimal(ctx, MINION_ART[f.minion], f.x, f.y, { dir: f.dir });
    ctx.globalAlpha = 1;
  } else if (f.c) {
    if (f.alive && f.trail) drawAfterimages(ctx, f.c, f.trail, f.x, f.y);
    if (f.alive && f.stand) drawStand(ctx, f.c, f.stand.x, f.stand.y, f.stand.dir);
    drawCreature(ctx, f.c, f.x, f.y, { dir: f.dir, flat: !f.alive, alpha: f.alive ? 1 : clamp(1.2 - f.deadT / 8, 0.4, 1), grow: f.grow ?? 1 });
  } else if (f.monster) {
    drawMonster(ctx, f.monster, f.x, f.y, { dir: f.dir, flat: !f.alive, alpha: f.alive ? 1 : clamp(1.2 - f.deadT / 8, 0.4, 1) });
  }
  ctx.filter = 'none';
}

function statusTag(f, bout) {
  if (bout?.fuses.some((b) => b.target === f)) return ['BOMB', '#ff9ac8'];
  if (f.poison) return ['poison', '#b6e06a'];
  if (f.silence > 0) return ['no moves', '#e4e6ee'];
  if (bout?.frozen(f)) return ['stopped', '#d0d0d8'];
  return null;
}

export function drawHealthBar(ctx, f, bout) {
  if (f.minion || !f.alive || !(f.c || f.monster)) return;
  const w = 46;
  const x = f.x - w / 2;
  const y = f.y - (f.c ? heightOf(f.c) * (f.grow ?? 1) : monsterHeight(f.monster)) - 8;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x, y, w, 3.6);
  const k = clamp(f.hp / f.maxHp, 0, 1);
  ctx.fillStyle = k > 0.5 ? '#7ee05a' : k > 0.25 ? '#ffd66b' : '#ff6b5e';
  ctx.fillRect(x, y, Math.max(2, w * k), 3.6);
  label(ctx, f.name, f.x, y - 4, 11, f.chosen ? CHOSEN_COLOR : '#fff');
  const tag = statusTag(f, bout);
  if (tag) label(ctx, tag[0], f.x, y - 17, 11, tag[1]);
}

