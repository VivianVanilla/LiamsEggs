// Rolling eggs, gacha style: the Eggs tab of the Nursery. The egg on offer shows its family and
// born-with gifts before you keep it. Rolling a different one costs gems from the shared bank, and
// Hyper roll keeps rolling by itself until it lands what you asked for.

import { toast, rich } from './flair.js';
import { uid } from '../lib/util.js';
import { G, saveHouse } from '../state.js';
import { h, fill, button } from './notes.js';
import { fullName } from '../core/creature.js';
import { eggFromId, rollEgg, matchChance, hyperRoll, hatchEgg } from '../core/roll.js';
import { TECHNIQUES, TECHNIQUE_IDS, TRAITS, BORN_TRAIT_IDS } from '../data/powers.js';
import { ROLL_COST, HYPER_BUDGETS } from '../data/family.js';
import { RACES, DEFAULT_RACE } from '../data/races.js';
import { eggRaces } from '../core/family.js';
import { createCreature } from './panels.js';
import { openNursery } from './nursery.js';
import { loadRows } from './breed.js';

const gems = () => Math.floor(G.house.bank.gems);

// There is always an egg on offer, and it stays until it is kept or rolled away. It lives in the
// household file, so closing the note and opening it again can't roll a new one for free.
export function eggOnOffer() {
  if (!G.house.egg) {
    G.house.egg = { id: uid() };
    saveHouse();
  }
  return eggFromId(G.house.egg.id);
}

// The race the egg on offer hatches as: Human, unless the Bloodline Altar has another and it was picked.
const eggRace = () => (eggRaces(G.house).includes(G.house.eggRace) ? G.house.eggRace : DEFAULT_RACE);

// The egg on offer hatches as this creature, and the next one waits in its place.
export function takeEgg(name) {
  const c = hatchEgg(eggOnOffer(), name, Date.now(), eggRace());
  G.house.egg = null;
  saveHouse();
  return c;
}

const familyText = (t) => `${TECHNIQUES[t].family} (${TECHNIQUES[t].name})`;
const giftsText = (egg) => (egg.traits.length ? egg.traits.map((id) => TRAITS[id].name).join(', ') : 'nothing');

// An egg in the colors of its family, glowing if it holds a gift.
export function eggPicture(egg) {
  const gift = egg.traits[0];
  return h('div', {
    class: `egg${gift ? ' gifted' : ''}`,
    style: `--egg:${TECHNIQUES[egg.lineage].color ?? '#f2e6c9'};${gift ? `--glow:${TRAITS[gift].color}` : ''}`,
    title: familyText(egg.lineage),
  });
}

export const openRoll = () => openNursery('eggs');

export const freshEggs = () => ({ want: { traits: [], family: null }, budget: HYPER_BUDGETS[1], result: '', name: '' });

