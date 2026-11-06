// The creature menu, naming and renaming, feeding, job choices, the farm and settings.

import { toast, glow, newBadge, markSeen, rich } from './flair.js';
import { G, api, saveCreature, creatureText } from '../state.js';
import { h, fill, button, openNote, closeNote, getNote, isTopNote, pickRect, notesAway } from './notes.js';
import {
  newCreature, parseCreature, serializeCreature, computeStats, stageOf, growthProgress,
  STAT_KEYS, STAT_LABELS, pathTitle, pathChoice, choosePath, nextTierProgress, isFinalForm, powerOf,
  maxHpOf, powerReady, statLimits, STAT_LIMITS, fullName, ofaLevel, raceName, mutationCap,
} from '../core/creature.js';
import { TEAM_MAX } from '../data/family.js';
import { FOODS } from '../data/foods.js';
import { PATHS, ABILITIES } from '../data/paths.js';
import { WEAPONS } from '../data/forge.js';
import { EXPEDITIONS } from '../data/village.js';
import { STANDS, QUIRKS, TECHNIQUES, LEGENDARY, TRAITS, OFA_ID } from '../data/powers.js';
import { FRUITS } from '../data/fruits.js';
import { RACES, DEFAULT_RACE } from '../data/races.js';
import { CROPS, CROP_IDS } from '../data/crafting.js';
import { addField, removeField, farmCounts, fieldCap, animalCap, ANIMALS, adoptAnimal, animalUnlocked, TILE, setFieldCrop, waterFields, waterReadyIn } from '../sim/farm.js';
import { dropRig, drawPortrait, hasArt, artUrl, setPictureScale } from '../draw/art.js';
import { openDuel } from './duel.js';
import { openArena } from './boards.js';
import { openPowers } from './powers.js';
import { openChallenges } from './challenges.js';
import { openGuide } from './guide.js';
import { openPlan } from './plan.js';
import { openSheet } from './sheet.js';
import { openWorkshop } from './workshop.js';
import { openNursery } from './nursery.js';
import { openVillage, expeditionClock, tickClocks } from './village.js';
import { openCreatures, renameCreature } from './creatures.js';
import { openAdventure } from './adventure.js';
import { nextStep } from '../core/advice.js';

// ---------- naming ----------

export function openNaming({ first = false, onName }) {
  openNote('naming', {
    title: first ? 'Something landed on your screen' : 'A new egg',
    focus: true,
    width: 300,
    at: G.egg ? { x: G.egg.x + 50, y: G.egg.y - 170 } : undefined,
    build(body) {
      const input = h('input', { type: 'text', maxLength: 24, placeholder: 'Name it', spellcheck: false });
      const go = async () => {
        const name = input.value.trim();
        if (!name) {
          input.focus();
          return;
        }
        closeNote('naming');
        onName(name);
      };
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      fill(body, 
        h('p', { style: 'margin:0 0 8px' }, first ? 'It is yours now. Whatever you name it, a .creature file gets made with that name. That file is your creature.' : 'Name it to create its .creature file.'),
        input,
        h('div', { class: 'row gap' }, button('Hatch it', go, 'big hot')),
      );
      setTimeout(() => input.focus(), 60);
    },
  });
}

// Makes its .creature file. Bringing it out on the screen is up to whoever asked.
export async function createCreature(name, made = newCreature(name)) {
  const c = made;
  const base = await api.newCreatureBase(c.name);
  await api.saveCreature(base, serializeCreature(c));
  return { c, base };
}

// ---------- the main menu ----------

// The bar shows where it is, and the mark on it shows how far this stat can go right now.
const BAR_TOP = 66;

function statRow(key, value, limit) {
  return h('div', { class: 'stat', title: `Right now ${STAT_LABELS[key]} can reach ${limit}` },
    h('span', null, STAT_LABELS[key]),
    h('div', { class: 'bar blue' },
      h('i', { style: `width:${Math.min(100, (value / BAR_TOP) * 100)}%` }),
      h('u', { style: `left:${Math.min(100, (limit / BAR_TOP) * 100)}%` })),
    h('b', null, value, h('small', null, `/${limit}`)));
}

// The menu stays open beside whatever it opens, like tabs.
const leaveMenu = (open) => () => open();

