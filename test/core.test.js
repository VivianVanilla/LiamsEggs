import test from 'node:test';
import assert from 'node:assert/strict';
import { FOOD_ORDER, FOODS, nutritionOf } from '../src/data/foods.js';
import fs from 'node:fs';
import { MUTATIONS, MUTATION_IDS, MUTATION_THRESHOLDS } from '../src/data/mutations.js';
import { ART_FILES, ART_GROUPS, BEHIND_BODY } from '../src/data/art-list.js';
import { PATHS, ROOT_PATHS, ABILITIES, TIER_XP } from '../src/data/paths.js';
import { STANDS, STAND_IDS, STAND_WITS, QUIRKS, QUIRK_IDS, SPEEDSTER, SPEEDSTER_SPEED, MAX_HP_GIVEN } from '../src/data/powers.js';
import {
  newCreature, absorbFile, computeStats, parseCreature, serializeCreature, sanitizeCreature,
  pathChoice, choosePath, isFinalForm, addColor, creatureColors, wildCreature, abilitiesOf, STAGES, addActivityXp,
  STAT_KEYS, maxHpOf, hpGivenUp, soulLean, standFor, standCard, awakenStand, canAwakenStand, becomeSpeedster, canBecomeSpeedster,
  gainQuirk, canGainQuirk, powerReady, digestTime,
} from '../src/core/creature.js';
import { addField, nextJob, doJob, tickFarm, adoptAnimal, eatFromStore, growMs, TILE } from '../src/sim/farm.js';
import { nimMove, newFour, fourDrop, fourWinner, fourMove, fourLegal, makeLights, lightsPress, lightsSolved, echoRecallChance } from '../src/sim/puzzles.js';
import { runBout, Bout } from '../src/sim/arena.js';
import { makeRng } from '../src/lib/util.js';

// An egg's born-with gifts are random, and some change how a fight goes, so the creatures made
// here have none. traits.test.js tests the gifts themselves.
const plainCreature = (...args) => Object.assign(newCreature(...args), { traits: [] });

const food = (ext, n, size = 1024) => ({ ext, name: `${ext}${n}`, sha: `${n.toString(16).padStart(8, '0')}abcdef`, size, snippet: 'x' });

test('every path node, ability and mutation in the tree is wired up', () => {
  for (const [id, node] of Object.entries(PATHS)) {
    if (node.parent) assert.ok(PATHS[node.parent].kids.includes(id), `${id} parent link`);
    if (node.tier === 3) {
      assert.ok(ABILITIES[node.ability], `${id} ability`);
    } else {
      assert.equal(node.kids.length, 2, `${id} has two sub-paths`);
      node.kids.forEach((kid) => assert.ok(PATHS[kid], `${id} kid ${kid}`));
    }
  }
  assert.equal(Object.values(PATHS).filter((n) => n.tier === 3).length, 16);
  for (const fam of FOOD_ORDER) {
    const count = Object.values(MUTATIONS).filter((m) => m.family === fam).length;
    assert.ok(count >= MUTATION_THRESHOLDS.length, `${fam} has enough mutations`);
  }
});

test('every mutation and job has one art file, and the list has no duplicates', () => {
  const files = ART_FILES.map((a) => a.file);
  assert.equal(new Set(files).size, files.length);
  MUTATION_IDS.forEach((id) => assert.ok(files.includes(`mutations/${id}.png`), id));
  Object.keys(PATHS).forEach((id) => assert.ok(files.includes(`jobs/${id}.png`), id));
  ART_FILES.forEach((a) => assert.ok(ART_GROUPS.some((g) => g.name === a.group), a.file));
  BEHIND_BODY.forEach((id) => assert.ok(MUTATIONS[id], id));
});

test('the game never draws pictures of its own: only art files, text and plain marks', () => {
  for (const file of ['src/draw/art.js', 'src/draw/scene.js', 'src/pet.js', 'src/game.js']) {
    const code = fs.readFileSync(file, 'utf8');
    for (const banned of ['Path2D', 'bezierCurveTo', 'quadraticCurveTo', 'createRadialGradient', 'createLinearGradient', 'clip-path']) {
      assert.ok(!code.includes(banned), `${file} uses ${banned}`);
    }
  }
  assert.ok(!fs.readFileSync('src/style.css', 'utf8').includes('clip-path'), 'no CSS-drawn pictures');
});

test('eating files grows it and eventually mutates it', () => {
  const c = plainCreature('Bob');
  const first = absorbFile(c, food('bone', 1));
  assert.equal(first.mutation, null);
  assert.equal(c.absorbed.length, 1);
  const second = absorbFile(c, food('bone', 2));
  assert.ok(second.mutation, 'second bone crosses the first threshold');
  assert.equal(MUTATIONS[second.mutation.id].family, 'bone');
  assert.ok(c.growth > 0);
});

test('the same file twice gives half food and no essence, so copying a file is no shortcut', () => {
  const c = plainCreature('Bob');
  absorbFile(c, food('ink', 1));
  const again = absorbFile(c, food('ink', 1));
  assert.equal(again.seen, true);
  assert.equal(again.essence, 0);
  assert.equal(c.essence.ink, 1);
});

