// The team dock, down the side of your screen. At the top is the party: three slots for the
// creatures out on your screen. Below is everyone else. Drag one from below into a free slot to
// bring it out, or onto a full slot to swap the two; drag one from the party back down to put it
// away. A creature on the screen can also be dragged back onto the dock.

import { toast } from './flair.js';
import { G, api, inBout } from '../state.js';
import { h } from './notes.js';
import { fullName, stageOf, powerOf, pathTitle, raceName } from '../core/creature.js';
import { awayBases } from '../core/village.js';
import { chosenAttune } from '../core/chosen.js';
import { TEAM_MAX } from '../data/family.js';
import { drawPortrait } from '../draw/art.js';

const KEY = 'creature-dock';
let el = null;
let portraits = [];
let drag = null;
let stale = false;

const isOpen = () => {
  try {
    return localStorage.getItem(KEY) !== 'closed';
  } catch {
    return true;
  }
};

function setOpen(on) {
  try {
    localStorage.setItem(KEY, on ? 'open' : 'closed');
  } catch { /* nowhere to remember it */ }
  el?.classList.toggle('closed', !on);
}

// Where one creature is: out on your screen, at home, down the Legendary Mine, or away.
function placeOf(row) {
  if (G.team.some((m) => m.base === row.base)) return 'out';
  if (awayBases(G.house).has(row.base)) return 'away';
  if (G.house.mine?.includes(row.c.id)) return 'mine';
  return 'home';
}
const ORDER = { home: 0, mine: 1, away: 2 };

export function initDock() {
  if (el) return;
  el = h('div', { id: 'dock' });
  el.classList.toggle('closed', !isOpen());
  document.body.append(el);
  refreshDock();
}

export function refreshDock() {
  if (!el) return;
  // Never under a creature being dragged out of it.
  if (drag) {
    stale = true;
    return;
  }
  stale = false;
  portraits = [];
  const party = G.team.map((m) => G.everyone.find((r) => r.base === m.base) ?? { base: m.base, c: m.c });
  const rest = G.everyone.filter((r) => placeOf(r) !== 'out').sort((a, b) => ORDER[placeOf(a)] - ORDER[placeOf(b)] || powerOf(b.c) - powerOf(a.c));
  const open = isOpen();
  el.replaceChildren(
    h('div', { class: 'dock-head' },
      h('span', null, 'Party'),
      h('button', {
        class: 'dock-toggle',
        title: open ? 'Tuck your creatures away' : 'Show your creatures',
        onclick: () => {
          setOpen(!isOpen());
          refreshDock();
        },
      }, open ? '‹' : '›')),
    h('div', { class: 'dock-party' },
      party.map((row, i) => tile(row, 'out', i)),
      Array.from({ length: TEAM_MAX - party.length }, (_, i) => h('div', { class: 'dock-slot empty', 'data-slot': party.length + i }, 'drop one here'))),
    h('div', { class: 'dock-sep' }, `Village${rest.length ? ` (${rest.length})` : ''}`),
    h('div', { class: 'dock-list' }, rest.length ? rest.map((row) => tile(row, placeOf(row))) : h('div', { class: 'dock-hint' }, 'Nobody else yet')),
    h('button', { class: 'dock-add', title: 'Hatch an egg or breed two', onclick: () => G.open?.('nursery:eggs') }, '+ Egg'),
  );
}

function tile(row, place, slot = null) {
  const { c } = row;
  const canvas = h('canvas');
  portraits.push({ canvas, c });
  const me = G.creature === c;
  const where = {
    out: 'In the party, out on your screen. Drag it down to the village to put it away.',
    home: 'In the village. Drag it into the party to bring it out.',
    mine: 'Down the Legendary Mine. Drag it into the party to bring it out.',
    away: 'Away on an expedition.',
  }[place];
  const t = h('div', {
    class: `dock-tile ${place}${me ? ' me' : ''}${slot !== null ? ' dock-slot' : ''}${chosenAttune(G.house, c) ? ' chosen' : ''}`,
    'data-slot': slot ?? undefined,
    title: `${fullName(c)}: ${raceName(c)}, ${stageOf(c).name}, ${pathTitle(c)}. Power ${powerOf(c)}.\n${where}`,
  },
  canvas,
  h('div', { class: 'dock-name' }, c.name),
  h('span', { class: 'dock-dot' }),
  place === 'out' && G.team.length > 1 && h('button', {
    class: 'dock-home',
    title: 'Put it away',
    onpointerdown: (e) => e.stopPropagation(),
    onclick: async (e) => {
      e.stopPropagation();
      if (!(await G.putAway(c))) toast(`${c.name} can't go just now`, 'bad');
    },
  }, '↓'),
  place === 'away' && h('span', { class: 'dock-away' }, 'away'));
  t.addEventListener('pointerdown', (e) => startDrag(e, row, place));
  return t;
}

export function tickDock() {
  portraits.forEach(({ canvas, c }) => drawPortrait(canvas, c));
}

