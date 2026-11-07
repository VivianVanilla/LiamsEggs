// Startup, the main loop, drawing order and mouse and file-drop input.

import { toast } from './ui/flair.js';
import { clamp } from './lib/util.js';
import { G, api, saveCreature, saveTeam, saveHouse, saveNeg, creatureText, memberOf, inBout, rememberTeam } from './state.js';
import { emptyNegWorld, sanitizeNegWorld } from './core/negative.js';
import { resetUniverse } from './core/universe.js';
import { emptyHouse, sanitizeHouse, joinHouse } from './core/house.js';
import { Pet } from './pet.js';
import { parseCreature, digestTime, pathChoice, canAwakenStand, canBecomeSpeedster, canLearnTechnique, canLearnSecondTechnique, fullName } from './core/creature.js';
import { TILE, tickFarm, ANIMALS } from './sim/farm.js';
import { TEAM_MAX } from './data/family.js';
import { loadArt, drawArt, drawAnimal, dropRig, setPictureScale } from './draw/art.js';
import { drawFields, drawFileSprite, drawArenaFloor, drawFighter, drawHealthBar, drawBolts, drawVeins } from './draw/scene.js';
import { closeNotesOf, noteRects, tickNotes, getNote, syncFocus, cancelPicking, showNotesFor, closeAllNotes } from './ui/notes.js';
import { openMenu, toggleMenu, openAny, openSettings, openNaming, createCreature, feedPaths, openFeed, openPathChoice, refreshMenu } from './ui/panels.js';
import { onBoutEnded, forgetFighter } from './ui/boards.js';
import { onChallengeEnded } from './ui/challenges.js';
import { loadVillage } from './ui/village.js';
import { onLevelEnded } from './ui/adventure.js';
import { onNegLevelEnded } from './ui/negative.js';
import { onGodRingEnded } from './ui/god.js';
import { initDock, refreshDock, dockRects, overDock, tickDock, setDockDrop } from './ui/dock.js';
import { takeEgg } from './ui/roll.js';
import { hoursDue, runVillage, finishExpeditions, tidyMine } from './core/village.js';
import { FRUITS } from './data/fruits.js';
import { RACES } from './data/races.js';
import { ITEMS } from './data/items.js';
import { TRAITS } from './data/powers.js';
import { earnTraits } from './core/earned.js';

const canvas = document.getElementById('world');
const ctx = canvas.getContext('2d');
let dpr = window.devicePixelRatio || 1;
let lastFrame = performance.now();
let rectClock = 0;
let saveClock = 0;
let farmClock = 0;
let noteClock = 0;
let villageClock = 0;
let sinceDraw = 0;
let lastStamp = '';

function resize() {
  dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(G.screen.w * dpr);
  canvas.height = Math.round(G.screen.h * dpr);
}

function applySettings(settings) {
  G.settings = settings;
  setPictureScale(settings.scale ?? 1);
  document.documentElement.style.setProperty('--see', settings.opacity ?? 0.75);
  // Dark mode turns every note into night paper.
  document.documentElement.classList.toggle('dark', !!settings.dark);
}

// Blanks or brings back everything on screen. The window itself stays where it is.
function applyHidden(hidden) {
  G.hidden = hidden;
  document.body.classList.toggle('all-hidden', hidden);
  if (hidden) {
    // Whatever was mid-way ends now, so nothing is left holding the mouse or the keyboard.
    cancelPicking();
    if (press?.moved) press.pet.release();
    press = null;
    api.focus(false);
  } else {
    syncFocus();
    sinceDraw = 0;
    draw();
  }
}

// The drawing always matches the window it is really in. If Windows moves or resizes the window
// without saying so, as it can when the screen is locked and the monitors switch off, a drawing
// sized for the old screen would show the creature in one place and take clicks in another.
function fitScreen() {
  const d = G.display;
  if (!d) return;
  const w = window.innerWidth > 0 ? window.innerWidth : d.width;
  const h = window.innerHeight > 0 ? window.innerHeight : d.height;
  const x = clamp(d.work.x, 0, w);
  const y = clamp(d.work.y, 0, h);
  G.screen = { w, h, work: { x, y, w: clamp(d.work.w, 1, w - x), h: clamp(d.work.h, 1, h - y) } };
  resize();
  for (const m of G.team) {
    const b = m.pet.bounds();
    m.pet.x = clamp(m.pet.x, b.x0, b.x1);
    m.pet.y = clamp(m.pet.y, b.y0, b.y1);
  }
}

