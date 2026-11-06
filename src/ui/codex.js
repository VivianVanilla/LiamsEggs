// The Codex: the whole game written down, one page of the guide. Every race, the job tree with all
// its branches, every gift, mutation, power, weapon, item and monster, and the Adventure map. Every
// word and number comes straight from the data the game itself uses, so it can't fall out of date.

import { h, fill } from './notes.js';
import { statText, perkText, describeMove } from '../core/sheet.js';
import { STAT_LABELS, STAT_LIMITS, TRAINING_LIMIT } from '../core/creature.js';
import { RACES, RACE_IDS, PURE_BLOOD_CHANCE } from '../data/races.js';
import { PATHS, ROOT_PATHS, ABILITIES, TIER_XP } from '../data/paths.js';
import {
  TRAITS, BORN_TRAIT_IDS, BRED_TRAIT_IDS, BRED_RULES, EARNED_TRAIT_IDS, TRAIT_ODDS, EARN_RULES, STANDS, STAND_IDS, STAND_WITS, TECHNIQUES, TECHNIQUE_IDS, TECHNIQUE_MIGHT,
  QUIRKS, QUIRK_IDS, MAX_HP_GIVEN, SPEEDSTER, SPEEDSTER_SPEED, LEGENDARY, SIX_EYES_FAMILY,
} from '../data/powers.js';
import { FRUITS, FRUIT_IDS, FRUIT_VIGOR } from '../data/fruits.js';
import { MUTATIONS, MUTATION_IDS, MUTATION_THRESHOLDS, MAX_MUTATIONS, FAMILY_ABILITY } from '../data/mutations.js';
import { FOODS, FOOD_ORDER } from '../data/foods.js';
import { CROPS, CROP_IDS, CHARMS, CHARM_IDS, PAINTS, PAINT_IDS } from '../data/crafting.js';
import { WEAPONS, WEAPON_IDS } from '../data/forge.js';
import { ITEMS, ITEM_IDS, EXPANDER_SLOTS } from '../data/items.js';
import { DEADLY_MONSTERS, DEADLY_IDS, ULTIMATE_IDS, TRAINING_MONSTERS, TRAINING_IDS, TROPHY_POINTS, REBORN } from '../data/monsters.js';
import { bredRuleText } from '../core/family.js';
import { ADVENTURE_LEVELS, ADVENTURE_BOSSES, ADVENTURE_PRIZES, ADVENTURE_ARMED } from '../data/adventure.js';
import { EXPEDITIONS, EXPEDITION_IDS, LEGENDARY_MINE } from '../data/village.js';

export const CODEX_PAGES = [
  ['races', 'Races'], ['jobs', 'Jobs'], ['gifts', 'Gifts'], ['mutations', 'Mutations'], ['powers', 'Powers'],
  ['gear', 'Gear & loot'], ['monsters', 'Monsters'], ['adventure', 'Adventure'],
];

const pct = (v) => `${Math.round(v * 100)}%`;
const fine = (v) => `${Number((v * 100).toFixed(v < 0.1 ? 1 : 0))}%`;
const moveName = (id) => ABILITIES[id]?.name ?? id;
const moveLine = (id) => (ABILITIES[id] ? `${ABILITIES[id].name}: ${describeMove(ABILITIES[id])}` : '');
const costText = (cost) => Object.entries(cost).map(([k, v]) => `${v} ${k}`).join(', ');

// One entry: a colored card with a name, a tag on the right, and lines under it.
function card(name, color, tag, ...lines) {
  return h('div', { class: 'cx-card', style: `--c:${color ?? '#8a8070'}` },
    h('div', { class: 'cx-top' }, h('span', { class: 'cx-name' }, name), tag && h('span', { class: 'cx-tag' }, tag)),
    lines.flat().filter(Boolean).map((l) => (l.nodeType ? l : h('div', { class: 'cx-line' }, l))));
}

// A few words in bold, then the rest of the line.
const said = (label, text) => text && h('div', { class: 'cx-line' }, h('b', null, `${label}: `), text);
const intro = (text) => h('div', { class: 'small cx-intro' }, text);
const head = (text) => h('div', { class: 'cx-head' }, text);

