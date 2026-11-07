// In plain words: what each move does, and what everything a creature has is doing to it.
// No DOM here, so tests can read it. Used by the battle plan note and the "what it has" note.

import { rawStats, statLimits, pathNodes, movesOf, hpGivenUp, ofaLevel, hasTrait, raceName, raceParts, raceStats, raceMoves, mutationCap, soulCap, STAT_LABELS, TRAINING_LIMIT } from './creature.js';
import { WEAPONS } from '../data/forge.js';
import { MUTATIONS, MAX_MUTATIONS, FAMILY_ABILITY } from '../data/mutations.js';
import { ABILITIES } from '../data/paths.js';
import { FOODS } from '../data/foods.js';
import {
  STANDS, QUIRKS, SPEEDSTER, TECHNIQUES, LEGENDARY, MAX_HP_GIVEN, BLACK_FLASH, TRAITS, EARN_RULES, OFA_ID, OFA_LEVEL_AT, OFA_MAX_LEVEL, OFA_MOVES,
  ofaStats, ofaLimitBonus, tuneMove,
} from '../data/powers.js';
import { FRUITS } from '../data/fruits.js';
import { RACES, DEFAULT_RACE, RACE_FULL_SHARE, raceMovesOf } from '../data/races.js';
import { stillToEarn } from './earned.js';
import { DEADLY_MONSTERS, TROPHY_POINTS } from '../data/monsters.js';
import { CHARMS, PAINTS, CHARM_SLOTS } from '../data/crafting.js';

const pct = (v) => `${Math.round(v * 100)}%`;

