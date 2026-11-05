// The battle plan note: every move it knows, and how it should behave in a fight.

import { G, saveCreature } from '../state.js';
import { h, fill, button, openNote } from './notes.js';
import { STANCES, STANCE_IDS, HURT_PLANS, TARGET_PLANS } from '../data/battle.js';
import { moveList } from '../core/sheet.js';
import { practiceStances } from '../sim/practice.js';

// A row of buttons that choose one setting.
function chooser(table, value, onPick) {
  return h('div', { class: 'tabs' }, Object.keys(table).map((id) => button(table[id].name, () => onPick(id), id === value ? 'hot' : '')));
}

// The creature's own fighter in this bout, if it is in it.
const ownFighter = (bout) => bout?.fighters.find((f) => f.c && f.c.id === G.creature?.id && f.alive);

// Lets you shout a new stance at it mid-fight. This only lasts for this fight.
export function coachRow(note) {
  const own = ownFighter(G.bout);
  if (!own || G.bout.done) return null;
  return [
    h('div', { class: 'small', style: 'margin-top:6px' }, 'Shout at it:'),
    chooser(STANCES, own.plan.stance, (id) => {
      own.plan.stance = id;
      note.rebuild();
    }),
  ];
}

export function openPlan() {
  const c = G.creature;
  if (!c) return;
  const state = { practice: null };
  openNote('plan', {
    title: `${c.name}'s battle plan`,
    width: 376,
    build(body, note) {
      const set = (key, value) => {
        c.battle[key] = value;
        state.practice = null;
        saveCreature();
        note.rebuild();
      };
      const moves = moveList(c);
      const far = moves.filter((m) => m.on && m.range === 'far').length;
      const near = moves.filter((m) => m.on && m.range === 'near').length;
      fill(body,
        h('div', { class: 'sect', style: 'margin-top:0' }, 'How it fights'),
        chooser(STANCES, c.battle.stance, (id) => set('stance', id)),
        h('div', { class: 'small', style: 'margin-top:3px' }, STANCES[c.battle.stance].blurb),
        h('div', { class: 'sect' }, 'When it is hurt'),
        chooser(HURT_PLANS, c.battle.hurt, (id) => set('hurt', id)),
        h('div', { class: 'small', style: 'margin-top:3px' }, HURT_PLANS[c.battle.hurt].blurb),
        h('div', { class: 'sect' }, 'Who it goes for'),
        chooser(TARGET_PLANS, c.battle.target, (id) => set('target', id)),
        h('div', { class: 'small', style: 'margin-top:3px' }, TARGET_PLANS[c.battle.target].blurb),
        h('div', { class: 'row gap' }, button('Try each stance in practice', () => {
          state.practice = practiceStances(c);
          note.rebuild();
        })),
        state.practice && h('div', { class: 'small', style: 'margin-top:3px' },
          `Out of 16 practice fights against a rival about its size: ${STANCE_IDS.map((id) => `${STANCES[id].name} won ${Math.round(state.practice[id] * 16)}`).join(', ')}.`),
        h('div', { class: 'sect' }, `Its moves (${moves.length})`),
        moves.length === 0
          ? h('div', { class: 'small' }, 'None yet. Two mutations from one kind of food teach a move, and so do final jobs, Stands, Quirks and being a speedster.')
          : h('div', { class: 'small' }, `${far} work from mid range, and ${near} need it close.`),
        h('div', { class: 'ways', style: 'max-height:260px' }, moves.map((m) => h('div', { class: `way ${m.on ? '' : 'done'}` },
          h('div', { class: 'top' }, m.name, button(m.on ? 'On' : 'Off', () => {
            c.battle.off = m.on ? [...c.battle.off, m.id] : c.battle.off.filter((id) => id !== m.id);
            state.practice = null;
            saveCreature();
            note.rebuild();
          }, m.on ? 'hot mini' : 'mini')),
          h('div', { class: 'small' }, m.what),
          h('div', { class: 'small' }, `${m.rangeWord}. From ${m.from}.`)))),
      );
    },
  });
}
