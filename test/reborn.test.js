// Lunarian looks, the gifts awakened by breeding, the ultimate monsters, being reborn, and the
// Bloodline Altar.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  newCreature, wildCreature, parseCreature, serializeCreature, computeStats, creatureColors, racePictures, raceBackPictures,
  abilitiesOf, maxHpOf, stageIndex, bornWith,
} from '../src/core/creature.js';
import { breed, awakenChances, bredRuleMet, bredRuleText, altarProblem, buyAltar, sacrificeProblem, sacrifice, altarRacesOf, eggRaces } from '../src/core/family.js';
import { ultimatesOpen, canBeReborn, takeable, rebornProblem, beReborn, rebornLosses } from '../src/core/reborn.js';
import { emptyHouse, sanitizeHouse, joinHouse } from '../src/core/house.js';
import { eggFromId, hatchEgg, matchChance } from '../src/core/roll.js';
import { chanceSections } from '../src/core/odds.js';
import { fightProblem, settleChallenge, startChallenge, wonChallenge } from '../src/sim/challenges.js';
import { Bout, finishBout } from '../src/sim/arena.js';
import {
  TRAITS, BORN_TRAIT_IDS, BRED_TRAIT_IDS, BRED_RULES, ACKERMAN, SLAYER_MARK, SCARLET_EYES, LEGENDARY_ID,
} from '../src/data/powers.js';
import { DEADLY_IDS, LEGEND_IDS, ULTIMATE_IDS, DEADLY_MONSTERS, REBORN, TROPHY_POINTS, LEGEND_WINS_FOR_ULTIMATE } from '../src/data/monsters.js';
import { ALTAR } from '../src/data/family.js';
import { RACES, SKIN_MIX } from '../src/data/races.js';
import { ABILITIES } from '../src/data/paths.js';
import { ART_FILES } from '../src/data/art-list.js';

const grown = (name, seed = 1) => {
  const c = wildCreature(seed, 3);
  c.name = name;
  c.growth = 200;
  c.fullness = 100;
  c.traits = [];
  return c;
};
const everyTrophy = (c) => { c.trophies = [...DEADLY_IDS, ...ULTIMATE_IDS]; c.legendWins = LEGEND_IDS.slice(0, LEGEND_WINS_FOR_ULTIMATE); return c; };

// ---------- Lunarians ----------

test('a Lunarian wears black wings and fire behind it, and a darker skin', () => {
  const files = ART_FILES.map((a) => a.file);
  assert.ok(files.includes('races/lunarian-back.png'));
  assert.ok(fs.existsSync('art/races/lunarian-back.png'), 'the picture exists');
  const moon = newCreature('Moon');
  moon.race = 'lunarian';
  assert.deepEqual(racePictures(moon), ['lunarian']);
  assert.deepEqual(raceBackPictures(moon), ['lunarian']);
  const human = newCreature('Plain');
  assert.deepEqual(raceBackPictures(human), []);
  // The same creature, only its race differs: the Lunarian is drawn darker.
  const dark = (hex) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
  human.id = moon.id;
  assert.ok(dark(creatureColors(moon).body) < dark(creatureColors(human).body) - 100, `${creatureColors(moon).body} against ${creatureColors(human).body}`);
  assert.ok(RACES.lunarian.skin && SKIN_MIX > 0);
  // A quarter isn't enough, and a dye still covers it.
  const quarter = newCreature('Quarter');
  quarter.heritage = { lunarian: 0.25, human: 0.75 };
  assert.deepEqual(raceBackPictures(quarter), []);
  moon.look.dye = '#3fa7d6';
  assert.equal(creatureColors(moon).body, '#3fa7d6');
});

// ---------- gifts awakened by breeding ----------

