// The society simulator. Each imported creature founds a people on a grid laid over
// your screen. The land comes from your actual screen colors: bright areas are farmland,
// dark areas are ore country, vivid areas hold chroma. They grow, research and slowly
// fight each other for it. One tick is about ten seconds of real time.

import { clamp, makeRng, rgbToHsl, hexToRgb, hslToHex } from '../lib/util.js';
import { computeStats, creatureColors, societyPersona, sanitizeCreature, serializeCreature, pathTitle, hpGivenUp } from '../core/creature.js';
import { STANDS } from '../data/powers.js';

export const COLS = 16;
export const ROWS = 9;
export const TICK_MS = 10000;
const MAX_LOG = 120;

const TECHS = {
  tools:   { name: 'stone tools',   base: 30 },
  walls:   { name: 'palisade walls', base: 45 },
  banners: { name: 'war banners',   base: 45 },
};
const REGION_A = ['North', 'Taskbar', 'Corner', 'Upper', 'Lower', 'Far', 'Old', 'Pixel', 'Bright', 'Dim'];
const REGION_B = ['Reach', 'Ridge', 'Flats', 'Marsh', 'Hollow', 'Vale', 'Shelf', 'Fold', 'Crest', 'Basin'];

// colors: optional COLS*ROWS list of [r,g,b] from the screen.
export function newWorld(creatures, { seed = Date.now() | 0, colors = null, now = Date.now() } = {}) {
  const rand = makeRng(seed);
  const cells = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    const [r, g, b] = colors?.[i] ?? [80 + rand() * 120, 80 + rand() * 120, 80 + rand() * 120];
    const [hue, sat, light] = rgbToHsl(r, g, b);
    const food = 0.25 + light * 1.3 + rand() * 0.25;
    const ore = 0.2 + (1 - light) * 1.3 + rand() * 0.25;
    const chroma = 0.04 + sat * 1.1 * (rand() * 0.4 + 0.8);
    cells.push({
      o: -1,
      hue,
      f: food, of: food,
      m: ore, om: ore,
      c: chroma, oc: chroma,
      rgb: [Math.round(r), Math.round(g), Math.round(b)],
    });
  }
  const world = {
    format: 'society/1',
    seed,
    rng: rand.state,
    tick: 0,
    lastTick: now,
    paused: false,
    showBorders: true,
    hideView: false,
    cells,
    tribes: [],
    log: [],
    ended: null,
  };
  const spots = spawnSpots(creatures.length, rand);
  creatures.forEach((c, i) => addTribe(world, c, spots[i], i));
  spreadColors(world);
  world.rng = rand.state;
  log(world, `The world began with ${creatures.length} peoples.`, 'era');
  return world;
}

// Two peoples can come from similar creatures, but you still need to tell their flags apart.
function spreadColors(world) {
  const taken = [];
  world.tribes.forEach((tribe, i) => {
    let color = tribe.color;
    let tries = 0;
    while (taken.some((other) => colorGap(other, color) < 90) && tries < 12) {
      const hue = (i * 137.5 + tries * 47) % 360;
      color = hslToHex(hue, 0.72, 0.55);
      tries++;
    }
    tribe.color = color;
    taken.push(color);
  });
}

function colorGap(a, b) {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return Math.hypot(ar - br, ag - bg, ab - bb);
}

function spawnSpots(n, rand) {
  const corners = [[1, 1], [COLS - 2, ROWS - 2], [COLS - 2, 1], [1, ROWS - 2], [Math.floor(COLS / 2), 1], [Math.floor(COLS / 2), ROWS - 2], [1, Math.floor(ROWS / 2)], [COLS - 2, Math.floor(ROWS / 2)]];
  const out = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = corners[i % corners.length];
    out.push(idx(clamp(x + Math.floor(rand() * 2), 0, COLS - 1), clamp(y, 0, ROWS - 1)));
  }
  return out;
}

const idx = (x, y) => y * COLS + x;

