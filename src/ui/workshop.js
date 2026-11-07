// The workshop: spend what it has mined on dyes, charms and paints, and forge weapons from the
// Legendary Mine's ore.

import { toast } from './flair.js';
import { G, saveCreature, saveHouse } from '../state.js';
import { forgeProblem, forgeWeapon, equipWeapon, unequipWeapon, armoryCount } from '../core/forge.js';
import { WEAPONS, WEAPON_IDS } from '../data/forge.js';
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

// ---------- the forge ----------

function forgeSection(body, note) {
  const c = G.creature;
  const house = G.house;
  const now = c.weapon && WEAPONS[c.weapon];
  fill(body,
    h('div', { class: 'purse' },
      h('span', null, 'Legendary ore: ', h('b', null, Math.floor(house.ore))),
      h('span', null, 'Gems: ', h('b', null, Math.floor(house.bank.gems)))),
    h('div', { class: 'small', style: 'margin-top:4px' }, 'Ore comes up out of the Legendary Mine in the village, where only legendary Miners can dig, and off Adventure bosses. A weapon goes into the armory everyone shares, and each creature carries one.'),
    h('div', { class: 'sect' }, `${c.name} carries`),
    now
      ? h('div', { class: 'itemrow', style: `--c:${now.color}` },
        h('div', { class: 'grow' }, h('div', { class: 'what' }, now.name), h('div', { class: 'small' }, `In every fight, it ${now.text}.`)),
        button('Put it back', async () => {
          unequipWeapon(house, c);
          await saveHouse();
          changed(note);
        }, 'mini'))
      : h('div', { class: 'small' }, 'Nothing yet.'),
    h('div', { class: 'sect' }, 'Weapons'),
    h('div', { class: 'ways', style: 'max-height:280px' }, WEAPON_IDS.map((id) => {
      const w = WEAPONS[id];
      const have = armoryCount(house, id);
      const problem = forgeProblem(house, id);
      return h('div', { class: 'way', style: `border-left:5px solid ${w.color}` },
        h('div', { class: 'top' },
          h('span', { class: 'plain' }, w.name, have ? ` (${have} in the armory)` : ''),
          button(`Forge: ${w.ore} ore, ${w.gems.toLocaleString()} gems`, async () => {
            if (!forgeWeapon(house, id)) return;
            await saveHouse();
            toast(`FORGED: ${w.name.toUpperCase()}!`, 'rare');
            note.rebuild();
          }, 'mini', !!problem)),
        h('div', { class: 'small' }, `It ${w.text}.`),
        have > 0 && c.weapon !== id && h('div', { class: 'row', style: 'margin-top:3px' }, button(`Give it to ${c.name}`, async () => {
          if (!equipWeapon(house, c, id)) return;
          await saveHouse();
          G.pet?.say(`a ${w.name.toLowerCase()}!`, 3, true);
          changed(note);
        }, 'mini hot')));
    })),
  );
}

const TABS = [['dye', 'Dye'], ['charms', 'Charms'], ['paint', 'Paint'], ['forge', 'Forge']];

export function openWorkshop(tab = 'dye') {
  if (!G.creature) return;
  openNote('workshop', {
    title: 'Workshop',
    cls: 'kraft',
    width: 370,
    tab,
    build(body, note) {
      const { spec } = note;
      fill(body,
        h('div', { class: 'small' }, 'Every color any of your creatures mines lands in one bank they all share. Dull colors turn into Dust.'),
        bankRow(G.creature),
        h('div', { class: 'tabs' }, TABS.map(([id, label]) => button(label, () => {
          spec.tab = id;
          note.rebuild();
        }, spec.tab === id ? 'hot' : ''))),
      );
      if (spec.tab === 'charms') charmSection(body, note);
      else if (spec.tab === 'paint') paintSection(body, note);
      else if (spec.tab === 'forge') forgeSection(body, note);
      else dyeSection(body, note);
    },
  });
}
