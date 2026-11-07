// Your Chosen: one creature your godly power runs through, and its three attunements.

import test from 'node:test';
import assert from 'node:assert/strict';
import { wildCreature } from '../src/core/creature.js';
import { emptyHouse, sanitizeHouse } from '../src/core/house.js';
import { chosenAttune, chooseProblem, choose, unchoose, sanitizeChosen } from '../src/core/chosen.js';
import { resetUniverse } from '../src/core/universe.js';
import { Bout, finishBout, setChosenHouse } from '../src/sim/arena.js';
import { CHOSEN, ATTUNEMENTS, ATTUNE_IDS } from '../src/data/chosen.js';
import { ADVENTURE_LEVELS } from '../src/data/adventure.js';

const fighter = (seed) => {
  const c = wildCreature(seed, 2);
  c.traits = [];
  c.weapon = null;
  return c;
};
// Runs a fight with this household's Chosen, and forgets it after.
function withChosen(house, fn) {
  setChosenHouse(() => house);
  try {
    return fn();
  } finally {
    setChosenHouse(null);
  }
}

test('there is only ever one Chosen, the household keeps it, and a file can only claim one that exists', () => {
  assert.equal(ATTUNE_IDS.length, 3);
  ATTUNE_IDS.forEach((id) => assert.ok(ATTUNEMENTS[id].name && ATTUNEMENTS[id].text, id));
  const house = emptyHouse();
  assert.equal(house.chosen, null);
  const a = fighter(1);
  const b = fighter(2);
  assert.ok(chooseProblem(house, a, 'nonsense'));
  assert.equal(choose(house, a, 'war'), true);
  assert.equal(chosenAttune(house, a), 'war');
  assert.match(chooseProblem(house, a, 'war'), /already/);
  assert.equal(choose(house, a, 'speed'), true, 'it can change attunement');
  assert.equal(choose(house, b, 'benevolence'), true);
  assert.deepEqual([chosenAttune(house, a), chosenAttune(house, b)], [null, 'benevolence'], 'picking another replaces it');
  assert.deepEqual(sanitizeHouse(JSON.parse(JSON.stringify(house))).chosen, { id: b.id, attune: 'benevolence' });
  assert.equal(sanitizeChosen({ id: b.id, attune: 'everything' }), null);
  assert.equal(sanitizeChosen({ attune: 'war' }), null);
  b.dead = { at: 1, by: 'you' };
  assert.equal(chosenAttune(house, b), null, 'the dead channel nothing');
  assert.ok(chooseProblem(house, b, 'war'));
  assert.equal(unchoose(house), true);
  assert.equal(house.chosen, null);
  // A universe reset takes everyone, and the Chosen with them.
  choose(house, a, 'war');
  house.adventure.best = ADVENTURE_LEVELS.length;
  assert.equal(resetUniverse(house, 5).chosen, null);
});

test('a Chosen hits twice as hard, three times attuned to War, and nobody else does', () => {
  const c = fighter(3);
  const rival = fighter(4);
  const atk = (house) => withChosen(house, () => new Bout([c, rival], { seed: 1 }).fighters.map((f) => f.atk));
  const [plain, rivalPlain] = atk(emptyHouse());
  for (const [attune, mul] of [['benevolence', CHOSEN.damage], ['speed', CHOSEN.damage], ['war', CHOSEN.warDamage]]) {
    const house = emptyHouse();
    choose(house, c, attune);
    const [mine, theirs] = atk(house);
    assert.ok(Math.abs(mine - plain * mul) < 1e-9, `${attune}: ${mine} against ${plain}`);
    assert.equal(theirs, rivalPlain, 'only the Chosen');
  }
  assert.equal(CHOSEN.warDamage, 3);
  assert.equal(new Bout([c, rival], { seed: 1 }).fighters[0].chosen, null, 'no household, no Chosen');
});

test('Benevolence: one bomb a fight takes half of what one enemy has left, whatever guards it', () => {
  const c = fighter(5);
  const house = emptyHouse();
  choose(house, c, 'benevolence');
  withChosen(house, () => {
    const bout = new Bout([c, fighter(6)], { seed: 2 });
    const [me, them] = bout.fighters;
    them.hp = 1000;
    them.def = 1e6;
    them.takenMul = 0.01;
    assert.equal(bout.canBomb(me, me), false, 'never on its own side');
    assert.equal(bout.dropBomb(me, them), true);
    assert.equal(them.hp, 500);
    assert.ok(bout.events.some((e) => e.name === 'DIVINE BOMB'));
    assert.equal(bout.dropBomb(me, them), false, 'once a fight');
    assert.equal(them.hp, 500);
    // The Chosen has to be standing to carry it.
    const again = new Bout([c, fighter(6)], { seed: 2 });
    again.fighters[0].alive = false;
    assert.equal(again.dropBomb(again.fighters[0], again.fighters[1]), false);
    // With nobody to click, a quick fight drops it on whoever has the most health.
    const three = new Bout([c, fighter(7), fighter(8)], { seed: 3 });
    const [, small, large] = three.fighters;
    small.hp = 100;
    large.hp = 900;
    three.autoBombs();
    assert.deepEqual([small.hp, large.hp, three.fighters[0].bomb], [100, 450, 'used']);
    const quick = finishBout(new Bout([c, fighter(9)], { seed: 4 }));
    assert.equal(quick.fighters[0].bomb, 'used');
  });
});

test('Speed: 1 in 100 hits are necrotic, and what they take off max health stays off, down to 30%', () => {
  const c = fighter(10);
  const house = emptyHouse();
  choose(house, c, 'speed');
  withChosen(house, () => {
    const bout = new Bout([c, fighter(11)], { seed: 5 });
    const [me, them] = bout.fighters;
    assert.equal(me.necro, CHOSEN.necro);
    me.crit = 0;
    Object.assign(them, { dodge: 0, hp: 1e6, maxHp: 1e6, reflect: 0 });
    const strike = (necroRoll) => {
      const rolls = [0.99, 0.99, 0.5, necroRoll];
      let i = 0;
      bout.rand = () => rolls[i++] ?? 0.5;
      return bout.strike(me, them, 1);
    };
    strike(CHOSEN.necro);
    assert.equal(them.maxHp, 1e6, 'a roll of 1% or more is an ordinary hit');
    const dealt = strike(CHOSEN.necro - 0.001);
    assert.ok(Math.abs(them.maxHp - (1e6 - dealt)) < 1e-6, 'a necrotic hit takes its damage off max health');
    assert.ok(them.hp <= them.maxHp);
    assert.equal(them.fullHp, 1e6);
    bout.necrotize(them, 1e9);
    assert.ok(Math.abs(them.maxHp - 1e6 * (1 - CHOSEN.necroCap)) < 1e-6, 'never below 30% of where it started');
    assert.equal(bout.necrotize(them, 1000), 0);
    assert.ok(them.hp <= them.maxHp);
  });
});
