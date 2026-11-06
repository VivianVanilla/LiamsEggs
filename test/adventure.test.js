// Adventure: the 20-level campaign, its bosses, and what it pays.

import test from 'node:test';
import assert from 'node:assert/strict';

import { makeRng } from '../src/lib/util.js';
import { wildCreature } from '../src/core/creature.js';
import { emptyHouse, sanitizeHouse } from '../src/core/house.js';
import {
  LEVEL_COUNT, levelInfo, bossOf, levelEnemies, levelToughness, partyProblem, levelProblem, startLevel, levelWon, levelReward, winLevel,
} from '../src/core/adventure.js';
import { finishBout } from '../src/sim/arena.js';
import {
  ADVENTURE_PARTY, ADVENTURE_BOSSES, ADVENTURE_PRIZES, ADVENTURE_GEMS_PER_LEVEL, ADVENTURE_FINISH_GEMS, ADVENTURE_REPLAY_ORE, ADVENTURE_MAX_ENEMIES,
} from '../src/data/adventure.js';
import { DEADLY_MONSTERS } from '../src/data/monsters.js';
import { ITEMS } from '../src/data/items.js';

const clean = (s) => !/undefined|NaN|null|\[object/.test(s);
const party = (level, base = 1) => [0, 1, 2].map((i) => wildCreature(base + i * 7919, level));

test('twenty levels, each with a name, and a deadly monster every fifth, ending with the dragon', () => {
  assert.equal(LEVEL_COUNT, 20);
  for (let n = 1; n <= LEVEL_COUNT; n++) {
    const info = levelInfo(n);
    assert.ok(info.name && clean(info.text), `level ${n}`);
    assert.equal(!!info.boss, !!bossOf(n), `level ${n} boss flag`);
  }
  assert.deepEqual(Object.keys(ADVENTURE_BOSSES).map(Number), [5, 10, 15, 20]);
  Object.values(ADVENTURE_BOSSES).forEach((id) => assert.ok(DEADLY_MONSTERS[id], id));
  assert.ok(DEADLY_MONSTERS[bossOf(20)].legendary, 'the last level is The Last Dragon');
  assert.equal(levelInfo(0), null);
  assert.equal(levelInfo(21), null);
});

test('levels send more, and tougher, the further you get, the same for a seed', () => {
  assert.equal(levelEnemies(1, 1).fighters.length, 1);
  assert.ok(levelEnemies(14, 1).fighters.length > levelEnemies(3, 1).fighters.length);
  for (let n = 1; n <= LEVEL_COUNT; n++) {
    const { fighters, boss } = levelEnemies(n, 7);
    assert.ok(fighters.length <= ADVENTURE_MAX_ENEMIES);
    assert.equal(boss, bossOf(n));
    assert.deepEqual(fighters.map((c) => c.id), levelEnemies(n, 7).fighters.map((c) => c.id));
  }
  assert.ok(levelToughness(20) > levelToughness(10) && levelToughness(1) === 1);
});

test('a party is one to three different, living creatures', () => {
  const [a, b, c] = party(2);
  assert.match(partyProblem([]), /Pick who goes/);
  assert.equal(partyProblem([a]), null);
  assert.equal(partyProblem([a, b, c]), null);
  assert.match(partyProblem([a, b, c, wildCreature(99, 1)]), new RegExp(`At most ${ADVENTURE_PARTY}`));
  assert.match(partyProblem([a, a]), /only go once/);
  c.dead = { at: 1, by: 'x' };
  assert.match(partyProblem([a, c]), /gone/);
});

test('levels open one at a time, and beaten ones can be played again', () => {
  const adv = { best: 0, party: [] };
  assert.equal(levelProblem(adv, 1), null);
  assert.match(levelProblem(adv, 2), /Beat level 1 first/);
  adv.best = 6;
  assert.equal(levelProblem(adv, 3), null, 'a beaten level can be replayed');
  assert.equal(levelProblem(adv, 7), null);
  assert.match(levelProblem(adv, 8), /Beat level 7/);
  assert.ok(levelProblem(adv, 0) && levelProblem(adv, 21) && levelProblem(adv, 2.5));
});

test('a level is a ring with the party on the left, and the real creatures are never touched', () => {
  const ours = party(3, 11);
  const growth = ours.map((c) => c.growth);
  const bout = startLevel(5, ours, { seed: 9 });
  const mine = bout.fighters.filter((f) => f.team === 0);
  const theirs = bout.fighters.filter((f) => f.team !== 0);
  assert.equal(mine.length, 3);
  assert.ok(theirs.some((f) => f.monster === DEADLY_MONSTERS[bossOf(5)]), 'the boss is there');
  assert.ok(mine.every((f) => f.x < bout.cx) && theirs.every((f) => f.x > bout.cx));
  assert.ok(mine.every((f) => !ours.includes(f.c)), 'the party fights as copies');
  finishBout(bout);
  assert.deepEqual(ours.map((c) => c.growth), growth);
  assert.equal(typeof levelWon(bout), 'boolean');
  assert.equal(bout.adventure, 5);
});

test('the first levels are easy, the dragon is hard, and the middle goes up step by step', () => {
  const rate = (n, level, seeds = 10) => {
    let won = 0;
    for (let s = 0; s < seeds; s++) if (levelWon(finishBout(startLevel(n, party(level, 1000 + s * 31), { seed: 500 + s * 13 + n })))) won++;
    return won / seeds;
  };
  assert.ok(rate(1, 1) >= 0.9, 'a fresh party wins level 1');
  assert.ok(rate(5, 1) < 0.4, 'hatchlings are not ready for the first boss');
  assert.ok(rate(8, 3) >= 0.7, 'final forms get through the middle');
  assert.ok(rate(20, 3) <= 0.2, 'plain final forms are no match for the dragon');
});

test('a first win pays gems and any prize, a replay only has its chance of loot', () => {
  const never = () => 0.99;
  const first = levelReward(5, 4, never);
  assert.ok(first.first);
  assert.equal(first.gems, 5 * ADVENTURE_GEMS_PER_LEVEL);
  assert.equal(first.ore, ADVENTURE_PRIZES[5].ore);
  assert.deepEqual(first.items, ['expander']);
  const again = levelReward(5, 9, never);
  assert.deepEqual([again.first, again.gems, again.ore, again.items], [false, 0, ADVENTURE_REPLAY_ORE, []]);
  const lucky = levelReward(2, 9, () => 0);
  assert.deepEqual(lucky.items.sort(), Object.keys(ITEMS).sort(), 'every win can drop loot');
  assert.equal(levelReward(20, 19, never).gems, 20 * ADVENTURE_GEMS_PER_LEVEL + ADVENTURE_FINISH_GEMS);
});

test('winning pays into the household and moves the campaign on, and it all survives a save', () => {
  const house = emptyHouse();
  const rng = makeRng(4);
  for (let n = 1; n <= 5; n++) winLevel(house, n, rng);
  assert.equal(house.adventure.best, 5);
  assert.ok(house.bank.gems >= (1 + 2 + 3 + 4 + 5) * ADVENTURE_GEMS_PER_LEVEL);
  assert.ok(house.ore >= ADVENTURE_PRIZES[5].ore);
  assert.ok(house.items.chamber >= 1 && house.items.expander >= 1);
  winLevel(house, 2, rng);
  assert.equal(house.adventure.best, 5, 'a replay never moves it back');
  house.adventure.party = ['abc', 'def'];
  const back = sanitizeHouse(JSON.parse(JSON.stringify(house)));
  assert.deepEqual(back.adventure, house.adventure);
  assert.equal(back.ore, house.ore);
  assert.deepEqual(back.items, house.items);
  // Nonsense in the file is cleaned away.
  const bad = sanitizeHouse({ adventure: { best: 999, party: ['a', 'a', '<x>', 7, 'b', 'c', 'd'] }, ore: -5, items: { chamber: 1e9, nope: 3 } });
  assert.equal(bad.adventure.best, LEVEL_COUNT);
  assert.deepEqual(bad.adventure.party, ['a', 'x', 'b']);
  assert.equal(bad.ore, 0);
  assert.deepEqual(bad.items, { chamber: 99 });
});