test('file contents decide which mutation grows', () => {
  const made = new Set();
  for (let i = 0; i < 40; i++) {
    const c = plainCreature('A');
    absorbFile(c, food('goo', i * 977 + 1));
    const r = absorbFile(c, food('goo', i * 1213 + 3));
    made.add(r.mutation.id);
  }
  assert.ok(made.size >= 3, `expected variety, got ${[...made]}`);
});

test('bigger files feed more, up to a cap', () => {
  assert.ok(nutritionOf(32 * 1024) > nutritionOf(1024));
  assert.ok(nutritionOf(1024 * 1024) <= 10);
});

test('path tree: choose root, then sub-paths at XP thresholds, ending in a final form', () => {
  const c = plainCreature('Bob');
  assert.equal(pathChoice(c), null, 'a hatchling cannot choose yet');
  c.growth = STAGES[1].at;
  assert.deepEqual(pathChoice(c), ROOT_PATHS);
  assert.equal(choosePath(c, 'cultivator'), false, 'cannot skip a tier');
  assert.ok(choosePath(c, 'miner'));
  assert.equal(pathChoice(c), null);
  addActivityXp(c, 'farm', 5000);
  assert.equal(pathChoice(c), null, 'off-path work does not level the job');
  c.path.xp = TIER_XP[2];
  assert.ok(choosePath(c, 'excavator'));
  assert.equal(pathChoice(c), null);
  c.path.xp = TIER_XP[3];
  assert.equal(choosePath(c, 'sage'), false, 'sage is not under excavator');
  assert.ok(choosePath(c, 'wraith'));
  assert.ok(isFinalForm(c));
  assert.ok(abilitiesOf(c).includes('burrow'));
});

test('mined colors tint the creature and raise matching stats', () => {
  const c = plainCreature('Bob');
  const before = computeStats(c);
  const white = creatureColors(c).body;
  addColor(c, 240, 30, 30, 900);
  assert.notEqual(creatureColors(c).body, white);
  assert.ok(computeStats(c).might > before.might);
  const grey = addColor(c, 128, 128, 128, 5);
  assert.equal(grey.grey, true);
});

test('a save survives a round trip with its stats intact', () => {
  const c = plainCreature('Round Trip');
  absorbFile(c, food('ember', 1));
  absorbFile(c, food('ember', 2));
  addColor(c, 20, 200, 80, 120);
  c.growth = 50;
  choosePath(c, 'fighter');
  const back = parseCreature(serializeCreature(c));
  assert.deepEqual(computeStats(back), computeStats(c));
  assert.equal(back.name, 'Round Trip');
  assert.deepEqual(back.path.line, ['fighter']);
  assert.equal(back.mutations.length, c.mutations.length);
});

test('hostile .creature files are defused, not trusted', () => {
  assert.throws(() => parseCreature(''), /empty/);
  assert.throws(() => parseCreature('not json'), /readable/);
  assert.throws(() => parseCreature('{"format":"something"}'), /Not a/);
  const evil = sanitizeCreature({
    format: 'creature/1',
    id: '../../../windows<x>',
    name: '<img src=x onerror=alert(1)>\u0000' + 'A'.repeat(500),
    growth: 1e99,
    fullness: 'NaN',
    essence: { bone: -5, constructor: 9 },
    training: { might: 1e9 },
    mutations: [{ id: '__proto__' }, { id: 'constructor' }, { id: 'horns' }, { id: 'horns' }, null, 5],
    path: { line: ['wraith'], xp: -1 },
    palette: { hues: [{ r: 9999, g: -1, b: 'x', n: 1e12 }] },
    absorbed: [{ ext: '__proto__' }, { ext: 'bone', name: 'x'.repeat(999), sha: '<script>', snippet: 'y'.repeat(9999) }],
    farm: { fields: [{ cols: 1e6, rows: 1e6, tiles: [] }], animals: [{ kind: 'dragon' }] },
    record: { arenaWins: 1e20 },
  });
  assert.ok(!evil.name.includes('<'));
  assert.ok(evil.name.length <= 24);
  assert.ok(/^[a-zA-Z0-9_-]+$/.test(evil.id));
  assert.equal(evil.growth, 5000);
  assert.equal(evil.fullness, 35);
  assert.equal(evil.essence.bone, 0);
  assert.ok(!Object.hasOwn(evil.essence, 'constructor'), 'unknown food families are dropped');
  assert.equal(evil.training.might, 40);
  assert.deepEqual(evil.mutations.map((m) => m.id), ['horns']);
  assert.deepEqual(evil.path.line, [], 'a tier-3 job with no parents is rejected');
  assert.equal(evil.palette.hues[0].r, 255);
  assert.equal(evil.absorbed.length, 1);
  assert.ok(/^[a-fA-F0-9]*$/.test(evil.absorbed[0].sha), 'sha is hex only');
  assert.ok(evil.absorbed[0].snippet.length <= 200);
  assert.ok(evil.farm.fields[0].tiles.length <= 12 * 10);
  assert.equal(evil.farm.animals.length, 0);
  // Inflated stats can never go past the top of the scale.
  Object.values(computeStats(evil)).forEach((v) => assert.ok(v <= 99));
});

