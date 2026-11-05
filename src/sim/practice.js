// Practice fights for the battle plan note: tries each stance on copies, against rivals of about
// its own strength who keep close. Nothing it does here touches the real creature.

import { parseCreature, serializeCreature, wildCreature, powerOf } from '../core/creature.js';
import { Bout, finishBout } from './arena.js';
import { STANCE_IDS } from '../data/battle.js';

const rivalLevel = (c) => {
  const power = powerOf(c);
  if (power < 60) return 1;
  return power < 80 ? 2 : 3;
};

// Win share for each stance, out of `rounds` fights each. Every stance meets the same rivals.
export function practiceStances(c, rounds = 16) {
  const results = {};
  const level = rivalLevel(c);
  for (const stance of STANCE_IDS) {
    let wins = 0;
    for (let i = 0; i < rounds; i++) {
      const me = parseCreature(serializeCreature(c));
      me.battle.stance = stance;
      const rival = wildCreature(8000 + i, level);
      rival.powers = { stand: null, speedster: false, quirks: [] };
      rival.battle.stance = 'close';
      const bout = finishBout(new Bout(i % 2 ? [rival, me] : [me, rival], { seed: i + 1 }));
      if (bout.winner?.c === me) wins++;
    }
    results[stance] = wins / rounds;
  }
  return results;
}
