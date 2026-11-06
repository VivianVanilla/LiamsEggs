// Every picture the game can show, in one list. All of them are PNG files in the art folder,
// made by people. The game never draws or generates pictures of its own.
// `node tools/art-list.js` turns this list into art/FILES-TO-DRAW.md.

import { MUTATIONS, MUTATION_IDS } from './mutations.js';
import { PATHS } from './paths.js';
import { FOODS, FOOD_ORDER } from './foods.js';
import { STANDS, STAND_IDS, QUIRKS, QUIRK_IDS, TECHNIQUES, TECHNIQUE_IDS, LEGENDARY } from './powers.js';
import { CHARMS, CHARM_IDS, CROPS, CROP_IDS } from './crafting.js';
import { RACES, RACE_PICTURES, RACE_IDEAS, RACE_BACKS, RACE_BACK_IDEAS } from './races.js';
import { TRAINING_MONSTERS, TRAINING_IDS, DEADLY_MONSTERS, DEADLY_IDS, ULTIMATE_IDS } from './monsters.js';

// These mutation layers sit behind the body. All the others sit in front of it.
export const BEHIND_BODY = new Set(['spikes', 'clubtail', 'zaptail', 'jets', 'tentacle', 'firetail', 'extralegs', 'extraarms', 'smoke']);


const JOB_IDEAS = {
  miner: 'hard hat',
  prospector: 'hard hat, magnifying glass',
  excavator: 'hard hat, big pickaxe',
  hoarder: 'crown, sack of gems, purple cape',
  sage: 'wizard hat, prism staff, blue cape',
  driller: 'hard hat, drill, orange cape',
  wraith: 'dark hood, pickaxe',
  farmer: 'straw hat',
  cultivator: 'straw hat, hoe',
  rancher: 'cowboy hat, shepherd crook',
  warden: 'antlers, hoe, green cape',
  monarch: 'crown, hoe, gold cape',
  beastmaster: 'cowboy hat, crook, brown cape',
  swarm: 'beekeeper veil, crook',
  fighter: 'headband',
  tactician: 'headband, scroll',
  berserker: 'headband, sword',
  grandmaster: 'graduation cap, scroll',
  trickster: 'jester hat, scroll',
  warlord: 'helmet, sword, red cape',
  doom: 'helmet, huge sword, black cape',
  nurse: 'stethoscope',
  medic: 'stethoscope, bandage',
  midwife: 'stethoscope, baby bottle',
  surgeon: 'stethoscope, syringe',
  battlemedic: 'helmet, bandage, syringe',
  broodmother: 'stethoscope, baby bottle, eggs',
  nightnurse: 'crescent moon, stethoscope, pill',
};

export const ART_GROUPS = [
  {
    name: 'Creature',
    size: '512 x 512',
    note: 'Draw it facing right, standing at the bottom middle of the canvas. Use a pale body: the colors it mines are tinted over this picture.',
  },
  { name: 'Food files', size: '128 x 128', note: 'What a food file looks like when it gets dragged onto the creature.' },
  { name: 'Animals', size: '128 x 128', note: 'Facing right, standing at the bottom of the canvas.' },
  { name: 'Farm', size: '64 x 64', note: 'One tile of a field, and the crop that sits on it.' },
  { name: 'Tray icon', size: '32 x 32', note: 'The little icon next to your clock.' },
  {
    name: 'Mutations',
    size: 'same canvas as creature/body.png',
    optional: true,
    note: 'Draw each one on a copy of body.png so it lines up, then erase the body and save only the new part. Nothing shows until a file exists, so these can come whenever.',
  },
  {
    name: 'Jobs',
    size: 'same canvas as creature/body.png',
    optional: true,
    note: 'Same trick as mutations. Only its current job shows, so each picture should be the whole outfit. Nothing shows until a file exists.',
  },
  {
    name: 'Stands',
    size: 'same canvas as creature/body.png',
    optional: true,
    note: 'The whole Stand, facing right, feet at the bottom middle of the canvas. It floats behind its user, a little bigger than the body. Nothing shows until a file exists.',
  },
  {
    name: 'Quirks and speedster',
    size: 'same canvas as creature/body.png',
    optional: true,
    note: 'Same trick as mutations: only the new part, lined up with the body. Nothing shows until a file exists.',
  },
  {
    name: 'Races',
    size: 'same canvas as creature/body.png',
    optional: true,
    note: 'Same trick as mutations: only the new part, lined up with the body. Giants and Tontattas only change size, so they have none. Nothing shows until a file exists.',
  },
  {
    name: 'Cursed techniques',
    size: 'same canvas as creature/body.png',
    optional: true,
    note: 'Same trick as mutations: only the new part, lined up with the body. Nothing shows until a file exists.',
  },
  { name: 'Crafting', size: '128 x 128', note: 'Charms, for the workshop. Worn ones also show small at its neck.', optional: true },
  { name: 'Effects', size: '64 x 64', note: 'Thrown shots in a fight. Use a pale color: each move tints it.', optional: true },
  { name: 'Monsters', size: '512 x 512', note: 'Facing right, standing at the bottom middle of the canvas. They spawn from the Challenges note.' },
];

