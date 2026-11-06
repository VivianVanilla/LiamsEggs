// The Powers note. A Stand, a speedster or a cursed technique, one at a time, unless a Legendary
// mutation makes room for two. A Devil Fruit takes the place of all of them. Quirks are separate,
// and are paid for with max HP. What it was born with, and its race, show at the top.

import { toast } from './flair.js';
import { G, saveCreature, saveHouse } from '../state.js';
import { h, fill, button, sureButton, openNote } from './notes.js';
import {
  computeStats, STAT_LABELS, maxHpOf, hpGivenUp, soulLean, standCard, powersHeld, powerSlots, hasRoomFor, lineageOf, lastName, fullName,
  canAwakenStand, awakenStand, canBecomeSpeedster, becomeSpeedster, canLearnTechnique, learnTechnique, canGainQuirk, gainQuirk,
  hasTrait, otherLineOf, canLearnSecondTechnique, learnSecondTechnique, ofaLevel, fruitProblem, eatFruit, raceName, raceParts, raceStats,
} from '../core/creature.js';
import { FRUITS, FRUIT_IDS, FRUIT_VIGOR, FRUIT_FROM_HARVEST, FRUIT_FROM_EXPEDITION } from '../data/fruits.js';
import { RACES } from '../data/races.js';
import { statText, ofaText } from '../core/sheet.js';
import { openPassOn } from './ofa.js';
import { openGuide } from './guide.js';
import { ABILITIES } from '../data/paths.js';
import {
  STANDS, STAND_WITS, QUIRKS, QUIRK_IDS, SPEEDSTER, SPEEDSTER_SPEED, MAX_HP_GIVEN, TECHNIQUES, TECHNIQUE_MIGHT,
  LEGENDARY, LEGENDARY_ONE_IN, LEGENDARY_FROM_TROPHY, BLACK_FLASH, TRAITS, OFA_ID, OFA_MAX_LEVEL, ofaStats,
} from '../data/powers.js';
import { dropRig, hasArt, artUrl, heightOf } from '../draw/art.js';

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

// The rule at the top: which of the three it has, and how it could have two.
function pathIntro(body, note) {
  const c = G.creature;
  const held = powersHeld(c);
  const slots = powerSlots(c);
  fill(body,
    c.legendary
      ? h('div', { class: 'callout' }, h('b', null, `Legendary mutation: ${LEGENDARY[c.legendary].name}. `), `${LEGENDARY[c.legendary].blurb} It has ${held}. ${statText(LEGENDARY[c.legendary].stats)}.`)
      : h('div', { class: 'small', style: 'font-weight:600' }, `It can be one of these three, for good: a Stand, a speedster, or a cursed technique. Or it can eat a Devil Fruit instead of all of them. It has ${held} of ${slots}.`),
    !c.legendary && h('div', { class: 'small' }, `A Legendary mutation makes room for a second. One new mutation in ${LEGENDARY_ONE_IN} comes with a Twin Soul, which holds any two, and The Last Dragon always gives one. A win to the death has a ${Math.round(LEGENDARY_FROM_TROPHY * 100)}% chance of a Malevolent Soul, which holds a Stand plus one of the others.`),
    h('div', { class: 'small', style: 'margin-top:3px' },
      h('b', { style: `color:${RACES[c.race]?.color ?? '#888'}` }, `${raceName(c)}: `),
      raceParts(c).length > 1 ? `${c.pureBlood ? 'Pure-blooded, so every race in it is at full power.' : 'A mix: each race gives its share of its bonuses.'}` : RACES[raceParts(c)[0][0]].blurb,
      Object.keys(raceStats(c)).length ? ` ${statText(raceStats(c))}.` : ''),
    c.traits.length > 0 && sect(note, 'born', 'Born with'),
    c.traits.map((id) => h('div', { class: 'small', style: 'margin-top:2px' }, h('b', { style: `color:${TRAITS[id].color}` }, `${TRAITS[id].name}: `), TRAITS[id].blurb)),
    c.rebirths?.length > 0 && h('div', { class: 'small', style: 'margin-top:3px;font-weight:600' },
      `Reborn ${c.rebirths.length} time${c.rebirths.length === 1 ? '' : 's'}: ${c.rebirths.map((r) => `absorbed ${r.absorbed}${r.took.length ? ` for ${r.took.map((id) => TRAITS[id].name).join(' and ')}` : ''}`).join('; ')}.`),
    h('div', { class: 'row', style: 'margin-top:4px' }, button('Every chance in the game', () => openGuide('chances'), 'mini')),
  );
}

