// The Negative Dimension: one note, with its own tabs. Its creatures, its eggs, attuning each one to
// its powers (class and spells, Nen, Alchemy), its own Adventure, and crossing over to the light
// world. It opens after a universe reset. The rules are in core/negative.js and core/negadventure.js.

import { toast } from './flair.js';
import { G, api, saveNeg, saveHouse } from '../state.js';
import { h, fill, button, sureButton, openNote, getNote } from './notes.js';
import { describeMove } from '../core/sheet.js';
import { afterReset, abyssBeaten } from '../core/universe.js';
import {
  negScores, negPower, negMaxHp, negMoveList, negShell, chooseClass, unlockedSpells, toggleSpell, affinity, auraOf, nenPassive, setAlloc,
  hatsuProblem, setHatsu, toggleVow, vowMul, hatsuStrength, hatsuDef, freshCircle, circleDef, circleWorth, circleProblem, setCircle, eraseCircle,
  negEggOnOffer, keepCost, keepProblem, keepNegEgg, rollNegEggFor, releaseNeg, crossProblem, crossOver, hatsuGiftOf,
  emptyNegWant, negWantsAnything, negMatchChance, autoRollNeg, craftProblem, craftAscension,
} from '../core/negative.js';
import { startNegLevel, negLevelWon, negLevelInfo, negBossOf, negBossMonster, negLevelEnemies, negToughness, negPartyProblem, negLevelProblem, negReward, settleNegLevel } from '../core/negadventure.js';
import { eliteInfo, eliteBossOf, eliteBossMonster, eliteEnemies, eliteToughness, eliteProblem, startElite, eliteReward, settleElite } from '../core/negadventure.js';
import { itemCount } from '../core/items.js';
import { finishBout } from '../sim/arena.js';
import { RACES, NEGATIVE_RACE_IDS } from '../data/races.js';
import { TRAITS, NEG_TRAIT_IDS, POWER_KIND_NAMES } from '../data/powers.js';
import { ASCENSION_RECIPES, AWAKENINGS } from '../data/ascension.js';
import { ITEMS } from '../data/items.js';
import { STANCES, STANCE_IDS } from '../data/battle.js';
import {
  ABILITY_KEYS, ABILITY_LABELS, ABILITY_SHORT, ABILITY_TEXT, NEG_MAX_LEVEL, negXpToNext, NEG_ROSTER_MAX, NEG_PARTY, NEG_EGG, NEG_LEVEL_COUNT, enemyLevel,
  CLASSES, CLASS_IDS, SPELL_LEVELS, spellSlots, NEN_TYPES, NEN_HEXAGON, NEN_POINTS, NEN_TECHNIQUES, NEN_TECHNIQUE_IDS, KO, HATSU_FORMS, MAX_VOWS, VOWS, VOW_IDS,
  MAX_CIRCLES, ALCHEMY_SHAPES, ALCHEMY_ELEMENTS, ALCHEMY_COSTS, ELITE_COUNT, ELITE,
} from '../data/negative.js';
import { ABILITIES } from '../data/paths.js';
import { drawPortrait } from '../draw/art.js';
import { createCreature } from './panels.js';
import { loadVillage } from './village.js';

const TABS = [['roster', 'Creatures'], ['eggs', 'Eggs'], ['attune', 'Attune'], ['adventure', 'Adventure'], ['cross', 'Cross over'], ['ascension', 'Ascension']];
// How many Void Shards an auto roll can spend at most, as rolls.
const AUTO_BUDGETS = [10, 50, 200, 1000];
// The Elite Negative, and Ascension, open once Chapter ??? is beaten in the light world.
const eliteOpen = () => abyssBeaten(G.house);
const pct = (v) => `${Math.round(v * 100)}%`;
const big = (n) => Math.floor(n).toLocaleString('en-US');
const W = () => G.neg;

export function openNegative(tab = null) {
  // 'elite' opens the Adventure tab on the Elite Negative.
  const toElite = tab === 'elite' && eliteOpen();
  if (tab === 'elite') tab = 'adventure';
  if (!afterReset(G.house)) {
    toast('THE NEGATIVE DIMENSION ONLY OPENS AFTER A UNIVERSE RESET.', 'info');
    return;
  }
  const old = getNote('negative')?.spec;
  openNote('negative', {
    title: 'The Negative Dimension',
    cls: 'void',
    width: 420,
    focus: true,
    tab: tab ?? old?.tab ?? (W().creatures.length ? 'roster' : 'eggs'),
    pick: old?.pick ?? W().creatures[0]?.id ?? null,
    attune: old?.attune ?? 'class',
    circle: old?.circle ?? null,
    picked: old?.picked ?? Math.min(NEG_LEVEL_COUNT, W().adventure.best + 1),
    elite: toElite || (old?.elite ?? false),
    pickedElite: old?.pickedElite ?? Math.min(ELITE_COUNT, (W().elite?.best ?? 0) + 1),
    eggName: old?.eggName ?? '',
    want: old?.want ?? emptyNegWant(),
    budget: old?.budget ?? AUTO_BUDGETS[1],
    rolled: old?.rolled ?? '',
    keepHatsu: old?.keepHatsu ?? {},
    message: '',
    build(body, note) {
      note.refs.portraits = [];
      const { spec } = note;
      fill(body,
        h('div', { class: 'purse' },
          h('span', null, h('b', null, big(W().shards)), ' Void Shards'),
          h('span', null, h('b', null, W().creatures.length), ` of ${NEG_ROSTER_MAX} creatures`),
          h('span', null, 'Best: ', h('b', null, W().adventure.best ? `level ${W().adventure.best}` : 'none yet')),
          eliteOpen() && h('span', null, h('b', null, big(W().stones ?? 0)), ' Ascension Stones')),
        h('div', { class: 'tabs' }, TABS.filter(([id]) => id !== 'ascension' || eliteOpen()).map(([id, label]) => button(label, () => {
          spec.tab = id;
          spec.message = '';
          note.rebuild();
        }, spec.tab === id ? 'hot' : ''))));
      const page = h('div', { class: 'scrollnote', style: 'margin-top:6px' });
      fill(body, page);
      if (spec.message) fill(page, h('div', { class: 'warning' }, spec.message));
      ({ roster, eggs, attune, adventure, cross, ascension }[spec.tab] ?? roster)(page, note);
    },
    tick(note) {
      note.refs.portraits?.forEach(({ canvas, nc }) => drawPortrait(canvas, negShell(nc)));
    },
  });
}

const picked = (note) => W().creatures.find((c) => c.id === note.spec.pick) ?? null;
const portrait = (note, nc, style = 'width:44px;height:52px') => {
  const canvas = h('canvas', { style });
  note.refs.portraits.push({ canvas, nc });
  return canvas;
};
const done = (note) => {
  saveNeg();
  note.rebuild();
};
const classWord = (nc) => (nc.klass ? `level ${nc.level} ${CLASSES[nc.klass].name}` : `level ${nc.level}, no class yet`);

