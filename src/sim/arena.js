// The arena fight. A pure simulation: tick(dt) moves everything and pushes events
// (hits, KOs, fx) for the renderer. Also runs headless so balance can be tested.

import { clamp, makeRng } from '../lib/util.js';
import { computeStats, abilitiesOf, stageOf, maxHpOf, hpFromStats, hasTrait, raceSize } from '../core/creature.js';
import { tuningOf } from '../core/sheet.js';
import { ABILITIES } from '../data/paths.js';
import {
  STANDS, SPEEDSTER, BLACK_FLASH, SHARINGAN_COPY, tuneMove, TRAITS, TITAN, SAIYAN, HAKI, SUN_BREATHING, NINE_TAILS, ONE_PUNCH,
} from '../data/powers.js';
import { WEAPONS } from '../data/forge.js';
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

// What a set of stats means in a fight, for creatures and monsters alike.
function combatNumbers(s) {
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
      const f = this.makeFighter(c, cx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.62, i);
      this.fighters.push(f);
      if (f.stand) this.events.push({ type: 'menace', x: f.x, y: f.y, color: f.stand.def.color });
    });
  }

  makeFighter(c, x, y, team) {
    const s = computeStats(c);
    const stage = stageOf(c);
    const tuning = tuningOf(c);
    const abilities = abilitiesOf(c)
      .filter((id) => !c.battle.off.includes(id))
      .map((id) => (Object.hasOwn(ABILITIES, id) ? { id, def: tuneMove(id, ABILITIES[id], tuning), cd: 1.5 + this.rand() * 3 } : null))
      .filter(Boolean);
    const prep = prepEffects(c);
    const maxHp = maxHpOf(c, s) * (1 + prep.hp);
    const dir = x < this.cx ? 1 : -1;
    const size = 26 * stage.scale * this.sizeMul * raceSize(c);
    const fast = c.powers.speedster;
    const standDef = c.powers.stand ? STANDS[c.powers.stand] : null;
    const base = combatNumbers(s);
    const weapon = c.weapon && Object.hasOwn(WEAPONS, c.weapon) ? WEAPONS[c.weapon] : null;
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
      crit: base.crit + (weapon?.crit ?? 0),
      weapon,
      // Born-with gifts that change a fight. 'ready' turns to 'on' or 'used' once it happens.
      titan: hasTrait(c, 'titanshifter') ? 'ready' : null,
      saiyan: hasTrait(c, 'saiyan') ? 'ready' : null,
      haki: hasTrait(c, 'haki'),
      sun: hasTrait(c, 'sunbreathing'),
      fox: hasTrait(c, 'ninetails') ? 'ready' : null,
      punches: hasTrait(c, 'onepunch') ? 0 : null,
      atk: base.atk * (1 + prep.damage + (weapon?.damage ?? 0)),
      moveSpeed: base.moveSpeed * (fast ? SPEEDSTER.arenaMove : 1) * (1 + prep.move),
      attackEvery: (base.attackEvery * (fast ? SPEEDSTER.arenaAttack : 1)) / (1 + prep.attack),
      dodge: base.dodge + (fast ? SPEEDSTER.arenaDodge : 0) + prep.dodge,
      cdMul: base.cdMul * (1 - prep.moves),
      takenMul: 1 - prep.taken,
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
      hp: maxHp,
      maxHp,
      ...combatNumbers(stats),
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
        o.stun = Math.max(o.stun, weaker ? HAKI.weaker : HAKI.stronger);
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
    if (f.saiyan === 'ready' && this.t >= SAIYAN.after) this.superSaiyan(f);
    this.tickStand(f, dt);
    if (f.trail) this.tickTrail(f, dt);

    const dx = f.x - this.cx;
    const dy = (f.y - this.cy) * 1.35;
    if (this.t > SUDDEN_DEATH_AT && Math.hypot(dx, dy) > this.r) {
      const sting = 3 + (this.t - SUDDEN_DEATH_AT) * 0.25;
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

    const reach = f.size + target.size + 16;
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
    } else if (f.blackFlash && this.rand() < BLACK_FLASH.chance) {
      power *= BLACK_FLASH.power;
      this.events.push({ type: 'ability', x: f.x, y: f.y - 70 * f.scale, name: 'BLACK FLASH', color: '#ff5a4a', loud: true });
    }
    const dealt = this.strike(f, target, power, { sure: serious });
    if (dealt > 0 && f.weapon) this.weaponHit(f, target, dealt);
  }

  // What its weapon does on top of a swing that landed.
  weaponHit(f, target, dealt) {
    const w = f.weapon;
    if (w.lifesteal) f.hp = Math.min(f.maxHp, f.hp + dealt * w.lifesteal);
    if (!target.alive) return;
    if (w.poison) target.poison = { left: w.poisonFor, dps: f.atk * w.poison, from: f };
    if (w.stunChance && this.rand() < w.stunChance) {
      target.stun = Math.max(target.stun, w.stun);
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

  useAbility(f, target, dist) {
    if (f.silence > 0) return false;
    for (const a of f.abilities) {
      if (a.cd > 0) continue;
      const d = a.def;
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
    if (d.stun) o.stun = Math.max(o.stun, d.stun);
    if (d.confuse) o.confuse = Math.max(o.confuse, d.confuse);
    if (d.silence) {
      o.silence = Math.max(o.silence, d.silence);
      this.events.push({ type: 'status', x: o.x, y: o.y - 80 * o.scale, text: 'no moves!', color: d.color });
    }
    if (d.poison) o.poison = { left: d.poisonFor, dps: f.atk * d.poison, from: f };
  }

  // What a move costs the one using it. Recoil can't knock out its own user.
  afterCast(f, d) {
    if (d.recoil) {
      f.hp = Math.max(1, f.hp - f.maxHp * d.recoil);
      this.events.push({ type: 'status', x: f.x, y: f.y - 76 * f.scale, text: 'ow, its arm', color: '#ff9c8a' });
    }
    if (d.selfConfuse) f.confuse = Math.max(f.confuse, d.selfConfuse);
    if (d.selfPoison) f.poison = { left: 3, dps: f.atk * d.selfPoison, from: null };
    if (d.selfBuff) f.buffs.push({ ...d.selfBuff });
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
          this.strike(f, o, d.power, { sure: true });
          this.riders(f, o, d);
        }
      }
    } else if (d.kind === 'nova') {
      this.events.push({ type: 'nova', x: f.x, y: f.y, range: d.range, color: d.color });
      for (const o of this.enemies(f)) {
        if (Math.hypot(o.x - f.x, o.y - f.y) <= d.range + o.size) {
          this.strike(f, o, d.power, { sure: true });
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
      this.strike(f, target, d.power, { sure: true });
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
      this.strike(f, target, d.power, { sure: true });
      this.riders(f, target, d);
    }
  }

  // Returns the damage it dealt: none if it missed.
  strike(f, target, power, { sure = false } = {}) {
    if (!target.alive) return 0;
    // Nothing can dodge in stopped time.
    if (!sure && !this.frozen(target) && this.rand() < target.dodge + this.buffValue(target, 'dodge')) {
      this.events.push({ type: 'dodge', x: target.x, y: target.y - 60 * target.scale });
      return 0;
    }
    const crit = this.rand() < f.crit + this.buffValue(f, 'crit');
    let dmg = f.atk * power * (1 + this.buffValue(f, 'atk')) * (0.85 + this.rand() * 0.3);
    if (crit) dmg *= 2;
    if (f.plan?.hurt === 'berserk' && lowHealth(f)) dmg *= BERSERK_HIT;
    if (f.weapon?.monster && target.monster) dmg *= 1 + f.weapon.monster;
    return this.hurt(target, dmg, f, { crit });
  }

  // `still` is for damage over time, which shouldn't shove the target on every tick. Returns the
  // damage it took.
  hurt(target, raw, from, { crit = false, silent = false, still = false } = {}) {
    const shield = 1 - clamp(this.buffValue(target, 'guard') + (target.holding ? HOLD_GUARD : 0), 0, 0.8);
    const bare = target.plan?.hurt === 'berserk' && lowHealth(target) ? BERSERK_TAKEN : 1;
    const dmg = raw * (30 / (30 + target.def)) * shield * bare * (target.takenMul ?? 1);
    target.hp -= dmg;
    if (from) from.damageDone += dmg;
    if (from && !still) {
      const a = Math.atan2(target.y - from.y, target.x - from.x);
      target.x += Math.cos(a) * 5;
      target.y += Math.sin(a) * 3;
    }
    if (!silent) this.events.push({ type: 'hit', x: target.x, y: target.y - 44 * target.scale, amt: dmg, crit, color: from?.c ? null : '#fff' });
    if (target.hp <= 0 && target.fox === 'ready') this.foxWakes(target);
    if (target.titan === 'ready' && target.hp > 0 && target.hp < target.maxHp * TITAN.below) this.titanShift(target);
    if (target.hp <= 0) {
      target.hp = 0;
      target.alive = false;
      target.deadT = 0;
      if (!target.minion) {
        this.events.push({ type: 'ko', x: target.x, y: target.y, name: target.name, by: from?.name ?? 'the ring' });
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
          this.strike(b.from, b.tx, b.def.power ?? 0.5, { sure: !b.def.dodgeable });
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
        this.strike(fuse.from, target, def.power, { sure: true });
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
  let guard = 0;
  while (!bout.done && guard++ < 20000) {
    bout.tick(1 / 30);
    bout.events.length = 0;
  }
  return bout;
}

// Fights a whole bout with no drawing. Used by tests and the balance check.
export const runBout = (creatures, seed = 1) => finishBout(new Bout(creatures, { seed }));