export const ART_FILES = [
  { file: 'creature/body.png', group: 'Creature', what: 'The creature itself. Every creature uses this one picture, scaled up as it grows.' },
  { file: 'creature/egg.png', group: 'Creature', what: 'The egg that lands on your screen before you name it.' },

  ...FOOD_ORDER.map((ext) => ({ file: `food/${ext}.png`, group: 'Food files', what: `A .${ext} file (${FOODS[ext].label})` })),

  { file: 'animals/cluck.png', group: 'Animals', what: 'Cluckling, a small chicken' },
  { file: 'animals/woolbit.png', group: 'Animals', what: 'Woolbit, a small sheep. Also the Beastmaster\'s summons in the arena.' },
  { file: 'animals/beetle.png', group: 'Animals', what: 'Beetlet, a small beetle. Also the Swarm Keeper\'s summons.' },
  { file: 'animals/blob.png', group: 'Animals', what: 'Spawnling, a little blob summoned in the arena' },
  { file: 'animals/shadow.png', group: 'Animals', what: 'Dark Shadow, the living shadow summoned by that Quirk' },

  { file: 'farm/soil.png', group: 'Farm', what: 'A tilled square of dirt' },
  { file: 'farm/crop-1.png', group: 'Farm', what: 'A crop just sprouting' },
  { file: 'farm/crop-2.png', group: 'Farm', what: 'A crop half grown' },
  { file: 'farm/crop-3.png', group: 'Farm', what: 'A ripe crop' },
  ...CROP_IDS.map((id) => ({ file: `farm/${id}.png`, group: 'Farm', what: `A ripe ${CROPS[id].name}` })),

  { file: 'icons/tray.png', group: 'Tray icon', what: 'Until this exists, the tray shows the plain Electron icon.' },

  ...MUTATION_IDS.map((id) => ({
    file: `mutations/${id}.png`,
    group: 'Mutations',
    what: `${MUTATIONS[id].name}, from eating ${FOODS[MUTATIONS[id].family].label}. Sits ${BEHIND_BODY.has(id) ? 'behind' : 'in front of'} the body.`,
  })),

  ...Object.keys(PATHS).map((id) => ({
    file: `jobs/${id}.png`,
    group: 'Jobs',
    what: `${PATHS[id].name}. Idea: ${JOB_IDEAS[id]}.`,
  })),

  ...STAND_IDS.map((id) => ({ file: `stands/${id}.png`, group: 'Stands', what: `${STANDS[id].name}. ${STANDS[id].blurb}` })),

  { file: 'powers/speedster.png', group: 'Quirks and speedster', what: 'What a speedster wears. Sits in front of the body.' },
  ...QUIRK_IDS.map((id) => ({
    file: `quirks/${id}.png`,
    group: 'Quirks and speedster',
    what: `${QUIRKS[id].name}. ${QUIRKS[id].blurb} Sits ${QUIRKS[id].behind ? 'behind' : 'in front of'} the body.`,
  })),

  ...RACE_PICTURES.map((id) => ({ file: `races/${id}.png`, group: 'Races', what: `${RACES[id].name}. Idea: ${RACE_IDEAS[id]}.` })),
  ...RACE_BACKS.map((id) => ({ file: `races/${id}-back.png`, group: 'Races', what: `${RACES[id].name}, the part behind the body. Idea: ${RACE_BACK_IDEAS[id]}.` })),

  ...TECHNIQUE_IDS.map((id) => ({ file: `techniques/${id}.png`, group: 'Cursed techniques', what: `${TECHNIQUES[id].name}. ${TECHNIQUES[id].blurb}` })),
  ...Object.keys(LEGENDARY).map((id) => ({ file: `legendary/${id}.png`, group: 'Cursed techniques', what: `${LEGENDARY[id].name}, a Legendary mutation.` })),

  ...CHARM_IDS.map((id) => ({ file: `crafts/${id}.png`, group: 'Crafting', what: CHARMS[id].name })),

  { file: 'fx/bolt.png', group: 'Effects', what: 'A thrown shot or ranged move flying through the air.' },

  ...TRAINING_IDS.map((id) => ({ file: `monsters/${id}.png`, group: 'Monsters', what: `${TRAINING_MONSTERS[id].name}, a training monster.` })),
  ...[...DEADLY_IDS, ...ULTIMATE_IDS].map((id) => ({ file: `monsters/${id}.png`, group: 'Monsters', what: `${DEADLY_MONSTERS[id].name}${DEADLY_MONSTERS[id].ultimate ? ', an ultimate monster' : ''}. ${DEADLY_MONSTERS[id].blurb}` })),
];