function applyDisplay(d) {
  G.display = d;
  fitScreen();
}

// ---------- the creatures out on the screen ----------

// The world keeps going while the game is closed: crops ripen, stomachs empty, no one dies.
function catchUpCreature(c) {
  const now = Date.now();
  const away = Math.max(0, now - c.lastSeen) / 1000;
  digestTime(c, Math.min(away, 8 * 3600) * 0.6 * G.speed);
  tickFarm(c, now, Math.random, G.speed);
  while (c.fullness < 50 && c.farm.store >= 1) {
    c.farm.store -= 1;
    c.fullness += 12;
  }
  c.lastSeen = now;
}

// Puts a creature on the screen. Each one stands a little apart from the others. It shares the
// household's bank, plants and food store from the moment it comes out.
function addMember(c, base, at = null) {
  joinHouse(G.house, c);
  catchUpCreature(c);
  const { work } = G.screen;
  const slot = G.team.length;
  const pet = new Pet(c, at?.x ?? work.x + work.w * (0.35 + slot * 0.15), at?.y ?? work.y + work.h * 0.82);
  pet.base = base;
  const m = { c, base, pet, animals: new Map() };
  G.team.push(m);
  dropRig(c);
  return m;
}

// Takes it off the screen. Its notes go with it.
function dropMember(m) {
  G.team = G.team.filter((x) => x !== m);
  G.meals = G.meals.filter((meal) => meal.pet !== m.pet);
  closeNotesOf(m.c.id);
  if (press?.pet === m.pet) press = null;
  if (G.creature === m.c) lookAfter(null);
}

// The creature every panel is about: the last one you clicked.
function lookAfter(m) {
  G.creature = m?.c ?? null;
  G.base = m?.base ?? null;
  G.pet = m?.pet ?? null;
  showNotesFor();
  refreshDock();
  if (m) rememberTeam();
}

G.lookAfter = (c) => {
  const m = memberOf(c);
  if (m && G.creature !== m.c) lookAfter(m);
  return m;
};

// Brings a creature out, or just looks after it if it is already out. With every place taken, the
// one being looked after goes back to its file to make room.
G.bringOut = async (base, c) => {
  const already = G.team.find((m) => m.base === base);
  if (already) {
    lookAfter(already);
    return already;
  }
  let note = '';
  if (G.team.length >= TEAM_MAX) {
    // Never one that is in the middle of a fight: there is no running from those.
    const leaving = [memberOf(G.creature), ...G.team.slice().reverse()].find((m) => m && !inBout(m.c));
    if (!leaving) return null;
    await saveCreature(leaving.c);
    dropMember(leaving);
    note = `${leaving.c.name} went back to its file. `;
  }
  const m = addMember(c, base);
  lookAfter(m);
  m.pet.say(`${note}${c.name} reporting`, 3);
  loadVillage();
  return m;
};

// Older name, still used in a few places: bring it out and look after it.
G.switchTo = (base, c) => G.bringOut(base, c);

// Back to its file. One always stays out.
G.putAway = async (c) => {
  const m = memberOf(c);
  if (!m || G.team.length <= 1 || inBout(c)) return false;
  await saveCreature(m.c);
  dropMember(m);
  if (!G.creature) lookAfter(G.team[0]);
  rememberTeam();
  loadVillage();
  return true;
};

// It is gone for good: off the screen with nothing saved after this.
G.lose = (c) => {
  const m = memberOf(c);
  if (m) dropMember(m);
  rememberTeam();
  loadVillage();
};

// Gone for good, because you chose so. Its file becomes a gravestone, the same as any death, and
// what it put into the shared pool stays there. `how` says why, for its gravestone: let go by you,
// sacrificed on the Bloodline Altar, or absorbed by another creature.
G.getRidOf = async (base, c, how = { by: 'you' }) => {
  if (inBout(c)) return false;
  c.dead = { at: Date.now(), ...how };
  G.lose(c);
  forgetFighter(c.id);
  await api.buryCreature(base, creatureText(c));
  if (!G.team.length && !G.egg) beginFirstRun();
  else if (!G.creature && G.team.length) lookAfter(G.team[0]);
  await loadVillage();
  return true;
};