// Why a locked power is locked, once the stat is not the problem.
function noRoomLine(c, kind) {
  if (hasRoomFor(c, kind)) return false;
  const soul = c.legendary ? LEGENDARY[c.legendary] : null;
  let text = 'It already has its one.';
  if (c.powers.fruit && !soul?.fruit) text = `It ate the ${FRUITS[c.powers.fruit].name}, and nothing else goes with a Devil Fruit${soul ? '' : ', unless a Malevolent Soul makes room for a Stand'}.`;
  else if (soul) text = powersHeld(c) >= powerSlots(c) ? 'It already holds two.' : `A ${soul.name} can't hold this alongside what it already has.`;
  return h('div', { class: 'small', style: 'font-weight:600' }, text);
}

function standSection(body, note) {
  const c = G.creature;
  fill(body, sect(note, 'stand', 'Stand'));
  if (!c.powers.stand) {
    fill(body,
      needs(computeStats(c).wits, STAND_WITS, 'Wits'),
      h('div', { class: 'small' }, `You don't pick a Stand. It comes out of its soul, so whatever it leans on most when it awakens decides which one. Right now that is ${STAT_LABELS[soulLean(c)]}.`),
      noRoomLine(c, 'stand'),
      h('div', { class: 'row gap' }, sureButton('Awaken its Stand', () => {
        const id = awakenStand(c);
        if (!id) return;
        const stand = STANDS[id];
        announce(`「${stand.name}」`, stand.color);
        if (G.pet) G.fx.menace(G.pet.x, G.pet.y, stand.color);
        G.pet?.say('it was behind me the whole time', 4, true);
        changed(note);
      }, 'big', !canAwakenStand(c))),
    );
    return;
  }
  const stand = STANDS[c.powers.stand];
  const file = `stands/${c.powers.stand}.png`;
  fill(body,
    h('div', { class: 'row nowrap' },
      hasArt(file) && h('img', { class: 'standpic', src: artUrl(file), alt: '' }),
      h('div', { class: 'grow' },
        h('div', { class: 'nameline' }, `「${stand.name}」`),
        h('div', { class: 'small' }, stand.blurb),
        h('div', { class: 'small', style: 'margin-top:3px' }, `${statText(stand.stats)}. Arena moves: ${moveNames(stand.moves)}`))),
    h('div', { class: 'chart' }, standCard(c).map(([label, grade]) => h('div', null, h('b', null, grade), h('span', null, label)))),
  );
}

function speedsterSection(body, note) {
  const c = G.creature;
  fill(body, sect(note, 'speedster', 'Speedster'));
  const perks = `${statText(SPEEDSTER.stats)}. Runs ${SPEEDSTER.walkMul} times as fast on your screen, digs faster, moves and hits faster in the ring, and leaves afterimages. It also gets hungry ${SPEEDSTER.hungerMul} times as fast.`;
  if (c.powers.speedster) {
    fill(body,
      h('div', { class: 'small' }, `It is a speedster. ${perks}`),
      h('div', { class: 'small', style: 'margin-top:3px' }, `Arena move: ${ABILITIES[SPEEDSTER.move].name}`),
    );
    return;
  }
  fill(body,
    needs(computeStats(c).speed, SPEEDSTER_SPEED, 'Speed'),
    h('div', { class: 'small' }, perks),
    noRoomLine(c, 'speedster'),
    h('div', { class: 'row gap' }, sureButton('Become a speedster', () => {
      if (!becomeSpeedster(c)) return;
      announce('SPEEDSTER', '#ffe14a');
      G.pet?.say('i have already left', 4, true);
      changed(note);
    }, 'big', !canBecomeSpeedster(c))),
  );
}

// A section heading the jump bar at the top can scroll to.
function sect(note, key, label, style = '') {
  const el = h('div', { class: 'sect', style }, label);
  (note.refs.jump ??= {})[key] = el;
  return el;
}

