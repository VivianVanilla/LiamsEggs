// The "What it has" note: every mutation, job, power and charm, and what each one does to it.

import { G } from '../state.js';
import { h, fill, button, openNote } from './notes.js';
import { STAT_KEYS, STAT_LABELS, statLimits, computeStats, maxHpOf, topSwatches, fullName, lastName, lineageOf, otherLineOf } from '../core/creature.js';
import { TECHNIQUES } from '../data/powers.js';
import { buildSheet, allMutations } from '../core/sheet.js';

export function openSheet() {
  const c = G.creature;
  if (!c) return;
  let showAll = false;
  openNote('sheet', {
    title: `What ${fullName(c)} has`,
    width: 372,
    build(body, note) {
      const stats = computeStats(c);
      const limits = statLimits(c);
      fill(body,
        h('div', { class: 'small' }, `Max health ${maxHpOf(c)}. ${STAT_KEYS.map((k) => `${STAT_LABELS[k]} ${stats[k]}/${limits[k]}`).join(', ')}.`),
        h('div', { class: 'small' }, `Family: ${lastName(c)}, who have ${TECHNIQUES[lineageOf(c)].name}. The other side: ${TECHNIQUES[otherLineOf(c)].family}, who have ${TECHNIQUES[otherLineOf(c)].name}.`),
        c.parents.length === 2 && h('div', { class: 'small' }, `Child of ${c.parents.map((p) => p.name).join(' and ')}.`),
        topSwatches(c).length > 0 && h('div', { class: 'swatches', style: 'margin-top:4px', title: 'The colors it has mined the most' }, topSwatches(c).map((s) => h('div', { class: 'swatch', title: `${Math.round(s.n)} units`, style: `background:${s.hex}` }))),
        h('div', { class: 'ways', style: 'max-height:430px' }, buildSheet(c).map((section) => [
          h('div', { class: 'sect', style: 'margin-top:4px' }, section.title),
          section.note && h('div', { class: 'small' }, section.note),
          section.rows.length === 0 && h('div', { class: 'small' }, section.empty),
          section.rows.map((row) => h('div', { class: 'way' },
            h('div', { class: 'top' }, row.name, row.effect && h('span', null, row.effect)),
            h('div', { class: 'small' }, row.detail),
            row.limited && h('div', { class: 'small', style: 'font-weight:600' }, row.limited))),
        ])),
        h('div', { class: 'row gap' }, button(showAll ? 'Hide the full list' : 'Every mutation there is', () => {
          showAll = !showAll;
          note.rebuild();
        })),
        showAll && h('div', { class: 'ways', style: 'max-height:240px' }, allMutations(c).map((family) => [
          h('div', { class: 'sect', style: 'margin-top:4px' }, `${family.label}: two of these teach ${family.move}`),
          family.rows.map((row) => h('div', { class: `way ${row.owned ? '' : 'done'}` },
            h('div', { class: 'top' }, `${row.name}${row.owned ? ' (has it)' : ''}`, h('span', null, row.effect)))),
        ])),
      );
    },
  });
}
