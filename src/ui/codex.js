// The Codex: the whole game written down, one page of the guide. Every race, the job tree with all
// its branches, every gift, mutation, power, weapon, item and monster, and the Adventure map. Every
// word and number comes straight from the data the game itself uses, so it can't fall out of date.

import { h, fill } from './notes.js';
import { statText, perkText, describeMove } from '../core/sheet.js';
import { STAT_LABELS, STAT_LIMITS, TRAINING_LIMIT, slotTakes } from '../core/creature.js';
import { RACES, RACE_IDS, PURE_BLOOD_CHANCE, raceMovesOf } from '../data/races.js';
import {
  CLASSES, CLASS_IDS, SPELL_LEVELS, NEN_TYPES, NEN_HEXAGON, NEN_TECHNIQUES, NEN_TECHNIQUE_IDS, NEN_POINTS, KO, HATSU_FORMS, VOWS, VOW_IDS, MAX_VOWS,
  ALCHEMY_SHAPES, ALCHEMY_ELEMENTS, ALCHEMY_COSTS, MAX_CIRCLES, NEG_LEVELS, NEG_BOSSES, NEG_SCALE, ABILITY_KEYS, ABILITY_LABELS, ABILITY_TEXT,
  ELITE_LEVELS, ELITE_BOSSES, ELITE, ELITE_REWARD, HATSU_LIGHT,
} from '../data/negative.js';
import { AWAKENINGS, AWAKEN_KINDS, ASCENSION_RECIPES, GOD_GUARD, GOD_FULL } from '../data/ascension.js';
import { BOOSTS, DELUXE_BREEDER } from '../data/universe.js';
import { PATHS, ROOT_PATHS, ABILITIES, TIER_XP } from '../data/paths.js';
import {
  TRAITS, BORN_TRAIT_IDS, BRED_TRAIT_IDS, BRED_RULES, EARNED_TRAIT_IDS, TRAIT_ODDS, EARN_RULES, NEG_TRAIT_IDS, NEG_TRAIT_ODDS, HATSU_TRAIT_IDS, POWER_KIND_NAMES, STANDS, STAND_IDS, STAND_WITS, TECHNIQUES, TECHNIQUE_IDS, TECHNIQUE_MIGHT,
  QUIRKS, QUIRK_IDS, MAX_HP_GIVEN, SPEEDSTER, SPEEDSTER_SPEED, LEGENDARY, SIX_EYES_FAMILY,
} from '../data/powers.js';
import { FRUITS, FRUIT_IDS, FRUIT_VIGOR } from '../data/fruits.js';
import { MUTATIONS, MUTATION_IDS, MUTATION_THRESHOLDS, MAX_MUTATIONS, FAMILY_ABILITY } from '../data/mutations.js';
import { FOODS, FOOD_ORDER } from '../data/foods.js';
import { CROPS, CROP_IDS, CHARMS, CHARM_IDS, PAINTS, PAINT_IDS } from '../data/crafting.js';
import { WEAPONS, WEAPON_IDS } from '../data/forge.js';
import { ITEMS, ITEM_IDS, EXPANDER_SLOTS } from '../data/items.js';
import { DEADLY_MONSTERS, DEADLY_IDS, LEGEND_IDS, ULTIMATE_IDS, TRAINING_MONSTERS, TRAINING_IDS, TROPHY_POINTS, REBORN, LEGEND_WINS_FOR_ULTIMATE } from '../data/monsters.js';
import { bredRuleText } from '../core/family.js';
import { ADVENTURE_LEVELS, ADVENTURE_BOSSES, ADVENTURE_PRIZES, ADVENTURE_ARMED, ADVENTURE_SOULS, ADVENTURE_ACTS, ADVENTURE_ELITE, ABYSS_LEVELS, ABYSS_BOSSES, ABYSS, GOD_LEVELS, GOD_BOSSES, GOD } from '../data/adventure.js';
import { EXPEDITIONS, EXPEDITION_IDS, LEGENDARY_MINE } from '../data/village.js';

export const CODEX_PAGES = [
  ['races', 'Races'], ['jobs', 'Jobs'], ['gifts', 'Gifts'], ['mutations', 'Mutations'], ['powers', 'Powers'],
  ['gear', 'Gear & loot'], ['monsters', 'Monsters'], ['adventure', 'Adventure'], ['negative', 'The Negative'],
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
// Which monster gives each Legendary mutation: the only way to get one.
const SOUL_FROM = Object.fromEntries(Object.values(DEADLY_MONSTERS).filter((m) => m.soul)
  .map((m) => [m.soul, `beating ${m.name}${m.road === 'legend' ? ' on the Legendary road' : ''}`]));
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
  ({ races, jobs, gifts, mutations, powers, gear, monsters, adventure, negative }[state.codex] ?? races)(page);
}

