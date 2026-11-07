// Families, born-with gifts, breeding, the nurse, and One For All.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  newCreature, parseCreature, serializeCreature, sanitizeCreature, computeStats, statLimits, rawStats, wildCreature, maxHpOf, hpGivenUp,
  lineageOf, otherLineOf, lineageFromId, bornWith, lastName, fullName, hasTrait, powersHeld, gainQuirk, ofaLevel, abilitiesOf, powerOf,
  learnTechnique, canLearnSecondTechnique, learnSecondTechnique, perksOf, choosePath, STAGES, STAT_LIMITS,
} from '../src/core/creature.js';
import {
  breed, breedProblem, breedCost, giftsOf, giftLimit, choiceProblem, nurseHelp, isNurse, heirProblem, passOn, stockpileAfter, ownPower,
  megaBreederProblem, buyMegaBreeder, familyChangeProblem, changeFamily,
} from '../src/core/family.js';
import { describeMove, moveList, buildSheet, ofaText, tuningOf, perkText } from '../src/core/sheet.js';
import {
  TECHNIQUES, TECHNIQUE_IDS, TRAITS, TRAIT_IDS, TRAIT_ODDS, SIX_EYES_EVERY, OFA_ID, OFA_LEVEL_AT, OFA_MAX_LEVEL, OFA_MOVES,
  ofaLevelFor, ofaStats, ofaLimitBonus, ofaHit, tuneMove, QUIRKS, MAX_HP_GIVEN, TECHNIQUE_MIGHT,
} from '../src/data/powers.js';
import { ABILITIES, PATHS, ROOT_PATHS, TIER_XP } from '../src/data/paths.js';
import {
  TEAM_MAX, BREED_STAGE, BREED_FULLNESS, BREED_COST, BREED_GIFTS, MAX_CARE_SAVE, MEGA_BREEDER, FAMILY_CHANGE_COST,
} from '../src/data/family.js';
import { Bout, runBout, finishBout } from '../src/sim/arena.js';
import { emptyHouse } from '../src/core/house.js';

