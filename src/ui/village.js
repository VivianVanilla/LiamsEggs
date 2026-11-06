// The village. Your three mains are out on your screen; everyone else lives here and works for the
// pool you all share. Legendary Miners can work the Legendary Mine for the forge's ore, and parties
// set off from here on expeditions, with a clock counting down until they are back.

import { toast, rich } from './flair.js';
import { G, api, saveHouse } from '../state.js';
import { h, fill, button, openNote, getNote, folds } from './notes.js';
import { parseCreature, fullName, stageOf, powerOf, raceName } from '../core/creature.js';
import {
  workOf, villageOutput, expeditionProblem, startExpedition, awayBases, takeFound, isLegendaryMiner, mineProblem, joinMine, leaveMine,
  hurryExpedition, hurryProblem, hurryCost, larderTotal, partyBonus, deathChance,
} from '../core/village.js';
import { RACES } from '../data/races.js';
import { FRUIT_FROM_EXPEDITION } from '../data/fruits.js';
import { EXPEDITIONS, EXPEDITION_IDS, EXPEDITION_KINDS, PARTY_MAX, EXPEDITIONS_AT_ONCE, PARTY_GEMS_PER_100, LEGENDARY_MINE, HURRY_PLANTS } from '../data/village.js';
import { PIGMENTS, CROPS } from '../data/crafting.js';
import { ITEMS } from '../data/items.js';
import { drawPortrait } from '../draw/art.js';
import { createCreature } from './panels.js';
import { refreshDock } from './dock.js';

const TABS = [['work', 'Work'], ['mine', 'Legendary Mine'], ['expeditions', 'Expeditions']];
const pct = (v) => `${Math.round(v * 100)}%`;
const fine = (v) => `${Number((v * 100).toFixed(v < 0.1 ? 1 : 0))}%`;
const r1 = (v) => (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10);

// A countdown: 4:05:09, or 12:30 under an hour.
export function clockText(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return hh ? `${hh}:${String(mm).padStart(2, '0')}:${ss}` : `${mm}:${ss}`;
}