// A Cursed Body can hold the technique from the other side of its family too.
function secondTechnique(body, note) {
  const c = G.creature;
  if (!hasTrait(c, 'cursedbody')) return;
  const t = TECHNIQUES[c.powers.technique2 ?? otherLineOf(c)];
  if (c.powers.technique2) {
    fill(body,
      h('div', { class: 'nameline', style: 'margin-top:6px' }, `${t.name} (Cursed Body)`),
      h('div', { class: 'small' }, t.blurb),
      h('div', { class: 'small', style: 'margin-top:3px' }, `${statText(t.stats)}. Arena moves: ${moveNames(t.moves)}`),
    );
    return;
  }
  fill(body,
    h('div', { class: 'small', style: 'margin-top:6px;font-weight:600' }, `Cursed Body: once it has its own technique, it can also awaken ${t.name}, from the ${t.family} side of its family. It shares the same place, so it doesn't take a second one.`),
    h('div', { class: 'row gap' }, sureButton('Awaken its second technique', () => {
      if (!learnSecondTechnique(c)) return;
      announce(t.name, t.color);
      G.pet?.say('my other hand feels cursed too', 4, true);
      changed(note);
    }, 'big', !canLearnSecondTechnique(c))),
  );
}

function techniqueSection(body, note) {
  const c = G.creature;
  fill(body, sect(note, 'technique', 'Cursed technique'));
  const flash = `Melee swings have a ${Math.round(BLACK_FLASH.chance * 100)}% chance of a Black Flash, for ${BLACK_FLASH.power} times the damage.`;
  if (c.powers.technique) {
    const t = TECHNIQUES[c.powers.technique];
    fill(body,
      h('div', { class: 'nameline' }, t.name),
      h('div', { class: 'small' }, t.blurb),
      h('div', { class: 'small', style: 'margin-top:3px' }, `${statText(t.stats)}. Arena moves: ${moveNames(t.moves)}`),
      h('div', { class: 'small' }, flash),
    );
    secondTechnique(body, note);
    return;
  }
  const t = TECHNIQUES[lineageOf(c)];
  fill(body,
    needs(computeStats(c).might, TECHNIQUE_MIGHT, 'Might'),
    h('div', { class: 'small' }, `You don't pick this. It runs in the family, and every ${lastName(c)} has ${t.name}.`),
    h('div', { class: 'nameline', style: 'margin-top:3px' }, t.name),
    h('div', { class: 'small' }, t.blurb),
    h('div', { class: 'small', style: 'margin-top:3px' }, `${statText(t.stats)}. Arena moves: ${moveNames(t.moves)}`),
    h('div', { class: 'small' }, flash),
    noRoomLine(c, 'technique'),
    h('div', { class: 'row gap' }, sureButton('Awaken its technique', () => {
      if (!learnTechnique(c)) return;
      announce(t.name, t.color);
      G.pet?.say('my hands feel cursed', 4, true);
      changed(note);
    }, 'big', !canLearnTechnique(c))),
  );
  secondTechnique(body, note);
}