export function buildCodex(body, note, state) {
  state.codex = state.codex ?? 'races';
  fill(body, h('div', { class: 'cx-nav' }, CODEX_PAGES.map(([id, label]) => h('button', {
    class: `chip${state.codex === id ? ' on' : ''}`,
    onclick: () => {
      state.codex = id;
      note.rebuild();
    },
  }, label))));
  const page = h('div', { class: 'cx-page scrollnote' });
  fill(body, page);
  ({ races, jobs, gifts, mutations, powers, gear, monsters, adventure }[state.codex] ?? races)(page);
}

// ---------- races ----------

function races(page) {
  fill(page,
    intro(`Every creature is born into a race, and most are Human. A bred baby is half of each parent's races, down to quarters. Each race gives its share of its stats; at half or more it also brings its move, its passive and its specialty. 1 in ${Math.round(1 / PURE_BLOOD_CHANCE)} babies of mixed race is born a Pure-blood, with every race at full power.`),
    RACE_IDS.filter((id) => id !== 'halfdevil').map((id) => {
      const r = RACES[id];
      return card(r.name, r.color, r.size ? (r.size > 1 ? 'big' : 'small') : null,
        h('div', { class: 'cx-blurb' }, r.blurb),
        said('Stats', Object.keys(r.stats).length ? statText(r.stats) : 'no change'),
        r.move && said('Move', moveLine(r.move)),
        r.passive && said('In a fight', r.passive.text),
        r.village && said('At home', r.village.text),
        said('Where from', r.from));
    }),
  );
}

// ---------- jobs ----------

function jobNode(id, depth) {
  const n = PATHS[id];
  const tierWord = ['', 'Job', `After ${TIER_XP[2]} XP`, `Final form, after ${TIER_XP[3]} XP`][n.tier];
  return h('div', { class: `cx-node tier${n.tier}` },
    h('div', { class: 'cx-top' }, h('span', { class: 'cx-name' }, n.name), h('span', { class: 'cx-tag' }, tierWord)),
    h('div', { class: 'cx-blurb' }, n.blurb),
    said('Stats', statText(n.stats ?? {})),
    n.perk && said('Perk', perkText(n.perk)),
    n.ability && said('Signature move', moveLine(n.ability)),
    n.kids && h('div', { class: 'cx-kids' }, n.kids.map((kid) => jobNode(kid, depth + 1))));
}

function jobs(page) {
  fill(page,
    intro(`Once it is a Sprout it picks one of ${ROOT_PATHS.length} jobs, and its job is how it levels up. Each job splits twice, so there are ${Object.values(PATHS).filter((n) => n.tier === 3).length} final forms in all. Every choice is forever. A Miner in its final form can also work the Legendary Mine in the village, for ${LEGENDARY_MINE.ore} Legendary ore an hour.`),
    ROOT_PATHS.map((id) => h('div', { class: 'cx-tree' }, jobNode(id, 0))),
  );
}

// ---------- gifts ----------

function gifts(page) {
  fill(page,
    intro('Born-with gifts come from the egg, and a parent can pass them on. A few only ever wake up in a bred baby. Earned gifts come from what a creature does, and stay with it. Being reborn can take any of them from another creature.'),
    head('Born with'),
    BORN_TRAIT_IDS.map((id) => card(TRAITS[id].name, TRAITS[id].color,
      id === 'sixeyes' ? `1 in ${TRAIT_ODDS[id]} ${TECHNIQUES[SIX_EYES_FAMILY].family}` : `1 in ${TRAIT_ODDS[id]}`,
      h('div', { class: 'cx-blurb' }, TRAITS[id].blurb))),
    head('Awakened by breeding'),
    BRED_TRAIT_IDS.map((id) => card(TRAITS[id].name, TRAITS[id].color, `1 in ${BRED_RULES[id].oneIn} bred`,
      h('div', { class: 'cx-blurb' }, TRAITS[id].blurb),
      said('How', `${bredRuleText(id)} Then 1 baby in ${BRED_RULES[id].oneIn} awakens it, and it passes on from there.`))),
    head('Earned'),
    EARNED_TRAIT_IDS.map((id) => card(TRAITS[id].name, TRAITS[id].color, 'earned',
      h('div', { class: 'cx-blurb' }, TRAITS[id].blurb),
      said('How', EARN_RULES[id].how))),
  );
}

// ---------- mutations ----------

