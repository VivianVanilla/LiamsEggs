// The Legendary road, the Legendary mutations only it gives, holding up to three of them, the
// Bizarre expeditions, and the races only they bring home.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  newCreature, wildCreature, parseCreature, serializeCreature, sanitizeCreature, computeStats, hasRoomFor, fitsSouls, powerSlots, fruitProblem, fightPassive, soulCap,
  raceStats, abilitiesOf, racePictures, raceBackPictures, creatureColors,
} from '../src/core/creature.js';
import { ultimatesOpen, beReborn } from '../src/core/reborn.js';
import { fightProblem, settleChallenge, startChallenge, wonChallenge, takeSoulOffer, swapsFor } from '../src/sim/challenges.js';
import { Bout, finishBout } from '../src/sim/arena.js';
import { useItem, itemProblem } from '../src/core/items.js';
import { emptyHouse, sanitizeHouse } from '../src/core/house.js';
import { deathChance, expeditionFate, finishExpeditions, startExpedition } from '../src/core/village.js';
import { mixHeritage } from '../src/core/family.js';
import { chanceSections } from '../src/core/odds.js';
import { LEGENDARY } from '../src/data/powers.js';
import { DEADLY_IDS, LEGEND_IDS, ULTIMATE_IDS, DEADLY_MONSTERS } from '../src/data/monsters.js';
import { MAX_SOUL_EXPANDERS } from '../src/data/items.js';
import { EXPEDITIONS, EXPEDITION_KINDS, EXPEDITION_DANGER } from '../src/data/village.js';
import { RACES } from '../src/data/races.js';
import { FRUITS } from '../src/data/fruits.js';
import { ABILITIES } from '../src/data/paths.js';
import { ART_FILES } from '../src/data/art-list.js';

const NOW = 1_800_000_000_000;
const plain = (name) => Object.assign(newCreature(name, NOW), { traits: [] });
const grownPlain = (name) => Object.assign(plain(name), { growth: 400, fullness: 100 });
const fruit = Object.keys(FRUITS)[0];
const files = ART_FILES.map((a) => a.file);
const NEW_RACES = ['vampire', 'pillarman', 'dragon', 'cursedalien'];

// ---------- the Legendary road ----------

test('the Legendary road is wired up, and each monster on it gives its own Legendary mutation', () => {
  assert.equal(LEGEND_IDS.length, 4);
  LEGEND_IDS.forEach((id) => {
    const m = DEADLY_MONSTERS[id];
    assert.equal(m.id, id);
    assert.equal(m.road, 'legend');
    assert.ok(!m.trophy, 'no trophy');
    assert.ok(LEGENDARY[m.soul], `${id} gives a real one`);
    assert.ok(!DEADLY_IDS.includes(id) && !ULTIMATE_IDS.includes(id));
    m.moves.forEach((move) => assert.ok(ABILITIES[move], `${id} move ${move}`));
    assert.ok(files.includes(`monsters/${id}.png`), `${id} is on the art list`);
    assert.ok(fs.existsSync(`art/monsters/${id}.png`), `${id} picture exists`);
  });
  Object.keys(LEGENDARY).forEach((id) => {
    assert.ok(files.includes(`legendary/${id}.png`), `${id} is on the art list`);
    assert.ok(fs.existsSync(`art/legendary/${id}.png`), `${id} picture exists`);
  });
  assert.equal(new Set(LEGEND_IDS.map((id) => DEADLY_MONSTERS[id].soul)).size, LEGEND_IDS.length, 'each a different one');
});

