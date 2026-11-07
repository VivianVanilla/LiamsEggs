// Breeding, the Breed tab of the Nursery: two of your creatures make an egg, and you choose what it
// gets from each one. There is no waiting between eggs; each parent just spends some fullness.

import { toast, rich } from './flair.js';
import { G, api, saveCreature, saveHouse, memberOf, creatureText } from '../state.js';
import { h, fill, button } from './notes.js';
import { parseCreature, fullName, lastName, lineageOf, otherLineOf, creatureColors, addActivityXp, pathTitle, raceName, stageOf, STAGES } from '../core/creature.js';
import { breedProblem, breedCost, giftsOf, giftLimit, breed, nurseHelp, mixHeritage, mainRace, awakenChances, pairProblem } from '../core/family.js';
import { awayBases } from '../core/village.js';
import { itemCount, itemProblem, useItem } from '../core/items.js';
import { PURE_BLOOD_CHANCE } from '../data/races.js';
import { STANCES } from '../data/battle.js';
import { TECHNIQUES, TRAITS } from '../data/powers.js';
import { BREED_FULLNESS, BREED_STAGE, CARE_XP, MEGA_BREEDER } from '../data/family.js';
import { ITEMS } from '../data/items.js';
import { dropRig } from '../draw/art.js';
import { createCreature } from './panels.js';
import { openNursery } from './nursery.js';
import { loadVillage } from './village.js';

const pct = (v) => `${Math.round(v * 100)}%`;
const freshChoice = () => ({ family: 'a', look: 'a', style: 'a', race: null, gifts: [] });
// Why this one can't be a parent: away on an expedition, or anything the breeding rules say.
const parentProblem = (row) => (awayBases(G.house).has(row.base) ? `${row.c.name} is away on an expedition` : breedProblem(row.c));

// Everything that helps an egg along: the nurse out on the screen, and the Mega Breeder.
export const breedHelp = () => ({ ...nurseHelp(G.team.map((m) => m.c)), mega: !!G.house.megaBreeder, deluxe: !!G.house.deluxeBreeder });

// Every living creature, the ones out on the screen as they are right now.
export async function loadRows() {
  const rows = [];
  for (const f of await api.listCreatures()) {
    try {
      const c = G.team.find((m) => m.base === f.base)?.c ?? parseCreature(f.text);
      if (!c.dead) rows.push({ base: f.base, c });
    } catch { /* an unreadable file just gets left out of the list */ }
  }
  return rows;
}

export function freshBreed(rows) {
  const first = rows.find((r) => r.c === G.creature) ?? rows[0];
  const second = rows.find((r) => r !== first);
  return { rows, picked: [first?.base, second?.base].filter(Boolean), choice: freshChoice(), name: '', message: '', result: null };
}

export const openBreed = () => openNursery('breed');

// Saves a creature wherever it is: out on the screen, or in its file. The village's own copies are
// read again after, so nothing there is left out of date.
export async function saveAnywhere(c, base) {
  if (memberOf(c)) {
    await saveCreature(c);
    return;
  }
  await api.saveCreature(base, creatureText(c));
  await loadVillage();
}

export function buildBreed(page, note) {
  const st = note.spec.breed;
  if (st.result) buildResult(page, note);
  else buildPicker(page, note);
}

