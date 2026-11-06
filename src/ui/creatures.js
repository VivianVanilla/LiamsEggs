// Your creatures, all in one place: who is out on your screen, who lives in the village, who is down
// the Legendary Mine and who is away on an expedition. Bring them out, rename them, or let them go.

import { toast } from './flair.js';
import { G, api, creatureText, memberOf, inBout, rememberTeam } from '../state.js';
import { h, fill, button, sureButton, openNote, getNote } from './notes.js';
import { parseCreature, fullName, stageOf, stageIndex, pathTitle, powerOf, raceName, cleanName } from '../core/creature.js';
import { awayBases } from '../core/village.js';
import { breedProblem } from '../core/family.js';
import { TRAITS, TRAIT_IDS, LEGENDARY } from '../data/powers.js';
import { WEAPONS } from '../data/forge.js';
import { TEAM_MAX } from '../data/family.js';
import { EXPEDITIONS } from '../data/village.js';
import { drawPortrait } from '../draw/art.js';
import { loadVillage, expeditionClock, tickClocks } from './village.js';
import { openMenu } from './panels.js';

const PLACES = { out: 'On screen', home: 'Village', mine: 'Mine', away: 'Away' };
const FILTERS = [['all', 'All'], ['out', 'On screen'], ['home', 'Village'], ['away', 'Away'], ['breed', 'Can breed']];
const SORTS = [['power', 'Strongest'], ['name', 'Name'], ['stage', 'Oldest'], ['newest', 'Newest'], ['race', 'Race'], ['gifts', 'Most gifts'], ['souls', 'Legendary mutations']];
// Sorting by one gift or one Legendary mutation puts everyone who has it first. Only the ones some
// creature of yours has are offered, so the list stays short.
const giftSort = (id) => `gift:${id}`;
const soulSort = (id) => `soul:${id}`;

// Where one creature is right now.
function placeOf(row) {
  if (G.team.some((m) => m.base === row.base)) return 'out';
  if (awayBases(G.house).has(row.base)) return 'away';
  if (G.house.mine.includes(row.c.id)) return 'mine';
  return 'home';
}

// Renames a creature, and its .creature file with it. Not while it is away on an expedition, which
// knows it by its file, or while it is fighting.
export async function renameCreature(base, c, raw) {
  const name = cleanName(raw);
  if (!name) return { problem: 'Give it a name first' };
  if (awayBases(G.house).has(base)) return { problem: `${c.name} is away on an expedition. Rename it when it is back.` };
  if (inBout(c)) return { problem: 'Not in the middle of a fight' };
  const before = c.name;
  c.name = name;
  let now;
  try {
    now = await api.renameCreature(base, name, creatureText(c));
  } catch (err) {
    console.error(err);
    c.name = before;
    return { problem: 'Its file could not be renamed' };
  }
  const m = memberOf(c);
  if (m) {
    m.base = now;
    m.pet.base = now;
    if (G.base === base) G.base = now;
    rememberTeam();
    m.pet.say(`call me ${name}`, 3, true);
  }
  getNote('menu', c.id)?.setTitle(fullName(c));
  G.onCreatureChanged?.();
  await loadVillage();
  return { base: now, before };
}

export async function openCreatures() {
  await loadVillage();
  const graves = [];
  for (const text of await api.listGraves()) {
    try {
      graves.push(parseCreature(text));
    } catch { /* an unreadable gravestone just gets left out */ }
  }
  const old = getNote('creatures')?.spec;
  openNote('creatures', {
    title: 'Your creatures',
    cls: 'paper',
    width: 430,
    help: 'start',
    filter: old?.filter ?? 'all',
    sort: old?.sort ?? 'power',
    search: old?.search ?? '',
    renaming: null,
    message: '',
    graves,
    showGraves: false,
    build(body, note) {
      buildRoster(body, note);
    },
    tick(note) {
      note.refs.portraits?.forEach(({ canvas, c }) => drawPortrait(canvas, c));
      tickClocks(note);
    },
  });
}

function sorted(rows, sort) {
  const has = (list, id) => (r) => (list(r.c).includes(id) ? 1 : 0);
  const first = (score) => (a, b) => score(b) - score(a);
  let by = {
    power: (a, b) => powerOf(b.c) - powerOf(a.c),
    name: (a, b) => a.c.name.localeCompare(b.c.name),
    stage: (a, b) => b.c.growth - a.c.growth,
    newest: (a, b) => b.c.born - a.c.born,
    race: (a, b) => raceName(a.c).localeCompare(raceName(b.c)),
    gifts: first((r) => r.c.traits.length),
    souls: first((r) => r.c.souls.length),
  }[sort];
  if (sort.startsWith('gift:')) by = first(has((c) => c.traits, sort.slice(5)));
  if (sort.startsWith('soul:')) by = first(has((c) => c.souls, sort.slice(5)));
  by = by ?? (() => 0);
  // Within a group, the strongest first.
  return rows.slice().sort((a, b) => by(a, b) || powerOf(b.c) - powerOf(a.c) || a.c.name.localeCompare(b.c.name));
}