test('a win on the Legendary road gives its Legendary mutation and nothing else', () => {
  const c = grownPlain('Walker');
  const before = computeStats(c);
  const res = settleChallenge(c, 'rhino', true, 0);
  assert.equal(res.trophy, null);
  assert.equal(res.legendary, 'ironsoul');
  assert.deepEqual(c.souls, ['ironsoul']);
  assert.deepEqual(c.trophies, []);
  assert.deepEqual(c.legendWins, ['rhino']);
  const after = computeStats(c);
  Object.entries(LEGENDARY.ironsoul.stats).forEach(([k, v]) => assert.ok(after[k] <= before[k] + v, `${k} only moved by its soul`));
  assert.match(fightProblem(c, 'rhino'), /already beat/);
  assert.ok(!ultimatesOpen(c));
  // The second win opens the ultimate monsters. With no room left, its soul waits for a choice.
  const two = settleChallenge(c, 'gorilla', true, 0);
  assert.ok(two.opened);
  assert.equal(two.offer, 'warsoul');
  assert.deepEqual(c.souls, ['ironsoul']);
  assert.ok(ultimatesOpen(c));
  assert.equal(fightProblem(c, ULTIMATE_IDS[0]), null);
  // It all survives a save, and a hand-edited file can't use the road to claim trophies.
  const back = parseCreature(serializeCreature(c));
  assert.deepEqual(back.legendWins, ['rhino', 'gorilla']);
  assert.equal(back.soulOffer, 'warsoul');
  const raw = JSON.parse(serializeCreature(c));
  raw.trophies = ['rhino', 'rat'];
  raw.legendWins = ['rhino', 'rat', 'rhino'];
  const tampered = parseCreature(JSON.stringify(raw));
  assert.deepEqual(tampered.trophies, ['rat']);
  assert.deepEqual(tampered.legendWins, ['rhino']);
  // Losing is still the end.
  assert.ok(settleChallenge(grownPlain('Doomed'), 'shark', false, 0, 99).died);
});

test('the Legendary road sits between Old Rex and the ultimate monsters', () => {
  const rate = (id) => {
    let won = 0;
    for (let i = 0; i < 24; i++) {
      // The same strong creature the numbers were tuned with: a seasoned wild one, trained, armed.
      const c = Object.assign(wildCreature(900 + i, 3), { name: 'Strong', growth: 200, fullness: 100, traits: [], souls: [] });
      c.powers = { stand: 'starplatinum', speedster: false, technique: null, technique2: null, fruit: null, quirks: [] };
      c.weapon = 'dragonslayer';
      c.training = { might: 10, guard: 10, speed: 10, wits: 10, vigor: 10 };
      if (wonChallenge(finishBout(startChallenge(c, id, { seed: i * 7919 + 1, r: 200 })))) won++;
    }
    return won / 24;
  };
  const hardestUltimate = Math.min(...ULTIMATE_IDS.map(rate));
  LEGEND_IDS.forEach((id) => {
    const r = rate(id);
    assert.ok(r > 0, `${id} can be beaten`);
    assert.ok(r >= hardestUltimate, `${id} (${r}) is no harder than the hardest ultimate (${hardestUltimate})`);
  });
});

// ---------- what each new Legendary mutation holds and does ----------

test('each new Legendary mutation holds its own mix of powers', () => {
  // Iron and Ghost Souls: still one power.
  for (const id of ['ironsoul', 'ghostsoul']) {
    const c = plain(id);
    c.souls = [id];
    assert.equal(powerSlots(c), 1);
    c.powers.stand = 'theworld';
    assert.ok(!hasRoomFor(c, 'speedster') && !hasRoomFor(c, 'technique'));
  }
  // Tide Soul: a Devil Fruit beside any one power, and no other pair.
  const tide = plain('Tide');
  tide.souls = ['tidesoul'];
  tide.powers.speedster = true;
  assert.ok(hasRoomFor(tide, 'fruit'));
  assert.ok(!hasRoomFor(tide, 'stand') && !hasRoomFor(tide, 'technique'));
  tide.training.vigor = 60;
  tide.growth = 400;
  assert.equal(fruitProblem(tide), null);
  tide.powers.fruit = fruit;
  assert.ok(fitsSouls(tide, ['tidesoul']) && !fitsSouls(tide, ['malevolentsoul']) && !fitsSouls(tide, ['twinsoul']));
  // War Soul: speedster and technique together, and never a Stand.
  const war = plain('War');
  war.souls = ['warsoul'];
  assert.ok(!hasRoomFor(war, 'stand'), 'not even as its only power');
  war.powers.speedster = true;
  assert.ok(hasRoomFor(war, 'technique'));
  war.powers.technique = 'shrine';
  assert.ok(fitsSouls(war, ['warsoul']) && fitsSouls(war, ['twinsoul']) && !fitsSouls(war, ['malevolentsoul']) && !fitsSouls(war, ['ironsoul']));
  // A file can't claim more than its soul holds.
  const evil = sanitizeCreature({ format: 'creature/1', souls: ['warsoul'], powers: { stand: 'theworld', speedster: true } });
  assert.equal(evil.powers.stand, null);
  assert.equal(evil.powers.speedster, true);
  const greedy = sanitizeCreature({ format: 'creature/1', souls: ['ironsoul'], powers: { stand: 'theworld', speedster: true } });
  assert.equal([greedy.powers.stand, greedy.powers.speedster].filter(Boolean).length, 1);
});

