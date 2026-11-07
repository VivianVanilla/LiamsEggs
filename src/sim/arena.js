// The arena fight. A pure simulation: tick(dt) moves everything and pushes events
// (hits, KOs, fx) for the renderer. Also runs headless so balance can be tested.

import { clamp, makeRng } from '../lib/util.js';
import { computeStats, abilitiesOf, stageOf, maxHpOf, hpFromStats, hasTrait, raceSize, fightPassive, addPassive, emptyPassive, negativeShare, awakenedKinds } from '../core/creature.js';
import { GOD_GUARD, GOD_FULL } from '../data/ascension.js';
import { negFightSpec, negShell } from '../core/negative.js';
import { NEG_SCALE, KO } from '../data/negative.js';
import { tuningOf } from '../core/sheet.js';
import { ABILITIES } from '../data/paths.js';
import {
  STANDS, SPEEDSTER, BLACK_FLASH, SHARINGAN_COPY, tuneMove, TRAITS, TITAN, SAIYAN, HAKI, SUN_BREATHING, NINE_TAILS, ONE_PUNCH,
  ULTRA_DODGE, EIGHT_GATES, DOMAIN, OBSERVATION, GOURMET_HEAL, WILL_DAMAGE, SLAYER_MARK, ACKERMAN, SCARLET_EYES, VOID_AURA, PHILOSOPHER_HEART,
} from '../data/powers.js';
import { WEAPONS } from '../data/forge.js';
import { CHOSEN, CHOSEN_COLOR } from '../data/chosen.js';
import { chosenAttune } from '../core/chosen.js';
import { prepEffects } from '../core/craft.js';
import {
  WINDUP, WINDUP_SLACK, LOW_HEALTH, BERSERK_HIT, BERSERK_TAKEN, BACKING_SPEED, MID_GAP, OFF_BALANCE, BOUNCE_BACK, BOUNCE_WAIT_GAP, HOLD_GUARD, HOLD_HIT, HOLD_PATIENCE, THROW,
} from '../data/battle.js';

const MINIONS = {
  blob:   { name: 'Spawnling',   hp: 0.08, atk: 0.3,  speed: 90,  size: 11 },
  beast:  { name: 'Beast',       hp: 0.08, atk: 0.3,  speed: 170, size: 13 },
  bug:    { name: 'Beetle',      hp: 0.04, atk: 0.2, speed: 200, size: 7 },
  shadow: { name: 'Dark Shadow', hp: 0.22, atk: 0.5,  speed: 150, size: 14 },
  hound:  { name: 'Divine Dog',  hp: 0.07, atk: 0.25, speed: 190, size: 12 },
};

const SUDDEN_DEATH_AT = 60;
const MAX_TIME = 150;

// The household whose Chosen (core/chosen.js) every fight looks for. game.js points this at yours
// once, so every fight anywhere finds it; tests can point it at any household.
let chosenHouse = () => null;
export const setChosenHouse = (fn) => {
  chosenHouse = typeof fn === 'function' ? fn : () => null;
};

// What the passives of data/races.js and the rest do, where they need numbers of their own.
const FRENZY_CAP = 0.6;
const EVOLVE_BELOW = 0.3;
const ENRAGE_BELOW = 0.5;
const ENRAGE_SPEED = 1.25;
const LIFE_HP = 0.5;
const DECAY_FOR = 3;
const NULL_FIELD = { every: 6, silence: 2, range: 220 };
const DEFAULT_AURA_RANGE = 160;

// A passive as the numbers a fighter carries.
export function passiveFields(p) {
  return {
    absorb: p.absorb,
    reflect: p.reflect,
    regen: p.regen,
    unstoppable: p.unstoppable,
    echo: p.echo,
    execute: p.execute,
    frenzy: p.frenzy,
    frenzyHits: 0,
    evolve: p.evolve ? 'ready' : null,
    evolveDmg: p.evolve,
    lives: p.lives,
    critMul: 2 + p.critMul,
    monsterDmg: p.monsterDmg,
    aura: p.aura,
    auraRange: p.auraRange || DEFAULT_AURA_RANGE,
    nullField: p.nullField,
    nullClock: NULL_FIELD.every,
    nullSilence: NULL_FIELD.silence + (p.nullSilence ?? 0),
    decay: p.decay,
    enrage: p.enrage,
    enraged: false,
    horizon: p.horizon,
  };
}

// What lives in Chapter ??? barely feels anything without Negative blood: a hit from something half
// Negative or more lands in full, and a quarter halfway.
export const voidFactor = (from, guard) => 1 - guard * (1 - Math.min(1, (from?.voidShare ?? 0) * 2));

// What lives in the God Chapter is god-touched the same way: only an awakened power wounds it. godShare
// is how many it has awakened, over GOD_FULL, so two or more land in full and one about half.
export const godFactor = (from, guard = GOD_GUARD) => 1 - guard * (1 - Math.min(1, from?.godShare ?? 0));
export const godShareOf = (c) => Math.min(1, awakenedKinds(c).length / GOD_FULL);

// What a set of stats means in a fight, for creatures and monsters alike.
export function combatNumbers(s) {
  return {
    atk: 4.5 + s.might * 1.1,
    def: s.guard,
    moveSpeed: 62 + s.speed * 5,
    attackEvery: clamp(1.25 - s.speed * 0.012, 0.65, 1.25),
    dodge: s.wits / (s.wits + 90),
    crit: s.wits / (s.wits + 110),
    cdMul: clamp(1 - s.wits * 0.006, 0.6, 1),
  };
}

const lowHealth = (f) => f.hp / f.maxHp < LOW_HEALTH;

// How far behind its user a Stand floats.
const standGap = (size) => size * 1.35 + 4;

export class Bout {
  // sizeMul is the Size setting: bigger pictures need to stand further apart to be told apart.
  constructor(creatures, { seed = Date.now() | 0, cx = 500, cy = 400, r = 300, sizeMul = 1 } = {}) {
    this.rand = makeRng(seed);
    this.sizeMul = sizeMul;
    this.cx = cx;
    this.cy = cy;
    this.r = r;
    this.baseR = r;
    this.t = 0;
    this.events = [];
    this.fighters = [];
    this.bolts = [];
    this.fuses = [];
    this.stopLeft = 0;
    this.stopTeam = -1;
    this.done = false;
    this.winner = null;
    this.nextId = 1;
    const n = creatures.length;
    creatures.forEach((c, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * r * 0.7;
      const y = cy + Math.sin(a) * r * 0.62;
      const f = c.dimension === 'negative' ? this.makeNegFighter(c, x, y, i) : this.makeFighter(c, x, y, i);
      this.fighters.push(f);
      if (f.stand) this.events.push({ type: 'menace', x: f.x, y: f.y, color: f.stand.def.color });
    });
  }

  // A creature of the Negative, through the light-world shell that wears its race and gifts, with every
  // number its own.
  makeNegFighter(nc, x, y, team) {
    const f = this.makeFighter(negShell(nc), x, y, team, negFightSpec(nc));
    f.neg = nc;
    f.name = nc.name;
    f.voidShare = 1;
    f.godShare = 0;
    f.ringMul = NEG_SCALE;
    return f;
  }