const clean = (s) => !/undefined|NaN|null|\[object/.test(s);
const HOUR = 3600 * 1000;
const NOW = 1_800_000_000_000;

// A creature old and fed enough to be a parent.
function adult(name, extra = {}) {
  const c = newCreature(name, NOW - 10 * HOUR);
  c.growth = STAGES[BREED_STAGE].at + 5;
  c.fullness = 90;
  return Object.assign(c, extra);
}

// ---------- families ----------

test('every creature has a family and another side, and old saves keep the family they always had', () => {
  for (let i = 0; i < 200; i++) {
    const c = newCreature(`F${i}`);
    assert.ok(Object.hasOwn(TECHNIQUES, c.lineage) && Object.hasOwn(TECHNIQUES, c.otherLine));
    assert.notEqual(c.lineage, c.otherLine);
    assert.equal(c.lineage, lineageFromId(c.id), 'a new egg gets the family its id always gave');
    // A save from before families were written down.
    const raw = JSON.parse(serializeCreature(c));
    delete raw.lineage;
    delete raw.otherLine;
    delete raw.traits;
    const back = sanitizeCreature(raw);
    assert.equal(lineageOf(back), lineageOf(c));
    assert.equal(otherLineOf(back), otherLineOf(c));
    assert.deepEqual(back.traits, c.traits);
  }
});

test('a written-down family wins over the id, and nonsense falls back to the id', () => {
  const c = newCreature('Named');
  const other = TECHNIQUE_IDS.find((t) => t !== lineageFromId(c.id));
  const raw = JSON.parse(serializeCreature(c));
  raw.lineage = other;
  assert.equal(lineageOf(parseCreature(JSON.stringify(raw))), other);
  raw.lineage = '__proto__';
  assert.equal(lineageOf(parseCreature(JSON.stringify(raw))), lineageFromId(c.id));
  raw.lineage = other;
  raw.otherLine = other;
  const back = parseCreature(JSON.stringify(raw));
  assert.notEqual(back.otherLine, back.lineage, 'the other side is never the same family');
});

// ---------- born with ----------

test('gifts come from the egg, the same every time, and Six Eyes only ever hatches into the Gojo family', () => {
  const counts = Object.fromEntries(TRAIT_IDS.map((t) => [t, 0]));
  let gojo = 0;
  for (let i = 0; i < 6000; i++) {
    const c = newCreature('Egg');
    assert.deepEqual(bornWith(c.id, c.lineage), c.traits);
    c.traits.forEach((t) => { counts[t] += 1; });
    if (c.lineage === 'limitless') gojo += 1;
    if (c.traits.includes('sixeyes')) assert.equal(c.lineage, 'limitless');
  }
  assert.ok(Math.abs(counts.sharingan / 6000 - 1 / TRAIT_ODDS.sharingan) < 0.025, `sharingan ${counts.sharingan}`);
  assert.ok(Math.abs(counts.cursedbody / 6000 - 1 / TRAIT_ODDS.cursedbody) < 0.025, `cursed body ${counts.cursedbody}`);
  assert.ok(Math.abs(counts.sixeyes / gojo - 1 / TRAIT_ODDS.sixeyes) < 0.08, `six eyes ${counts.sixeyes} of ${gojo}`);
});

test('a file can only claim gifts that exist, once each', () => {
  const raw = JSON.parse(serializeCreature(newCreature('Liar')));
  raw.traits = ['sharingan', 'sharingan', 'godmode', '__proto__', 7];
  assert.deepEqual(parseCreature(JSON.stringify(raw)).traits, ['sharingan']);
  TRAIT_IDS.forEach((t) => assert.ok(clean(TRAITS[t].blurb) && TRAITS[t].name, t));
});

// ---------- Cursed Body ----------

test('a Cursed Body can awaken the other side of its family too, in the same place', () => {
  const c = newCreature('Vessel');
  c.traits = ['cursedbody'];
  c.training.might = 40;
  c.essence.ember = 60;
  assert.ok(computeStats(c).might >= TECHNIQUE_MIGHT);
  assert.equal(canLearnSecondTechnique(c), false, 'its own technique comes first');
  assert.ok(learnTechnique(c));
  assert.ok(canLearnSecondTechnique(c));
  assert.ok(learnSecondTechnique(c));
  assert.equal(c.powers.technique2, otherLineOf(c));
  assert.equal(powersHeld(c), 1, 'two techniques still count as one power');
  const moves = abilitiesOf(c);
  TECHNIQUES[c.powers.technique].moves.forEach((id) => assert.ok(moves.includes(id)));
  TECHNIQUES[c.powers.technique2].moves.forEach((id) => assert.ok(moves.includes(id)));
  const back = parseCreature(serializeCreature(c));
  assert.equal(back.powers.technique2, c.powers.technique2);
  assert.ok(buildSheet(c).some((s) => s.rows.some((r) => r.name.includes('(Cursed Body)'))));
});

test('without a Cursed Body, a second technique never sticks', () => {
  const c = newCreature('Plain');
  c.traits = [];
  c.training.might = 40;
  c.essence.ember = 60;
  learnTechnique(c);
  assert.equal(canLearnSecondTechnique(c), false);
  assert.equal(learnSecondTechnique(c), false);
  const raw = JSON.parse(serializeCreature(c));
  raw.powers.technique2 = 'shrine';
  assert.equal(parseCreature(JSON.stringify(raw)).powers.technique2, null);
});

// ---------- Six Eyes ----------

test('Six Eyes brings Infinity up on its own every 4 seconds, and says so', () => {
  const tuned = tuneMove('infinity', ABILITIES.infinity, { sixEyes: true });
  assert.equal(tuned.cd, SIX_EYES_EVERY);
  assert.ok(tuned.auto);
  assert.ok(describeMove(tuned).includes(`Comes up on its own every ${SIX_EYES_EVERY} seconds`));
  assert.deepEqual(tuneMove('hollowpurple', ABILITIES.hollowpurple, { sixEyes: true }), ABILITIES.hollowpurple, 'only Infinity changes');
  const gojo = newCreature('Satoru');
  gojo.traits = ['sixeyes'];
  gojo.powers.technique = 'limitless';
  assert.ok(moveList(gojo).find((m) => m.id === 'infinity').what.includes('on its own'));
});

test('in a fight, Six Eyes keeps Infinity coming about every 4 seconds', () => {
  const count = (eyes) => {
    let total = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const me = wildCreature(500 + seed, 3);
      me.powers = { stand: null, speedster: false, technique: 'limitless', technique2: null, quirks: [] };
      me.traits = eyes ? ['sixeyes'] : [];
      const bout = new Bout([me, wildCreature(900 + seed, 1)], { seed });
      const mine = bout.fighters[0];
      // Nobody falls, so the fight runs the full 30 seconds.
      bout.fighters.forEach((x) => { x.hp = 1e7; x.maxHp = 1e7; });
      for (let i = 0; i < 30 * 30 && !bout.done; i++) {
        bout.tick(1 / 30);
        for (const e of bout.drainEvents()) if (e.type === 'ability' && e.who === mine.id && e.name === 'INFINITY') total += 1;
      }
    }
    return total / 6;
  };
  const plain = count(false);
  const eyes = count(true);
  assert.ok(eyes >= 5 && eyes <= 8.5, `Six Eyes cast it ${eyes} times in 30 seconds`);
  assert.ok(eyes > plain * 2, `${eyes} against ${plain}`);
});

