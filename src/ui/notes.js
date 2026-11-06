// Sticky-note panels. h() builds DOM with text nodes only, never innerHTML, so names from
// imported .creature files cannot inject anything into the page.
//
// Most belong to one creature: they hide while you look after another, and come back where you
// left them when you click it again. A few, like Settings and the arena, belong to no creature and
// always stay. Related notes share one hub (Care, Powers, Fight, Home): a hub is one note on the
// screen with index tabs along its top, and the notes behind the other tabs wait, out of sight, just
// as you left them.

import { clamp } from '../lib/util.js';
import { G, api } from '../state.js';

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k in el && k !== 'list') el[k] = v;
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

// Like el.append, but accepts nested arrays and skips false/null, the same way h() does.
export function fill(el, ...kids) {
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
}

export const button = (label, onclick, cls = '', disabled = false) => h('button', { class: `btn ${cls}`, onclick, disabled }, label);

// For what can't be undone: the first press asks, the second does it, and moving away calls it off.
export function sureButton(label, onSure, cls = '', disabled = false) {
  let armed = false;
  const el = button(label, () => {
    if (!armed) {
      armed = true;
      el.textContent = 'Forever?';
      el.classList.add('hot');
      return;
    }
    onSure();
  }, cls, disabled);
  el.addEventListener('mouseleave', () => {
    armed = false;
    el.textContent = label;
    if (!cls.includes('hot')) el.classList.remove('hot');
  });
  return el;
}

// Notes that belong to no creature in particular.
const GLOBAL = new Set(['settings', 'arena', 'creatures', 'village', 'nursery', 'adventure', 'farewell', 'naming', 'search', 'negative']);

// The hubs, and the notes behind each of their tabs.
export const HUBS = {
  care: { name: 'Care', tabs: [['feed', 'Feed'], ['workshop', 'Gear']] },
  powers: { name: 'Powers', tabs: [['powers', 'Powers'], ['plan', 'Battle plan'], ['sheet', 'What it has']] },
  fight: { name: 'Fight', tabs: [['adventure', 'Adventure'], ['challenges', 'Challenges'], ['arena', 'Arena']] },
  home: { name: 'Home', tabs: [['creatures', 'Creatures'], ['nursery', 'Nursery'], ['village', 'Village']] },
  help: { name: 'Help', tabs: [['guide', 'Guide'], ['settings', 'Settings']] },
};
const HUB_OF = Object.fromEntries(Object.entries(HUBS).flatMap(([hub, { tabs }]) => tabs.map(([id]) => [id, hub])));
export const hubOf = (id) => HUB_OF[id] ?? null;
// The tab each hub was last left on, so its button in the menu opens that one again.
const lastTab = {};
export const lastTabOf = (hub) => lastTab[hub] ?? HUBS[hub]?.tabs[0][0];

const notes = new Map();
let zTop = 10;
let away = 0;

const keyFor = (id, cid = G.creature?.id ?? '') => (GLOBAL.has(id) ? id : `${id}@${cid}`);
// Its creature is the one being looked after, or it belongs to nobody.
const mine = (note) => note.who === null || note.who === (G.creature?.id ?? '');
// On the screen right now: one of mine, and the open tab of its hub.
const shown = (note) => !note.buried && mine(note);

// The window only takes typing while a note that needs it is showing: one that asks for it, or one
// with a box to type in, like a name for something an expedition found. Otherwise every key you
// press goes to your other apps, as it should.
const TYPED = 'input[type=text], input[type=search], textarea';
const wantsKeys = (n) => shown(n) && (!!n.spec.focus || !!n.el.querySelector(`:is(${TYPED}):not([data-lazy]), [data-lazy].typing`));

// A box to type in that sits in a note all the time, like the menu's search, mustn't pull the
// keyboard away from your other apps just by being there. It asks for it when clicked, and gives it
// back when you click away.
export function lazyKeys(input) {
  input.dataset.lazy = '1';
  input.addEventListener('pointerdown', () => {
    input.classList.add('typing');
    syncFocus();
    setTimeout(() => input.focus(), 30);
  });
  input.addEventListener('blur', () => {
    input.classList.remove('typing');
    syncFocus();
  });
  return input;
}

export function syncFocus() {
  api.focus([...notes.values()].some(wantsKeys));
}