// ---------- races ----------

function races(page) {
  fill(page,
    intro(`Every creature is born into a race, and most are Human. A bred baby is half of each parent's races, down to quarters. Each race gives its share of its stats; at half or more it also brings its move, its passive and its specialty. 1 in ${Math.round(1 / PURE_BLOOD_CHANCE)} babies of mixed race is born a Pure-blood, with every race at full power.`),
    head('Born in the light world'),
    RACE_IDS.filter((id) => id !== 'halfdevil' && !RACES[id].negative).map(raceCard),
    head('From the Negative Dimension'),
    intro('Only after a universe reset. Stronger in the light world than any race born there, and the only blood that wounds what lives in Chapter ???. In the Negative itself, each starts with the ability scores shown.'),
    RACE_IDS.filter((id) => RACES[id].negative).map(raceCard),
  );
}

// Everything one race does: its stats, every move, in a fight, at home, and where it comes from.
function raceCard(id) {
  const r = RACES[id];
  const tags = [r.negative && 'Negative', r.size && (r.size > 1 ? 'big' : 'small')].filter(Boolean).join(', ');
  return card(r.name, r.color, tags || null,
    h('div', { class: 'cx-blurb' }, r.blurb),
    said('Stats', Object.keys(r.stats).length ? statText(r.stats) : 'no change'),
    raceMovesOf(id).map((m, i, all) => said(all.length > 1 ? `Move ${i + 1}` : 'Move', moveLine(m))),
    said('In a fight', r.passive?.text ?? 'nothing special, and no weakness either'),
    r.village && said('At home', r.village.text),
    r.neg && said('In the Negative', ABILITY_KEYS.map((k) => `${ABILITY_LABELS[k]} ${r.neg[k]}`).join(', ')),
    said('Where from', r.from));
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
    head('From the Negative'),
    intro('Only an egg of the Negative Dimension hatches with these. A creature keeps them when it crosses over, and in the light world they pass on by breeding like any born-with gift. They work in every fight, in both worlds.'),
    NEG_TRAIT_IDS.map((id) => card(TRAITS[id].name, TRAITS[id].color, `1 in ${NEG_TRAIT_ODDS[id]} of the Negative`,
      h('div', { class: 'cx-blurb' }, TRAITS[id].blurb))),
    head('A Hatsu, carried over'),
    intro(`When a creature crosses over from the Negative, its Hatsu can come with it as a gift in its blood: the Hatsu as a move, at ${HATSU_LIGHT} times its strength and without its vows, and a little of its Nen type in every fight. No egg hatches with one; it passes on by breeding like any born-with gift.`),
    HATSU_TRAIT_IDS.map((id) => card(TRAITS[id].name, TRAITS[id].color, NEN_TYPES[TRAITS[id].nenType].name,
      h('div', { class: 'cx-blurb' }, TRAITS[id].blurb),
      said('Its move', moveLine(TRAITS[id].move)))),
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
    intro('The only way to get one is to beat the monster that gives it, in the Challenges note. A creature holds one, and each Legendary Expander makes room for one more, up to 3. Every creature has one basic slot for a power, which takes any of them; each Legendary mutation adds a Legendary slot, which takes what its soul says. Their slots, stats and fight bonuses all add up.'),
    Object.entries(LEGENDARY).map(([id, l]) => card(l.name, l.color, 'legendary', h('div', { class: 'cx-blurb' }, l.blurb),
      said('Its slot takes', slotTakes(l.slot)), said('Stats', statText(l.stats)), l.passive && said('In a fight', l.passive.text), l.move && said('Its move', moveLine(l.move)), said('From', SOUL_FROM[id] ?? 'nothing yet'))),
  );
}

// ---------- powers ----------