const meter = (label, color, fillBar) => h('div', { class: 'meter' }, h('span', null, label), h('div', { class: `bar ${color}` }, fillBar));

// A labeled row in the menu's grid of buttons.
const actionRow = (label, ...buttons) => [h('div', { class: 'sect' }, label), h('div', { class: `actions${buttons.length === 3 ? ' three' : ''}` }, buttons)];

// A menu button with a short hint when the mouse rests on it.
const act = (label, onclick, hint, cls = '', disabled = false) => {
  const el = button(label, onclick, cls, disabled);
  el.title = hint;
  return el;
};

const footButton = (label, onclick, disabled = false, title = '') => h('button', { class: 'footbtn', onclick, disabled, title }, label);

// Its gifts, powers and mutation count in one line.
function powerSummary(c) {
  const { stand, speedster, technique, technique2, fruit, quirks } = c.powers;
  const names = [
    raceName(c) !== RACES[DEFAULT_RACE].name && raceName(c),
    ...c.traits.map((id) => TRAITS[id].name),
    c.legendary && LEGENDARY[c.legendary].name,
    stand && STANDS[stand].name,
    speedster && 'Speedster',
    technique && TECHNIQUES[technique].name,
    technique2 && TECHNIQUES[technique2].name,
    fruit && FRUITS[fruit].name,
    ...quirks.map((id) => (id === OFA_ID ? `One For All ${ofaLevel(c)}` : QUIRKS[id].name)),
    c.weapon && WEAPONS[c.weapon]?.name,
  ].filter(Boolean);
  const mutations = `${c.mutations.length} of ${mutationCap(c)} mutations`;
  return names.length ? `${names.join(', ')}. ${mutations}.` : `${mutations}.`;
}

