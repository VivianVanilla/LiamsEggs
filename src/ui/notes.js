// Sticky-note panels. h() builds DOM with text nodes only, never innerHTML, so names from
// imported .creature files cannot inject anything into the page.
//
// Any number can be open at once, like tabs. Most belong to one creature: they hide while you look
// after another, and come back where you left them when you click it again. A few, like Settings
// and the arena, belong to no creature and always stay.

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
const GLOBAL = new Set(['settings', 'arena', 'society', 'creatures', 'village', 'breed', 'roll', 'farewell', 'naming']);

const notes = new Map();
let zTop = 10;
let away = 0;

const keyFor = (id, cid = G.creature?.id ?? '') => (GLOBAL.has(id) ? id : `${id}@${cid}`);
const shown = (note) => note.who === null || note.who === (G.creature?.id ?? '');

export function syncFocus() {
  api.focus([...notes.values()].some((n) => n.spec.focus && shown(n)));
}

// Brings a note to the front.
export function raiseNote(note) {
  zTop += 1;
  note.el.style.zIndex = String(zTop);
}

export const isTopNote = (note) => [...notes.values()].filter(shown).every((n) => n === note || Number(n.el.style.zIndex) < Number(note.el.style.zIndex));

// spec: { title, cls, width, focus, help, at:{x,y}, corner:'left'|'right', build(body, note), tick(note), onClose(), onDrop(paths) }
// help names the guide page its "?" opens.
// Opening a note that is already open refreshes it where it is and brings it to the front.
export function openNote(id, spec) {
  const key = keyFor(id);
  const old = notes.get(key);
  if (old) {
    old.spec = spec;
    old.el.className = `note ${spec.cls ?? ''}`;
    old.el.style.width = `${spec.width ?? 300}px`;
    old.setTitle(spec.title);
    old.helpEl.style.display = spec.help ? '' : 'none';
    old.rebuild();
    raiseNote(old);
    syncFocus();
    return old;
  }
  const body = h('div', { class: 'note-body' });
  const titleEl = h('div', { class: 'note-title' }, spec.title);
  const helpEl = h('button', { class: 'note-help', title: 'Help with this', onclick: () => G.openHelp?.(notes.get(key)?.spec.help) }, '?');
  helpEl.style.display = spec.help ? '' : 'none';
  const head = h('div', { class: 'note-head' }, titleEl, helpEl, h('button', { class: 'note-x', title: 'Close', onclick: () => closeKey(key) }, 'x'));
  const el = h('div', { class: `note ${spec.cls ?? ''}`, style: `width:${spec.width ?? 300}px` }, head, body);
  const note = {
    id, key, el, body, spec, helpEl, alive: true, refs: {},
    who: GLOBAL.has(id) ? null : (G.creature?.id ?? ''),
    rebuild() {
      body.replaceChildren();
      this.refs = {};
      this.spec.build(body, this);
      place(this, true);
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
  place(note, false);
  raiseNote(note);
  syncFocus();
  return note;
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
    if (e.target.closest('button')) return;
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
  for (const note of notes.values()) note.el.classList.toggle('elsewhere', !shown(note));
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

// ---------- drawing a box on the screen ----------

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