function powers(page) {
  fill(page,
    intro(`A Stand, speedster powers, a cursed technique and a Devil Fruit each fill a slot. A creature has one basic slot, which takes any of them, and each Legendary mutation adds a slot of its own, so with three it can hold all four. Quirks are bought with max HP instead, up to ${MAX_HP_GIVEN}%, and go with anything.`),
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
    WEAPON_IDS.map((id) => card(WEAPONS[id].name, WEAPONS[id].color, `${WEAPONS[id].ore} ore, ${WEAPONS[id].gems.toLocaleString()} gems`, `It ${WEAPONS[id].text}.`)),
    head('Charms'),
    intro('Crafted once and kept. It can wear two, and they count toward its stat limits.'),
    h('div', { class: 'cx-grid' }, CHARM_IDS.map((id) => h('div', { class: 'cx-mini' }, h('b', null, CHARMS[id].name), h('span', null, `${statText(CHARMS[id].stats)}. ${costText(CHARMS[id].cost)}`)))),
    head('Paints, for one fight'),
    h('div', { class: 'cx-grid' }, PAINT_IDS.map((id) => h('div', { class: 'cx-mini' }, h('b', null, PAINTS[id].name), h('span', null, `It ${PAINTS[id].text}. ${costText(PAINTS[id].cost)}`)))),
    head('Loot'),
    ITEM_IDS.filter((id) => !ITEMS[id].awakens).map((id) => card(ITEMS[id].name, ITEMS[id].color, 'loot', h('div', { class: 'cx-blurb' }, ITEMS[id].text),
      said('From', `Adventure, and expeditions: ${EXPEDITION_IDS.map((w) => `${EXPEDITIONS[w].name.toLowerCase()} ${fine(EXPEDITIONS[w].items[id])}`).join(', ')}.`))),
    head('Ascension'),
    intro('Crafted in the Negative from Ascension Stones, which only the Elite Negative pays, and Void Shards. Each one awakens a power for good: more stats, every stat\'s limit higher, the power\'s moves much harder, a new move, and something in every fight.'),
    AWAKEN_KINDS.map((kind) => {
      const a = AWAKENINGS[kind];
      const recipe = ASCENSION_RECIPES[a.item];
      return card(`${ITEMS[a.item].name}: ${a.name}`, a.color, `${recipe.stones} stones, ${recipe.shards} shards`,
        h('div', { class: 'cx-blurb' }, `For ${POWER_KIND_NAMES[kind]}. ${a.blurb}`),
        said('Stats', `${statText(a.stats)}, and every limit +${a.limits}`),
        said('In a fight', a.passive.text),
        said('Its moves', `${a.movePower} times as hard`),
        said('New move', moveLine(a.move)));
    }),
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
    intro(`A fight to the death: lose and it is gone forever. Each one beaten is a trophy: +${TROPHY_POINTS} to a stat, and to that stat's limit. Two of them also give a Legendary mutation.`),
    DEADLY_IDS.map((id) => monsterCard(id, stats)),
    head('Legendary road'),
    intro(`Also to the death, but no trophies: each one gives a Legendary mutation and nothing else. Win any ${LEGEND_WINS_FOR_ULTIMATE} and the ultimate monsters come out.`),
    LEGEND_IDS.map((id) => monsterCard(id, stats)),
    head('Ultimate monsters'),
    intro(`They come out once a creature has won ${LEGEND_WINS_FOR_ULTIMATE} fights on the Legendary road, and they kill just the same. Beat all ${ULTIMATE_IDS.length} and it can be reborn: it absorbs one of your creatures, takes up to ${REBORN.takes} of its gifts, and starts over as a Hatchling with nothing but its gifts. Every time it is reborn, the ultimate monsters come back ${REBORN.harder} times as strong for it again.`),
    ULTIMATE_IDS.map((id) => monsterCard(id, stats)),
  );
}

function monsterCard(id, stats) {
  const m = DEADLY_MONSTERS[id];
  const prize = [m.trophy && `trophy: ${STAT_LABELS[m.trophy]}`, m.soul && LEGENDARY[m.soul].name].filter(Boolean).join(', ');
  return card(m.name, m.soul ? LEGENDARY[m.soul].color : m.ultimate ? '#8a3bd6' : '#c2412b', prize,
    said('Stats', stats(m.stats)), m.moves.length > 0 && said('Moves', m.moves.map(moveName).join(', ')));
}

// ---------- adventure ----------