test('farm: till, plant, wait, harvest, then the creature feeds itself', () => {
  const c = plainCreature('Farmer');
  const t0 = 1_000_000;
  const f = addField(c, { x: 100, y: 100, w: TILE * 2, h: TILE });
  assert.equal(f.tiles.length, 2);
  assert.equal(addField(c, { x: 0, y: 0, w: 50, h: 50 }), null, 'field cap holds');

  let job = nextJob(c, 100, 100);
  assert.equal(job.kind, 'till');
  doJob(c, job, t0);
  job = nextJob(c, 100, 100);
  assert.equal(job.kind, 'plant', 'plants the tilled tile before breaking new ground');
  doJob(c, job, t0);

  tickFarm(c, t0 + growMs(c) - 1);
  assert.equal(f.tiles[job.tile].s, 2, 'not ripe yet');
  tickFarm(c, t0 + growMs(c) + 1);
  assert.equal(f.tiles[job.tile].s, 3, 'ripe');

  const harvest = nextJob(c, 100, 100);
  assert.equal(harvest.kind, 'harvest', 'harvest comes first');
  doJob(c, harvest, t0 + growMs(c) + 2);
  assert.equal(c.farm.store, 1);

  c.fullness = 10;
  assert.ok(eatFromStore(c));
  assert.equal(c.fullness, 22);
  assert.equal(c.farm.store, 0);
});

test('farm: crops keep growing while closed, animals lay, and a long gap does not hang', () => {
  const c = plainCreature('Farmer');
  const t0 = 2_000_000;
  c.farm.lastTick = t0;
  c.farm.store = 10;
  addField(c, { x: 0, y: 0, w: TILE, h: TILE });
  const a = adoptAnimal(c, 'cluck', 10, 10, t0);
  assert.ok(a);
  assert.equal(adoptAnimal(c, 'woolbit', 10, 10, t0), null, 'locked until enough harvests');
  doJob(c, nextJob(c, 0, 0), t0);
  doJob(c, nextJob(c, 0, 0), t0);
  const before = c.farm.store;
  const year = 365 * 24 * 3600 * 1000;
  tickFarm(c, t0 + year, makeRng(1));
  assert.equal(c.farm.fields[0].tiles[0].s, 3);
  assert.ok(c.farm.store > before, 'the cluckling laid');
  assert.ok(c.farm.store < 200, 'offline gains are capped');
});

test('stick pile AI plays perfectly at full skill', () => {
  const r = makeRng(5);
  for (let n = 2; n <= 21; n++) {
    if ((n - 1) % 4 !== 0) {
      const take = nimMove(n, 1, r);
      assert.equal((n - take - 1) % 4, 0, `from ${n} it leaves the losing pile`);
    }
    const anyTake = nimMove(n, 0, r);
    assert.ok(anyTake >= 1 && anyTake <= 3 && anyTake <= n);
  }
  assert.equal(nimMove(1, 1, r), 1);
});

test('four stones: detects wins, takes wins, blocks wins', () => {
  let b = newFour();
  for (const col of [0, 1, 2, 3]) b = fourDrop(b, col, 1).board;
  assert.equal(fourWinner(b).who, 1);
  assert.equal(fourWinner(newFour()), null);

  let attack = newFour();
  for (const col of [0, 1, 2]) attack = fourDrop(attack, col, -1).board;
  assert.equal(fourMove(attack, -1, 0.05, makeRng(1)), 3, 'even a dim creature takes the win');

  let block = newFour();
  for (const col of [0, 1, 2]) block = fourDrop(block, col, 1).board;
  assert.equal(fourMove(block, -1, 1, makeRng(1)), 3, 'a smart creature blocks');
});

test('four stones AI answers quickly at top skill, even on an empty board', () => {
  const start = Date.now();
  const col = fourMove(newFour(), -1, 1, makeRng(2));
  assert.ok(fourLegal(newFour()).includes(col));
  assert.ok(Date.now() - start < 1000, `took ${Date.now() - start}ms`);
});

test('light race boards are always solvable by their stored solution', () => {
  const r = makeRng(9);
  for (let i = 0; i < 50; i++) {
    const size = 3 + (i % 3);
    const { board, solution } = makeLights(size, 3 + (i % 5), r);
    assert.ok(!lightsSolved(board), 'never starts solved');
    let b = board;
    solution.forEach((p) => { b = lightsPress(b, size, p); });
    assert.ok(lightsSolved(b));
  }
});

test('echo recall gets harder with length and easier with skill', () => {
  assert.ok(echoRecallChance(3, 0.5) > echoRecallChance(10, 0.5));
  assert.ok(echoRecallChance(8, 1) > echoRecallChance(8, 0.1));
});

test('arena: every matchup ends, inside the time limit, with a winner', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const roster = [];
    const count = 2 + (seed % 7);
    for (let i = 0; i < count; i++) roster.push(wildCreature(seed * 31 + i, 1 + ((seed + i) % 3)));
    const bout = runBout(roster, seed);
    assert.ok(bout.done, `seed ${seed} finished`);
    assert.ok(bout.t <= 151, `seed ${seed} took ${bout.t}s`);
    assert.ok(bout.winner, `seed ${seed} has a winner`);
    assert.equal(bout.winner.minion, null, 'a summon can never be the winner');
  }
});