test('the new Legendary mutations work in every fight', () => {
  const fighter = (...souls) => {
    const c = plain('Fighter');
    c.souls = souls;
    return new Bout([c], { seed: 1 }).fighters[0];
  };
  const none = fighter();
  const iron = fighter('ironsoul');
  assert.ok(iron.takenMul < none.takenMul * 0.85);
  assert.ok(iron.maxHp > none.maxHp * 1.1);
  assert.ok(fighter('ghostsoul').dodge > none.dodge);
  assert.ok(fighter('tidesoul').poisonproof && !none.poisonproof);
  assert.ok(fighter('warsoul').reach > none.reach);
  // Two of them add up.
  const both = fighter('ironsoul', 'ghostsoul');
  assert.ok(both.takenMul < none.takenMul * 0.85 && both.dodge > none.dodge);
  assert.equal(fightPassive(plain('Plain')).taken, 0);
  Object.values(LEGENDARY).forEach((l) => assert.ok(!l.passive || l.passive.text, `${l.name} says what it does`));
});

// ---------- holding up to three ----------

test('Legendary Expanders make room for up to 3 Legendary mutations', () => {
  const house = emptyHouse();
  house.items.soulexpander = 5;
  const c = grownPlain('Collector');
  assert.equal(soulCap(c), 1);
  settleChallenge(c, 'rhino', true, 0);
  // Full: the next one waits for a choice, even after an expander makes room.
  assert.equal(settleChallenge(c, 'leopard', true, 0).offer, 'ghostsoul');
  assert.ok(useItem(house, 'soulexpander', c));
  assert.equal(soulCap(c), 2);
  assert.equal(takeSoulOffer(c), true, 'there is room now, so nothing is given up');
  assert.deepEqual(c.souls, ['ironsoul', 'ghostsoul']);
  assert.ok(useItem(house, 'soulexpander', c));
  assert.equal(soulCap(c), 1 + MAX_SOUL_EXPANDERS);
  assert.match(itemProblem(house, 'soulexpander', c), /already taken/);
  assert.equal(settleChallenge(c, 'shark', true, 0).legendary, 'tidesoul', 'room for a third: it just grows it');
  assert.deepEqual(c.souls, ['ironsoul', 'ghostsoul', 'tidesoul']);
  // Their stats all count.
  const without = parseCreature(serializeCreature(c));
  without.souls = [];
  const sum = (k) => c.souls.reduce((n, id) => n + (LEGENDARY[id].stats[k] ?? 0), 0);
  assert.ok(computeStats(c).vigor >= computeStats(without).vigor + Math.min(sum('vigor'), 1));
  // Powers fit if any one of them could hold them: Tide Soul lets a fruit sit beside a power.
  c.powers.speedster = true;
  c.training.vigor = 60;
  assert.equal(fruitProblem(c), null);
  c.powers.fruit = fruit;
  // A fourth can only come in place of one whose loss wouldn't cost it a power.
  const fourth = settleChallenge(c, 'gorilla', true, 0);
  assert.equal(fourth.offer, 'warsoul');
  assert.deepEqual(swapsFor(c, 'warsoul'), ['ironsoul', 'ghostsoul'], 'giving up the Tide Soul would cost it the fruit');
  assert.equal(takeSoulOffer(c, 'tidesoul'), false);
  assert.equal(takeSoulOffer(c, 'ironsoul'), true);
  assert.deepEqual(c.souls, ['warsoul', 'ghostsoul', 'tidesoul']);
  // It all survives a save; an old save's single one still loads; a file can't claim more than its room.
  const back = parseCreature(serializeCreature(c));
  assert.deepEqual(back.souls, c.souls);
  assert.equal(back.soulExpanders, 2);
  assert.deepEqual(sanitizeCreature({ format: 'creature/1', legendary: 'twinsoul' }).souls, ['twinsoul']);
  assert.deepEqual(sanitizeCreature({ format: 'creature/1', souls: ['twinsoul', 'ironsoul', 'nope'] }).souls, ['twinsoul'], 'no expanders, room for one');
  // Being reborn takes them all, and the expanders too.
  c.trophies = [...ULTIMATE_IDS];
  const other = grownPlain('Other');
  assert.ok(!beReborn(c, other, [], emptyHouse(), NOW).problem);
  assert.deepEqual(c.souls, []);
  assert.equal(c.soulExpanders, 0);
  assert.deepEqual(c.legendWins, []);
});

