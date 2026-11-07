// The Powers note. A Stand, speedster powers, a cursed technique and a Devil Fruit each take a slot:
// one basic slot that takes any of them, and one more for each Legendary mutation, which takes what
// its soul says. Quirks are separate, and are paid for with max HP.
// At the top, a card with everything it holds at a glance. Under it, one fold for each kind of power,
// one open at a time, each title saying whether it has it, is ready for it, or what it still needs.

import { toast } from './flair.js';
import { G, saveCreature, saveHouse } from '../state.js';
import { h, fill, button, sureButton, openNote, folds } from './notes.js';
import {
  computeStats, STAT_LABELS, maxHpOf, hpGivenUp, soulLean, standCard, powersHeld, powerSlots, slotPlan, slotTakes, roomProblem, hasRoomFor, lineageOf, lastName, fullName,
  canAwakenStand, awakenStand, canBecomeSpeedster, becomeSpeedster, canLearnTechnique, learnTechnique, canGainQuirk, gainQuirk,
  hasTrait, otherLineOf, canLearnSecondTechnique, learnSecondTechnique, ofaLevel, fruitProblem, eatFruit, raceName, raceParts, raceStats, soulCap,
} from '../core/creature.js';
import { MAX_SOUL_EXPANDERS } from '../data/items.js';
import { FRUITS, FRUIT_IDS, FRUIT_VIGOR, FRUIT_FROM_HARVEST, FRUIT_FROM_EXPEDITION } from '../data/fruits.js';
import { RACES } from '../data/races.js';
import { statText, ofaText } from '../core/sheet.js';
import { openPassOn } from './ofa.js';
import { openGuide } from './guide.js';
import { ABILITIES } from '../data/paths.js';
import {
  STANDS, STAND_WITS, QUIRKS, QUIRK_IDS, SPEEDSTER, SPEEDSTER_SPEED, MAX_HP_GIVEN, TECHNIQUES, TECHNIQUE_MIGHT,
  LEGENDARY, BLACK_FLASH, TRAITS, OFA_ID, OFA_MAX_LEVEL, ofaStats,
} from '../data/powers.js';
import { dropRig, hasArt, artUrl, heightOf } from '../draw/art.js';
import { DEADLY_MONSTERS } from '../data/monsters.js';

// Which monster gives each Legendary mutation: the only way to get one.
const SOUL_FROM = Object.fromEntries(Object.values(DEADLY_MONSTERS).filter((m) => m.soul).map((m) => [m.soul, m.name]));
const SPEEDSTER_COLOR = '#ffe14a';

const moveNames = (ids) => ids.map((id) => ABILITIES[id].name).join(', ');

// Its look and its stats just changed for good.
function changed(note) {
  dropRig(G.creature);
  saveCreature();
  G.onCreatureChanged?.();
  note.rebuild();
}

// Text right above the creature, so the moment gets noticed.
function announce(text, color, size = 26) {
  const pet = G.pet;
  if (pet) G.fx.float(pet.x, pet.y - heightOf(pet.c) - 26, text, color, size, 3);
  toast(`${text.toUpperCase()} UNLOCKED!!!`, 'rare');
}

function needs(have, need, label) {
  return [
    h('div', { class: 'small' }, `Needs ${need} ${label}. It has ${have}.`),
    h('div', { class: 'bar blue', style: 'margin:3px 0 5px' }, h('i', { style: `width:${Math.min(100, (have / need) * 100)}%` })),
  ];
}

// A power's name, its words, and what it gives, as one block.
function powerBlock(name, color, blurb, stats, moves, extra) {
  return h('div', { class: 'powerblock', style: `--c:${color ?? '#888'}` },
    h('div', { class: 'pb-name' }, name),
    h('div', { class: 'small' }, blurb),
    h('div', { class: 'pb-gives' }, `${statText(stats)}.${moves?.length ? ` Moves: ${moveNames(moves)}.` : ''}`),
    extra);
}

const chip = (label, color, title = '') => h('span', { class: 'pchip', style: `--c:${color ?? '#888'}`, title }, label);

// ---------- the card at the top ----------

