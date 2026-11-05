// The breeding guide, one page of the guide note: how breeding works, what passes on, what a nurse
// adds, and recipes for the rare things. Every number comes from the data the game uses.

import { STAGES } from './creature.js';
import { perkText } from './sheet.js';
import { BREED_STAGE, BREED_FULLNESS, BREED_COST, BREED_REST_HOURS, BREED_GIFTS, MAX_CARE_REST, TEAM_MAX, ROLL_COST } from '../data/family.js';
import { TRAITS, TRAIT_ODDS, TECHNIQUES, TECHNIQUE_IDS, SIX_EYES_FAMILY, SIX_EYES_EVERY, QUIRKS, OFA_ID, MAX_HP_GIVEN } from '../data/powers.js';
import { MAX_MUTATIONS } from '../data/mutations.js';
import { PATHS } from '../data/paths.js';

const pct = (v) => `${Math.round(v * 100)}%`;

// Sections of { name, detail } rows.
export function breedingGuide() {
  const gojo = TECHNIQUES[SIX_EYES_FAMILY];
  const { sixeyes, sharingan, cursedbody } = TRAITS;
  const nurses = Object.keys(PATHS).filter((id) => PATHS[id].activity === 'care');
  return [
    {
      title: 'How it works',
      rows: [
        { name: '1. Pick two parents', detail: `Open Breed from the menu. Both need to be a ${STAGES[BREED_STAGE].name} or older and at least ${BREED_FULLNESS} full. They can be out on your screen or waiting in their files.` },
        { name: '2. Choose its last name', detail: 'Either parent\'s. The last name decides its cursed technique, and the other parent\'s family becomes the other side of its family.' },
        { name: '3. Choose who it takes after', detail: 'Its color comes from one parent, and how it fights from one parent.' },
        { name: `4. Choose up to ${BREED_GIFTS} things to pass on`, detail: 'From what either parent has: born-with gifts, mutations, and at most one Quirk. A nurse out on the screen raises the limit.' },
        { name: '5. Name it and hatch it', detail: `Its .creature file is made straight away. Each parent spends ${BREED_COST} fullness and rests ${BREED_REST_HOURS} hours before it can breed again.` },
      ],
    },
    {
      title: 'What can pass on',
      rows: [
        { name: 'Born-with gifts', detail: `${sixeyes.name}, ${sharingan.name} and ${cursedbody.name}. A baby can get one its own family would never hatch with: ${sixeyes.name} passes to anyone.` },
        { name: 'Mutations', detail: `Each one counts toward the baby's ${MAX_MUTATIONS}. Two from the same plant family teach that family's move from the start.` },
        { name: 'One Quirk', detail: `The baby pays the same max HP for it as its parent did, and can never give up more than ${MAX_HP_GIVEN}% in all.` },
        { name: 'Never', detail: `${QUIRKS[OFA_ID].name}: that only goes on when its holder gives everything, from the Powers note. Stands, speedster powers, awakened techniques, jobs, stats, trophies and Legendary mutations stay with the parent. The baby earns its own.` },
      ],
    },
    {
      title: 'Its race',
      rows: [
        { name: 'Half of each parent', detail: 'A baby is half of each parent\'s races, so a Giant and a Devil make a Half-Giant Half-Devil. Their babies are quarters, and nothing goes smaller than a quarter.' },
        { name: 'Its share of each', detail: 'Each race gives its share of its bonuses: a Half-Giant gets half a Giant\'s. A race only brings its move at half or more.' },
        { name: 'Pure-blood', detail: '1 in 100 babies of mixed race are born Pure-blood instead: every race in it at full power.' },
      ],
    },
    {
      title: 'Its family',
      rows: [
        { name: 'Its last name', detail: 'Decides which cursed technique it can awaken. Nobody picks a technique, but breeding lets you choose which family line carries on.' },
        { name: 'The other side', detail: `The other parent's family. It only matters with ${cursedbody.name}, which can awaken that side's technique as well. If both parents share a family, the other side comes from one of their own other sides.` },
      ],
    },
    {
      title: 'A nurse helps',
      rows: [
        ...nurses.map((id) => ({ name: PATHS[id].name, detail: `${perkText(PATHS[id].perk)}.` })),
        { name: 'Which nurse counts', detail: `The most trained nurse out on your screen, and its help adds up along its job line. It can take at most ${pct(MAX_CARE_REST)} of the rest away. A parent can be the nurse too.` },
      ],
    },
    {
      title: 'Recipes',
      rows: [
        { name: `A ${gojo.family} with ${sixeyes.name}`, detail: `Pass ${sixeyes.name} from a parent that has it, and take the ${gojo.family} last name from a ${gojo.family} parent. It only does something with ${gojo.name}. No parent with it yet? About 1 egg in ${TRAIT_ODDS.sixeyes * TECHNIQUE_IDS.length} hatches with it, and Hyper roll can hunt for one.` },
        { name: 'Two cursed techniques', detail: `Pass ${cursedbody.name}. Its last name gives it one technique, and the other parent's family gives it the second.` },
        { name: `${sixeyes.name} on the other side`, detail: `Pass ${cursedbody.name} and ${sixeyes.name}, take the last name you like, and make the other parent a ${gojo.family}. Its second technique is then ${gojo.name}, with Infinity every ${SIX_EYES_EVERY} seconds.` },
        { name: 'A copycat fighter', detail: `Pass ${sharingan.name} to anything that fights: it copies the first move its opponent uses, in every fight.` },
        { name: 'A head start', detail: 'Pass two mutations from the same plant family, so the baby knows that family\'s move the moment it hatches.' },
      ],
    },
    {
      title: 'Good to know',
      rows: [
        { name: 'Babies start small', detail: 'A baby hatches as a Hatchling, or a little bigger with a Midwife out, so it still needs raising. What it has lists its parents.' },
        { name: 'Room on the screen', detail: `Up to ${TEAM_MAX} creatures can be out at once. A baby can come straight out, or wait in Your creatures.` },
        { name: 'Or roll an egg', detail: `Roll eggs shows a new egg's family and gifts before you keep it, for ${ROLL_COST} gem a roll.` },
      ],
    },
  ];
}