// ---------- Bizarre expeditions ----------

test('expeditions come in Sea and Bizarre kinds, and only the Bizarre ones can kill', () => {
  Object.entries(EXPEDITIONS).forEach(([id, place]) => {
    assert.ok(EXPEDITION_KINDS[place.kind], `${id} has a kind`);
    assert.equal(!!place.danger, place.kind === 'bizarre', `${id}: only Bizarre ones are dangerous`);
  });
  const bizarre = Object.keys(EXPEDITIONS).filter((id) => EXPEDITIONS[id].kind === 'bizarre');
  assert.ok(bizarre.length >= 1);
  // The new races and the Legendary Expanders come from there, and only there.
  const finds = (ids) => new Set(ids.flatMap((id) => Object.keys(EXPEDITIONS[id].finds)));
  const sea = Object.keys(EXPEDITIONS).filter((id) => EXPEDITIONS[id].kind === 'sea');
  NEW_RACES.forEach((r) => assert.ok(finds(bizarre).has(r) && !finds(sea).has(r), r));
  assert.ok(bizarre.every((id) => EXPEDITIONS[id].items.soulexpander > 0));
  assert.ok(sea.every((id) => !EXPEDITIONS[id].items.soulexpander));
  // Power keeps it alive: weaker goes, likelier lost, never below the floor and never above the most.
  const where = bizarre[0];
  assert.equal(deathChance('sea', 10), 0);
  assert.ok(deathChance(where, 20) > deathChance(where, 80));
  assert.ok(deathChance(where, 80) > deathChance(where, 140));
  assert.equal(deathChance(where, 10000), EXPEDITION_DANGER.least);
  assert.ok(deathChance(where, 0) <= EXPEDITIONS[where].danger);
});

