// The arena board and the society board: both start from a roster of .creature files.

import { G, api, saveCreature, saveWorld } from '../state.js';
import { h, fill, button, openNote, getNote } from './notes.js';
import { parseCreature, serializeCreature, wildCreature, stageOf, pathTitle, powerOf, ofaLevel, raceName } from '../core/creature.js';
import { STANDS, QUIRKS, TECHNIQUES, TRAITS, OFA_ID } from '../data/powers.js';
import { FRUITS } from '../data/fruits.js';
import { RACES, DEFAULT_RACE } from '../data/races.js';
import { useUpPrep } from '../core/craft.js';
import { coachRow } from './plan.js';
import { Bout } from '../sim/arena.js';
import { newWorld, COLS, ROWS } from '../sim/society.js';
import { drawPortrait } from '../draw/art.js';
import { SocietyView } from '../draw/scene.js';

const MAX_ROSTER = 8;

// ---------- shared roster ----------

const powerLine = (c) => [
  raceName(c) !== RACES[DEFAULT_RACE].name && raceName(c),
  ...c.traits.map((id) => TRAITS[id].name),
  c.powers.stand && `「${STANDS[c.powers.stand].name}」`,
  c.powers.speedster && 'Speedster',
  c.powers.technique && TECHNIQUES[c.powers.technique].name,
  c.powers.technique2 && TECHNIQUES[c.powers.technique2].name,
  c.powers.fruit && FRUITS[c.powers.fruit].name,
  ...c.powers.quirks.map((id) => (id === OFA_ID ? `One For All ${ofaLevel(c)}` : QUIRKS[id].name)),
].filter(Boolean).join(', ');

function addToRoster(roster, c, onError) {
  if (c.dead) {
    onError?.(`${c.name} is dead, and stays dead.`);
    return false;
  }
  if (roster.some((x) => x.id === c.id)) {
    onError?.(`${c.name} is already in.`);
    return false;
  }
  if (roster.length >= MAX_ROSTER) {
    onError?.(`${MAX_ROSTER} is the limit.`);
    return false;
  }
  roster.push(c);
  return true;
}

function rosterEditor(body, note, roster) {
  const status = h('div', { class: 'small', style: 'min-height:16px;margin-top:4px' }, note.spec.message ?? '');
  const show = (msg) => {
    note.spec.message = msg;
    status.textContent = msg;
  };
  const portraits = [];
  note.refs.portraits = portraits;

  note.spec.onDrop = async (paths) => {
    show('');
    let added = 0;
    for (const p of paths) {
      try {
        const c = parseCreature(await api.readDroppedCreature(p));
        if (addToRoster(roster, c, show)) added++;
      } catch (err) {
        show(String(err?.message ?? err).replace(/^Error invoking remote method.*?Error: /, ''));
      }
    }
    if (added) note.rebuild();
  };

  fill(body, 
    h('div', { class: 'roster' }, roster.length === 0
      ? h('div', { class: 'dropzone small' }, 'Drag .creature files onto this note, or use the buttons below.')
      : roster.map((c, i) => {
        const canvas = h('canvas');
        portraits.push({ canvas, c });
        return h('div', { class: 'rosterrow' },
          canvas,
          h('div', { class: 'grow', style: 'min-width:0' },
            h('div', { class: 'name' }, c.name),
            h('div', { class: 'small' }, `${stageOf(c).name}, ${pathTitle(c)}, power ${powerOf(c)}`),
            powerLine(c) && h('div', { class: 'small' }, powerLine(c))),
          button('x', () => {
            roster.splice(i, 1);
            note.rebuild();
          }));
      })),
    status,
    h('div', { class: 'row', style: 'margin-top:4px' },
      button('Import files', async () => {
        show('');
        const files = await api.importCreatures();
        let added = 0;
        for (const f of files) {
          try {
            if (f.error) throw new Error(f.error);
            if (addToRoster(roster, parseCreature(f.text), show)) added++;
          } catch (err) {
            show(`${f.name}: ${err.message}`);
          }
        }
        if (added) note.rebuild();
      }),
      // Anyone out on the screen can join.
      G.team.map((m) => button(`Add ${m.c.name}`, () => {
        if (addToRoster(roster, parseCreature(serializeCreature(m.c)), show)) note.rebuild();
      })),
    ),
    h('div', { class: 'row', style: 'margin-top:5px' },
      h('span', { class: 'small' }, 'Wild rival:'),
      [1, 2, 3].map((level) => button(`Lv ${level}`, () => {
        if (addToRoster(roster, wildCreature(Math.floor(Math.random() * 2 ** 31), level), show)) note.rebuild();
      }))),
  );
}

function tickPortraits(note) {
  note.refs.portraits?.forEach(({ canvas, c }) => drawPortrait(canvas, c));
}

// ---------- arena ----------

const arena = { roster: [], history: [], loaded: false };