function mutations(page) {
  fill(page,
    intro(`Only farmed food grows mutations. The first from one kind of plant grows after ${MUTATION_THRESHOLDS[0]} of them, the next after ${MUTATION_THRESHOLDS.slice(1).join(', ')} in all, and which one is a surprise. It can hold ${MAX_MUTATIONS}, or ${EXPANDER_SLOTS} more for each Limit Expander. Two from one family teach that family's move.`),
    FOOD_ORDER.map((fam) => {
      const crop = CROP_IDS.find((id) => CROPS[id].family === fam);
      const list = MUTATION_IDS.filter((id) => MUTATIONS[id].family === fam);
      return card(`${FOODS[fam].label} family`, FOODS[fam].color, FOODS[fam].stat ? STAT_LABELS[FOODS[fam].stat] : 'no stat',
        said('Grown from', crop ? CROPS[crop].name : FOODS[fam].label),
        FAMILY_ABILITY[fam] && said('Two of them teach', moveLine(FAMILY_ABILITY[fam])),
        h('div', { class: 'cx-grid' }, list.map((id) => h('div', { class: 'cx-mini' }, h('b', null, MUTATIONS[id].name), h('span', null, statText(MUTATIONS[id].stats))))));
    }),
    head('Legendary mutations'),
    Object.values(LEGENDARY).map((l) => card(l.name, l.color, 'legendary', h('div', { class: 'cx-blurb' }, l.blurb), said('Stats', statText(l.stats)))),
  );
}

// ---------- powers ----------

function powers(page) {
  fill(page,
    intro(`A creature can hold one of a Stand, speedster powers, a cursed technique or a Devil Fruit, or two with a Legendary mutation. Quirks are bought with max HP instead, up to ${MAX_HP_GIVEN}%, and go with anything.`),
    head(`Stands, at ${STAND_WITS} Wits`),
    STAND_IDS.map((id) => card(STANDS[id].name, STANDS[id].color, STAT_LABELS[STANDS[id].lean] ?? null,
      h('div', { class: 'cx-blurb' }, STANDS[id].blurb), said('Stats', statText(STANDS[id].stats)), said('Moves', STANDS[id].moves.map(moveName).join(', ')))),
    head(`Speedster, at ${SPEEDSTER_SPEED} Speed`),
    card('Speedster', '#ffb347', null, said('Stats', statText(SPEEDSTER.stats)), said('Move', moveLine(SPEEDSTER.move)),
      `Runs ${SPEEDSTER.walkMul} times as fast and digs ${SPEEDSTER.mineSpeed} times as fast, and gets ${SPEEDSTER.hungerMul} times as hungry. In a fight it moves and swings faster and dodges more.`),
    head(`Cursed techniques, at ${TECHNIQUE_MIGHT} Might: one for each family`),
    TECHNIQUE_IDS.map((id) => card(TECHNIQUES[id].name, TECHNIQUES[id].color, `the ${TECHNIQUES[id].family} family`,
      h('div', { class: 'cx-blurb' }, TECHNIQUES[id].blurb), said('Stats', statText(TECHNIQUES[id].stats ?? {})), said('Moves', TECHNIQUES[id].moves.map(moveName).join(', ')))),
    head(`Devil Fruits, at ${FRUIT_VIGOR} Vigor`),
    FRUIT_IDS.map((id) => card(FRUITS[id].name, FRUITS[id].color, FRUITS[id].type,
      h('div', { class: 'cx-blurb' }, FRUITS[id].blurb), said('Stats', statText(FRUITS[id].stats)), said('Moves', FRUITS[id].moves.map(moveName).join(', ')))),
    head('Quirks, for max HP'),
    QUIRK_IDS.map((id) => card(QUIRKS[id].name, QUIRKS[id].color, `${QUIRKS[id].cost}% of max HP`,
      h('div', { class: 'cx-blurb' }, QUIRKS[id].blurb), said('Stats', statText(QUIRKS[id].stats)), said('Move', moveLine(QUIRKS[id].move)))),
  );
}

// ---------- gear and loot ----------