test('the four bred gifts never hatch from an egg, and only a qualifying pair can wake one up', () => {
  assert.equal(BRED_TRAIT_IDS.length, 4);
  BRED_TRAIT_IDS.forEach((id) => {
    assert.ok(!BORN_TRAIT_IDS.includes(id), `${id} is not on the egg list`);
    assert.ok(BRED_RULES[id].oneIn >= 2, id);
    assert.ok(TRAITS[id].name && TRAITS[id].blurb, id);
    assert.ok(bredRuleText(id).endsWith('.'), id);
  });
  for (let i = 0; i < 3000; i++) {
    const id = `egg${i.toString(16)}`;
    const egg = eggFromId(id);
    assert.ok(!egg.traits.some((t) => BRED_TRAIT_IDS.includes(t)));
    assert.ok(!bornWith(id, egg.lineage).some((t) => BRED_TRAIT_IDS.includes(t)));
  }
  assert.equal(matchChance({ traits: ['rinnegan'], family: null }), 0, 'and Hyper roll can\'t hunt for one');

  const a = grown('A', 1);
  const b = grown('B', 2);
  assert.deepEqual(awakenChances(a, b), [], 'an ordinary pair can\'t');
  a.traits = ['sharingan'];
  assert.ok(!bredRuleMet('rinnegan', a, b), 'Rinnegan needs both');
  b.traits = ['sharingan', 'sunbreathing'];
  assert.ok(bredRuleMet('rinnegan', a, b));
  assert.ok(bredRuleMet('slayermark', a, b), 'the Mark needs only one');
  a.trophies = ['rat'];
  assert.ok(!bredRuleMet('ackerman', a, b));
  b.trophies = ['scorpion'];
  assert.ok(bredRuleMet('ackerman', a, b));
  b.lineage = a.lineage;
  assert.ok(bredRuleMet('scarleteyes', a, b));
  assert.deepEqual(awakenChances(a, b).map((x) => x.id), BRED_TRAIT_IDS);
  assert.deepEqual(awakenChances(a, b, ['rinnegan']).map((x) => x.id), BRED_TRAIT_IDS.filter((id) => id !== 'rinnegan'), 'one already passing on is not rolled for');

  // Lucky rolls wake every one up; unlucky ones none. Choosing gifts to pass on still works.
  const lucky = breed(a, b, { family: 'a', look: 'a', style: 'a', gifts: ['trait:sharingan'] }, 'Lucky', 1000, null, () => 0);
  assert.deepEqual(lucky.awakened, BRED_TRAIT_IDS);
  assert.deepEqual(lucky.baby.traits, ['sharingan', ...BRED_TRAIT_IDS]);
  a.fullness = 100;
  b.fullness = 100;
  const unlucky = breed(a, b, { family: 'a', look: 'a', style: 'a', gifts: [] }, 'Unlucky', 1000, null, () => 0.999);
  assert.deepEqual(unlucky.awakened, []);
  assert.deepEqual(unlucky.baby.traits, []);
  // Once it has one, it passes on like any born-with gift, and survives a save.
  const back = parseCreature(serializeCreature(lucky.baby));
  assert.deepEqual(back.traits, lucky.baby.traits);
});

test('a bred gift wakes up about as often as the table says', () => {
  const a = grown('A', 3);
  const b = grown('B', 4);
  a.traits = ['sunbreathing'];
  let rng = 12345;
  const rand = () => {
    rng = (rng * 1103515245 + 12345) % 2147483648;
    return rng / 2147483648;
  };
  let woke = 0;
  const N = 4000;
  for (let i = 0; i < N; i++) {
    a.fullness = 100;
    b.fullness = 100;
    if (breed(a, b, { family: 'a', look: 'a', style: 'a', gifts: [] }, 'Baby', 1, null, rand).awakened.includes('slayermark')) woke++;
  }
  assert.ok(Math.abs(woke / N - 1 / BRED_RULES.slayermark.oneIn) < 0.03, `${woke} of ${N}`);
});

test('the guide lists every bred gift with its chance', () => {
  const section = chanceSections().find((s) => s.title === 'Awakened by breeding');
  assert.ok(section);
  BRED_TRAIT_IDS.forEach((id) => assert.ok(section.rows.some((r) => r.name === TRAITS[id].name && r.odds === `1 in ${BRED_RULES[id].oneIn}`), id));
  const fights = chanceSections().find((s) => s.title === 'Fights');
  assert.ok(fights.rows.some((r) => r.name === 'Ultimate monsters'));
});