// In words, for longer waits: "3h 05m", or "12 min".
export function timeLeft(ms) {
  const min = Math.max(1, Math.ceil(ms / 60000));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`;
}

// A live countdown and progress bar for one expedition. The note's tick keeps both moving.
export function expeditionClock(note, e) {
  const when = h('span', { class: 'when' }, clockText(e.end - Date.now()));
  const fillBar = h('i', { style: `width:${Math.min(100, ((Date.now() - e.start) / Math.max(1, e.end - e.start)) * 100)}%` });
  note.refs.clocks = note.refs.clocks ?? [];
  note.refs.clocks.push({ when, fillBar, start: e.start, end: e.end });
  return h('div', { class: 'clockline' }, h('div', { class: 'bar purple' }, fillBar), when);
}

// Moves every clock in a note on. One that runs out asks the village to bring that party home.
export function tickClocks(note) {
  const now = Date.now();
  for (const k of note.refs.clocks ?? []) {
    k.when.textContent = k.end > now ? clockText(k.end - now) : 'back any moment';
    k.fillBar.style.width = `${Math.min(100, ((now - k.start) / Math.max(1, k.end - k.start)) * 100)}%`;
    if (k.end <= now && !k.called) {
      k.called = true;
      G.tickVillage?.();
    }
  }
}

// Every living creature and where each one is: out on your screen, at home, or away.
export async function loadVillage() {
  const rows = [];
  for (const f of await api.listCreatures()) {
    try {
      // Whoever is out is used as it is right now, not as its file was last saved.
      const c = G.team.find((m) => m.base === f.base)?.c ?? parseCreature(f.text);
      if (!c.dead) rows.push({ base: f.base, c });
    } catch { /* an unreadable file just gets left out */ }
  }
  const away = awayBases(G.house);
  G.everyone = rows;
  G.village = rows.filter((r) => !G.team.some((m) => m.base === r.base) && !away.has(r.base));
  getNote('village')?.rebuild();
  getNote('creatures')?.rebuild();
  refreshDock();
  return rows;
}

const homeCreatures = () => G.village.map((r) => r.c);

// What one villager does all day, in a line.
export function workLine(c) {
  const w = workOf(c, G.house.mine.includes(c.id));
  if (w.kind === 'legendary') return `Down the Legendary Mine: about ${r1(w.ore)} ore an hour.`;
  if (w.kind === 'mine') return `Mining: about ${r1(w.colors)} ${PIGMENTS[w.color].name.toLowerCase()} an hour, and a gem every ${r1(1 / w.gems)} hours.`;
  if (w.kind === 'farm') return `Farming: about ${r1(w.store)} food and ${r1(w.plants)} ${CROPS[w.crop].name} an hour.`;
  if (w.kind === 'battle') return `Hunting: about ${r1(w.store)} food an hour, and a gem every ${r1(1 / w.gems)} hours.`;
  if (w.kind === 'care') return `Nursing: everyone at home works ${pct(w.boost)} harder.`;
  return `Helping out: about ${r1(w.colors)} ${PIGMENTS[w.color].name.toLowerCase()} and ${r1(w.store)} food an hour.`;
}

function perHour(out) {
  const gems = out.gems >= 1 ? `${r1(out.gems)} gems` : out.gems > 0 ? `a gem every ${r1(1 / out.gems)} hours` : 'no gems';
  const ore = out.ore > 0 ? `, ${r1(out.ore)} Legendary ore` : '';
  return `Each hour the village brings in about ${Math.round(out.colors)} colors, ${gems}, ${r1(out.store)} food and ${r1(out.plants)} plants${ore}${out.boost ? `, ${pct(out.boost)} more thanks to its nurses` : ''}.`;
}

export async function openVillage(tab = 'work') {
  if (tab === 'creatures') tab = 'work';
  await loadVillage();
  const old = getNote('village')?.spec;
  openNote('village', {
    title: 'Village',
    cls: 'kraft',
    width: 396,
    help: 'start',
    tab,
    party: old?.party ?? [],
    names: old?.names ?? {},
    message: '',
    build(body, note) {
      const { spec } = note;
      note.refs.portraits = [];
      note.refs.clocks = [];
      fill(body,
        h('div', { class: 'small' }, `Your ${G.team.length} main${G.team.length === 1 ? ' is' : 's are'} out on your screen. The other ${G.village.length} live here and work for the pool you all share.`),
        h('div', { class: 'small', style: 'font-weight:600' }, rich(perHour(villageOutput(homeCreatures(), G.house.mine)))),
        h('div', { class: 'tabs' }, TABS.map(([id, label]) => button(id === 'expeditions' && G.house.expeditions.length ? `${label} (${G.house.expeditions.length})` : label, () => {
          spec.tab = id;
          spec.message = '';
          note.rebuild();
        }, spec.tab === id ? 'hot' : ''))),
        spec.message && h('div', { class: 'warning', style: 'margin-top:5px' }, spec.message),
      );
      const page = h('div', { class: 'scrollnote', style: 'margin-top:5px' });
      fill(body, page);
      if (spec.tab === 'expeditions') buildExpeditions(page, note);
      else if (spec.tab === 'mine') buildMine(page, note);
      else buildWork(page, note);
    },
    tick(note) {
      note.refs.portraits?.forEach(({ canvas, c }) => drawPortrait(canvas, c));
      tickClocks(note);
    },
  });
}

// ---------- work ----------

function villagerRow(note, row, extra = null) {
  const canvas = h('canvas');
  note.refs.portraits.push({ canvas, c: row.c });
  return h('div', { class: 'rosterrow' },
    canvas,
    h('div', { class: 'grow', style: 'min-width:0' },
      h('div', { class: 'name' }, fullName(row.c)),
      h('div', { class: 'small' }, workLine(row.c))),
    extra);
}

function buildWork(page, note) {
  fill(page,
    G.village.length === 0
      ? h('div', { class: 'small' }, 'Nobody lives here yet. Put a main away, breed, hatch an egg, or name what an expedition found.')
      : h('div', { class: 'roster', style: 'max-height:300px' }, G.village.map((r) => villagerRow(note, r, button('Bring out', async () => {
        const out = await G.bringOut(r.base, r.c);
        if (!out) note.spec.message = 'Everyone out is in the middle of a fight.';
        note.rebuild();
      }, 'mini')))),
    h('div', { class: 'small', style: 'margin-top:5px' }, 'Miners dig colors, farmers grow food, fighters hunt, and nurses make everyone work harder. While the game is closed they keep working for up to 8 hours.'),
    h('div', { class: 'row gap' }, button('Your creatures', () => G.open('creatures'), 'big'), button('Nursery', () => G.open('nursery'), 'big')),
  );
}

// ---------- the Legendary Mine ----------

function buildMine(page, note) {
  const out = villageOutput(homeCreatures(), G.house.mine);
  const workers = G.house.mine.map((id) => G.everyone.find((r) => r.c.id === id)).filter(Boolean);
  const free = LEGENDARY_MINE.slots - workers.length;
  const ready = G.village.filter((r) => isLegendaryMiner(r.c) && !G.house.mine.includes(r.c.id));
  const mainsReady = G.team.filter((m) => isLegendaryMiner(m.c) && !G.house.mine.includes(m.c.id));
  fill(page,
    h('div', { class: 'purse' }, h('span', null, 'Legendary ore: ', h('b', null, Math.floor(G.house.ore))), h('span', null, `About ${r1(out.ore)} an hour`)),
    h('div', { class: 'small', style: 'margin-top:4px' }, `Deep under the village, where only legendary Miners can dig: a Miner in its final form, or a Miner with a Legendary mutation. Each brings up about ${LEGENDARY_MINE.ore} ore an hour, more if it is older and the nurses help. The forge, in each creature's Workshop, turns ore and gems into weapons.`),
    h('div', { class: 'sect' }, `Working it (${workers.length} of ${LEGENDARY_MINE.slots})`),
    workers.length === 0 && h('div', { class: 'small' }, 'Nobody is down there yet.'),
    workers.length > 0 && h('div', { class: 'roster' }, workers.map((row) => {
      const onScreen = G.team.some((m) => m.c.id === row.c.id);
      return h('div', null, villagerRow(note, row, button('Bring up', async () => {
        leaveMine(G.house, row.c.id);
        await saveHouse();
        note.rebuild();
      }, 'mini')), onScreen && h('div', { class: 'small' }, `${row.c.name} is out on your screen, so it is not digging. Put it away to send it back down.`));
    })),
    h('div', { class: 'sect' }, 'Could go down'),
    ready.length === 0 && h('div', { class: 'small' }, mainsReady.length
      ? `${mainsReady.map((m) => m.c.name).join(' and ')} could, but only from the village: put ${mainsReady.length === 1 ? 'it' : 'them'} away first.`
      : 'No legendary Miners at home. Raise a Miner to its final form: Gem Hoarder, Spectrum Sage, Titan Driller or Tunnel Wraith.'),
    ready.length > 0 && h('div', { class: 'roster' }, ready.map((row) => villagerRow(note, row, button('Send down', async () => {
      const problem = mineProblem(G.house, row.c);
      if (problem) {
        note.spec.message = problem;
        note.rebuild();
        return;
      }
      joinMine(G.house, row.c);
      await saveHouse();
      toast(`${row.c.name.toUpperCase()} WENT DOWN THE LEGENDARY MINE!`, 'good');
      note.rebuild();
    }, 'mini hot', free <= 0)))),
  );
}