  // `neg` is what a creature of the Negative brings instead (negFightSpec in core/negative.js).
  makeFighter(c, x, y, team, neg = null) {
    const s = neg ? neg.eq : computeStats(c);
    const stage = stageOf(c);
    const tuning = tuningOf(c);
    // A Philosopher's Heart speeds up the one move picked for it in the battle plan.
    const heart = hasTrait(c, 'philosopher') ? c.battle.heart : null;
    const quicker = (id, def) => (id === heart && def.cd ? { ...def, cd: def.cd * (1 - PHILOSOPHER_HEART) } : def);
    const abilities = neg
      ? neg.moves.map(({ id, def }) => ({ id, def, cd: 1.5 + this.rand() * 3 }))
      : abilitiesOf(c)
        .filter((id) => !c.battle.off.includes(id))
        .map((id) => (Object.hasOwn(ABILITIES, id) ? { id, def: quicker(id, tuneMove(id, ABILITIES[id], tuning)), cd: 1.5 + this.rand() * 3 } : null))
        .filter(Boolean);
    const prep = prepEffects(c);
    // What its races and its Legendary mutation do in a fight, and its earned gifts that just change its numbers.
    const passive = fightPassive(c);
    if (neg) addPassive(passive, neg.passive);
    const sees = hasTrait(c, 'observation');
    const maxHp = (neg ? hpFromStats(s) * neg.hpMul : maxHpOf(c, s)) * (1 + prep.hp) * (1 + passive.hp);
    const dir = x < this.cx ? 1 : -1;
    const size = 26 * stage.scale * this.sizeMul * raceSize(c);
    const fast = c.powers.speedster;
    const standDef = c.powers.stand ? STANDS[c.powers.stand] : null;
    const base = combatNumbers(s);
    if (neg) base.atk *= neg.atkMul;
    const weapon = c.weapon && Object.hasOwn(WEAPONS, c.weapon) ? WEAPONS[c.weapon] : null;
    // Gifts awakened by breeding that just change its numbers.
    const mark = hasTrait(c, 'slayermark');
    const markHit = mark ? 1 + SLAYER_MARK.damage : 1;
    const markSpeed = mark ? 1 + SLAYER_MARK.speed : 1;
    // Your Chosen hits twice as hard, three times attuned to War. Only the light world has one.
    const chosen = neg ? null : chosenAttune(chosenHouse(), c);
    const chosenHit = chosen ? (chosen === 'war' ? CHOSEN.warDamage : CHOSEN.damage) : 1;
    return {
      id: this.nextId++,
      team,
      owner: null,
      minion: null,
      c,
      name: c.name,
      x, y,
      dir,
      scale: stage.scale * this.sizeMul * raceSize(c),
      size,
      // How much bigger than usual it is drawn: a Titan is twice the size.
      grow: 1,
      hp: maxHp,
      maxHp,
      ...base,
      crit: base.crit + (weapon?.crit ?? 0) + passive.crit + (sees ? OBSERVATION.crit : 0),
      weapon,
      // Your Chosen's attunement. Benevolence has one bomb a fight; Speed's hits can be necrotic.
      chosen,
      bomb: chosen === 'benevolence' ? 'ready' : null,
      necro: chosen === 'speed' ? CHOSEN.necro : 0,
      // Born-with gifts that change a fight. 'ready' turns to 'on' or 'used' once it happens.
      titan: hasTrait(c, 'titanshifter') ? 'ready' : null,
      saiyan: hasTrait(c, 'saiyan') ? 'ready' : null,
      haki: hasTrait(c, 'haki'),
      sun: hasTrait(c, 'sunbreathing'),
      fox: hasTrait(c, 'ninetails') ? 'ready' : null,
      punches: hasTrait(c, 'onepunch') ? 0 : null,
      gates: hasTrait(c, 'eightgates') ? 'ready' : null,
      domain: hasTrait(c, 'domain') ? 'ready' : null,
      domainUntil: 0,
      gourmet: hasTrait(c, 'gourmet'),
      will: hasTrait(c, 'willofd') ? 'ready' : null,
      ackerman: hasTrait(c, 'ackerman'),
      // Ackerman Blood, a Fighter's Extra Attack: this share of its swings land twice.
      twice: (hasTrait(c, 'ackerman') ? ACKERMAN.twice : 0) + passive.twice,
      ...passiveFields(passive),
      voidShare: negativeShare(c),
      godShare: godShareOf(c),
      ringMul: 1,
      ko: neg?.ko ? { ...neg.ko, n: 0 } : null,
      koOpen: 0,
      reach: passive.reach * this.sizeMul,
      poisonproof: passive.poisonproof,
      feast: passive.feast,
      atk: base.atk * (1 + prep.damage + (weapon?.damage ?? 0)) * (hasTrait(c, 'willofd') ? 1 + WILL_DAMAGE : 1) * markHit * (hasTrait(c, 'voidaura') ? 1 + VOID_AURA : 1) * (1 + passive.damage) * chosenHit,
      moveSpeed: base.moveSpeed * (fast ? SPEEDSTER.arenaMove : 1) * (1 + prep.move) * (1 + passive.speed) * markSpeed,
      attackEvery: (base.attackEvery * (fast ? SPEEDSTER.arenaAttack : 1)) / (1 + prep.attack) / markSpeed,
      // Nothing dodges everything.
      dodge: Math.min(0.75, base.dodge + (fast ? SPEEDSTER.arenaDodge : 0) + prep.dodge + passive.dodge + (hasTrait(c, 'ultrainstinct') ? ULTRA_DODGE : 0) + (sees ? OBSERVATION.dodge : 0)),
      cdMul: base.cdMul * (1 - prep.moves) * (hasTrait(c, 'scarleteyes') ? 1 - SCARLET_EYES.moves : 1) * (1 - Math.min(0.6, passive.cooldown)),
      takenMul: (1 - prep.taken) * (1 - passive.taken),
      blackFlash: !!c.powers.technique,
      tuning,
      sharingan: hasTrait(c, 'sharingan'),
      copied: null,
      plan: { stance: c.battle.stance, hurt: c.battle.hurt, target: c.battle.target },
      backOff: 0,
      waited: 0,
      holding: false,
      cdAttack: 0.4 + this.rand() * 0.6,
      abilities,
      stun: 0,
      confuse: 0,
      silence: 0,
      poison: null,
      stand: standDef && { def: standDef, x: x - dir * standGap(size), y: y - 3, dir, rush: null },
      trail: fast ? [] : null,
      trailClock: 0,
      buffs: [],
      target: null,
      alive: true,
      phase: this.rand() * 6,
      deadT: 0,
      damageDone: 0,
    };
  }

