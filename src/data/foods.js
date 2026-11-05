// What a creature eats. Two kinds, kept simple:
//   A snack is free and always there. It fills it up and helps it grow, and that is all.
//   Farmed food comes in six families, one plant each (see data/crafting.js). Only these grow
//   mutations, and `label` is what the game calls each family.
// A real food file dragged onto the creature counts as a snack. `ext` is that file's extension.

export const SNACK = { growth: 4, fullness: 24 };

export const FOOD_ORDER = ['bone', 'sap', 'spark', 'ink', 'ember', 'goo'];

export const FOODS = {
  bone:  { ext: 'bone',  label: 'Stone Bean',  color: '#efe6cf', stat: 'guard' },
  sap:   { ext: 'sap',   label: 'Heart Beet',  color: '#7ed957', stat: 'vigor' },
  spark: { ext: 'spark', label: 'Zip Root',    color: '#6fe7ff', stat: 'speed' },
  ink:   { ext: 'ink',   label: 'Mind Melon',  color: '#b78cff', stat: 'wits' },
  ember: { ext: 'ember', label: 'Fire Pepper', color: '#ff8a3c', stat: 'might' },
  goo:   { ext: 'goo',   label: 'Mutagen Cap', color: '#c6f135', stat: null },
};

// How much a meal of this size counts for, used for farmed food.
export function nutritionOf(bytes) {
  const n = 2 + Math.log2(Math.max(bytes, 256) / 256);
  return Math.min(10, Math.max(2, n));
}
export function essenceOf(bytes) {
  if (bytes >= 24 * 1024) return 3;
  if (bytes >= 4 * 1024) return 2;
  return 1;
}
export function fillOf(bytes) {
  return 12 + nutritionOf(bytes) * 3;
}