// ---------- its creatures ----------

function roster(page, note) {
  const list = W().creatures;
  fill(page,
    h('div', { class: 'small' }, 'Nothing here is like the light world. No mutations, no jobs, no Stands. Each creature has six ability scores in the hundreds, levels up by fighting, and three powers of its own to attune: a class and its spells, Nen, and Alchemy. Win the last level of the Negative\'s Adventure, and it can cross over to the light world.'),
    list.length === 0 && h('div', { class: 'callout' }, h('div', null, 'Nobody lives here yet. '), button('Hatch an egg of the Negative', () => {
      note.spec.tab = 'eggs';
      note.rebuild();
    }, 'hot')),
    h('div', { class: 'roster', style: 'max-height:none' }, list.map((nc) => {
      const on = note.spec.pick === nc.id;
      return h('div', { class: `rosterrow${on ? ' picked' : ''}` },
        portrait(note, nc),
        h('div', { class: 'grow', style: 'min-width:0' },
          h('div', { class: 'name' }, nc.name),
          h('div', { class: 'small' }, `${RACES[nc.race].name}, ${classWord(nc)}, ${NEN_TYPES[nc.nenType].name}. Power ${big(negPower(nc))}, ${big(negMaxHp(nc))} HP.`),
          nc.traits.length > 0 && h('div', { class: 'chips' }, nc.traits.map((id) => h('span', { class: 'pchip', style: `--c:${TRAITS[id].color}`, title: TRAITS[id].blurb }, TRAITS[id].name))),
          h('div', { class: 'small' }, nc.best >= NEG_LEVEL_COUNT ? 'Won the last level: it can cross over.' : `Best level ${nc.best || 'none'}. Wins ${nc.wins}, losses ${nc.losses}.`)),
        h('div', { style: 'display:grid;gap:3px' },
          button('Attune', () => {
            note.spec.pick = nc.id;
            note.spec.tab = 'attune';
            note.spec.circle = null;
            note.rebuild();
          }, 'mini hot'),
          sureButton('Let go', () => {
            releaseNeg(W(), nc.id);
            if (note.spec.pick === nc.id) note.spec.pick = W().creatures[0]?.id ?? null;
            done(note);
          }, 'mini')));
    })),
  );
}

// ---------- eggs ----------