test('arena: every ability actually runs', () => {
  for (const [id] of Object.entries(ABILITIES)) {
    const a = wildCreature(1, 3);
    const b = wildCreature(2, 3);
    const bout = new Bout([a, b], { seed: 3 });
    bout.fighters[0].abilities = [{ id, def: ABILITIES[id], cd: 0 }];
    bout.fighters[0].hp = bout.fighters[0].maxHp * 0.3;
    let guard = 0;
    while (!bout.done && guard++ < 6000) bout.tick(1 / 30);
    assert.ok(bout.done, `${id} bout finished`);
  }
});

test('arena: a stronger creature usually beats a weaker one, and upsets still happen', () => {
  let strongWins = 0;
  const N = 60;
  for (let seed = 0; seed < N; seed++) {
    const strong = wildCreature(1000 + seed, 3);
    const weak = wildCreature(2000 + seed, 1);
    if (runBout([strong, weak], seed).winner.c === strong) strongWins++;
  }
  assert.ok(strongWins >= N * 0.7, `strong won ${strongWins}/${N}`);
});

// ---------- powers ----------

// A creature with exactly these training points, and nothing else raising its stats.
function trained(amounts, name = 'Trainee') {
  const c = plainCreature(name);
  Object.assign(c.training, amounts);
  return c;
}
const withWits = (wits, name) => {
  const c = trained({ wits: 10 }, name);
  const need = wits - computeStats(c).wits;
  c.essence.ink = Math.max(0, need * 4);
  return c;
};
const withSpeed = (speed) => {
  const c = trained({ speed: 10 });
  c.essence.spark = Math.max(0, (speed - computeStats(c).speed) * 4);
  return c;
};

test('every Stand and Quirk is wired up to real moves and its own art file', () => {
  const files = ART_FILES.map((a) => a.file);
  for (const id of STAND_IDS) {
    const stand = STANDS[id];
    assert.ok(stand.moves.length >= 1, `${id} has a move`);
    stand.moves.forEach((move) => assert.ok(ABILITIES[move], `${id} move ${move}`));
    assert.ok(STAT_KEYS.includes(stand.lean), `${id} lean`);
    assert.ok(files.includes(`stands/${id}.png`), `${id} art`);
    assert.ok(fs.existsSync(`art/stands/${id}.png`), `${id} art exists on disk`);
  }
  for (const id of QUIRK_IDS) {
    assert.ok(ABILITIES[QUIRKS[id].move], `${id} move`);
    assert.ok(Number.isInteger(QUIRKS[id].cost) && QUIRKS[id].cost > 0 && QUIRKS[id].cost <= MAX_HP_GIVEN, `${id} cost`);
    assert.ok(files.includes(`quirks/${id}.png`), `${id} art`);
    assert.ok(fs.existsSync(`art/quirks/${id}.png`), `${id} art exists on disk`);
  }
  assert.ok(ABILITIES[SPEEDSTER.move]);
  assert.ok(fs.existsSync('art/powers/speedster.png') && fs.existsSync('art/animals/shadow.png'));
  STAT_KEYS.forEach((k) => assert.ok(STAND_IDS.some((id) => STANDS[id].lean === k), `a Stand for a creature leaning on ${k}`));
});

test('a Stand takes enough Wits, and then it is permanent and part of its stats', () => {
  const low = withWits(STAND_WITS - 1);
  assert.equal(computeStats(low).wits, STAND_WITS - 1);
  assert.equal(canAwakenStand(low), false);
  assert.equal(awakenStand(low), null);
  assert.equal(low.powers.stand, null, 'nothing happens below the line');

  const c = withWits(STAND_WITS);
  assert.ok(powerReady(c));
  const before = computeStats(c);
  const id = awakenStand(c);
  assert.ok(STANDS[id], 'it got a real Stand');
  assert.equal(canAwakenStand(c), false, 'only one Stand per creature');
  assert.equal(awakenStand(c), null);
  assert.equal(c.powers.stand, id);
  Object.entries(STANDS[id].stats).forEach(([k, v]) => assert.equal(computeStats(c)[k], before[k] + v, `${k} bonus`));
  STANDS[id].moves.forEach((move) => assert.ok(abilitiesOf(c).includes(move), move));
  const back = parseCreature(serializeCreature(c));
  assert.equal(back.powers.stand, id);
  assert.deepEqual(computeStats(back), computeStats(c));
});

test('its soul decides the Stand: what it leans on picks the group, and the same creature gets the same one', () => {
  for (const lean of STAT_KEYS) {
    const made = new Set();
    for (let i = 0; i < 40; i++) {
      const c = plainCreature(`S${i}`);
      c.id = `soul${i}`;
      c.training[lean] = 40;
      assert.equal(soulLean(c), lean);
      const id = standFor(c);
      assert.equal(STANDS[id].lean, lean);
      assert.equal(standFor(c), id, 'asking twice gives the same answer');
      made.add(id);
    }
    const possible = STAND_IDS.filter((id) => STANDS[id].lean === lean).length;
    assert.equal(made.size, possible, `${lean}: every Stand in the group comes up`);
  }
});