// One chip for each slot: the power in it, or what it takes while it is free.
function heldPower(c, kind, where) {
  const { stand, technique, technique2, fruit } = c.powers;
  if (kind === 'stand') return chip(`「${STANDS[stand].name}」`, STANDS[stand].color, `Stand, in ${where}`);
  if (kind === 'speedster') return chip('Speedster', SPEEDSTER_COLOR, `Speedster powers, in ${where}`);
  if (kind === 'technique') return chip(technique2 ? `${TECHNIQUES[technique].name} + ${TECHNIQUES[technique2].name}` : TECHNIQUES[technique].name, TECHNIQUES[technique].color, `Cursed technique, in ${where}`);
  return chip(FRUITS[fruit].name, FRUITS[fruit].color, `Devil Fruit, in ${where}`);
}

// What a free Legendary slot says it takes, short enough for a chip.
const SHORT_KIND = { stand: 'Stand', speedster: 'Speedster', technique: 'Technique', fruit: 'Devil Fruit' };

function slotChips(c) {
  return slotPlan(c).map((slot) => {
    const where = slot.soul ? `its ${LEGENDARY[slot.soul].name}'s slot` : 'its basic slot';
    if (slot.holds) return heldPower(c, slot.holds, where);
    const takes = slotTakes(slot.takes);
    if (!slot.soul) return h('span', { class: 'pchip empty', title: `Free: ${where} takes ${takes}` }, 'free');
    return h('span', { class: 'pchip empty soul', style: `--c:${LEGENDARY[slot.soul].color}`, title: `Free: ${where} takes ${takes}` },
      `free: ${takes === 'any power' ? 'any' : slot.takes.map((k) => SHORT_KIND[k]).join('/')}`);
  });
}

function summaryCard(c) {
  const slots = powerSlots(c);
  const given = hpGivenUp(c);
  const line = (label, kids, count) => h('div', { class: 'pc-row' },
    h('span', { class: 'pc-label' }, label),
    h('div', { class: 'pc-items' }, kids),
    count && h('span', { class: 'pc-count' }, count));
  return h('div', { class: 'powercard' },
    line('Powers', slotChips(c), `${powersHeld(c)} of ${slots} slots`),
    line('Legendary', c.souls.length ? c.souls.map((id) => chip(LEGENDARY[id].name, LEGENDARY[id].color, LEGENDARY[id].blurb)) : h('span', { class: 'small' }, 'none yet'), `${c.souls.length} of ${soulCap(c)}`),
    line('Quirks', c.powers.quirks.length ? c.powers.quirks.map((id) => chip(id === OFA_ID ? `One For All ${ofaLevel(c)}` : QUIRKS[id].name, QUIRKS[id].color, statText(QUIRKS[id].stats))) : h('span', { class: 'small' }, 'none'), given ? `${given}% HP given` : ''),
    line('Born', [chip(raceName(c), RACES[c.race]?.color, 'Race'), c.traits.map((id) => chip(TRAITS[id].name, TRAITS[id].color, TRAITS[id].blurb))]),
  );
}

// ---------- why a power is locked ----------

function noRoomLine(c, kind) {
  const problem = roomProblem(c, kind);
  return !!problem && h('div', { class: 'small warning' }, `${problem}.`);
}

// The summary beside a fold's title: has it, ready for it, no room, or how close it is.
function status(has, ready, room, have, need, label) {
  if (has) return { tag: has, tagCls: 'has' };
  if (ready) return { tag: 'Ready!', tagCls: 'ready' };
  if (!room) return { tag: 'no room', tagCls: 'locked' };
  return { tag: `${have} of ${need} ${label}` };
}

// ---------- each kind of power ----------

function soulsFold(c) {
  const cap = soulCap(c);
  return {
    id: 'souls',
    title: 'Legendary mutations',
    tag: `${c.souls.length} of ${cap}`,
    tagCls: c.souls.length ? 'has' : '',
    build: () => [
      h('div', { class: 'small' }, `Each one adds a Legendary slot, so more powers go together: its basic slot takes any power, and each Legendary slot takes what its soul says. Only from beating the monster that gives each one, in Challenges. It holds ${cap}${cap < 1 + MAX_SOUL_EXPANDERS ? `; each Legendary Expander makes room for one more, up to ${1 + MAX_SOUL_EXPANDERS}` : ''}.${c.souls.length > 1 ? ' Their slots, stats and fight bonuses all add up.' : ''}`),
      c.souls.map((id) => {
        const l = LEGENDARY[id];
        return powerBlock(l.name, l.color, l.blurb, l.stats, null, l.passive && h('div', { class: 'small' }, `In a fight: ${l.passive.text}`));
      }),
      h('div', { class: 'small', style: 'margin-top:5px' }, `Where to win them, and what their slot takes: ${Object.entries(SOUL_FROM).map(([id, m]) => `${LEGENDARY[id].name} from ${m} (${slotTakes(LEGENDARY[id].slot)})`).join(', ')}.`),
    ],
  };
}