// ---------- expeditions ----------

function buildExpeditions(page, note) {
  const { spec } = note;
  const canGo = G.village.filter((r) => !G.house.mine.includes(r.c.id));
  spec.party = spec.party.filter((b) => canGo.some((r) => r.base === b));
  const party = spec.party.map((b) => canGo.find((r) => r.base === b));
  const power = party.reduce((s, r) => s + powerOf(r.c), 0);
  fill(page,
    h('div', { class: 'small' }, `Send up to ${PARTY_MAX} from the village, and up to ${EXPEDITIONS_AT_ONCE} expeditions at once. They are away until they get back, even while the game is closed. They always bring gems, sometimes loot or a creature of another race, and ${fine(FRUIT_FROM_EXPEDITION)} of the time a Devil Fruit.`),
    G.house.found.length > 0 && h('div', { class: 'sect' }, 'Waiting for a name'),
    G.house.found.map((found, i) => {
      const input = h('input', { type: 'text', maxLength: 24, placeholder: 'Name it', spellcheck: false, value: spec.names[i] ?? '' });
      input.addEventListener('input', () => { spec.names[i] = input.value; });
      return h('div', { class: 'way' },
        h('div', { class: 'top' }, `A ${RACES[found.race].name}!`),
        h('div', { class: 'small' }, `${found.where ? `Found ${EXPEDITIONS[found.where].name.toLowerCase()}. ` : 'It followed your party home from Adventure. '}${RACES[found.race].blurb}`),
        h('div', { class: 'row', style: 'margin-top:3px' }, input, button('Take it in', async () => {
          const name = input.value.trim();
          if (!name) {
            input.focus();
            return;
          }
          const c = takeFound(G.house, i, name);
          spec.names = {};
          await saveHouse();
          await createCreature(name, c);
          toast(`${name.toUpperCase()} THE ${raceName(c).toUpperCase()} JOINED THE VILLAGE!`, 'rare');
          spec.message = '';
          await loadVillage();
        }, 'mini hot')));
    }),
    // Out now, and the two kinds of place, fold: only one of them is open at a time.
    G.house.expeditions.length > 0 && folds(note, 'exp', [{
      id: 'out',
      title: 'Out now',
      tag: `${G.house.expeditions.length} away`,
      build: () => [
        h('div', { class: 'small' }, `Hurry one home with plants from the larder: ${HURRY_PLANTS} for every hour taken off. The larder has ${larderTotal(G.house)}.`),
        G.house.expeditions.map((e) => {
          const left = e.end - Date.now();
          const HOUR = 3600 * 1000;
          return h('div', { class: 'way', style: 'margin-top:3px' },
            h('div', { class: 'top' }, EXPEDITIONS[e.where].name, h('span', null, e.party.map((p) => p.name.split(' ')[0]).join(', '))),
            expeditionClock(note, e),
            left > 0 && h('div', { class: 'row', style: 'margin-top:3px' },
              button(`1 hour sooner: ${hurryCost(Math.min(HOUR, left))} plants`, () => hurry(note, e, HOUR), 'mini', !!hurryProblem(G.house, e, HOUR)),
              button(`Home now: ${hurryCost(left)} plants`, () => hurry(note, e, left), 'mini hot', !!hurryProblem(G.house, e, left))));
        }),
      ],
    }]),
    h('div', { class: 'sect' }, `Who goes (${party.length} of ${PARTY_MAX})`),
    canGo.length === 0
      ? h('div', { class: 'small' }, 'Nobody is at home to send. Creatures out on your screen, or down the Legendary Mine, can\'t go.')
      : h('div', { class: 'chips' }, canGo.map((r) => h('button', {
        class: `chip${spec.party.includes(r.base) ? ' on' : ''}`,
        disabled: !spec.party.includes(r.base) && spec.party.length >= PARTY_MAX,
        onclick: () => {
          spec.party = spec.party.includes(r.base) ? spec.party.filter((b) => b !== r.base) : [...spec.party, r.base];
          note.rebuild();
        },
      }, `${r.c.name} (${stageOf(r.c).name}, ${powerOf(r.c)})`))),
    folds(note, 'exp', Object.entries(EXPEDITION_KINDS).map(([kind, title]) => {
      const places = EXPEDITION_IDS.filter((where) => EXPEDITIONS[where].kind === kind);
      return {
        id: kind,
        title,
        tag: `${places.length} places${kind === 'bizarre' ? ', can kill' : ''}`,
        build: () => [
          kind === 'bizarre' && h('div', { class: 'warning' }, 'These can kill whoever goes. The stronger it is, the likelier it comes back.'),
          places.map((where) => wayCard(where, party, power, spec)),
        ],
      };
    })),
  );
}