// Two creatures can share a name, but their peoples still need to be told apart.
function folkName(world, leader) {
  const base = `${leader}'s Folk`;
  const same = world.tribes.filter((t) => t.leader === leader).length;
  return same ? `${base} ${['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][same - 1] ?? same + 1}` : base;
}

function addTribe(world, c, cell, i) {
  const stats = computeStats(c);
  const colors = creatureColors(c);
  // Keep only what is needed to rebuild the leader, so world saves stay small.
  const creature = JSON.parse(serializeCreature(c));
  creature.absorbed = [];
  creature.farm = { fields: [], animals: [], store: 0 };
  const tribe = {
    i,
    creatureId: c.id,
    name: folkName(world, c.name),
    leader: c.name,
    job: pathTitle(c),
    color: colors.accent,
    body: colors.body,
    stats,
    persona: societyPersona(c),
    creature,
    // A leader's powers change its people: a Stand or a Quirk wins fights, a speedster settles
    // land faster, and the health a leader gave up for its Quirks leaves room for fewer people.
    stand: c.powers.stand ? STANDS[c.powers.stand].name : null,
    fightEdge: (c.powers.stand ? 1.08 : 1) * (1 + c.powers.quirks.length * 0.05),
    settleEdge: c.powers.speedster ? 1.2 : 1,
    roomLeft: 1 - hpGivenUp(c) / 200,
    capital: cell,
    pop: 10 + stats.vigor * 0.6,
    food: 20,
    ore: 12,
    chroma: 0,
    tech: { tools: 0, walls: 0, banners: 0 },
    alive: true,
    cells: 1,
    peakPop: 0,
    wins: 0,
    famineAt: -999,
  };
  world.tribes.push(tribe);
  world.cells[cell].o = i;
}

const log = (world, text, kind = 'event') => {
  world.log.push({ t: world.tick, text, kind });
  if (world.log.length > MAX_LOG) world.log.shift();
};

function regionName(cell) {
  const a = REGION_A[(cell * 7) % REGION_A.length];
  const b = REGION_B[(cell * 13) % REGION_B.length];
  return `${a} ${b}`;
}

function neighbours(cell) {
  const x = cell % COLS;
  const y = Math.floor(cell / COLS);
  const out = [];
  if (x > 0) out.push(cell - 1);
  if (x < COLS - 1) out.push(cell + 1);
  if (y > 0) out.push(cell - COLS);
  if (y < ROWS - 1) out.push(cell + COLS);
  return out;
}

function cellValue(world, tribe, i) {
  const cell = world.cells[i];
  const p = tribe.persona;
  return cell.f * (0.4 + p.farm) + cell.m * (0.4 + p.mine) + cell.c * (0.4 + p.tech);
}

export function tickWorld(world, count = 1, sink = null) {
  const rand = makeRng(world.rng);
  rand.state = world.rng;
  for (let n = 0; n < count; n++) {
    if (world.ended) break;
    world.tick++;
    stepOnce(world, rand, sink);
  }
  world.rng = rand.state;
  return world;
}

function stepOnce(world, rand, sink) {
  const { cells, tribes } = world;

  // Worked land thins out and recovers slowly.
  for (const cell of cells) {
    if (cell.o < 0) {
      cell.f += (cell.of - cell.f) * 0.02;
      cell.m += (cell.om - cell.m) * 0.02;
      cell.c += (cell.oc - cell.c) * 0.02;
    }
  }

  const owned = tribes.map(() => []);
  cells.forEach((cell, i) => { if (cell.o >= 0) owned[cell.o].push(i); });

  for (const tribe of tribes) {
    if (!tribe.alive) continue;
    const land = owned[tribe.i];
    tribe.cells = land.length;
    if (!land.length) {
      fall(world, tribe, 'lost the last of its land');
      continue;
    }
    gather(world, tribe, land);
    feed(world, tribe, land);
    research(world, tribe);
    if (!tribe.alive) continue;
    expand(world, tribe, land, rand);
    war(world, tribe, land, rand, sink);
  }

  const living = tribes.filter((t) => t.alive);
  if (living.length === 1 && tribes.length > 1) {
    world.ended = { winner: living[0].i, tick: world.tick };
    log(world, `${living[0].name} stand alone. The screen is theirs.`, 'era');
  } else if (!living.length) {
    world.ended = { winner: -1, tick: world.tick };
    log(world, 'Nobody is left. The pixels go quiet.', 'era');
  }
}