export function openMenu() {
  const c = G.creature;
  if (!c) return;
  openNote('menu', {
    title: fullName(c),
    width: 344,
    help: 'start',
    build(body, note) {
      const canvas = h('canvas', { class: 'portrait' });
      note.refs.canvas = canvas;
      note.refs.food = h('i', { style: 'width:0' });
      note.refs.grow = h('i', { style: 'width:0' });
      note.refs.stage = h('div', { class: 'small' });

      const tier = nextTierProgress(c);
      const stats = computeStats(c);
      const limits = statLimits(c);
      const choice = pathChoice(c);
      const mining = G.pet?.kind === 'work';
      const [best, second, third, fourth, worst] = STAT_LIMITS;

      // Who it is, at a glance. The details live in the What it has note.
      // The household at a glance, beside who it is.
      const count = G.everyone.length || G.team.length;
      const household = [
        `${Math.floor(G.house.bank.gems)} gems`,
        `${Math.floor(G.house.ore)} ore`,
        `${count} creature${count === 1 ? '' : 's'}`,
        G.house.adventure.best > 0 && `Adventure ${G.house.adventure.best}/20`,
      ].filter(Boolean).join(', ');
      fill(body, h('div', { class: 'row nowrap' },
        canvas,
        h('div', { class: 'grow' },
          note.refs.stage,
          h('div', { class: 'small' }, `Power ${powerOf(c)}, max HP ${maxHpOf(c)}`),
          h('div', { class: 'small' }, powerSummary(c)),
          h('div', { class: 'small household' }, household),
          meter('Fullness', '', note.refs.food),
          meter('Growth', 'green', note.refs.grow),
          tier && meter(`Next job`, '', h('i', { style: `width:${Math.min(100, (tier.xp / tier.at) * 100)}%;background:#8a5ad0`, title: `${Math.floor(tier.xp)} of ${tier.at} XP` }))),
      ));

      if (choice) {
        fill(body, h('div', { class: 'callout' },
          h('div', { class: 'row nowrap' },
            h('div', { class: 'grow hand' }, c.path.line.length ? 'Ready for its next job!' : 'Ready to pick a job!'),
            button('Choose', leaveMenu(openPathChoice), 'hot'))));
      }
      if (powerReady(c)) {
        fill(body, h('div', { class: 'callout' },
          h('div', { class: 'row nowrap' },
            h('div', { class: 'grow hand' }, 'Something is waking up in it.'),
            button('Look', leaveMenu(openPowers), 'hot'))));
      }

      // One suggestion for what to do next, when nothing bigger is waiting. Its button glows.
      markSeen('menu');
      const tip = nextStep(c, { out: G.team.length, home: G.village.length, away: G.house.expeditions.length });
      if (tip) {
        fill(body, h('div', { class: `tip${G.settings.calm ? '' : ' loud'}` },
          h('div', { class: 'grow' }, h('b', null, 'Next: '), rich(tip.text)),
          tip.go && glow(button('Go', () => openAny(tip.go), 'mini'))));
      }

      // The next expedition home, counting down.
      note.refs.clocks = [];
      const next = G.house.expeditions.slice().sort((x, y) => x.end - y.end)[0];
      if (next) {
        fill(body,
          h('div', { class: 'small', style: 'margin-top:4px' }, `${G.house.expeditions.length === 1 ? 'Expedition' : `${G.house.expeditions.length} expeditions out. Next one`} back from ${EXPEDITIONS[next.where].name.toLowerCase()}:`),
          expeditionClock(note, next));
      }

      fill(body,
        h('div', { class: 'gap', style: 'display:grid;gap:3px;margin-top:6px' }, STAT_KEYS.map((k) => statRow(k, stats[k], limits[k]))),
        h('div', { class: 'small', style: 'margin-top:3px' }, `Only one stat can reach ${best}, one ${second}, one ${third}, one ${fourth}, one ${worst}.`),
        actionRow('Look after it',
          act('Feed', leaveMenu(openFeed), 'Free snacks, and the plants your farms grew'),
          mining
            ? act('Stop mining', () => {
              G.pet.stopRequested = true;
              note.close();
            }, 'Stop the mining run it is on', 'hot')
            : act('Mine colors', leaveMenu(beginMine), 'Draw a box on your screen and it digs the colors out'),
          act('Farm', leaveMenu(openFarm), 'Fields, plants and animals'),
          act('Workshop', leaveMenu(openWorkshop), 'Dye, charms, paint, and the forge for weapons')),
        actionRow('Its build',
          act('Powers', leaveMenu(openPowers), 'Stands, speedster powers, cursed techniques, Quirks, One For All'),
          act('Battle plan', leaveMenu(openPlan), 'Its moves, and how it fights'),
          act('What it has', leaveMenu(openSheet), 'Everything it has, and what each thing does')),
        actionRow('Fight',
          newBadge(act('Adventure', leaveMenu(openAdventure), 'A 20-level campaign for a party of three', '', !!G.challenge), 'adventure'),
          act('Challenges', leaveMenu(openChallenges), 'Training monsters, and fights to the death'),
          act('Arena', leaveMenu(openArena), 'A free-for-all with any .creature files', '', !!G.challenge),
          act('Puzzle duel', leaveMenu(openDuel), 'Play a puzzle against it')),
        actionRow('Your creatures',
          newBadge(act('Creatures', leaveMenu(openCreatures), 'Every creature you have, in one place'), 'creatures'),
          newBadge(act('Nursery', leaveMenu(() => openNursery()), 'Breed, hatch eggs, use items, the Mega Breeder'), 'nursery'),
          newBadge(act('Village', leaveMenu(() => openVillage()), 'Work, the Legendary Mine, and expeditions'), 'village')),
        h('div', { class: 'menufoot' },
          footButton('Guide', leaveMenu(() => openGuide())),
          footButton('Rename', leaveMenu(openRename)),
          footButton('Settings', leaveMenu(openSettings)),
          footButton('Export', () => exportCreature(), !isFinalForm(c), isFinalForm(c) ? '' : 'It can be exported once it reaches a final form'),
          footButton('Close game', () => api.closeGame())),
      );
      // The button for the next step glows too, wherever it is in the grid.
      const goKey = String(tip?.go ?? '').split(':')[0];
      const target = tip && ({ feed: 'Feed', farm: 'Farm', mine: 'Mine colors', workshop: 'Workshop', challenges: 'Challenges', nursery: 'Nursery', expeditions: 'Village', village: 'Village', creatures: 'Creatures', adventure: 'Adventure', powers: 'Powers' }[goKey] ?? null);
      if (target) glow([...body.querySelectorAll('.actions .btn')].find((b) => b.textContent === target));
      note.spec.tick(note);
    },
    tick(note) {
      const { canvas, food, grow, stage } = note.refs;
      if (!canvas) return;
      tickClocks(note);
      drawPortrait(canvas, c);
      food.style.width = `${c.fullness}%`;
      grow.style.width = `${growthProgress(c) * 100}%`;
      stage.textContent = `${pathTitle(c)}, ${stageOf(c).name}`;
    },
  });
}