// A Devil Fruit: the fourth power. The pool holds any your creatures found, and one can eat one.
function fruitSection(body, note) {
  const c = G.creature;
  fill(body, sect(note, 'fruit', 'Devil Fruit'));
  if (c.powers.fruit) {
    const f = FRUITS[c.powers.fruit];
    fill(body,
      h('div', { class: 'nameline', style: `color:${f.color}` }, f.name),
      h('div', { class: 'small' }, `A ${f.type}. ${f.blurb}`),
      h('div', { class: 'small', style: 'margin-top:3px' }, `${statText(f.stats)}. Arena moves: ${moveNames(f.moves)}`),
      h('div', { class: 'small' }, 'It can never have a Stand, speedster powers or a cursed technique now, and it can\'t swim.'),
    );
    return;
  }
  const have = FRUIT_IDS.filter((id) => (G.house.fruits[id] ?? 0) > 0);
  const problem = fruitProblem(c);
  fill(body,
    needs(computeStats(c).vigor, FRUIT_VIGOR, 'Vigor'),
    h('div', { class: 'small' }, `Very strong, and alone: a creature that eats one can never also have a Stand, speedster powers or a cursed technique, not even with a Legendary mutation. Quirks are still fine. They turn up in ${FRUIT_FROM_HARVEST * 100}% of farm harvests and ${Math.round(FRUIT_FROM_EXPEDITION * 100)}% of expeditions, and wait in the shared pool.`),
    have.length === 0
      ? h('div', { class: 'small', style: 'font-weight:600' }, 'No fruit in the pool yet.')
      : h('div', { class: 'quirks' }, have.map((id) => {
        const f = FRUITS[id];
        return h('div', { class: 'quirk' },
          h('div', { class: 'grow' },
            h('div', { class: 'name', style: `color:${f.color}` }, `${f.name} x${G.house.fruits[id]}`),
            h('div', { class: 'small' }, `A ${f.type}. ${f.blurb}`),
            h('div', { class: 'small' }, `${statText(f.stats)}. Arena moves: ${moveNames(f.moves)}`)),
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
    have.length > 0 && problem && h('div', { class: 'small', style: 'font-weight:600' }, `${problem}.`),
  );
}

function quirkSection(body, note) {
  const c = G.creature;
  const given = hpGivenUp(c);
  fill(body,
    sect(note, 'quirks', 'Quirks'),
    h('div', { class: 'small' }, `Separate from the three above. Max HP ${maxHpOf(c)}. ${given ? `It has given up ${given}% for good` : 'It has given up none'}, and can give up ${MAX_HP_GIVEN}% at most.`),
    h('div', { class: 'bar green', style: 'margin:3px 0 5px' }, h('i', { style: `width:${100 - given}%` })),
    c.powers.quirks.length
      ? h('div', { class: 'chips' }, c.powers.quirks.map((id) => h('span', { class: 'chip', style: `--c:${QUIRKS[id].color}`, title: statText(QUIRKS[id].stats) }, QUIRKS[id].name)))
      : h('div', { class: 'small' }, 'Quirkless, for now.'),
  );
  if (c.powers.quirks.includes(OFA_ID)) {
    const level = ofaLevel(c);
    fill(body, sect(note, 'ofa', 'One For All'), h('div', { class: 'way', style: 'margin-top:3px' },
      h('div', { class: 'top' }, `Level ${level} of ${OFA_MAX_LEVEL}`, h('span', null, statText(ofaStats(level)))),
      h('div', { class: 'small' }, ofaText(c)),
      h('div', { class: 'row', style: 'margin-top:4px' }, button('Pass it on', () => openPassOn(), 'mini hot'))));
  }
  const open = QUIRK_IDS.filter((id) => !c.powers.quirks.includes(id));
  if (!open.length) return;
  fill(body, h('div', { class: 'quirks' }, open.map((id) => {
    const q = QUIRKS[id];
    return h('div', { class: 'quirk' },
      h('div', { class: 'grow' },
        h('div', { class: 'name' }, q.name),
        h('div', { class: 'small' }, q.blurb),
        h('div', { class: 'small' }, `${statText(q.stats)}. Arena move: ${ABILITIES[q.move].name}`)),
      sureButton(`Give ${q.cost}%`, () => {
        if (!gainQuirk(c, id)) return;
        announce(`${q.name}!`, q.color, 24);
        G.pet?.say('PLUS ULTRA', 3, true);
        changed(note);
      }, '', !canGainQuirk(c, id)));
  })));
}

export function openPowers() {
  const c = G.creature;
  if (!c) return;
  openNote('powers', {
    title: `${fullName(c)}'s powers`,
    width: 372,
    help: 'chances',
    build(body, note) {
      const scroll = h('div', { class: 'scrollnote' });
      // Jumps to each part of this long note.
      const parts = [
        c.traits.length > 0 && ['born', 'Born with'], ['stand', 'Stand'], ['speedster', 'Speedster'], ['technique', 'Technique'], ['fruit', 'Devil Fruit'], ['quirks', 'Quirks'],
        c.powers.quirks.includes(OFA_ID) && ['ofa', 'One For All'],
      ].filter(Boolean);
      fill(body, h('div', { class: 'jumpbar' }, parts.map(([key, label]) => h('button', {
        class: 'chip',
        onclick: () => note.refs.jump?.[key]?.scrollIntoView({ block: 'start', behavior: 'smooth' }),
      }, label))));
      pathIntro(scroll, note);
      standSection(scroll, note);
      speedsterSection(scroll, note);
      techniqueSection(scroll, note);
      fruitSection(scroll, note);
      quirkSection(scroll, note);
      fill(body, scroll);
    },
  });
}
