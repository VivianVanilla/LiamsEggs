// The workshop: spend what it has mined on dyes, charms and paints.

import { G, saveCreature } from '../state.js';
import { h, fill, button, openNote } from './notes.js';
import { topSwatches, wearable } from '../core/creature.js';
import { hexToRgb } from '../lib/util.js';
import { canAfford, applyDye, washDye, hueFamily, craftCharm, wearCharm, removeCharm, hasCharm, isWorn, craftPaint } from '../core/craft.js';
import { statText } from '../core/sheet.js';
import { PIGMENTS, BANK_KEYS, BANK_LABELS, CHARMS, CHARM_IDS, CHARM_SLOTS, PAINTS, PAINT_IDS, DYE_COST } from '../data/crafting.js';
import { dropRig, hasArt, artUrl } from '../draw/art.js';

const icon = (file) => hasArt(file) && h('img', { class: 'foodpic mini', src: artUrl(file), alt: '' });

// A cost in words, e.g. "60 Red, 20 Dust, 1 Gem".
const costText = (cost) => Object.entries(cost).map(([k, v]) => `${v} ${k === 'gems' && v === 1 ? 'Gem' : BANK_LABELS[k]}`).join(', ');

function changed(note) {
  dropRig(G.creature);
  saveCreature();
  G.onCreatureChanged?.();
  note.rebuild();
}

function bankRow(c) {
  return h('div', { class: 'chips' }, BANK_KEYS.map((k) => h('span', {
    class: 'chip',
    style: `--c:${PIGMENTS[k]?.hex ?? '#888'}`,
  }, `${BANK_LABELS[k]} ${Math.floor(c.bank[k])}`)));
}

function dyeSection(body, note) {
  const c = G.creature;
  const swatches = topSwatches(c, 6);
  fill(body,
    h('div', { class: 'sect' }, 'Dye'),
    h('div', { class: 'small' }, `Dye it any color it has mined, for ${DYE_COST} of that color from the shared bank.`),
    swatches.length === 0
      ? h('div', { class: 'small' }, 'It has not mined any colors yet.')
      : h('div', { class: 'swatches', style: 'margin-top:3px' }, swatches.map((s) => {
        const family = hueFamily(hexToRgb(s.hex));
        const wear = wearable(s.hex);
        return h('button', {
          class: 'swatch dye',
          title: `${BANK_LABELS[family]}: costs ${DYE_COST}`,
          style: `background:${wear}`,
          disabled: !family || c.bank[family] < DYE_COST,
          onclick: () => {
            if (applyDye(c, wear, family)) changed(note);
          },
        });
      })),
    c.look.dye && h('div', { class: 'row', style: 'margin-top:4px' }, button('Wash it off', () => {
      washDye(c);
      changed(note);
    })),
  );
}

function charmSection(body, note) {
  const c = G.creature;
  fill(body,
    h('div', { class: 'sect' }, `Charms (wearing ${c.gear.worn.length} of ${CHARM_SLOTS})`),
    h('div', { class: 'small' }, 'Craft each one once and keep it. It can only wear two, and they still count toward its stat limits.'),
    h('div', { class: 'ways', style: 'max-height:190px' }, CHARM_IDS.map((id) => {
      const charm = CHARMS[id];
      const owned = hasCharm(c, id);
      const worn = isWorn(c, id);
      let action;
      if (!owned) {
        action = button('Craft', () => {
          if (craftCharm(c, id)) changed(note);
        }, 'mini', !canAfford(c, charm.cost));
      } else if (worn) {
        action = button('Take off', () => {
          removeCharm(c, id);
          changed(note);
        }, 'hot mini');
      } else {
        action = button('Wear', () => {
          if (wearCharm(c, id)) changed(note);
        }, 'mini', c.gear.worn.length >= CHARM_SLOTS);
      }
      return h('div', { class: 'way' },
        h('div', { class: 'top' }, h('span', { class: 'plain' }, icon(`crafts/${id}.png`), ` ${charm.name}`), action),
        h('div', { class: 'small' }, owned ? statText(charm.stats) : `${statText(charm.stats)}. Costs ${costText(charm.cost)}.`));
    })),
  );
}

function paintSection(body, note) {
  const c = G.creature;
  fill(body,
    h('div', { class: 'sect' }, 'Paint for one fight'),
    h('div', { class: 'small' }, c.prep.paint
      ? `It is wearing ${PAINTS[c.prep.paint].name}: in its next fight, it ${PAINTS[c.prep.paint].text}.`
      : 'It wears off after its next fight, in the arena or a challenge. It can only wear one.'),
    !c.prep.paint && h('div', { class: 'ways', style: 'max-height:150px' }, PAINT_IDS.map((id) => {
      const paint = PAINTS[id];
      return h('div', { class: 'way' },
        h('div', { class: 'top' }, paint.name, button('Paint', () => {
          if (craftPaint(c, id)) changed(note);
        }, 'mini', !canAfford(c, paint.cost))),
        h('div', { class: 'small' }, `It ${paint.text}. Costs ${costText(paint.cost)}.`));
    })),
  );
}

export function openWorkshop() {
  if (!G.creature) return;
  openNote('workshop', {
    title: 'Color workshop',
    cls: 'kraft',
    width: 360,
    build(body, note) {
      fill(body,
        h('div', { class: 'small' }, 'Every color any of your creatures mines lands here, in one bank they all share. Dull colors turn into Dust.'),
        bankRow(G.creature),
      );
      dyeSection(body, note);
      charmSection(body, note);
      paintSection(body, note);
    },
  });
}
