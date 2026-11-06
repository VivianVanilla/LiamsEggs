// The Nursery: where new creatures come from. Breed two of yours, hatch an egg, or use what is in
// the bag: Time Chamber Keys grow a creature up on the spot, and Limit Expanders make room for more
// mutations. The Mega Breeder is bought here too, and the Bloodline Altar has a tab of its own.

import { toast } from './flair.js';
import { G, saveHouse } from '../state.js';
import { h, fill, button, openNote, getNote } from './notes.js';
import { stageOf, mutationCap } from '../core/creature.js';
import { megaBreederProblem, buyMegaBreeder } from '../core/family.js';
import { itemCount, itemProblem, useItem } from '../core/items.js';
import { MEGA_BREEDER } from '../data/family.js';
import { ITEMS, ITEM_IDS } from '../data/items.js';
import { ADVENTURE_PRIZES } from '../data/adventure.js';
import { drawPortrait, dropRig } from '../draw/art.js';
import { buildBreed, freshBreed, loadRows, saveAnywhere } from './breed.js';
import { buildEggs, freshEggs } from './roll.js';
import { buildAltar } from './altar.js';

const TABS = [['breed', 'Breed'], ['eggs', 'Eggs'], ['bag', 'Items'], ['altar', 'Altar']];
const bagCount = () => ITEM_IDS.reduce((n, id) => n + itemCount(G.house, id), 0);

export async function openNursery(tab = 'breed') {
  const rows = await loadRows();
  // Opening it again keeps whatever was being picked, with the creatures read again.
  const old = getNote('nursery')?.spec;
  openNote('nursery', {
    title: 'Nursery',
    cls: 'paper',
    width: 392,
    focus: true,
    help: 'breeding',
    tab,
    breed: old?.breed && !old.breed.result ? { ...old.breed, rows } : freshBreed(rows),
    eggs: old?.eggs ?? freshEggs(),
    bag: old?.bag ?? { pick: {} },
    build(body, note) {
      const { spec } = note;
      note.refs.portraits = [];
      const items = bagCount();
      fill(body,
        megaCard(note),
        h('div', { class: 'tabs' }, TABS.map(([id, label]) => button(id === 'bag' && items ? `${label} (${items})` : label, () => {
          spec.tab = id;
          note.rebuild();
        }, spec.tab === id ? 'hot' : ''))),
      );
      const page = h('div', { class: 'scrollnote', style: 'margin-top:6px' });
      fill(body, page);
      if (spec.tab === 'eggs') buildEggs(page, note);
      else if (spec.tab === 'bag') buildBag(page, note);
      else if (spec.tab === 'altar') buildAltar(page, note);
      else buildBreed(page, note);
    },
    tick(note) {
      note.refs.portraits?.forEach(({ canvas, c }) => drawPortrait(canvas, c));
    },
  });
}

// ---------- the Mega Breeder ----------

function megaCard(note) {
  if (G.house.megaBreeder) {
    return h('div', { class: 'mega owned small' }, h('b', null, 'Mega Breeder: '), `every egg can carry ${MEGA_BREEDER.gifts} more things from its parents.`);
  }
  const problem = megaBreederProblem(G.house);
  return h('div', { class: 'mega' },
    h('div', { class: 'row nowrap' },
      h('div', { class: 'grow' },
        h('div', { class: 'hand', style: 'font-weight:700' }, 'The Mega Breeder'),
        h('div', { class: 'small' }, `Every egg after it can carry ${MEGA_BREEDER.gifts} more things from its parents: born-with gifts, mutations or a Quirk. Bought once, for all of them.`)),
      button(`Buy: ${MEGA_BREEDER.cost} gems`, async () => {
        if (!buyMegaBreeder(G.house)) return;
        await saveHouse();
        toast('MEGA BREEDER! EVERY EGG CAN CARRY MORE NOW!!!', 'rare');
        note.rebuild();
      }, 'hot', !!problem)),
    problem && h('div', { class: 'small' }, `You have ${Math.floor(G.house.bank.gems)} gems.`));
}

// ---------- the bag ----------

// Where an item turns up for sure: the Adventure levels that hand one over the first time.
const prizeLevels = (id) => Object.entries(ADVENTURE_PRIZES).filter(([, p]) => p.items?.[id]).map(([n]) => n);

function buildBag(page, note) {
  const st = note.spec.bag;
  const { rows } = note.spec.breed;
  fill(page, h('div', { class: 'small' }, 'Loot from Adventure and expeditions. Use it on any of your creatures, out on your screen or living in the village.'));
  for (const id of ITEM_IDS) {
    const item = ITEMS[id];
    const n = itemCount(G.house, id);
    // Who it would work on, whatever is in the bag.
    const fits = rows.filter((r) => !itemProblem({ items: { [id]: 1 } }, id, r.c));
    if (!fits.some((r) => r.base === st.pick[id])) st.pick[id] = fits[0]?.base ?? '';
    const select = h('select', { onchange: (e) => { st.pick[id] = e.target.value; } },
      fits.map((r) => h('option', { value: r.base, selected: r.base === st.pick[id] }, `${r.c.name}, ${id === 'chamber' ? stageOf(r.c).name : `${r.c.mutations.length} of ${mutationCap(r.c)} mutations`}`)));
    const levels = prizeLevels(id);
    fill(page, h('div', { class: 'itemrow', style: `--c:${item.color}` },
      h('div', { class: 'grow' },
        h('div', { class: 'what' }, `${item.name} `, h('span', { class: 'count' }, `x${n}`)),
        h('div', { class: 'small' }, item.text),
        n > 0 && fits.length > 0 && h('div', { class: 'row', style: 'margin-top:4px' },
          h('span', { class: 'small' }, 'Use on'), select, button('Use it', () => use(note, id), 'mini hot')),
        n > 0 && !fits.length && h('div', { class: 'small', style: 'margin-top:3px' }, 'None of your creatures can use one right now.'),
        n === 0 && h('div', { class: 'small', style: 'margin-top:3px' }, `None yet. Adventure level${levels.length === 1 ? '' : 's'} ${levels.join(', ')} hand${levels.length === 1 ? 's' : ''} one over the first time, and any Adventure win or expedition can turn one up.`))));
  }
}

async function use(note, id) {
  const row = note.spec.breed.rows.find((r) => r.base === note.spec.bag.pick[id]);
  if (!row || !useItem(G.house, id, row.c)) return;
  dropRig(row.c);
  await saveHouse();
  await saveAnywhere(row.c, row.base);
  toast(id === 'chamber'
    ? `${row.c.name.toUpperCase()} CAME OUT OF THE TIME CHAMBER ALL GROWN UP!`
    : `${row.c.name.toUpperCase()} CAN HOLD ${mutationCap(row.c)} MUTATIONS NOW!`, 'rare');
  G.onCreatureChanged?.();
  note.rebuild();
}