// Brings a note to the front.
export function raiseNote(note) {
  zTop += 1;
  note.el.style.zIndex = String(zTop);
}

export const isTopNote = (note) => [...notes.values()].filter(shown).every((n) => n === note || Number(n.el.style.zIndex) < Number(note.el.style.zIndex));

// spec: { title, cls, width, focus, at:{x,y}, corner:'left'|'right', build(body, note), tick(note), onClose(), onDrop(paths) }
// Opening a note that is already open refreshes it where it is and brings it to the front.
export function openNote(id, spec) {
  const key = keyFor(id);
  const old = notes.get(key);
  // In a hub, whichever tab was showing steps back, and this one takes its place.
  const hub = hubOf(id);
  let spot = null;
  if (hub) {
    lastTab[hub] = id;
    for (const n of notes.values()) {
      if (n === old || hubOf(n.id) !== hub || !shown(n)) continue;
      spot = spot ?? { x: n.el.offsetLeft, y: n.el.offsetTop };
      bury(n, true);
    }
  }
  if (old) {
    if (old.buried) {
      bury(old, false);
      if (spot) {
        old.el.style.left = `${spot.x}px`;
        old.el.style.top = `${spot.y}px`;
      }
    }
    old.spec = spec;
    old.el.className = `note ${spec.cls ?? ''}${hub ? ' hub' : ''}${mine(old) ? '' : ' elsewhere'}`;
    old.el.style.width = `${spec.width ?? 300}px`;
    old.setTitle(spec.title);
    old.rebuild();
    raiseNote(old);
    syncFocus();
    return old;
  }
  const body = h('div', { class: 'note-body' });
  const titleEl = h('div', { class: 'note-title' }, spec.title);
  // headExtra puts something of its own in the title bar, made once, so it survives rebuilds.
  const head = h('div', { class: 'note-head' }, titleEl, spec.headExtra?.(), h('button', { class: 'note-x', title: 'Close', onclick: () => closeHub(key) }, 'x'));
  // A hub's index tabs, along the top of the note.
  const tabs = hub && h('div', { class: 'hubtabs' }, HUBS[hub].tabs.map(([tab, label]) => h('button', {
    class: `hubtab${tab === id ? ' on' : ''}`,
    onclick: () => { if (tab !== id) G.open?.(tab); },
  }, label)));
  const el = h('div', { class: `note ${spec.cls ?? ''}${hub ? ' hub' : ''}`, style: `width:${spec.width ?? 300}px` }, tabs, head, body);
  const note = {
    id, key, el, body, spec, alive: true, refs: {},
    who: GLOBAL.has(id) ? null : (G.creature?.id ?? ''),
    rebuild() {
      body.replaceChildren();
      this.refs = {};
      this.spec.build(body, this);
      place(this, true);
      // A box to type in may have come or gone.
      syncFocus();
    },
    setTitle(text) { titleEl.textContent = text; },
    close() { closeKey(key); },
  };
  el.__note = note;
  el.addEventListener('pointerdown', () => raiseNote(note), true);
  makeDraggable(note, head);
  document.getElementById('notes').append(el);
  notes.set(key, note);
  spec.build(body, note);
  if (spot) {
    // Where the tab before it was, kept on the screen.
    el.style.left = `${spot.x}px`;
    el.style.top = `${spot.y}px`;
    place(note, true);
  } else {
    place(note, false);
  }
  raiseNote(note);
  syncFocus();
  return note;
}

// Folding sections for notes that got long: one open at a time, each title with a short summary
// beside it, so the note reads at a glance and opens where you want to look. items are
// { id, title, tag, tagCls, build() }. Which one is open is kept on the note under `key`, so it
// stays open through a rebuild; `first` is the one open to begin with.
export function folds(note, key, items, first = null) {
  const open = (note.spec.folds ??= {});
  if (!(key in open)) open[key] = first;
  return h('div', { class: 'folds' }, items.filter(Boolean).map((it) => {
    const isOpen = open[key] === it.id;
    return h('div', { class: `fold${isOpen ? ' open' : ''}` },
      h('button', {
        class: 'foldhead',
        onclick: () => {
          open[key] = isOpen ? null : it.id;
          note.rebuild();
        },
      },
      h('span', { class: 'foldarrow' }, isOpen ? '▾' : '▸'),
      h('span', { class: 'foldtitle' }, it.title),
      it.tag != null && it.tag !== false && h('span', { class: `foldtag ${it.tagCls ?? ''}` }, it.tag)),
      isOpen && h('div', { class: 'foldbody' }, it.build()));
  }));
}

