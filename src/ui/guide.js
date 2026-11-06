// The guide: where to start, how each stat grows, every chance in the game, and how breeding works.
// Every page reads its numbers from the data the game itself uses, so it can't drift from the game.

import { rich, glow } from './flair.js';
import { G } from '../state.js';
import { h, fill, button, openNote } from './notes.js';
import { STAT_KEYS, STAT_LABELS, STAT_LIMITS, statSources } from '../core/creature.js';
import { statTable, trainingPlan, unlockNote } from '../core/training.js';
import { chanceSections } from '../core/odds.js';
import { breedingGuide } from '../core/breedguide.js';
import { nextStep } from '../core/advice.js';
import { STAT_GUIDE, BUILD_IDEAS } from '../data/guide.js';
import { MAX_MUTATIONS } from '../data/mutations.js';
import { PATHS, ROOT_PATHS } from '../data/paths.js';
import { TRAITS, STAND_WITS, SPEEDSTER_SPEED, TECHNIQUE_MIGHT } from '../data/powers.js';
import { TEAM_MAX } from '../data/family.js';
import { FRUIT_VIGOR } from '../data/fruits.js';
import { buildCodex } from './codex.js';

const PAGES = [['start', 'Start here'], ['codex', 'Codex'], ['stats', 'Stats'], ['chances', 'Chances'], ['breeding', 'Breeding']];
const SOURCE_LABELS = { start: 'Start', age: 'Age', training: 'Training', mutations: 'Mutations', food: 'Food', colors: 'Colors', job: 'Job', powers: 'Powers', charms: 'Charms', trophies: 'Trophies' };

// page: 'start', 'stats', 'chances' or 'breeding', or a stat, which opens the stats page on it.
export function openGuide(page = 'start') {
  const isStat = STAT_KEYS.includes(page);
  const state = { page: isStat ? 'stats' : page, stat: isStat ? page : null };
  openNote('guide', {
    title: 'Guide',
    width: state.page === 'codex' ? 440 : 384,
    build(body, note) {
      const c = G.creature;
      if (!c && state.page === 'stats') state.page = 'start';
      // The Codex has more to show side by side.
      note.el.style.width = state.page === 'codex' ? '440px' : '384px';
      fill(body, h('div', { class: 'tabs' }, PAGES.filter(([id]) => id !== 'stats' || c).map(([id, label]) => button(label, () => {
        state.page = id;
        note.rebuild();
      }, state.page === id ? 'hot' : ''))));
      if (state.page === 'stats') buildStats(body, note, c, state);
      else if (state.page === 'chances') buildChances(body, c);
      else if (state.page === 'breeding') buildBreeding(body);
      else if (state.page === 'codex') buildCodex(body, note, state);
      else buildStart(body, c);
    },
  });
}

// The "?" on any note opens the guide on the page for it.
G.openHelp = (page) => openGuide(page);

const go = (label, what) => button(label, () => G.open?.(what), 'mini');

// ---------- start here ----------

function buildStart(body, c) {
  const finals = Object.values(PATHS).filter((n) => n.tier === 3).length;
  const jobs = ROOT_PATHS.map((id) => PATHS[id].name);
  const tip = c && nextStep(c, { out: G.team.length, home: G.village.length, away: G.house.expeditions.length });
  const steps = [
    ['1. Feed it', 'Snacks are free and make it grow. Food from your farms is the only thing that grows mutations.', [['Feed', 'feed']]],
    ['2. Give it a job', `Once it is a Sprout, pick ${jobs.slice(0, -1).join(', ')} or ${jobs[jobs.length - 1]}. Each job splits twice, into ${finals} final forms in all.`, []],
    ['3. Mine and farm', 'Mining digs real colors off your screen. Colors, gems and harvests go into one pool that all your creatures share, to spend in the workshop or eat.', [['Mine colors', 'mine'], ['Farm', 'farm'], ['Workshop', 'workshop']]],
    ['4. Powers', `At ${STAND_WITS} Wits a Stand, at ${SPEEDSTER_SPEED} Speed speedster powers, at ${TECHNIQUE_MIGHT} Might its family's cursed technique. It gets one, unless a Legendary mutation makes room for two. Or, at ${FRUIT_VIGOR} Vigor, it can eat a Devil Fruit instead of all of them. Quirks cost max HP, and go with anything.`, [['Powers', 'powers']]],
    ['5. Fight', 'Training monsters can\'t kill it. Deadly ones can, forever. Adventure is a 20-level campaign for a party of three where nobody can die. The battle plan decides how it fights.', [['Adventure', 'adventure'], ['Challenges', 'challenges'], ['Battle plan', 'plan'], ['Arena', 'arena']]],
    ['6. Your village', `Up to ${TEAM_MAX} mains are out on your screen. Everyone else lives in the village and works for the pool you all share. Legendary Miners dig ore in the Legendary Mine for the forge, and parties go on expeditions for gems and loot.`, [['Village', 'village'], ['Legendary Mine', 'mine'], ['Expeditions', 'expeditions']]],
    ['7. More creatures', 'The Nursery is where they come from: breed two and choose what the egg gets, or hatch eggs until you like one. Its Items tab uses the loot Adventure and expeditions bring home. Your creatures shows everyone at once.', [['Nursery', 'nursery'], ['Eggs', 'nursery:eggs'], ['Your creatures', 'creatures']]],
  ];
  fill(body,
    h('div', { class: 'small', style: 'margin-top:5px' }, 'Click a creature on your screen, or its taskbar button, for its menu. The ? on any panel opens this guide on the page for it.'),
    tip && h('div', { class: `tip${G.settings.calm ? '' : ' loud'}` }, h('div', { class: 'grow' }, h('b', null, `Next for ${c.name}: `), rich(tip.text)), tip.go && glow(go('Go', tip.go))),
    h('div', { class: 'ways', style: 'max-height:440px' }, steps.map(([title, text, links]) => h('div', { class: 'way' },
      h('div', { class: 'top' }, title),
      h('div', { class: 'small' }, text),
      links.length > 0 && h('div', { class: 'row', style: 'margin-top:3px' }, links.map(([label, what]) => go(label, what)))))),
  );
}

