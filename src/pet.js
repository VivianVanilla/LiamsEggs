// A creature on your screen: one still picture that slides from place to place. Behaviours
// are generator scripts: each runs a frame at a time and yields, which keeps "go over there,
// wait a moment, then eat" easy to read.

import { toast } from './ui/flair.js';
import { clamp } from './lib/util.js';
import { G, api, saveCreature, inBout } from './state.js';
import {
  computeStats, perksOf, eatSnack, addColor, addActivityXp, creatureColors, stageOf, isFull, pathChoice,
} from './core/creature.js';
import { FOODS } from './data/foods.js';
import { MUTATIONS } from './data/mutations.js';
import { STANDS, SPEEDSTER, POWER_MOVES, LEGENDARY } from './data/powers.js';
import { FRUITS } from './data/fruits.js';
import { VEIN_CHANCE, VEIN_SECONDS, VEIN_UNITS, VEIN_GEM_CHANCE, GEM_CHANCE, CROPS } from './data/crafting.js';
import { nextJob, doJob, eatFromStore, eatPlant } from './sim/farm.js';
import { isNurse } from './core/family.js';
import { CARE_HUNGRY, CARE_ROUND, CARE_XP } from './data/family.js';
import { dropRig, drawCreature, drawStand, standSpot, drawAfterimages, AFTERIMAGE_GAP, heightOf } from './draw/art.js';
import { drawBubble } from './draw/scene.js';

const IDLE_LINES = ['hm', 'nice screen', 'what does that button do', 'i live here now', 'is that a spreadsheet', 'you are doing great', 'hello', 'i could eat'];
const HUNGRY_LINES = ['hungry', 'got any snacks', 'feed me', 'i could eat a whole melon'];
const CARE_LINES = ['how are we feeling', 'drink some water', 'say aah', 'deep breaths', 'you look healthy', 'any aches?'];
const THANKS_LINES = ['thank you nurse', 'mmm', 'i feel better', 'that hit the spot'];
const anyOf = (list) => list[Math.floor(Math.random() * list.length)];

export class Pet {
  constructor(c, x, y) {
    this.c = c;
    this.x = x;
    this.y = y;
    this.dir = 1;
    this.t = 0;
    this.dt = 0;
    this.script = null;
    this.kind = null;
    this.held = false;
    this.still = false; // stays put, for example during a puzzle duel
    this.text = '';
    this.textUntil = 0;
    this.jobWait = 2;
    this.stopRequested = false;
    this.nextHungry = 30;
    this.nextRound = CARE_ROUND * (0.3 + Math.random() * 0.4); // a nurse's next check-up
    this.trail = []; // where a speedster has just been
  }

  // Files dropped for this creature, waiting to be eaten.
  myMeals() {
    return G.meals.filter((m) => m.pet === this || (!m.pet && this === G.pet));
  }

  walkSpeed() {
    return (38 + computeStats(this.c).speed * 2.6) * (this.c.powers.speedster ? SPEEDSTER.walkMul : 1);
  }

  // True while afterimages are still catching up, so the screen has to keep redrawing.
  trailing() {
    return this.trail.some((p) => Math.hypot(p.x - this.x, p.y - this.y) > AFTERIMAGE_GAP);
  }

  say(text, seconds = 3.6, force = false) {
    if (G.settings.quiet && !force) return;
    this.text = text;
    this.textUntil = this.t + seconds;
  }

  bounds() {
    const { work } = G.screen;
    const top = G.settings.bottomOnly ? work.y + work.h - 90 : work.y + 90;
    return { x0: work.x + 30, x1: work.x + work.w - 30, y0: top, y1: work.y + work.h - 8 };
  }

  hitRect() {
    const size = heightOf(this.c);
    const pad = 12;
    return { x: this.x - size * 0.4 - pad, y: this.y - size - pad, w: size * 0.8 + pad * 2, h: size + pad * 2 };
  }

  cancel() {
    this.script = null;
    this.kind = null;
  }

  run(gen, kind) {
    this.script = gen;
    this.kind = kind;
  }

  // Called by the game when something new needs doing; idling always gives way.
  interrupt() {
    if (this.kind === 'idle') this.cancel();
  }