test('a Stand chart is graded from its real stats', () => {
  const weak = plainCreature('Weak');
  const strong = trained({ might: 40 });
  strong.essence.ember = 200;
  const grade = (c, label) => standCard(c).find(([name]) => name === label)[1];
  assert.equal(grade(weak, 'Power'), 'E');
  assert.equal(grade(strong, 'Power'), 'A');
  assert.equal(grade(weak, 'Potential'), 'A', 'a hatchling has the most room to grow');
  weak.growth = STAGES[STAGES.length - 1].at;
  assert.equal(grade(weak, 'Potential'), 'E');
  assert.equal(standCard(weak).length, 6);
});

test('a speedster takes enough Speed, moves faster and gets hungrier', () => {
  const slow = withSpeed(SPEEDSTER_SPEED - 1);
  assert.equal(canBecomeSpeedster(slow), false);
  assert.equal(becomeSpeedster(slow), false);
  assert.equal(slow.powers.speedster, false);

  const c = withSpeed(SPEEDSTER_SPEED);
  const twin = parseCreature(serializeCreature(c));
  assert.ok(becomeSpeedster(c));
  assert.equal(becomeSpeedster(c), false, 'it only happens once');
  assert.equal(computeStats(c).speed, computeStats(twin).speed + SPEEDSTER.stats.speed);
  assert.ok(abilitiesOf(c).includes(SPEEDSTER.move));

  const bout = new Bout([c, twin], { seed: 1 });
  const [fast, plain] = bout.fighters;
  assert.ok(fast.moveSpeed > plain.moveSpeed * SPEEDSTER.arenaMove, 'faster by the multiplier, and then some from its extra Speed');
  assert.ok(fast.attackEvery < plain.attackEvery);
  assert.ok(fast.dodge > plain.dodge);

  c.fullness = 100;
  twin.fullness = 100;
  digestTime(c, 600);
  digestTime(twin, 600);
  assert.ok(Math.abs((100 - c.fullness) - (100 - twin.fullness) * SPEEDSTER.hungerMul) < 1e-9);
});

test('a Quirk takes its share of max HP for good, and there is a floor', () => {
  const c = trained({ vigor: 10 });
  const full = maxHpOf(c);
  const stats = computeStats(c);
  assert.ok(gainQuirk(c, 'hardening'));
  assert.equal(hpGivenUp(c), QUIRKS.hardening.cost);
  // Hardening adds Guard, and Guard adds a little HP back, so compare against those same stats.
  const after = computeStats(c);
  assert.equal(after.guard, stats.guard + QUIRKS.hardening.stats.guard);
  const hpBase = (55 + after.vigor * 6 + after.guard * 2) * 3.2;
  assert.equal(maxHpOf(c), Math.round(hpBase * (1 - QUIRKS.hardening.cost / 100)));
  assert.ok(maxHpOf(c) < full, 'it really does end up with less');

  assert.equal(gainQuirk(c, 'hardening'), false, 'the same one twice is refused');
  assert.equal(gainQuirk(c, 'nonsense'), false);
  assert.equal(canGainQuirk(c, '__proto__'), false);
  assert.equal(canGainQuirk(c, 'constructor'), false);

  // Buying everything it can afford stops at the floor, however the order falls.
  QUIRK_IDS.forEach((id) => gainQuirk(c, id));
  assert.ok(hpGivenUp(c) <= MAX_HP_GIVEN, `gave up ${hpGivenUp(c)}%`);
  assert.ok(hpGivenUp(c) > MAX_HP_GIVEN - Math.min(...QUIRK_IDS.map((id) => QUIRKS[id].cost)) - 1);
  QUIRK_IDS.filter((id) => !c.powers.quirks.includes(id)).forEach((id) => assert.equal(canGainQuirk(c, id), false, id));

  const back = parseCreature(serializeCreature(c));
  assert.deepEqual(back.powers.quirks, c.powers.quirks);
  assert.equal(maxHpOf(back), maxHpOf(c));
  const fighter = new Bout([back, plainCreature('X')], { seed: 1 }).fighters[0];
  assert.equal(fighter.maxHp, maxHpOf(back), 'the arena uses the same number the menu shows');
  assert.equal(fighter.hp, fighter.maxHp);
});

test('saves from before powers existed load with none, and old stats are untouched', () => {
  const c = plainCreature('Old Timer');
  c.training.vigor = 6;
  const raw = JSON.parse(serializeCreature(c));
  delete raw.powers;
  const back = sanitizeCreature(raw);
  assert.deepEqual(back.powers, { stand: null, speedster: false, technique: null, technique2: null, fruit: null, quirks: [] });
  assert.deepEqual(computeStats(back), computeStats(c));
  assert.equal(maxHpOf(back), maxHpOf(c));
});