export function statText(stats) {
  const rows = Object.entries(stats ?? {}).filter(([, v]) => v);
  const count = Object.keys(STAT_LABELS).length;
  if (rows.length === count && rows.every(([, v]) => v === rows[0][1])) return `+${rows[0][1]} to every stat`;
  return rows.map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${STAT_LABELS[k]}`).join(', ');
}

const MINION_WORDS = { bug: 'beetle', beast: 'beast', blob: 'blob', shadow: 'living shadow', hound: 'divine dog' };

const PERK_WORDS = {
  gemChance: (v) => `+${pct(v)} gem chance`,
  mineSpeed: (v) => `digs ${pct(v)} faster`,
  growRate: (v) => `crops grow ${pct(v)} faster`,
  breedRate: (v) => `animals breed ${pct(v)} faster`,
  animalCap: (v) => `room for ${v} more animal${v === 1 ? '' : 's'}`,
  fieldCap: (v) => `room for ${v} more field${v === 1 ? '' : 's'}`,
  duelXp: (v) => `+${pct(v)} XP from puzzle duels`,
  duelSkill: (v) => `+${Math.round(v * 100)} puzzle skill`,
  carePicks: (v) => `${v} more thing can pass on when breeding`,
  careSave: (v) => `parents spend ${pct(v)} less fullness on an egg`,
  hatchGrowth: (v) => `eggs hatch with ${v} more growth`,
};

export const perkText = (perk) => Object.entries(perk ?? {}).map(([k, v]) => PERK_WORDS[k]?.(v)).filter(Boolean).join(', ');

const BUFF_WORDS = {
  guard: (v) => `takes ${pct(v)} less damage`,
  atk: (v) => `hits ${pct(v)} harder`,
  dodge: (v) => `dodges ${pct(v)} more`,
  crit: (v) => `lands ${pct(v)} more critical hits`,
};

// A move in a sentence or two. Written from its real numbers, so it can't drift from the fight.
export function describeMove(d) {
  const bits = [];
  const hit = d.power ? `${pct(d.power)} of a normal hit` : '';
  switch (d.kind) {
    case 'bolt': bits.push(d.volley ? `Fires ${d.volley} shots, each ${hit}, from up to ${d.range} away` : `Thrown from up to ${d.range} away, ${hit}`); break;
    case 'cone': bits.push(`A blast in front of it, ${d.range} long, ${hit}`); break;
    case 'nova': bits.push(`Hits everything within ${d.range}, ${hit}`); break;
    case 'dash': bits.push(`Jumps to the target from up to ${d.range} away, ${hit}`); break;
    case 'rush': bits.push(`Sends its Stand to land ${d.hits} hits, each ${hit}, from up to ${d.range} away`); break;
    case 'pull': bits.push(`Drags the target to it from up to ${d.range} away, ${hit}`); break;
    case 'bomb': bits.push(`Plants a bomb from up to ${d.range} away. After ${d.fuse} seconds it goes off for ${hit}`); break;
    case 'timestop': bits.push(`Stops time for ${d.dur} seconds, and nothing frozen can dodge`); break;
    case 'steal': bits.push(`Takes one move away from the target for the rest of the fight, from up to ${d.range} away`); break;
    case 'summon': bits.push(`Summons ${d.count === 1 ? 'a' : d.count} ${MINION_WORDS[d.minion] ?? 'helper'}${d.count === 1 ? '' : 's'} to fight for it`); break;
    case 'heal': bits.push(`Heals ${pct(d.power)} of its health once it is under 60%`); break;
    case 'buff': {
      const boosts = Object.keys(BUFF_WORDS).filter((k) => d[k]).map((k) => BUFF_WORDS[k](d[k]));
      if (d.speed) boosts.push(`moves ${pct(d.speed)} faster`);
      bits.push(`For ${d.dur} seconds it ${boosts.join(' and ')}`);
      break;
    }
    default: bits.push(d.name);
  }
  if (d.kind === 'heal' && d.atk) bits.push(`and hits ${pct(d.atk)} harder for ${d.dur} seconds`);
  if (d.push) bits.push('Throws them back');
  if (d.stun) bits.push(`Stuns for ${d.stun} seconds`);
  if (d.confuse) bits.push(`Confuses for ${d.confuse} seconds`);
  if (d.silence) bits.push(`Stops all their moves for ${d.silence} seconds`);
  if (d.poison) bits.push(`Leaves them hurting for ${d.poisonFor} seconds`);
  if (d.recoil) bits.push(`Costs ${pct(d.recoil)} of its own max health, but can't knock it out`);
  if (d.selfConfuse) bits.push(`Confuses itself for ${d.selfConfuse} seconds`);
  if (d.selfPoison) bits.push('Poisons itself a little too');
  if (d.selfBuff?.dodge) bits.push(`Nothing can touch it for ${d.selfBuff.left} seconds after`);
  if (d.splash) bits.push(`Hits everything within ${d.splash} of where it lands too`);
  if (d.drain) bits.push(`Heals it for ${pct(d.drain)} of the damage`);
  if (d.toll) bits.push(`Costs ${pct(d.toll)} of its own attack for the rest of the fight, every use`);
  if (d.cornered) bits.push('Only below half its health');
  if (d.after) bits.push(`Never in the first ${d.after} seconds`);
  bits.push(d.auto ? `Comes up on its own every ${d.cd} seconds` : `Ready every ${d.cd} seconds`);
  return `${bits.join('. ')}.`;
}

// 'far' works from mid range, 'near' needs it close, 'any' doesn't care where it stands.
export function moveRange(d) {
  if (d.kind === 'cone' || d.kind === 'nova') return 'near';
  if (d.kind === 'heal' || d.kind === 'buff' || d.kind === 'summon' || d.kind === 'timestop') return 'any';
  return 'far';
}

const RANGE_WORDS = { far: 'Works from mid range', near: 'Needs it close', any: 'Works from anywhere' };

// How its gifts and One For All change its moves, for tuneMove.
export const tuningOf = (c) => ({ sixEyes: hasTrait(c, 'sixeyes'), ofaLevel: ofaLevel(c) });

// Its moves, ready to list, as it really uses them.
export function moveList(c) {
  const tuning = tuningOf(c);
  return movesOf(c).filter((m) => Object.hasOwn(ABILITIES, m.id)).map((m) => {
    const def = tuneMove(m.id, ABILITIES[m.id], tuning);
    return { id: m.id, name: def.name, from: m.from, what: describeMove(def), range: moveRange(def), rangeWord: RANGE_WORDS[moveRange(def)], on: !c.battle.off.includes(m.id), cd: def.cd ?? 0 };
  });
}