// The universe starts over. Every creature dies, out on the screen or at home, and the household
// is wiped, all but the memory that it happened. The Negative Dimension is untouched. Then an egg
// falls, the same as the very first time.
G.resetUniverse = async () => {
  if (G.bout) return false;
  const fresh = resetUniverse(G.house);
  if (!fresh) return false;
  const now = Date.now();
  const files = await api.listCreatures();
  for (const m of [...G.team]) dropMember(m);
  for (const f of files) {
    let c;
    try {
      c = parseCreature(f.text);
    } catch {
      continue;
    }
    if (c.dead) continue;
    c.dead = { at: now, by: 'the universe reset' };
    forgetFighter(c.id);
    await api.buryCreature(f.base, creatureText(c));
  }
  G.house = fresh;
  await saveHouse();
  closeAllNotes();
  G.meals = [];
  G.drops = [];
  G.veins = [];
  rememberTeam();
  await loadVillage();
  refreshDock();
  if (!G.egg) beginFirstRun();
  return true;
};

G.onCreatureChanged = () => refreshMenu();
G.newEgg = () => beginFirstRun();
G.onPathReady = (c = G.creature) => {
  const m = memberOf(c);
  if (!m || getNote('path', c.id)) return;
  if (m.pathPrompted === c.path.line.length) return;
  m.pathPrompted = c.path.line.length;
  m.pet.say(c.path.line.length ? 'i am ready for more' : 'i think i know what i want to be', 4, true);
  setTimeout(() => {
    if (G.creature === c && pathChoice(c) && !G.bout) openPathChoice();
  }, 1600);
};

// Says so once, when a power is there for the taking. The menu shows it too.
function announcePowers(m) {
  const { c } = m;
  // Anything it has earned by what it did: Ultra Instinct, the Eight Inner Gates and the rest.
  for (const id of earnTraits(c)) {
    shoutNews(`${c.name.toUpperCase()} EARNED ${TRAITS[id].name.toUpperCase()}!!!`, TRAITS[id].color, 24, 'rare');
    m.pet.say(TRAITS[id].name.toLowerCase(), 4, true);
    saveCreature(c);
    if (G.creature === c) refreshMenu();
  }
  const lines ={ stand: 'something is standing behind me', speed: 'everything just got so slow', technique: 'my hands feel cursed', second: 'my other hand feels cursed too' };
  const ready = canAwakenStand(c) ? 'stand' : canBecomeSpeedster(c) ? 'speed' : canLearnTechnique(c) ? 'technique' : canLearnSecondTechnique(c) ? 'second' : '';
  if (!ready || m.powerPrompted === ready) return;
  m.powerPrompted = ready;
  m.pet.say(lines[ready], 5, true);
  if (G.creature === c) refreshMenu();
}

const EGG_SIZE = 76;

function beginFirstRun() {
  const { work } = G.screen;
  G.egg = { x: work.x + work.w * 0.5, y: work.y - 60, groundY: work.y + work.h * 0.78, v: 0, landed: false };
}

function updateEgg(dt) {
  const egg = G.egg;
  if (!egg || egg.landed) return;
  egg.v += 1400 * dt;
  egg.y += egg.v * dt;
  if (egg.y < egg.groundY) return;
  egg.y = egg.groundY;
  egg.landed = true;
  // It lands, you name it, and the picture of the creature takes its place.
  openNaming({
    first: !G.team.length,
    onName: async (name) => {
      // The egg that fell is the egg on offer in the roll note.
      const { c, base } = await createCreature(name, takeEgg(name));
      G.egg = null;
      const m = await G.bringOut(base, c);
      // With every place taken by a fight, it waits in its file for now.
      if (!m) return;
      m.pet.x = egg.x;
      m.pet.y = egg.y;
      m.pet.say(`i am ${fullName(c)}. i am hungry.`, 5, true);
      setTimeout(() => {
        if (G.creature === c) openFeed();
      }, 1800);
    },
  });
}

// ---------- animals ----------