test('hostile powers in a .creature file are defused', () => {
  const evil = sanitizeCreature({
    format: 'creature/1',
    name: 'Cheater',
    powers: { stand: '__proto__', speedster: 'yes', quirks: ['constructor', '__proto__', 5, null, 'decay', 'decay', 'oneforall', 'allforone', 'engine', 'hardening'] },
  });
  assert.equal(evil.powers.stand, null);
  assert.equal(evil.powers.speedster, false, 'only a real true counts');
  assert.ok(evil.powers.quirks.every((id) => Object.hasOwn(QUIRKS, id)));
  assert.equal(new Set(evil.powers.quirks).size, evil.powers.quirks.length, 'no duplicates');
  assert.ok(hpGivenUp(evil) <= MAX_HP_GIVEN, 'a file can\'t hold more Quirks than it could have paid for');
  assert.ok(maxHpOf(evil) > 0);
  assert.equal(sanitizeCreature({ format: 'creature/1', powers: 'nope' }).powers.stand, null);
  assert.equal(sanitizeCreature({ format: 'creature/1', powers: { quirks: 'nope', stand: 7 } }).powers.quirks.length, 0);
  Object.values(computeStats(evil)).forEach((v) => assert.ok(v <= 99));
});

test('the same save always costs the same HP: the price can\'t be edited out of a file', () => {
  const c = plainCreature('Editor');
  gainQuirk(c, 'oneforall');
  const raw = JSON.parse(serializeCreature(c));
  raw.summary.maxHp = 999999;
  raw.hpGivenUp = 0;
  const back = sanitizeCreature(raw);
  assert.equal(maxHpOf(back), maxHpOf(c));
});

test('level 3 wild rivals sometimes turn up with powers, and weaker ones never do', () => {
  let stands = 0;
  let speedsters = 0;
  let quirks = 0;
  for (let seed = 0; seed < 200; seed++) {
    const c = wildCreature(seed, 3);
    if (c.powers.stand) stands++;
    if (c.powers.speedster) speedsters++;
    if (c.powers.quirks.length) quirks++;
    assert.deepEqual(wildCreature(seed, 3).powers, c.powers, 'same seed, same rival');
    assert.deepEqual(wildCreature(seed, 1).powers, { stand: null, speedster: false, technique: null, technique2: null, fruit: null, quirks: [] });
    assert.deepEqual(wildCreature(seed, 2).powers, { stand: null, speedster: false, technique: null, technique2: null, fruit: null, quirks: [] });
  }
  for (const count of [stands, speedsters, quirks]) assert.ok(count > 20 && count < 160, `${stands}, ${speedsters}, ${quirks}`);
});

// A fight with no randomness in who hits what: two identical creatures, one given a single move.
function moveTest(id, seed = 3) {
  const a = wildCreature(1, 3);
  const b = wildCreature(1, 3);
  a.powers = { stand: null, speedster: false, quirks: [] };
  b.powers = { stand: null, speedster: false, quirks: [] };
  const bout = new Bout([a, b], { seed, cx: 500, cy: 400, r: 120 });
  const [user, foe] = bout.fighters;
  user.abilities = id ? [{ id, def: ABILITIES[id], cd: 0 }] : [];
  foe.abilities = [];
  return { bout, user, foe };
}
const run = (bout, seconds) => {
  for (let i = 0; i < seconds * 30 && !bout.done; i++) bout.tick(1 / 30);
};

test('stopped time holds the other side, not the one who stopped it, and then ends', () => {
  const { bout, user, foe } = moveTest('zawarudo');
  user.abilities[0].cd = 0;
  run(bout, 0.1);
  assert.ok(bout.stopLeft > 0, 'time stopped');
  assert.equal(bout.frozen(foe), true);
  assert.equal(bout.frozen(user), false);

  const clock = bout.t;
  const foeSpot = [foe.x, foe.y];
  const swing = foe.cdAttack;
  for (let i = 0; i < 30; i++) bout.tick(1 / 30);
  assert.equal(bout.t, clock, 'the fight clock stops too');
  assert.equal(foe.cdAttack, swing, 'its swing is frozen');
  assert.ok(Math.abs(foe.x - foeSpot[0]) < 20, 'and it does not walk');

  const hp = foe.hp;
  foe.dodge = 1; // can't dodge what it can't see coming
  bout.strike(user, foe, 1);
  assert.ok(foe.hp < hp, 'nothing dodges in stopped time');

  run(bout, 3);
  assert.equal(bout.stopLeft, 0);
  assert.equal(bout.frozen(foe), false, 'time flows again');
  assert.ok(bout.t > clock);
});

test('a Stand that can move in stopped time is not caught by someone else stopping it', () => {
  const a = plainCreature('A');
  const b = plainCreature('B');
  a.powers.stand = 'theworld';
  b.powers.stand = 'starplatinum';
  const c = plainCreature('C');
  const bout = new Bout([a, b, c], { seed: 1 });
  bout.stopLeft = 2;
  bout.stopTeam = 0;
  const [fa, fb, fc] = bout.fighters;
  assert.equal(bout.frozen(fa), false);
  assert.equal(bout.frozen(fb), false, 'Star Platinum moves in The World\'s stopped time');
  assert.equal(bout.frozen(fc), true);
});