function gather(world, tribe, land) {
  const p = tribe.persona;
  const hands = clamp(tribe.pop / land.length / 3, 0.1, 1);
  const tools = 1 + tribe.tech.tools * 0.2;
  for (const i of land) {
    const cell = world.cells[i];
    const gotF = cell.f * hands * tools * (0.45 + p.farm * 0.7);
    const gotM = cell.m * hands * tools * (0.25 + p.mine * 0.7) * 0.45;
    const gotC = cell.c * hands * (0.2 + p.tech * 0.6) * 0.4;
    tribe.food += gotF;
    tribe.ore += gotM;
    tribe.chroma += gotC;
    cell.f = Math.max(cell.of * 0.25, cell.f - gotF * 0.004);
    cell.m = Math.max(cell.om * 0.1, cell.m - gotM * 0.008);
    cell.c = Math.max(cell.oc * 0.1, cell.c - gotC * 0.008);
    cell.f += (cell.of - cell.f) * 0.002;
    cell.m += (cell.om - cell.m) * 0.0015;
    cell.c += (cell.oc - cell.c) * 0.0015;
  }
}

function feed(world, tribe, land) {
  const need = tribe.pop * 0.06;
  tribe.food -= need;
  if (tribe.food < 0) {
    tribe.pop = Math.max(0, tribe.pop + tribe.food * 0.35);
    tribe.food = 0;
    if (world.tick - tribe.famineAt > 120) {
      tribe.famineAt = world.tick;
      log(world, `Famine in ${tribe.name}.`, 'bad');
    }
  } else {
    const capacity = land.length * (6 + tribe.stats.vigor * 0.2) * tribe.roomLeft;
    tribe.pop += tribe.pop * 0.012 * (1 - tribe.pop / capacity);
    tribe.food = Math.min(tribe.food, 40 + tribe.pop * 3);
  }
  tribe.ore = Math.min(tribe.ore, 80 + land.length * 6);
  tribe.peakPop = Math.max(tribe.peakPop, tribe.pop);
  if (tribe.pop < 1) fall(world, tribe, 'dwindled to nothing');
}

function research(world, tribe) {
  const p = tribe.persona;
  const order = p.agg > 0.6 ? ['banners', 'tools', 'walls'] : p.def > 0.6 ? ['walls', 'tools', 'banners'] : ['tools', 'walls', 'banners'];
  const key = order.slice().sort((a, b) => tribe.tech[a] - tribe.tech[b])[0];
  const cost = TECHS[key].base * (1 + tribe.tech[key]) ** 1.6;
  if (tribe.chroma >= cost && tribe.tech[key] < 6) {
    tribe.chroma -= cost;
    tribe.tech[key]++;
    const label = tribe.tech[key] > 1 ? `better ${TECHS[key].name}` : TECHS[key].name;
    log(world, `${tribe.name} developed ${label}.`, 'tech');
  }
}

// Cells next to this people's land. Land can change hands mid-tick, so ownership is
// checked live rather than trusting the list from the start of the tick.
function frontier(world, tribe, land) {
  const set = new Set();
  for (const i of land) {
    if (world.cells[i].o !== tribe.i) continue;
    for (const j of neighbours(i)) {
      if (world.cells[j].o !== tribe.i) set.add(j);
    }
  }
  return [...set];
}

