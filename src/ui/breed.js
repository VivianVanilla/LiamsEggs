// The Breed note: two of your creatures make an egg, and you choose what it gets from each one.

import { toast, rich } from './flair.js';
import { G, api, saveCreature, memberOf, creatureText } from '../state.js';
import { h, fill, button, openNote } from './notes.js';
import { parseCreature, fullName, lastName, lineageOf, otherLineOf, creatureColors, addActivityXp, pathTitle, STAGES } from '../core/creature.js';
import { breedProblem, giftsOf, giftLimit, breed, nurseHelp, restHours, mixHeritage, mainRace } from '../core/family.js';
import { awayBases } from '../core/village.js';
import { PURE_BLOOD_CHANCE } from '../data/races.js';
import { raceName } from '../core/creature.js';
import { STANCES } from '../data/battle.js';
import { TECHNIQUES, TRAITS } from '../data/powers.js';
import { BREED_COST, BREED_FULLNESS, BREED_STAGE, CARE_XP } from '../data/family.js';
import { drawPortrait } from '../draw/art.js';
import { createCreature } from './panels.js';

const pct = (v) => `${Math.round(v * 100)}%`;
const freshChoice = () => ({ family: 'a', look: 'a', style: 'a', race: null, gifts: [] });
// Why this one can't be a parent: away on an expedition, or anything the breeding rules say.
const parentProblem = (row, now, help) => (awayBases(G.house).has(row.base) ? `${row.c.name} is away on an expedition` : breedProblem(row.c, now, help));

async function loadRows() {
  const rows = [];
  for (const f of await api.listCreatures()) {
    try {
      // Whoever is out is used as it is right now, so nothing it did since its last save is lost.
      const c = G.team.find((m) => m.base === f.base)?.c ?? parseCreature(f.text);
      if (!c.dead) rows.push({ base: f.base, c });
    } catch { /* an unreadable file just gets left out of the list */ }
  }
  return rows;
}

export async function openBreed() {
  const rows = await loadRows();
  const first = rows.find((r) => r.c === G.creature) ?? rows[0];
  const second = rows.find((r) => r !== first);
  openNote('breed', {
    title: 'Breed',
    cls: 'paper',
    width: 380,
    focus: true,
    help: 'breeding',
    rows,
    picked: [first?.base, second?.base].filter(Boolean),
    choice: freshChoice(),
    name: '',
    message: '',
    result: null,
    build(body, note) {
      if (note.spec.result) buildResult(body, note);
      else buildPicker(body, note);
    },
    tick(note) {
      note.refs.portraits?.forEach(({ canvas, c }) => drawPortrait(canvas, c));
    },
  });
}

// Two little buttons to choose between the parents. If both would give the same, there is just one.
function either(note, key, labelOf) {
  const { choice } = note.spec;
  const [a, b] = parents(note);
  const options = [['a', a], ['b', b]].filter(([, p], i, all) => i === 0 || labelOf(p) !== labelOf(all[0][1]));
  return h('div', { class: 'chips' }, options.map(([who, p]) => h('button', {
    class: `chip${choice[key] === who || options.length === 1 ? ' on' : ''}`,
    onclick: () => {
      choice[key] = who;
      note.rebuild();
    },
  }, labelOf(p))));
}

const parents = (note) => note.spec.picked.map((base) => note.spec.rows.find((r) => r.base === base)?.c);