// Out of sight behind another tab of its hub, or back.
function bury(note, on) {
  note.buried = on;
  note.el.classList.toggle('buried', on);
  if (!on) raiseNote(note);
}

const boxOf = (el) => ({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

// A new note goes where it would always go, unless another note is there: then it goes beside the
// notes already open, and if there is no room anywhere, a little down and across from the last one.
function place(note, keep) {
  const { el, spec } = note;
  const { work } = G.screen;
  const w = el.offsetWidth;
  const h2 = el.offsetHeight;
  const fit = (x, y) => ({
    x: clamp(x, work.x + 6, Math.max(work.x + 6, work.x + work.w - w - 6)),
    y: clamp(y, work.y + 14, Math.max(work.y + 14, work.y + work.h - h2 - 6)),
  });
  let spot;
  if (keep) {
    spot = fit(el.offsetLeft, el.offsetTop);
  } else {
    let first;
    if (spec.at) first = spec.at;
    else if (spec.corner) first = { x: spec.corner === 'left' ? work.x + 18 : work.x + work.w - w - 18, y: work.y + 24 };
    else if (G.pet) first = { x: G.pet.x + 56 + w < work.x + work.w ? G.pet.x + 56 : G.pet.x - 56 - w, y: G.pet.y - h2 + 20 };
    else first = { x: work.x + (work.w - w) / 2, y: work.y + (work.h - h2) / 2 };
    const others = [...notes.values()].filter((n) => n !== note && shown(n)).map((n) => boxOf(n.el));
    const free = (p) => others.every((o) => overlap({ ...p, w, h: h2 }, o) < w * h2 * 0.08);
    const tries = [first, ...others.flatMap((o) => [{ x: o.x + o.w + 10, y: o.y }, { x: o.x - w - 10, y: o.y }, { x: o.x, y: o.y + o.h + 10 }])];
    spot = tries.map((p) => fit(p.x, p.y)).find(free);
    if (!spot) {
      const last = others[others.length - 1];
      spot = fit((last?.x ?? first.x) + 28, (last?.y ?? first.y) + 28);
    }
  }
  el.style.left = `${spot.x}px`;
  el.style.top = `${spot.y}px`;
}

function makeDraggable(note, handle) {
  handle.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, input, .searchdrop')) return;
    e.preventDefault();
    const { el } = note;
    const ox = e.clientX - el.offsetLeft;
    const oy = e.clientY - el.offsetTop;
    api.captureAll(true);
    handle.setPointerCapture(e.pointerId);
    const move = (m) => {
      el.style.left = `${m.clientX - ox}px`;
      el.style.top = `${Math.max(4, m.clientY - oy)}px`;
    };
    const up = () => {
      api.captureAll(false);
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
  });
}

// The x on a hub closes all of its tabs, the ones waiting behind it too.
function closeHub(key) {
  const note = notes.get(key);
  const hub = note && hubOf(note.id);
  if (!hub) {
    closeKey(key);
    return;
  }
  [...notes.values()].filter((n) => hubOf(n.id) === hub && (n.who === null || n.who === note.who)).forEach((n) => closeKey(n.key));
}

function closeKey(key) {
  const note = notes.get(key);
  if (!note) return;
  note.alive = false;
  notes.delete(key);
  note.el.remove();
  note.spec.onClose?.();
  syncFocus();
}

// By default these mean the note of that name for the creature being looked after.
export const closeNote = (id, cid) => closeKey(keyFor(id, cid));
export const getNote = (id, cid) => notes.get(keyFor(id, cid));
export const closeAllNotes = () => [...notes.keys()].forEach(closeKey);
export const allNotes = () => [...notes.values()];

// Every note of one creature, for when it leaves the screen.
export function closeNotesOf(cid) {
  [...notes.values()].filter((n) => n.who === cid).forEach((n) => closeKey(n.key));
}

// Shows the notes of the creature now being looked after, and hides everyone else's.
export function showNotesFor() {
  for (const note of notes.values()) note.el.classList.toggle('elsewhere', !mine(note));
  syncFocus();
}

// While a box is being drawn on the screen, and until its colors are read, the notes step aside.
export function notesAway(on) {
  away = Math.max(0, away + (on ? 1 : -1));
  document.body.classList.toggle('notes-away', away > 0);
}

export function noteRects() {
  if (away) return [];
  return [...notes.values()].filter(shown).map((n) => {
    const r = n.el.getBoundingClientRect();
    return { x: r.left - 2, y: r.top - 12, w: r.width + 4, h: r.height + 14, instant: true };
  });
}

export function tickNotes() {
  for (const note of notes.values()) {
    if (shown(note)) note.spec.tick?.(note);
  }
}

// ---------- picking a spot, or drawing a box, on the screen ----------

// One click on the screen. Resolves to { x, y }, or null if it was called off. size draws a ring that
// big around the pointer, showing what the click will take in.
export function pickSpot(hint, { size = 72 } = {}) {
  return new Promise((resolve) => {
    const ring = h('div', { class: 'picker-spot', style: `display:none;width:${size}px;height:${size}px;margin:${-size / 2}px 0 0 ${-size / 2}px` });
    const finish = (spot) => {
      cancelBox = null;
      overlay.remove();
      api.captureAll(false);
      G.picking = false;
      notesAway(false);
      resolve(spot);
    };
    const hintEl = h('div', { class: 'picker-hint' }, hint, h('button', { class: 'btn', onclick: () => finish(null) }, 'Cancel'));
    const overlay = h('div', {
      class: 'picker',
      oncontextmenu: (e) => {
        e.preventDefault();
        finish(null);
      },
      onpointermove: (e) => {
        ring.style.display = 'block';
        ring.style.left = `${e.clientX}px`;
        ring.style.top = `${e.clientY}px`;
      },
      onpointerdown: (e) => {
        if (e.button !== 0 || e.target.closest('.picker-hint')) return;
        finish({ x: e.clientX, y: e.clientY });
      },
    }, ring, hintEl);
    document.getElementById('notes').append(overlay);
    notesAway(true);
    api.captureAll(true);
    G.picking = true;
    cancelBox = () => finish(null);
  });
}

let cancelBox = null;

// Ends a box being drawn as if Cancel was pressed.
export const cancelPicking = () => cancelBox?.();

export function pickRect(hint, { min = 30 } = {}) {
  return new Promise((resolve) => {
    let start = null;
    const box = h('div', { class: 'picker-box', style: 'display:none' });
    const finish = (rect) => {
      cancelBox = null;
      overlay.remove();
      api.captureAll(false);
      G.picking = false;
      notesAway(false);
      resolve(rect);
    };
    const hintEl = h('div', { class: 'picker-hint' }, hint, h('button', { class: 'btn', onclick: () => finish(null) }, 'Cancel'));
    const overlay = h('div', {
      class: 'picker',
      oncontextmenu: (e) => { e.preventDefault(); finish(null); },
      onpointerdown: (e) => {
        if (e.button !== 0 || e.target.closest('.picker-hint')) return;
        start = { x: e.clientX, y: e.clientY };
        box.style.display = 'block';
        box.style.left = `${start.x}px`;
        box.style.top = `${start.y}px`;
        box.style.width = '0';
        box.style.height = '0';
      },
      onpointermove: (e) => {
        if (!start) return;
        box.style.left = `${Math.min(start.x, e.clientX)}px`;
        box.style.top = `${Math.min(start.y, e.clientY)}px`;
        box.style.width = `${Math.abs(e.clientX - start.x)}px`;
        box.style.height = `${Math.abs(e.clientY - start.y)}px`;
      },
      onpointerup: (e) => {
        if (!start) return;
        const rect = {
          x: Math.min(start.x, e.clientX),
          y: Math.min(start.y, e.clientY),
          w: Math.abs(e.clientX - start.x),
          h: Math.abs(e.clientY - start.y),
        };
        start = null;
        if (rect.w < min || rect.h < min) {
          box.style.display = 'none';
          return;
        }
        finish(rect);
      },
    }, box, hintEl);
    document.getElementById('notes').append(overlay);
    notesAway(true);
    api.captureAll(true);
    G.picking = true;
    cancelBox = () => finish(null);
  });
}