// ---------- Sharingan ----------

test('a Sharingan copies the first move it sees, once, and can use it', () => {
  let copiedSomething = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const me = wildCreature(1200 + seed, 1);
    me.traits = ['sharingan'];
    me.battle.off = abilitiesOf(me);
    const rival = wildCreature(1300 + seed, 3);
    // All For One would take the copy straight back off it.
    rival.battle.off = ['steal'];
    const bout = new Bout([me, rival], { seed });
    const mine = bout.fighters[0];
    mine.hp = mine.maxHp = 1e7;
    const before = mine.abilities.length;
    let copies = 0;
    let usedCopy = false;
    for (let i = 0; i < 30 * 40 && !bout.done; i++) {
      bout.tick(1 / 30);
      for (const e of bout.drainEvents()) {
        if (e.type === 'status' && e.text.startsWith('copied')) copies += 1;
        if (e.type === 'ability' && e.who === mine.id && mine.copied) usedCopy = true;
      }
    }
    assert.ok(copies <= 1, 'only ever one copy a fight');
    if (copies) {
      copiedSomething += 1;
      assert.equal(mine.abilities.length, before + 1);
      assert.ok(Object.hasOwn(ABILITIES, mine.copied));
      assert.ok(usedCopy, 'it uses what it copied');
    }
  }
  assert.ok(copiedSomething >= 6, `copied in ${copiedSomething} of 12 fights`);
});

test('without a Sharingan, nothing gets copied', () => {
  const bout = new Bout([wildCreature(1, 3), wildCreature(2, 3)], { seed: 4 });
  bout.fighters.forEach((f) => { f.sharingan = false; });
  for (let i = 0; i < 30 * 30 && !bout.done; i++) {
    bout.tick(1 / 30);
    assert.ok(!bout.drainEvents().some((e) => e.type === 'status' && e.text.startsWith('copied')));
  }
});

// ---------- One For All ----------