test('what the bred gifts do in a fight', () => {
  const plain = grown('Plain', 7);
  plain.powers = { stand: null, speedster: false, technique: null, technique2: null, fruit: null, quirks: [] };
  const rival = grown('Rival', 8);
  const fighter = (traits) => {
    const c = parseCreature(serializeCreature(plain));
    c.traits = traits;
    return new Bout([c, rival], { seed: 3 }).fighters[0];
  };
  const base = fighter([]);
  const marked = fighter(['slayermark']);
  assert.ok(Math.abs(marked.atk / base.atk - (1 + SLAYER_MARK.damage)) < 1e-9);
  assert.ok(Math.abs(base.attackEvery / marked.attackEvery - (1 + SLAYER_MARK.speed)) < 1e-9);
  assert.ok(Math.abs(fighter(['scarleteyes']).cdMul / base.cdMul - (1 - SCARLET_EYES.moves)) < 1e-9);
  assert.equal(fighter(['ackerman']).ackerman, true);
  // Rinnegan brings a move, and that move throws foes back without leaving the ring.
  const seer = parseCreature(serializeCreature(plain));
  seer.traits = ['rinnegan'];
  assert.ok(abilitiesOf(seer).includes('almightypush'));
  assert.ok(ABILITIES.almightypush.push > 0);
  const bout = new Bout([seer, rival], { seed: 4 });
  const [me, foe] = bout.fighters;
  foe.x = me.x + 10;
  foe.y = me.y;
  const before = Math.hypot(foe.x - me.x, foe.y - me.y);
  bout.riders(me, foe, ABILITIES.almightypush);
  assert.ok(Math.hypot(foe.x - me.x, foe.y - me.y) > before + 40, 'it was thrown back');
  assert.ok(Math.hypot(foe.x - bout.cx, (foe.y - bout.cy) * 1.35) <= bout.r, 'but stays in the ring');
  // Ackerman Blood: a share of swings land twice.
  let twice = 0;
  const N = 2000;
  const ack = fighter(['ackerman']);
  const b2 = new Bout([parseCreature(serializeCreature(plain)), rival], { seed: 9 });
  b2.fighters[0] = ack;
  const target = b2.fighters[1];
  for (let i = 0; i < N; i++) {
    target.hp = target.maxHp * 100;
    target.alive = true;
    const hits = b2.events.length;
    b2.swing(ack, target);
    if (b2.events.slice(hits).some((e) => e.text === 'again!')) twice++;
  }
  assert.ok(Math.abs(twice / N - ACKERMAN.twice) < 0.04, `${twice} of ${N}`);
});

// ---------- the ultimate monsters ----------

test('the ultimate monsters are wired up, and only come out after 2 wins on the Legendary road', () => {
  const files = ART_FILES.map((a) => a.file);
  assert.ok(ULTIMATE_IDS.length >= 5);
  ULTIMATE_IDS.forEach((id) => {
    const m = DEADLY_MONSTERS[id];
    assert.equal(m.id, id);
    assert.ok(m.ultimate);
    assert.ok(!DEADLY_IDS.includes(id));
    assert.ok(files.includes(`monsters/${id}.png`), `${id} is on the art list`);
    assert.ok(fs.existsSync(`art/monsters/${id}.png`), `${id} picture exists`);
    m.moves.forEach((move) => assert.ok(ABILITIES[move], `${id} move ${move}`));
  });
  assert.equal(LEGEND_WINS_FOR_ULTIMATE, 2);
  const c = grown('Climber', 11);
  assert.ok(!ultimatesOpen(c));
  assert.match(fightProblem(c, ULTIMATE_IDS[0]), /2 on the Legendary road/);
  c.trophies = [...DEADLY_IDS];
  assert.ok(!ultimatesOpen(c), 'the trophy monsters alone are not enough');
  c.trophies = [];
  c.legendWins = LEGEND_IDS.slice(0, 1);
  assert.ok(!ultimatesOpen(c));
  c.legendWins = LEGEND_IDS.slice(-2);
  assert.ok(ultimatesOpen(c), 'any 2 will do');
  assert.equal(fightProblem(c, ULTIMATE_IDS[0]), null);
  // They kill like any deadly monster, and pay a trophy like one.
  const won = settleChallenge(c, ULTIMATE_IDS[0], true, 0.99);
  assert.equal(won.trophy, DEADLY_MONSTERS[ULTIMATE_IDS[0]].trophy);
  assert.ok(c.trophies.includes(ULTIMATE_IDS[0]));
  const doomed = grown('Doomed', 12);
  doomed.legendWins = LEGEND_IDS.slice(0, 2);
  assert.ok(settleChallenge(doomed, ULTIMATE_IDS[1], false, 0, 99).died);
  // Their trophies survive a save, like any other.
  assert.deepEqual(parseCreature(serializeCreature(c)).trophies, c.trophies);
});