// The gifts and Legendary mutations some creature of yours has, to sort by.
function sortOptions(rows, sort) {
  const option = (id, label) => h('option', { value: id, selected: sort === id }, label);
  const gifts = TRAIT_IDS.filter((id) => rows.some((r) => r.c.traits.includes(id)));
  const souls = Object.keys(LEGENDARY).filter((id) => rows.some((r) => r.c.souls.includes(id)));
  return [
    SORTS.map(([id, label]) => option(id, label)),
    gifts.length > 0 && h('optgroup', { label: 'Has this gift first' }, gifts.map((id) => option(giftSort(id), TRAITS[id].name))),
    souls.length > 0 && h('optgroup', { label: 'Has this Legendary mutation first' }, souls.map((id) => option(soulSort(id), LEGENDARY[id].name))),
  ];
}

function buildRoster(body, note) {
  const { spec } = note;
  note.refs.portraits = [];
  note.refs.clocks = [];
  const rows = G.everyone;
  const counts = { out: 0, home: 0, mine: 0, away: 0 };
  rows.forEach((r) => { counts[placeOf(r)] += 1; });
  const want = spec.search.trim().toLowerCase();
  const shown = sorted(rows.filter((r) => {
    const place = placeOf(r);
    if (spec.filter === 'out' && place !== 'out') return false;
    if (spec.filter === 'home' && place !== 'home' && place !== 'mine') return false;
    if (spec.filter === 'away' && place !== 'away') return false;
    if (spec.filter === 'breed' && (breedProblem(r.c) || place === 'away')) return false;
    return !want || fullName(r.c).toLowerCase().includes(want);
  }), spec.sort);
  const search = h('input', { type: 'search', placeholder: 'Find by name', spellcheck: false, value: spec.search });
  search.addEventListener('input', () => {
    spec.search = search.value;
    const at = search.selectionStart;
    note.rebuild();
    // Keep typing where you were.
    const again = note.body.querySelector('input[type=search]');
    again?.focus();
    again?.setSelectionRange(at, at);
  });
  const sortBox = h('select', { onchange: (e) => { spec.sort = e.target.value; note.rebuild(); } }, sortOptions(rows, spec.sort));
  fill(body,
    h('div', { class: 'purse' },
      h('span', null, h('b', null, rows.length), rows.length === 1 ? ' creature' : ' creatures'),
      h('span', null, `${counts.out} on screen`),
      h('span', null, `${counts.home + counts.mine} in the village`),
      counts.away > 0 && h('span', null, `${counts.away} away`),
      h('span', null, h('b', null, Math.floor(G.house.bank.gems)), ' gems')),
    h('div', { class: 'toolbar' },
      FILTERS.map(([id, label]) => h('button', { class: `chip${spec.filter === id ? ' on' : ''}`, onclick: () => { spec.filter = id; note.rebuild(); } }, label)),
    ),
    h('div', { class: 'toolbar' }, search, h('span', { class: 'small' }, 'Sort'), sortBox),
    spec.message && h('div', { class: 'warning' }, spec.message),
  );
  const page = h('div', { class: 'scrollnote', style: 'max-height:min(520px, calc(100vh - 220px))' });
  fill(body, page);
  fill(page,
    shown.length === 0
      ? h('div', { class: 'small', style: 'margin-top:8px' }, rows.length ? 'Nobody matches that.' : 'No creatures yet.')
      : h('div', { class: 'cards' }, shown.map((r) => card(note, r))),
    h('div', { class: 'row gap' },
      button('Hatch or breed', () => G.open('nursery'), 'big hot'),
      button('Village', () => G.open('village'), 'big')),
    spec.graves.length > 0 && h('div', { class: 'row', style: 'margin-top:8px' },
      h('div', { class: 'sect grow', style: 'margin-top:0' }, `Graveyard (${spec.graves.length})`),
      button(spec.showGraves ? 'Hide' : 'Show', () => { spec.showGraves = !spec.showGraves; note.rebuild(); }, 'mini')),
    spec.showGraves && h('div', { class: 'graves' }, spec.graves.map((g) => h('div', { class: 'small' },
      `${fullName(g)}, ${pathTitle(g)}. ${graveLine(g.dead)}`))),
  );
}