  // A monster from the Challenges note. The fight is one on one, so both sides line up across the ring.
  addMonster(def, stats) {
    const [me] = this.fighters;
    const gap = this.r * 0.62;
    me.x = this.cx - gap;
    me.y = this.cy;
    me.dir = 1;
    if (me.stand) {
      me.stand.x = me.x - standGap(me.size);
      me.stand.y = me.y - 3;
      me.stand.dir = 1;
    }
    this.events.forEach((e) => {
      if (e.type === 'menace') {
        e.x = me.x;
        e.y = me.y;
      }
    });
    const abilities = def.moves
      .map((id) => (Object.hasOwn(ABILITIES, id) ? { id, def: ABILITIES[id], cd: 1.5 + this.rand() * 3 } : null))
      .filter(Boolean);
    const maxHp = hpFromStats(stats);
    // A boss can carry a passive of its own (data/adventure.js), and it works like a race's.
    const passive = addPassive(emptyPassive(), def.passive);
    const numbers = combatNumbers(stats);
    const monster = {
      id: this.nextId++,
      team: 1,
      owner: null,
      minion: null,
      c: null,
      monster: def,
      name: def.name,
      x: this.cx + gap,
      y: this.cy,
      dir: -1,
      scale: (def.size / 120) * this.sizeMul,
      size: def.size * 0.22 * this.sizeMul,
      hp: maxHp * (1 + passive.hp),
      maxHp: maxHp * (1 + passive.hp),
      ...numbers,
      atk: numbers.atk * (1 + passive.damage),
      dodge: Math.min(0.75, numbers.dodge + passive.dodge),
      crit: numbers.crit + passive.crit,
      takenMul: 1 - passive.taken,
      poisonproof: passive.poisonproof,
      feast: passive.feast,
      reach: passive.reach * this.sizeMul,
      ...passiveFields(passive),
      ringMul: 1,
      plan: { stance: def.stance ?? 'close', hurt: 'fight', target: 'near' },
      backOff: 0,
      waited: 0,
      holding: false,
      cdAttack: 0.4 + this.rand() * 0.6,
      abilities,
      stun: 0,
      confuse: 0,
      silence: 0,
      poison: null,
      stand: null,
      trail: null,
      trailClock: 0,
      buffs: [],
      target: null,
      alive: true,
      phase: this.rand() * 6,
      deadT: 0,
      damageDone: 0,
    };
    this.fighters.push(monster);
    this.events.push({ type: 'ability', x: monster.x, y: monster.y - def.size * this.sizeMul, name: `${def.name} appears!`, color: '#ff8a7a', loud: true });
    return monster;
  }

  // Two sides across the ring, for village defence: team 0 down the left, everyone else down the
  // right, each side spread out top to bottom.
  lineUp() {
    const sides = [this.fighters.filter((f) => f.team === 0), this.fighters.filter((f) => f.team !== 0)];
    sides.forEach((side, s) => {
      const dir = s === 0 ? 1 : -1;
      const gap = Math.min(70, (this.r * 1.1) / Math.max(1, side.length));
      side.forEach((f, i) => {
        f.x = this.cx - dir * this.r * 0.6;
        f.y = this.cy + (i - (side.length - 1) / 2) * gap;
        f.dir = dir;
        if (f.stand) {
          f.stand.x = f.x - dir * standGap(f.size);
          f.stand.y = f.y - 3;
          f.stand.dir = dir;
        }
      });
    });
    this.events = this.events.filter((e) => e.type !== 'menace');
  }

  makeMinion(owner, kind) {
    const m = MINIONS[kind];
    const a = this.rand() * Math.PI * 2;
    return {
      id: this.nextId++,
      team: owner.team,
      owner: owner.id,
      minion: kind,
      c: null,
      name: m.name,
      x: owner.x + Math.cos(a) * 34,
      y: owner.y + Math.sin(a) * 22,
      dir: owner.dir,
      scale: 1,
      size: m.size,
      hp: Math.max(6, owner.maxHp * m.hp),
      maxHp: Math.max(6, owner.maxHp * m.hp),
      atk: Math.max(1, owner.atk * m.atk),
      // What it was summoned by decides how hard it hits in Chapter ???.
      voidShare: owner.voidShare ?? 0,
      voidGuard: owner.voidGuard ?? 0,
      godShare: owner.godShare ?? 0,
      godGuard: owner.godGuard ?? 0,
      ringMul: owner.ringMul ?? 1,
      def: 0,
      moveSpeed: m.speed,
      attackEvery: 0.9,
      dodge: 0,
      crit: 0,
      cdMul: 1,
      cdAttack: 0.5,
      abilities: [],
      stun: 0,
      confuse: 0,
      silence: 0,
      poison: null,
      stand: null,
      trail: null,
      trailClock: 0,
      buffs: [],
      target: null,
      alive: true,
      phase: 0,
      deadT: 0,
      damageDone: 0,
    };
  }

  buffValue(f, key) {
    return f.buffs.reduce((sum, b) => sum + (b[key] ?? 0), 0);
  }

  enemies(f) {
    return this.fighters.filter((o) => o.alive && o.team !== f.team);
  }

  // Stopped time holds everyone but the team that stopped it, and any Stand able to move in it.
  frozen(f) {
    return this.stopLeft > 0 && f.team !== this.stopTeam && !f.stand?.def.movesInStop;
  }

  // The moment a fight starts, once everyone has lined up: Conqueror's Haki stuns anything weaker,
  // and makes everything else flinch.
  openFight() {
    this.opened = true;
    for (const f of this.fighters) {
      if (!f.haki || !f.alive) continue;
      const cowed = this.enemies(f).filter((o) => !o.minion);
      if (!cowed.length) continue;
      this.events.push({ type: 'ability', x: f.x, y: f.y - 60 * f.scale, name: 'CONQUEROR\'S HAKI', color: TRAITS.haki.color, loud: true });
      this.events.push({ type: 'nova', x: f.x, y: f.y, range: 260, color: TRAITS.haki.color });
      for (const o of cowed) {
        const weaker = o.maxHp < f.maxHp;
        this.stunFor(o, weaker ? HAKI.weaker : HAKI.stronger);
        this.events.push({ type: 'status', x: o.x, y: o.y - 80 * o.scale, text: weaker ? 'overwhelmed' : 'flinched', color: TRAITS.haki.color });
      }
    }
  }

  tick(dt) {
    if (this.done) return;
    if (!this.opened) this.openFight();
    if (this.stopLeft > 0) {
      // The fight's clock is stopped too.
      this.stopLeft -= dt;
      if (this.stopLeft <= 0) {
        this.stopLeft = 0;
        this.events.push({ type: 'status', x: this.cx, y: this.cy - this.r * 0.55, text: 'time flows again', color: '#ffffff' });
      }
    } else {
      this.t += dt;
    }
    if (this.t > SUDDEN_DEATH_AT) {
      // The ring closes in and the poison ground ends any stalemate.
      const k = clamp((this.t - SUDDEN_DEATH_AT) / 50, 0, 1);
      this.r = this.baseR * (1 - k * 0.7);
    }
    for (const f of this.fighters) {
      if (!f.alive) f.deadT += dt;
      else if (!this.frozen(f)) this.tickFighter(f, dt);
    }
    this.tickBolts(dt);
    this.fighters = this.fighters.filter((f) => f.alive || f.minion === null || f.deadT < 0.6);
    this.checkEnd();
  }