test('One For All levels come from its stockpile, from 1 up to 7', () => {
  assert.equal(OFA_MAX_LEVEL, 7);
  assert.equal(ofaLevelFor(0), 1);
  OFA_LEVEL_AT.forEach((at, i) => {
    assert.equal(ofaLevelFor(at), i + 1);
    if (at > 0) assert.equal(ofaLevelFor(at - 1), i);
  });
  assert.equal(ofaLevelFor(1e9), 7);
  for (let level = 2; level <= 7; level++) {
    assert.ok(ofaStats(level).might > ofaStats(level - 1).might);
    assert.ok(ofaLimitBonus(level).might > ofaLimitBonus(level - 1).might);
  }
  assert.deepEqual(ofaStats(1), QUIRKS[OFA_ID].stats, 'level 1 is the Quirk as bought');
  assert.deepEqual(ofaLimitBonus(1), { might: 0, speed: 0 });
});

test('a higher level raises its stats, its limits, and its smashes, and teaches more', () => {
  const c = newCreature('Holder');
  c.growth = 200;
  c.training.might = 40;
  c.essence.ember = 120;
  assert.ok(gainQuirk(c, OFA_ID));
  assert.deepEqual(c.ofa, { stockpile: 0, holders: [] });
  assert.equal(ofaLevel(c), 1);
  const might1 = computeStats(c).might;
  const limit1 = statLimits(c).might;
  const moves1 = abilitiesOf(c);
  c.ofa.stockpile = OFA_LEVEL_AT[6];
  assert.equal(ofaLevel(c), 7);
  assert.equal(statLimits(c).might, limit1 + ofaLimitBonus(7).might);
  assert.ok(computeStats(c).might > might1, `${might1} to ${computeStats(c).might}`);
  assert.ok(computeStats(c).might > STAT_LIMITS[0], 'a line that strong goes past the usual top limit');
  const moves7 = abilitiesOf(c);
  OFA_MOVES.forEach(([id, at]) => assert.equal(moves7.includes(id), true, id) || (at > 1 && assert.ok(!moves1.includes(id), id)));
  const smash7 = moveList(c).find((m) => m.id === 'smash');
  assert.ok(smash7.what.includes(`${Math.round(ABILITIES.smash.power * ofaHit(7) * 100)}%`), smash7.what);
  assert.ok(clean(ofaText(c)) && ofaText(c).includes('as strong as it gets'));
  const back = parseCreature(serializeCreature(c));
  assert.equal(ofaLevel(back), 7);
  assert.equal(JSON.parse(serializeCreature(c)).summary.oneForAllLevel, 7);
});

test('passing One For All on ends the holder and hands its power to the heir', () => {
  const giver = newCreature('Toshinori');
  giver.growth = 200;
  gainQuirk(giver, OFA_ID);
  giver.ofa.stockpile = 150;
  giver.ofa.holders = ['Nana Shimura'];
  const heir = newCreature('Izuku');
  assert.equal(heirProblem(giver, giver), 'It has to go to someone else');
  assert.equal(heirProblem(heir, giver), 'Izuku does not hold One For All');
  const expect = stockpileAfter(giver);
  assert.equal(expect, 150 + ownPower(giver));
  assert.ok(ownPower(giver) < powerOf(giver), 'One For All itself does not count toward the stockpile');
  const res = passOn(giver, heir, NOW);
  assert.equal(res.level, ofaLevelFor(expect));
  assert.ok(res.level > res.before);
  assert.deepEqual(giver.dead, { at: NOW, by: 'One For All', to: 'Izuku' });
  assert.ok(heir.powers.quirks.includes(OFA_ID));
  assert.deepEqual(heir.ofa, { stockpile: expect, holders: ['Nana Shimura', fullName(giver)] });
  assert.equal(hpGivenUp(heir), QUIRKS[OFA_ID].cost, 'the heir pays for holding it too');
  // The gravestone and the heir both survive a save.
  const grave = parseCreature(serializeCreature(giver));
  assert.equal(grave.dead.to, 'Izuku');
  assert.equal(ofaLevel(parseCreature(serializeCreature(heir))), res.level);
  // It can't go to someone who already holds it, or who has no max HP left to give.
  const other = newCreature('Other');
  gainQuirk(other, OFA_ID);
  assert.match(heirProblem(heir, other), /already holds/);
  const spent = newCreature('Spent');
  ['decay', 'hellflame'].forEach((id) => gainQuirk(spent, id));
  assert.ok(hpGivenUp(spent) + QUIRKS[OFA_ID].cost > MAX_HP_GIVEN);
  assert.match(heirProblem(heir, spent), /no max HP left/);
  assert.equal(passOn(heir, spent, NOW), null);
  assert.equal(heir.dead, null, 'a refused pass changes nothing');
});