// The first press only asks; the second sends them. Moving away calls it off.
function riskButton(label, onSure, cls, disabled) {
  let armed = false;
  const el = button(label, () => {
    if (!armed) {
      armed = true;
      el.textContent = 'Risk it?';
      el.classList.add('hot');
      return;
    }
    onSure();
  }, cls, disabled);
  el.addEventListener('mouseleave', () => {
    armed = false;
    el.textContent = label;
  });
  return el;
}

// One place an expedition can go, and what this party would bring back, or risk.
function wayCard(where, party, power, spec) {
  const place = EXPEDITIONS[where];
  const problem = expeditionProblem(G.house, where, party);
  const extra = Math.floor((power / 100) * PARTY_GEMS_PER_100);
  const bonus = partyBonus(party.map((r) => ({ c: r.c })));
  const perks = [bonus.speed && `back ${pct(bonus.speed)} sooner`, bonus.gems && `${pct(bonus.gems)} more gems`, bonus.finds && `${bonus.finds + 1} times as likely to find someone`].filter(Boolean);
  const finds = Object.entries(place.finds).map(([race, chance]) => `${RACES[race].name} ${fine(chance)}`).join(', ');
  const loot = Object.entries(place.items).map(([id, chance]) => `${ITEMS[id].name} ${fine(chance)}`).join(', ');
  return h('div', { class: 'way' },
    h('div', { class: 'top' }, place.name, h('span', null, `${Math.round(place.hours * (1 - bonus.speed) * 10) / 10} hour${place.hours === 1 && !bonus.speed ? '' : 's'}`)),
    perks.length > 0 && h('div', { class: 'small good' }, `This party's races: ${perks.join(', ')}.`),
    h('div', { class: 'small' }, rich(`${place.gems[0]} to ${place.gems[1]} gems${extra ? `, plus ${extra} for this party's power` : ''}. Loot: ${loot}. Could find: ${finds}.`)),
    place.danger > 0 && h('div', { class: 'small warning' }, party.length
      ? `Chance each one doesn't come back: ${party.map((r) => `${r.c.name} ${pct(deathChance(where, powerOf(r.c)))}`).join(', ')}. If none of them do, nothing they found does either.`
      : `Up to ${pct(place.danger)} chance each one doesn't come back, less the stronger it is. If none of them do, nothing they found does either.`),
    h('div', { class: 'row', style: 'margin-top:3px' }, (place.danger > 0 ? riskButton : button)('Send them', async () => {
      if (!startExpedition(G.house, where, party, Date.now())) return;
      spec.party = [];
      toast(`EXPEDITION SENT: ${place.name.toUpperCase()}! BACK IN ${timeLeft(place.hours * 3600000).toUpperCase()}`, 'info');
      await saveHouse();
      await loadVillage();
      getNote('menu')?.rebuild();
    }, 'mini hot', !!problem), problem && party.length > 0 && h('span', { class: 'small' }, problem)));
}

// Plants from the larder bring a party home sooner.
async function hurry(note, e, ms) {
  const res = hurryExpedition(G.house, e.id, ms, Date.now());
  if (!res) return;
  await saveHouse();
  toast(`${res.cost} PLANTS: THE PARTY IS ${Math.round(res.cut / 60000)} MINUTES CLOSER!`, 'good');
  if (e.end <= Date.now()) G.tickVillage?.();
  note.rebuild();
  getNote('menu')?.rebuild();
}