function expand(world, tribe, land, rand) {
  const cost = 10 + land.length * 1.1;
  if (tribe.ore < cost || tribe.pop / land.length < 2.4) return;
  if (rand() > tribe.persona.exp * 0.28 * tribe.settleEdge) return;
  const options = frontier(world, tribe, land).filter((i) => world.cells[i].o === -1);
  if (!options.length) return;
  let best = options[0];
  let bestV = -Infinity;
  for (const i of options) {
    const v = cellValue(world, tribe, i) + rand() * 0.4;
    if (v > bestV) {
      bestV = v;
      best = i;
    }
  }
  tribe.ore -= cost;
  world.cells[best].o = tribe.i;
  tribe.cells++;
  land.push(best);
  if (tribe.cells % 6 === 0) log(world, `${tribe.name} settled the ${regionName(best)}.`, 'grow');
}

function strength(tribe, power, tech) {
  return Math.sqrt(Math.max(1, tribe.pop)) * (1 + power * 0.035) * (1 + tech * 0.18);
}

function war(world, tribe, land, rand, sink) {
  const p = tribe.persona;
  const noRoom = !frontier(world, tribe, land).some((i) => world.cells[i].o === -1);
  const hungry = tribe.food < tribe.pop;
  const pressure = (noRoom ? 1 : 0.15) + (hungry ? 0.5 : 0);
  if (rand() > p.agg * 0.07 * pressure) return;
  if (tribe.ore < 4 || tribe.pop / land.length < 1.2) return;

  const targets = frontier(world, tribe, land).filter((i) => world.cells[i].o >= 0);
  if (!targets.length) return;
  let cell = targets[0];
  let bestV = -Infinity;
  for (const i of targets) {
    const v = cellValue(world, tribe, i) + rand() * 0.6;
    if (v > bestV) {
      bestV = v;
      cell = i;
    }
  }
  const foe = world.tribes[world.cells[cell].o];
  const isCapital = foe.capital === cell;
  tribe.ore -= 4;

  const attack = strength(tribe, tribe.stats.might, tribe.tech.banners) * tribe.fightEdge * (0.7 + rand() * 0.6);
  const defend = strength(foe, foe.stats.guard * (0.6 + foe.persona.def * 0.6), foe.tech.walls) * foe.fightEdge * (isCapital ? 1.5 : 1) * (0.7 + rand() * 0.6);
  const won = attack > defend;
  tribe.pop = Math.max(0.5, tribe.pop - (won ? 0.4 : 1.1) * (1 + rand()));
  foe.pop = Math.max(0, foe.pop - (won ? 1.1 : 0.4) * (1 + rand()));
  sink?.({ type: 'battle', cell, a: tribe.i, b: foe.i, won });

  if (won) {
    world.cells[cell].o = tribe.i;
    tribe.cells++;
    foe.cells--;
    tribe.wins++;
    const loot = Math.min(foe.ore, 8);
    foe.ore -= loot;
    tribe.ore += loot;
    land.push(cell);
    if (isCapital) {
      foe.pop *= 0.75;
      const remaining = [];
      world.cells.forEach((c, i) => { if (c.o === foe.i) remaining.push(i); });
      if (remaining.length) {
        foe.capital = remaining[Math.floor(rand() * remaining.length)];
        log(world, `${tribe.name} sacked the capital of ${foe.name}.`, 'war');
      } else {
        fall(world, foe, `was overrun by ${tribe.name}`);
      }
    } else if (rand() < 0.2) {
      log(world, `${tribe.name} took the ${regionName(cell)} from ${foe.name}.${tribe.stand ? ` Witnesses describe ${tribe.stand}.` : ''}`, 'war');
    }
  } else if (rand() < 0.12) {
    log(world, `${foe.name} held the ${regionName(cell)} against ${tribe.name}.`, 'war');
  }
  if (foe.alive && foe.pop < 1) fall(world, foe, 'dwindled to nothing');
}

function fall(world, tribe, how) {
  if (!tribe.alive) return;
  tribe.alive = false;
  tribe.pop = 0;
  tribe.cells = 0;
  world.cells.forEach((c) => { if (c.o === tribe.i) c.o = -1; });
  log(world, `${tribe.name} ${how}. They lasted ${world.tick} days.`, 'fall');
}

