// Being reborn: pick which of your creatures it absorbs, and which of that one's gifts it takes.
// Then it starts over as a Hatchling with nothing but its gifts. The rules are in core/reborn.js.

import { toast } from './flair.js';
import { G, saveCreature, saveHouse, inBout } from '../state.js';
import { h, fill, sureButton, openNote, closeNote } from './notes.js';
import { fullName, stageOf, pathTitle } from '../core/creature.js';
import { canBeReborn, takeable, rebornProblem, beReborn, rebornLosses } from '../core/reborn.js';
import { awayBases } from '../core/village.js';
import { TRAITS } from '../data/powers.js';
import { REBORN } from '../data/monsters.js';
import { dropRig, heightOf } from '../draw/art.js';
import { loadRows } from './breed.js';

// Why that one can't be absorbed right now, before any picks: away, fighting, or the rules.
function rowProblem(c, row) {
  if (awayBases(G.house).has(row.base)) return `${row.c.name} is away on an expedition`;
  if (inBout(row.c)) return `${row.c.name} is in a fight`;
  return rebornProblem(c, row.c, []);
}

export async function openReborn() {
  const c = G.creature;
  if (!c || !canBeReborn(c)) return;
  const rows = (await loadRows()).filter((r) => r.c.id !== c.id);
  openNote('reborn', {
    title: `${c.name} is reborn`,
    width: 360,
    pick: null,
    take: [],
    message: '',
    build(body, note) {
      const { spec } = note;
      const lost = rebornLosses(c);
      const row = rows.find((r) => r.base === spec.pick);
      fill(body,
        h('p', { style: 'margin:0 0 6px' }, `${c.name} absorbs one of your creatures, which is gone for good, and takes up to ${REBORN.takes} of its gifts. Then ${c.name} goes back to being a Hatchling.`),
        h('div', { class: 'small' }, `It keeps its name, family, race, look, farm and every gift it has. ${lost.length ? `It loses everything else: ${lost.join(', ')}.` : 'Everything else starts again from nothing.'}`),
        h('div', { class: 'small' }, 'Then it can climb back up, beat them all again, and be reborn again with more.'),
        h('div', { class: 'sect' }, 'Who it absorbs'),
        rows.length === 0 && h('div', { class: 'small' }, 'There is nobody to absorb. Hatch or breed another creature first, in the Nursery.'),
        h('div', { class: 'roster', style: 'max-height:200px' }, rows.map((r) => {
          const problem = rowProblem(c, r);
          const gifts = takeable(c, r.c);
          const on = spec.pick === r.base;
          return h('div', { class: 'rosterrow' },
            h('div', { class: 'grow', style: 'min-width:0' },
              h('div', { class: 'name' }, fullName(r.c)),
              h('div', { class: 'small' }, problem ?? (gifts.length
                ? `${stageOf(r.c).name}, ${pathTitle(r.c)}. Gifts it could take: ${gifts.map((id) => TRAITS[id].name).join(', ')}.`
                : `${stageOf(r.c).name}, ${pathTitle(r.c)}. No gifts ${c.name} doesn't have already.`))),
            h('button', {
              class: `mini${on ? ' hot' : ''}`,
              disabled: !!problem,
              onclick: () => {
                spec.pick = on ? null : r.base;
                spec.take = [];
                spec.message = '';
                note.rebuild();
              },
            }, on ? 'Picked' : 'Pick'));
        })),
      );
      if (!row) return;
      const gifts = takeable(c, row.c);
      fill(body,
        h('div', { class: 'sect' }, `What it takes: ${spec.take.length} of ${REBORN.takes}`),
        gifts.length === 0
          ? h('div', { class: 'small' }, `${row.c.name} has no gift ${c.name} doesn't already have. It can still be absorbed, but ${c.name} comes back with nothing new.`)
          : h('div', { class: 'chips' }, gifts.map((id) => {
            const on = spec.take.includes(id);
            return h('button', {
              class: `chip${on ? ' on' : ''}`,
              style: `--c:${TRAITS[id].color}`,
              title: TRAITS[id].blurb,
              disabled: !on && spec.take.length >= REBORN.takes,
              onclick: () => {
                spec.take = on ? spec.take.filter((t) => t !== id) : [...spec.take, id];
                note.rebuild();
              },
            }, TRAITS[id].name);
          })),
        spec.take.map((id) => h('div', { class: 'small', style: 'margin-top:2px' }, h('b', { style: `color:${TRAITS[id].color}` }, `${TRAITS[id].name}: `), TRAITS[id].blurb)),
        spec.message && h('div', { class: 'warning' }, spec.message),
        h('div', { class: 'row gap' }, sureButton(`Absorb ${row.c.name} and be reborn`, () => rebirth(c, row, spec.take, note), 'big hot', !!G.bout || !!rowProblem(c, row))),
        G.bout && h('div', { class: 'small' }, 'Not while a fight is on.'),
      );
    },
  });
}

async function rebirth(c, row, take, note) {
  if (G.bout || G.creature !== c) return;
  const res = beReborn(c, row.c, take, G.house, Date.now());
  if (res.problem) {
    note.spec.message = res.problem;
    note.rebuild();
    return;
  }
  // The reborn one is saved first, so what it took can't be lost part way through.
  dropRig(c);
  await saveHouse();
  await saveCreature(c);
  await G.getRidOf(row.base, row.c, { by: 'absorbed', to: c.name });
  const m = G.lookAfter(c);
  closeNote('reborn');
  const took = res.took.map((id) => TRAITS[id].name);
  if (m) {
    G.fx.shout(m.pet.x, m.pet.y - heightOf(c) - 44, 'REBORN', '#ffe14a', 28, 4);
    if (took.length) G.fx.float(m.pet.x, m.pet.y - heightOf(c) - 18, took.join(' + '), '#fff2c0', 18, 4);
    m.pet.say('i remember everything. i can do it all again', 5, true);
  }
  toast(`${c.name.toUpperCase()} ABSORBED ${row.c.name.toUpperCase()} AND WAS REBORN!!!${took.length ? ` IT TOOK ${took.join(' AND ').toUpperCase()}!` : ''}`, 'rare');
  G.onCreatureChanged?.();
}