function updateAnimals(m, dt) {
  const { c } = m;
  for (const a of c.farm.animals) {
    let view = m.animals.get(a.id);
    if (!view) {
      view = { tx: a.x, ty: a.y, wait: Math.random() * 3, dir: 1 };
      m.animals.set(a.id, view);
    }
    const dx = view.tx - a.x;
    const dy = view.ty - a.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) {
      view.wait -= dt;
      if (view.wait <= 0) {
        const f = c.farm.fields[a.id % Math.max(1, c.farm.fields.length)];
        if (f) {
          view.tx = f.x - 30 + Math.random() * (f.cols * TILE + 60);
          view.ty = f.y - 14 + Math.random() * (f.rows * TILE + 44);
        } else {
          view.tx = a.x + (Math.random() - 0.5) * 80;
          view.ty = a.y + (Math.random() - 0.5) * 40;
        }
        view.wait = 1.5 + Math.random() * 6;
      }
    } else {
      const speed = ANIMALS[a.kind].speed;
      a.x += (dx / d) * speed * dt;
      a.y += (dy / d) * speed * dt;
      view.dir = dx >= 0 ? 1 : -1;
    }
  }
}

// ---------- arena events become effects ----------

function handleBoutEvents(bout) {
  for (const e of bout.drainEvents()) {
    if (e.type === 'hit') G.fx.float(e.x + (Math.random() - 0.5) * 14, e.y, String(Math.max(1, Math.round(e.amt))), e.crit ? '#ffd24a' : '#ffffff', e.crit ? 20 : 14);
    else if (e.type === 'dodge') G.fx.float(e.x, e.y, e.text ?? 'dodge', '#9fc4ff', 13);
    else if (e.type === 'ability' && e.loud) G.fx.shout(e.x, e.y - 20, e.name, e.color);
    else if (e.type === 'ability') G.fx.float(e.x, e.y - 20, e.name, e.color, 15);
    else if (e.type === 'status') G.fx.float(e.x, e.y, e.text, e.color, 15, 1.8);
    else if (e.type === 'menace') G.fx.menace(e.x, e.y, e.color);
    else if (e.type === 'heal') G.fx.float(e.x, e.y, `+${Math.round(e.amt)}`, e.color, 16);
    else if (e.type === 'ko') G.fx.float(e.x, e.y - 72, 'KO!', '#ff5a4a', 25);
  }
}

// ---------- the loop ----------

function update(dt) {
  if (G.dragHover > 0) G.dragHover -= dt;

  updateEgg(dt);

  farmClock -= dt;
  const farmTick = farmClock <= 0;
  if (farmTick) farmClock = 1;
  for (const m of [...G.team]) {
    const { c } = m;
    digestTime(c, dt * G.speed);
    if (farmTick) {
      announcePowers(m);
      const events = tickFarm(c, Date.now(), Math.random, G.speed);
      for (const e of events) {
        if (e.kind === 'birth') {
          m.pet.say(`a baby ${e.name.toLowerCase()}!`, 3);
          saveCreature(c);
        }
      }
    }
    updateAnimals(m, dt);
    m.pet.update(dt);
  }

  // A fight waits while everything is hidden, so nobody dies where you can't see it.
  const bout = G.bout;
  if (bout && !G.hidden) {
    const wasDone = bout.done;
    bout.tick(dt);
    handleBoutEvents(bout);
    if (bout.done && !wasDone) (G.challenge ? onChallengeEnded : bout.negative ? onNegLevelEnded : bout.adventure ? onLevelEnded : bout.godRing ? onGodRingEnded : onBoutEnded)(bout);
  }

  G.fx.update(dt);
  if (G.veins.length) {
    G.veins.forEach((v) => { v.left -= dt; });
    G.veins = G.veins.filter((v) => v.left > 0);
  }

  saveClock += dt;
  if (saveClock > 30) {
    saveClock = 0;
    saveTeam();
  }

  noteClock += dt;
  if (noteClock > 0.1) {
    noteClock = 0;
    tickNotes();
    tickDock();
  }

  villageClock += dt;
  if (villageClock > 20) {
    villageClock = 0;
    tickVillage();
  }

  rectClock += dt;
  if (rectClock > 0.08) {
    rectClock = 0;
    sendRects();
  }
}

// Big news gets a popup at the top of the screen, and a shout over whoever you are looking after.
function shoutNews(text, color, size = 20, kind = 'good') {
  const { work } = G.screen;
  const x = G.pet?.x ?? work.x + work.w / 2;
  const y = (G.pet?.y ?? work.y + work.h / 2) - 130;
  G.fx.shout(x, y, text, color, size, 4);
  toast(text, kind);
}

