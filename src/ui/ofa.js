// Passing One For All on. The holder gives everything: it goes to the graveyard for good, its power
// joins the stockpile, and its heir carries it on stronger.

import { toast } from './flair.js';
import { G, api, memberOf, creatureText } from '../state.js';
import { h, fill, sureButton, openNote } from './notes.js';
import { parseCreature, fullName, stageOf, pathTitle, ofaLevel } from '../core/creature.js';
import { heirProblem, passOn, stockpileAfter, ownPower } from '../core/family.js';
import { OFA_ID, OFA_MAX_LEVEL, QUIRKS, ofaLevelFor } from '../data/powers.js';
import { forgetFighter } from './boards.js';
import { dropRig, heightOf } from '../draw/art.js';

export async function openPassOn() {
  const giver = G.creature;
  if (!giver || !giver.powers.quirks.includes(OFA_ID)) return;
  const rows = [];
  for (const f of await api.listCreatures()) {
    try {
      // Whoever is out is shown as it is right now.
      const c = G.team.find((m) => m.base === f.base)?.c ?? parseCreature(f.text);
      if (!c.dead && c.id !== giver.id) rows.push({ base: f.base, c });
    } catch { /* an unreadable file just gets left out of the list */ }
  }
  openNote('ofa', {
    title: 'Pass on One For All',
    width: 340,
    build(body, note) {
      const now = ofaLevel(giver);
      const after = ofaLevelFor(stockpileAfter(giver));
      const fighting = !!G.bout && G.boutHide.has(giver.id);
      fill(body,
        h('p', { style: 'margin:0 0 6px' }, `Passing it on ends ${giver.name} for good: its file goes to the graveyard, and its own power, ${ownPower(giver)} without One For All, joins the stockpile.`),
        h('div', { class: 'small' }, after > now
          ? `Its heir gets it at level ${after} of ${OFA_MAX_LEVEL}, up from ${now}.`
          : `Its heir gets it at level ${after} of ${OFA_MAX_LEVEL}. ${after === OFA_MAX_LEVEL ? 'It can\'t get any stronger.' : 'A stronger holder would push it further.'}`),
        h('div', { class: 'small' }, `Holding it costs the heir ${QUIRKS[OFA_ID].cost}% of its max HP, the same as it cost ${giver.name}.`),
        fighting && h('div', { class: 'warning' }, 'Not in the middle of a fight.'),
        h('div', { class: 'sect' }, 'Who takes it'),
        rows.length === 0 && h('div', { class: 'small' }, 'There is nobody to give it to. Make another creature first, in Your creatures.'),
        h('div', { class: 'roster' }, rows.map((row) => {
          const problem = heirProblem(giver, row.c);
          return h('div', { class: 'rosterrow' },
            h('div', { class: 'grow', style: 'min-width:0' },
              h('div', { class: 'name' }, fullName(row.c)),
              h('div', { class: 'small' }, problem ?? `${stageOf(row.c).name}, ${pathTitle(row.c)}`)),
            sureButton('Give it', () => give(giver, row), 'mini', !!problem || fighting));
        })),
      );
      note.refs.rows = rows;
    },
  });
}

async function give(giver, heir) {
  const holder = memberOf(giver);
  if (!holder || (G.bout && G.boutHide.has(giver.id))) return;
  const result = passOn(giver, heir.c, Date.now());
  if (!result) return;
  // The heir's file first, so One For All can't be lost part way through.
  await api.saveCreature(heir.base, creatureText(heir.c));
  const spot = { x: holder.pet.x, y: holder.pet.y };
  G.lose(giver);
  forgetFighter(giver.id);
  await api.buryCreature(holder.base, creatureText(giver));
  const m = memberOf(heir.c) ?? await G.bringOut(heir.base, heir.c);
  if (!m) return;
  G.lookAfter(m.c);
  dropRig(m.c);
  G.fx.float(spot.x, spot.y - 70, `${giver.name} gave everything`, '#ffd0d0', 16, 4);
  G.fx.shout(m.pet.x, m.pet.y - heightOf(m.c) - 44, 'ONE FOR ALL', '#8ef06a', 26, 4);
  toast(`ONE FOR ALL: LEVEL ${result.level}!!! ${m.c.name.toUpperCase()} CARRIES IT ON`, 'rare');
  G.fx.float(m.pet.x, m.pet.y - heightOf(m.c) - 18, `Level ${result.level}`, '#e9ffd9', 19, 4);
  m.pet.say('i can feel all of them in here', 4, true);
  G.onCreatureChanged?.();
}
