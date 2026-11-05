// The loud bits, Roblox style: big bouncing popups for good news, a glowing CLICK! on whatever to
// press next, NEW! on things not tried yet, and the words that matter picked out in color.
// Calm mode in Settings turns the popups and hints off. Everything here is text and color: no
// pictures are drawn.

import { G } from '../state.js';
import { h } from './notes.js';
import { TRAITS, LEGENDARY, QUIRKS, OFA_ID } from '../data/powers.js';
import { FRUITS } from '../data/fruits.js';
import { RACES, DEFAULT_RACE } from '../data/races.js';

export const calm = () => !!G.settings.calm;

// ---------- words that matter, in color ----------

const RARE = [
  ...Object.values(TRAITS).map((t) => t.name),
  ...Object.values(LEGENDARY).map((l) => l.name),
  ...Object.values(FRUITS).map((f) => f.name),
  ...Object.entries(RACES).filter(([id]) => id !== DEFAULT_RACE).map(([, r]) => r.name),
  QUIRKS[OFA_ID].name, 'Devil Fruit', 'LEGENDARY', 'Legendary', 'HYPER ROLL', 'Hyper roll',
].sort((a, b) => b.length - a.length);
const RARE_SET = new Set(RARE);
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PATTERN = new RegExp(`(${[...RARE.map(escape), '\\+?\\d+(?:\\.\\d+)? gems?', '\\d+(?:\\.\\d+)?%', '1 in \\d+', '\\+\\d+(?:\\.\\d+)?'].join('|')})`, 'g');

// Text with its rare names, gems, odds and gains picked out. Safe for any text: it only ever makes
// text nodes and spans.
export function rich(text) {
  return String(text).split(PATTERN).filter(Boolean).map((part) => {
    if (RARE_SET.has(part)) return h('span', { class: 'hl rare' }, part);
    if (/gems?$/.test(part)) return h('span', { class: 'hl gem' }, part);
    if (/%$/.test(part) || part.startsWith('1 in ')) return h('span', { class: 'hl odds' }, part);
    if (/^\+\d/.test(part)) return h('span', { class: 'hl gold' }, part);
    return part;
  });
}

// ---------- popups ----------

let shelf = null;

// A big bouncing popup at the top of the screen. kind: good, rare, bad or info.
export function toast(text, kind = 'good') {
  if (calm()) return;
  shelf ??= document.body.appendChild(h('div', { class: 'toasts' }));
  const el = h('div', { class: `toast ${kind}` }, rich(text));
  shelf.append(el);
  while (shelf.children.length > 4) shelf.firstChild.remove();
  setTimeout(() => el.classList.add('out'), 3400);
  setTimeout(() => el.remove(), 4000);
}

// ---------- NEW! and CLICK! ----------

const SEEN = 'creature-seen:';
export const seen = (key) => {
  try {
    return localStorage.getItem(SEEN + key) === '1';
  } catch {
    return true;
  }
};
export const markSeen = (key) => {
  try {
    localStorage.setItem(SEEN + key, '1');
  } catch { /* nowhere to remember it; it just shows again */ }
};

// Marks a button NEW! until the thing it opens has been tried once.
export function newBadge(el, key) {
  if (!calm() && !seen(key)) el.classList.add('isnew');
  el.addEventListener('click', () => {
    markSeen(key);
    el.classList.remove('isnew');
  });
  return el;
}

// Makes a button glow with a bouncing CLICK! on it.
export function glow(el) {
  if (el && !calm()) el.classList.add('glow');
  return el;
}