// The village works, the Legendary Mine brings up ore, and expeditions come home.
function tickVillage() {
  const now = Date.now();
  const home = G.village.map((r) => r.c);
  // Anyone gone, or no longer a legendary Miner, loses their place in the mine.
  if (G.everyone.length) tidyMine(G.house, G.everyone.map((r) => r.c));
  const hours = hoursDue(G.house, now);
  const gained = runVillage(G.house, home, hours);
  gained.fruits.forEach((id) => shoutNews(`THE VILLAGE FOUND A DEVIL FRUIT: ${FRUITS[id].name}!!!`, FRUITS[id].color, 22, 'rare'));
  const back = finishExpeditions(G.house, now);
  for (const b of back) {
    const names = b.lost.map((p) => p.name.split(' ')[0].toUpperCase()).join(' AND ');
    if (b.allLost) {
      shoutNews(`NOBODY CAME BACK FROM THE EXPEDITION. ${names} ${b.lost.length === 1 ? 'IS' : 'ARE'} GONE FOREVER...`, '#ff6b5e', 20, 'bad');
      continue;
    }
    const finds = [b.find && `a ${RACES[b.find].name}`, b.fruit && `the ${FRUITS[b.fruit].name}`, ...b.items.map((id) => `a ${ITEMS[id].name}`)].filter(Boolean);
    shoutNews(`EXPEDITION BACK! +${b.gems} gems${finds.length ? `, and ${finds.join(' and ')}!!!` : '!'}`, finds.length ? '#ffd24a' : '#e9ffd9', 20, finds.length ? 'rare' : 'good');
    if (b.lost.length) shoutNews(`${names} DIDN'T COME BACK. GONE FOREVER...`, '#ff6b5e', 20, 'bad');
  }
  buryLost();
  if (back.length) loadVillage();
  if (gained.ore || back.length) {
    getNote('village')?.rebuild();
    getNote('menu')?.rebuild();
  }
  saveHouse();
}
// A countdown that runs out asks for this straight away, so a party is home on the dot.
G.tickVillage = () => tickVillage();

// Anyone a Bizarre expedition took goes to the graveyard, like any death. The list is kept in the
// household file, so a party that came home while the game was closed is still dealt with.
let burying = false;
async function buryLost() {
  if (burying || !G.house.lost?.length) return;
  burying = true;
  try {
    const files = await api.listCreatures();
    for (const { base, by } of G.house.lost.slice()) {
      let c = null;
      try {
        const f = files.find((x) => x.base === base);
        c = f ? parseCreature(f.text) : null;
      } catch { c = null; }
      if (c && !c.dead) await G.getRidOf(base, c, { by });
      G.house.lost = G.house.lost.filter((l) => l.base !== base);
    }
    saveHouse();
  } finally {
    burying = false;
  }
}

const onScreen = () => G.team.filter((m) => !inBout(m.c));

function sendRects() {
  const rects = [...noteRects(), ...dockRects()];
  if (!G.picking) onScreen().forEach((m) => rects.push(m.pet.hitRect()));
  // Like the creature, a vein needs the mouse to rest on it, so quick clicks still reach your apps.
  G.veins.forEach((v) => rects.push({ x: v.x - 3, y: v.y - 3, w: v.size + 6, h: v.size + 6 }));
  api.setRects(rects);
}

function draw() {
  if (G.hidden) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, G.screen.w, G.screen.h);

  for (const m of G.team) drawFields(ctx, m.c, Date.now(), G.speed);
  G.fx.drawGround(ctx);

  // Everything standing up, drawn back to front.
  const standing = [];
  for (const m of G.team) {
    for (const a of m.c.farm.animals) {
      const view = m.animals.get(a.id);
      standing.push({ y: a.y, draw: () => drawAnimal(ctx, a.kind, a.x, a.y, { dir: view?.dir ?? 1 }) });
    }
  }
  const bout = G.bout;
  if (bout) {
    drawArenaFloor(ctx, bout);
    for (const f of bout.fighters) standing.push({ y: f.y, draw: () => drawFighter(ctx, f, bout) });
  }
  for (const m of onScreen()) standing.push({ y: m.pet.y, draw: () => m.pet.draw(ctx) });
  standing.sort((a, b) => a.y - b.y);
  standing.forEach((s) => s.draw());

  if (bout) {
    drawBolts(ctx, bout);
    bout.fighters.forEach((f) => drawHealthBar(ctx, f, bout));
  }
  drawVeins(ctx, G.veins);

  for (const d of G.drops) {
    const s = d.carried ? clamp(d.shrink ?? 1, 0.1, 1) : 1;
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.scale(s, s);
    drawFileSprite(ctx, d.ext, 0, 0, d.carried ? '' : d.name);
    ctx.restore();
  }

  if (G.egg) drawArt(ctx, 'creature/egg.png', G.egg.x, G.egg.y, EGG_SIZE);
  G.fx.drawTop(ctx);
  for (const m of onScreen()) m.pet.drawOverlay(ctx);
}

