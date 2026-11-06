// Challenges: fights against monsters, and what they do to the real creature afterward.
// The fight itself uses a copy, so nothing here changes the creature until settleChallenge().

import { clamp, makeRng } from '../lib/util.js';
import { computeStats, parseCreature, serializeCreature, addActivityXp, STAT_KEYS, TRAINING_LIMIT } from '../core/creature.js';
import { Bout, finishBout } from './arena.js';
import {
  TRAINING_MONSTERS, DEADLY_MONSTERS, TRAINING_CHANCE, TRAINING_SCALE, DEADLY_ROLL, FIGHT_HUNGER, MIN_FULLNESS_TO_FIGHT,
} from '../data/monsters.js';
import { LEGENDARY_ID, MALEVOLENT_ID, LEGENDARY_FROM_TROPHY } from '../data/powers.js';
import { ultimatesOpen } from '../core/reborn.js';

export const isDeadly = (id) => Object.hasOwn(DEADLY_MONSTERS, id);
export const monsterDef = (id) => (isDeadly(id) ? DEADLY_MONSTERS[id] : TRAINING_MONSTERS[id]);

// Training monsters are sized to the creature, so they stay useful however strong it gets.
export function trainingMonsterStats(c, def) {
  const s = computeStats(c);
  return Object.fromEntries(STAT_KEYS.map((k) => [k, Math.max(3, Math.round(s[k] * (k === def.stat ? TRAINING_SCALE.focus : TRAINING_SCALE.rest)))]));
}

// How strong this particular deadly monster turned out to be.
export function deadlyMonsterStats(def, seed) {
  const share = DEADLY_ROLL.low + makeRng(seed)() * (DEADLY_ROLL.high - DEADLY_ROLL.low);
  return Object.fromEntries(STAT_KEYS.map((k) => [k, Math.round(def.stats[k] * share)]));
}

export const trainingFull = (c, stat) => (c.training[stat] ?? 0) >= TRAINING_LIMIT;

// Why this fight can't start, or null if it can.
export function fightProblem(c, id) {
  if (c.dead) return 'it is dead';
  if (c.fullness < MIN_FULLNESS_TO_FIGHT) return 'too hungry to fight';
  if (isDeadly(id) && c.trophies.includes(id)) return 'it already beat this one';
  if (DEADLY_MONSTERS[id]?.ultimate && !ultimatesOpen(c)) return 'it has to beat every deadly monster first';
  return null;
}

export function startChallenge(c, id, options) {
  const def = monsterDef(id);
  const deadly = isDeadly(id);
  const bout = new Bout([parseCreature(serializeCreature(c))], options);
  bout.addMonster(def, deadly ? deadlyMonsterStats(def, options?.seed ?? 1) : trainingMonsterStats(c, def));
  bout.deadly = deadly;
  return bout;
}

// A fight burns fullness whether it is won or lost.
export function payForFight(c, id) {
  c.fullness = clamp(c.fullness - FIGHT_HUNGER[isDeadly(id) ? 'deadly' : 'training'], 0, 100);
}

export const wonChallenge = (bout) => bout.winner?.team === 0;

// Whether a Twin Soul can hold everything it has now. Only a Malevolent Soul lets a Devil Fruit sit
// beside another power, so trading that for a Twin Soul would cost it the fruit.
export function twinSoulFits(c) {
  const held = ['stand', 'speedster', 'technique', 'fruit'].filter((k) => c.powers[k]);
  return !(c.powers.fruit && held.length > 1);
}

// What the fight does to the real creature. `roll` is the training chance, 0 to 1.
export function settleChallenge(c, id, won, roll = Math.random(), now = Date.now()) {
  const def = monsterDef(id);
  const deadly = isDeadly(id);
  const result = { won, deadly, def, trained: null, trophy: null, legendary: null, died: false };
  if (!won) {
    c.record.monstersLost += 1;
    if (deadly) {
      c.dead = { at: now, by: def.name };
      result.died = true;
    }
    return result;
  }
  c.record.monstersBeaten += 1;
  if (deadly) {
    if (!c.trophies.includes(id)) c.trophies.push(id);
    result.trophy = def.trophy;
    addActivityXp(c, 'battle', 40);
    // The Last Dragon always leaves a Twin Soul, even in place of a Malevolent Soul. Any other kill
    // sometimes leaves something darker, if it has no Legendary mutation yet.
    if (def.legendary && c.legendary !== LEGENDARY_ID) {
      if (twinSoulFits(c)) {
        result.replaced = c.legendary;
        c.legendary = LEGENDARY_ID;
        result.legendary = LEGENDARY_ID;
      } else {
        result.keptSoul = c.legendary;
      }
    } else if (!def.legendary && !c.legendary && roll < LEGENDARY_FROM_TROPHY) {
      c.legendary = MALEVOLENT_ID;
      result.legendary = c.legendary;
    }
  } else {
    addActivityXp(c, 'battle', 4);
    if (roll < TRAINING_CHANCE && !trainingFull(c, def.stat)) {
      c.training[def.stat] = Math.min(TRAINING_LIMIT, (c.training[def.stat] ?? 0) + 1);
      result.trained = def.stat;
    }
  }
  return result;
}

// Plays the fight out a number of times on copies, for an honest answer before risking it all.
export function oddsOfWinning(c, id, rounds = 30) {
  let wins = 0;
  for (let seed = 1; seed <= rounds; seed++) {
    if (wonChallenge(finishBout(startChallenge(c, id, { seed, r: 200 })))) wins++;
  }
  return wins / rounds;
}