  update(dt) {
    this.dt = dt;
    this.t += dt;
    if (this.text && this.t > this.textUntil) this.text = '';
    if (this.c.powers.speedster) {
      this.trail.push({ x: this.x, y: this.y, dir: this.dir });
      if (this.trail.length > 5) this.trail.shift();
    }
    if (this.held) return;
    if (G.dragHover > 0) {
      if (this.kind === 'idle') this.cancel();
      if (!this.script) return;
    }
    if (this.still && this.kind !== 'work' && this.kind !== 'meal' && !this.myMeals().length) {
      if (this.kind === 'idle') this.cancel();
      return;
    }
    if (!this.script) this.startNext();
    if (this.script && this.script.next().done) this.cancel();
  }

  startNext() {
    if (this.myMeals().length) {
      this.run(this.serveMeals(), 'meal');
      return;
    }
    this.jobWait -= 0.5;
    if (isNurse(this.c)) {
      const care = this.careFor();
      if (care) {
        this.run(care, 'care');
        return;
      }
    }
    const farm = this.c.farm;
    // The food store is shared, so any hungry creature eats from it, farmer or not.
    if (this.jobWait <= 0 && farm.store >= 1 && this.c.fullness < 70) {
      this.run(this.snack(), 'farm');
      return;
    }
    if (farm.fields.length && this.jobWait <= 0) {
      const job = nextJob(this.c, this.x, this.y);
      if (job) {
        this.run(this.farmJob(job), 'farm');
        return;
      }
    }
    this.run(this.idle(), 'idle');
  }

  // ---------- small building blocks ----------

  * wait(seconds) {
    while (seconds > 0) {
      seconds -= this.dt;
      yield;
    }
  }