function standFold(c, note) {
  const stand = c.powers.stand && STANDS[c.powers.stand];
  return {
    id: 'stand',
    title: 'Stand',
    ...status(stand && `「${stand.name}」`, canAwakenStand(c), hasRoomFor(c, 'stand'), computeStats(c).wits, STAND_WITS, 'Wits'),
    build: () => {
      if (stand) {
        const file = `stands/${c.powers.stand}.png`;
        return [
          h('div', { class: 'row nowrap' },
            hasArt(file) && h('img', { class: 'standpic', src: artUrl(file), alt: '' }),
            h('div', { class: 'grow' }, powerBlock(`「${stand.name}」`, stand.color, stand.blurb, stand.stats, stand.moves))),
          h('div', { class: 'chart' }, standCard(c).map(([label, grade]) => h('div', null, h('b', null, grade), h('span', null, label)))),
        ];
      }
      return [
        needs(computeStats(c).wits, STAND_WITS, 'Wits'),
        h('div', { class: 'small' }, `You don't pick a Stand. It comes out of its soul, so whatever it leans on most when it awakens decides which one. Right now that is ${STAT_LABELS[soulLean(c)]}.`),
        noRoomLine(c, 'stand'),
        h('div', { class: 'row gap' }, sureButton('Awaken its Stand', () => {
          const id = awakenStand(c);
          if (!id) return;
          const s = STANDS[id];
          announce(`「${s.name}」`, s.color);
          if (G.pet) G.fx.menace(G.pet.x, G.pet.y, s.color);
          G.pet?.say('it was behind me the whole time', 4, true);
          changed(note);
        }, 'big', !canAwakenStand(c))),
      ];
    },
  };
}

function speedsterFold(c, note) {
  const perks = `Runs ${SPEEDSTER.walkMul} times as fast on your screen, digs faster, moves and hits faster in the ring, and leaves afterimages. It also gets hungry ${SPEEDSTER.hungerMul} times as fast.`;
  return {
    id: 'speedster',
    title: 'Speedster',
    ...status(c.powers.speedster && 'Has it', canBecomeSpeedster(c), hasRoomFor(c, 'speedster'), computeStats(c).speed, SPEEDSTER_SPEED, 'Speed'),
    build: () => [
      !c.powers.speedster && needs(computeStats(c).speed, SPEEDSTER_SPEED, 'Speed'),
      powerBlock('Speedster', SPEEDSTER_COLOR, perks, SPEEDSTER.stats, [SPEEDSTER.move]),
      !c.powers.speedster && noRoomLine(c, 'speedster'),
      !c.powers.speedster && h('div', { class: 'row gap' }, sureButton('Become a speedster', () => {
        if (!becomeSpeedster(c)) return;
        announce('SPEEDSTER', SPEEDSTER_COLOR);
        G.pet?.say('i have already left', 4, true);
        changed(note);
      }, 'big', !canBecomeSpeedster(c))),
    ],
  };
}

// A Cursed Body can hold the technique from the other side of its family too.
function secondTechnique(c, note) {
  if (!hasTrait(c, 'cursedbody')) return null;
  const t = TECHNIQUES[c.powers.technique2 ?? otherLineOf(c)];
  if (c.powers.technique2) return powerBlock(`${t.name} (Cursed Body)`, t.color, t.blurb, t.stats, t.moves);
  return [
    h('div', { class: 'small', style: 'margin-top:6px;font-weight:600' }, `Cursed Body: once it has its own technique, it can also awaken ${t.name}, from the ${t.family} side of its family. It shares the same place, so it doesn't take a second one.`),
    h('div', { class: 'row gap' }, sureButton('Awaken its second technique', () => {
      if (!learnSecondTechnique(c)) return;
      announce(t.name, t.color);
      G.pet?.say('my other hand feels cursed too', 4, true);
      changed(note);
    }, 'big', !canLearnSecondTechnique(c))),
  ];
}