test('a Stand rush goes over and lands its hits, then the Stand comes home', () => {
  const a = wildCreature(1, 3);
  const b = wildCreature(1, 3);
  a.powers = { stand: 'starplatinum', speedster: false, quirks: [] };
  b.powers = { stand: null, speedster: false, quirks: [] };
  const bout = new Bout([a, b], { seed: 5, cx: 500, cy: 400, r: 120 });
  const [user, foe] = bout.fighters;
  assert.ok(user.stand, 'it brought its Stand');
  assert.equal(foe.stand, null);
  foe.abilities = [];
  foe.dodge = 0;
  user.abilities = [{ id: 'oraora', def: ABILITIES.oraora, cd: 0 }];
  user.cdAttack = 99; // only the Stand is doing the hitting
  foe.cdAttack = 99;
  const hp = foe.hp;
  let furthest = 0;
  for (let i = 0; i < 30 * 2.5; i++) {
    bout.tick(1 / 30);
    user.cdAttack = 99;
    foe.cdAttack = 99;
    furthest = Math.max(furthest, Math.hypot(user.stand.x - user.x, user.stand.y - user.y));
  }
  assert.ok(foe.hp < hp, 'the hits landed');
  assert.ok(furthest > user.size + 20, 'the Stand left its user\'s side');
  assert.equal(user.stand.rush, null, 'the rush ended');
  for (let i = 0; i < 60; i++) {
    user.abilities = [];
    user.cdAttack = 99;
    foe.cdAttack = 99;
    bout.tick(1 / 30);
  }
  assert.ok(Math.hypot(user.stand.x - user.x, user.stand.y - user.y) < user.size + 20, 'and it came home');
});

test('nobody wastes stopped time on someone it cannot catch', () => {
  const a = plainCreature('A');
  const b = plainCreature('B');
  a.powers.stand = 'theworld';
  b.powers.stand = 'starplatinum';
  const bout = new Bout([a, b], { seed: 1 });
  const [user, foe] = bout.fighters;
  user.abilities = [{ id: 'zawarudo', def: ABILITIES.zawarudo, cd: 0 }];
  assert.equal(bout.useAbility(user, foe, 100), false);
  assert.equal(bout.stopLeft, 0);
  foe.stand = null;
  assert.equal(bout.useAbility(user, foe, 100), true);
  assert.ok(bout.stopLeft > 0);
});

test('bigger pictures stand further apart in the ring, and fight the same', () => {
  const small = new Bout([plainCreature('A'), plainCreature('B')], { seed: 1, sizeMul: 0.5 });
  const big = new Bout([plainCreature('A'), plainCreature('B')], { seed: 1, sizeMul: 2 });
  assert.equal(big.fighters[0].size, small.fighters[0].size * 4);
  assert.equal(big.fighters[0].maxHp, small.fighters[0].maxHp);
  assert.equal(big.fighters[0].atk, small.fighters[0].atk);
});

test('a stunned user calls its Stand back', () => {
  const a = plainCreature('A');
  a.powers.stand = 'starplatinum';
  const bout = new Bout([a, plainCreature('B')], { seed: 5, cx: 500, cy: 400, r: 120 });
  const [user, foe] = bout.fighters;
  user.stand.rush = { target: foe, hits: 6, power: 0.4, every: 0.1, clock: 0 };
  user.stun = 1;
  bout.tick(1 / 30);
  assert.equal(user.stand.rush, null);
});

