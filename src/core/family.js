// Breeding, the nurse, and passing One For All on. Pure rules with no DOM, so tests can run them.

import {
  newCreature, stageIndex, STAGES, creatureColors, fullName, powerOf, hpGivenUp, perksOf, pathNodes, lineageOf, otherLineOf, ofaLevel,
} from './creature.js';
import { statText } from './sheet.js';
import { MUTATIONS, MAX_MUTATIONS } from '../data/mutations.js';
import { QUIRKS, TRAITS, MAX_HP_GIVEN, OFA_ID, ofaLevelFor, TECHNIQUES, BRED_TRAIT_IDS, BRED_RULES } from '../data/powers.js';
import { PATHS } from '../data/paths.js';
import { BREED_STAGE, BREED_FULLNESS, BREED_COST, BREED_GIFTS, MAX_CARE_SAVE, MEGA_BREEDER, ALTAR } from '../data/family.js';
import { RACES, PURE_BLOOD_CHANCE, MIN_SHARE, DEFAULT_RACE } from '../data/races.js';
import { heritageOf, raceParts, hasTrait } from './creature.js';

// ---------- the nurse ----------

export const isNurse = (c) => PATHS[c.path.line[0]]?.activity === 'care';

// What the most trained nurse among these creatures adds to breeding. Without one, nothing.
export function nurseHelp(creatures) {
  const best = creatures.filter((c) => c && !c.dead && isNurse(c)).sort((a, b) => pathNodes(b).length - pathNodes(a).length)[0];
  if (!best) return { nurse: null, picks: 0, save: 0, growth: 0 };
  const p = perksOf(best);
  return { nurse: best, picks: p.carePicks, save: Math.min(MAX_CARE_SAVE, p.careSave), growth: p.hatchGrowth };
}

// ---------- the Mega Breeder ----------

// Why the household can't buy one, or null if it can.
export function megaBreederProblem(house) {
  if (house.megaBreeder) return 'You already have the Mega Breeder';
  if (house.bank.gems < MEGA_BREEDER.cost) return `It costs ${MEGA_BREEDER.cost} gems`;
  return null;
}

export function buyMegaBreeder(house) {
  if (megaBreederProblem(house)) return false;
  house.bank.gems -= MEGA_BREEDER.cost;
  house.megaBreeder = true;
  return true;
}

// ---------- the Bloodline Altar ----------

export function altarProblem(house) {
  if (house.altar) return 'You already have the Bloodline Altar';
  if (house.bank.gems < ALTAR.cost) return `It costs ${ALTAR.cost} gems`;
  return null;
}

export function buyAltar(house) {
  if (altarProblem(house)) return false;
  house.bank.gems -= ALTAR.cost;
  house.altar = true;
  return true;
}

// The races a sacrifice would give the altar: every race it is at least half of, other than Human,
// which every egg can already be. A Half-devil gives Devil.
export const altarRacesOf = (c) => raceParts(c)
  .filter(([id, share]) => id !== DEFAULT_RACE && id !== 'halfdevil' && (c.pureBlood || share >= ALTAR.share))
  .map(([id]) => id);

// Why this one can't go on the altar, or null if it can. What it would add has to be new.
export function sacrificeProblem(house, c) {
  if (!house.altar) return 'Buy the Bloodline Altar first';
  if (c.dead) return `${c.name} is gone`;
  const races = altarRacesOf(c);
  if (!races.length) return `${c.name} isn't at least half of any race but Human`;
  if (races.every((id) => house.altarRaces.includes(id))) return `Eggs can already be ${races.map((id) => RACES[id].name).join(' and ')}`;
  return null;
}

// It is gone for good, and its races join the altar. Returns the races it added, or null.
export function sacrifice(house, c, now = Date.now()) {
  if (sacrificeProblem(house, c)) return null;
  const added = altarRacesOf(c).filter((id) => !house.altarRaces.includes(id));
  house.altarRaces.push(...added);
  c.dead = { at: now, by: 'the Bloodline Altar' };
  return added;
}

// The races an egg from the Nursery can hatch as: Human, and whatever the altar has.
export const eggRaces = (house) => [DEFAULT_RACE, ...(house.altar ? house.altarRaces : [])];

// ---------- gifts awakened by breeding ----------

// Does this pair have what it takes for a baby to awaken this gift?
export function bredRuleMet(id, a, b) {
  const rule = BRED_RULES[id];
  if (!rule) return false;
  if (rule.both && !(hasTrait(a, rule.both) && hasTrait(b, rule.both))) return false;
  if (rule.either && !(hasTrait(a, rule.either) || hasTrait(b, rule.either))) return false;
  if (rule.trophies && !(a.trophies.length >= rule.trophies && b.trophies.length >= rule.trophies)) return false;
  if (rule.sameFamily && lineageOf(a) !== lineageOf(b)) return false;
  return true;
}