function techniqueFold(c, note) {
  const flash = h('div', { class: 'small' }, `Melee swings have a ${Math.round(BLACK_FLASH.chance * 100)}% chance of a Black Flash, for ${BLACK_FLASH.power} times the damage.`);
  const has = c.powers.technique && TECHNIQUES[c.powers.technique];
  const s = status(has && has.name, canLearnTechnique(c), hasRoomFor(c, 'technique'), computeStats(c).might, TECHNIQUE_MIGHT, 'Might');
  if (has && canLearnSecondTechnique(c)) Object.assign(s, { tag: 'Ready: a second!', tagCls: 'ready' });
  return {
    id: 'technique',
    title: 'Cursed technique',
    ...s,
    build: () => {
      if (has) return [powerBlock(has.name, has.color, has.blurb, has.stats, has.moves, flash), secondTechnique(c, note)];
      const t = TECHNIQUES[lineageOf(c)];
      return [
        needs(computeStats(c).might, TECHNIQUE_MIGHT, 'Might'),
        h('div', { class: 'small' }, `You don't pick this. It runs in the family, and every ${lastName(c)} has ${t.name}.`),
        powerBlock(t.name, t.color, t.blurb, t.stats, t.moves, flash),
        noRoomLine(c, 'technique'),
        h('div', { class: 'row gap' }, sureButton('Awaken its technique', () => {
          if (!learnTechnique(c)) return;
          announce(t.name, t.color);
          G.pet?.say('my hands feel cursed', 4, true);
          changed(note);
        }, 'big', !canLearnTechnique(c))),
        secondTechnique(c, note),
      ];
    },
  };
}

// A Devil Fruit: the fourth power. The pool holds any your creatures found, and one can eat one.
function fruitFold(c, note) {
  const has = c.powers.fruit && FRUITS[c.powers.fruit];
  const pool = FRUIT_IDS.filter((id) => (G.house.fruits[id] ?? 0) > 0);
  const problem = fruitProblem(c);
  const vigor = computeStats(c).vigor;
  let tag;
  if (has) tag = { tag: has.name, tagCls: 'has' };
  else if (problem && vigor >= FRUIT_VIGOR) tag = { tag: 'no room', tagCls: 'locked' };
  else if (!pool.length) tag = { tag: 'none in the pool' };
  else if (problem) tag = { tag: `${vigor} of ${FRUIT_VIGOR} Vigor` };
  else tag = { tag: 'Ready!', tagCls: 'ready' };
  return {
    id: 'fruit',
    title: 'Devil Fruit',
    ...tag,
    build: () => {
      if (has) {
        return powerBlock(has.name, has.color, `A ${has.type}. ${has.blurb}`, has.stats, has.moves,
          h('div', { class: 'small' }, 'It fills one of its slots for good, and it can\'t swim.'));
      }
      return [
        needs(vigor, FRUIT_VIGOR, 'Vigor'),
        h('div', { class: 'small' }, `Very strong. A fruit fills a slot like any other power, so beside a Stand, speedster powers or a cursed technique it needs a Legendary slot that takes one of them (or a fruit). Quirks are still fine. They turn up in ${FRUIT_FROM_HARVEST * 100}% of farm harvests and ${Math.round(FRUIT_FROM_EXPEDITION * 100)}% of expeditions, and wait in the shared pool.`),
        pool.length === 0
          ? h('div', { class: 'small', style: 'font-weight:600' }, 'No fruit in the pool yet.')
          : h('div', { class: 'quirks' }, pool.map((id) => {
            const f = FRUITS[id];
            return h('div', { class: 'quirk' },
              h('div', { class: 'grow' }, powerBlock(`${f.name} x${G.house.fruits[id]}`, f.color, `A ${f.type}. ${f.blurb}`, f.stats, f.moves)),
              sureButton('Eat it', () => {
                if ((G.house.fruits[id] ?? 0) < 1 || !eatFruit(c, id)) return;
                G.house.fruits[id] -= 1;
                if (!G.house.fruits[id]) delete G.house.fruits[id];
                saveHouse();
                announce(f.name, f.color);
                G.pet?.say('that tasted awful. i feel amazing', 4, true);
                changed(note);
              }, '', !!problem));
          })),
        pool.length > 0 && problem && h('div', { class: 'small warning' }, `${problem}.`),
      ];
    },
  };
}

