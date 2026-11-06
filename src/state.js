// Shared game state, plus saving.

import { serializeCreature } from './core/creature.js';
import { emptyHouse, withoutHouse } from './core/house.js';
import { Fx } from './draw/scene.js';

export const api = window.api;

export const G = {
  // Up to TEAM_MAX creatures are out at once: { c, base, pet, animals }. creature, base and pet are
  // the one you are looking after, the last one you clicked. Every panel is about that one.
  team: [],
  // The bank, plants and food store all your creatures share. Saved in world/data/household.json.
  house: emptyHouse(),
  // Every living creature, and those of them at home in the village: { base, c }.
  everyone: [],
  village: [],
  // The Adventure level being fought, while one is on.
  adventureRun: null,
  creature: null,
  base: null,
  pet: null,
  fx: new Fx(),
  screen: { w: 1920, h: 1080, work: { x: 0, y: 0, w: 1920, h: 1040 } },
  display: null,
  settings: { quiet: false, bottomOnly: false },
  speed: 1,
  test: false,
  home: '',
  cursor: { x: -1, y: -1 },
  hidden: false,
  meals: [],
  drops: [],
  egg: null,
  bout: null,
  // Creatures fighting in the ring right now, whose picture leaves the screen while they do.
  boutHide: new Set(),
  dragHover: 0,
  challenge: null,
  veins: [],
  picking: false,
};

export const memberOf = (c) => G.team.find((m) => m.c === c || (c && m.c.id === c.id));

// Is this creature out of sight because it is fighting in the ring?
export const inBout = (c) => !!G.bout && G.boutHide.has(c.id);

export const saveHouse = () => api.saveData('household', JSON.stringify(G.house));

// A creature's own file never holds the shared pool, so nothing in it can be counted twice.
export const creatureText = (c) => serializeCreature(withoutHouse(c));

// Saves one creature that is out, the one being looked after unless told otherwise. The shared
// pool goes first, so a stop part way through can't lose what was just earned.
export function saveCreature(c = G.creature) {
  const m = c && G.team.find((x) => x.c === c);
  if (!m) return Promise.resolve();
  c.lastSeen = Date.now();
  return saveHouse().then(() => api.saveCreature(m.base, creatureText(c)));
}

export const saveTeam = () => Promise.all(G.team.map((m) => saveCreature(m.c)));

// Remembers who is out and who is being looked after, for the next time the game starts.
export const rememberTeam = () => api.setTeam(G.team.map((m) => m.base), G.base ?? G.team[0]?.base ?? '');
