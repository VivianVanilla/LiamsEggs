// What the training guide says for one creature and one stat. No DOM here, so tests can read it.
// Everything is worked out from the same tables and sources the game itself uses.

import { computeStats, statSources, statLimits, rawStats, stageIndex, stageOf, mutationsFull, mutationCap, lineageOf, lastName, STAGES, STAT_LABELS, TRAINING_LIMIT } from './creature.js';
import { STAT_GUIDE } from '../data/guide.js';
import { FOODS } from '../data/foods.js';
import { MUTATIONS, MUTATION_IDS } from '../data/mutations.js';
import { PATHS } from '../data/paths.js';
import { TRAINING_MONSTERS, DEADLY_IDS, ULTIMATE_IDS, DEADLY_MONSTERS, TRAINING_CHANCE, TROPHY_POINTS, LEGEND_WINS_FOR_ULTIMATE } from '../data/monsters.js';
import { ultimatesOpen } from './reborn.js';
import { STAND_WITS, SPEEDSTER_SPEED, TECHNIQUE_MIGHT, TECHNIQUES } from '../data/powers.js';
import { CHARMS, CHARM_IDS, CROPS, CROP_IDS } from '../data/crafting.js';

const RANK_WORDS = ['its best stat', 'its 2nd best', 'its 3rd best', 'its 4th best', 'its worst'];

// Its stats from best to worst, each with its value and its limit right now.
export function statTable(c) {
  const raw = rawStats(c);
  const limits = statLimits(c, raw);
  const stats = computeStats(c);
  return Object.keys(stats)
    .sort((a, b) => raw[b] - raw[a] || Object.keys(stats).indexOf(a) - Object.keys(stats).indexOf(b))
    .map((stat, rank) => ({ stat, value: stats[stat], limit: limits[stat], raw: raw[stat], rank, rankWord: RANK_WORDS[rank], atLimit: raw[stat] > limits[stat] }));
}

// Every job it could still take, with what each adds to this stat.
export function jobsAhead(c) {
  const last = c.path.line[c.path.line.length - 1];
  const found = [];
  const walk = (ids) => ids.forEach((id) => {
    found.push(id);
    walk(PATHS[id].kids ?? []);
  });
  walk(last ? PATHS[last].kids ?? [] : Object.keys(PATHS).filter((id) => PATHS[id].tier === 1));
  return found;
}

