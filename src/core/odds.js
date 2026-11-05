// Every chance in the game in one list, for the Chances tab in the guide. Each number is read from
// the data the game itself uses, so the list can't say one thing while the game does another.

import { perksOf, hasTrait } from './creature.js';
import {
  TRAITS, TRAIT_ODDS, SIX_EYES_FAMILY, SIX_EYES_EVERY, SHARINGAN_COPY, TECHNIQUES, TECHNIQUE_IDS, LEGENDARY, LEGENDARY_ID, MALEVOLENT_ID,
  LEGENDARY_ONE_IN, LEGENDARY_FROM_TROPHY, BLACK_FLASH, OFA_LEVEL_AT,
} from '../data/powers.js';
import { TRAINING_CHANCE, DEADLY_ROLL, DEADLY_MONSTERS } from '../data/monsters.js';
import { GEM_CHANCE, VEIN_CHANCE, VEIN_GEM_CHANCE } from '../data/crafting.js';
import { MUTATION_THRESHOLDS, MAX_MUTATIONS } from '../data/mutations.js';
import { BREED_GIFTS } from '../data/family.js';
import { FRUITS, FRUIT_FROM_HARVEST, FRUIT_FROM_EXPEDITION, FRUIT_IDS } from '../data/fruits.js';
import { RACES, PURE_BLOOD_CHANCE } from '../data/races.js';
import { EXPEDITIONS, EXPEDITION_IDS, RAID_LOSS, WAVE_BOSS_EVERY } from '../data/village.js';
import { ROLL_COST } from '../data/family.js';

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
  const dragon = Object.values(DEADLY_MONSTERS).find((m) => m.legendary);
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
        {
          name: TRAITS.cursedbody.name,
          odds: oneIn(TRAIT_ODDS.cursedbody),
          has: born('cursedbody'),
          detail: `Of any egg. ${TRAITS.cursedbody.blurb}`,
        },
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
          detail: `It gets the last name you choose and up to ${BREED_GIFTS} things you choose from its parents. Nothing about it is left to chance.`,
        },
      ],
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
        { name: LEGENDARY[LEGENDARY_ID].name, odds: oneIn(LEGENDARY_ONE_IN), detail: `Of new mutations. Beating ${dragon.name} always gives it.` },
        { name: LEGENDARY[MALEVOLENT_ID].name, odds: pct(LEGENDARY_FROM_TROPHY), detail: 'Of any other win to the death.' },
        { name: 'Only one', odds: 'ever', detail: 'A creature only ever gets one Legendary mutation.' },
      ],
    },
    {
      title: 'Fights',
      rows: [
        { name: 'Black Flash', odds: pct(BLACK_FLASH.chance), detail: `Of melee swings, for anything with a cursed technique. It hits ${BLACK_FLASH.power} times as hard.` },
        { name: 'Training monster', odds: pct(TRAINING_CHANCE), detail: 'Each win has this chance of +1 to that monster\'s stat.' },
        { name: 'Deadly monster', odds: `${pct(DEADLY_ROLL.low)}-${pct(DEADLY_ROLL.high)}`, detail: 'Each one shows up somewhere in this range of its usual strength. The first press on Spawn tells you its odds.' },
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
      title: 'The village',
      rows: [
        { name: 'A raid', odds: 'shown', detail: `The Raids tab shows how often your village holds each hostile village off before it comes. A lost raid takes ${pct(RAID_LOSS.colors)} of your colors and ${pct(RAID_LOSS.store)} of your food.` },
        { name: 'Waves', odds: `every ${WAVE_BOSS_EVERY}th`, detail: `Every ${WAVE_BOSS_EVERY}th wave a monster from the Challenges note leads the raiders.` },
        { name: 'A rolled egg', odds: `${ROLL_COST} gem`, detail: 'Each roll is a brand new egg, with the same chances as any egg above.' },
      ],
    },
    {
      title: 'Not chance: always the same',
      rows: [
        { name: 'Mutations', odds: 'count', detail: `Its first mutation from one kind of plant grows after eating ${MUTATION_THRESHOLDS[0]} of them, and the next ones after ${andList(MUTATION_THRESHOLDS.slice(1))} eaten in all. Only which one grows is a surprise. ${MAX_MUTATIONS} at most.` },
        { name: 'Six Eyes', odds: `every ${SIX_EYES_EVERY}s`, detail: `With Limitless, Infinity comes up every ${SIX_EYES_EVERY} seconds, every time.` },
        { name: 'One For All', odds: 'stockpile', detail: `Levels 2 to 7 come at a stockpile of ${OFA_LEVEL_AT.slice(1).join(', ')}.` },
      ],
    },
  ];
}