async function exportCreature() {
  await saveCreature();
  const saved = await api.exportCreature(G.base, creatureText(G.creature));
  if (saved) G.pet?.say('exported. i am famous', 3, true);
}

export function refreshMenu() {
  getNote('menu')?.rebuild();
  getNote('farm')?.rebuild();
  getNote('powers')?.rebuild();
}

// The taskbar button: opens the menu, or closes it if it is already in front.
export function toggleMenu() {
  if (!G.creature && G.team.length) G.lookAfter(G.team[0].c);
  const note = getNote('menu');
  if (note && isTopNote(note)) closeNote('menu');
  else openAny('menu');
}

// Opens anything by name: from the taskbar and its jump list, the menu's tip, and the guide.
// Something that needs a creature opens the village instead when nobody is being looked after.
const OPEN = {
  village: (tab) => openVillage(tab || 'work'),
  mine: () => openVillage('mine'),
  expeditions: () => openVillage('expeditions'),
  creatures: () => openCreatures(),
  nursery: (tab) => openNursery(tab || 'breed'),
  breed: () => openNursery('breed'),
  roll: () => openNursery('eggs'),
  eggs: () => openNursery('eggs'),
  items: () => openNursery('bag'),
  adventure: () => openAdventure(),
  settings: () => openSettings(),
  arena: () => openArena(),
};
const FOR_ONE = {
  rename: () => openRename(),
  forge: () => openWorkshop('forge'),
  menu: () => openMenu(),
  feed: () => openFeed(),
  farm: () => openFarm(),
  mine: () => beginMine(),
  workshop: () => openWorkshop(),
  challenges: () => openChallenges(),
  plan: () => openPlan(),
  powers: () => openPowers(),
  sheet: () => openSheet(),
  duel: () => openDuel(),
  path: () => openPathChoice(),
};
export function openAny(what = 'menu') {
  if (!G.creature && G.team.length) G.lookAfter(G.team[0].c);
  const [key, page] = String(what).split(':');
  if (key === 'guide') openGuide(page || 'start');
  else if (OPEN[key]) OPEN[key](page);
  else if (!G.creature) openCreatures();
  else (FOR_ONE[key] ?? FOR_ONE.menu)();
}
G.open = openAny;

// ---------- settings ----------

export async function openSettings() {
  const displays = await api.listDisplays();
  openNote('settings', {
    title: 'Settings',
    cls: 'paper',
    width: 300,
    build(body) {
      // A slider, with its label and live preview. It saves when you let go.
      const makeSlider = (cls, min, max, step, value, preview, save) => {
        const percent = h('span', { class: 'small' }, `${value}%`);
        const slider = h('input', {
          type: 'range',
          class: `slider ${cls}`,
          min,
          max,
          step,
          value,
          // Keeps the mouse on the overlay if it wanders off the note mid-drag.
          onpointerdown: () => api.captureAll(true),
          onpointerup: () => api.captureAll(false),
          oninput: (e) => {
            percent.textContent = `${e.target.value}%`;
            preview(Number(e.target.value));
          },
          onchange: (e) => save(Number(e.target.value)),
        });
        return { percent, slider };
      };
      const size = makeSlider('size', 50, 300, 10, Math.round((G.settings.scale ?? 1) * 100),
        (v) => setPictureScale(v / 100),
        (v) => api.setSetting('scale', v / 100));
      const see = makeSlider('see', 0, 80, 5, Math.round((1 - (G.settings.opacity ?? 0.75)) * 100),
        (v) => document.documentElement.style.setProperty('--see', 1 - v / 100),
        (v) => api.setSetting('opacity', 1 - v / 100));
      const toggle = (key, label) => h('label', { class: 'toggle' },
        h('input', { type: 'checkbox', checked: !!G.settings[key], onchange: (e) => api.setSetting(key, e.target.checked) }),
        label);
      fill(body,
        h('div', { class: 'sect', style: 'margin-top:0' }, 'Monitor'),
        displays.length < 2
          ? h('div', { class: 'small' }, `Only one monitor found (${displays[0].width} x ${displays[0].height}).`)
          : h('div', { class: 'row', style: 'margin-top:4px' }, displays.map((d) => button(
            `Monitor ${d.number}${d.main ? ' (main)' : ''}`,
            () => api.setDisplay(d.id),
            d.current ? 'hot' : '',
          ))),
        h('div', { class: 'row nowrap', style: 'margin-top:10px' }, h('div', { class: 'sect grow', style: 'margin-top:0' }, 'Size'), size.percent),
        size.slider,
        h('div', { class: 'small' }, 'Your creature and its animals.'),
        h('div', { class: 'row nowrap', style: 'margin-top:10px' }, h('div', { class: 'sect grow', style: 'margin-top:0' }, 'See-through'), see.percent),
        see.slider,
        h('div', { class: 'small' }, 'Everything on screen. A panel goes solid while your mouse is on it.'),
        h('div', { class: 'sect' }, 'Behavior'),
        toggle('quiet', 'Quiet mode (no speech bubbles)'),
        toggle('bottomOnly', 'Stay near the bottom of the screen'),
        toggle('calm', 'Calm mode (no big popups or flashing hints)'),
        h('div', { class: 'sect' }, 'Look'),
        toggle('dark', 'Dark mode (night paper)'),
        h('div', { class: 'sect' }, 'Taskbar'),
        h('div', { class: 'small' }, 'To keep it on your taskbar: start the game with Creature.exe, right-click Creature on the taskbar, and choose Pin to taskbar.'),
        h('div', { class: 'row gap' }, button('Close the game', () => api.closeGame(), 'big')),
      );
    },
  });
}