// Which of a set of stats is getting nothing out of a bonus right now, because of its limit.
function wasted(stats, c) {
  const raw = rawStats(c);
  const limits = statLimits(c, raw);
  return Object.keys(stats ?? {}).filter((k) => stats[k] > 0 && raw[k] > limits[k]);
}

function row(c, name, stats, detail) {
  const over = wasted(stats, c);
  return {
    name,
    effect: statText(stats),
    detail,
    limited: over.length ? `${over.map((k) => STAT_LABELS[k]).join(' and ')} is at its limit, so that part adds nothing right now.` : '',
  };
}

// Everything it has, what each thing does, and how it got it. Empty sections are left out.
export function buildSheet(c) {
  const sections = [];

  const mutationRows = c.mutations.map((m) => {
    const def = MUTATIONS[m.id];
    const family = c.mutations.filter((x) => MUTATIONS[x.id].family === def.family).length;
    const move = ABILITIES[FAMILY_ABILITY[def.family]].name;
    const note = family >= 2 ? `With another ${FOODS[def.family].label} mutation, it teaches ${move}.` : `One more ${FOODS[def.family].label} mutation teaches ${move}.`;
    return row(c, def.name, def.stats, `From eating ${FOODS[def.family].label}. ${note}`);
  });
  sections.push({
    title: `Mutations (${c.mutations.length} of ${mutationCap(c)})`,
    empty: 'None yet. Feed it food from your farm to grow some.',
    rows: mutationRows,
  });

  const jobRows = pathNodes(c).map((node) => {
    const parts = [node.blurb];
    const perks = perkText(node.perk);
    if (perks) parts.push(`Also ${perks}.`);
    if (node.ability) parts.push(`Teaches ${ABILITIES[node.ability].name}.`);
    return row(c, node.name, node.stats, parts.join(' '));
  });
  if (jobRows.length) sections.push({ title: 'Its job', rows: jobRows });

  const powerRows = [];
  if (c.powers.stand) {
    const stand = STANDS[c.powers.stand];
    powerRows.push(row(c, `「${stand.name}」`, stand.stats, `${stand.blurb} Teaches ${stand.moves.map((id) => ABILITIES[id].name).join(' and ')}.`));
  }
  if (c.powers.speedster) {
    powerRows.push(row(c, 'Speedster', SPEEDSTER.stats, `Runs ${SPEEDSTER.walkMul} times as fast on your screen, digs ${pct(SPEEDSTER.mineSpeed)} faster, and gets hungry ${SPEEDSTER.hungerMul} times as fast. Teaches ${ABILITIES[SPEEDSTER.move].name}.`));
  }
  if (c.powers.technique) {
    const t = TECHNIQUES[c.powers.technique];
    powerRows.push(row(c, t.name, t.stats, `${t.blurb} Teaches ${t.moves.map((id) => ABILITIES[id].name).join(' and ')}. Melee swings have a ${pct(BLACK_FLASH.chance)} chance of a Black Flash, for ${BLACK_FLASH.power} times the damage.`));
  }
  if (c.powers.fruit) {
    const f = FRUITS[c.powers.fruit];
    powerRows.push(row(c, f.name, f.stats, `A Devil Fruit, a ${f.type}. ${f.blurb} Teaches ${f.moves.map((id) => ABILITIES[id].name).join(' and ')}. Nothing else goes with it, and it can't swim.`));
  }
  if (c.powers.technique2) {
    const t = TECHNIQUES[c.powers.technique2];
    powerRows.push(row(c, `${t.name} (Cursed Body)`, t.stats, `${t.blurb} From the ${t.family} side of its family. Teaches ${t.moves.map((id) => ABILITIES[id].name).join(' and ')}.`));
  }
  c.powers.quirks.forEach((id) => {
    const q = QUIRKS[id];
    if (id === OFA_ID) {
      powerRows.push(row(c, `${q.name}, level ${ofaLevel(c)} of ${OFA_MAX_LEVEL}`, ofaStats(ofaLevel(c)), ofaText(c)));
      return;
    }
    powerRows.push(row(c, q.name, q.stats, `${q.blurb} Cost ${q.cost}% of its max health, for good. Teaches ${ABILITIES[q.move].name}.`));
  });
  const parts = raceParts(c);
  if (parts.some(([id]) => id !== DEFAULT_RACE)) {
    const mixed = parts.length > 1;
    const moves = raceMoves(c).map((id) => ABILITIES[id].name);
    const detail = mixed
      ? `${parts.map(([id, share]) => `${Math.round(share * 100)}% ${RACES[id].name}`).join(', ')}. ${c.pureBlood ? 'Pure-blooded: every race in it is at full power.' : 'Each race gives its share of its bonuses, and a half or more brings its move.'}`
      : RACES[parts[0][0]].blurb;
    sections.unshift({ title: 'Race', rows: [row(c, raceName(c), raceStats(c), `${detail}${moves.length ? ` Teaches ${moves.join(' and ')}.` : ''}`)] });
  }
  // What its races do, in a fight and at home: every race it is half or more of.
  const raceRows = parts.filter(([, share]) => c.pureBlood || share >= RACE_FULL_SHARE).flatMap(([id]) => [
    RACES[id].passive && { name: `${RACES[id].name}, in a fight`, effect: '', detail: RACES[id].passive.text, limited: '' },
    ...raceMovesOf(id).filter((m) => ABILITIES[m]).map((m) => ({ name: `${RACES[id].name}, ${ABILITIES[m].name}`, effect: '', detail: describeMove(ABILITIES[m]), limited: '' })),
    RACES[id].village && { name: `${RACES[id].name}, at home`, effect: '', detail: RACES[id].village.text, limited: '' },
  ]).filter(Boolean);
  if (raceRows.length) sections.unshift({ title: 'Its race does', rows: raceRows });
  const earned = c.traits.filter((id) => TRAITS[id].earned);
  const born = c.traits.filter((id) => !TRAITS[id].earned);
  const toEarn = stillToEarn(c);
  if (toEarn.length) {
    sections.push({
      title: 'Gifts it can still earn',
      rows: toEarn.map((e) => ({ name: TRAITS[e.id].name, effect: `${e.have} of ${e.need}`, detail: `${e.how} ${TRAITS[e.id].blurb}`, limited: '' })),
    });
  }
  if (earned.length) {
    sections.unshift({
      title: 'Earned',
      rows: earned.map((id) => ({ name: TRAITS[id].name, effect: '', detail: `${TRAITS[id].blurb} It earned this: ${EARN_RULES[id].how.charAt(0).toLowerCase()}${EARN_RULES[id].how.slice(1)}`, limited: '' })),
    });
  }
  if (born.length) {
    sections.unshift({
      title: 'Born with',
      rows: born.map((id) => ({
        name: TRAITS[id].name,
        effect: '',
        detail: `${TRAITS[id].blurb}${id === 'sixeyes' && !hasLimitless(c) ? ' It has no Limitless yet, so this does nothing for now.' : ''}`,
        limited: '',
      })),
    });
  }
  if (c.souls.length) {
    sections.unshift({
      title: `Legendary mutations (${c.souls.length} of ${soulCap(c)})`,
      note: `Each adds a Legendary slot for one more power.${c.souls.length > 1 ? ' Their slots, stats and fight bonuses all add up.' : ''}`,
      rows: c.souls.map((id) => {
        const l = LEGENDARY[id];
        return row(c, l.name, l.stats, `${l.blurb}${l.passive ? ` In a fight: ${l.passive.text}` : ''}${l.move ? ` Its move, ${ABILITIES[l.move].name}: ${describeMove(ABILITIES[l.move])}` : ''}`);
      }),
    });
  }
  if (powerRows.length) {
    const given = hpGivenUp(c);
    sections.push({ title: 'Powers', note: given ? `It has given up ${given}% of its max health, out of ${MAX_HP_GIVEN}% it can.` : '', rows: powerRows });
  }

  if (c.gear.worn.length) {
    sections.push({
      title: `Charms it wears (${c.gear.worn.length} of ${CHARM_SLOTS})`,
      rows: c.gear.worn.map((id) => row(c, CHARMS[id].name, CHARMS[id].stats, 'Crafted in the workshop.')),
    });
  }

  if (c.weapon && WEAPONS[c.weapon]) {
    const w = WEAPONS[c.weapon];
    sections.push({ title: 'Weapon', rows: [{ name: w.name, effect: '', detail: `Forged from Legendary ore. In every fight, it ${w.text}.`, limited: '' }] });
  }

  if (c.expanders) {
    sections.push({ title: 'Limit Expanders', rows: [{ name: `${c.expanders} used`, effect: '', detail: `It can hold ${mutationCap(c)} mutations instead of ${MAX_MUTATIONS}.`, limited: '' }] });
  }

  if (c.trophies.length) {
    sections.push({
      title: 'Trophies',
      rows: c.trophies.map((id) => {
        const m = DEADLY_MONSTERS[id];
        return row(c, m.name, { [m.trophy]: TROPHY_POINTS }, `It beat this one to the death. Its ${STAT_LABELS[m.trophy]} limit is ${TROPHY_POINTS} higher too.`);
      }),
    });
  }

  const prepRows = [];
  if (c.prep.paint) prepRows.push({ name: PAINTS[c.prep.paint].name, effect: '', detail: `In its next fight, it ${PAINTS[c.prep.paint].text}. Then it is gone.`, limited: '' });
  if (prepRows.length) sections.push({ title: 'Ready for its next fight', rows: prepRows });

  const trained = Object.entries(c.training).filter(([, v]) => Math.floor(v) > 0);
  if (trained.length) {
    sections.push({
      title: 'Training',
      rows: trained.map(([k, v]) => row(c, STAT_LABELS[k], { [k]: Math.min(TRAINING_LIMIT, Math.floor(v)) }, `From work and monsters, up to +${TRAINING_LIMIT}.`)),
    });
  }

  return sections;
}

