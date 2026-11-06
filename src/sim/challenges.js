// Challenges: fights against monsters, and what they do to the real creature afterward.
// The fight itself uses a copy, so nothing here changes the creature until settleChallenge().

import { clamp, makeRng } from '../lib/util.js';
import { computeStats, parseCreature, serializeCreature, addActivityXp, fitsSoul, STAT_KEYS, TRAINING_LIMIT } from '../core/creature.js';
import { Bout, finishBout } from './arena.js';
import {
  TRAINING_MONSTERS, DEADLY_MONSTERS, LEGEND_WINS_FOR_ULTIMATE, TRAINING_CHANCE, TRAINING_SCALE, DEADLY_ROLL, FIGHT_HUNGER, MIN_FULLNESS_TO_FIGHT,
} from '../data/monsters.js';
import { ultimatesOpen } from '../core/reborn.js';

export const isDeadly = (id) => Object.hasOwn(DEADLY_MONSTERS, id);
export const monsterDef = (id) => (isDeadly(id) ? DEADLY_MONSTERS[id] : TRAINING_MONSTERS[id]);
export const isLegendRoad = (id) => DEADLY_MONSTERS[id]?.road === 'legend';
export const beatenAlready = (c, id) => (isLegendRoad(id) ? (c.legendWins ?? []).includes(id) : c.trophies.includes(id));

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
  if (isDeadly(id) && beatenAlready(c, id)) return 'it already beat this one';
  if (DEADLY_MONSTERS[id]?.ultimate && !ultimatesOpen(c)) return `it has to win ${LEGEND_WINS_FOR_ULTIMATE} on the Legendary road first`;
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

// A Legendary mutation it won. With none yet it just grows it. With one already, the new one waits
// in c.soulOffer for you to take it or keep the old one. Either way, only if its powers all fit:
// trading souls can't cost it a power.
function winSoul(c, soul, result) {
  if (c.legendary === soul) return;
  if (!fitsSoul(c, soul)) {
    result.noFit = soul;
  } else if (!c.legendary) {
    c.legendary = soul;
    result.legendary = soul;
  } else {
    c.soulOffer = soul;
    result.offer = soul;
  }
}

// Takes the Legendary mutation waiting in its offer, in place of the one it has. Returns the one it
// gave up (or null if it had none), or false if there is nothing to take or its powers don't fit.
export function takeSoulOffer(c) {
  const soul = c.soulOffer;
  if (!soul || !fitsSoul(c, soul)) return false;
  const old = c.legendary;
  c.legendary = soul;
  c.soulOffer = null;
  return old;
}

export const keepSoul = (c) => { c.soulOffer = null; };

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
    addActivityXp(c, 'battle', 40);
    if (isLegendRoad(id)) {
      // The Legendary road gives no trophy, only its Legendary mutation and a step toward the ultimates.
      c.legendWins = c.legendWins ?? [];
      if (!c.legendWins.includes(id)) c.legendWins.push(id);
      result.opened = c.legendWins.length === LEGEND_WINS_FOR_ULTIMATE;
    } else {
      if (!c.trophies.includes(id)) c.trophies.push(id);
      result.trophy = def.trophy;
    }
    // The only way to get a Legendary mutation: beat the monster that gives it.
    if (def.soul) winSoul(c, def.soul, result);
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