// What a pair needs for each bred gift, in words, read from the rule itself. A whole sentence, or
// with sentence false just the words, to go in the middle of one.
export function bredRuleText(id, sentence = true) {
  const rule = BRED_RULES[id];
  const bits = [];
  if (rule.both) bits.push(`both parents have ${TRAITS[rule.both].name}`);
  if (rule.either) bits.push(`a parent has ${TRAITS[rule.either].name}`);
  if (rule.trophies) bits.push(rule.trophies === 1 ? 'both parents have won a fight to the death' : `both parents have won ${rule.trophies} fights to the death`);
  if (rule.sameFamily) bits.push('both parents have the same last name');
  const text = bits.join(', and ');
  return sentence ? `${text.charAt(0).toUpperCase()}${text.slice(1)}.` : text;
}

// The bred gifts this pair's baby could awaken, with the chance of each: { id, oneIn }. A gift the
// baby is already getting from a parent isn't on the list.
export function awakenChances(a, b, passing = []) {
  return BRED_TRAIT_IDS
    .filter((id) => !passing.includes(id) && bredRuleMet(id, a, b))
    .map((id) => ({ id, oneIn: BRED_RULES[id].oneIn }));
}

// ---------- breeding ----------

// help is what helps this egg along: the nurse's help, plus mega: true with the Mega Breeder.
export const giftLimit = (help) => BREED_GIFTS + (help?.picks ?? 0) + (help?.mega ? MEGA_BREEDER.gifts : 0);
// The fullness each parent spends, after the nurse's help.
export const breedCost = (help) => Math.round(BREED_COST * (1 - (help?.save ?? 0)));

// Why this one can't be a parent right now, or null if it can.
export function breedProblem(c) {
  if (c.dead) return `${c.name} is gone`;
  if (stageIndex(c) < BREED_STAGE) return `${c.name} has to be a ${STAGES[BREED_STAGE].name} first (growth ${Math.floor(c.growth)} of ${STAGES[BREED_STAGE].at})`;
  if (c.fullness < BREED_FULLNESS) return `${c.name} is too hungry`;
  return null;
}

// Everything the two of them could pass on, each thing once even if both have it.
// One For All never passes this way: it only goes on when its holder gives everything for it.
export function giftsOf(a, b) {
  const list = [];
  const add = (kind, id, from, name, what) => {
    if (!list.some((g) => g.kind === kind && g.id === id)) list.push({ key: `${kind}:${id}`, kind, id, from, name, what });
  };
  const both = [['a', a], ['b', b]];
  // Earned gifts were learned, not born, so they stay with the parent.
  both.forEach(([who, p]) => p.traits.filter((id) => !TRAITS[id].earned).forEach((id) => add('trait', id, who, TRAITS[id].name, TRAITS[id].blurb)));
  both.forEach(([who, p]) => p.mutations.forEach((m) => add('mutation', m.id, who, MUTATIONS[m.id].name, `Mutation: ${statText(MUTATIONS[m.id].stats)}.`)));
  both.forEach(([who, p]) => p.powers.quirks.filter((id) => id !== OFA_ID).forEach((id) => add('quirk', id, who, QUIRKS[id].name, `Quirk: ${statText(QUIRKS[id].stats)}. It costs the baby ${QUIRKS[id].cost}% of its max HP, the same as it did the parent.`)));
  return list;
}

// What is wrong with these choices, or null if they work.
export function choiceProblem(a, b, choice, help = null) {
  const keys = [...new Set(choice?.gifts ?? [])];
  const gifts = giftsOf(a, b);
  if (!keys.every((k) => gifts.some((g) => g.key === k))) return 'That did not come from either parent';
  if (keys.length > giftLimit(help)) return `Only ${giftLimit(help)} things can pass on`;
  const quirks = keys.filter((k) => k.startsWith('quirk:'));
  if (quirks.length > 1) return 'Only one Quirk can pass on';
  if (quirks.length && QUIRKS[quirks[0].slice(6)].cost > MAX_HP_GIVEN) return 'That Quirk costs too much';
  if (keys.filter((k) => k.startsWith('mutation:')).length > MAX_MUTATIONS) return 'Too many mutations';
  return null;
}

// A baby's races: half of each parent's, rounded to quarters. Whatever falls under a quarter fades,
// and the quarters left over go to whichever races were closest to earning one. A Devil with a Human
// makes a Half-Devil; a Half-Giant with a Human makes a Quarter-Giant.
export function mixHeritage(a, b) {
  const shares = {};
  for (const p of [a, b]) {
    for (const [id, s] of Object.entries(heritageOf(p))) shares[id] = (shares[id] ?? 0) + s / 2;
  }
  const steps = Math.round(1 / MIN_SHARE);
  const parts = Object.entries(shares).map(([id, s]) => ({ id, n: Math.floor(s * steps + 1e-9), rest: s * steps - Math.floor(s * steps + 1e-9) }));
  let left = steps - parts.reduce((t, p) => t + p.n, 0);
  for (const p of parts.slice().sort((x, y) => y.rest - x.rest || x.id.localeCompare(y.id))) {
    if (left <= 0) break;
    if (p.rest > 1e-9) {
      p.n += 1;
      left -= 1;
    }
  }
  return Object.fromEntries(parts.filter((p) => p.n > 0).map((p) => [p.id, p.n / steps]));
}