  tickFighter(f, dt) {
    f.buffs = f.buffs.filter((b) => (b.left -= dt) > 0);
    f.abilities.forEach((a) => { a.cd -= dt; });
    f.cdAttack -= dt;
    if (f.silence > 0) f.silence -= dt;
    if (f.poison) {
      f.poison.left -= dt;
      this.hurt(f, f.poison.dps * dt, f.poison.from, { silent: true, still: true });
      if (!f.alive) return;
      if (f.poison.left <= 0) f.poison = null;
    }
    if (f.sun && f.hp < f.maxHp) f.hp = Math.min(f.maxHp, f.hp + f.maxHp * SUN_BREATHING * dt);
    if (f.regen && f.hp < f.maxHp) f.hp = Math.min(f.maxHp, f.hp + f.maxHp * f.regen * dt);
    if (f.aura) this.rot(f, dt);
    if (f.nullField) this.tickNullField(f, dt);
    if (!f.alive) return;
    if (f.saiyan === 'ready' && this.t >= SAIYAN.after) this.superSaiyan(f);
    if (f.domain === 'ready' && this.t >= DOMAIN.at) this.openDomain(f);
    this.tickStand(f, dt);
    if (f.trail) this.tickTrail(f, dt);

    const dx = f.x - this.cx;
    const dy = (f.y - this.cy) * 1.35;
    if (this.t > SUDDEN_DEATH_AT && Math.hypot(dx, dy) > this.r) {
      const sting = (3 + (this.t - SUDDEN_DEATH_AT) * 0.25) * (f.ringMul ?? 1);
      this.hurt(f, sting * dt, null, { silent: true });
      if (!f.alive) return;
    }
    if (f.stun > 0) {
      f.stun -= dt;
      return;
    }

    const foes = this.enemies(f);
    if (!foes.length) {
      return;
    }
    if (f.confuse > 0) {
      f.confuse -= dt;
      this.stagger(f, dt);
      return;
    }
    if (!f.target || !f.target.alive || !foes.includes(f.target) || this.rand() < dt * 0.25) {
      f.target = this.chooseTarget(f, foes);
    }
    const target = f.target;
    const tx = target.x - f.x;
    const ty = target.y - f.y;
    const dist = Math.hypot(tx, ty) || 1;
    f.dir = tx >= 0 ? 1 : -1;

    if (this.useAbility(f, target, dist)) return;

    const reach = f.size + target.size + 16 + (f.reach ?? 0);
    const ux = tx / dist;
    const uy = ty / dist;
    f.holding = false;
    const touching = Math.max(reach, (f.size + target.size) * 1.3) * WINDUP_SLACK;
    f.inReach = dist <= touching ? (f.inReach ?? 0) + dt : 0;
    const stance = this.stanceNow(f);
    if (stance === 'mid') this.fightMid(f, target, ux, uy, dist, reach, dt);
    else if (stance === 'bounce') this.fightBounce(f, target, ux, uy, dist, reach, dt);
    else if (stance === 'hold') this.fightHold(f, target, ux, uy, dist, reach, dt);
    else this.fightClose(f, target, ux, uy, dist, reach, dt);
    this.separate(f, dt);
  }

  // ---------- how it moves, from its battle plan ----------

  stanceNow(f) {
    if (!f.plan) return 'close';
    return f.plan.hurt === 'backoff' && lowHealth(f) ? 'mid' : f.plan.stance;
  }

  runSpeed(f) {
    return f.moveSpeed * (f.minion ? 1 : 1 + this.buffValue(f, 'speed'));
  }

  stepToward(f, ux, uy, dist, stopAt, dt) {
    const step = Math.min(dist - stopAt, this.runSpeed(f) * dt);
    if (step <= 0) return;
    f.x += ux * step;
    f.y += uy * step;
  }

  // Backing up is slower than walking in. Near the ring's edge it starts circling instead of
  // backing into the wall, so being cornered takes real work.
  stepBack(f, ux, uy, dt) {
    const step = this.runSpeed(f) * BACKING_SPEED * dt;
    const edge = (Math.hypot(f.x - this.cx, (f.y - this.cy) * 1.35) / this.r - 0.55) / 0.4;
    const turn = clamp(edge, 0, 1);
    // Whichever way around leads back toward the middle of the ring.
    const side = (-uy * (this.cx - f.x) + ux * (this.cy - f.y)) >= 0 ? 1 : -1;
    f.x += (-ux * (1 - turn) - uy * side * turn) * step;
    f.y += (-uy * (1 - turn) + ux * side * turn) * step;
    const dx = f.x - this.cx;
    const dy = (f.y - this.cy) * 1.35;
    const out = Math.hypot(dx, dy) / (this.r * 0.96);
    if (out > 1) {
      f.x = this.cx + dx / out;
      f.y = this.cy + dy / out / 1.35;
    }
  }

  swing(f, target, power = 1) {
    f.cdAttack = f.attackEvery;
    // One Punch: every 10th swing is a Serious Punch, and nothing gets out of the way of it.
    let serious = false;
    if (typeof f.punches === 'number' && ++f.punches >= ONE_PUNCH.every) {
      f.punches = 0;
      serious = true;
      power *= ONE_PUNCH.power;
      this.events.push({ type: 'ability', x: f.x, y: f.y - 70 * f.scale, name: 'SERIOUS PUNCH', color: TRAITS.onepunch.color, loud: true });
    } else if (f.ko && ++f.ko.n >= f.ko.every) {
      // Ko: all of its aura in one fist, and nothing left to guard with for a moment.
      f.ko.n = 0;
      power *= f.ko.power;
      f.koOpen = this.t + KO.open;
      this.events.push({ type: 'ability', x: f.x, y: f.y - 70 * f.scale, name: 'KO', color: '#ffb347', loud: true });
    } else if (f.blackFlash && this.rand() < BLACK_FLASH.chance) {
      power *= BLACK_FLASH.power;
      this.events.push({ type: 'ability', x: f.x, y: f.y - 70 * f.scale, name: 'BLACK FLASH', color: '#ff5a4a', loud: true });
    }
    this.landSwing(f, target, power, serious);
    // Ackerman Blood, and a Fighter's Extra Attack: some swings land twice.
    if (f.twice && target.alive && this.rand() < f.twice) {
      this.events.push({ type: 'status', x: f.x, y: f.y - 76 * f.scale, text: 'again!', color: f.ackerman ? TRAITS.ackerman.color : '#e0e6ef' });
      this.landSwing(f, target, power, serious);
    }
  }

  landSwing(f, target, power, sure) {
    const dealt = this.strike(f, target, power, { sure });
    if (dealt > 0 && f.gourmet) f.hp = Math.min(f.maxHp, f.hp + f.maxHp * GOURMET_HEAL);
    if (dealt > 0 && f.weapon) this.weaponHit(f, target, dealt);
  }

  // A stun or a confusion, unless Will of D. shrugs off the first one it would have taken.
  shrugs(o) {
    if (o.will !== 'ready') return false;
    o.will = 'used';
    this.events.push({ type: 'status', x: o.x, y: o.y - 80 * o.scale, text: 'Will of D.!', color: TRAITS.willofd.color });
    return true;
  }

  // Nothing stuns, confuses or silences an unstoppable one.
  stunFor(o, secs) {
    if (o.unstoppable) return;
    if (secs > o.stun && !this.shrugs(o)) o.stun = secs;
  }

  confuseFor(o, secs) {
    if (o.unstoppable) return;
    if (secs > o.confuse && !this.shrugs(o)) o.confuse = secs;
  }

  silenceFor(o, secs, color) {
    if (o.unstoppable || !o.alive) return;
    o.silence = Math.max(o.silence, secs);
    this.events.push({ type: 'status', x: o.x, y: o.y - 80 * o.scale, text: 'no moves!', color });
  }

  // The Ultimate Life Form, once below 30% health: back to full, and harder hits from then on.
  evolveNow(f) {
    f.evolve = 'used';
    f.hp = f.maxHp;
    f.atk *= 1 + f.evolveDmg;
    f.unstoppable = true;
    this.events.push({ type: 'nova', x: f.x, y: f.y, range: 180, color: '#fff3b0' });
    this.events.push({ type: 'ability', x: f.x, y: f.y - 70 * f.scale, name: 'ULTIMATE LIFE FORM', color: '#fff3b0', loud: true });
  }

  // An extra life: it gets back up with half its health.
  getBackUp(f) {
    f.lives -= 1;
    f.hp = f.maxHp * LIFE_HP;
    this.events.push({ type: 'nova', x: f.x, y: f.y, range: 140, color: '#e0e0ff' });
    this.events.push({ type: 'ability', x: f.x, y: f.y - 70 * f.scale, name: f.monster ? 'IT GETS BACK UP' : 'BACK UP', color: '#e0e0ff', loud: true });
  }