// ---------- feeding ----------

function plantRow(id, note) {
  const c = G.creature;
  const plant = CROPS[id];
  const file = `farm/${id}.png`;
  return h('div', { class: 'way' },
    h('div', { class: 'top' },
      h('span', { class: 'plain' }, hasArt(file) && h('img', { class: 'foodpic mini', src: artUrl(file), alt: '' }), ` ${plant.name} x${c.larder[id]}`),
      button('Feed', () => {
        const problem = G.pet?.eatPlant(id);
        if (problem) G.pet.say(problem, 2.5, true);
        note.rebuild();
      }, 'mini')),
    h('div', { class: 'small' }, plantLine(id)));
}

const plantLine = (id) => {
  const plant = CROPS[id];
  const stat = FOODS[plant.family].stat;
  return `Grows ${plant.grows}.${stat ? ` Raises ${STAT_LABELS[stat]}.` : ''}`;
};

const feedStamp = (c) => CROP_IDS.map((id) => c.larder[id]).join();

// Simple food is free and always there. Only farmed food grows mutations.
export function openFeed() {
  openNote('feed', {
    title: 'Feed',
    cls: 'kraft',
    width: 320,
    build(body, note) {
      const c = G.creature;
      note.refs.stamp = feedStamp(c);
      const grown = CROP_IDS.filter((id) => c.larder[id] > 0);
      fill(body,
        h('div', { class: 'row' }, button('Give it a snack', () => {
          const problem = G.pet?.feedSnack();
          if (problem) G.pet.say(problem, 2.5, true);
        }, 'big hot')),
        h('div', { class: 'small', style: 'margin-top:4px' }, 'Free, and always here. Snacks fill it up and help it grow, but never change it.'),
        h('div', { class: 'sect' }, 'Farmed food'),
        h('div', { class: 'small' }, 'Only food from your farms grows mutations. All your creatures share it.'),
        grown.length
          ? h('div', { class: 'ways' }, grown.map((id) => plantRow(id, note)))
          : h('div', { class: 'row', style: 'margin-top:5px' },
            h('span', { class: 'small grow' }, 'Nothing harvested yet.'),
            button('Go to the farm', () => openFarm())),
      );
    },
    tick(note) {
      if (G.creature && note.refs.stamp !== feedStamp(G.creature)) note.rebuild();
    },
  });
}

// Handles files dropped on a creature. A food file counts as a snack, and anything else is refused.
export function feedPaths(paths, x, y, onDone, pet = G.pet) {
  if (!pet) return;
  let queued = 0;
  for (const path of paths) {
    const name = path.split(/[\\/]/).pop();
    const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
    if (ext === 'creature') {
      pet.say('ooh, a friend', 2.5, true);
      openArena({ importPaths: [path] });
      continue;
    }
    if (!Object.hasOwn(FOODS, ext)) {
      pet.say('bleh. that is not food', 3, true);
      continue;
    }
    G.meals.push({ path, ext, name, x: x + queued * 34, y: y + 4, onDone, pet });
    queued++;
  }
  if (queued) pet.interrupt();
}