// How it went, for its gravestone.
function graveLine(dead) {
  if (dead.by === 'absorbed') return `Absorbed by ${dead.to}, who was reborn.`;
  if (dead.by === 'the Bloodline Altar') return 'Sacrificed on the Bloodline Altar.';
  if (dead.to) return `Gave its One For All to ${dead.to}.`;
  if (dead.by === 'you') return 'You let it go.';
  return `Killed by ${dead.by}.`;
}

function card(note, row) {
  const { spec } = note;
  const { base, c } = row;
  const place = placeOf(row);
  const canvas = h('canvas');
  note.refs.portraits.push({ canvas, c });
  const me = G.creature === c;
  const fighting = inBout(c);
  const acts = [];
  if (place === 'out') {
    if (!me) {
      acts.push(button('Look after', () => {
        G.lookAfter(c);
        openMenu();
        note.rebuild();
      }, 'mini'));
    }
    if (G.team.length > 1) {
      acts.push(button('Put away', async () => {
        await G.putAway(c);
        note.rebuild();
      }, 'mini', fighting));
    }
  } else if (place !== 'away') {
    acts.push(button(G.team.length >= TEAM_MAX ? 'Swap in' : 'Bring out', async () => {
      const out = await G.bringOut(base, c);
      spec.message = out ? '' : 'Everyone out is in the middle of a fight.';
      note.rebuild();
    }, 'mini hot'));
  }
  if (place !== 'away') {
    acts.push(button('Rename', () => {
      spec.renaming = base;
      spec.message = '';
      note.rebuild();
    }, 'mini', fighting));
    acts.push(sureButton('Let go', async () => {
      if (await G.getRidOf(base, c)) {
        spec.message = `${c.name} is gone for good. Its gravestone is in the graveyard below.`;
        spec.graves.push(c);
      }
      note.rebuild();
    }, 'mini', fighting));
  }
  let renameBox = null;
  if (spec.renaming === base) {
    // What has been typed so far survives the note being redrawn under it.
    const input = h('input', { type: 'text', maxLength: 24, spellcheck: false, value: spec.renameText ?? c.name });
    input.addEventListener('input', () => { spec.renameText = input.value; });
    const go = async () => {
      const res = await renameCreature(base, c, input.value);
      spec.renaming = null;
      spec.renameText = null;
      spec.message = res.problem ?? '';
      if (!res.problem && res.before !== c.name) toast(`${res.before.toUpperCase()} IS NOW ${c.name.toUpperCase()}!`, 'good');
      note.rebuild();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') go();
      if (e.key === 'Escape') {
        spec.renaming = null;
        spec.renameText = null;
        note.rebuild();
      }
    });
    renameBox = h('div', { class: 'renamebox' }, input, button('Save', go, 'mini hot'), button('x', () => {
      spec.renaming = null;
      spec.renameText = null;
      note.rebuild();
    }, 'mini'));
    setTimeout(() => {
      input.focus();
      if (spec.renameText == null) input.select();
    }, 30);
  }
  const exp = place === 'away' ? G.house.expeditions.find((e) => e.party.some((p) => p.base === base)) : null;
  const gifts = c.traits.map((id) => h('span', { class: 'chip', style: `--c:${TRAITS[id].color}` }, TRAITS[id].name));
  const weapon = c.weapon && WEAPONS[c.weapon] && h('span', { class: 'chip', style: `--c:${WEAPONS[c.weapon].color}` }, WEAPONS[c.weapon].name);
  const canBreed = !breedProblem(c);
  return h('div', { class: `card${me ? ' me' : ''}` },
    h('div', { class: 'top' },
      canvas,
      h('div', { class: 'grow' },
        h('div', { class: 'name' }, fullName(c)),
        h('div', { class: 'row', style: 'gap:3px' },
          h('span', { class: `badge ${place}` }, PLACES[place]),
          canBreed && place !== 'away' && h('span', { class: 'badge', style: 'background:#d6338c' }, 'can breed')),
        h('div', { class: 'line' }, `Power ${powerOf(c)}`))),
    h('div', { class: 'line' }, `${raceName(c)}, ${stageOf(c).name}${stageIndex(c) >= 1 ? `, ${pathTitle(c)}` : ''}`),
    h('div', { class: 'bar', title: `Fullness ${Math.round(c.fullness)}` }, h('i', { style: `width:${Math.round(c.fullness)}%` })),
    (gifts.length > 0 || weapon) && h('div', { class: 'chips', style: 'margin-top:2px' }, gifts, weapon),
    exp && h('div', { class: 'line' }, `${EXPEDITIONS[exp.where].name}. Back in:`),
    exp && expeditionClock(note, exp),
    renameBox ?? (acts.length > 0 && h('div', { class: 'acts' }, acts)),
  );
}
