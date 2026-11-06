// The Bloodline Altar, the Altar tab of the Nursery. Bought once with gems. A creature sacrificed on
// it is gone for good, and every race it is at least half of becomes a race eggs can hatch as.

import { toast } from './flair.js';
import { G, saveHouse, inBout } from '../state.js';
import { h, fill, button, sureButton } from './notes.js';
import { fullName, raceName } from '../core/creature.js';
import { altarProblem, buyAltar, sacrificeProblem, sacrifice, altarRacesOf, eggRaces } from '../core/family.js';
import { awayBases } from '../core/village.js';
import { ALTAR } from '../data/family.js';
import { RACES } from '../data/races.js';
import { loadRows } from './breed.js';

const raceList = (ids) => ids.map((id) => RACES[id].name).join(', ');

export function buildAltar(page, note) {
  const { house } = G;
  if (!house.altar) {
    const problem = altarProblem(house);
    fill(page,
      h('div', { class: 'mega' },
        h('div', { class: 'row nowrap' },
          h('div', { class: 'grow' },
            h('div', { class: 'hand', style: 'font-weight:700' }, 'The Bloodline Altar'),
            h('div', { class: 'small' }, `Sacrifice a creature on it, and every race it is at least ${Math.round(ALTAR.share * 100)}% of becomes a race your eggs can hatch as, for good. Bought once, for all of them.`)),
          button(`Buy: ${ALTAR.cost} gems`, async () => {
            if (!buyAltar(house)) return;
            await saveHouse();
            toast('THE BLOODLINE ALTAR! SACRIFICE A RACE TO HATCH IT!!!', 'rare');
            note.rebuild();
          }, 'hot', !!problem)),
        problem && h('div', { class: 'small' }, `You have ${Math.floor(house.bank.gems)} gems.`)),
    );
    return;
  }
  const rows = note.spec.breed.rows;
  const away = awayBases(house);
  const offer = rows.filter((r) => altarRacesOf(r.c).length > 0);
  fill(page,
    h('div', { class: 'small', style: 'font-weight:600' }, `Eggs can hatch as: ${raceList(eggRaces(house))}. Nobody picks: each egg has a ${Math.round(ALTAR.eggChance * 100)}% chance of being one of the altar's races, whole, half or a quarter, and the Eggs tab shows which.`),
    h('div', { class: 'small' }, `A creature sacrificed here is gone for good, its file a gravestone. Every race it is at least ${Math.round(ALTAR.share * 100)}% of joins the altar, so a half-and-half creature adds both. A quarter isn't enough.`),
    h('div', { class: 'sect' }, 'Sacrifice'),
    offer.length === 0 && h('div', { class: 'small' }, 'None of your creatures is at least half of any race but Human. Expeditions, Adventure and breeding bring other races home.'),
    h('div', { class: 'roster', style: 'max-height:220px' }, offer.map((r) => {
      const problem = away.has(r.base) ? `${r.c.name} is away on an expedition`
        : inBout(r.c) ? `${r.c.name} is in a fight`
          : sacrificeProblem(house, r.c);
      const adds = altarRacesOf(r.c).filter((id) => !house.altarRaces.includes(id));
      return h('div', { class: 'rosterrow' },
        h('div', { class: 'grow', style: 'min-width:0' },
          h('div', { class: 'name' }, fullName(r.c)),
          h('div', { class: 'small' }, problem ?? `${raceName(r.c)}. Adds ${raceList(adds)}.`)),
        sureButton('Sacrifice', () => offerUp(note, r), 'mini', !!problem));
    })),
  );
}

async function offerUp(note, row) {
  const added = sacrifice(G.house, row.c, Date.now());
  if (!added) return;
  await saveHouse();
  await G.getRidOf(row.base, row.c, { by: 'the Bloodline Altar' });
  toast(`${row.c.name.toUpperCase()} WAS SACRIFICED. EGGS CAN HATCH AS ${raceList(added).toUpperCase()} NOW!!!`, 'rare');
  note.spec.breed.rows = await loadRows();
  note.rebuild();
}