async function loadArenaHistory() {
  if (arena.loaded) return;
  arena.loaded = true;
  try {
    const saved = JSON.parse((await api.loadData('arena')) ?? '{}');
    if (Array.isArray(saved.history)) {
      arena.history = saved.history.slice(-30).map((e) => ({
        at: Number(e?.at) || 0,
        winner: String(e?.winner ?? '').slice(0, 24),
        field: Array.isArray(e?.field) ? e.field.slice(0, 8).map((n) => String(n).slice(0, 24)) : [],
      }));
    }
  } catch { /* no history yet */ }
}

function ringLayout() {
  const { work } = G.screen;
  const r = Math.min(work.h * 0.42, work.w * 0.3);
  return { cx: work.x + work.w / 2, cy: work.y + work.h / 2 + 34, r };
}

// A creature that dies doesn't get to fight on in anyone's line-up.
export function forgetFighter(id) {
  arena.roster = arena.roster.filter((c) => c.id !== id);
  society.roster = society.roster.filter((c) => c.id !== id);
}

export async function openArena({ importPaths = [] } = {}) {
  if (G.challenge) return;
  await loadArenaHistory();
  const note = openNote('arena', {
    title: 'The Arena',
    cls: 'chalk',
    width: 318,
    corner: 'left',
    onClose: () => {
      G.bout = null;
      G.boutHide = new Set();
    },
    build(body, n) {
      if (G.bout) buildBoutView(body, n);
      else buildArenaSetup(body, n);
    },
    tick(n) {
      tickPortraits(n);
      if (G.bout && n.refs.clock) n.refs.clock.textContent = `${Math.floor(G.bout.t)}s${G.bout.t > 60 ? ', sudden death' : ''}`;
    },
  });
  if (importPaths.length) note.spec.onDrop?.(importPaths);
}

function buildArenaSetup(body, note) {
  rosterEditor(body, note, arena.roster);
  fill(body, 
    h('div', { class: 'row gap' }, button(arena.roster.length < 2 ? 'Add at least two' : 'FIGHT', () => startBout(note), 'big hot', arena.roster.length < 2)),
  );
  if (arena.history.length) {
    fill(body, 
      h('div', { class: 'sect' }, 'Past bouts'),
      h('div', { class: 'bouts' }, arena.history.slice().reverse().slice(0, 12).map((e) => h('div', null, `${e.winner} won against ${e.field.filter((n) => n !== e.winner).join(', ')}`))),
    );
  }
}

function buildBoutView(body, note) {
  const bout = G.bout;
  note.refs.clock = h('span', { class: 'small' }, '');
  if (bout.done) {
    fill(body, 
      h('div', { class: 'nameline center' }, bout.winner ? `${bout.winner.name} wins!` : 'Nobody wins.'),
      h('div', { class: 'row gap' },
        button('Fight again', () => startBout(note), 'big hot'),
        button('Change fighters', () => {
          G.bout = null;
          G.boutHide = new Set();
          note.rebuild();
        }, 'big')),
    );
  } else {
    fill(body, 
      h('div', { class: 'row' }, h('div', { class: 'grow hand' }, 'Fight!'), note.refs.clock),
      h('div', { class: 'small', style: 'margin-top:3px' }, `${bout.fighters.filter((f) => !f.minion).length} on the field. Clicks pass through the ring.`),
      coachRow(note),
      h('div', { class: 'row gap' }, button('Stop the fight', () => {
        G.bout = null;
        G.boutHide = new Set();
        note.rebuild();
      }, 'big')),
    );
  }
}

// Its creatures that are out come as they are right now, with whatever paint they have on.
const outFor = (c) => G.team.find((m) => m.c.id === c.id);

function startBout(note) {
  const fighters = arena.roster.map((c) => parseCreature(serializeCreature(outFor(c)?.c ?? c)));
  G.bout = new Bout(fighters, { seed: Math.floor(Math.random() * 2 ** 31), ...ringLayout(), sizeMul: G.settings.scale ?? 1 });
  const own = arena.roster.map(outFor).filter(Boolean);
  G.boutHide = new Set(own.map((m) => m.c.id));
  for (const m of own) {
    useUpPrep(m.c);
    saveCreature(m.c);
    m.pet.interrupt();
  }
  note.rebuild();
}

// Called by the game loop when a bout finishes.
export function onBoutEnded(bout) {
  const field = bout.fighters.filter((f) => !f.minion).map((f) => f.name);
  const winner = bout.winner?.name ?? 'Nobody';
  arena.history.push({ at: Date.now(), winner, field });
  arena.history = arena.history.slice(-30);
  api.saveData('arena', JSON.stringify({ history: arena.history }));
  for (const f of bout.fighters) {
    const m = f.c && !f.minion && outFor(f.c);
    if (!m) continue;
    if (bout.winner === f) m.c.record.arenaWins += 1;
    else m.c.record.arenaLosses += 1;
    saveCreature(m.c);
  }
  getNote('arena')?.rebuild();
}

