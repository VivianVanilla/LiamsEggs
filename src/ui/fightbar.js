// The fight sidebar, down the right of your screen while a fight is on: the health of everyone in
// the ring, yours and theirs. Max health a necrotic hit took away shows dark at the end of a bar.
// With a Chosen of Benevolence in the ring, every enemy gets a button to drop its bomb on
// (core/chosen.js; dropBomb in sim/arena.js).

import { G } from '../state.js';
import { h } from './notes.js';

let el = null;
// What the rows were built for: the fight, and who was in it.
let builtFor = null;
let rows = [];

const big = (n) => Math.max(0, Math.ceil(n)).toLocaleString('en-US');
const listed = (bout) => bout.fighters.filter((f) => !f.minion && (f.c || f.monster));
const signature = (bout) => listed(bout).map((f) => f.id).join(',');

// Which fighters are yours: anyone from your household, or from the Negative.
function yoursOf(bout) {
  const ids = new Set([...G.everyone.map((r) => r.c.id), ...G.team.map((m) => m.c.id), ...(G.neg?.creatures ?? []).map((nc) => nc.id)]);
  return listed(bout).filter((f) => ids.has(f.neg?.id ?? f.c?.id));
}

// The Chosen of Benevolence in the ring with its bomb still to drop, if there is one.
const bomberOf = (bout) => bout.fighters.find((f) => f.chosen === 'benevolence' && f.alive && f.bomb === 'ready') ?? null;

export function initFightBar() {
  if (el) return;
  el = h('div', { id: 'fightbar', hidden: true });
  document.body.append(el);
}

function row(f) {
  const name = h('span', { class: 'fb-name' }, f.name);
  const hp = h('span', { class: 'fb-hp' });
  const fill = h('i', { class: 'fb-fill' });
  const lost = h('i', { class: 'fb-lost' });
  const bomb = h('button', {
    class: 'fb-bomb',
    title: 'Drop your Chosen\'s bomb here: it takes half the health it has left.',
    hidden: true,
    onclick: () => {
      const bout = G.bout;
      const bomber = bout && bomberOf(bout);
      if (bomber && bout.dropBomb(bomber, f)) tickFightBar();
    },
  }, 'Bomb');
  const box = h('div', { class: 'fb-row' }, h('div', { class: 'fb-top' }, name, hp), h('div', { class: 'fb-bar' }, fill, lost), bomb);
  return { f, box, hp, fill, lost, bomb };
}

function build(bout) {
  const yours = yoursOf(bout);
  const theirs = listed(bout).filter((f) => !yours.includes(f));
  const sides = theirs.length && yours.length
    ? [['Yours', yours], ['Against you', theirs]]
    : [['In the ring', listed(bout)]];
  rows = [];
  const note = h('div', { class: 'fb-note' });
  el.replaceChildren(
    h('div', { class: 'fb-head' }, 'The fight'),
    ...sides.flatMap(([title, list]) => [
      h('div', { class: 'fb-sect' }, title),
      ...list.map((f) => {
        const r = row(f);
        rows.push(r);
        return r.box;
      }),
    ]),
    note,
  );
  rows.note = note;
  builtFor = { bout, sig: signature(bout) };
}

// Every tenth of a second while a fight is on: health, who is down, and where the bomb can go.
export function tickFightBar() {
  if (!el) return;
  const bout = G.bout;
  el.hidden = !bout || G.hidden;
  if (!bout) {
    builtFor = null;
    return;
  }
  if (builtFor?.bout !== bout || builtFor.sig !== signature(bout)) build(bout);
  const bomber = bomberOf(bout);
  for (const r of rows) {
    const { f } = r;
    const full = f.fullHp ?? f.maxHp;
    const k = Math.max(0, Math.min(1, f.hp / full));
    r.fill.style.width = `${k * 100}%`;
    r.fill.className = `fb-fill ${k > 0.5 ? 'ok' : k > 0.25 ? 'low' : 'bad'}`;
    r.lost.style.width = `${Math.max(0, (full - f.maxHp) / full) * 100}%`;
    r.hp.textContent = f.alive ? `${big(f.hp)} / ${big(f.maxHp)}` : 'KO';
    r.box.classList.toggle('down', !f.alive);
    r.box.classList.toggle('chosen', !!f.chosen);
    r.bomb.hidden = !(bomber && bout.canBomb(bomber, f));
  }
  const chosen = bout.fighters.find((f) => f.chosen === 'benevolence');
  rows.note.textContent = !chosen ? ''
    : bomber ? `${chosen.name}'s bomb is ready: drop it on anyone with a Bomb button.`
    : chosen.bomb === 'used' ? 'The bomb has fallen. Next fight, there is another.'
    : `${chosen.name} is down, so the bomb can't fall.`;
}

// Where it is on the screen, so the mouse can reach it through the click-through window.
export function fightBarRects() {
  if (!el || el.hidden || G.hidden) return [];
  const r = el.getBoundingClientRect();
  return [{ x: r.left, y: r.top, w: r.width, h: r.height, instant: true }];
}
