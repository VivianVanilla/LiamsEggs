// Every chance in the game in one list, for the Chances tab in the guide. Each number is read from
// the data the game itself uses, so the list can't say one thing while the game does another.

import { perksOf, hasTrait } from './creature.js';
import { bredRuleText } from './family.js';
import {
  TRAITS, BORN_TRAIT_IDS, BRED_TRAIT_IDS, BRED_RULES, EARNED_TRAIT_IDS, EARN_RULES, TRAIT_ODDS, SIX_EYES_FAMILY, SIX_EYES_EVERY, SHARINGAN_COPY, TECHNIQUES, TECHNIQUE_IDS, LEGENDARY,
  BLACK_FLASH, OFA_LEVEL_AT,
} from '../data/powers.js';
import { TRAINING_CHANCE, DEADLY_ROLL, DEADLY_MONSTERS, ULTIMATE_IDS, REBORN, LEGEND_WINS_FOR_ULTIMATE } from '../data/monsters.js';
import { GEM_CHANCE, VEIN_CHANCE, VEIN_GEM_CHANCE } from '../data/crafting.js';
import { MUTATION_THRESHOLDS, MAX_MUTATIONS } from '../data/mutations.js';
import { BREED_GIFTS, ROLL_COST, MEGA_BREEDER } from '../data/family.js';
import { FRUITS, FRUIT_FROM_HARVEST, FRUIT_FROM_EXPEDITION, FRUIT_IDS } from '../data/fruits.js';
import { RACES, PURE_BLOOD_CHANCE } from '../data/races.js';
import { EXPEDITIONS, EXPEDITION_IDS, EXPEDITION_DANGER } from '../data/village.js';
import { ALTAR } from '../data/family.js';
import { MAX_SOUL_EXPANDERS } from '../data/items.js';
import { ITEMS } from '../data/items.js';
import { ADVENTURE_LEVELS, ADVENTURE_BOSSES, ADVENTURE_DROPS, ADVENTURE_DROPS_PER_LEVEL } from '../data/adventure.js';

const LEVEL_COUNT = ADVENTURE_LEVELS.length;
const BOSS_LEVELS = Object.keys(ADVENTURE_BOSSES).map(Number);

const pct = (v) => `${Math.round(v * 100)}%`;
// Small chances keep their decimal: 0.1%, 1.5%.
const fine = (v) => `${Number((v * 100).toFixed(v < 0.1 ? 1 : 0))}%`;
const oneIn = (n) => `1 in ${n}`;
const andList = (items) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : String(items[0]));