function quirksFold(c, note) {
  const given = hpGivenUp(c);
  const open = QUIRK_IDS.filter((id) => !c.powers.quirks.includes(id));
  const ready = open.some((id) => canGainQuirk(c, id));
  return {
    id: 'quirks',
    title: 'Quirks',
    tag: `${c.powers.quirks.length} held${given ? `, ${given}% HP given` : ''}`,
    tagCls: c.powers.quirks.length ? 'has' : ready ? '' : '',
    build: () => [
      h('div', { class: 'small' }, `Separate from the powers above, and paid for with max HP, for good. Max HP ${maxHpOf(c)}. ${given ? `It has given up ${given}%` : 'It has given up none'}, of ${MAX_HP_GIVEN}% at most.`),
      h('div', { class: 'bar green', style: 'margin:3px 0 5px' }, h('i', { style: `width:${100 - given}%` })),
      open.length > 0 && h('div', { class: 'quirks' }, open.map((id) => {
        const q = QUIRKS[id];
        return h('div', { class: 'quirk' },
          h('div', { class: 'grow' }, powerBlock(q.name, q.color, q.blurb, q.stats, [q.move])),
          sureButton(`Give ${q.cost}%`, () => {
            if (!gainQuirk(c, id)) return;
            announce(`${q.name}!`, q.color, 24);
            G.pet?.say('PLUS ULTRA', 3, true);
            changed(note);
          }, '', !canGainQuirk(c, id)));
      })),
    ],
  };
}

function ofaFold(c) {
  if (!c.powers.quirks.includes(OFA_ID)) return null;
  const level = ofaLevel(c);
  return {
    id: 'ofa',
    title: 'One For All',
    tag: `level ${level} of ${OFA_MAX_LEVEL}`,
    tagCls: 'has',
    build: () => [
      h('div', { class: 'pb-gives' }, statText(ofaStats(level))),
      h('div', { class: 'small' }, ofaText(c)),
      h('div', { class: 'row', style: 'margin-top:4px' }, button('Pass it on', () => openPassOn(), 'mini hot')),
    ],
  };
}

function originFold(c) {
  return {
    id: 'origin',
    title: 'Race and gifts',
    tag: `${raceName(c)}${c.traits.length ? `, ${c.traits.length} gift${c.traits.length === 1 ? '' : 's'}` : ''}`,
    build: () => [
      powerBlock(raceName(c), RACES[c.race]?.color,
        raceParts(c).length > 1 ? (c.pureBlood ? 'Pure-blooded, so every race in it is at full power.' : 'A mix: each race gives its share of its bonuses.') : RACES[raceParts(c)[0][0]].blurb,
        raceStats(c)),
      c.traits.map((id) => h('div', { class: 'small', style: 'margin-top:3px' }, h('b', { style: `color:${TRAITS[id].color}` }, `${TRAITS[id].name}: `), TRAITS[id].blurb)),
      c.rebirths?.length > 0 && h('div', { class: 'small', style: 'margin-top:3px;font-weight:600' },
        `Reborn ${c.rebirths.length} time${c.rebirths.length === 1 ? '' : 's'}: ${c.rebirths.map((r) => `absorbed ${r.absorbed}${r.took.length ? ` for ${r.took.map((id) => TRAITS[id].name).join(' and ')}` : ''}`).join('; ')}.`),
      h('div', { class: 'row', style: 'margin-top:4px' }, button('Every chance in the game', () => openGuide('chances'), 'mini')),
    ],
  };
}

export function openPowers() {
  const c = G.creature;
  if (!c) return;
  openNote('powers', {
    title: `${fullName(c)}'s powers`,
    width: 380,
    build(body, note) {
      const items = [soulsFold(c), standFold(c, note), speedsterFold(c, note), techniqueFold(c, note), fruitFold(c, note), quirksFold(c, note), ofaFold(c), originFold(c)];
      // Whatever it is ready for opens by itself.
      const ready = items.find((it) => it?.tagCls === 'ready');
      fill(body,
        summaryCard(c),
        h('div', { class: 'scrollnote', style: 'max-height:min(470px, calc(100vh - 260px))' }, folds(note, 'powers', items, ready?.id ?? null)));
    },
  });
}