function buildPicker(body, note) {
  const { rows, picked, choice } = note.spec;
  const now = Date.now();
  const help = nurseHelp(G.team.map((m) => m.c));
  const portraits = [];
  note.refs.portraits = portraits;
  fill(body,
    h('div', { class: 'small' }, `Pick two parents. They need to be ${STAGES[BREED_STAGE].name}s or older and at least ${BREED_FULLNESS} full. Each spends ${BREED_COST} fullness and rests ${Math.round(restHours(help) * 60)} minutes after.`),
    help.nurse
      ? h('div', { class: 'small', style: 'font-weight:600' }, nurseLine(help))
      : h('div', { class: 'small' }, 'A Nurse out on the screen helps: more can pass on, parents rest less, and eggs hatch bigger.'),
    h('div', { class: 'roster', style: 'max-height:150px;margin-top:5px' }, rows.map((row) => {
      const canvas = h('canvas');
      portraits.push({ canvas, c: row.c });
      const on = picked.includes(row.base);
      return h('div', { class: 'rosterrow' },
        canvas,
        h('div', { class: 'grow', style: 'min-width:0' },
          h('div', { class: 'name' }, fullName(row.c)),
          h('div', { class: 'small' }, parentProblem(row, now, help) ?? 'Ready')),
        button(on ? 'Parent' : 'Pick', () => {
          note.spec.picked = on ? picked.filter((b) => b !== row.base) : [...picked.slice(-1), row.base];
          note.spec.choice = freshChoice();
          note.spec.message = '';
          note.rebuild();
        }, on ? 'mini hot' : 'mini'));
    })),
  );
  const [a, b] = parents(note);
  if (!a || !b) {
    fill(body, h('div', { class: 'small', style: 'margin-top:6px' }, rows.length < 2 ? 'You need two creatures. Make another one in Your creatures.' : 'Pick one more.'));
    return;
  }
  const [rowA, rowB] = picked.map((base) => rows.find((r) => r.base === base));
  const problem = parentProblem(rowA, now, help) ?? parentProblem(rowB, now, help);
  const heritage = mixHeritage(a, b);
  const babyRace = raceName({ heritage, race: mainRace(heritage), pureBlood: false });
  const gifts = giftsOf(a, b);
  const limit = giftLimit(help);
  const nameOf = (who) => (who === 'a' ? a : b).name;
  const quirkTaken = choice.gifts.some((k) => k.startsWith('quirk:'));
  const input = h('input', { type: 'text', maxLength: 24, placeholder: 'Name the baby', spellcheck: false, value: note.spec.name });
  input.addEventListener('input', () => { note.spec.name = input.value; });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') hatch(note, input); });
  note.refs.input = input;
  const family = (p) => `${lastName(p)} (${TECHNIQUES[lineageOf(p)].name})`;
  const look = (p) => creatureColors(p).body;
  fill(body,
    h('div', { class: 'sect' }, 'Last name'),
    either(note, 'family', family),
    h('div', { class: 'small' }, `Its last name decides its cursed technique. The other parent's family becomes the other side of its family, which only a Cursed Body can use.`),
    h('div', { class: 'sect' }, 'Race'),
    h('div', { class: 'small' }, rich(`It will be ${babyRace}: half of each parent's races, down to quarters. Each race gives its share of its bonuses, and a half or more brings its move.${Object.keys(heritage).length > 1 ? ` 1 in ${Math.round(1 / PURE_BLOOD_CHANCE)} is born a Pure-blood, with every race at full power.` : ''}`)),
    h('div', { class: 'sect' }, 'Looks like'),
    either(note, 'look', (p) => `${p.name}`),
    h('div', { class: 'swatches', style: 'margin-top:3px' }, [a, b].map((p) => h('div', { class: 'swatch', title: p.name, style: `background:${look(p)}` }))),
    h('div', { class: 'sect' }, 'Fights like'),
    either(note, 'style', (p) => `${p.name}: ${STANCES[p.battle.stance].name}`),
    h('div', { class: 'sect' }, `Passes on: ${choice.gifts.length} of ${limit}`),
    gifts.length === 0
      ? h('div', { class: 'small' }, 'Neither has a gift, a mutation or a Quirk to pass on yet.')
      : h('div', { class: 'chips' }, gifts.map((g) => {
        const on = choice.gifts.includes(g.key);
        const blocked = !on && (choice.gifts.length >= limit || (g.kind === 'quirk' && quirkTaken));
        return h('button', {
          class: `chip${on ? ' on' : ''}`,
          style: g.kind === 'trait' ? `--c:${TRAITS[g.id].color}` : '',
          title: g.what,
          disabled: blocked,
          onclick: () => {
            choice.gifts = on ? choice.gifts.filter((k) => k !== g.key) : [...choice.gifts, g.key];
            note.rebuild();
          },
        }, `${g.name} (${nameOf(g.from)})`);
      })),
    choice.gifts.length > 0 && h('div', { class: 'ways', style: 'max-height:120px;margin-top:4px' }, choice.gifts.map((k) => {
      const g = gifts.find((x) => x.key === k);
      return g && h('div', { class: 'small' }, h('b', null, `${g.name}: `), g.what);
    })),
    h('div', { class: 'small', style: 'margin-top:3px' }, 'Born-with gifts, mutations and one Quirk can pass on. One For All never does: it only goes on when its holder gives everything.'),
    (note.spec.message || problem) && h('div', { class: 'warning' }, note.spec.message || problem),
    h('div', { class: 'row gap' }, input, button('Hatch the egg', () => hatch(note, input), 'big hot', !!problem)),
  );
}

