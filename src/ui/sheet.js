// The "What it has" note: every mutation, job, power and charm, and what each one does to it.

import { G } from '../state.js';
import { h, fill, button, openNote } from './notes.js';
import { STAT_KEYS, STAT_LABELS, statLimits, computeStats, maxHpOf, topSwatches, fullName, lastName, lineageOf, otherLineOf } from '../core/creature.js';
import { TECHNIQUES } from '../data/powers.js';
import { buildSheet, allMutations } from '../core/sheet.js';
import { damageTable } from '../core/damage.js';

const pct = (v) => `${Math.round(v * 100)}%`;

// Every attack it has: from its Might alone, with everything, and on average, side by side.
function damageSection(c) {
  const d = damageTable(c);
  return [
    h('div', { class: 'sect', style: 'margin-top:6px' }, 'Damage'),
    h('div', { class: 'small' }, `Base is its Might (${d.might}) alone. With all: ${d.boosts.length ? d.boosts.join(', ') : 'nothing adds to it yet'}, and its battle plan. Average counts its ${pct(d.crit)} chance of a critical hit${d.flash ? ', and Black Flashes on its swing' : ''}. All before the target's Guard.`),
    h('div', { class: 'dmgtable' },
      h('div', { class: 'dmgrow dmghead' }, h('span', null, 'Attack'), h('span', null, 'Base'), h('span', null, 'With all'), h('span', null, 'Average'), h('span', null, 'Every')),
      d.rows.map((r) => h('div', { class: 'dmgrow' },
        h('span', null, r.count > 1 ? `${r.name} (${r.count} hits)` : r.name),
        h('span', null, String(r.base)),
        h('b', null, String(r.hit)),
        h('span', null, String(r.average)),
        h('span', null, `${r.every}s`)))),
  ];
}

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
        damageSection(c),
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