  // Below half its health, it gets angry.
  enrageNow(f) {
    f.enraged = true;
    f.atk *= 1 + f.enrage;
    f.attackEvery /= ENRAGE_SPEED;
    this.events.push({ type: 'ability', x: f.x, y: f.y - 70 * f.scale, name: 'ENRAGED', color: '#ff3a3a', loud: true });
  }

  // Domain Expansion: for a few seconds nothing dodges its hits, and they land harder.
  openDomain(f) {
    f.domain = 'on';
    f.domainUntil = this.t + DOMAIN.lasts;
    this.events.push({ type: 'nova', x: f.x, y: f.y, range: 300, color: TRAITS.domain.color });
    this.events.push({ type: 'ability', x: f.x, y: f.y - 70 * f.scale, name: 'DOMAIN EXPANSION', color: TRAITS.domain.color, loud: true });
  }

  // Eight Inner Gates, below a quarter of its health.
  openGates(f) {
    f.gates = 'on';
    f.atk *= 1 + EIGHT_GATES.damage;
    f.moveSpeed *= 1 + EIGHT_GATES.speed;
    f.attackEvery /= 1 + EIGHT_GATES.speed;
    this.events.push({ type: 'buff', x: f.x, y: f.y - 30 * f.scale, color: TRAITS.eightgates.color });
    this.events.push({ type: 'ability', x: f.x, y: f.y - 70 * f.scale, name: 'EIGHT GATES', color: TRAITS.eightgates.color, loud: true });
  }

  // What its weapon does on top of a swing that landed.
  weaponHit(f, target, dealt) {
    const w = f.weapon;
    if (w.lifesteal) f.hp = Math.min(f.maxHp, f.hp + dealt * w.lifesteal);
    if (!target.alive) return;
    if (w.poison && !target.poisonproof) target.poison = { left: w.poisonFor, dps: f.atk * w.poison, from: f };
    if (w.stunChance && this.rand() < w.stunChance) {
      this.stunFor(target, w.stun);
      this.events.push({ type: 'status', x: target.x, y: target.y - 80 * target.scale, text: 'stunned!', color: w.color });
    }
  }

  // Saiyan Blood, once the fight has gone on long enough.
  superSaiyan(f) {
    f.saiyan = 'on';
    f.atk *= 1 + SAIYAN.damage;
    f.moveSpeed *= 1 + SAIYAN.speed;
    f.attackEvery /= 1 + SAIYAN.speed;
    this.events.push({ type: 'ability', x: f.x, y: f.y - 70 * f.scale, name: 'SUPER SAIYAN', color: TRAITS.saiyan.color, loud: true });
    this.events.push({ type: 'buff', x: f.x, y: f.y - 30 * f.scale, color: TRAITS.saiyan.color });
  }

  // Titan Shifter, below half its health: twice the size, twice the damage, for the rest of the fight.
  titanShift(f) {
    f.titan = 'on';
    f.grow = TITAN.size;
    f.size *= TITAN.size;
    f.scale *= TITAN.size;
    f.atk *= TITAN.damage;
    this.events.push({ type: 'nova', x: f.x, y: f.y, range: 160, color: TRAITS.titanshifter.color });
    this.events.push({ type: 'ability', x: f.x, y: f.y - 70 * f.scale, name: 'TITAN SHIFT', color: TRAITS.titanshifter.color, loud: true });
  }

  // Nine-Tails Chakra: the first knockout doesn't take.
  foxWakes(f) {
    f.fox = 'used';
    f.hp = f.maxHp * NINE_TAILS.hp;
    f.atk *= 1 + NINE_TAILS.damage;
    this.events.push({ type: 'nova', x: f.x, y: f.y, range: 120, color: TRAITS.ninetails.color });
    this.events.push({ type: 'ability', x: f.x, y: f.y - 70 * f.scale, name: 'NINE-TAILS', color: TRAITS.ninetails.color, loud: true });
  }

  // Ready to swing at something in reach, once it has wound up.
  canSwing(f) {
    return f.cdAttack <= 0 && f.inReach >= WINDUP;
  }

  fightClose(f, target, ux, uy, dist, reach, dt) {
    if (dist > reach) this.stepToward(f, ux, uy, dist, reach * 0.8, dt);
    else if (this.canSwing(f)) this.swing(f, target);
  }

  fightMid(f, target, ux, uy, dist, reach, dt) {
    const want = reach + MID_GAP * this.sizeMul;
    if (dist < want - 22) this.stepBack(f, ux, uy, dt);
    else if (dist > want + 22) this.stepToward(f, ux, uy, dist, want, dt);
    if (f.cdAttack > 0) return;
    if (dist <= reach) {
      if (this.canSwing(f)) this.swing(f, target, OFF_BALANCE);
    } else if (dist <= want + 70) {
      f.cdAttack = f.attackEvery;
      this.bolts.push({ x: f.x, y: f.y - 42 * f.scale, tx: target, speed: THROW.speed, def: THROW, from: f, life: 3, t: 0 });
    }
  }

  fightBounce(f, target, ux, uy, dist, reach, dt) {
    if (f.backOff > 0) {
      f.backOff -= dt;
      this.stepBack(f, ux, uy, dt);
      return;
    }
    if (dist > reach) {
      // Waits just out of reach until its next swing is ready.
      if (f.cdAttack > 0.3 && dist < reach + BOUNCE_WAIT_GAP * this.sizeMul) return;
      this.stepToward(f, ux, uy, dist, reach * 0.8, dt);
    } else if (f.cdAttack <= 0) {
      this.swing(f, target);
      f.backOff = BOUNCE_BACK;
    } else if (f.cdAttack > 0.2) {
      // Got caught too close with nothing ready, so it gets out.
      f.backOff = Math.min(BOUNCE_BACK, f.cdAttack);
    }
  }

  fightHold(f, target, ux, uy, dist, reach, dt) {
    if (dist <= reach) {
      f.holding = true;
      f.waited = 0;
      if (this.canSwing(f)) this.swing(f, target, HOLD_HIT);
      return;
    }
    f.waited += dt;
    if (f.waited > HOLD_PATIENCE) this.stepToward(f, ux, uy, dist, reach * 0.8, dt);
    else f.holding = true;
  }

  // A Stand floats just behind its user. During a rush it goes to the target and lands the hits
  // itself, while its user carries on, unless something stops its user.
  tickStand(f, dt) {
    const st = f.stand;
    if (!st) return;
    let hx = f.x - f.dir * standGap(f.size);
    let hy = f.y - 3;
    let speed = 420;
    const { rush } = st;
    if (rush) {
      const t = rush.target;
      if (!t.alive || rush.hits <= 0 || f.stun > 0 || f.confuse > 0) {
        st.rush = null;
      } else {
        const side = t.x >= st.x ? -1 : 1;
        hx = t.x + side * (t.size + 12);
        hy = t.y - 2;
        speed = 1500;
        st.dir = -side;
        if (Math.hypot(st.x - hx, st.y - hy) < 16) {
          rush.clock -= dt;
          if (rush.clock <= 0) {
            rush.clock = rush.every;
            rush.hits--;
            this.strike(f, t, rush.power);
          }
        }
      }
    }
    if (!st.rush) st.dir = f.dir;
    const d = Math.hypot(hx - st.x, hy - st.y);
    if (d > 0.5) {
      const step = Math.min(d, speed * dt);
      st.x += ((hx - st.x) / d) * step;
      st.y += ((hy - st.y) / d) * step;
    }
  }