test('weak holders build the stockpile slowly, strong ones quickly', () => {
  const chain = (growth) => {
    let holder = newCreature('First');
    holder.growth = growth;
    gainQuirk(holder, OFA_ID);
    let passes = 0;
    while (ofaLevel(holder) < OFA_MAX_LEVEL && passes < 100) {
      const next = newCreature(`Heir ${passes}`);
      next.growth = growth;
      passOn(holder, next, NOW);
      holder = next;
      passes += 1;
    }
    return passes;
  };
  const elders = chain(STAGES[4].at);
  const hatchlings = chain(0);
  assert.ok(elders * 3 <= hatchlings, `elders take ${elders} passes, hatchlings ${hatchlings}`);
  assert.ok(hatchlings >= 30, `hatchlings take ${hatchlings} passes`);
});

test('a higher One For All wins more often', () => {
  const wins = (level) => {
    let won = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const me = wildCreature(3000 + seed, 2);
      me.powers = { stand: null, speedster: false, technique: null, technique2: null, quirks: [OFA_ID] };
      me.ofa = { stockpile: OFA_LEVEL_AT[level - 1], holders: [] };
      const rival = wildCreature(7000 + seed, 3);
      const bout = runBout([me, rival], seed);
      if (bout.winner?.c === bout.fighters.find((f) => f.c?.id === me.id)?.c) won += 1;
    }
    return won;
  };
  const low = wins(1);
  const high = wins(7);
  assert.ok(high > low, `level 1 won ${low}, level 7 won ${high}`);
});

// ---------- breeding ----------

test('parents have to be grown and fed, and there is no waiting between eggs', () => {
  const kid = newCreature('Kid', NOW);
  kid.fullness = 90;
  assert.match(breedProblem(kid), /has to be a Scrapper first/);
  const a = adult('A');
  assert.equal(breedProblem(a), null);
  a.fullness = BREED_FULLNESS - 1;
  assert.match(breedProblem(a), /too hungry/);
  a.fullness = 90;
  a.bredAt = NOW;
  assert.equal(breedProblem(a), null, 'having just bred does not stop it');
  a.dead = { at: NOW, by: 'x' };
  assert.match(breedProblem(a), /gone/);
});