// Where the dock is on the screen, so the mouse can reach it through the click-through window.
export function dockRects() {
  if (!el || G.hidden) return [];
  const r = el.getBoundingClientRect();
  return [{ x: r.left, y: r.top, w: r.width, h: r.height, instant: true }];
}

export function overDock(x, y) {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

// Lights the dock up while a creature is carried over it.
export function setDockDrop(on) {
  el?.classList.toggle('drop-here', !!on);
}

// ---------- dragging ----------

// The party slot under a point, if any: { index, row } with row null for an empty one.
function slotAt(x, y) {
  const hit = document.elementFromPoint(x, y)?.closest?.('#dock .dock-slot');
  if (!hit) return null;
  const index = Number(hit.dataset.slot);
  const m = G.team[index];
  return { index, el: hit, member: m ?? null };
}

const overVillage = (x, y) => !!document.elementFromPoint(x, y)?.closest?.('#dock .dock-list, #dock .dock-sep');

function hintFor(row, place, x, y) {
  if (place === 'out') return overVillage(x, y) ? 'Let go to put it away' : 'Drag it down to the village to put it away';
  const slot = slotAt(x, y);
  if (!slot) return 'Drag it into the party';
  if (!slot.member) return 'Let go to bring it out';
  return `Let go to swap it with ${slot.member.c.name}`;
}

function highlight(x, y) {
  el?.querySelectorAll('.dock-slot.target').forEach((s) => s.classList.remove('target'));
  el?.querySelector('.dock-list')?.classList.remove('target');
  if (!drag?.moved) return;
  if (drag.place === 'out') {
    if (overVillage(x, y)) el?.querySelector('.dock-list')?.classList.add('target');
    return;
  }
  slotAt(x, y)?.el.classList.add('target');
}

function startDrag(e, row, place) {
  if (e.button !== 0) return;
  if (place === 'away') {
    toast(`${row.c.name} is away on an expedition`, 'info');
    return;
  }
  e.preventDefault();
  const start = { x: e.clientX, y: e.clientY };
  api.captureAll(true);
  drag = { row, place, moved: false, ghost: null, label: null };
  const move = (m) => {
    if (!drag) return;
    if (!drag.moved) {
      if (Math.hypot(m.clientX - start.x, m.clientY - start.y) < 6) return;
      drag.moved = true;
      drag.ghost = h('canvas', { class: 'dock-ghost' });
      drag.label = h('div', { class: 'dock-ghost-label' });
      document.body.append(drag.ghost, drag.label);
      drawPortrait(drag.ghost, row.c);
    }
    drag.ghost.style.left = `${m.clientX}px`;
    drag.ghost.style.top = `${m.clientY}px`;
    drag.label.style.left = `${m.clientX}px`;
    drag.label.style.top = `${m.clientY}px`;
    drag.label.textContent = hintFor(row, place, m.clientX, m.clientY);
    highlight(m.clientX, m.clientY);
  };
  const up = async (u) => {
    window.removeEventListener('pointermove', move, true);
    window.removeEventListener('pointerup', up, true);
    window.removeEventListener('pointercancel', up, true);
    api.captureAll(false);
    const d = drag;
    highlight(-1, -1);
    drag = null;
    d?.ghost?.remove();
    d?.label?.remove();
    try {
      if (!d?.moved) await clickTile(row, place);
      else await dropAt(row, place, u.clientX, u.clientY);
    } finally {
      if (stale) refreshDock();
    }
  };
  // On the window, so a dock redrawn mid-drag can't strand the creature in mid-air.
  window.addEventListener('pointermove', move, true);
  window.addEventListener('pointerup', up, true);
  window.addEventListener('pointercancel', up, true);
}

// A click: look after one in the party, or bring one out if there is a free slot.
async function clickTile(row, place) {
  if (place === 'out') {
    G.lookAfter(row.c);
    G.open?.('menu');
    return;
  }
  if (G.team.length >= TEAM_MAX) {
    toast(`The party is full: drag ${row.c.name} onto one of them to swap`, 'info');
    return;
  }
  const m = await G.bringOut(row.base, row.c);
  if (!m) toast('Everyone out is in the middle of a fight', 'bad');
}

async function dropAt({ base, c }, place, x, y) {
  if (place === 'out') {
    if (!overVillage(x, y)) return;
    if (!(await G.putAway(c))) toast(G.team.length <= 1 ? 'One always stays out' : `${c.name} can't go just now`, 'info');
    return;
  }
  const slot = slotAt(x, y);
  if (!slot) return;
  if (slot.member) {
    if (inBout(slot.member.c)) {
      toast(`${slot.member.c.name} is in the middle of a fight`, 'bad');
      return;
    }
    // A full slot: that one goes home, and this one takes its place.
    if (G.team.length > 1) await G.putAway(slot.member.c);
  }
  const out = await G.bringOut(base, c);
  if (!out) toast('Everyone out is in the middle of a fight', 'bad');
}