// The race it is most of, not counting Human, which the game calls its race for short.
export const mainRace = (heritage) => Object.entries(heritage).filter(([id]) => id !== DEFAULT_RACE).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0]?.[0] ?? DEFAULT_RACE;

// The two of them make an egg. choice: { family, look, style: 'a' | 'b', race, gifts: [gift keys] }.
// Returns { baby } and spends both parents' fullness, or { problem } and changes nothing.
export function breed(a, b, choice, name, now = Date.now(), help = null, rng = Math.random) {
  if (!a || !b || a.id === b.id) return { problem: 'It takes two' };
  const problem = breedProblem(a) ?? breedProblem(b) ?? choiceProblem(a, b, choice, help);
  if (problem) return { problem };
  const pick = (who) => (who === 'b' ? b : a);
  const first = pick(choice.family);
  const second = first === a ? b : a;
  const baby = newCreature(name, now);
  // It takes one parent's last name. The other parent's family becomes the other side of its family.
  baby.lineage = lineageOf(first);
  baby.otherLine = [lineageOf(second), otherLineOf(second), otherLineOf(first)].find((t) => t !== baby.lineage) ?? baby.otherLine;
  const keys = new Set(choice.gifts ?? []);
  const gifts = giftsOf(a, b).filter((g) => keys.has(g.key));
  baby.traits = gifts.filter((g) => g.kind === 'trait').map((g) => g.id);
  baby.mutations = gifts.filter((g) => g.kind === 'mutation').map((g) => ({ id: g.id, from: 'parent', at: now }));
  baby.powers.quirks = gifts.filter((g) => g.kind === 'quirk').map((g) => g.id);
  const look = creatureColors(pick(choice.look));
  baby.look.dye = look.tinted ? look.body : null;
  const style = pick(choice.style).battle;
  baby.battle = { ...baby.battle, stance: style.stance, hurt: style.hurt, target: style.target };
  baby.heritage = mixHeritage(a, b);
  baby.race = mainRace(baby.heritage);
  baby.pureBlood = Object.keys(baby.heritage).length > 1 && rng() < PURE_BLOOD_CHANCE;
  // Something new can wake up in it, if its parents have what that takes.
  const awakened = awakenChances(a, b, baby.traits).filter(({ oneIn }) => rng() < 1 / oneIn).map(({ id }) => id);
  baby.traits.push(...awakened);
  baby.parents = [{ id: a.id, name: fullName(a) }, { id: b.id, name: fullName(b) }];
  baby.growth = help?.growth ?? 0;
  for (const p of [a, b]) {
    p.fullness = Math.max(0, p.fullness - breedCost(help));
    p.bredAt = now;
  }
  return { baby, awakened };
}

// ---------- One For All ----------

// Why this heir can't take One For All from this holder, or null if it can.
export function heirProblem(giver, heir) {
  if (!giver.powers.quirks.includes(OFA_ID)) return `${giver.name} does not hold One For All`;
  if (!heir || heir.id === giver.id) return 'It has to go to someone else';
  if (heir.dead) return `${heir.name} is gone`;
  if (heir.powers.quirks.includes(OFA_ID)) return `${heir.name} already holds it`;
  if (hpGivenUp(heir) + QUIRKS[OFA_ID].cost > MAX_HP_GIVEN) return `${heir.name} has no max HP left to give for it`;
  return null;
}

// What a holder is worth on its own, without One For All's help, so the stockpile can't feed itself.
export const ownPower = (c) => powerOf({ ...c, powers: { ...c.powers, quirks: c.powers.quirks.filter((id) => id !== OFA_ID) } });

// The stockpile after this holder adds everything it is.
export const stockpileAfter = (giver) => (giver.ofa?.stockpile ?? 0) + ownPower(giver);

// The holder gives everything. It is marked dead, and its power joins the stockpile in its heir.
export function passOn(giver, heir, now = Date.now()) {
  if (heirProblem(giver, heir)) return null;
  const before = ofaLevel(giver);
  const stockpile = stockpileAfter(giver);
  heir.powers.quirks.push(OFA_ID);
  heir.ofa = { stockpile, holders: [...(giver.ofa?.holders ?? []), fullName(giver)].slice(-12) };
  giver.dead = { at: now, by: 'One For All', to: heir.name };
  return { before, level: ofaLevelFor(stockpile), stockpile };
}

// For the Cursed Body line in the breed note: which technique each side would bring.
export const familyLine = (c) => ({ name: TECHNIQUES[lineageOf(c)].family, technique: TECHNIQUES[lineageOf(c)].name });