  // Where a speedster has just been, for its afterimages.
  tickTrail(f, dt) {
    f.trailClock -= dt;
    if (f.trailClock > 0) return;
    f.trailClock = 0.035;
    f.trail.push({ x: f.x, y: f.y, dir: f.dir });
    if (f.trail.length > 5) f.trail.shift();
  }

  stagger(f, dt) {
    f.phase += dt * (1.5 + this.rand() * 3);
    f.x += Math.cos(f.phase) * f.moveSpeed * 0.5 * dt;
    f.y += Math.sin(f.phase * 1.3) * f.moveSpeed * 0.3 * dt;
    if (f.cdAttack <= 0) {
      f.cdAttack = f.attackEvery;
      if (this.rand() < 0.6) {
        this.events.push({ type: 'dodge', x: f.x, y: f.y - 76 * f.scale, text: 'confused!' });
        this.hurt(f, f.atk * 0.8, null);
      }
    }
  }

  chooseTarget(f, foes) {
    let best = foes[0];
    let bestScore = Infinity;
    const goal = f.plan?.target ?? 'near';
    for (const o of foes) {
      const d = Math.hypot(o.x - f.x, o.y - f.y);
      let score = d + (o.hp / o.maxHp) * 120 + (o.minion ? 60 : 0) + this.rand() * 40;
      if (goal === 'weak') score = o.hp + d * 0.02 + (o.minion ? 5000 : 0);
      else if (goal === 'strong') score = -o.hp + d * 0.02 + (o.minion ? 5000 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = o;
      }
    }
    return best;
  }

  separate(f, dt) {
    for (const o of this.fighters) {
      if (o === f || !o.alive) continue;
      const dx = f.x - o.x;
      const dy = f.y - o.y;
      const d = Math.hypot(dx, dy) || 1;
      const min = (f.size + o.size) * 1.3;
      if (d < min) {
        f.x += (dx / d) * (min - d) * dt * 8;
        f.y += (dy / d) * (min - d) * dt * 8;
      }
    }
  }

  // An aura that rots everything on the other side close to it, every second.
  rot(f, dt) {
    for (const o of this.enemies(f)) {
      if (Math.hypot(o.x - f.x, o.y - f.y) <= f.auraRange + o.size) this.hurt(o, f.atk * f.aura * dt, f, { silent: true, still: true });
    }
  }

  // A Null Field: every few seconds, nothing near it can use a move.
  tickNullField(f, dt) {
    f.nullClock -= dt;
    if (f.nullClock > 0) return;
    f.nullClock = NULL_FIELD.every;
    this.events.push({ type: 'nova', x: f.x, y: f.y, range: NULL_FIELD.range, color: '#9a9ab0' });
    for (const o of this.enemies(f)) {
      if (Math.hypot(o.x - f.x, o.y - f.y) <= NULL_FIELD.range + o.size) this.silenceFor(o, f.nullSilence ?? NULL_FIELD.silence, '#9a9ab0');
    }
  }

  useAbility(f, target, dist) {
    if (f.silence > 0) return false;
    for (const a of f.abilities) {
      if (a.cd > 0) continue;
      const d = a.def;
      // A Hatsu sworn to work only when cornered, or never early on.
      if (d.cornered && f.hp / f.maxHp >= 0.5) continue;
      if (d.after && this.t < d.after) continue;
      let use = false;
      if (d.kind === 'heal') use = f.hp / f.maxHp < 0.6;
      // Six Eyes keeps Infinity coming wherever the fight is.
      else if (d.kind === 'buff') use = d.auto || dist < 220;
      else if (d.kind === 'summon') use = this.fighters.filter((o) => o.owner === f.id && o.alive).length < 6;
      // No point stopping time if everyone it would catch can move in it.
      else if (d.kind === 'timestop') use = dist < 400 && this.stopLeft <= 0 && this.enemies(f).some((o) => !o.stand?.def.movesInStop);
      else if (d.kind === 'steal') use = dist <= d.range && target.abilities.length > 0;
      else if (d.kind === 'rush') use = dist <= d.range && !f.stand?.rush;
      else use = dist <= (d.range ?? 200);
      if (!use) continue;
      a.cd = d.auto ? d.cd : d.cd * f.cdMul;
      this.events.push({ type: 'ability', x: f.x, y: f.y - 60 * f.scale, name: d.cry ?? d.name, color: d.color, who: f.id, loud: !!d.loud });
      this.cast(f, target, d);
      // A Twin Soul: sometimes the second soul does it too.
      if (f.echo && d.kind !== 'timestop' && this.rand() < f.echo && target.alive) {
        this.events.push({ type: 'status', x: f.x, y: f.y - 84 * f.scale, text: 'twice!', color: '#ffe14a' });
        this.cast(f, target, d);
      }
      this.afterCast(f, d);
      this.copyMove(f, a);
      return true;
    }
    return false;
  }

  // A Sharingan copies the first move it sees an enemy use, and keeps it for this fight.
  copyMove(user, a) {
    for (const o of this.fighters) {
      if (!o.alive || !o.sharingan || o.copied || o.team === user.team || this.frozen(o)) continue;
      if (o.abilities.some((x) => x.id === a.id)) continue;
      const base = ABILITIES[a.id] ?? a.def;
      const copy = tuneMove(a.id, base, o.tuning);
      o.abilities.push({ id: a.id, def: copy.power ? { ...copy, power: copy.power * SHARINGAN_COPY } : copy, cd: 1.5 });
      o.copied = a.id;
      this.events.push({ type: 'ability', x: o.x, y: o.y - 60 * o.scale, name: 'SHARINGAN', color: '#ff3b30', loud: true });
      this.events.push({ type: 'status', x: o.x, y: o.y - 84 * o.scale, text: `copied ${base.name}`, color: '#ff8a80' });
    }
  }

  // What a move leaves behind on whoever it hit.
  riders(f, o, d) {
    if (d.stun) this.stunFor(o, d.stun);
    if (d.confuse) this.confuseFor(o, d.confuse);
    if (d.silence) this.silenceFor(o, d.silence, d.color);
    if (d.poison && !o.poisonproof) o.poison = { left: d.poisonFor, dps: f.atk * d.poison, from: f };
    if (d.push && o.alive) this.pushAway(f, o, d.push * this.sizeMul);
  }

  // Throws o straight back from f, but never out of the ring.
  pushAway(f, o, dist) {
    const a = Math.atan2(o.y - f.y, o.x - f.x);
    o.x += Math.cos(a) * dist;
    o.y += Math.sin(a) * dist * 0.6;
    const dx = o.x - this.cx;
    const dy = (o.y - this.cy) * 1.35;
    const out = Math.hypot(dx, dy) / (this.r * 0.96);
    if (out > 1) {
      o.x = this.cx + dx / out;
      o.y = this.cy + dy / out / 1.35;
    }
  }

  // What a move costs the one using it. Recoil can't knock out its own user.
  afterCast(f, d) {
    if (d.recoil) {
      f.hp = Math.max(1, f.hp - f.maxHp * d.recoil);
      this.events.push({ type: 'status', x: f.x, y: f.y - 76 * f.scale, text: 'ow, its arm', color: '#ff9c8a' });
    }
    if (d.selfConfuse) f.confuse = Math.max(f.confuse, d.selfConfuse);
    if (d.selfPoison && !f.poisonproof) f.poison = { left: 3, dps: f.atk * d.selfPoison, from: null };
    if (d.selfBuff) f.buffs.push({ ...d.selfBuff });
    // An Alchemy circle's toll: a share of its own attack, gone for the rest of the fight.
    if (d.toll) f.atk *= 1 - d.toll;
  }