test('breeding passes on exactly what you choose, and costs both parents', () => {
  const a = adult('Ma');
  const b = adult('Pa');
  b.lineage = TECHNIQUE_IDS.find((t) => t !== a.lineage);
  a.traits = ['sharingan'];
  b.traits = ['cursedbody'];
  a.mutations.push({ id: 'claws', from: '', at: 0 });
  b.mutations.push({ id: 'claws', from: '', at: 0 }, { id: 'moss', from: '', at: 0 });
  b.powers.quirks.push('decay', 'engine');
  gainQuirk(a, OFA_ID);
  a.battle.stance = 'hold';
  a.look.dye = '#ff00aa';
  const gifts = giftsOf(a, b);
  assert.deepEqual(gifts.map((g) => g.key).sort(), ['mutation:claws', 'mutation:moss', 'quirk:decay', 'quirk:engine', 'trait:cursedbody', 'trait:sharingan'].sort());
  assert.ok(!gifts.some((g) => g.id === OFA_ID), 'One For All never passes by breeding');
  gifts.forEach((g) => assert.ok(clean(g.what), g.key));
  assert.equal(giftLimit(null), BREED_GIFTS);
  assert.match(choiceProblem(a, b, { gifts: ['quirk:decay', 'quirk:engine'] }), /one Quirk/);
  assert.match(choiceProblem(a, b, { gifts: ['trait:sixeyes'] }), /either parent/);
  assert.match(choiceProblem(a, b, { gifts: ['trait:sharingan', 'trait:cursedbody', 'mutation:claws', 'mutation:moss'] }), /Only 3/);
  const { baby, problem } = breed(a, b, { family: 'b', look: 'a', style: 'a', gifts: ['trait:cursedbody', 'mutation:moss', 'quirk:decay'] }, 'Junior', NOW);
  assert.equal(problem, undefined);
  assert.equal(baby.name, 'Junior');
  assert.equal(lineageOf(baby), lineageOf(b), 'it takes the chosen last name');
  assert.equal(otherLineOf(baby), lineageOf(a), 'the other parent\'s family is its other side');
  assert.deepEqual(baby.traits, ['cursedbody']);
  assert.deepEqual(baby.mutations.map((m) => m.id), ['moss']);
  assert.deepEqual(baby.powers.quirks, ['decay']);
  assert.ok(maxHpOf(baby) < maxHpOf(newCreature('Free')) || hpGivenUp(baby) === QUIRKS.decay.cost);
  assert.equal(baby.look.dye, '#ff00aa');
  assert.equal(baby.battle.stance, 'hold');
  assert.deepEqual(baby.parents.map((p) => p.id), [a.id, b.id]);
  assert.equal(baby.growth, 0);
  assert.equal(a.fullness, 90 - BREED_COST);
  assert.equal(b.bredAt, NOW);
  // Saved and loaded, it is the same baby.
  const back = parseCreature(serializeCreature(baby));
  assert.deepEqual([back.lineage, back.otherLine, back.traits, back.powers.quirks, back.parents], [baby.lineage, baby.otherLine, baby.traits, baby.powers.quirks, baby.parents]);
  // No waiting: fed enough, they can go again straight away, until they are too hungry.
  assert.ok(breed(a, b, { family: 'a', look: 'a', style: 'a', gifts: [] }, 'Again', NOW).baby);
  assert.equal(a.fullness, 90 - 2 * BREED_COST);
  assert.match(breed(a, b, { family: 'a', look: 'a', style: 'a', gifts: [] }, 'Third', NOW).problem, /too hungry/);
});

test('Pure-bloodedness can be selected as a breeding gift from a pure-blood parent', () => {
  const a = adult('Pure');
  const b = adult('Other');
  a.pureBlood = true;
  a.race = 'giant';
  a.heritage = { giant: 1 };
  b.race = 'mink';
  b.heritage = { mink: 1 };
  const gift = giftsOf(a, b).find((g) => g.kind === 'pureBlood');
  assert.ok(gift);
  assert.equal(gift.key, 'pureBlood:pureBlood');
  assert.equal(choiceProblem(a, b, { gifts: [gift.key] }), null);
  const { baby } = breed(a, b, { gifts: [gift.key] }, 'Pure Mix', NOW, null, () => 0.99);
  assert.equal(baby.pureBlood, true, 'the passed gift overrides the ordinary 1-in-100 roll');
  assert.ok(Object.keys(baby.heritage).length > 1);
});