// ---------- stats ----------

function buildStats(body, note, c, state) {
  state.stat ??= statTable(c)[0].stat;
  const table = statTable(c);
  const row = table.find((t) => t.stat === state.stat);
  const sources = statSources(c);
  const words = STAT_GUIDE[state.stat];
  const unlock = unlockNote(c, state.stat);
  fill(body,
    h('div', { class: 'small', style: 'margin-top:5px' }, `No creature can be great at everything. Its best stat can reach ${STAT_LIMITS[0]}, its second ${STAT_LIMITS[1]}, third ${STAT_LIMITS[2]}, fourth ${STAT_LIMITS[3]}, and its worst ${STAT_LIMITS[4]}. It can hold ${MAX_MUTATIONS} mutations. So choose what it's for.`),
    h('div', { class: 'tabs subtabs' }, STAT_KEYS.map((k) => button(STAT_LABELS[k], () => {
      state.stat = k;
      note.rebuild();
    }, k === state.stat ? 'hot' : ''))),
    h('div', { class: 'nameline', style: 'margin-top:6px' }, `${STAT_LABELS[state.stat]} ${row.value}`),
    h('div', { class: 'small' }, `${words.does} Right now this is ${row.rankWord}, so it can reach ${row.limit}.${row.atLimit ? ' It has hit that limit, so more of this does nothing until it moves up a place.' : ''}`),
    unlock && h('div', { class: 'small', style: 'font-weight:600' }, unlock),
    h('div', { class: 'chips', style: 'margin-top:5px' }, Object.entries(SOURCE_LABELS)
      .filter(([key]) => sources[key] && sources[key][state.stat] !== 0)
      .map(([key, label]) => h('span', { class: 'chip' }, `${label} +${sources[key][state.stat]}`))),
    h('div', { class: 'sect' }, 'How to raise it'),
    h('div', { class: 'ways' }, trainingPlan(c, state.stat).map((way) => h('div', { class: `way ${way.done ? 'done' : ''}` },
      h('div', { class: 'top' }, way.title, way.have > 0 && h('span', null, `+${way.have} so far`)),
      h('div', { class: 'small' }, way.detail)))),
    h('div', { class: 'sect' }, 'Build ideas'),
    h('div', { class: 'ideas small' }, BUILD_IDEAS.map((idea) => h('div', null, h('b', null, `${idea.name}: `), idea.text))),
  );
}

// ---------- chances, and breeding ----------

function rowsOf(sections, height) {
  return h('div', { class: 'ways', style: `max-height:${height}px` }, sections.map((section) => [
    h('div', { class: 'sect', style: 'margin-top:4px' }, section.title),
    section.rows.map((row) => h('div', { class: 'way' },
      h('div', { class: 'top' }, `${row.name}${row.has ? ' (it has this)' : ''}`, row.odds && h('span', null, row.odds)),
      h('div', { class: 'small' }, rich(row.detail)))),
  ]));
}

function buildChances(body, c) {
  fill(body,
    h('div', { class: 'small', style: 'margin-top:5px' }, 'How likely things are, straight from the numbers the game uses.'),
    c && h('div', { class: 'small', style: 'font-weight:600' }, c.traits.length
      ? `${c.name} was born with ${c.traits.map((id) => TRAITS[id].name).join(' and ')}.`
      : `${c.name} was born with no gift.`),
    rowsOf(chanceSections(c), 440),
  );
}

function buildBreeding(body) {
  fill(body,
    h('div', { class: 'small', style: 'margin-top:5px' }, 'Two of your creatures make an egg, and you choose what it gets from each. Nothing in breeding is left to luck.'),
    h('div', { class: 'row', style: 'margin-top:3px' }, go('Breed', 'nursery'), go('Hatch an egg', 'nursery:eggs'), go('Items', 'items')),
    rowsOf(breedingGuide(), 440),
  );
}