function adventure(page) {
  fill(page,
    intro(`${ADVENTURE_LEVELS.length} levels in ${ADVENTURE_ACTS.length} acts, for a party of three. Nobody can die. From level ${ADVENTURE_ARMED} the enemy carries forged weapons, from level ${ADVENTURE_SOULS[1]} a Legendary mutation each, and from level ${ADVENTURE_SOULS[2]} two. Each act gets harder faster than the one before. The first win of each level pays gems, and some pay more.`),
    ADVENTURE_LEVELS.map((lv, i) => {
      const n = i + 1;
      const boss = ADVENTURE_BOSSES[n];
      const prize = ADVENTURE_PRIZES[n];
      const bits = prize && [prize.gems && `${prize.gems} gems`, prize.ore && `${prize.ore} ore`, ...Object.entries(prize.items ?? {}).map(([id, k]) => `${k > 1 ? `${k} ` : ''}${ITEMS[id].name}`), prize.found && `a ${RACES[prize.found].name} joins you`].filter(Boolean);
      return h('div', { class: `cx-level${boss ? ' boss' : ''}` },
        h('b', null, `${n}. ${lv.name}`),
        boss && h('span', { class: 'badge boss' }, `${boss.twin > 1 ? `${boss.twin} x ` : ''}${boss.name ?? DEADLY_MONSTERS[boss.monster].name}`),
        bits?.length > 0 && h('span', { class: 'small' }, ` ${bits.join(', ')}`),
        boss?.passive && h('div', { class: 'small' }, boss.passive.text));
    }),
    head('Chapter ???: the Abyss Between'),
    intro(`Only after a universe reset. ${ABYSS_LEVELS.length} levels, each ${ABYSS.grow} times harder than the last, starting past the end of Act 5. Every enemy is a void-touched Elder of a Negative race: anything without Negative blood only lands ${Math.round((1 - ABYSS.voidGuard) * 100)}% of its damage on them. From level ${ADVENTURE_ELITE}, the end of Adventure, every enemy is an Elder trained to the limit.`),
    ABYSS_LEVELS.map((lv, i) => {
      const boss = ABYSS_BOSSES[i + 1];
      return h('div', { class: `cx-level${boss ? ' boss' : ''}` },
        h('b', null, `?${i + 1}. ${lv.name}`),
        boss && h('span', { class: 'badge boss' }, `${boss.twin > 1 ? `${boss.twin} x ` : ''}${boss.name}`),
        boss?.passive && h('div', { class: 'small' }, boss.passive.text));
    }),
    head('The God Chapter'),
    intro(`The true final chapter, open once Chapter ??? is beaten. ${GOD_LEVELS.length} levels, each ${GOD.grow} times harder than the last. Everything there is void-touched and god-touched: without Negative blood a hit lands ${Math.round((1 - ABYSS.voidGuard) * 100)}%, and without an awakened power ${Math.round((1 - GOD_GUARD) * 100)}%; one awakened power lands about half, ${GOD_FULL} or more in full. The bosses fight with the awakened powers' own moves. Beat God, and God Mode is yours for good: make any creature you want, put anyone in the ring against anyone, and the tools of whoever runs the universe.`),
    GOD_LEVELS.map((lv, i) => {
      const boss = GOD_BOSSES[i + 1];
      return h('div', { class: `cx-level${boss ? ' boss' : ''}` },
        h('b', null, `G${i + 1}. ${lv.name}`),
        boss && h('span', { class: 'badge boss' }, boss.name),
        boss?.passive && h('div', { class: 'small' }, boss.passive.text));
    }),
    h('div', { class: 'small', style: 'margin-top:6px' }, `Limits: a stat can reach ${STAT_LIMITS[0]} at best, and work and monsters can add up to +${TRAINING_LIMIT} to one. Each awakened power lifts every limit.`),
  );
}

// ---------- the Negative Dimension ----------