export function buildEggs(page, note) {
  const st = note.spec.eggs;
  const egg = eggOnOffer();
  const have = gems();
  const asked = st.want.traits.length > 0 || !!st.want.family;
  const chance = matchChance(st.want);
  const input = h('input', { type: 'text', maxLength: 24, placeholder: 'Name it to keep it', spellcheck: false, value: st.name });
  input.addEventListener('input', () => { st.name = input.value; });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') keep(note, input); });
  const chip = (label, on, onclick, color) => h('button', { class: `chip${on ? ' on' : ''}`, style: color ? `--c:${color}` : '', onclick }, label);
  fill(page,
    h('div', { class: 'row nowrap' },
      h('div', { class: 'small grow' }, 'The egg on offer is free to keep. Rolling a different one costs a gem from the shared bank.'),
      h('b', { class: 'gems' }, `Gems: ${have}`)),
    h('div', { class: 'eggcard' },
      eggPicture(egg),
      h('div', { class: 'grow' },
        h('div', { class: 'nameline', style: 'font-size:16px' }, familyText(egg.lineage)),
        h('div', { class: 'small' }, `The other side of its family: ${TECHNIQUES[egg.otherLine].family}.`),
        h('div', { class: 'small', style: 'font-weight:600' }, rich(`Born with: ${giftsText(egg)}.`)))),
    // With the Bloodline Altar, the egg can hatch as any race sacrificed on it.
    eggRaces(G.house).length > 1 && h('div', { class: 'row', style: 'margin-top:4px' },
      h('span', { class: 'small' }, 'Hatches as'),
      h('div', { class: 'chips' }, eggRaces(G.house).map((id) => chip(RACES[id].name, eggRace() === id, () => {
        G.house.eggRace = id === DEFAULT_RACE ? null : id;
        saveHouse();
        note.rebuild();
      }, RACES[id].color)))),
    h('div', { class: 'row gap' }, input, button('Keep it', () => keep(note, input), 'hot')),
    h('div', { class: 'row gap' }, button(`Roll again: ${ROLL_COST} gem`, () => rollOnce(note), 'big', have < ROLL_COST)),
    have < ROLL_COST && h('div', { class: 'small' }, 'No gems left. Mining, the village, expeditions and Adventure all bring them in.'),
    h('div', { class: 'sect' }, 'Hyper roll'),
    h('div', { class: 'small' }, 'Keeps rolling by itself until it gets everything you pick here.'),
    h('div', { class: 'chips', style: 'margin-top:4px' }, BORN_TRAIT_IDS.map((id) => chip(TRAITS[id].name, st.want.traits.includes(id), () => {
      st.want.traits = st.want.traits.includes(id) ? st.want.traits.filter((t) => t !== id) : [...st.want.traits, id];
      note.rebuild();
    }, TRAITS[id].color))),
    h('div', { class: 'chips', style: 'margin-top:4px' }, [null, ...TECHNIQUE_IDS].map((t) => chip(t ? TECHNIQUES[t].family : 'Any family', st.want.family === t, () => {
      st.want.family = t;
      note.rebuild();
    }, t ? TECHNIQUES[t].color : null))),
    h('div', { class: 'small', style: 'margin-top:4px' }, !asked
      ? 'Pick a gift or a family first.'
      : chance > 0 ? `About 1 roll in ${Math.round(1 / chance)} lands that.` : 'No egg can hatch with that: Six Eyes only comes with the Gojo family.'),
    h('div', { class: 'row', style: 'margin-top:4px' },
      h('span', { class: 'small' }, 'Spend up to'),
      HYPER_BUDGETS.map((b) => chip(`${b} gems`, st.budget === b, () => {
        st.budget = b;
        note.rebuild();
      }))),
    h('div', { class: 'row gap' }, button('Hyper roll', () => hyper(note), 'big hot', !asked || !chance || have < ROLL_COST)),
    st.result && h('div', { class: 'small', style: 'font-weight:600;margin-top:5px' }, rich(st.result)),
  );
}

function rollOnce(note) {
  if (gems() < ROLL_COST) return;
  G.house.bank.gems -= ROLL_COST;
  G.house.egg = { id: rollEgg().id };
  note.spec.eggs.result = '';
  saveHouse();
  note.rebuild();
}

function hyper(note) {
  const { want, budget } = note.spec.eggs;
  const rolls = Math.min(budget, Math.floor(gems() / ROLL_COST));
  if (rolls < 1 || !matchChance(want)) return;
  const res = hyperRoll(want, rolls);
  G.house.bank.gems -= res.rolls * ROLL_COST;
  G.house.egg = { id: res.egg.id };
  saveHouse();
  const spent = `${res.rolls} roll${res.rolls === 1 ? '' : 's'}, ${res.rolls * ROLL_COST} gem${res.rolls * ROLL_COST === 1 ? '' : 's'}`;
  note.spec.eggs.result = res.found ? `Got it in ${spent}. It is the egg on offer now.` : `No luck in ${spent}. The last egg it rolled is on offer.`;
  if (res.found && G.pet) G.fx.shout(G.pet.x, G.pet.y - 130, 'HYPER ROLL!', '#ffd24a', 24, 3);
  if (res.found) toast(`HYPER ROLL! ${familyText(res.egg.lineage)}${res.egg.traits.length ? `, born with ${giftsText(res.egg)}` : ''}!!!`, 'rare');
  note.rebuild();
}

async function keep(note, input) {
  const name = input.value.trim();
  if (!name) {
    input.focus();
    return;
  }
  const egg = eggOnOffer();
  const made = await createCreature(name, takeEgg(name));
  note.spec.eggs.name = '';
  const race = made.c.race !== DEFAULT_RACE ? `a ${RACES[made.c.race].name}, ` : '';
  note.spec.eggs.result = `${made.c.name} hatched: ${race}${familyText(egg.lineage)}, born with ${giftsText(egg)}. A new egg is on offer.`;
  const m = await G.bringOut(made.base, made.c);
  if (m) m.pet.say(`i am ${fullName(made.c)}`, 4, true);
  toast(`${made.c.name.toUpperCase()} HATCHED!${egg.traits.length ? ` BORN WITH ${giftsText(egg).toUpperCase()}!!!` : ''}`, egg.traits.length ? 'rare' : 'good');
  // The other tabs know about the new one straight away.
  if (note.spec.breed) note.spec.breed.rows = await loadRows();
  note.rebuild();
}