test('a new last name costs gems, and brings the new family\'s technique with it, through a save', () => {
  const house = emptyHouse();
  const c = adult('Renamed');
  const first = lineageOf(c);
  const other = otherLineOf(c);
  const third = TECHNIQUE_IDS.find((id) => id !== first && id !== other);
  c.traits.push('cursedbody');
  c.powers.technique = first;
  c.powers.technique2 = other;
  // It costs gems from the shared bank, and has to be a different family.
  assert.match(familyChangeProblem(house, c, third), /10,000 gems/);
  house.bank.gems = FAMILY_CHANGE_COST * 2;
  assert.match(familyChangeProblem(house, c, first), /already/);
  assert.ok(familyChangeProblem(house, c, 'nonsense'));
  assert.equal(familyChangeProblem(house, c, third), null);
  assert.equal(changeFamily(house, c, third), true);
  assert.equal(house.bank.gems, FAMILY_CHANGE_COST);
  assert.equal(lastName(c), TECHNIQUES[third].family);
  assert.deepEqual([c.lineage, c.otherLine, c.powers.technique, c.powers.technique2], [third, other, third, other]);
  // Its babies take the new name.
  const { baby } = breed(c, adult('Mate'), { family: 'a', gifts: [] }, 'Kid', NOW);
  assert.equal(lineageOf(baby), third);
  // Taking the other side's name swaps the two sides, and both techniques with them.
  assert.equal(changeFamily(house, c, other), true);
  assert.equal(house.bank.gems, 0);
  assert.deepEqual([c.lineage, c.otherLine, c.powers.technique, c.powers.technique2], [other, third, other, third]);
  const back = parseCreature(serializeCreature(c));
  assert.deepEqual([back.lineage, back.otherLine, back.powers.technique, back.powers.technique2], [other, third, other, third]);
  assert.match(familyChangeProblem(house, c, first), /10,000 gems/, 'and the bank is empty now');
  // One without a technique yet just gets a new family to awaken.
  const plain = adult('Plain');
  house.bank.gems = FAMILY_CHANGE_COST;
  const to = TECHNIQUE_IDS.find((id) => id !== lineageOf(plain));
  assert.equal(changeFamily(house, plain, to), true);
  assert.equal(plain.powers.technique, null);
  assert.equal(lineageOf(plain), to);
});

test('two parents from one family still give a different other side', () => {
  const a = adult('Same A');
  const b = adult('Same B', { lineage: undefined });
  b.lineage = a.lineage;
  const { baby } = breed(a, b, { family: 'a', look: 'b', style: 'b', gifts: [] }, 'Twin', NOW);
  assert.equal(baby.lineage, a.lineage);
  assert.notEqual(baby.otherLine, baby.lineage);
});

test('it takes two different parents', () => {
  const a = adult('Solo');
  assert.ok(breed(a, a, { family: 'a', look: 'a', style: 'a', gifts: [] }, 'No', NOW).problem);
});

// ---------- the nurse ----------

test('the nurse is a fourth job, and every nurse job is wired up', () => {
  assert.ok(ROOT_PATHS.includes('nurse'));
  const nurseJobs = Object.keys(PATHS).filter((id) => {
    let node = PATHS[id];
    while (node.parent) node = PATHS[node.parent];
    return node === PATHS.nurse;
  });
  assert.equal(nurseJobs.length, 7);
  nurseJobs.forEach((id) => {
    assert.equal(PATHS[id].activity, 'care');
    assert.ok(clean(perkText(PATHS[id].perk)) && perkText(PATHS[id].perk).length > 0, id);
    if (PATHS[id].tier === 3) assert.ok(ABILITIES[PATHS[id].ability], id);
  });
  assert.equal(TEAM_MAX, 3);
});

test('a nurse out on the screen makes breeding go better', () => {
  const nurse = newCreature('Joy');
  nurse.growth = 20;
  assert.ok(choosePath(nurse, 'nurse'));
  assert.ok(isNurse(nurse));
  assert.equal(nurseHelp([newCreature('Nobody')]).nurse, null);
  let help = nurseHelp([newCreature('Nobody'), nurse]);
  assert.equal(help.nurse, nurse);
  assert.equal(help.picks, 1);
  assert.equal(giftLimit(help), BREED_GIFTS + 1);
  // Its parents spend less fullness on an egg.
  assert.ok(breedCost(help) < breedCost(null));
  assert.equal(breedCost(null), BREED_COST);
  const a = adult('A');
  const z = adult('Z');
  breed(a, z, { family: 'a', look: 'a', style: 'a', gifts: [] }, 'Cheap', NOW, help);
  assert.equal(a.fullness, 90 - breedCost(help));
  // The midwife line hatches bigger eggs.
  nurse.path.xp = TIER_XP[2];
  assert.ok(choosePath(nurse, 'midwife'));
  help = nurseHelp([nurse]);
  assert.equal(help.growth, perksOf(nurse).hatchGrowth);
  const b = adult('B');
  const c = adult('C');
  const { baby } = breed(b, c, { family: 'a', look: 'a', style: 'a', gifts: [] }, 'Big', NOW, help);
  assert.equal(baby.growth, 12);
  assert.ok(help.save <= MAX_CARE_SAVE);
});

