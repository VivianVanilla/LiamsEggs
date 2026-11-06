// How hard it hits: every attack it has, first from its Might alone, then with everything that
// changes it (weapon, paint, gifts, its battle plan's tuning), and then on average once critical hits
// and Black Flashes are counted in. Worked out by the arena's own code, on a copy, so these are the
// numbers a fight really uses. Before the target's Guard, which takes its share off every hit.
// No DOM, so tests can read it.

import { Bout, combatNumbers } from '../sim/arena.js';
import { parseCreature, serializeCreature, computeStats, hasTrait } from './creature.js';
import { prepEffects } from './craft.js';
import { ABILITIES } from '../data/paths.js';
import { BLACK_FLASH, WILL_DAMAGE, SLAYER_MARK, VOID_AURA } from '../data/powers.js';
import { PAINTS } from '../data/crafting.js';

const round = (v) => Math.round(v * 10) / 10;
const pct = (v) => `${Math.round(v * 100)}%`;

// What raises its hits above what its Might alone gives, in words.
function boosts(c, fighter) {
  const out = [];
  if (fighter.weapon?.damage) out.push(`${fighter.weapon.name} +${pct(fighter.weapon.damage)}`);
  const paint = prepEffects(c).damage;
  if (paint) out.push(`${PAINTS[c.prep.paint].name} +${pct(paint)}, for its next fight`);
  if (hasTrait(c, 'willofd')) out.push(`Will of D. +${pct(WILL_DAMAGE)}`);
  if (hasTrait(c, 'slayermark')) out.push(`Demon Slayer Mark +${pct(SLAYER_MARK.damage)}`);
  if (hasTrait(c, 'voidaura')) out.push(`Void Aura +${pct(VOID_AURA)}`);
  return out;
}

// { might, base, hit, crit, boosts, rows: [{ name, kind, base, hit, average, every, count }] }
//   base: one hit from its Might alone, at the move's own strength.
//   hit: the same hit with everything, battle plan tuning included.
//   average: that, with its chance of a critical hit (twice the damage) and of a Black Flash counted in.
//   every: seconds between uses. count: hits it lands at once (a volley, a Stand's rush).
export function damageTable(c) {
  const copy = parseCreature(serializeCreature(c));
  const f = new Bout([copy], { seed: 1 }).fighters[0];
  const stats = computeStats(c);
  const plain = combatNumbers(stats).atk;
  const crit = Math.min(1, f.crit);
  const critMul = 1 + crit;
  const flash = f.blackFlash ? 1 + BLACK_FLASH.chance * (BLACK_FLASH.power - 1) : 1;
  const rows = [{
    name: 'Its normal swing',
    kind: 'swing',
    base: round(plain),
    hit: round(f.atk),
    average: round(f.atk * critMul * flash),
    every: round(f.attackEvery),
    count: 1,
  }];
  f.abilities.forEach((a) => {
    const tuned = a.def;
    if (!tuned.power || tuned.kind === 'heal') return;
    const raw = ABILITIES[a.id]?.power ?? tuned.power;
    const count = tuned.volley ?? tuned.hits ?? 1;
    rows.push({
      name: tuned.name,
      kind: tuned.kind,
      base: round(plain * raw),
      hit: round(f.atk * tuned.power),
      average: round(f.atk * tuned.power * critMul),
      every: round((tuned.cd ?? 0) * f.cdMul),
      count,
    });
  });
  return { might: stats.might, base: round(plain), hit: round(f.atk), crit, flash: f.blackFlash, boosts: boosts(c, f), rows };
}