// Runs the ticks missed while the game was closed, capped so startup never stalls.
export function catchUp(world, now, scale = 1, maxTicks = 720) {
  if (world.paused || world.ended) {
    world.lastTick = now;
    return 0;
  }
  const due = Math.floor((now - world.lastTick) / (TICK_MS / scale));
  if (due <= 0) return 0;
  const run = Math.min(due, maxTicks);
  tickWorld(world, run);
  world.lastTick = now;
  return run;
}

// Saved worlds and their embedded creatures get the same untrusted treatment.
export function sanitizeWorld(raw, now = Date.now()) {
  if (!raw || raw.format !== 'society/1' || !Array.isArray(raw.cells) || raw.cells.length !== COLS * ROWS || !Array.isArray(raw.tribes)) {
    throw new Error('Not a society save');
  }
  const creatures = raw.tribes.map((t) => sanitizeCreature(t.creature, now));
  const world = newWorld(creatures, { seed: Number(raw.seed) | 0, now });
  world.tick = Math.floor(clamp(Number(raw.tick) || 0, 0, 1e9));
  world.rng = Number(raw.rng) | 0;
  world.lastTick = clamp(Number(raw.lastTick) || now, 0, now);
  world.paused = !!raw.paused;
  world.showBorders = raw.showBorders !== false;
  world.hideView = !!raw.hideView;
  world.village = raw.village === true;
  // Where on the screen it sits, if it was put in a box. Without one it fills the screen.
  const box = raw.area;
  if (box && ['x', 'y', 'w', 'h'].every((k) => Number.isFinite(box[k])) && box.w >= 60 && box.h >= 60) {
    world.area = { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(Math.min(box.w, 20000)), h: Math.round(Math.min(box.h, 20000)) };
  }
  world.ended = raw.ended ? { winner: Math.floor(Number(raw.ended.winner) || 0), tick: Math.floor(Number(raw.ended.tick) || 0) } : null;
  const fin = (v, d = 0) => clamp(Number.isFinite(Number(v)) ? Number(v) : d, 0, 1e6);
  raw.cells.forEach((c, i) => {
    const cell = world.cells[i];
    const o = Math.floor(Number(c?.o));
    cell.o = o >= 0 && o < world.tribes.length ? o : -1;
    ['f', 'of', 'm', 'om', 'c', 'oc'].forEach((k) => { cell[k] = fin(c?.[k], cell[k]); });
    cell.hue = fin(c?.hue, 0) % 360;
    if (Array.isArray(c?.rgb)) cell.rgb = [0, 1, 2].map((n) => clamp(Number(c.rgb[n]) || 0, 0, 255));
  });
  raw.tribes.forEach((t, i) => {
    const tribe = world.tribes[i];
    tribe.pop = fin(t.pop);
    tribe.food = fin(t.food);
    tribe.ore = fin(t.ore);
    tribe.chroma = fin(t.chroma);
    tribe.alive = !!t.alive;
    tribe.cells = fin(t.cells);
    tribe.peakPop = fin(t.peakPop);
    tribe.wins = fin(t.wins);
    tribe.famineAt = Number(t.famineAt) || -999;
    const cap = Math.floor(Number(t.capital));
    tribe.capital = cap >= 0 && cap < COLS * ROWS ? cap : tribe.capital;
    Object.keys(tribe.tech).forEach((k) => { tribe.tech[k] = Math.floor(clamp(Number(t.tech?.[k]) || 0, 0, 6)); });
  });
  world.log = (Array.isArray(raw.log) ? raw.log.slice(-MAX_LOG) : []).map((e) => ({
    t: Math.floor(Number(e?.t) || 0),
    text: String(e?.text ?? '').slice(0, 200),
    kind: String(e?.kind ?? 'event').replace(/[^a-z]/g, '').slice(0, 10),
  }));
  return world;
}