const hasLimitless = (c) => c.powers.technique === 'limitless' || c.powers.technique2 === 'limitless';

// One For All in words: its level, what the next one takes, who held it, what it teaches.
export function ofaText(c) {
  const level = ofaLevel(c);
  const stock = Math.floor(c.ofa?.stockpile ?? 0);
  const next = OFA_LEVEL_AT[level];
  const bonus = ofaLimitBonus(level);
  const parts = [`Stockpile ${stock}.${next === undefined ? ' It is as strong as it gets.' : ` Level ${level + 1} at ${next}.`}`];
  const raised = [bonus.might && `its Might limit by ${bonus.might}`, bonus.speed && `its Speed limit by ${bonus.speed}`].filter(Boolean);
  if (raised.length) parts.push(`It raises ${raised.join(" and ")}.`);
  if (c.ofa?.holders.length) parts.push(`Held before by ${c.ofa.holders.join(', ')}.`);
  const moves = OFA_MOVES.filter(([, at]) => at <= level).map(([id]) => ABILITIES[id].name);
  parts.push(`Teaches ${moves.join(', ')}.`);
  parts.push(`Cost ${QUIRKS[OFA_ID].cost}% of its max health. Passing it on ends this creature for good and adds its own power to the stockpile.`);
  return parts.join(' ');
}

// Every mutation there is, for planning ahead, with the ones it already has marked.
export function allMutations(c) {
  const owned = new Set(c.mutations.map((m) => m.id));
  return Object.keys(FOODS).map((family) => ({
    family,
    label: FOODS[family].label,
    move: ABILITIES[FAMILY_ABILITY[family]].name,
    rows: Object.keys(MUTATIONS).filter((id) => MUTATIONS[id].family === family).map((id) => ({ id, name: MUTATIONS[id].name, effect: statText(MUTATIONS[id].stats), owned: owned.has(id) })),
  }));
}