test('moves with lasting effects: poison, silence, bombs, recoil, thieving', () => {
  // Poison keeps hurting after the hit, and doesn't shove the target around.
  {
    const { bout, user, foe } = moveTest(null);
    foe.poison = { left: 2, dps: 30, from: user };
    foe.cdAttack = 99;
    user.cdAttack = 99;
    const hp = foe.hp;
    const x = foe.x;
    bout.tickFighter(foe, 0.5);
    assert.ok(foe.hp < hp, 'poison hurts');
    assert.ok(user.damageDone > 0, 'and it counts for whoever caused it');
    assert.ok(Math.abs(foe.x - x) < 200);
    for (let i = 0; i < 90; i++) bout.tickFighter(foe, 1 / 30);
    assert.equal(foe.poison, null, 'and wears off');
  }
  // Silence stops every move until it runs out.
  {
    const { bout, user, foe } = moveTest('zap');
    user.silence = 1;
    assert.equal(bout.useAbility(user, foe, 100), false, 'no moves while silenced');
    user.silence = 0;
    assert.equal(bout.useAbility(user, foe, 100), true);
    bout.riders(user, foe, ABILITIES.bookify);
    assert.ok(foe.silence > 0 && foe.stun > 0, 'Heaven\'s Door stuns and silences');
  }
  // A bomb waits for its fuse.
  {
    const { bout, user, foe } = moveTest('bomb');
    assert.equal(bout.useAbility(user, foe, 100), true);
    assert.equal(bout.fuses.length, 1);
    const hp = foe.hp;
    bout.tickBolts(1);
    assert.equal(foe.hp, hp, 'not yet');
    bout.tickBolts(1.1);
    assert.ok(foe.hp < hp, 'boom');
    assert.equal(bout.fuses.length, 0);
    bout.drainEvents();
  }
  // A big hit hurts its user too, but never finishes it off.
  {
    const { bout, user, foe } = moveTest('smash');
    const hp = user.hp;
    bout.useAbility(user, foe, 100);
    assert.ok(user.hp < hp, 'Detroit Smash has a price');
    user.hp = 1;
    user.abilities[0].cd = 0;
    bout.useAbility(user, foe, 100);
    assert.equal(user.hp, 1, 'recoil never knocks out its own user');
    assert.ok(user.alive);
  }
  // All For One takes a move and uses it for the rest of the fight.
  {
    const { bout, user, foe } = moveTest('steal');
    foe.abilities = [{ id: 'zap', def: ABILITIES.zap, cd: 0 }];
    assert.equal(bout.useAbility(user, foe, 100), true);
    assert.equal(foe.abilities.length, 0);
    assert.ok(user.abilities.some((a) => a.id === 'zap'));
    user.abilities = [{ id: 'steal', def: ABILITIES.steal, cd: 0 }];
    assert.equal(bout.useAbility(user, foe, 100), false, 'it never reaches for a move that is not there');
  }
  // A thief with no Stand can still use a stolen rush.
  {
    const { bout, user, foe } = moveTest('oraora');
    foe.dodge = 0;
    const hp = foe.hp;
    bout.useAbility(user, foe, 100);
    assert.ok(foe.hp < hp);
  }
  // Volleys are more than one bolt, and Dark Shadow is a real fighter on its owner's side.
  {
    const { bout, user, foe } = moveTest('emerald');
    bout.useAbility(user, foe, 100);
    assert.equal(bout.bolts.length, ABILITIES.emerald.volley);
    const shadow = moveTest('shadow');
    shadow.bout.useAbility(shadow.user, shadow.foe, 100);
    const made = shadow.bout.fighters.find((f) => f.minion === 'shadow');
    assert.ok(made && made.owner === shadow.user.id);
  }
});

test('arena: fights with every power still end, with a winner, in time', () => {
  let seed = 1;
  for (const stand of STAND_IDS) {
    for (const quirk of QUIRK_IDS) {
      seed++;
      if (seed % 4) continue;
      const a = wildCreature(seed * 3, 3);
      const b = wildCreature(seed * 7, 3);
      a.powers = { stand, speedster: seed % 8 === 0, quirks: [quirk] };
      b.powers = { stand: STAND_IDS[seed % STAND_IDS.length], speedster: false, quirks: [] };
      const bout = runBout([a, b, wildCreature(seed * 11, 2)], seed);
      assert.ok(bout.done, `${stand} and ${quirk} finished`);
      assert.ok(bout.t <= 151, `${stand} and ${quirk} took ${bout.t}`);
      assert.ok(bout.winner, `${stand} and ${quirk} have a winner`);
      assert.equal(bout.winner.minion, null);
    }
  }
});

test('a double knockout still has a winner', () => {
  const a = plainCreature('A');
  const b = plainCreature('B');
  const bout = new Bout([a, b], { seed: 1 });
  const [fa, fb] = bout.fighters;
  fa.damageDone = 10;
  fb.damageDone = 20;
  bout.hurt(fa, 1e6, null);
  bout.hurt(fb, 1e6, null);
  bout.tick(1 / 30);
  assert.equal(bout.winner, fb);
});

test('powers are worth having, without deciding every fight', () => {
  const plain = (seed) => {
    const c = wildCreature(seed, 3);
    c.powers = { stand: null, speedster: false, quirks: [] };
    // Born-with gifts are tested on their own, in traits.test.js.
    c.traits = [];
    c.battle.stance = 'close';
    return c;
  };
  // Against a different creature of the same level, with no powers.
  const rate = (give, rounds = 80) => {
    let wins = 0;
    for (let seed = 0; seed < rounds; seed++) {
      const me = plain(9000 + seed);
      give(me);
      const rival = plain(40000 + seed);
      // Each side gets a turn on the left, so the seed can't favor one of them.
      if (runBout(seed % 2 ? [rival, me] : [me, rival], seed + 1).winner?.c === me) wins++;
    }
    return wins / rounds;
  };
  const none = rate(() => {});
  assert.ok(none > 0.38 && none < 0.62, `with no power at all it won ${none}`);
  const speedster = rate((c) => { c.powers.speedster = true; });
  assert.ok(speedster > 0.6 && speedster < 0.92, `speedster won ${speedster}`);
  for (const id of STAND_IDS) {
    const r = rate((c) => { c.powers.stand = id; });
    assert.ok(r > 0.6 && r < 0.95, `${id} won ${r}`);
  }
  for (const id of QUIRK_IDS) {
    const r = rate((c) => { c.powers.quirks.push(id); });
    assert.ok(r > 0.42 && r < 0.85, `${id} won ${r}: too ${r > 0.5 ? 'good' : 'bad'} for ${QUIRKS[id].cost}% of its health`);
  }
});

test('food definitions match their keys', () => {
  FOOD_ORDER.forEach((k) => assert.equal(FOODS[k].ext, k));
});