test('every ultimate monster is harder than The Last Dragon', () => {
  const rate = (id) => {
    let won = 0;
    for (let i = 0; i < 24; i++) {
      const c = grown('Strong', 900 + i);
      c.powers = { stand: 'starplatinum', speedster: false, technique: null, technique2: null, fruit: null, quirks: [] };
      c.weapon = 'dragonslayer';
      c.training = { might: 10, guard: 10, speed: 10, wits: 10, vigor: 10 };
      c.trophies = [...DEADLY_IDS];
      if (wonChallenge(finishBout(startChallenge(c, id, { seed: i * 7919 + 1, r: 200 })))) won++;
    }
    return won / 24;
  };
  const dragon = rate('dragon');
  ULTIMATE_IDS.forEach((id) => assert.ok(rate(id) < dragon, `${id} against the dragon's ${dragon}`));
});

// ---------- being reborn ----------

test('being reborn: it absorbs another, takes up to two of its gifts, and starts over', () => {
  const house = emptyHouse();
  house.armory.dragonslayer = 0;
  const c = everyTrophy(grown('Phoenix', 21));
  c.traits = ['haki'];
  c.powers = { stand: 'theworld', speedster: false, technique: null, technique2: null, fruit: null, quirks: ['hardening'] };
  c.legendary = LEGENDARY_ID;
  c.mutations = [{ id: 'horns', from: 'x', at: 1 }];
  c.path = { line: ['fighter'], xp: 999 };
  c.weapon = 'dragonslayer';
  c.gear = { owned: ['ruby'], worn: ['ruby'] };
  c.look.dye = '#123456';
  c.race = 'lunarian';
  joinHouse(house, c);
  house.bank.gems = 77;
  const other = grown('Snack', 22);
  other.traits = ['sharingan', 'titanshifter', 'saiyan', 'haki'];

  assert.ok(canBeReborn(c));
  assert.deepEqual(takeable(c, other), ['sharingan', 'titanshifter', 'saiyan'], 'not what it already has');
  assert.ok(rebornLosses(c).length > 4);
  assert.match(rebornProblem(c, other, ['sharingan', 'titanshifter', 'saiyan']), new RegExp(`only take ${REBORN.takes}`));
  assert.match(rebornProblem(c, other, ['onepunch']), /doesn't have/);
  assert.match(rebornProblem(c, c, []), /itself/);
  const notYet = grown('NotYet', 23);
  notYet.trophies = [...DEADLY_IDS];
  assert.match(rebornProblem(notYet, other, []), /ultimate/);

  const res = beReborn(c, other, ['sharingan', 'saiyan'], house, 5000);
  assert.deepEqual(res.took, ['sharingan', 'saiyan']);
  assert.deepEqual(other.dead, { at: 5000, by: 'absorbed', to: 'Phoenix' });
  // Back to a Hatchling with nothing...
  assert.equal(stageIndex(c), 0);
  assert.equal(c.growth, 0);
  assert.deepEqual(c.mutations, []);
  assert.deepEqual(c.trophies, []);
  assert.deepEqual(c.legendWins, [], 'and the Legendary road starts over too');
  assert.deepEqual(c.path, { line: [], xp: 0 });
  assert.equal(c.legendary, null);
  assert.equal(c.powers.stand, null);
  assert.deepEqual(c.powers.quirks, []);
  assert.deepEqual(c.gear, { owned: [], worn: [] });
  assert.equal(c.weapon, null);
  assert.equal(house.armory.dragonslayer, 1, 'its weapon went back to the armory');
  assert.ok(Object.values(c.training).every((v) => v === 0));
  // ...but its gifts and who it is.
  assert.deepEqual(c.traits, ['haki', 'sharingan', 'saiyan']);
  assert.equal(c.name, 'Phoenix');
  assert.equal(c.race, 'lunarian');
  assert.equal(c.look.dye, '#123456');
  assert.equal(house.bank.gems, 77, 'the household keeps what it shares');
  assert.equal(c.rebirths.length, 1);
  assert.deepEqual(c.rebirths[0], { at: 5000, absorbed: 'Snack', took: ['sharingan', 'saiyan'] });
  assert.ok(!canBeReborn(c), 'it has to climb all the way back');
  assert.equal(maxHpOf(c), maxHpOf(c), 'and it is a working creature');
  // It all survives a save and load.
  const back = parseCreature(serializeCreature(c));
  assert.deepEqual(back.traits, c.traits);
  assert.deepEqual(back.rebirths, c.rebirths);
  assert.deepEqual(back.trophies, []);
  assert.deepEqual(computeStats(back), computeStats(c));

  // And it can do it all again, coming back with more.
  everyTrophy(c);
  const second = grown('Second', 24);
  second.traits = ['onepunch', 'ninetails'];
  assert.deepEqual(beReborn(c, second, ['onepunch', 'ninetails'], house, 6000).took, ['onepunch', 'ninetails']);
  assert.deepEqual(c.traits, ['haki', 'sharingan', 'saiyan', 'onepunch', 'ninetails']);
  assert.equal(c.rebirths.length, 2);
});

test('a rebirth record in a file has to be real', () => {
  const evil = parseCreature(JSON.stringify({ format: 'creature/1', name: 'Fake', rebirths: [null, 5, { at: 1, absorbed: 'x'.repeat(200), took: ['haki', 'haki', '__proto__', 9] }] }));
  assert.equal(evil.rebirths.length, 1);
  assert.deepEqual(evil.rebirths[0].took, ['haki']);
  assert.ok(evil.rebirths[0].absorbed.length <= 60);
  assert.deepEqual(parseCreature(JSON.stringify({ format: 'creature/1', name: 'Old' })).rebirths, []);
});

// ---------- the Bloodline Altar ----------

test('the Bloodline Altar: bought once, and a sacrifice lets eggs hatch as its races', () => {
  const house = emptyHouse();
  assert.match(altarProblem(house), new RegExp(`${ALTAR.cost} gems`));
  assert.deepEqual(eggRaces(house), ['human']);
  const moon = grown('Moon', 31);
  moon.race = 'lunarian';
  assert.match(sacrificeProblem(house, moon), /Buy/);
  house.bank.gems = ALTAR.cost + 3;
  assert.ok(buyAltar(house));
  assert.equal(house.bank.gems, 3);
  assert.match(altarProblem(house), /already/);

  const human = grown('Plain', 32);
  assert.match(sacrificeProblem(house, human), /Human/);
  const mix = grown('Mix', 33);
  mix.heritage = { giant: 0.5, mink: 0.25, human: 0.25 };
  assert.deepEqual(altarRacesOf(mix), ['giant'], 'only races it is at least half of');
  const halfDevil = grown('Half', 34);
  halfDevil.race = 'halfdevil';
  assert.deepEqual(altarRacesOf(halfDevil), ['devil']);

  assert.deepEqual(sacrifice(house, moon, 777), ['lunarian']);
  assert.deepEqual(moon.dead, { at: 777, by: 'the Bloodline Altar' });
  assert.deepEqual(eggRaces(house), ['human', 'lunarian']);
  const another = grown('Another', 35);
  another.race = 'lunarian';
  assert.match(sacrificeProblem(house, another), /already/, 'a race only needs one sacrifice');

  // The egg on offer hatches as the race picked, and that choice survives the household file.
  house.eggRace = 'lunarian';
  const back = sanitizeHouse(JSON.parse(JSON.stringify(house)));
  assert.equal(back.altar, true);
  assert.deepEqual(back.altarRaces, ['lunarian']);
  assert.equal(back.eggRace, 'lunarian');
  const baby = hatchEgg(eggFromId('abc123'), 'Baby', 1, back.eggRace);
  assert.equal(baby.race, 'lunarian');
  assert.deepEqual(raceBackPictures(baby), ['lunarian']);
  // A hand-edited file can't claim races it never sacrificed for.
  const evil = sanitizeHouse({ altar: false, altarRaces: ['devil'], eggRace: 'devil' });
  assert.deepEqual(evil.altarRaces, []);
  assert.equal(evil.eggRace, null);
  assert.deepEqual(sanitizeHouse({ altar: true, altarRaces: ['human', 'halfdevil', '__proto__', 'giant', 'giant'] }).altarRaces, ['giant']);
});

test('trophy points from the ultimate monsters count like any other', () => {
  const c = grown('Counted', 41);
  const before = computeStats(c);
  c.trophies = ['behemoth'];
  assert.ok(computeStats(c).might >= before.might && computeStats(c).might <= before.might + TROPHY_POINTS);
});
