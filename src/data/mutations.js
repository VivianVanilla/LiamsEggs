// Every mutation a food family can produce. Which one grows is a surprise, so two creatures
// fed the same plants still grow differently.
// Each one's picture is mutations/<id>.png in the art folder (see data/art-list.js).

export const MUTATIONS = {
  // bone
  horns:      { family: 'bone',  name: 'Horns',        stats: { might: 1, guard: 1 } },
  plates:     { family: 'bone',  name: 'Bone Plates',  stats: { guard: 3 } },
  spikes:     { family: 'bone',  name: 'Back Spikes',  stats: { guard: 2 } },
  clubtail:   { family: 'bone',  name: 'Club Tail',    stats: { might: 2 } },
  skullmask:  { family: 'bone',  name: 'Bone Mask',   stats: { guard: 1, wits: 1 } },
  // sap
  leafcrown:  { family: 'sap',   name: 'Leaf Crown',   stats: { vigor: 2 } },
  vines:      { family: 'sap',   name: 'Arm Vines',    stats: { vigor: 1, guard: 1 } },
  moss:       { family: 'sap',   name: 'Moss Coat',    stats: { vigor: 3 } },
  bloom:      { family: 'sap',   name: 'Head Bloom',   stats: { vigor: 1, wits: 1 } },
  roots:      { family: 'sap',   name: 'Root Feet',    stats: { guard: 1, vigor: 2, speed: -1 } },
  // spark
  antennae:   { family: 'spark', name: 'Antennae',     stats: { speed: 1, wits: 1 } },
  coillegs:   { family: 'spark', name: 'Coil Legs',    stats: { speed: 3 } },
  arcs:       { family: 'spark', name: 'Static Arcs',  stats: { speed: 1, might: 1 } },
  zaptail:    { family: 'spark', name: 'Zap Tail',     stats: { might: 2 } },
  jets:       { family: 'spark', name: 'Back Jets',    stats: { speed: 2 } },
  // ink
  mindgem:    { family: 'ink',   name: 'Mind Gem',     stats: { wits: 2 } },
  bigbrain:   { family: 'ink',   name: 'Big Brain',    stats: { wits: 3 } },
  glyphs:     { family: 'ink',   name: 'Skin Glyphs',  stats: { wits: 1, guard: 1 } },
  tentacle:   { family: 'ink',   name: 'Back Tentacle', stats: { wits: 1, might: 1 } },
  halo:       { family: 'ink',   name: 'Halo',         stats: { wits: 1, vigor: 1 } },
  // ember
  flamehair:  { family: 'ember', name: 'Flame Hair',   stats: { might: 2 } },
  claws:      { family: 'ember', name: 'Claws',        stats: { might: 3 } },
  smoke:      { family: 'ember', name: 'Smoke Vents',  stats: { speed: 1, might: 1 } },
  magma:      { family: 'ember', name: 'Magma Veins',  stats: { might: 1, vigor: 1 } },
  firetail:   { family: 'ember', name: 'Fire Tail',    stats: { might: 2 } },
  // goo
  extraarms:  { family: 'goo',   name: 'Extra Arms',   stats: { might: 2 } },
  extralegs:  { family: 'goo',   name: 'Extra Legs',   stats: { speed: 2 } },
  secondhead: { family: 'goo',   name: 'Second Head',  stats: { wits: 2, vigor: 1 } },
  blobbelly:  { family: 'goo',   name: 'Blob Belly',   stats: { vigor: 3 } },
  feelers:    { family: 'goo',   name: 'Feelers',      stats: { wits: 1, speed: 1 } },
};

export const MUTATION_IDS = Object.keys(MUTATIONS);

export function familyMutations(family) {
  return MUTATION_IDS.filter((id) => MUTATIONS[id].family === family);
}

// Essence a family needs before its 1st, 2nd, 3rd... mutation.
export const MUTATION_THRESHOLDS = [2, 5, 9, 14, 20];

// The most mutations one creature can hold, from all families together.
export const MAX_MUTATIONS = 8;

// Two mutations from one family teaches its arena ability.
export const FAMILY_ABILITY = {
  bone: 'bonewall',
  sap: 'regrow',
  spark: 'zap',
  ink: 'hex',
  ember: 'flame',
  goo: 'spawnling',
};
