// Your Chosen: one creature that is your avatar, the one your godly power runs through. Only
// numbers and words here; the rules are in core/chosen.js, and what it does in a fight is in
// sim/arena.js.

// It glows this color, out on your screen and in every fight.
export const CHOSEN_COLOR = '#ffd24a';

//   damage     everything a Chosen does hits this many times as hard
//   warDamage  ...or this many times, attuned to War
//   bomb       Benevolence: once a fight, one enemy takes this share of the health it has left
//   necro      Speed: this share of its hits are necrotic, and the damage comes off the target's
//              max HP for the rest of the fight, so no healing brings it back
//   necroCap   ...until the target has lost this share of the max HP it started with
export const CHOSEN = { damage: 2, warDamage: 3, bomb: 0.5, necro: 0.01, necroCap: 0.7 };

export const ATTUNEMENTS = {
  war: {
    name: 'War', color: '#ff5a4a',
    text: 'Everything it does hits three times as hard, instead of twice.',
  },
  benevolence: {
    name: 'Benevolence', color: '#fff0b8',
    text: 'Once a fight, you drop a bomb from above on any enemy, from the fight sidebar: it takes half the health it has left. A quick fight drops it on the toughest one by itself.',
  },
  speed: {
    name: 'Speed', color: '#9fd3ff',
    text: '1 in 100 of its hits are necrotic: the damage comes off the target\'s max HP for the rest of the fight, so no healing brings it back, down to 30% of where it started.',
  },
};
export const ATTUNE_IDS = Object.keys(ATTUNEMENTS);