function nurseLine(help) {
  const bits = [];
  if (help.picks) bits.push(`${help.picks} more can pass on`);
  if (help.rest) bits.push(`parents rest ${pct(help.rest)} less`);
  if (help.growth) bits.push(`the egg hatches with ${help.growth} growth`);
  return `${help.nurse.name} the ${pathTitle(help.nurse)} is out: ${bits.join(', ')}.`;
}

async function hatch(note, input) {
  const [a, b] = parents(note);
  const name = input.value.trim();
  if (!a || !b) return;
  if (!name) {
    input.focus();
    return;
  }
  const help = nurseHelp(G.team.map((m) => m.c));
  const res = breed(a, b, note.spec.choice, name, Date.now(), help);
  if (res.problem) {
    note.spec.message = res.problem;
    note.rebuild();
    return;
  }
  // Both parents changed, wherever they are: out on the screen or waiting in their files.
  for (const p of [a, b]) {
    if (memberOf(p)) await saveCreature(p);
    else await api.saveCreature(note.spec.rows.find((r) => r.c === p).base, creatureText(p));
  }
  if (help.nurse && memberOf(help.nurse)) {
    addActivityXp(help.nurse, 'care', CARE_XP.breed);
    await saveCreature(help.nurse);
  }
  const made = await createCreature(name, res.baby);
  toast(`${res.baby.name.toUpperCase()} HATCHED!${res.baby.pureBlood ? ' A PURE-BLOOD!!!' : res.baby.traits.length ? ' BORN WITH A GIFT!!!' : ''}`, res.baby.pureBlood || res.baby.traits.length ? 'rare' : 'good');
  note.spec.result = made;
  note.spec.name = '';
  note.rebuild();
  for (const p of [a, b]) {
    const m = memberOf(p);
    if (m) G.fx.float(m.pet.x, m.pet.y - 90, `an egg: ${res.baby.name}!`, '#ffd6e8', 16, 3);
  }
}

function buildResult(body, note) {
  const { c, base } = note.spec.result;
  const out = G.team.some((m) => m.base === base);
  const other = TECHNIQUES[otherLineOf(c)];
  const lines = [
    `Family: ${lastName(c)}, so ${TECHNIQUES[lineageOf(c)].name}. The other side: ${other.family}, so ${other.name}.`,
    c.traits.length && `Born with: ${c.traits.map((id) => TRAITS[id].name).join(', ')}.`,
    c.mutations.length && `Mutations: ${c.mutations.length}.`,
    c.powers.quirks.length && `Quirk: ${c.powers.quirks.length}.`,
    c.growth > 0 && `It hatched with ${c.growth} growth, thanks to the nurse.`,
  ].filter(Boolean);
  const portrait = h('canvas', { class: 'portrait' });
  note.refs.portraits = [{ canvas: portrait, c }];
  fill(body,
    h('div', { class: 'row nowrap' }, portrait, h('div', { class: 'grow' },
      h('div', { class: 'nameline' }, `${fullName(c)} hatched!`),
      h('div', { class: 'small' }, `Child of ${c.parents.map((p) => p.name).join(' and ')}.`))),
    lines.map((t) => h('div', { class: 'small', style: 'margin-top:2px' }, t)),
    h('div', { class: 'row gap' },
      !out && button('Bring it out', async () => {
        await G.bringOut(base, c);
        note.rebuild();
      }, 'big hot'),
      button('Breed again', async () => {
        note.spec.rows = await loadRows();
        note.spec.result = null;
        note.spec.choice = freshChoice();
        note.rebuild();
      }, 'big')),
    h('div', { class: 'small', style: 'margin-top:4px' }, out ? 'It is out on your screen.' : 'Its file is in Your creatures, ready whenever you want it out.'),
  );
}