test('the Mega Breeder is bought once, with gems, and lets every egg carry more', () => {
  const house = emptyHouse();
  assert.match(megaBreederProblem(house), new RegExp(`${MEGA_BREEDER.cost} gems`));
  assert.equal(buyMegaBreeder(house), false);
  house.bank.gems = MEGA_BREEDER.cost + 5;
  assert.ok(buyMegaBreeder(house));
  assert.equal(house.bank.gems, 5);
  assert.ok(house.megaBreeder);
  assert.match(megaBreederProblem(house), /already/);
  const help = { ...nurseHelp([]), mega: house.megaBreeder };
  assert.equal(giftLimit(help), BREED_GIFTS + MEGA_BREEDER.gifts);
  // Six things pass on where three would have been the limit.
  const a = adult('Mega A');
  const b = adult('Mega B');
  a.traits = ['sharingan', 'titanshifter', 'haki'];
  b.traits = ['onepunch', 'saiyan', 'ninetails'];
  const gifts = ['trait:sharingan', 'trait:titanshifter', 'trait:haki', 'trait:onepunch', 'trait:saiyan', 'trait:ninetails'];
  assert.match(choiceProblem(a, b, { gifts }), /Only 3/);
  // A roll that wakes nothing new, such as Scarlet Eyes when the two happen to share a family.
  const { baby } = breed(a, b, { family: 'a', look: 'a', style: 'a', gifts }, 'Loaded', NOW, help, () => 0.99);
  assert.deepEqual(baby.traits.slice().sort(), gifts.map((g) => g.slice(6)).sort());
});

test('the sheet shows what it was born with, and the gifts read properly', () => {
  const c = newCreature('Gifted');
  c.traits = ['sixeyes', 'sharingan'];
  const born = buildSheet(c).find((s) => s.title === 'Born with');
  assert.equal(born.rows.length, 2);
  assert.ok(born.rows[0].detail.includes('does nothing for now'), 'Six Eyes without Limitless says so');
  born.rows.forEach((r) => assert.ok(clean(`${r.name} ${r.detail}`)));
  c.powers.technique = 'limitless';
  assert.ok(!buildSheet(c).find((s) => s.title === 'Born with').rows[0].detail.includes('does nothing'));
  assert.deepEqual(tuningOf(c), { sixEyes: true, ofaLevel: 0, boost: {} });
  assert.equal(lastName(c), TECHNIQUES[c.lineage].family);
  assert.ok(hasTrait(c, 'sharingan') && !hasTrait(c, 'cursedbody'));
});

test('wild rivals can turn up with gifts and One For All, and stay the same for a seed', () => {
  let gifted = 0;
  for (let seed = 0; seed < 300; seed++) {
    const a = wildCreature(seed, 3);
    const b = wildCreature(seed, 3);
    assert.deepEqual(a.traits, b.traits);
    if (a.traits.length) gifted += 1;
    if (a.powers.quirks.includes(OFA_ID)) assert.equal(ofaLevel(a), 1);
    assert.equal(a.lineage, lineageFromId(a.id));
  }
  assert.ok(gifted > 10, `${gifted} gifted rivals`);
  void finishBout;
  void rawStats;
});