  * walk(x, y, run = false) {
    const b = this.bounds();
    x = clamp(x, b.x0, b.x1);
    y = clamp(y, G.screen.work.y + 30, b.y1);
    const speed = this.walkSpeed() * (run ? 1.7 : 1);
    for (;;) {
      const dx = x - this.x;
      const dy = y - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 3) return;
      const step = Math.min(d, speed * this.dt);
      this.x += (dx / d) * step;
      this.y += (dy / d) * step;
      if (Math.abs(dx) > 1) this.dir = dx > 0 ? 1 : -1;
      yield;
    }
  }

  // ---------- idling ----------

  * idle() {
    const b = this.bounds();
    const roll = Math.random();

    if (this.c.fullness < 20 && this.t > this.nextHungry) {
      this.nextHungry = this.t + 180 + Math.random() * 180;
      this.say(HUNGRY_LINES[Math.floor(Math.random() * HUNGRY_LINES.length)]);
      yield* this.wait(3);
      return;
    }
    if (roll < 0.55) {
      const reach = 110 + Math.random() * 340;
      const a = Math.random() * Math.PI * 2;
      yield* this.walk(clamp(this.x + Math.cos(a) * reach, b.x0, b.x1), clamp(this.y + Math.sin(a) * reach * 0.6, b.y0, b.y1));
      yield* this.wait(1.5 + Math.random() * 4);
    } else if (roll < 0.82) {
      yield* this.wait(6 + Math.random() * 12);
    } else if (roll < 0.92 && G.cursor.x >= 0) {
      // Goes and stands near your cursor for a bit.
      yield* this.walk(clamp(G.cursor.x + (this.x < G.cursor.x ? -46 : 46), b.x0, b.x1), clamp(G.cursor.y + 58, b.y0, b.y1));
      this.dir = G.cursor.x >= this.x ? 1 : -1;
      yield* this.wait(2);
    } else {
      this.say(IDLE_LINES[Math.floor(Math.random() * IDLE_LINES.length)]);
      yield* this.wait(3);
    }
  }

  // ---------- eating ----------

  * serveMeals() {
    for (let meal = this.myMeals()[0]; meal; meal = this.myMeals()[0]) {
      G.meals = G.meals.filter((m) => m !== meal);
      if (isFull(this.c)) {
        this.say('too full. later.', 3, true);
        yield* this.wait(1.2);
        G.meals = G.meals.filter((m) => !this.myMeals().includes(m));
        return;
      }
      yield* this.eatFile(meal);
    }
  }

  * eatFile(meal) {
    const sprite = { ext: meal.ext, name: meal.name, x: meal.x, y: meal.y, carried: false };
    G.drops.push(sprite);
    const side = this.x < sprite.x ? -1 : 1;
    yield* this.walk(sprite.x + side * 24, sprite.y, true);
    this.dir = -side;
    sprite.carried = true;
    for (let k = 0; k < 1.2; k += this.dt) {
      sprite.x = this.x + this.dir * heightOf(this.c) * 0.2;
      sprite.y = this.y - heightOf(this.c) * 0.45;
      sprite.shrink = 1 - k / 1.2;
      yield;
    }
    G.drops = G.drops.filter((d) => d !== sprite);

    let outcome = null;
    api.consumeFood(meal.path).then(
      (food) => { outcome = { food }; },
      (err) => { outcome = { error: String(err?.message ?? err) }; },
    );
    while (!outcome) yield;

    if (outcome.error) {
      this.say('it got away', 3, true);
      yield* this.wait(1);
      return;
    }

    const stageBefore = stageOf(this.c).name;
    // A file dragged onto it only counts as a snack. Mutations come from the farm.
    const res = eatSnack(this.c);
    if (!res) {
      this.say('too full. later.', 3, true);
      return;
    }
    meal.onDone?.(res);
    yield* this.digest(res, meal.ext, stageBefore);
  }

  // Simple food from the Feed note. Returns what is stopping it, if anything.
  feedSnack() {
    if (this.kind === 'work' || this.kind === 'meal') return 'busy right now';
    const stageBefore = stageOf(this.c).name;
    const res = eatSnack(this.c);
    if (!res) return 'too full. later.';
    this.cancel();
    this.run(this.digest(res, null, stageBefore), 'meal');
    return null;
  }

  // Farmed food from the Feed note. Returns what is stopping it, if anything.
  eatPlant(id) {
    if (this.kind === 'work' || this.kind === 'meal') return 'busy right now';
    if (isFull(this.c)) return 'too full. later.';
    const stageBefore = stageOf(this.c).name;
    const res = eatPlant(this.c, id);
    if (!res) return 'none left';
    this.cancel();
    this.run(this.digest(res, CROPS[id].family, stageBefore), 'meal');
    return null;
  }

  // What happens once something is eaten.
  * digest(res, ext, stageBefore) {
    dropRig(this.c);
    G.fx.float(this.x, this.y - heightOf(this.c) - 14, res.seen ? `+${res.nutrition.toFixed(1)} (tasted that)` : `+${res.nutrition.toFixed(1)} growth`, '#fff', 13);
    saveCreature(this.c);

    if (res.legendary) {
      const { name, color } = LEGENDARY[res.legendary];
      G.fx.shout(this.x, this.y - heightOf(this.c) - 30, `LEGENDARY MUTATION: ${name}`, color, 24, 4);
      toast(`LEGENDARY MUTATION: ${name}!!!`, 'rare');
      this.say('there are two of me in here now', 4.5, true);
      yield* this.wait(1.6);
    }
    if (res.mutation) {
      const name = MUTATIONS[res.mutation.id].name;
      G.fx.float(this.x, this.y - heightOf(this.c) - 22, `MUTATION: ${name}`, FOODS[ext].color, 18);
      toast(`NEW MUTATION: ${name.toUpperCase()}!`, 'good');
      this.say(`i grew ${name.toLowerCase()}`, 3.5, true);
      yield* this.wait(1.2);
    } else if (res.seen) {
      this.say('i have eaten this before', 3);
    } else if (res.noRoom) {
      this.say('no room to grow anything new', 3);
    }
    if (res.stageUp) {
      G.fx.float(this.x, this.y - heightOf(this.c) - 34, `Now a ${stageOf(this.c).name}!`, '#ffe9a3', 18);
      toast(`${this.c.name.toUpperCase()} GREW UP: ${stageOf(this.c).name.toUpperCase()}!`, 'good');
      this.say(`i am a ${stageOf(this.c).name.toLowerCase()} now`, 3.5, true);
      yield* this.wait(1.2);
    }
    if (stageBefore !== stageOf(this.c).name || res.mutation || res.legendary) G.onCreatureChanged?.();
    if (pathChoice(this.c)) G.onPathReady?.(this.c);
  }

  // ---------- mining color ----------

  // area: { x, y, w, h, cols, rows, colors }
  * mineRun(area) {
    this.stopRequested = false;
    const cw = area.w / area.cols;
    const ch = area.h / area.rows;
    const fromLeft = this.x < area.x + area.w / 2;
    const fromTop = this.y < area.y + area.h / 2;
    let dug = 0;
    const gemsBefore = this.c.record.gems;
    this.say('digging', 2);

    outer:
    for (let r = 0; r < area.rows; r++) {
      const row = fromTop ? r : area.rows - 1 - r;
      for (let k = 0; k < area.cols; k++) {
        const col = (fromLeft !== (r % 2 === 1)) ? k : area.cols - 1 - k;
        if (this.stopRequested) break outer;
        if (this.c.fullness < 2) {
          this.say('too hungry to dig', 3.5, true);
          break outer;
        }
        if (this.myMeals().length) yield* this.serveMeals();

        const color = area.colors[row * area.cols + col];
        const cx = area.x + col * cw + cw / 2;
        const cy = area.y + row * ch + ch / 2;
        const side = this.x <= cx ? -1 : 1;
        yield* this.walk(cx + side * (cw / 2 + 12), cy + ch / 2 + 4);
        this.dir = -side;
        yield* this.wait(1.04 / (1 + perksOf(this.c).mineSpeed));
        this.bustCell(cx, cy, cw, ch, color);
        dug++;
        yield;
      }
    }
    saveCreature(this.c);
    G.onCreatureChanged?.();
    const gems = this.c.record.gems - gemsBefore;
    if (dug > 0) this.say(gems ? `${dug} chunks and ${gems} gem${gems > 1 ? 's' : ''}` : `${dug} chunks of color`, 3.4, true);
    yield* this.wait(1.2);
    if (pathChoice(this.c)) G.onPathReady?.(this.c);
  }

  bustCell(cx, cy, cw, ch, color) {
    const c = this.c;
    const [r, g, b] = color;
    const css = `rgb(${r},${g},${b})`;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const gem = sat > 0.3 && Math.random() < GEM_CHANCE + perksOf(c).gemChance;
    addColor(c, r, g, b, gem ? 18 : 1 + sat * 3);
    addActivityXp(c, 'mine', gem ? 4 : 0.9 + sat * 0.9, sat > 0.5 ? 'might' : 'speed');
    c.fullness = clamp(c.fullness - 0.32, 0, 100);
    c.record.mined += 1;
    if (gem) {
      c.record.gems += 1;
      c.bank.gems += 1;
    }
    dropRig(c);
    if (Math.random() < VEIN_CHANCE) G.veins.push({ x: cx - 13, y: cy - 13, size: 26, color: css, rgb: color, left: VEIN_SECONDS, pet: this });

    G.fx.hole(cx - cw / 2, cy - ch / 2, cw, ch, css);
    // A Stand built for punching does the digging, and says so.
    const rush = c.powers.stand && POWER_MOVES[STANDS[c.powers.stand].moves[0]];
    if (rush?.kind === 'rush' && Math.random() < 0.6) G.fx.float(cx, cy - 14, rush.cry.split(' ')[0], rush.color, 15);
    const chunks = gem ? 6 : 2;
    for (let i = 0; i < chunks; i++) {
      G.fx.homing(cx + (Math.random() - 0.5) * cw * 0.5, cy + (Math.random() - 0.5) * ch * 0.5, css, this, gem ? 8 : 5);
    }
    if (gem) G.fx.float(cx, cy - 8, 'GEM!', css, 19);
  }

  // You got there in time: a bonus of that color, and maybe a gem.
  collectVein(vein) {
    const c = this.c;
    const [r, g, b] = vein.rgb;
    addColor(c, r, g, b, VEIN_UNITS);
    const gem = Math.random() < VEIN_GEM_CHANCE;
    if (gem) {
      c.record.gems += 1;
      c.bank.gems += 1;
    }
    dropRig(c);
    G.fx.float(vein.x + vein.size / 2, vein.y - 8, gem ? 'VEIN! GEM!' : 'VEIN!', vein.color, 18);
    for (let i = 0; i < 4; i++) G.fx.homing(vein.x + vein.size / 2, vein.y + vein.size / 2, vein.color, this, 6);
    saveCreature(this.c);
  }

  // ---------- farming ----------

  * farmJob(job) {
    yield* this.walk(job.x - 15, job.y + 12);
    this.dir = 1;
    yield* this.wait(job.kind === 'till' ? 1.1 : 0.55);
    const res = doJob(this.c, job, Date.now());
    if (res?.kind === 'harvest') {
      G.fx.homing(job.x, job.y, creatureColors(this.c).accent, this, 6);
      G.fx.float(job.x, job.y - 12, '+1', '#fff', 12);
      if (res.fruit) {
        const fruit = FRUITS[res.fruit];
        G.fx.shout(job.x, job.y - 40, `DEVIL FRUIT: ${fruit.name}!`, fruit.color, 22, 4);
        toast(`YOU FOUND A DEVIL FRUIT: ${fruit.name}!!!`, 'rare');
        this.say('there was something strange growing in there', 4, true);
        saveCreature(this.c);
      } else if (Math.random() < 0.25) saveCreature(this.c);
    }
    if (pathChoice(this.c)) G.onPathReady?.(this.c);
    yield* this.wait(job.kind === 'harvest' ? 0.3 : 0.6);
  }

  // ---------- a nurse's rounds ----------

  // The hungriest teammate gets a snack. Otherwise, now and then, someone gets a check-up.
  careFor() {
    const others = G.team.filter((m) => m.pet !== this && !m.pet.held && !inBout(m.c));
    if (!others.length) return null;
    const hungry = others.filter((m) => m.c.fullness < CARE_HUNGRY && !isFull(m.c)).sort((a, b) => a.c.fullness - b.c.fullness)[0];
    if (hungry) return this.tend(hungry, true);
    if (this.t < this.nextRound) return null;
    this.nextRound = this.t + CARE_ROUND * (0.7 + Math.random() * 0.6);
    return this.tend(anyOf(others), false);
  }

  * tend(m, feed) {
    const other = m.pet;
    // It keeps up if they wander off, but gives up after a few tries.
    for (let tries = 0; tries < 4; tries++) {
      yield* this.walk(other.x + (this.x < other.x ? -44 : 44), other.y);
      if (Math.hypot(this.x - other.x, this.y - other.y) < 70) break;
    }
    if (!G.team.includes(m)) return;
    this.dir = other.x >= this.x ? 1 : -1;
    yield* this.wait(0.6);
    if (feed) {
      const res = eatSnack(m.c);
      if (res) {
        G.fx.float(other.x, other.y - heightOf(m.c) - 12, 'a snack from the nurse', '#ffc2dc', 13);
        other.say(anyOf(THANKS_LINES), 2.5);
        if (res.stageUp) {
          dropRig(m.c);
          G.fx.float(other.x, other.y - heightOf(m.c) - 30, `Now a ${stageOf(m.c).name}!`, '#ffe9a3', 18);
          if (G.creature === m.c) G.onCreatureChanged?.();
        }
        addActivityXp(this.c, 'care', CARE_XP.feed);
        saveCreature(m.c);
        saveCreature(this.c);
      }
    } else {
      this.say(anyOf(CARE_LINES), 2.5);
      addActivityXp(this.c, 'care', CARE_XP.round);
    }
    if (pathChoice(this.c)) G.onPathReady?.(this.c);
    yield* this.wait(1.2);
  }

  * snack() {
    const ate = eatFromStore(this.c);
    yield* this.wait(1);
    if (ate) G.fx.float(this.x, this.y - heightOf(this.c) - 6, 'yum', '#fff', 13);
    this.jobWait = 2;
  }

  // ---------- picking it up ----------

  grab() {
    this.cancel();
    this.held = true;
    this.say('hey', 1.5);
  }

  moveHeld(x, y) {
    this.x = x;
    this.y = y + heightOf(this.c) * 0.5;
  }

  release() {
    this.held = false;
    const b = this.bounds();
    this.x = clamp(this.x, b.x0, b.x1);
    this.y = clamp(this.y, G.screen.work.y + 90, b.y1);
  }

  // ---------- drawing ----------

  draw(ctx) {
    const { c, x, y, dir } = this;
    if (c.powers.speedster) drawAfterimages(ctx, c, this.trail, x, y);
    if (c.powers.stand) {
      const spot = standSpot(c, x, y, dir);
      drawStand(ctx, c, spot.x, spot.y, dir);
    }
    drawCreature(ctx, c, x, y, { dir });
  }

  drawOverlay(ctx) {
    // While a file is held over it, this says it is ready to take the drop.
    const text = G.dragHover > 0 ? 'drop it here' : this.text;
    if (text) drawBubble(ctx, text, this.x, this.y - heightOf(this.c) - 6, G.screen.w);
  }
}