function gear(page) {
  fill(page,
    head('Weapons, from the forge'),
    intro('Forged from Legendary ore and gems in each creature\'s Workshop. A creature carries one at a time.'),
    WEAPON_IDS.map((id) => card(WEAPONS[id].name, WEAPONS[id].color, `${WEAPONS[id].ore} ore, ${WEAPONS[id].gems} gems`, `It ${WEAPONS[id].text}.`)),
    head('Charms'),
    intro('Crafted once and kept. It can wear two, and they count toward its stat limits.'),
    h('div', { class: 'cx-grid' }, CHARM_IDS.map((id) => h('div', { class: 'cx-mini' }, h('b', null, CHARMS[id].name), h('span', null, `${statText(CHARMS[id].stats)}. ${costText(CHARMS[id].cost)}`)))),
    head('Paints, for one fight'),
    h('div', { class: 'cx-grid' }, PAINT_IDS.map((id) => h('div', { class: 'cx-mini' }, h('b', null, PAINTS[id].name), h('span', null, `It ${PAINTS[id].text}. ${costText(PAINTS[id].cost)}`)))),
    head('Loot'),
    ITEM_IDS.map((id) => card(ITEMS[id].name, ITEMS[id].color, 'loot', h('div', { class: 'cx-blurb' }, ITEMS[id].text),
      said('From', `Adventure, and expeditions: ${EXPEDITION_IDS.map((w) => `${EXPEDITIONS[w].name.toLowerCase()} ${fine(EXPEDITIONS[w].items[id])}`).join(', ')}.`))),
  );
}

// ---------- monsters ----------

function monsters(page) {
  const stats = (s) => Object.entries(s).map(([k, v]) => `${STAT_LABELS[k]} ${v}`).join(', ');
  fill(page,
    head('Training monsters'),
    intro('They match its strength and can\'t kill it. A win has a chance of +1 to the stat each one trains.'),
    h('div', { class: 'cx-grid' }, TRAINING_IDS.map((id) => h('div', { class: 'cx-mini' }, h('b', null, TRAINING_MONSTERS[id].name), h('span', null, `trains ${STAT_LABELS[TRAINING_MONSTERS[id].stat]}`)))),
    head('Deadly monsters'),
    intro(`A fight to the death: lose and it is gone forever. Each one beaten is a trophy: +${TROPHY_POINTS} to a stat, and to that stat's limit.`),
    DEADLY_IDS.map((id) => monsterCard(id, stats)),
    head('Ultimate monsters'),
    intro(`They come out once a creature has beaten every deadly monster, and they kill just the same. Beat all ${ULTIMATE_IDS.length} and it can be reborn: it absorbs one of your creatures, takes up to ${REBORN.takes} of its gifts, and starts over as a Hatchling with nothing but its gifts.`),
    ULTIMATE_IDS.map((id) => monsterCard(id, stats)),
  );
}

function monsterCard(id, stats) {
  const m = DEADLY_MONSTERS[id];
  return card(m.name, m.legendary ? '#ffd24a' : m.ultimate ? '#8a3bd6' : '#c2412b', `trophy: ${STAT_LABELS[m.trophy]}`,
    said('Stats', stats(m.stats)), m.moves.length > 0 && said('Moves', m.moves.map(moveName).join(', ')));
}

// ---------- adventure ----------

function adventure(page) {
  fill(page,
    intro(`${ADVENTURE_LEVELS.length} levels in two acts, for a party of three. Nobody can die. From level ${ADVENTURE_ARMED} the enemy carries forged weapons. The first win of each level pays gems, and some pay more.`),
    ADVENTURE_LEVELS.map((lv, i) => {
      const n = i + 1;
      const boss = ADVENTURE_BOSSES[n];
      const prize = ADVENTURE_PRIZES[n];
      const bits = prize && [prize.gems && `${prize.gems} gems`, prize.ore && `${prize.ore} ore`, ...Object.entries(prize.items ?? {}).map(([id, k]) => `${k > 1 ? `${k} ` : ''}${ITEMS[id].name}`), prize.found && `a ${RACES[prize.found].name} joins you`].filter(Boolean);
      return h('div', { class: `cx-level${boss ? ' boss' : ''}` },
        h('b', null, `${n}. ${lv.name}`),
        boss && h('span', { class: 'badge boss' }, boss.name ?? DEADLY_MONSTERS[boss.monster].name),
        bits?.length > 0 && h('span', { class: 'small' }, ` ${bits.join(', ')}`));
    }),
    h('div', { class: 'small', style: 'margin-top:6px' }, `Limits: a stat can reach ${STAT_LIMITS[0]} at best, and work and monsters can add up to +${TRAINING_LIMIT} to one.`),
  );
}
