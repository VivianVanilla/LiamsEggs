// The arena board: a free-for-all from a roster of .creature files.

import { G, api, saveCreature } from '../state.js';
import { h, fill, button, openNote, getNote } from './notes.js';
import { parseCreature, serializeCreature, wildCreature, stageOf, pathTitle, powerOf, ofaLevel, raceName } from '../core/creature.js';
import { STANDS, QUIRKS, TECHNIQUES, TRAITS, OFA_ID } from '../data/powers.js';
import { FRUITS } from '../data/fruits.js';
import { RACES, DEFAULT_RACE } from '../data/races.js';
import { useUpPrep } from '../core/craft.js';
import { coachRow } from './plan.js';
import { Bout } from '../sim/arena.js';
import { drawPortrait } from '../draw/art.js';

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