  cast(f, target, d) {
    if (d.kind === 'bolt') {
      // A volley is a spread of bolts arriving one after another.
      const count = d.volley ?? 1;
      for (let i = 0; i < count; i++) {
        this.bolts.push({ x: f.x + i * 7 * f.dir, y: f.y - 42 * f.scale - i * 6, tx: target, speed: (d.speed ?? 500) * (1 - i * 0.08), def: d, from: f, life: 3, t: 0 });
      }
    } else if (d.kind === 'cone') {
      this.events.push({ type: 'cone', x: f.x, y: f.y - 40 * f.scale, dir: f.dir, range: d.range, color: d.color });
      for (const o of this.enemies(f)) {
        const dx = o.x - f.x;
        if (Math.hypot(dx, o.y - f.y) <= d.range + o.size && dx * f.dir > -10) {
          this.strike(f, o, d.power, { sure: true, drain: d.drain });
          this.riders(f, o, d);
        }
      }
    } else if (d.kind === 'nova') {
      this.events.push({ type: 'nova', x: f.x, y: f.y, range: d.range, color: d.color });
      for (const o of this.enemies(f)) {
        if (Math.hypot(o.x - f.x, o.y - f.y) <= d.range + o.size) {
          this.strike(f, o, d.power, { sure: true, drain: d.drain });
          this.riders(f, o, d);
        }
      }
    } else if (d.kind === 'rush') {
      // Sends the Stand. A creature that stole this move has no Stand, so it hits once, all at once.
      if (f.stand) f.stand.rush = { target, hits: d.hits, power: d.power, every: d.every, clock: 0 };
      else this.strike(f, target, d.power * d.hits);
    } else if (d.kind === 'timestop') {
      this.stopLeft = d.dur;
      this.stopTeam = f.team;
    } else if (d.kind === 'pull') {
      const side = target.x >= f.x ? 1 : -1;
      target.x = f.x + side * (f.size + target.size + 6);
      target.y = f.y + 2;
      this.strike(f, target, d.power, { sure: true, drain: d.drain });
      this.riders(f, target, d);
    } else if (d.kind === 'bomb') {
      this.fuses.push({ left: d.fuse, target, from: f, def: d });
    } else if (d.kind === 'steal') {
      const [taken] = target.abilities.splice(Math.floor(this.rand() * target.abilities.length), 1);
      if (taken) {
        f.abilities.push({ ...taken, cd: 1 });
        this.events.push({ type: 'status', x: target.x, y: target.y - 80 * target.scale, text: `lost ${taken.def.name}`, color: d.color });
      }
    } else if (d.kind === 'heal') {
      const amt = f.maxHp * d.power;
      f.hp = Math.min(f.maxHp, f.hp + amt);
      this.events.push({ type: 'heal', x: f.x, y: f.y - 50 * f.scale, amt, color: d.color });
      if (d.atk) f.buffs.push({ left: d.dur, atk: d.atk });
    } else if (d.kind === 'buff') {
      f.buffs.push({ left: d.dur, guard: d.guard, atk: d.atk, dodge: d.dodge, crit: d.crit, speed: d.speed, color: d.color });
      this.events.push({ type: 'buff', x: f.x, y: f.y - 30 * f.scale, color: d.color });
    } else if (d.kind === 'summon') {
      for (let i = 0; i < d.count; i++) this.fighters.push(this.makeMinion(f, d.minion));
      this.events.push({ type: 'summon', x: f.x, y: f.y, color: d.color });
    } else if (d.kind === 'dash') {
      this.events.push({ type: 'burrow', x: f.x, y: f.y, color: d.color });
      f.x = target.x - target.dir * (f.size + target.size + 4);
      f.y = target.y + 2;
      this.events.push({ type: 'burrow', x: f.x, y: f.y, color: d.color });
      this.strike(f, target, d.power, { sure: true, drain: d.drain });
      this.riders(f, target, d);
    }
  }

  // Returns the damage it dealt: none if it missed.
  // `drain` heals it for that share of the damage, on top of anything it heals from every hit.
  strike(f, target, power, { sure = false, drain = 0 } = {}) {
    if (!target.alive) return 0;
    // Nothing can dodge in stopped time, or inside a domain. An Event Horizon can dodge even a sure thing.
    const domain = f.domainUntil > this.t;
    const canDodge = (!sure || target.horizon) && !domain && !this.frozen(target);
    const bypassDodge = canDodge && f.weapon?.ignoreDodge && this.rand() < f.weapon.ignoreDodge;
    if (canDodge && !bypassDodge && this.rand() < target.dodge + this.buffValue(target, 'dodge')) {
      this.events.push({ type: 'dodge', x: target.x, y: target.y - 60 * target.scale });
      return 0;
    }
    const crit = this.rand() < f.crit + this.buffValue(f, 'crit');
    let dmg = f.atk * power * (1 + this.buffValue(f, 'atk')) * (0.85 + this.rand() * 0.3);
    if (crit) dmg *= f.critMul ?? 2;
    if (f.plan?.hurt === 'berserk' && lowHealth(f)) dmg *= BERSERK_HIT;
    if (f.weapon?.monster && target.monster) dmg *= 1 + f.weapon.monster;
    if (f.monsterDmg && target.monster) dmg *= 1 + f.monsterDmg;
    if (f.execute && target.hp < target.maxHp * 0.5) dmg *= 1 + f.execute;
    if (f.frenzy) dmg *= 1 + Math.min(FRENZY_CAP, f.frenzyHits * f.frenzy);
    if (domain) dmg *= 1 + DOMAIN.damage;
    const dealt = this.hurt(target, dmg, f, { crit, pierce: f.weapon?.pierce ?? 0 });
    if (dealt > 0) {
      const heal = (f.absorb ?? 0) + drain;
      if (heal > 0 && f.alive) f.hp = Math.min(f.maxHp, f.hp + dealt * heal);
      if (f.frenzy) f.frenzyHits += 1;
      // A curse, or entropy: they keep hurting for a few seconds.
      if (f.decay && target.alive && !target.poisonproof && !(target.poison?.dps > f.atk * f.decay)) {
        target.poison = { left: DECAY_FOR, dps: f.atk * f.decay, from: f };
      }
      // A Chosen of Speed: now and then the hit is necrotic.
      if (f.necro && target.alive && this.rand() < f.necro) this.necrotize(target, dealt);
    }
    return dealt;
  }

  // Necrotic damage comes off its max HP for the rest of the fight, so no healing brings it back,
  // until it has lost CHOSEN.necroCap of the max HP it started with.
  necrotize(target, amt) {
    target.fullHp ??= target.maxHp;
    const floor = target.fullHp * (1 - CHOSEN.necroCap);
    const lost = Math.min(amt, target.maxHp - floor);
    if (lost <= 0) return 0;
    target.maxHp -= lost;
    target.hp = Math.min(target.hp, target.maxHp);
    this.events.push({ type: 'status', x: target.x, y: target.y - 92 * target.scale, text: 'necrotic!', color: '#8fbf5a' });
    return lost;
  }

