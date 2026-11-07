// Your Chosen: the one creature your godly power runs through. The household remembers who it is
// and how it is attuned, so a creature's own file can't make itself one. Pure rules with no DOM, so
// tests can run them. The numbers are in data/chosen.js.

import { ATTUNEMENTS } from '../data/chosen.js';

// A household file can be edited by hand: only an id, and an attunement that exists.
export function sanitizeChosen(raw) {
  const id = String(raw?.id ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  if (!id || typeof raw?.attune !== 'string' || !Object.hasOwn(ATTUNEMENTS, raw.attune)) return null;
  return { id, attune: raw.attune };
}

// How it is attuned, if it is your Chosen, or null if it isn't.
export const chosenAttune = (house, c) => (c?.id && !c.dead && house?.chosen?.id === c.id ? house.chosen.attune : null);

// Why it can't be your Chosen of this, or null if it can.
export function chooseProblem(house, c, attune) {
  if (!c || c.dead) return 'It has to be alive';
  if (typeof attune !== 'string' || !Object.hasOwn(ATTUNEMENTS, attune)) return 'There is no such attunement';
  if (chosenAttune(house, c) === attune) return `${c.name} is already your Chosen of ${ATTUNEMENTS[attune].name}`;
  return null;
}

// It becomes your Chosen, attuned to this. There is only ever one: whoever it was before isn't now.
export function choose(house, c, attune) {
  if (chooseProblem(house, c, attune)) return false;
  house.chosen = { id: c.id, attune };
  return true;
}

export function unchoose(house) {
  if (!house.chosen) return false;
  house.chosen = null;
  return true;
}
