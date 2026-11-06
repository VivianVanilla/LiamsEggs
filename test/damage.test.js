// What it has: each attack's damage, from its Might alone and with everything.

import test from 'node:test';
import assert from 'node:assert/strict';
import { newCreature } from '../src/core/creature.js';
import { damageTable } from '../src/core/damage.js';
import { WEAPONS } from '../src/data/forge.js';

test('damage: base from Might alone, then with everything, then on average', () => {
  const c = Object.assign(newCreature('Hitter', 1), { traits: [], growth: 400 });
  const bare = damageTable(c);
  assert.equal(bare.rows[0].kind, 'swing');
  assert.equal(bare.rows[0].hit, bare.rows[0].base, 'nothing adds to it yet');
  assert.deepEqual(bare.boosts, []);
  c.weapon = 'dragonslayer';
  c.prep = { paint: 'war' };
  const armed = damageTable(c);
  assert.equal(armed.rows[0].base, bare.rows[0].base, 'base never changes with gear');
  assert.ok(armed.rows[0].hit > armed.rows[0].base * (1 + WEAPONS.dragonslayer.damage) * 0.99, 'weapon and paint both count');
  assert.equal(armed.boosts.length, 2);
  armed.rows.forEach((r) => {
    assert.ok(r.average >= r.hit, `${r.name}: crits only add`);
    assert.ok(r.every > 0 && r.base > 0, r.name);
  });
});

test('Void Aura hits 10% harder, and a Philosopher\'s Heart speeds up the move picked for it', async () => {
  const { Bout } = await import('../src/sim/arena.js');
  const { VOID_AURA, PHILOSOPHER_HEART, BORN_TRAIT_IDS, TRAIT_ODDS } = await import('../src/data/powers.js');
  assert.ok(BORN_TRAIT_IDS.includes('voidaura') && BORN_TRAIT_IDS.includes('philosopher'), 'both hatch from eggs');
  assert.ok(TRAIT_ODDS.voidaura > 0 && TRAIT_ODDS.philosopher > 0);
  const make = (traits) => Object.assign(newCreature('Born', 1), { traits, growth: 300 });
  const atk = (traits) => new Bout([make(traits)], { seed: 1 }).fighters[0].atk;
  assert.ok(Math.abs(atk(['voidaura']) / atk([]) - (1 + VOID_AURA)) < 1e-9);
  assert.ok(damageTable(make(['voidaura'])).boosts.some((b) => b.startsWith('Void Aura')), 'and What it has says so');
  const { parseCreature, serializeCreature } = await import('../src/core/creature.js');
  const withMove = (traits) => {
    const c = make(traits);
    c.mutations = [{ id: 'mindgem', from: '', at: 0 }, { id: 'bigbrain', from: '', at: 0 }];
    return c;
  };
  const moveOf = (c) => new Bout([c], { seed: 1 }).fighters[0].abilities.find((a) => a.def.cd > 0);
  const plainMove = moveOf(withMove([]));
  assert.ok(plainMove, 'two mutations from one family teach a move');
  const stone = withMove(['philosopher']);
  assert.equal(moveOf(stone).def.cd, plainMove.def.cd, 'nothing until a move is picked');
  stone.battle.heart = plainMove.id;
  assert.ok(Math.abs(moveOf(stone).def.cd - plainMove.def.cd * (1 - PHILOSOPHER_HEART)) < 1e-9, 'a 10-second move comes back in 4');
  assert.equal(PHILOSOPHER_HEART, 0.6);
  const plain = withMove([]);
  plain.battle.heart = plainMove.id;
  assert.equal(moveOf(plain).def.cd, plainMove.def.cd, 'only with the gift');
  assert.equal(parseCreature(serializeCreature(stone)).battle.heart, plainMove.id, 'the pick is saved');
  assert.equal(parseCreature(JSON.stringify({ format: 'creature/1', battle: { heart: 'nope' } })).battle.heart, null);
});