// Two little buttons to choose between the parents. If both would give the same, there is just one.
function either(note, key, labelOf) {
  const { choice } = note.spec.breed;
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

const parents = (note) => note.spec.breed.picked.map((base) => note.spec.breed.rows.find((r) => r.base === base)?.c);

// One step of the Nursery, in a card of its own: a number, a title, and a summary on the right.
export function stepCard(num, title, tag, ...kids) {
  return h('div', { class: 'ncard' },
    h('div', { class: 'ncard-head' },
      num != null && h('span', { class: 'ncard-num' }, String(num)),
      h('span', { class: 'ncard-title' }, title),
      tag != null && tag !== false && h('span', { class: 'ncard-tag' }, tag)),
    kids);
}

// How many places are filled, as dots.
const pips = (n, of) => h('span', { class: 'pips', title: `${n} of ${of}` }, Array.from({ length: of }, (_, i) => h('i', { class: `pip${i < n ? ' on' : ''}` })));

const sublabel = (text) => h('div', { class: 'sublabel' }, text);

// The two parents side by side. Clicking one puts it back.
function parentSlots(note, a, b) {
  const st = note.spec.breed;
  const slot = (c, base) => {
    if (!c) return h('div', { class: 'parentslot empty' }, h('span', { class: 'small' }, 'Pick a parent below'));
    const canvas = h('canvas');
    note.refs.portraits.push({ canvas, c });
    return h('button', {
      class: 'parentslot',
      title: 'Put it back',
      onclick: () => {
        st.picked = st.picked.filter((x) => x !== base);
        st.choice = freshChoice();
        st.message = '';
        note.rebuild();
      },
    }, canvas, h('span', { class: 'pname' }, c.name), h('span', { class: 'small' }, `${stageOf(c).name}, ${raceName(c)}`));
  };
  return h('div', { class: 'parents' }, slot(a, st.picked[0]), h('span', { class: 'parentplus' }, '+'), slot(b, st.picked[1]));
}

function buildPicker(page, note) {
  const st = note.spec.breed;
  const { rows, picked, choice } = st;
  const help = breedHelp();
  const keys = itemCount(G.house, 'chamber');
  const [a, b] = parents(note);
  fill(page, stepCard(1, 'Parents', `${[a, b].filter(Boolean).length} of 2`,
    parentSlots(note, a, b),
    h('div', { class: 'small', style: 'margin-top:5px' }, `${STAGES[BREED_STAGE].name}s or older, at least ${BREED_FULLNESS} full. Each spends ${breedCost(help)} fullness, and can go again as soon as it is fed.`),
    help.nurse
      ? h('div', { class: 'small good' }, nurseLine(help))
      : h('div', { class: 'small' }, 'A Nurse out on the screen helps: more can pass on, parents spend less, and eggs hatch bigger.'),
    h('div', { class: 'roster', style: 'max-height:150px;margin-top:5px' }, rows.map((row) => {
      const canvas = h('canvas');
      note.refs.portraits.push({ canvas, c: row.c });
      const on = picked.includes(row.base);
      const problem = parentProblem(row);
      // Too young? A Time Chamber Key fixes that on the spot.
      const young = keys > 0 && problem && !itemProblem(G.house, 'chamber', row.c) && /has to be a/.test(problem);
      return h('div', { class: `rosterrow${on ? ' picked' : ''}` },
        canvas,
        h('div', { class: 'grow', style: 'min-width:0' },
          h('div', { class: 'name' }, fullName(row.c)),
          h('div', { class: 'small' }, problem ?? 'Ready')),
        young && button('Time Chamber', async () => {
          if (!useItem(G.house, 'chamber', row.c)) return;
          dropRig(row.c);
          await saveHouse();
          await saveAnywhere(row.c, row.base);
          toast(`${row.c.name.toUpperCase()} CAME OUT OF THE TIME CHAMBER ALL GROWN UP!`, 'rare');
          note.rebuild();
        }, 'mini'),
        button(on ? 'Parent' : 'Pick', () => {
          st.picked = on ? picked.filter((x) => x !== row.base) : [...picked.slice(-1), row.base];
          st.choice = freshChoice();
          st.message = '';
          note.rebuild();
        }, on ? 'mini hot' : 'mini'));
    }))));
  if (!a || !b) {
    if (rows.length < 2) fill(page, h('div', { class: 'small', style: 'margin-top:6px' }, 'You need two creatures. Hatch one in the Eggs tab.'));
    return;
  }
  const [rowA, rowB] = picked.map((base) => rows.find((r) => r.base === base));
  const problem = parentProblem(rowA) ?? parentProblem(rowB) ?? pairProblem(a, b, help);
  const heritage = mixHeritage(a, b);
  // Passing Pure-blood on makes it one for sure, so the preview says so.
  const passingPure = choice.gifts.includes('pureBlood:pureBlood');
  const babyRace = raceName({ heritage, race: mainRace(heritage), pureBlood: passingPure });
  const gifts = giftsOf(a, b);
  const limit = giftLimit(help);
  const nameOf = (who) => (who === 'a' ? a : b).name;
  const quirkTaken = choice.gifts.some((k) => k.startsWith('quirk:'));
  const input = h('input', { type: 'text', maxLength: 24, placeholder: 'Name the baby', spellcheck: false, value: st.name });
  input.addEventListener('input', () => { st.name = input.value; });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') hatch(note, input); });
  const family = (p) => `${lastName(p)} (${TECHNIQUES[lineageOf(p)].name})`;
  const look = (p) => creatureColors(p).body;
  fill(page,
    stepCard(2, 'The baby', babyRace,
      sublabel('Last name'),
      either(note, 'family', family),
      h('div', { class: 'small' }, 'Decides its cursed technique. The other parent\'s family becomes the other side of its family, which only a Cursed Body can use.'),
      sublabel('Looks like'),
      h('div', { class: 'row nowrap' },
        either(note, 'look', (p) => `${p.name}`),
        h('div', { class: 'swatches' }, [a, b].map((p) => h('div', { class: 'swatch', title: p.name, style: `background:${look(p)}` })))),
      sublabel('Fights like'),
      either(note, 'style', (p) => `${p.name}: ${STANCES[p.battle.stance].name}`),
      sublabel('Race'),
      h('div', { class: 'small' }, rich(`${babyRace}: half of each parent's races, down to quarters.${Object.keys(heritage).length < 2 ? ''
        : passingPure ? ' Pure-blood is passing on, so every race in it will be at full power.'
        : ` 1 in ${Math.round(1 / PURE_BLOOD_CHANCE)} is born a Pure-blood, with every race at full power. If either parent is Pure-blooded, you can also choose to pass it on below.`}`))),
    stepCard(3, 'Passes on', h('span', null, pips(choice.gifts.length, limit), ` ${choice.gifts.length} of ${limit}${help.deluxe ? ', Deluxe' : help.mega ? ', Mega' : ''}`),
      gifts.length === 0
        ? h('div', { class: 'small' }, 'Neither has a gift, a mutation, a Quirk or Pure-bloodedness to pass on yet.')
        : h('div', { class: 'chips' }, gifts.map((g) => {
          const on = choice.gifts.includes(g.key);
          const blocked = !on && (choice.gifts.length >= limit || (g.kind === 'quirk' && quirkTaken));
          return h('button', {
            class: `chip${on ? ' on' : ''}`,
            style: g.kind === 'trait' ? `--c:${TRAITS[g.id].color}` : g.kind === 'pureBlood' ? '--c:#ffd84a' : '',
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
      !help.mega && gifts.length > limit && h('div', { class: 'small', style: 'margin-top:3px' }, `More to pass on than fits. The Mega Breeder, at the top of this note, lets ${MEGA_BREEDER.gifts} more through.`),
      awakenRows(a, b, choice)),
    (st.message || problem) && h('div', { class: 'warning' }, st.message || problem),
    h('div', { class: 'hatchbar' }, input, button('Hatch the egg', () => hatch(note, input), 'big hot', !!problem)),
  );
}

// Gifts no egg hatches with, that this pair's baby could wake up with, and the chance of each.
function awakenRows(a, b, choice) {
  const passing = choice.gifts.filter((k) => k.startsWith('trait:')).map((k) => k.slice(6));
  const could = awakenChances(a, b, passing);
  if (!could.length) return null;
  return [
    sublabel('Could awaken'),
    could.map(({ id, oneIn }) => h('div', { class: 'small', style: 'margin-top:2px' },
      h('b', { style: `color:${TRAITS[id].color}` }, `${TRAITS[id].name}, 1 in ${oneIn}: `), TRAITS[id].blurb)),
  ];
}

function nurseLine(help) {
  const bits = [];
  if (help.picks) bits.push(`${help.picks} more can pass on`);
  if (help.save) bits.push(`parents spend ${pct(help.save)} less fullness`);
  if (help.growth) bits.push(`the egg hatches with ${help.growth} growth`);
  return `${help.nurse.name} the ${pathTitle(help.nurse)} is out: ${bits.join(', ')}.`;
}

async function hatch(note, input) {
  const st = note.spec.breed;
  const [a, b] = parents(note);
  const name = input.value.trim();
  if (!a || !b) return;
  if (!name) {
    input.focus();
    return;
  }
  const help = breedHelp();
  const res = breed(a, b, st.choice, name, Date.now(), help);
  if (res.problem) {
    st.message = res.problem;
    note.rebuild();
    return;
  }
  // Both parents changed, wherever they are: out on the screen or living in the village.
  for (const p of [a, b]) await saveAnywhere(p, st.rows.find((r) => r.c === p).base);
  if (help.nurse && memberOf(help.nurse)) {
    addActivityXp(help.nurse, 'care', CARE_XP.breed);
    await saveCreature(help.nurse);
  }
  const made = await createCreature(name, res.baby);
  const woke = res.awakened.map((id) => TRAITS[id].name.toUpperCase()).join(' AND ');
  toast(`${res.baby.name.toUpperCase()} HATCHED!${woke ? ` IT AWAKENED ${woke}!!!` : res.baby.pureBlood ? ' A PURE-BLOOD!!!' : res.baby.traits.length ? ' BORN WITH A GIFT!!!' : ''}`, woke || res.baby.pureBlood || res.baby.traits.length ? 'rare' : 'good');
  st.result = { ...made, awakened: res.awakened };
  st.name = '';
  note.rebuild();
  for (const p of [a, b]) {
    const m = memberOf(p);
    if (m) G.fx.float(m.pet.x, m.pet.y - 90, `an egg: ${res.baby.name}!`, '#ffd6e8', 16, 3);
  }
}

function buildResult(page, note) {
  const st = note.spec.breed;
  const { c, base } = st.result;
  const out = G.team.some((m) => m.base === base);
  const other = TECHNIQUES[otherLineOf(c)];
  const lines = [
    `Family: ${lastName(c)}, so ${TECHNIQUES[lineageOf(c)].name}. The other side: ${other.family}, so ${other.name}.`,
    c.traits.length && `Born with: ${c.traits.map((id) => TRAITS[id].name).join(', ')}.`,
    st.result.awakened?.length && `Awakened in it, from its parents: ${st.result.awakened.map((id) => TRAITS[id].name).join(', ')}!`,
    c.mutations.length && `Mutations: ${c.mutations.length}.`,
    c.powers.quirks.length && `Quirk: ${c.powers.quirks.length}.`,
    c.growth > 0 && `It hatched with ${c.growth} growth, thanks to the nurse.`,
  ].filter(Boolean);
  const portrait = h('canvas', { class: 'portrait' });
  note.refs.portraits.push({ canvas: portrait, c });
  const keyLeft = itemCount(G.house, 'chamber');
  const gifts = [...c.traits.map((id) => [id, false]), ...(st.result.awakened ?? []).filter((id) => !c.traits.includes(id)).map((id) => [id, true])];
  fill(page,
    h('div', { class: 'eggshow' }, portrait, h('div', { class: 'eggfacts' },
      h('div', { class: 'nameline' }, `${fullName(c)} hatched!`),
      h('div', { class: 'small' }, `Child of ${c.parents.map((p) => p.name).join(' and ')}. ${raceName(c)}.`),
      gifts.length > 0 && h('div', { class: 'chips' }, gifts.map(([id, woke]) => h('span', { class: 'pchip', style: `--c:${TRAITS[id].color}`, title: TRAITS[id].blurb }, woke ? `${TRAITS[id].name}, awakened!` : TRAITS[id].name))))),
    lines.filter((t) => !t.startsWith('Born with') && !t.startsWith('Awakened')).map((t) => h('div', { class: 'small', style: 'margin-top:2px' }, t)),
    h('div', { class: 'row gap' },
      !out && button('Bring it out', async () => {
        await G.bringOut(base, c);
        note.rebuild();
      }, 'big hot'),
      button('Breed again', async () => {
        note.spec.breed = freshBreed(await loadRows());
        note.rebuild();
      }, 'big')),
    keyLeft > 0 && !itemProblem(G.house, 'chamber', c) && h('div', { class: 'row gap' }, button(`Grow it up with a ${ITEMS.chamber.name} (${keyLeft} left)`, async () => {
      if (!useItem(G.house, 'chamber', c)) return;
      dropRig(c);
      await saveHouse();
      await saveAnywhere(c, base);
      toast(`${c.name.toUpperCase()} IS ALL GROWN UP!`, 'rare');
      note.rebuild();
    }, 'big')),
    h('div', { class: 'small', style: 'margin-top:4px' }, out ? 'It is out on your screen.' : 'It lives in the village now, ready whenever you want it out.'),
  );
}