// ---------- mining ----------

export async function beginMine() {
  const pet = G.pet;
  if (!pet) return;
  if (pet.c.fullness < 4) {
    pet.say('too hungry to dig', 3, true);
    return;
  }
  // The notes step aside until the colors have been read, so they don't get mined too.
  notesAway(true);
  let grid;
  let rect;
  try {
    rect = await pickRect('Drag a box over the part of the screen to mine');
    if (!rect) return;
    // Pause so the box is gone from the screen before its colors are read.
    await new Promise((r) => { setTimeout(r, 90); });
    const cell = Math.max(22, Math.ceil(Math.sqrt((rect.w * rect.h) / 56)));
    const cols = Math.max(1, Math.round(rect.w / cell));
    const rows = Math.max(1, Math.round(rect.h / cell));
    grid = await api.sampleScreen({ ...rect, cols, rows });
  } catch (err) {
    console.error(err);
    pet.say('i cannot see the screen', 3, true);
    return;
  } finally {
    notesAway(false);
  }
  pet.cancel();
  pet.run(pet.mineRun({ ...rect, cols: grid.cols, rows: grid.rows, colors: grid.colors }), 'work');
}

// ---------- path choices ----------

export function openPathChoice() {
  const c = G.creature;
  const options = pathChoice(c);
  if (!options) return;
  openNote('path', {
    title: c.path.line.length ? `${c.name} can specialize` : `What should ${c.name} become?`,
    width: options.length >= 3 ? 150 + options.length * 120 : 400,
    cls: 'paper',
    build(body) {
      fill(body, 
        h('div', { class: 'pathcards' }, options.map((id) => {
          const node = PATHS[id];
          const stats = Object.entries(node.stats ?? {}).map(([k, v]) => `+${v} ${STAT_LABELS[k]}`).join(', ');
          return h('button', {
            class: 'pathcard',
            onclick: () => {
              if (!choosePath(c, id)) return;
              dropRig(c);
              closeNote('path');
              G.fx.float(G.pet.x, G.pet.y - 110, node.name, '#ffe680', 22);
              toast(`NEW JOB: ${node.name.toUpperCase()}!`, 'good');
              G.pet.say(isFinalForm(c) ? 'this is my final form' : `i am a ${node.name.toLowerCase()}`, 4, true);
              saveCreature();
              refreshMenu();
            },
          },
          h('h4', null, node.name),
          h('p', null, node.blurb),
          h('div', { class: 'small' }, stats),
          node.ability && h('div', { class: 'small' }, `Arena move: ${ABILITIES[node.ability].name}`));
        })),
        h('div', { class: 'small', style: 'margin-top:8px' }, c.path.line.length === 0
          ? 'This is forever. It can still try the other two, but only its job makes it level up.'
          : 'This is forever too.'),
      );
    },
  });
}

// ---------- farm ----------

const farmStamp = (c) => `${Math.floor(c.farm.store)}:${c.record.harvested}:${c.farm.animals.length}:${Math.ceil(waterReadyIn(c, Date.now()) / 60000)}`;

function fieldCard(c, f, i, note) {
  return h('div', { class: 'way', style: 'margin-top:5px' },
    h('div', { class: 'top' }, `Field ${i + 1}: ${CROPS[f.crop].name}`, button('Remove', () => {
      removeField(c, f.id);
      saveCreature();
      note.rebuild();
    }, 'mini')),
    h('div', { class: 'cropgrid' }, CROP_IDS.map((id) => button(CROPS[id].name, () => {
      setFieldCrop(c, f.id, id);
      saveCreature();
      note.rebuild();
    }, f.crop === id ? 'hot mini' : 'mini'))),
    h('div', { class: 'small', style: 'margin-top:3px' }, plantLine(f.crop)));
}