  // A Chosen of Benevolence: once a fight, you drop a bomb from above on one enemy, and it takes
  // half the health it has left. It is your power, not the Chosen's hit, so nothing guards
  // against it, but the Chosen has to be standing to carry it.
  canBomb(f, target) {
    return f?.bomb === 'ready' && f.alive && !!target?.alive && target.team !== f.team && !this.done;
  }

  dropBomb(f, target) {
    if (!this.canBomb(f, target)) return false;
    f.bomb = 'used';
    this.events.push({ type: 'ability', x: target.x, y: target.y - 70 * target.scale, name: 'DIVINE BOMB', color: CHOSEN_COLOR, loud: true });
    f.damageDone += this.hurt(target, target.hp * CHOSEN.bomb, null, { pure: true, still: true });
    return true;
  }

  // With nobody to click it, a quick fight drops it as it starts, on whoever has the most health.
  autoBombs() {
    for (const f of this.fighters) {
      if (f.bomb !== 'ready') continue;
      const target = this.enemies(f).filter((o) => !o.minion).sort((a, b) => b.hp - a.hp)[0];
      if (target) this.dropBomb(f, target);
    }
  }

  // `still` is for damage over time, which shouldn't shove the target on every tick. Returns the
  // damage it took.
  // `pure` damage skips its guard: it is what a mirror throws back. `pierce` cuts through that share
  // of its Guard.
  hurt(target, raw, from, { crit = false, silent = false, still = false, pure = false, pierce = 0 } = {}) {
    if (!target.alive) return 0;
    const shield = 1 - clamp(this.buffValue(target, 'guard') + (target.holding ? HOLD_GUARD : 0), 0, 0.8);
    const bare = target.plan?.hurt === 'berserk' && lowHealth(target) ? BERSERK_TAKEN : 1;
    let dmg = pure ? raw : raw * (30 / (30 + target.def * (1 - pierce))) * shield * bare * (target.takenMul ?? 1);
    // Just after a Ko, it is wide open.
    if (target.koOpen > this.t) dmg *= KO.openTaken;
    if (target.voidGuard && from) dmg *= voidFactor(from, target.voidGuard);
    if (target.godGuard && from) dmg *= godFactor(from, target.godGuard);
    target.hp -= dmg;
    if (from) from.damageDone += dmg;
    if (from && !still) {
      const a = Math.atan2(target.y - from.y, target.x - from.x);
      target.x += Math.cos(a) * 5;
      target.y += Math.sin(a) * 3;
    }
    if (!silent) this.events.push({ type: 'hit', x: target.x, y: target.y - 44 * target.scale, amt: dmg, crit, color: from?.c ? null : '#fff' });
    // A mirror throws some of it straight back.
    if (target.reflect && from && from !== target && from.alive && !still && !pure && dmg > 0) this.hurt(from, dmg * target.reflect, target, { still: true, pure: true });
    if (target.hp <= 0 && target.fox === 'ready') this.foxWakes(target);
    if (target.hp <= 0 && target.lives > 0) this.getBackUp(target);
    if (target.titan === 'ready' && target.hp > 0 && target.hp < target.maxHp * TITAN.below) this.titanShift(target);
    if (target.gates === 'ready' && target.hp > 0 && target.hp < target.maxHp * EIGHT_GATES.below) this.openGates(target);
    if (target.evolve === 'ready' && target.hp > 0 && target.hp < target.maxHp * EVOLVE_BELOW) this.evolveNow(target);
    if (target.enrage && !target.enraged && target.hp > 0 && target.hp < target.maxHp * ENRAGE_BELOW) this.enrageNow(target);
    if (target.hp <= 0) {
      target.hp = 0;
      target.alive = false;
      target.deadT = 0;
      if (!target.minion) {
        this.events.push({ type: 'ko', x: target.x, y: target.y, name: target.name, by: from?.name ?? 'the ring' });
        // A Devil feeds on every one that falls on the other side.
        for (const o of this.fighters) {
          if (!o.alive || !o.feast || o.team === target.team) continue;
          const amt = Math.min(o.maxHp - o.hp, o.maxHp * o.feast);
          if (amt <= 0) continue;
          o.hp += amt;
          this.events.push({ type: 'heal', x: o.x, y: o.y - 50 * o.scale, amt, color: '#c9302c' });
        }
        for (const o of this.fighters) {
          if (o.owner === target.id) {
            o.alive = false;
          }
        }
      }
    }
    return dmg;
  }

  tickBolts(dt) {
    for (const b of this.bolts) {
      // Anything thrown by someone caught in stopped time hangs in the air.
      if (this.frozen(b.from)) continue;
      b.t += dt;
      b.life -= dt;
      const tx = b.tx.x;
      const ty = b.tx.y - 40 * b.tx.scale;
      const d = Math.hypot(tx - b.x, ty - b.y) || 1;
      const step = b.speed * dt;
      if (d <= step + 8) {
        b.life = 0;
        if (b.tx.alive) {
          this.strike(b.from, b.tx, b.def.power ?? 0.5, { sure: !b.def.dodgeable, drain: b.def.drain });
          this.riders(b.from, b.tx, b.def);
          this.events.push({ type: 'spark', x: b.x, y: b.y, color: b.def.color });
        }
      } else {
        b.x += ((tx - b.x) / d) * step;
        b.y += ((ty - b.y) / d) * step;
      }
    }
    this.bolts = this.bolts.filter((b) => b.life > 0);

    for (const fuse of this.fuses) {
      if (this.frozen(fuse.from)) continue;
      fuse.left -= dt;
      if (fuse.left <= 0 && fuse.target.alive) {
        const { target, def } = fuse;
        this.events.push({ type: 'ability', x: target.x, y: target.y - 80 * target.scale, name: def.boom ?? def.name, color: def.color, loud: true });
        this.strike(fuse.from, target, def.power, { sure: true, drain: def.drain });
        // A Fireball, or a meteor: everything close to where it lands goes up too.
        if (def.splash) {
          this.events.push({ type: 'nova', x: target.x, y: target.y, range: def.splash, color: def.color });
          for (const o of this.enemies(fuse.from)) {
            if (o !== target && Math.hypot(o.x - target.x, o.y - target.y) <= def.splash + o.size) this.strike(fuse.from, o, def.power, { sure: true, drain: def.drain });
          }
        }
      }
    }
    this.fuses = this.fuses.filter((fuse) => fuse.left > 0);
  }

  checkEnd() {
    const teams = new Set(this.fighters.filter((f) => f.alive && !f.minion).map((f) => f.team));
    if (teams.size <= 1 || this.t > MAX_TIME) {
      this.done = true;
      const living = this.fighters.filter((f) => f.alive && !f.minion);
      living.sort((a, b) => b.hp / b.maxHp - a.hp / a.maxHp);
      // A double knockout goes to whoever did more damage.
      const best = this.fighters.filter((f) => !f.minion).sort((a, b) => b.damageDone - a.damageDone)[0];
      this.winner = living[0] ?? best ?? null;
      if (this.winner) {
        this.events.push({ type: 'win', name: this.winner.name });
      }
    }
  }

  drainEvents() {
    const e = this.events;
    this.events = [];
    return e;
  }
}

// Plays a set-up bout through to the end with no drawing.
export function finishBout(bout) {
  bout.autoBombs();
  let guard = 0;
  while (!bout.done && guard++ < 20000) {
    bout.tick(1 / 30);
    bout.events.length = 0;
  }
  return bout;
}

// Fights a whole bout with no drawing. Used by tests and the balance check.
export const runBout = (creatures, seed = 1) => finishBout(new Bout(creatures, { seed }));
