// The anime gifts a creature can be born with: Titan Shifter, Saiyan Blood, Conqueror's Haki, Sun
// Breathing, Nine-Tails Chakra and One Punch. Each is checked inside a real fight.

import test from 'node:test';
import assert from 'node:assert/strict';

import { newCreature, wildCreature, abilitiesOf, bornWith, parseCreature, serializeCreature } from '../src/core/creature.js';
import { buildSheet } from '../src/core/sheet.js';
import { chanceSections } from '../src/core/odds.js';
import { breedingGuide } from '../src/core/breedguide.js';
import { Bout, runBout } from '../src/sim/arena.js';
import { TRAITS, TRAIT_IDS, TRAIT_ODDS, TITAN, SAIYAN, HAKI, SUN_BREATHING, NINE_TAILS, ONE_PUNCH } from '../src/data/powers.js';

const clean = (s) => !/undefined|NaN|null|\[object/.test(s);
const NEW_GIFTS = ['titanshifter', 'saiyan', 'haki', 'sunbreathing', 'ninetails', 'onepunch'];

// A fighter with only the gifts asked for, and no moves, so nothing else gets in the way.
function plain(seed, traits = [], level = 2) {
  const c = wildCreature(seed, level);
  c.traits = traits;
  c.battle.off = abilitiesOf(c);
  c.battle.stance = 'close';
  return c;
}

// A ring where nobody can fall, so a test can watch for as long as it likes.
function unbreakable(bout) {
  bout.fighters.forEach((f) => { f.hp = 1e7; f.maxHp = 1e7; });
  return bout;
}

const tickFor = (bout, seconds) => {
  const events = [];
  for (let i = 0; i < seconds * 30 && !bout.done; i++) {
    bout.tick(1 / 30);
    events.push(...bout.drainEvents());
  }
  return events;
};

test('there are six new gifts, each with a name, a color, a blurb and odds', () => {
  NEW_GIFTS.forEach((id) => {
    assert.ok(TRAIT_IDS.includes(id), id);
    assert.ok(TRAITS[id].name && /^#[0-9a-f]{6}$/i.test(TRAITS[id].color) && clean(TRAITS[id].blurb), id);
    assert.ok(TRAIT_ODDS[id] >= 2, id);
  });
  // The guide pages list them all, with the real odds.
  const born = chanceSections(null).find((s) => s.title === 'Born with');
  NEW_GIFTS.forEach((id) => assert.ok(born.rows.some((r) => r.name === TRAITS[id].name && r.odds === `1 in ${TRAIT_ODDS[id]}`), id));
  breedingGuide().forEach((s) => s.rows.forEach((r) => assert.ok(clean(`${r.name} ${r.detail}`), r.name)));
});

test('eggs hatch with the new gifts about as often as the odds say, and keep them through a save', () => {
  const counts = Object.fromEntries(NEW_GIFTS.map((id) => [id, 0]));
  const N = 12000;
  for (let i = 0; i < N; i++) {
    const c = newCreature('Egg');
    NEW_GIFTS.forEach((id) => { if (c.traits.includes(id)) counts[id] += 1; });
    assert.deepEqual(bornWith(c.id, c.lineage), c.traits);
  }
  NEW_GIFTS.forEach((id) => assert.ok(Math.abs(counts[id] / N - 1 / TRAIT_ODDS[id]) < 0.012, `${id}: ${counts[id]} of ${N}`));
  const c = newCreature('Keeper');
  c.traits = NEW_GIFTS.slice();
  assert.deepEqual(parseCreature(serializeCreature(c)).traits, NEW_GIFTS);
  const sheet = buildSheet(c).find((s) => s.title === 'Born with');
  assert.equal(sheet.rows.length, NEW_GIFTS.length);
});

test('Titan Shifter: below half its health it shifts, once, into something twice as big that hits twice as hard', () => {
  const bout = new Bout([plain(11, ['titanshifter']), plain(12)], { seed: 3 });
  const f = bout.fighters[0];
  f.def = 0;
  const { atk, size, scale } = f;
  bout.hurt(f, f.maxHp * 0.3, null);
  assert.equal(f.titan, 'ready', 'not yet at 70%');
  assert.equal(f.grow, 1);
  bout.hurt(f, f.maxHp * 0.25, null);
  assert.equal(f.titan, 'on');
  assert.equal(f.grow, TITAN.size);
  assert.equal(f.size, size * TITAN.size);
  assert.equal(f.scale, scale * TITAN.size);
  assert.equal(f.atk, atk * TITAN.damage);
  assert.ok(bout.drainEvents().some((e) => e.type === 'ability' && e.name === 'TITAN SHIFT'));
  // Only once a fight.
  f.hp = f.maxHp;
  bout.hurt(f, f.maxHp * 0.6, null);
  assert.equal(f.atk, atk * TITAN.damage);
  assert.ok(!bout.drainEvents().some((e) => e.name === 'TITAN SHIFT'));
  // Without the gift, nothing happens.
  const other = bout.fighters[1];
  other.def = 0;
  bout.hurt(other, other.maxHp * 0.7, null);
  assert.equal(other.grow, 1);
});

test('Saiyan Blood: once the fight has gone on long enough, it goes Super Saiyan', () => {
  const bout = unbreakable(new Bout([plain(21, ['saiyan']), plain(22)], { seed: 5 }));
  const f = bout.fighters[0];
  const { atk, moveSpeed, attackEvery } = f;
  tickFor(bout, SAIYAN.after - 1);
  assert.equal(f.saiyan, 'ready');
  const events = tickFor(bout, 2);
  assert.equal(f.saiyan, 'on');
  assert.ok(Math.abs(f.atk - atk * (1 + SAIYAN.damage)) < 1e-9);
  assert.ok(Math.abs(f.moveSpeed - moveSpeed * (1 + SAIYAN.speed)) < 1e-9);
  assert.ok(f.attackEvery < attackEvery);
  assert.ok(events.some((e) => e.name === 'SUPER SAIYAN'));
  assert.equal(bout.fighters[1].saiyan, null);
});

test('Conqueror\'s Haki: as the fight starts, anything with less max HP is stunned, and anything bigger is not', () => {
  const bout = new Bout([plain(31, ['haki']), plain(32)], { seed: 7 });
  const [me, them] = bout.fighters;
  me.maxHp = me.hp = 1000;
  them.maxHp = them.hp = 600;
  bout.tick(1 / 30);
  assert.ok(them.stun > HAKI.weaker - 0.1, `stunned for ${them.stun}`);
  assert.equal(me.stun, 0);
  assert.ok(bout.drainEvents().some((e) => e.name === 'CONQUEROR\'S HAKI'));
  // Something with more health only flinches.
  const big = new Bout([plain(33, ['haki']), plain(34)], { seed: 8 });
  big.fighters[0].maxHp = big.fighters[0].hp = 500;
  big.fighters[1].maxHp = big.fighters[1].hp = 900;
  big.tick(1 / 30);
  assert.ok(big.fighters[1].stun > 0 && big.fighters[1].stun <= HAKI.stronger, `flinched for ${big.fighters[1].stun}`);
});

test('Sun Breathing: it heals a little every second, up to its max', () => {
  const bout = new Bout([plain(41, ['sunbreathing']), plain(42)], { seed: 9 });
  const [me, them] = bout.fighters;
  // Neither can swing, so only the breathing changes anything.
  me.stun = them.stun = 100;
  me.hp = me.maxHp * 0.5;
  them.hp = them.maxHp * 0.5;
  tickFor(bout, 10);
  assert.ok(Math.abs(me.hp / me.maxHp - (0.5 + 10 * SUN_BREATHING)) < 0.01, `${me.hp / me.maxHp}`);
  assert.equal(them.hp, them.maxHp * 0.5);
  me.hp = me.maxHp - 0.01;
  tickFor(bout, 2);
  assert.equal(me.hp, me.maxHp);
});

test('Nine-Tails Chakra: the first knockout leaves it standing and stronger, the second one is real', () => {
  const bout = new Bout([plain(51, ['ninetails']), plain(52)], { seed: 11 });
  const f = bout.fighters[0];
  f.def = 0;
  const { atk } = f;
  bout.hurt(f, f.maxHp * 3, null);
  assert.ok(f.alive);
  assert.equal(f.hp, f.maxHp * NINE_TAILS.hp);
  assert.equal(f.fox, 'used');
  assert.ok(Math.abs(f.atk - atk * (1 + NINE_TAILS.damage)) < 1e-9);
  assert.ok(bout.drainEvents().some((e) => e.name === 'NINE-TAILS'));
  bout.hurt(f, f.maxHp * 3, null);
  assert.equal(f.alive, false);
});

test('Nine-Tails and Titan Shifter together: back up at 30%, which is under half, so it shifts', () => {
  const bout = new Bout([plain(53, ['ninetails', 'titanshifter']), plain(54)], { seed: 12 });
  const f = bout.fighters[0];
  f.def = 0;
  bout.hurt(f, f.maxHp * 3, null);
  assert.ok(f.alive && f.titan === 'on' && f.grow === TITAN.size);
});

test('One Punch: every 10th swing is a Serious Punch for five times the damage, and it can\'t be dodged', () => {
  const bout = new Bout([plain(61, ['onepunch']), plain(62)], { seed: 13 });
  const [me, them] = bout.fighters;
  me.crit = 0;
  me.blackFlash = false;
  them.hp = them.maxHp = 1e7;
  them.dodge = 0;
  const hits = [];
  for (let i = 1; i <= ONE_PUNCH.every; i++) {
    const before = them.hp;
    if (i === ONE_PUNCH.every) them.dodge = 1;
    bout.swing(me, them);
    hits.push(before - them.hp);
  }
  const normal = Math.max(...hits.slice(0, -1));
  const serious = hits[hits.length - 1];
  assert.ok(serious > normal * 3.5, `serious ${serious} against ${normal}`);
  assert.ok(bout.drainEvents().some((e) => e.name === 'SERIOUS PUNCH'));
  assert.equal(me.punches, 0, 'and it counts again from the start');
});

test('fights with every gift still end, in time, with a winner', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const a = plain(100 + seed, [NEW_GIFTS[seed % 6], NEW_GIFTS[(seed + 2) % 6]], 3);
    const b = plain(200 + seed, [NEW_GIFTS[(seed + 1) % 6]], 3);
    a.battle.off = [];
    b.battle.off = [];
    const bout = runBout([a, b], seed);
    assert.ok(bout.done && bout.winner, `seed ${seed}`);
    assert.ok(bout.t <= 150.1, `seed ${seed} took ${bout.t}`);
    bout.fighters.forEach((f) => assert.ok(Number.isFinite(f.hp) && Number.isFinite(f.atk), `seed ${seed}`));
  }
});

test('each gift is worth having, without deciding every fight', () => {
  const rate = (traits, rounds = 80) => {
    let wins = 0;
    for (let seed = 0; seed < rounds; seed++) {
      const me = wildCreature(9000 + seed, 3);
      me.traits = traits;
      const rival = wildCreature(40000 + seed, 3);
      rival.traits = [];
      if (runBout(seed % 2 ? [rival, me] : [me, rival], seed + 1).winner?.c === me) wins++;
    }
    return wins / rounds;
  };
  const none = rate([]);
  for (const id of NEW_GIFTS) {
    const r = rate([id]);
    assert.ok(r > none - 0.03 && r < 0.9, `${id} won ${r}, against ${none} with nothing`);
  }
});