function eggs(page, note) {
  const world = W();
  const egg = negEggOnOffer(world);
  saveNeg();
  const race = RACES[egg.race];
  const cost = keepCost(world);
  const problem = keepProblem(world);
  const input = h('input', { type: 'text', maxLength: 24, placeholder: 'Name it to keep it', spellcheck: false, value: note.spec.eggName });
  input.addEventListener('input', () => { note.spec.eggName = input.value; });
  const keep = () => {
    const name = input.value.trim();
    if (!name) {
      input.focus();
      return;
    }
    const nc = keepNegEgg(world, name);
    if (!nc) {
      note.spec.message = keepProblem(world) ?? 'It would not hatch';
      note.rebuild();
      return;
    }
    note.spec.eggName = '';
    note.spec.pick = nc.id;
    note.spec.tab = 'attune';
    note.spec.attune = 'class';
    toast(`${nc.name.toUpperCase()} HATCHED IN THE NEGATIVE: A ${race.name.toUpperCase()}!${nc.traits.length ? ` BORN WITH ${nc.traits.map((id) => TRAITS[id].name.toUpperCase()).join(' AND ')}!!!` : ''}`, nc.traits.length ? 'rare' : 'good');
    done(note);
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') keep(); });
  fill(page,
    h('div', { class: 'ncard' },
      h('div', { class: 'ncard-head' }, h('span', { class: 'ncard-title' }, 'The egg on offer'), h('span', { class: 'ncard-tag' }, cost ? `${cost} Void Shards to keep` : `free to keep (${NEG_EGG.free - world.kept} left)`)),
      h('div', { class: 'eggshow' },
        h('div', { class: 'egg gifted', style: `--egg:${race.color};--glow:${egg.traits[0] ? TRAITS[egg.traits[0]].color : race.color}` }),
        h('div', { class: 'eggfacts' },
          h('div', { class: 'nameline', style: 'font-size:16px' }, race.name),
          h('div', { class: 'small' }, race.blurb),
          h('div', { class: 'small' }, h('b', null, 'Water divination: '), `${NEN_TYPES[egg.nenType].water} A born ${NEN_TYPES[egg.nenType].name} user.`),
          h('div', { class: 'small' }, h('b', null, 'Starts with: '), ABILITY_KEYS.map((k) => `${ABILITY_SHORT[k]} ${race.neg[k]}`).join(', ')),
          egg.traits.length
            ? h('div', { class: 'chips' }, egg.traits.map((id) => h('span', { class: 'pchip', style: `--c:${TRAITS[id].color}`, title: TRAITS[id].blurb }, TRAITS[id].name)))
            : h('div', { class: 'small' }, 'Born with no gift of the Negative.'))),
      egg.traits.map((id) => h('div', { class: 'small', style: 'margin-top:2px' }, h('b', { style: `color:${TRAITS[id].color}` }, `${TRAITS[id].name}: `), TRAITS[id].blurb)),
      h('div', { class: 'small' }, h('b', null, 'In a fight: '), race.passive.text),
      h('div', { class: 'small' }, h('b', null, race.moves?.length > 1 ? 'Its moves: ' : 'Its move: '), (race.moves ?? [race.move]).map((id) => `${ABILITIES[id].name}: ${describeMove(ABILITIES[id])}`).join(' ')),
      h('div', { class: 'hatchbar' }, input, button('Keep it', keep, 'big hot', !!problem)),
      problem && h('div', { class: 'small warning' }, problem),
      h('div', { class: 'row gap', style: 'margin-top:5px' },
        button(`Roll a different one: ${NEG_EGG.roll} Void Shards`, () => {
          note.spec.rolled = '';
          if (rollNegEggFor(world)) done(note);
        }, 'big', world.shards < NEG_EGG.roll),
        h('span', { class: 'small grow' }, 'Void Shards come from the Negative\'s Adventure.'))),
    autoRollCard(note),
    note.spec.rolled && h('div', { class: 'callout small', style: 'font-weight:600' }, note.spec.rolled),
    h('div', { class: 'sect' }, `The ${NEGATIVE_RACE_IDS.length} races of the Negative`),
    NEGATIVE_RACE_IDS.map((id) => h('div', { class: 'small', style: 'margin-top:3px' }, h('b', { style: `color:${RACES[id].color}` }, `${RACES[id].name}: `), RACES[id].passive.text)),
  );
}

// Auto roll: pick the races, gifts and Nen types you want, and it keeps rolling until it lands one.
function autoRollCard(note) {
  const { spec } = note;
  const world = W();
  const want = spec.want;
  const asked = negWantsAnything(want);
  const chance = negMatchChance(want);
  const toggle = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const chip = (label, on, onclick, color, title = '') => h('button', { class: `chip${on ? ' on' : ''}`, style: color ? `--c:${color}` : '', title, onclick }, label);
  const rolls = Math.min(spec.budget, Math.floor(world.shards / NEG_EGG.roll));
  return h('div', { class: 'ncard' },
    h('div', { class: 'ncard-head' },
      h('span', { class: 'ncard-title' }, 'Auto roll'),
      h('span', { class: 'ncard-tag' }, !asked ? 'pick something' : chance > 0 ? `about 1 in ${big(Math.max(1, Math.round(1 / chance)))}` : 'impossible')),
    h('div', { class: 'small' }, `Keeps rolling by itself, ${NEG_EGG.roll} Void Shards a roll, until it lands an egg with everything you pick. Pick several races or Nen types and any of them will do; every gift you pick has to be there.`),
    h('div', { class: 'sublabel' }, 'Race'),
    h('div', { class: 'chips' }, NEGATIVE_RACE_IDS.map((id) => chip(RACES[id].name, want.races.includes(id), () => {
      want.races = toggle(want.races, id);
      note.rebuild();
    }, RACES[id].color, RACES[id].passive.text))),
    h('div', { class: 'sublabel' }, 'Born with'),
    h('div', { class: 'chips' }, NEG_TRAIT_IDS.map((id) => chip(TRAITS[id].name, want.traits.includes(id), () => {
      want.traits = toggle(want.traits, id);
      note.rebuild();
    }, TRAITS[id].color, TRAITS[id].blurb))),
    h('div', { class: 'sublabel' }, 'Nen type'),
    h('div', { class: 'chips' }, NEN_HEXAGON.map((t) => chip(NEN_TYPES[t].name, want.nen.includes(t), () => {
      want.nen = toggle(want.nen, t);
      note.rebuild();
    }, NEN_TYPES[t].color, NEN_TYPES[t].text))),
    asked && h('div', { class: 'row', style: 'margin-top:4px' }, button('Clear', () => {
      spec.want = emptyNegWant();
      note.rebuild();
    }, 'mini')),
    h('div', { class: 'row', style: 'margin-top:4px' },
      h('span', { class: 'small' }, 'Spend up to'),
      AUTO_BUDGETS.map((b) => chip(`${big(b * NEG_EGG.roll)} shards`, spec.budget === b, () => {
        spec.budget = b;
        note.rebuild();
      }))),
    h('div', { class: 'row gap' },
      button('Auto roll', () => {
        if (!asked || !chance || rolls < 1) return;
        const res = autoRollNeg(world, want, spec.budget);
        const spent = `${res.rolls} roll${res.rolls === 1 ? '' : 's'}, ${big(res.rolls * NEG_EGG.roll)} Void Shards`;
        spec.rolled = res.found ? `Got it in ${spent}. It is the egg on offer now.` : `No luck in ${spent}. The last egg it rolled is on offer.`;
        if (res.found) toast(`AUTO ROLL! A ${RACES[res.egg.race].name.toUpperCase()}${res.egg.traits.length ? ` BORN WITH ${res.egg.traits.map((id) => TRAITS[id].name.toUpperCase()).join(' AND ')}` : ''}, ${NEN_TYPES[res.egg.nenType].name.toUpperCase()}!!!`, 'rare');
        done(note);
      }, 'big hot', !asked || !chance || rolls < 1),
      h('span', { class: 'small grow' }, rolls < 1 ? `It takes at least ${NEG_EGG.roll} Void Shards.` : `Up to ${big(rolls)} roll${rolls === 1 ? '' : 's'} with what you have.`)),
  );
}

// ---------- attuning one ----------

const ATTUNE = [['class', 'Class'], ['nen', 'Nen'], ['alchemy', 'Alchemy'], ['moves', 'Scores & moves']];

function attune(page, note) {
  const nc = picked(note);
  if (!nc) {
    fill(page, h('div', { class: 'small' }, 'Pick a creature in the Creatures tab first, or hatch one.'));
    return;
  }
  const xpNext = negXpToNext(nc.level);
  fill(page,
    h('div', { class: 'row nowrap' },
      portrait(note, nc, 'width:64px;height:76px'),
      h('div', { class: 'grow' },
        h('div', { class: 'nameline', style: 'font-size:17px' }, nc.name),
        h('div', { class: 'small' }, `${RACES[nc.race].name}, ${classWord(nc)}. ${big(negMaxHp(nc))} HP.`),
        h('div', { class: 'meter' }, h('span', null, nc.level >= NEG_MAX_LEVEL ? 'Max level' : `XP to ${nc.level + 1}`), h('div', { class: 'bar' }, h('i', { style: `width:${nc.level >= NEG_MAX_LEVEL ? 100 : Math.min(100, (nc.xp / xpNext) * 100)}%;background:#8a5ad0` }))),
        h('select', {
          onchange: (e) => {
            note.spec.pick = e.target.value;
            note.spec.circle = null;
            note.rebuild();
          },
        }, W().creatures.map((c) => h('option', { value: c.id, selected: c.id === nc.id }, `${c.name} (${classWord(c)})`))))),
    h('div', { class: 'tabs subtabs' }, ATTUNE.map(([id, label]) => button(label, () => {
      note.spec.attune = id;
      note.rebuild();
    }, note.spec.attune === id ? 'hot' : ''))),
  );
  ({ class: attuneClass, nen: attuneNen, alchemy: attuneAlchemy, moves: attuneMoves }[note.spec.attune] ?? attuneClass)(page, note, nc);
}

function attuneClass(page, note, nc) {
  if (!nc.klass) {
    fill(page,
      h('div', { class: 'small' }, 'Its class decides how its scores grow every level, its health, a feature that works in every fight, and the spells it can prepare. It is for good: pick carefully.'),
      CLASS_IDS.map((id) => {
        const k = CLASSES[id];
        return h('div', { class: 'ncard', style: `border-left:5px solid ${k.color}` },
          h('div', { class: 'ncard-head' }, h('span', { class: 'ncard-title' }, k.name), h('span', { class: 'ncard-tag' }, `health x${k.hitDie}, casts with ${ABILITY_LABELS[k.cast]}`)),
          h('div', { class: 'small' }, k.blurb),
          h('div', { class: 'small' }, h('b', null, 'Each level: '), ABILITY_KEYS.map((s) => `+${k.grow[s]} ${ABILITY_SHORT[s]}`).join(', ')),
          h('div', { class: 'small' }, h('b', null, 'Feature: '), k.feature.text),
          h('div', { class: 'small' }, h('b', null, 'Spells: '), k.spells.map((s, i) => `${ABILITIES[s].name} (level ${SPELL_LEVELS[i]})`).join(', ')),
          h('div', { class: 'row gap' }, sureButton(`Become a ${k.name}`, () => {
            if (!chooseClass(nc, id)) return;
            toast(`${nc.name.toUpperCase()} IS A ${k.name.toUpperCase()}!`, 'good');
            done(note);
          }, 'hot')));
      }),
    );
    return;
  }
  const k = CLASSES[nc.klass];
  const can = unlockedSpells(nc);
  const slots = spellSlots(nc.level);
  fill(page,
    h('div', { class: 'ncard', style: `border-left:5px solid ${k.color}` },
      h('div', { class: 'ncard-head' }, h('span', { class: 'ncard-title' }, k.name), h('span', { class: 'ncard-tag' }, `health x${k.hitDie}`)),
      h('div', { class: 'small' }, k.blurb),
      h('div', { class: 'small' }, h('b', null, 'Feature: '), k.feature.text),
      h('div', { class: 'small' }, `Its spells grow with its ${ABILITY_LABELS[k.cast]}.`)),
    h('div', { class: 'sect' }, `Prepared spells: ${nc.spells.length} of ${slots}`),
    h('div', { class: 'small' }, `It can prepare ${slots} at its level, one more at every 20th. A new one takes the place of the oldest.`),
    k.spells.map((id, i) => {
      const open = can.includes(id);
      const on = nc.spells.includes(id);
      return h('div', { class: 'way', style: 'margin-top:4px' },
        h('div', { class: 'top' },
          h('span', { class: 'plain' }, h('b', null, ABILITIES[id].name), open ? '' : ` (level ${SPELL_LEVELS[i]})`),
          button(on ? 'Prepared' : 'Prepare', () => {
            if (toggleSpell(nc, id)) done(note);
          }, on ? 'mini hot' : 'mini', !open)),
        h('div', { class: 'small' }, describeMove(open ? negMoveList(nc).find((m) => m.id === id)?.def ?? ABILITIES[id] : ABILITIES[id])));
    }),
  );
}

// A slider that saves when you let go, and keeps the mouse while it is held.
function slider(min, max, step, value, onInput, onChange) {
  return h('input', {
    type: 'range',
    class: 'slider',
    min,
    max,
    step,
    value,
    onpointerdown: () => api.captureAll(true),
    onpointerup: () => api.captureAll(false),
    oninput: (e) => onInput(Number(e.target.value)),
    onchange: (e) => onChange(Number(e.target.value)),
  });
}

function attuneNen(page, note, nc) {
  const scores = negScores(nc);
  const aura = auraOf(nc, scores);
  const passive = nenPassive(nc, scores);
  const effect = (id) => {
    const t = NEN_TECHNIQUES[id];
    const v = passive[t.key] ?? 0;
    if (t.key === 'regen') return `heals ${(v * 100).toFixed(2)}% a second`;
    if (t.key === 'taken') return `takes ${pct(v)} less damage`;
    if (t.key === 'damage') return `${pct(v)} harder hits`;
    if (t.key === 'crit') return `+${pct(v)} critical hits`;
    return `+${pct(v)} dodging, ${Math.round(passive.reach ?? 0)} more reach`;
  };
  const h0 = nc.nen.hatsu;
  const def = hatsuDef(nc, scores);
  fill(page,
    h('div', { class: 'ncard' },
      h('div', { class: 'ncard-head' }, h('span', { class: 'ncard-title' }, 'Water divination'), h('span', { class: 'ncard-tag', style: `color:${NEN_TYPES[nc.nenType].color}` }, NEN_TYPES[nc.nenType].name)),
      h('div', { class: 'small' }, `${NEN_TYPES[nc.nenType].water} ${NEN_TYPES[nc.nenType].text}`),
      h('div', { class: 'small' }, h('b', null, 'How well it uses each type: '), NEN_HEXAGON.map((t) => `${NEN_TYPES[t].name} ${pct(affinity(nc.nenType, t))}`).join(', ')),
      h('div', { class: 'small' }, `Its aura is ${aura.toFixed(2)} strong, from its level and Charisma. Everything below is multiplied by it.`)),
    h('div', { class: 'sect' }, `Aura: ${NEN_POINTS} points over five techniques`),
    NEN_TECHNIQUE_IDS.map((id) => {
      const t = NEN_TECHNIQUES[id];
      const value = Math.round(nc.nen.alloc[id]);
      const label = h('span', { class: 'small' }, `${value}`);
      return h('div', { style: 'margin-top:3px' },
        h('div', { class: 'row nowrap' }, h('b', { class: 'grow' }, `${t.name}: `, h('span', { class: 'small' }, effect(id))), label),
        slider(0, NEN_POINTS, 1, value, (v) => { label.textContent = `${v}`; }, (v) => {
          setAlloc(nc, id, v);
          done(note);
        }),
        h('div', { class: 'small' }, t.text));
    }),
    h('label', { class: 'toggle' },
      h('input', {
        type: 'checkbox',
        checked: nc.nen.ko,
        onchange: (e) => {
          nc.nen.ko = e.target.checked;
          done(note);
        },
      }),
      `Ko: every ${KO.every}th swing puts all its aura in one fist, for ${(KO.power + nc.nen.alloc.ren / 40).toFixed(1)} times the damage (more with Ren), then it takes double damage for ${KO.open} seconds.`),
    h('div', { class: 'sect' }, 'Hatsu: its own ability'),
    h('div', { class: 'small' }, 'Pick the type it is made of and what it does. Its strength is its affinity with that type, times its vows, times its aura.'),
    h('div', { class: 'chips' }, NEN_HEXAGON.map((t) => {
      const a = affinity(nc.nenType, t);
      return h('button', {
        class: `chip${h0?.type === t ? ' on' : ''}`,
        style: `--c:${NEN_TYPES[t].color}`,
        disabled: a <= 0,
        title: NEN_TYPES[t].text,
        onclick: () => {
          const form = Object.keys(HATSU_FORMS[t])[0];
          if (setHatsu(nc, t, form, h0?.name ?? '')) done(note);
        },
      }, `${NEN_TYPES[t].name} ${pct(a)}`);
    })),
    h0 && h('div', { class: 'chips' }, Object.entries(HATSU_FORMS[h0.type]).map(([form, f]) => h('button', {
      class: `chip${h0.form === form ? ' on' : ''}`,
      title: f.text,
      onclick: () => {
        if (!hatsuProblem(nc, h0.type, form) && setHatsu(nc, h0.type, form, h0.name)) done(note);
      },
    }, f.name))),
    h0 && (() => {
      const input = h('input', { type: 'text', maxLength: 24, placeholder: `Name it (${HATSU_FORMS[h0.type][h0.form].name})`, spellcheck: false, value: h0.name });
      const name = () => {
        setHatsu(nc, h0.type, h0.form, input.value);
        done(note);
      };
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') name(); });
      return h('div', { class: 'hatchbar' }, input, button('Name it', name, 'mini'));
    })(),
    h('div', { class: 'sect' }, `Vows and limitations: ${nc.nen.vows.length} of ${MAX_VOWS}, x${vowMul(nc.nen.vows).toFixed(2)}`),
    VOW_IDS.map((id) => {
      const on = nc.nen.vows.includes(id);
      return h('label', { class: 'toggle' },
        h('input', {
          type: 'checkbox',
          checked: on,
          disabled: !on && nc.nen.vows.length >= MAX_VOWS,
          onchange: () => {
            if (toggleVow(nc, id)) done(note);
          },
        }),
        h('span', null, h('b', null, `${VOWS[id].name}, x${VOWS[id].mul}: `), VOWS[id].text));
    }),
    def && h('div', { class: 'callout' },
      h('div', null, h('b', { style: `color:${def.color}` }, `${def.name}`), `, ${hatsuStrength(nc, scores).toFixed(2)} times as strong as its base.`),
      h('div', { class: 'small' }, describeMove(def))),
  );
}

function attuneAlchemy(page, note, nc) {
  const scores = negScores(nc);
  fill(page,
    h('div', { class: 'small' }, `Equivalent exchange: nothing for nothing. Draw up to ${MAX_CIRCLES} transmutation circles, each one a move of its own. Pick its shape and element, then choose what it pays every time: health, time before it comes back, and a toll on its own strength for the rest of the fight. The more it pays, the stronger it is. Intelligence makes every circle stronger.`),
    nc.alchemy.map((circle, i) => {
      const def = circleDef(circle, scores);
      return h('div', { class: 'way', style: 'margin-top:4px' },
        h('div', { class: 'top' },
          h('span', { class: 'plain' }, h('b', null, def.name), ` (worth x${circleWorth(circle).toFixed(2)})`),
          h('span', null,
            button('Redraw', () => {
              note.spec.circle = { i, ...circle };
              note.rebuild();
            }, 'mini'),
            sureButton('Erase', () => {
              eraseCircle(nc, i);
              note.spec.circle = null;
              done(note);
            }, 'mini'))),
        h('div', { class: 'small' }, describeMove(def)));
    }),
    !note.spec.circle && nc.alchemy.length < MAX_CIRCLES && h('div', { class: 'row gap' }, button('Draw a new circle', () => {
      note.spec.circle = { i: -1, ...freshCircle() };
      note.rebuild();
    }, 'big hot')),
    note.spec.circle && circleEditor(note, nc, scores),
  );
}

function circleEditor(note, nc, scores) {
  const draft = note.spec.circle;
  const def = circleDef(draft, scores);
  const problem = circleProblem(draft);
  const preview = h('div', { class: 'small' }, def ? describeMove(def) : '');
  const worth = h('span', { class: 'ncard-tag' }, `worth x${circleWorth(draft).toFixed(2)}`);
  const refresh = () => {
    const d = circleDef(draft, scores);
    preview.textContent = d ? describeMove(d) : '';
    worth.textContent = `worth x${circleWorth(draft).toFixed(2)}`;
  };
  const cost = (key) => {
    const c = ALCHEMY_COSTS[key];
    const shown = (v) => (key === 'cd' ? `${v} ${c.text}` : `${pct(v)} ${c.text}`);
    const label = h('span', { class: 'small' }, shown(draft[key]));
    return h('div', { style: 'margin-top:3px' },
      h('div', { class: 'row nowrap' }, h('b', { class: 'grow' }, `${c.name}`), label),
      slider(c.min, c.max, c.step, draft[key], (v) => {
        draft[key] = v;
        label.textContent = shown(v);
        refresh();
      }, (v) => {
        draft[key] = v;
        refresh();
      }));
  };
  const input = h('input', { type: 'text', maxLength: 24, placeholder: 'Name the circle', spellcheck: false, value: draft.name });
  input.addEventListener('input', () => {
    draft.name = input.value;
    refresh();
  });
  return h('div', { class: 'ncard' },
    h('div', { class: 'ncard-head' }, h('span', { class: 'ncard-title' }, draft.i >= 0 ? 'Redraw the circle' : 'A new circle'), worth),
    h('div', { class: 'sublabel' }, 'Shape'),
    h('div', { class: 'chips' }, Object.entries(ALCHEMY_SHAPES).map(([id, s]) => h('button', {
      class: `chip${draft.shape === id ? ' on' : ''}`,
      title: s.text,
      onclick: () => {
        draft.shape = id;
        note.rebuild();
      },
    }, s.name))),
    h('div', { class: 'small' }, ALCHEMY_SHAPES[draft.shape]?.text),
    h('div', { class: 'sublabel' }, 'Element'),
    h('div', { class: 'chips' }, Object.entries(ALCHEMY_ELEMENTS).map(([id, el]) => h('button', {
      class: `chip${draft.element === id ? ' on' : ''}`,
      title: `It ${el.text}.`,
      onclick: () => {
        draft.element = id;
        note.rebuild();
      },
    }, el.name))),
    h('div', { class: 'small' }, `It ${ALCHEMY_ELEMENTS[draft.element]?.text}.`),
    h('div', { class: 'sublabel' }, 'What it pays'),
    cost('hp'), cost('cd'), cost('toll'),
    h('div', { class: 'callout' }, preview),
    h('div', { class: 'hatchbar' }, input),
    problem && h('div', { class: 'warning' }, problem),
    h('div', { class: 'row gap' },
      button('Draw it', () => {
        if (!setCircle(nc, draft.i, draft)) return;
        toast(`${nc.name.toUpperCase()} DREW A CIRCLE: ${circleDef(draft, scores).name.toUpperCase()}!`, 'good');
        note.spec.circle = null;
        done(note);
      }, 'big hot', !!problem),
      button('Never mind', () => {
        note.spec.circle = null;
        note.rebuild();
      }, 'big')));
}

function attuneMoves(page, note, nc) {
  const scores = negScores(nc);
  fill(page,
    h('div', { class: 'sect' }, 'Ability scores'),
    ABILITY_KEYS.map((k) => h('div', { class: 'stat', title: ABILITY_TEXT[k] },
      h('span', null, ABILITY_SHORT[k]),
      h('div', { class: 'bar blue' }, h('i', { style: `width:${Math.min(100, (scores[k] / 999) * 100)}%` })),
      h('b', null, scores[k]))),
    h('div', { class: 'small' }, ABILITY_KEYS.map((k) => `${ABILITY_LABELS[k]}: ${ABILITY_TEXT[k]}.`).join(' ')),
    h('div', { class: 'sect' }, 'How it fights'),
    h('div', { class: 'chips' }, STANCE_IDS.map((id) => h('button', {
      class: `chip${nc.battle.stance === id ? ' on' : ''}`,
      title: STANCES[id].blurb,
      onclick: () => {
        nc.battle.stance = id;
        done(note);
      },
    }, STANCES[id].name))),
    h('div', { class: 'small' }, STANCES[nc.battle.stance].blurb),
    h('div', { class: 'sect' }, 'Everything it takes into a fight'),
    h('div', { class: 'small' }, h('b', null, `${RACES[nc.race].name}: `), RACES[nc.race].passive.text),
    nc.klass && h('div', { class: 'small' }, h('b', null, `${CLASSES[nc.klass].name}: `), CLASSES[nc.klass].feature.text),
    nc.traits.map((id) => h('div', { class: 'small' }, h('b', { style: `color:${TRAITS[id].color}` }, `${TRAITS[id].name}: `), TRAITS[id].blurb)),
    negMoveList(nc, scores).map((m) => h('div', { class: 'way', style: 'margin-top:3px' },
      h('div', { class: 'top' }, h('b', null, m.def.name), h('span', { class: 'small' }, m.from)),
      h('div', { class: 'small' }, describeMove(m.def)))),
  );
}

// ---------- its Adventure ----------

const partyOf = () => W().adventure.party.map((id) => W().creatures.find((c) => c.id === id)).filter(Boolean);

function ring() {
  const { work } = G.screen;
  const r = Math.min(work.h * 0.42, work.w * 0.3);
  return { cx: work.x + work.w / 2, cy: work.y + work.h / 2 + 34, r };
}

function adventure(page, note) {
  const world = W();
  const { spec } = note;
  const elite = spec.elite && eliteOpen();
  // Once Chapter ??? is beaten, there is more under the Negative: the Elite Negative.
  if (eliteOpen()) {
    fill(page, h('div', { class: 'tabs subtabs' },
      button(`The Negative (${world.adventure.best} of ${NEG_LEVEL_COUNT})`, () => {
        spec.elite = false;
        note.rebuild();
      }, elite ? '' : 'hot'),
      button(`The Elite Negative (${world.elite?.best ?? 0} of ${ELITE_COUNT})`, () => {
        spec.elite = true;
        note.rebuild();
      }, elite ? 'hot' : '')));
  }
  if (elite) eliteLevels(page, note);
  else negLevels(page, note);
  partyAndGo(page, note, elite);
}

function negLevels(page, note) {
  const world = W();
  const { spec } = note;
  const n = spec.picked;
  const info = negLevelInfo(n);
  const { fighters, boss } = negLevelEnemies(n, 1);
  const beaten = n <= world.adventure.best;
  const pay = negReward(n, world.adventure.best, true);
  fill(page,
    h('div', { class: 'small' }, `${NEG_LEVEL_COUNT} levels for a party of up to ${NEG_PARTY}. Nobody dies. Every fight pays XP, win or lose, and a win pays Void Shards. Whoever wins level ${NEG_LEVEL_COUNT} with it in the party can cross over.`),
    h('div', { class: 'levels' }, Array.from({ length: NEG_LEVEL_COUNT }, (_, i) => {
      const k = i + 1;
      return h('button', {
        class: ['lvl', 'abyss', k <= world.adventure.best && 'beaten', k === world.adventure.best + 1 && 'next', negBossOf(k) && 'boss', k === n && 'picked'].filter(Boolean).join(' '),
        disabled: !!negLevelProblem(world, k),
        title: `${k}. ${negLevelInfo(k).name}`,
        onclick: () => {
          spec.picked = k;
          note.rebuild();
        },
      }, String(k), negBossOf(k) && h('small', null, 'BOSS'));
    })),
    h('div', { class: 'levelcard abyss' },
      h('div', { class: 'nameline', style: 'font-size:16px' }, `${n}. ${info.name}`),
      h('div', { class: 'small' }, info.text),
      h('div', { class: 'small' }, `${fighters.length} of the Negative at level ${enemyLevel(n)}${boss ? `, led by ${negBossMonster(n).name}` : ''}${n > 1 ? `, ${Math.round((negToughness(n) - 1) * 100)}% tougher than usual` : ''}.`),
      boss && h('div', { class: 'small warning' }, negBossMonster(n).passive?.text),
      h('div', { class: 'small', style: 'font-weight:600' }, `A win pays ${pay.shards} Void Shards${beaten ? '' : ' the first time'} and ${pay.xp} XP each.`)),
    // Chapter ??? is beaten, but nobody has looked under the Negative yet.
    eliteOpen() && !(world.elite?.best > 0) && h('div', { class: 'callout small' }, 'There is more under the Negative. The Elite Negative is open, at the top of this tab, and every win there pays Ascension Stones.'),
  );
}

function eliteLevels(page, note) {
  const world = W();
  const { spec } = note;
  const best = world.elite?.best ?? 0;
  const k = spec.pickedElite;
  const info = eliteInfo(k);
  const { fighters, boss } = eliteEnemies(k, 1);
  const pay = eliteReward(k, best, true);
  fill(page,
    h('div', { class: 'small' }, `Under the bottom of the Negative. ${ELITE_COUNT} levels of creatures at level ${ELITE.level}, every one born with ${ELITE.gifts} more gift${ELITE.gifts === 1 ? '' : 's'} of the Negative than an egg gives, and every level ${ELITE.grow} times harder than the last. Every first win pays Ascension Stones, which craft what awakens the light world's powers (the Ascension tab). A boss beaten again still pays one.`),
    h('div', { class: 'levels' }, Array.from({ length: ELITE_COUNT }, (_, i) => {
      const j = i + 1;
      return h('button', {
        class: ['lvl', 'abyss', 'act5', j <= best && 'beaten', j === best + 1 && 'next', eliteBossOf(j) && 'boss', j === k && 'picked'].filter(Boolean).join(' '),
        disabled: !!eliteProblem(world, j, eliteOpen()),
        title: `E${j}. ${eliteInfo(j).name}`,
        onclick: () => {
          spec.pickedElite = j;
          note.rebuild();
        },
      }, `E${j}`, eliteBossOf(j) && h('small', null, 'BOSS'));
    })),
    h('div', { class: 'levelcard abyss act5' },
      h('div', { class: 'nameline', style: 'font-size:16px' }, `E${k}. ${info.name}`),
      h('div', { class: 'small' }, info.text),
      h('div', { class: 'small' }, `${fighters.length} of the Elite at level ${ELITE.level}${boss ? `, led by ${eliteBossMonster(k).name}` : ''}, ${eliteToughness(k).toFixed(2)} times as strong as usual.`),
      boss && h('div', { class: 'small warning' }, eliteBossMonster(k).passive?.text),
      h('div', { class: 'small', style: 'font-weight:600' }, pay.first
        ? `The first win pays ${pay.stones} Ascension Stone${pay.stones === 1 ? '' : 's'}, ${pay.shards} Void Shards and ${pay.xp} XP each.`
        : `Beaten already. Again, it pays ${pay.stones ? `${pay.stones} Ascension Stone, ` : ''}${pay.shards} Void Shards and ${pay.xp} XP each.`)),
  );
}

// Who goes, and the button to go, for either Adventure of the Negative.
function partyAndGo(page, note, elite) {
  const world = W();
  const { spec } = note;
  const party = partyOf();
  const fighting = !!G.bout?.negative;
  const n = elite ? spec.pickedElite : spec.picked;
  const beaten = elite ? n <= (world.elite?.best ?? 0) : n <= world.adventure.best;
  const where = elite ? `Elite ${n}` : `level ${n}`;
  fill(page,
    h('div', { class: 'sect' }, `The party (${party.length} of ${NEG_PARTY})`),
    h('div', { class: 'party' }, world.creatures.map((nc) => {
      const on = world.adventure.party.includes(nc.id);
      return h('button', {
        class: `chip${on ? ' on' : ''}`,
        disabled: fighting || (!on && party.length >= NEG_PARTY),
        onclick: () => {
          world.adventure.party = on ? world.adventure.party.filter((id) => id !== nc.id) : [...party.map((c) => c.id), nc.id];
          done(note);
        },
      }, `${nc.name} (${nc.klass ? `${CLASSES[nc.klass].name} ${nc.level}` : 'no class'})`);
    })),
  );
  if (fighting) {
    fill(page, h('div', { class: 'callout' }, h('div', { class: 'hand' }, `${G.negRun?.elite ? `Elite ${G.negRun.n}` : `Level ${G.negRun?.n}`}: fight!`)),
      h('div', { class: 'row gap' }, button('Give up', () => {
        G.bout = null;
        G.boutHide = new Set();
        if (G.negRun) G.negRun.result = `You called off ${G.negRun.elite ? `Elite ${G.negRun.n}` : `level ${G.negRun.n}`}.`;
        note.rebuild();
      }, 'big')));
    return;
  }
  if (G.negRun?.result) fill(page, h('div', { class: 'callout' }, h('div', { class: 'hand' }, G.negRun.result)));
  const problem = negPartyProblem(party) ?? (elite ? eliteProblem(world, n, eliteOpen()) : negLevelProblem(world, n));
  fill(page,
    problem && h('div', { class: 'warning' }, problem),
    h('div', { class: 'row gap' },
      button(beaten ? `Play ${where} again` : `Fight ${where}`, () => begin(note, false), 'big hot', !!problem || !!G.bout),
      beaten && button('Quick fight', () => begin(note, true), 'big', !!problem || !!G.bout)),
    beaten && h('div', { class: 'small' }, 'A quick fight plays it out at once, with no ring, and pays the same.'),
    G.bout && !G.bout.negative && h('div', { class: 'small' }, 'Finish the fight that is already on first.'),
  );
}

function begin(note, quick) {
  if (G.bout) return;
  const elite = note.spec.elite && eliteOpen();
  const n = elite ? note.spec.pickedElite : note.spec.picked;
  const party = partyOf();
  if (negPartyProblem(party) ?? (elite ? eliteProblem(W(), n, true) : negLevelProblem(W(), n))) return;
  const seed = Math.floor(Math.random() * 2 ** 31);
  G.negRun = { n, seed, party: party.map((c) => c.id), result: '', elite };
  const start = elite ? startElite : startNegLevel;
  if (quick) {
    settle(finishBout(start(n, party, { seed, r: 260 })));
    return;
  }
  G.bout = start(n, party, { seed, ...ring(), sizeMul: G.settings.scale ?? 1 });
  G.boutHide = new Set(G.team.map((m) => m.c.id));
  G.team.forEach((m) => m.pet.interrupt());
  toast(elite ? `THE ELITE NEGATIVE, E${n}: ${eliteInfo(n).name.toUpperCase()}!` : `THE NEGATIVE, LEVEL ${n}: ${negLevelInfo(n).name.toUpperCase()}!`, (elite ? eliteBossOf(n) : negBossOf(n)) ? 'rare' : 'info');
  note.rebuild();
}

// The level is over: XP, shards, stones, and the campaign moves on.
function settle(bout) {
  const run = G.negRun;
  if (!run) return null;
  const won = negLevelWon(bout);
  const party = run.party.map((id) => W().creatures.find((c) => c.id === id)).filter(Boolean);
  const reward = run.elite ? settleElite(W(), party, run.n, won) : settleNegLevel(W(), party, run.n, won);
  saveNeg();
  const where = run.elite ? `Elite ${run.n}` : `Level ${run.n}`;
  const ups = reward.up.map((u) => `${u.name} is level ${u.level}`);
  const downs = reward.down.map((name) => `${name} kept its Death oath and lost a level`);
  const stones = reward.stones ? `+${reward.stones} Ascension Stone${reward.stones === 1 ? '' : 's'}, ` : '';
  const lastElite = run.elite && won && run.n === ELITE_COUNT && reward.first;
  run.result = `${won ? `${where} won!` : `${where} lost.`} ${stones}${reward.shards ? `+${reward.shards} Void Shards, ` : ''}+${reward.xp} XP each.${ups.length ? ` ${ups.join(', ')}.` : ''}${downs.length ? ` ${downs.join(', ')}.` : ''}${!run.elite && won && run.n === NEG_LEVEL_COUNT ? ' Everyone in the party can cross over now.' : ''}${lastElite ? ' The Ascended King is down. Craft in the Ascension tab, awaken your powers, and the God Chapter is waiting in the light world\'s Adventure.' : ''}`;
  toast(won ? `${run.elite ? 'THE ELITE NEGATIVE' : 'THE NEGATIVE'}, ${where.toUpperCase()} WON!${stones ? ` ${stones.replace(/, $/, '').toUpperCase()}!` : ''}${ups.length ? ` ${ups.join(', ').toUpperCase()}!` : ''}` : `THE PARTY FELL IN THE ${run.elite ? 'ELITE ' : ''}NEGATIVE, ${where.toUpperCase()}.`, won ? (reward.first || reward.stones ? 'rare' : 'good') : 'bad');
  const note = getNote('negative');
  if (note && won && run.elite && run.n < ELITE_COUNT && run.n >= (W().elite?.best ?? 0)) note.spec.pickedElite = run.n + 1;
  if (note && won && !run.elite && run.n < NEG_LEVEL_COUNT && run.n >= W().adventure.best) note.spec.picked = run.n + 1;
  note?.rebuild();
  return reward;
}

// Called by the game loop when a level of the Negative is over in the ring.
export function onNegLevelEnded(bout) {
  const won = negLevelWon(bout);
  const label = G.negRun?.elite ? `ELITE ${G.negRun.n}` : `LEVEL ${G.negRun?.n}`;
  settle(bout);
  G.fx.shout(bout.cx, bout.cy - bout.r * 0.6, won ? `${label} WON` : 'THE PARTY FELL', won ? '#b89cff' : '#ff6b5e', 26, 3);
  setTimeout(() => {
    if (G.bout === bout) {
      G.bout = null;
      G.boutHide = new Set();
    }
    getNote('negative')?.rebuild();
  }, 2200);
}

// ---------- crossing over ----------

// Whether it brings its Hatsu over as a gift. Yes, unless you said otherwise.
const keepsHatsu = (note, nc) => note.spec.keepHatsu[nc.id] !== false;

function cross(page, note) {
  const world = W();
  fill(page,
    h('div', { class: 'small' }, `A creature that has won level ${NEG_LEVEL_COUNT} of the Negative's Adventure can cross over to the light world. It leaves the Negative for good, and arrives in your village as a Hatchling of its race, with its gifts of the Negative and nothing else: no class, no Alchemy, none of its levels. In the light world its race is stronger than any born there, its gifts work in every fight, and it is the only kind of creature that can wound what lives in Chapter ???.`),
    h('div', { class: 'small' }, 'One thing of its Nen can come with it: its Hatsu, turned into a gift in its blood. It knows the Hatsu as a move in the light world, keeps a little of its Nen type in every fight, and passes it down to its babies like any gift it was born with.'),
    h('div', { class: 'small' }, 'Once it is there, it can be sacrificed on the Bloodline Altar so eggs hatch as its race, given up for a creature boost, or bred with anyone using the Deluxe Breeder.'),
    h('div', { class: 'roster', style: 'max-height:none;margin-top:5px' }, world.creatures.map((nc) => {
      const problem = crossProblem(nc);
      const gift = hatsuGiftOf(nc);
      const keep = gift && keepsHatsu(note, nc);
      const gifts = [...nc.traits, ...(keep ? [gift] : [])].map((id) => TRAITS[id].name);
      return h('div', { class: 'rosterrow' },
        portrait(note, nc),
        h('div', { class: 'grow', style: 'min-width:0' },
          h('div', { class: 'name' }, nc.name),
          h('div', { class: 'small' }, problem ?? `Ready to cross over as a ${RACES[nc.race].name}${gifts.length ? `, with ${gifts.join(', ')}` : ''}.`),
          gift && h('label', { class: 'toggle' },
            h('input', {
              type: 'checkbox',
              checked: keep,
              onchange: (e) => {
                note.spec.keepHatsu[nc.id] = e.target.checked;
                note.rebuild();
              },
            }),
            h('span', null, `Turn its Hatsu, ${nc.nen.hatsu.name || HATSU_FORMS[nc.nen.hatsu.type][nc.nen.hatsu.form].name}, into a gift it can pass down: `, h('b', { style: `color:${TRAITS[gift].color}` }, TRAITS[gift].name), '.')),
          !gift && h('div', { class: 'small' }, 'It never made a Hatsu, so none can come with it. Make one in Attune, Nen, first if you want it to.')),
        sureButton('Cross over', () => crossNow(note, nc), 'mini hot', !!problem || !!G.bout));
    })),
    world.crossed.length > 0 && h('div', { class: 'sect' }, 'Crossed over'),
    world.crossed.slice().reverse().map((x) => h('div', { class: 'small' }, `${x.name}, a ${RACES[x.race]?.name ?? x.race}, ${new Date(x.at).toLocaleDateString()}.`)),
  );
}

async function crossNow(note, nc) {
  const keepHatsu = keepsHatsu(note, nc);
  const gift = keepHatsu ? hatsuGiftOf(nc) : null;
  const c = crossOver(W(), nc, Date.now(), { keepHatsu });
  if (!c) return;
  await saveNeg();
  await createCreature(c.name, c);
  await loadVillage();
  if (note.spec.pick === nc.id) note.spec.pick = W().creatures[0]?.id ?? null;
  delete note.spec.keepHatsu[nc.id];
  toast(`${c.name.toUpperCase()} CROSSED OVER FROM THE NEGATIVE! A ${RACES[c.race].name.toUpperCase()} IS LIVING IN YOUR VILLAGE NOW!!!${gift && c.traits.includes(gift) ? ` ITS HATSU RUNS IN ITS BLOOD: ${TRAITS[gift].name.toUpperCase()}!` : ''}`, 'rare');
  note.rebuild();
}

// ---------- Ascension ----------

// Ascension Stones from the Elite Negative craft what awakens the light world's powers. What is
// crafted goes into the bag, and is used in the Nursery's Bag tab.
function ascension(page, note) {
  const world = W();
  fill(page,
    h('div', { class: 'small' }, 'Ascension Stones come from the Elite Negative, in the Adventure tab. With Void Shards, they craft four things, and each one awakens a power in the light world into something far stronger: more stats, higher limits on every stat, its moves hitting much harder, a new move, and something in every fight. Whatever you craft goes into the bag your light-world creatures share: use it in Home, Nursery, Bag.'),
    h('div', { class: 'small warning' }, 'What lives in the God Chapter barely feels anything that isn\'t awakened: a creature needs two awakened powers to hit it in full, and Negative blood too.'),
    h('div', { class: 'purse' },
      h('span', null, h('b', null, big(world.stones ?? 0)), ' Ascension Stones'),
      h('span', null, h('b', null, big(world.shards)), ' Void Shards')),
    Object.entries(ASCENSION_RECIPES).map(([id, recipe]) => {
      const item = ITEMS[id];
      const a = AWAKENINGS[item.awakens];
      const problem = craftProblem(world, G.house, id);
      return h('div', { class: 'ncard', style: `border-left:5px solid ${item.color}` },
        h('div', { class: 'ncard-head' }, h('span', { class: 'ncard-title' }, item.name), h('span', { class: 'ncard-tag' }, `${recipe.stones} stones, ${recipe.shards} shards`)),
        h('div', { class: 'small' }, `For ${POWER_KIND_NAMES[item.awakens]}. ${a.blurb}`),
        h('div', { class: 'small' }, h('b', null, `${a.name}: `), a.passive.text),
        h('div', { class: 'small' }, h('b', null, 'And: '), `every move its power already had hits ${a.movePower} times as hard, every stat's limit goes up ${a.limits}, and it learns ${ABILITIES[a.move].name}: ${describeMove(ABILITIES[a.move])}`),
        h('div', { class: 'row gap' },
          button(`Craft a ${item.name}`, () => {
            if (!craftAscension(world, G.house, id)) return;
            saveHouse();
            toast(`CRAFTED A ${item.name.toUpperCase()}! IT IS IN THE BAG.`, 'rare');
            done(note);
          }, 'hot', !!problem),
          h('span', { class: 'small grow' }, problem ?? `In the bag: ${itemCount(G.house, id)}.`)));
    }),
  );
}