// Sections of { name, odds, detail, has }. `has` marks a gift this creature was born with.
export function chanceSections(c = null) {
  const gojo = TECHNIQUES[SIX_EYES_FAMILY].family;
  const families = TECHNIQUE_IDS.length;
  const jobGems = c ? perksOf(c).gemChance : 0;
  const dragon = DEADLY_MONSTERS.dragon;
  const born = (id) => !!c && hasTrait(c, id);
  return [
    {
      title: 'Born with',
      rows: [
        {
          name: TRAITS.sixeyes.name,
          odds: oneIn(TRAIT_ODDS.sixeyes),
          has: born('sixeyes'),
          detail: `Of ${gojo} eggs, and no other family hatches with it, so about ${oneIn(TRAIT_ODDS.sixeyes * families)} of all eggs. A parent can still pass it to anyone. ${TRAITS.sixeyes.blurb}`,
        },
        {
          name: TRAITS.sharingan.name,
          odds: oneIn(TRAIT_ODDS.sharingan),
          has: born('sharingan'),
          detail: `Of any egg. ${TRAITS.sharingan.blurb} The copy is ${pct(SHARINGAN_COPY)} as strong as the real move.`,
        },
        // Everything else is the same for any egg.
        ...BORN_TRAIT_IDS.filter((id) => id !== 'sixeyes' && id !== 'sharingan').map((id) => ({
          name: TRAITS[id].name,
          odds: oneIn(TRAIT_ODDS[id]),
          has: born(id),
          detail: `Of any egg. ${TRAITS[id].blurb}`,
        })),
        {
          name: 'Its family',
          odds: oneIn(families),
          detail: `An egg is as likely to be born into any of the ${families} families, and the family decides its cursed technique.`,
        },
        {
          name: 'A Pure-blood',
          odds: oneIn(Math.round(1 / PURE_BLOOD_CHANCE)),
          detail: 'Of bred babies of mixed race. Every race in it is at full power instead of its share.',
        },
        {
          name: 'A bred baby',
          odds: 'you pick',
          detail: `It gets the last name you choose and up to ${BREED_GIFTS} things you choose from its parents, ${MEGA_BREEDER.gifts} more with the Mega Breeder. Only the gifts awakened by breeding, below, are left to chance.`,
        },
      ],
    },
    {
      title: 'Awakened by breeding',
      rows: BRED_TRAIT_IDS.map((id) => ({
        name: TRAITS[id].name,
        odds: oneIn(BRED_RULES[id].oneIn),
        has: born(id),
        detail: `Of bred babies where ${bredRuleText(id, false)}. No egg ever hatches with it, but once a creature has it, it passes on like a born-with gift. ${TRAITS[id].blurb}`,
      })),
    },
    {
      title: 'Loot',
      rows: [
        ...EXPEDITION_IDS.flatMap((where) => Object.entries(EXPEDITIONS[where].items).map(([id, chance]) => ({
          name: `${ITEMS[id].name}, ${EXPEDITIONS[where].name.toLowerCase()}`,
          odds: fine(chance),
          detail: `Of every expedition that goes there. ${ITEMS[id].text}`,
        }))),
        ...Object.entries(ADVENTURE_DROPS).map(([id, p]) => ({
          name: `${ITEMS[id].name}, Adventure`,
          odds: `${fine(p + ADVENTURE_DROPS_PER_LEVEL[id])}-${fine(p + LEVEL_COUNT * ADVENTURE_DROPS_PER_LEVEL[id])}`,
          detail: `Of every Adventure win, first time or not: the further the level, the better the chance. Some levels also hand one over the first time they are beaten. ${ITEMS[id].text}`,
        })),
      ],
    },
    {
      title: 'Earned gifts',
      rows: EARNED_TRAIT_IDS.map((id) => ({
        name: TRAITS[id].name,
        odds: 'earned',
        has: born(id),
        detail: `${EARN_RULES[id].how} ${TRAITS[id].blurb} Earned gifts never pass on to a baby.`,
      })),
    },
    {
      title: 'Devil Fruits',
      rows: [
        { name: 'From a farm harvest', odds: fine(FRUIT_FROM_HARVEST), detail: 'Of every plant harvested, on your screen or in the village.' },
        { name: 'From an expedition', odds: fine(FRUIT_FROM_EXPEDITION), detail: 'Of every expedition, wherever it went.' },
        { name: 'Which fruit', odds: oneIn(FRUIT_IDS.length), detail: `Each of the ${FRUIT_IDS.length} is as likely: ${FRUIT_IDS.map((id) => FRUITS[id].name).join(', ')}.` },
      ],
    },
    {
      title: 'Bizarre expeditions',
      rows: EXPEDITION_IDS.filter((where) => EXPEDITIONS[where].danger).map((where) => ({
        name: `Not coming back, ${EXPEDITIONS[where].name.toLowerCase()}`,
        odds: `${pct(EXPEDITION_DANGER.least)}-${pct(EXPEDITIONS[where].danger)}`,
        detail: `For each one who goes. The stronger it is when it sets off, the less likely: every ${Math.round(EXPEDITION_DANGER.safePower / 10)} power takes a tenth off, down to ${pct(EXPEDITION_DANGER.least)}. If nobody comes back, nothing they found does either.`,
      })),
    },
    {
      title: 'Expedition finds',
      rows: EXPEDITION_IDS.flatMap((where) => Object.entries(EXPEDITIONS[where].finds).map(([race, chance]) => ({
        name: `${RACES[race].name}, ${EXPEDITIONS[where].name.toLowerCase()}`,
        odds: fine(chance),
        detail: `${RACES[race].blurb}`,
      }))),
    },
    {
      title: 'Legendary mutations',
      rows: [
        // No luck in these: each comes from beating one monster, and from nothing else.
        ...Object.values(DEADLY_MONSTERS).filter((m) => m.soul).map((m) => ({
          name: LEGENDARY[m.soul].name,
          odds: 'every win',
          detail: `Only from beating ${m.name}${m.road === 'legend' ? ' on the Legendary road' : ''} in the Challenges note. ${LEGENDARY[m.soul].blurb}`,
        })),
        { name: 'How many', odds: `1 to ${1 + MAX_SOUL_EXPANDERS}`, detail: `A creature holds one, and each Legendary Expander makes room for one more. With no room left, a new one is yours to swap in or turn down. Being reborn takes them all away, so it can win them again.` },
      ],
    },
    {
      title: 'Fights',
      rows: [
        { name: 'Black Flash', odds: pct(BLACK_FLASH.chance), detail: `Of melee swings, for anything with a cursed technique. It hits ${BLACK_FLASH.power} times as hard.` },
        { name: 'Training monster', odds: pct(TRAINING_CHANCE), detail: 'Each win has this chance of +1 to that monster\'s stat.' },
        { name: 'Deadly monster', odds: `${pct(DEADLY_ROLL.low)}-${pct(DEADLY_ROLL.high)}`, detail: 'Each one shows up somewhere in this range of its usual strength, the ultimate ones too. The first press on Spawn tells you its odds.' },
        { name: 'Ultimate monsters', odds: `${ULTIMATE_IDS.length} more`, detail: `They come out once it has won ${LEGEND_WINS_FOR_ULTIMATE} fights on the Legendary road, and they kill just the same. Beat all ${ULTIMATE_IDS.length} and it can be reborn: absorb one of your creatures, take up to ${REBORN.takes} of its gifts, and start over as a Hatchling with nothing else.` },
      ],
    },
    {
      title: 'Mining',
      rows: [
        {
          name: 'Gem',
          odds: pct(GEM_CHANCE + jobGems),
          detail: `Of bright chunks: ${pct(GEM_CHANCE)} for anyone${jobGems ? `, and its job adds ${pct(jobGems)}` : '. Miner jobs find more'}.`,
        },
        { name: 'Vein', odds: pct(VEIN_CHANCE), detail: `Of chunks dug. Click it before it fades for extra color, with a ${pct(VEIN_GEM_CHANCE)} chance of a gem.` },
      ],
    },
    {
      title: 'Eggs and Adventure',
      rows: [
        { name: 'A rolled egg', odds: `${ROLL_COST} gem`, detail: 'Each roll is a brand new egg, with the same chances as any egg above.' },
        { name: 'An altar race', odds: pct(ALTAR.eggChance), detail: 'Of eggs, once the Bloodline Altar has a race: one of its races, each as likely. Nobody picks, and the egg shows it before you keep it.' },
        ...ALTAR.eggShares.map(([share, p]) => ({
          name: share === 1 ? 'All of that race' : share === 0.5 ? 'Half of it' : 'A quarter of it',
          odds: pct(p),
          detail: share === 1 ? 'Of altar-race eggs: the whole creature is that race.' : `Of altar-race eggs: ${share === 0.5 ? 'half' : 'a quarter'} that race, and the rest Human.`,
        })),
        { name: 'Adventure bosses', odds: `${BOSS_LEVELS.length} of ${LEVEL_COUNT}`, detail: `Levels ${andList(BOSS_LEVELS)} are led by a monster from the Challenges note, ending with ${dragon.name}.` },
      ],
    },
    {
      title: 'Not chance: always the same',
      rows: [
        { name: 'Mutations', odds: 'count', detail: `Its first mutation from one kind of plant grows after eating ${MUTATION_THRESHOLDS[0]} of them, and the next ones after ${andList(MUTATION_THRESHOLDS.slice(1))} eaten in all. Only which one grows is a surprise. ${MAX_MUTATIONS} at most, or more with Limit Expanders.` },
        { name: 'Six Eyes', odds: `every ${SIX_EYES_EVERY}s`, detail: `With Limitless, Infinity comes up every ${SIX_EYES_EVERY} seconds, every time.` },
        { name: 'One For All', odds: 'stockpile', detail: `Levels 2 to 7 come at a stockpile of ${OFA_LEVEL_AT.slice(1).join(', ')}.` },
      ],
    },
  ];
}