function negative(page) {
  fill(page,
    intro(`Only after a universe reset: beat Adventure level ${ADVENTURE_LEVELS.length}, then reset it in the Adventure note, and every creature you have dies. The Negative is a world of its own that nothing in the reset touches, and it runs on its own rules: no mutations, no jobs, no Stands, techniques, fruits or Quirks. Each creature has six ability scores in the hundreds instead of five stats, levels up by fighting, and fights with ${NEG_SCALE} times the health and hits of the light world. It has three powers of its own: a class, Nen and Alchemy.`),
    head('Ability scores'),
    ABILITY_KEYS.map((k) => h('div', { class: 'cx-line' }, h('b', null, `${ABILITY_LABELS[k]}: `), `${ABILITY_TEXT[k]}.`)),
    head('Classes'),
    intro('Picked once, for good. Its class decides how its scores grow every level, its health, a feature that works in every fight, and the spells it can prepare: one at first, and one more at every 20th level.'),
    CLASS_IDS.map((id) => {
      const k = CLASSES[id];
      return card(k.name, k.color, `health x${k.hitDie}`,
        h('div', { class: 'cx-blurb' }, k.blurb),
        said('Each level', ABILITY_KEYS.map((s) => `+${k.grow[s]} ${ABILITY_LABELS[s]}`).join(', ')),
        said('Feature', k.feature.text),
        k.spells.map((s, i) => said(`Level ${SPELL_LEVELS[i]}`, moveLine(s))));
    }),
    head('Nen'),
    intro(`Its Nen type is found by water divination, and it can use the types beside it on the hexagon at 80%, the next at 60% and the one across at 40%. Only a Specialist can use Specialization. It spreads ${NEN_POINTS} points of aura over five techniques, can turn on Ko (every ${KO.every}th swing all of its aura in one fist, then wide open for ${KO.open} seconds), makes a Hatsu of its own, and can swear up to ${MAX_VOWS} vows to make the Hatsu stronger.`),
    NEN_HEXAGON.map((t) => card(NEN_TYPES[t].name, NEN_TYPES[t].color, 'Nen type',
      h('div', { class: 'cx-blurb' }, `${NEN_TYPES[t].water} ${NEN_TYPES[t].text}`),
      Object.values(HATSU_FORMS[t]).map((f) => said(f.name, `${f.text} ${describeMove(f.def)}`)))),
    NEN_TECHNIQUE_IDS.map((id) => h('div', { class: 'cx-line' }, h('b', null, `${NEN_TECHNIQUES[id].name}: `), NEN_TECHNIQUES[id].text)),
    head('Vows and limitations'),
    VOW_IDS.map((id) => h('div', { class: 'cx-line' }, h('b', null, `${VOWS[id].name}, ${VOWS[id].mul} times as strong: `), VOWS[id].text)),
    head('Alchemy'),
    intro(`Equivalent exchange. Up to ${MAX_CIRCLES} circles, each a move it designs: a shape, an element, and what it pays every use, in health (up to ${Math.round(ALCHEMY_COSTS.hp.max * 100)}%), in time (${ALCHEMY_COSTS.cd.min} to ${ALCHEMY_COSTS.cd.max} seconds) and in toll on its own attack (up to ${Math.round(ALCHEMY_COSTS.toll.max * 100)}%). The more it pays, the stronger it is.`),
    h('div', { class: 'cx-grid' }, Object.values(ALCHEMY_SHAPES).map((s) => h('div', { class: 'cx-mini' }, h('b', null, s.name), h('span', null, s.text)))),
    h('div', { class: 'cx-grid' }, Object.values(ALCHEMY_ELEMENTS).map((el) => h('div', { class: 'cx-mini' }, h('b', null, el.name), h('span', null, `It ${el.text}.`)))),
    head('Its Adventure'),
    intro(`${NEG_LEVELS.length} levels. Nobody dies, every fight pays XP, and a win pays Void Shards, the money of the Negative. Whoever wins the last level can cross over to the light world, as a Hatchling of its race with its gifts of the Negative.`),
    NEG_LEVELS.map((lv, i) => {
      const boss = NEG_BOSSES[i + 1];
      return h('div', { class: `cx-level${boss ? ' boss' : ''}` },
        h('b', null, `${i + 1}. ${lv.name}`),
        boss && h('span', { class: 'badge boss' }, boss.name),
        boss?.passive && h('div', { class: 'small' }, boss.passive.text));
    }),
    head('The Elite Negative'),
    intro(`There is more under the Negative. Once Chapter ??? is beaten in the light world, ${ELITE_LEVELS.length} more levels open under its Adventure: creatures at level ${ELITE.level}, each born with ${ELITE.gifts} more gift${ELITE.gifts === 1 ? '' : 's'} of the Negative, every level ${ELITE.grow} times harder. A first win pays ${ELITE_REWARD.stones} Ascension Stone, a boss ${ELITE_REWARD.bossStones}, and a boss beaten again ${ELITE_REWARD.replayBossStones}. The stones craft what awakens the light world's powers (Gear & loot, Ascension).`),
    ELITE_LEVELS.map((lv, i) => {
      const boss = ELITE_BOSSES[i + 1];
      return h('div', { class: `cx-level${boss ? ' boss' : ''}` },
        h('b', null, `E${i + 1}. ${lv.name}`),
        boss && h('span', { class: 'badge boss' }, boss.name),
        boss?.passive && h('div', { class: 'small' }, boss.passive.text));
    }),
    head('Back in the light world'),
    intro(`A creature that crossed over can bring its Hatsu as a gift it passes down (Gifts). It can go on the Bloodline Altar, so eggs hatch as its race. It can be given up for a creature boost: every gem you earn is multiplied by what it was worth for ${BOOSTS.hours === 1 ? 'an hour' : `${BOOSTS.hours} hours`}, up to ${BOOSTS.max} boosts at once, multiplying each other. And with the Deluxe Breeder (${DELUXE_BREEDER.cost.toLocaleString('en-US')} gems) it breeds with anyone.`),
  );
}