export function openFarm() {
  const c = G.creature;
  openNote('farm', {
    title: 'The farm',
    width: 330,
    build(body, note) {
      const fields = c.farm.fields;
      const cap = fieldCap(c);
      const animalLimit = animalCap(c);
      const waterLeft = waterReadyIn(c, Date.now());
      note.refs.line = h('span', { class: 'small grow' });
      note.refs.seen = farmStamp(c);
      fill(body,
        h('div', { class: 'small' }, 'Dig a field and it looks after it on its own. What it harvests goes to Feed, where any of your creatures can eat it and grow mutations.'),
        h('div', { class: 'row gap' }, button(fields.length >= cap ? `Field limit reached (${cap})` : 'Dig a new field', () => digField(), 'big hot', fields.length >= cap)),
        fields.map((f, i) => fieldCard(c, f, i, note)),
        fields.length > 0 && h('div', { class: 'row', style: 'margin-top:5px' },
          note.refs.line,
          button(waterLeft > 0 ? `Water again in ${Math.ceil(waterLeft / 60000)} min` : 'Water', () => {
            if (waterFields(c, Date.now())) {
              G.pet?.say('glug glug', 2, true);
              saveCreature();
              note.rebuild();
            }
          }, 'mini', waterLeft > 0),
          button('Feed', () => openFeed(), 'mini')),
        h('div', { class: 'sect' }, `Animals (${c.farm.animals.length}/${animalLimit})`),
        h('div', { class: 'small' }, `They lay food into the store all your creatures share, and any of them eats from it when hungry. In store: ${Math.floor(c.farm.store)}.`),
        Object.entries(ANIMALS).map(([kind, a]) => {
          const unlocked = animalUnlocked(c, kind);
          const owned = c.farm.animals.filter((x) => x.kind === kind).length;
          return h('div', { class: 'row', style: 'margin-top:3px' },
            h('span', { class: 'grow' }, unlocked ? `${a.name} x${owned}` : `${a.name}: harvest ${a.unlock} crops first`),
            unlocked && button(`Adopt (${a.cost} food)`, () => {
              const f = fields[0];
              if (!f) {
                G.pet.say('need a field first', 2.5, true);
                return;
              }
              const made = adoptAnimal(c, kind, f.x + (f.cols * TILE) / 2, f.y + f.rows * TILE + 14, Date.now());
              if (made) {
                saveCreature();
                note.rebuild();
              }
            }, 'mini', c.farm.store < a.cost || c.farm.animals.length >= animalLimit));
        }),
      );
      note.spec.tick(note);
    },
    tick(note) {
      // Adopt and water buttons depend on these, so redraw when any of them change.
      if (note.refs.seen !== farmStamp(c)) {
        note.rebuild();
        return;
      }
      const counts = farmCounts(c);
      if (note.refs.line) note.refs.line.textContent = `Growing ${counts.growing}, ripe ${counts.ripe}.`;
    },
  });
}

async function digField() {
  const rect = await pickRect('Drag a box where the field should go');
  if (!rect || !G.creature) return;
  const field = addField(G.creature, rect);
  if (field) {
    G.pet.jobWait = 0;
    G.pet.interrupt();
    G.pet.say('dirt!', 2, true);
  }
  saveCreature();
  openFarm();
}

// ---------- renaming ----------

// The creature list moved to a note of its own; it can still be opened from here.
export { openCreatures };

// A new name for the one being looked after. Its .creature file is renamed to match.
export function openRename() {
  const c = G.creature;
  if (!c) return;
  openNote('rename', {
    title: `Rename ${c.name}`,
    cls: 'paper',
    width: 290,
    focus: true,
    message: '',
    build(body, note) {
      const input = h('input', { type: 'text', maxLength: 24, spellcheck: false, value: c.name });
      const go = async () => {
        const before = c.name;
        const res = await renameCreature(G.base, c, input.value);
        if (res.problem) {
          note.spec.message = res.problem;
          note.rebuild();
          return;
        }
        note.close();
        if (before !== c.name) toast(`${before.toUpperCase()} IS NOW ${c.name.toUpperCase()}!`, 'good');
      };
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      fill(body,
        h('div', { class: 'small' }, 'Its .creature file gets the new name too. Its family name stays the same.'),
        h('div', { class: 'row gap' }, input),
        note.spec.message && h('div', { class: 'warning' }, note.spec.message),
        h('div', { class: 'row gap' }, button('Rename it', go, 'big hot')),
      );
      setTimeout(() => {
        input.focus();
        input.select();
      }, 60);
    },
  });
}