// The ways to raise a stat, in the order worth trying them. Each row: { title, detail, have, done }.
export function trainingPlan(c, stat) {
  const guide = STAT_GUIDE[stat];
  const label = STAT_LABELS[stat];
  const sources = statSources(c);
  const rows = [];

  const plant = CROPS[CROP_IDS.find((id) => CROPS[id].family === guide.food)];
  rows.push({
    title: `Feed it ${plant.name}`,
    detail: `Set a field to grow it in the Farm, then feed it from Feed. Every 4 is +1 ${label}, and they grow ${plant.grows}.`,
    have: sources.food[stat],
  });

  rows.push({
    title: `Mine ${guide.colors}`,
    detail: `Each shade counts on its own: +1 at 16 units, +2 at 64, +3 at 144. A gem is worth 18 units.`,
    have: sources.colors[stat],
  });

  const trained = sources.training[stat];
  const full = trained >= TRAINING_LIMIT;
  const charms = CHARM_IDS.filter((id) => CHARMS[id].stats[stat]).sort((a, b) => CHARMS[b].stats[stat] - CHARMS[a].stats[stat]);
  const monster = TRAINING_MONSTERS[guide.monster];
  if (guide.work) {
    rows.push({
      title: guide.work,
      detail: `Work that matches its job trains about 2.5 times faster. Work and monsters share one limit of +${TRAINING_LIMIT}.`,
      have: trained,
      done: full,
    });
  }
  rows.push({
    title: `Beat the ${monster.name}`,
    detail: `From Challenges. It can't die here. Each win has a ${Math.round(TRAINING_CHANCE * 100)}% chance of +1 ${label}.${guide.work ? '' : ` Nothing else trains ${label}.`}`,
    done: full,
  });

  rows.push({
    title: 'Wear a charm',
    detail: `Crafted from mined colors in the workshop: ${charms.map((id) => `${CHARMS[id].name} +${CHARMS[id].stats[stat]}`).join(', ')}. It can wear two.`,
    have: sources.charms[stat],
  });

  const jobs = jobsAhead(c)
    .filter((id) => PATHS[id].stats?.[stat])
    .sort((a, b) => PATHS[b].stats[stat] - PATHS[a].stats[stat])
    .slice(0, 5);
  if (jobs.length) {
    rows.push({
      title: 'Jobs ahead',
      detail: jobs.map((id) => `${PATHS[id].name} +${PATHS[id].stats[stat]}`).join(', '),
      have: sources.job[stat],
    });
  } else if (sources.job[stat]) {
    rows.push({ title: 'Its job', detail: 'No job ahead of it adds any more.', have: sources.job[stat], done: true });
  }

  const owned = new Set(c.mutations.map((m) => m.id));
  const mutations = MUTATION_IDS
    .filter((id) => MUTATIONS[id].stats[stat] > 0 && !owned.has(id))
    .sort((a, b) => MUTATIONS[b].stats[stat] - MUTATIONS[a].stats[stat])
    .slice(0, 4);
  rows.push({
    title: `Mutations (${c.mutations.length} of ${mutationCap(c)})`,
    detail: mutationsFull(c)
      ? 'It has no room left for another. A Limit Expander, from Adventure or an expedition, makes room for 2 more.'
      : `What it eats decides the kind, and which one of that kind is a surprise. Could still grow: ${mutations.map((id) => `${MUTATIONS[id].name} +${MUTATIONS[id].stats[stat]} (${FOODS[MUTATIONS[id].family].label})`).join(', ')}.`,
    have: sources.mutations[stat],
    done: mutationsFull(c),
  });

  const stage = stageIndex(c);
  rows.push({
    title: 'Growing up',
    detail: stage === STAGES.length - 1
      ? 'It is fully grown.'
      : `Every new stage adds +2 to every stat, and snacks get it there. It is a ${stageOf(c).name}, next is ${STAGES[stage + 1].name}.`,
    have: sources.age[stat],
    done: stage === STAGES.length - 1,
  });

  // The ultimate monsters give trophies too, once they are out.
  const trophies = [...DEADLY_IDS, ...ULTIMATE_IDS].filter((id) => DEADLY_MONSTERS[id].trophy === stat);
  const left = trophies.filter((id) => !c.trophies.includes(id));
  const nowLeft = left.filter((id) => !DEADLY_MONSTERS[id].ultimate || ultimatesOpen(c));
  rows.push({
    title: 'Trophies',
    detail: `The only way past a limit: +${TROPHY_POINTS} ${label} and +${TROPHY_POINTS} to its limit. ${nowLeft.length ? `Beat ${nowLeft.map((id) => DEADLY_MONSTERS[id].name).join(' or ')}, and it dies forever if it loses.${nowLeft.length < left.length ? ` More come out once it wins ${LEGEND_WINS_FOR_ULTIMATE} on the Legendary road.` : ''}` : 'It has beaten every monster that gives one.'}`,
    have: sources.trophies[stat],
    done: !left.length,
  });

  return rows;
}

// What a stat unlocks, as a sentence, if anything.
export function unlockNote(c, stat) {
  const { unlocks } = STAT_GUIDE[stat];
  if (unlocks === 'stand') {
    return c.powers.stand ? 'It already has its Stand.' : `At ${STAND_WITS} Wits it can awaken a Stand. That takes a place in its top three stats.`;
  }
  if (unlocks === 'speedster') {
    return c.powers.speedster ? 'It is already a speedster.' : `At ${SPEEDSTER_SPEED} Speed it can become a speedster. That takes a place in its top three stats.`;
  }
  if (unlocks === 'technique') {
    return c.powers.technique ? `It already has ${TECHNIQUES[c.powers.technique].name}.` : `At ${TECHNIQUE_MIGHT} Might it can awaken its family's technique, the ${lastName(c)} ${TECHNIQUES[lineageOf(c)].name}. That takes a place in its top three stats.`;
  }
  return null;
}