test('a Bizarre expedition takes some who go, as often as it says, and if it takes everyone nothing comes home', () => {
  const where = 'rift';
  let lost = 0;
  let sent = 0;
  const N = 3000;
  for (let i = 0; i < N; i++) {
    const exp = { id: `b${i}`, where, start: NOW + i, end: NOW + i, party: [{ base: 'a', name: 'A', power: 60 }, { base: 'b', name: 'B', power: 60 }] };
    lost += expeditionFate(exp).length;
    sent += 2;
  }
  assert.ok(Math.abs(lost / sent - deathChance(where, 60)) < 0.02, `${lost} of ${sent}`);
  // The same expedition always ends the same way.
  const exp = { id: 'same', where, start: NOW, end: NOW, party: [{ base: 'a', name: 'A', power: 10 }] };
  assert.deepEqual(expeditionFate(exp), expeditionFate(exp));
  // Home: the lost go on the household's list for the graveyard, and a wiped-out party brings nothing.
  let i = 0;
  const party = [{ base: 'weak', name: 'Weak One', power: 0 }];
  while (!expeditionFate({ id: `w${i}`, where, start: NOW, end: NOW, party }).length) i += 1;
  const house = emptyHouse();
  const gems = house.bank.gems;
  house.expeditions.push({ id: `w${i}`, where, start: NOW, end: NOW, party, bonus: { gems: 0, finds: 0 } });
  const [back] = finishExpeditions(house, NOW);
  assert.ok(back.allLost);
  assert.equal(back.gems, 0);
  assert.equal(house.bank.gems, gems);
  assert.deepEqual(house.lost.map((l) => l.base), ['weak']);
  assert.match(house.lost[0].by, /rift/);
  assert.deepEqual(sanitizeHouse(JSON.parse(JSON.stringify(house))).lost, house.lost, 'the list survives the household file');
  // A party can set off for one like any other.
  const c = grownPlain('Brave');
  assert.ok(startExpedition(emptyHouse(), where, [{ base: 'brave', c }], NOW));
});

// ---------- the four new races ----------

test('the four Bizarre races are wired up, stronger than the old ones, and mix like any race', () => {
  const total = (id) => Object.values(RACES[id].stats).reduce((n, v) => n + v, 0);
  const oldBest = Math.max(...['giant', 'fishman', 'mink', 'lunarian', 'tontatta', 'longarm', 'skypiean', 'devil'].map(total));
  NEW_RACES.forEach((id) => {
    const r = RACES[id];
    assert.ok(total(id) > oldBest, `${id} stats (${total(id)}) beat the old best (${oldBest})`);
    assert.ok(ABILITIES[r.move], `${id} move`);
    assert.ok(r.passive?.text && r.village?.text && r.from && r.blurb, `${id} says what it does`);
    const c = plain(id);
    c.race = id;
    assert.ok(abilitiesOf(c).includes(r.move));
    [...racePictures(c).map((p) => `races/${p}.png`), ...raceBackPictures(c).map((p) => `races/${p}-back.png`)].forEach((file) => {
      assert.ok(files.includes(file), `${file} is on the art list`);
      assert.ok(fs.existsSync(`art/${file}`), `${file} exists`);
    });
    assert.ok(racePictures(c).length + raceBackPictures(c).length > 0, `${id} looks different`);
    assert.notEqual(creatureColors(c).body, creatureColors(plain('Human')).body, `${id} has its own skin`);
  });
  // Half and quarter mixes, like every race: a half brings its move, a quarter only its share.
  const half = plain('Half');
  half.heritage = mixHeritage(Object.assign(plain('V'), { race: 'vampire' }), plain('H'));
  assert.deepEqual(half.heritage, { vampire: 0.5, human: 0.5 });
  assert.ok(abilitiesOf(half).includes('stingyeyes'));
  const quarter = plain('Quarter');
  quarter.heritage = mixHeritage(half, plain('H2'));
  assert.deepEqual(quarter.heritage, { vampire: 0.25, human: 0.75 });
  assert.ok(!abilitiesOf(quarter).includes('stingyeyes'));
  assert.ok((raceStats(quarter).vigor ?? 0) < RACES.vampire.stats.vigor);
  // The Chances page lists everything new, in plain numbers.
  const rows = chanceSections(null).flatMap((s) => s.rows);
  NEW_RACES.forEach((id) => assert.ok(rows.some((r) => r.name.startsWith(RACES[id].name)), `${id} on the Chances page`));
  assert.ok(rows.some((r) => r.name.startsWith('Not coming back')));
  assert.ok(rows.some((r) => r.name === 'An altar race'));
  rows.forEach((r) => assert.ok(!/undefined|NaN|\[object/.test(`${r.name} ${r.odds} ${r.detail}`), r.name));
});