// Still pictures need no redrawing until something actually moves, so idle creatures cost next
// to nothing. Once a second it redraws anyway, for crops slowly growing.

function needsDraw(dt) {
  sinceDraw += dt;
  if (G.bout || G.egg || G.drops.length || G.veins.length || G.fx.busy()) return true;
  if (G.team.some((m) => m.pet.trailing())) return true;
  let stamp = `${G.dragHover > 0}`;
  for (const m of G.team) {
    const p = m.pet;
    stamp += `|${Math.round(p.x)},${Math.round(p.y)},${p.dir},${p.text}`;
    for (const a of m.c.farm.animals) stamp += `|${Math.round(a.x)},${Math.round(a.y)}`;
  }
  if (stamp !== lastStamp) {
    lastStamp = stamp;
    return true;
  }
  return sinceDraw > 1;
}

function frame() {
  const now = performance.now();
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  try {
    update(dt);
    if (needsDraw(dt)) {
      sinceDraw = 0;
      draw();
    }
  } catch (err) {
    // One bad frame should not freeze the creatures forever.
    console.error(err);
  }
}

// ---------- mouse: click a creature, or pick it up ----------

let press = null;

// The creature under this point, the one in front if two overlap.
function memberAt(x, y) {
  return onScreen()
    .filter((m) => {
      const r = m.pet.hitRect();
      return x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h;
    })
    .sort((a, b) => b.pet.y - a.pet.y)[0] ?? null;
}

// The creature nearest a point, for a file dropped near them.
function memberNear(x, y) {
  return onScreen().sort((a, b) => Math.hypot(a.pet.x - x, a.pet.y - y) - Math.hypot(b.pet.x - x, b.pet.y - y))[0] ?? null;
}

// The one under a point, for the dock's drag and drop too.
G.memberAt = memberAt;

window.addEventListener('pointerdown', (e) => {
  if (G.picking || e.button !== 0 || e.target.closest?.('.note') || e.target.closest?.('#dock')) return;
  const vein = G.veins.find((v) => e.clientX >= v.x - 3 && e.clientY >= v.y - 3 && e.clientX <= v.x + v.size + 3 && e.clientY <= v.y + v.size + 3);
  if (vein) {
    const miner = memberOf(vein.pet?.c) ?? memberOf(G.creature) ?? G.team[0];
    G.veins = G.veins.filter((v) => v !== vein);
    miner?.pet.collectVein(vein);
    return;
  }
  const m = memberAt(e.clientX, e.clientY);
  if (!m) return;
  press = { x: e.clientX, y: e.clientY, moved: false, pet: m.pet, m };
  api.captureAll(true);
});

window.addEventListener('pointermove', (e) => {
  if (!press) return;
  const { pet } = press;
  if (!press.moved && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 6) {
    if (pet.kind === 'meal' || pet.kind === 'work') return;
    press.moved = true;
    pet.grab();
  }
  if (press.moved) {
    pet.moveHeld(e.clientX, e.clientY);
    setDockDrop(G.team.length > 1 && overDock(e.clientX, e.clientY));
  }
});

window.addEventListener('pointerup', (e) => {
  if (!press) return;
  api.captureAll(false);
  const { m } = press;
  setDockDrop(false);
  if (press.moved && G.team.length > 1 && overDock(e.clientX, e.clientY)) {
    // Carried back onto the dock: it goes home.
    m.pet.release();
    G.putAway(m.c);
  } else if (press.moved) {
    m.pet.release();
    saveCreature(m.c);
  } else if (G.team.includes(m)) {
    // Clicking a creature looks after it: its own notes come back, starting with its menu.
    lookAfter(m);
    openMenu();
  }
  press = null;
});

window.addEventListener('contextmenu', (e) => e.preventDefault());

// ---------- dropping real files ----------

window.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  if (!e.target.closest?.('.note')) G.dragHover = 0.25;
});