// ---------- society ----------

const society = { roster: [] };

export function openSociety() {
  openNote('society', {
    title: 'The Societies',
    cls: 'parch',
    width: 374,
    corner: 'right',
    build(body, note) {
      if (G.society) buildWorldView(body, note);
      else buildWorldSetup(body, note);
    },
    tick(note) {
      tickPortraits(note);
      if (G.society && note.refs.table) paintWorld(note);
    },
  });
}

function buildWorldSetup(body, note) {
  fill(body, h('div', { class: 'small', style: 'margin-bottom:6px' },
    'Each creature founds a people on your screen. The land is read from the colors on your screen right now: bright areas are farmland, dark areas hold ore, vivid colors hold chroma. Then they grow, research and slowly fight for it. It takes hours, and keeps going while you work.'));
  rosterEditor(body, note, society.roster);
  fill(body, h('div', { class: 'row gap' }, button(society.roster.length < 2 ? 'Add at least two' : 'Found the world', () => foundWorld(note), 'big hot', society.roster.length < 2)));
}

async function foundWorld(note) {
  const { work } = G.screen;
  let colors = null;
  try {
    const grid = await api.sampleScreen({ x: work.x, y: work.y, w: work.w, h: work.h, cols: COLS, rows: ROWS });
    if (grid.cols === COLS && grid.rows === ROWS) colors = grid.colors;
  } catch (err) {
    console.error(err);
  }
  G.society = newWorld(society.roster.map((c) => parseCreature(serializeCreature(c))), { colors, seed: Math.floor(Math.random() * 2 ** 31) });
  G.societyView = new SocietyView();
  society.roster = [];
  saveWorld();
  note.rebuild();
}

function buildWorldView(body, note) {
  const w = G.society;
  note.refs.head = h('div', { class: 'small', style: 'margin-bottom:4px' });
  note.refs.table = h('table', { class: 'tribes' });
  note.refs.chronicle = h('div', { class: 'chronicle' });
  note.refs.lastLog = -1;
  const showBtn = button(w.hideView ? 'Show on screen' : 'Hide from screen', () => {
    w.hideView = !w.hideView;
    showBtn.textContent = w.hideView ? 'Show on screen' : 'Hide from screen';
  });
  const pauseBtn = button(w.paused ? 'Resume' : 'Pause', () => {
    w.paused = !w.paused;
    pauseBtn.textContent = w.paused ? 'Resume' : 'Pause';
  });
  const borderBtn = button(w.showBorders ? 'Hide borders' : 'Show borders', () => {
    w.showBorders = !w.showBorders;
    borderBtn.textContent = w.showBorders ? 'Hide borders' : 'Show borders';
  });
  let confirm = false;
  const endBtn = button('End world', () => {
    if (!confirm) {
      confirm = true;
      endBtn.textContent = 'Really end it?';
      return;
    }
    G.society = null;
    G.societyView = null;
    api.saveData('society', 'null');
    note.rebuild();
  });
  fill(body, 
    note.refs.head,
    note.refs.table,
    h('div', { class: 'sect' }, 'Chronicle'),
    note.refs.chronicle,
    h('div', { class: 'row gap' }, showBtn, pauseBtn, borderBtn, endBtn),
  );
  paintWorld(note);
}

function paintWorld(note) {
  const w = G.society;
  const { head, table, chronicle } = note.refs;
  head.textContent = w.ended
    ? `Day ${w.tick}. It is over.`
    : `Day ${w.tick}${w.paused ? ' (paused)' : ''}. A day is about 10 seconds.`;
  const order = w.tribes.slice().sort((a, b) => (b.alive - a.alive) || (b.cells - a.cells) || (b.pop - a.pop));
  table.replaceChildren(
    h('tr', null, ['People', 'Land', 'Pop', 'Food', 'Ore', 'Tech', 'Wins'].map((t) => h('th', null, t))),
    ...order.map((t) => h('tr', { class: t.alive ? '' : 'dead' },
      h('td', { title: `${t.leader}, ${t.job}` }, h('span', { class: 'dot', style: `background:${t.color}` }), t.name),
      h('td', null, t.cells),
      h('td', null, Math.round(t.pop)),
      h('td', null, Math.round(t.food)),
      h('td', null, Math.round(t.ore)),
      h('td', null, t.tech.tools + t.tech.walls + t.tech.banners),
      h('td', null, t.wins))),
  );
  const last = w.log[w.log.length - 1];
  const stamp = last ? `${w.log.length}:${last.t}:${last.text}` : '';
  if (stamp !== note.refs.lastLog) {
    note.refs.lastLog = stamp;
    chronicle.replaceChildren(...w.log.slice(-60).reverse().map((e) => h('div', { class: e.kind }, h('span', { class: 't' }, `Day ${e.t}`), e.text)));
  }
}