window.addEventListener('drop', (e) => {
  e.preventDefault();
  G.dragHover = 0;
  const paths = [...e.dataTransfer.files].map((f) => api.pathOfFile(f)).filter(Boolean);
  if (!paths.length) return;
  const noteEl = e.target.closest?.('.note');
  if (noteEl?.__note?.spec.onDrop) {
    noteEl.__note.spec.onDrop(paths);
    return;
  }
  // Whoever is nearest the drop gets it.
  const who = memberNear(e.clientX, e.clientY);
  feedPaths(paths, clamp(e.clientX, 40, G.screen.w - 40), clamp(e.clientY + 30, 40, G.screen.h - 40), () => {
    getNote('feed')?.rebuild();
  }, who?.pet);
});

// ---------- messages from the tray, the taskbar and the main process ----------

api.onCommand((msg) => {
  switch (msg.type) {
    case 'cursor':
      G.cursor.x = msg.x;
      G.cursor.y = msg.y;
      break;
    case 'openMenu':
      openAny('menu');
      break;
    case 'open':
      openAny(msg.what);
      break;
    case 'toggleMenu':
      toggleMenu();
      break;
    case 'repair':
      // The main process just put the window right. Measure again and say where everything is.
      fitScreen();
      sendRects();
      break;
    case 'hidden':
      applyHidden(msg.hidden);
      break;
    case 'settings':
      applySettings(msg.settings);
      break;
    case 'openSettings':
      openSettings();
      break;
    case 'display':
      applyDisplay(msg.display);
      // Reopened on the new screen, showing which monitor is now selected.
      if (getNote('settings')) openSettings();
      break;
    case 'quit':
      Promise.all([saveTeam(), saveHouse(), saveNeg()]).finally(() => api.quitReady());
      break;
    case 'reloadArt':
      Promise.all([saveTeam(), saveHouse(), saveNeg()]).finally(() => window.location.reload());
      break;
    default:
      break;
  }
});

// ---------- startup ----------

// The pool your creatures share. The first time a creature is seen, whatever it had of its own
// joins the pool, and its own file is saved without it.
async function loadHouse(rows) {
  try {
    G.house = sanitizeHouse(JSON.parse((await api.loadData('household')) ?? 'null'));
  } catch {
    G.house = emptyHouse();
  }
  try {
    G.neg = sanitizeNegWorld(JSON.parse((await api.loadData('negative')) ?? 'null'));
  } catch {
    G.neg = emptyNegWorld();
  }
  const newcomers = rows.filter((r) => !r.c.household);
  if (!newcomers.length) return;
  newcomers.forEach((r) => joinHouse(G.house, r.c));
  await saveHouse();
  for (const r of newcomers) await api.saveCreature(r.base, creatureText(r.c));
}

async function start() {
  const info = await api.info();
  applySettings(info.settings);
  G.speed = info.speed;
  G.test = info.test;
  G.home = info.home;
  applyDisplay(info.display);
  // If the window changes size, fit to it now, then ask where the taskbar is.
  window.addEventListener('resize', () => {
    fitScreen();
    api.info().then((fresh) => applyDisplay(fresh.display));
  });
  await loadArt();
  if (info.hidden) applyHidden(true);

  const files = await api.listCreatures();
  const rows = [];
  for (const f of files) {
    try {
      const c = parseCreature(f.text);
      // The dead stay dead, even if their file gets moved back here.
      if (!c.dead) rows.push({ base: f.base, c });
    } catch (err) {
      console.error(`Skipping ${f.base}.creature: ${err.message}`);
    }
  }
  await loadHouse(rows);

  // Whoever was out last time comes back out.
  const out = (info.settings.team ?? []).map((base) => rows.find((r) => r.base === base)).filter(Boolean).slice(0, TEAM_MAX);
  if (!out.length && rows.length) out.push(rows.find((r) => r.base === info.settings.active) ?? rows[0]);
  out.forEach((r) => addMember(r.c, r.base));
  await loadVillage();
  initDock();
  tickVillage();
  if (G.team.length) {
    lookAfter(G.team.find((m) => m.base === info.settings.active) ?? G.team[0]);
    G.team.forEach((m) => m.pet.say(`hello. it is me, ${m.c.name}`, 3));
  } else {
    beginFirstRun();
  }

  setInterval(frame, 33);

  if (G.test) {
    // Used only by automated runs.
    if (info.fakeDesktop) document.body.classList.add('fake-desktop');
    window.__game = { G, frame, update, draw, fitScreen };
  }
}

start();
