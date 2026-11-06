// The Challenges note: training monsters that can't kill it, deadly ones that can, the Legendary
// road, and the ultimate monsters. Beating a monster is the only way to get a Legendary mutation.

import { toast } from './flair.js';
import { clamp } from '../lib/util.js';
import { G, api, saveCreature, memberOf, creatureText } from '../state.js';
import { h, fill, button, openNote, closeNote, getNote, folds } from './notes.js';
import { parseCreature, serializeCreature, computeStats, soulCap, STAT_LABELS, TRAINING_LIMIT, pathTitle, stageOf } from '../core/creature.js';
import {
  startChallenge, payForFight, settleChallenge, wonChallenge, fightProblem, trainingFull, oddsOfWinning, monsterDef, isDeadly, beatenAlready,
  takeSoulOffer, keepSoul, swapsFor, ultimateStrength,
} from '../sim/challenges.js';
import {
  TRAINING_MONSTERS, TRAINING_IDS, DEADLY_MONSTERS, DEADLY_IDS, LEGEND_IDS, ULTIMATE_IDS, LEGEND_WINS_FOR_ULTIMATE, TRAINING_CHANCE, TROPHY_POINTS, REBORN,
} from '../data/monsters.js';
import { dropRig, hasArt, artUrl } from '../draw/art.js';
import { forgetFighter } from './boards.js';
import { coachRow } from './plan.js';
import { useUpPrep } from '../core/craft.js';
import { ultimateWinsLeft, rebornLeft, canBeReborn, timesReborn } from '../core/reborn.js';
import { LEGENDARY } from '../data/powers.js';
import { openReborn } from './reborn.js';

const CLEAR_RING_AFTER = 2600;

const picture = (id) => hasArt(`monsters/${id}.png`) && h('img', { class: 'monsterpic', src: artUrl(`monsters/${id}.png`), alt: '' });

// A smaller ring than the arena's, right where the creature is standing.
function ringNearPet() {
  const { work } = G.screen;
  const r = clamp(Math.min(work.h * 0.3, work.w * 0.2), 130, 240);
  return {
    cx: clamp(G.pet.x, work.x + r * 1.15, work.x + work.w - r * 1.15),
    cy: clamp(G.pet.y - r * 0.2, work.y + r + 40, work.y + work.h - r * 0.8),
    r,
  };
}

function begin(id, note) {
  const c = G.creature;
  const pet = G.pet;
  if (!c || !pet) return;
  if (G.bout) {
    note.spec.message = 'Finish the fight that is already on.';
    note.rebuild();
    return;
  }
  if (pet.kind === 'work') {
    note.spec.message = 'It is busy mining. Stop that first.';
    note.rebuild();
    return;
  }
  const problem = fightProblem(c, id);
  if (problem) {
    pet.say(problem, 3, true);
    note.spec.message = `It says: ${problem}.`;
    note.rebuild();
    return;
  }
  note.spec.message = '';
  note.spec.result = null;
  payForFight(c, id);
  saveCreature();
  // The fight belongs to this creature, even if you go and look after another one meanwhile.
  G.challenge = { id, cid: c.id };
  G.bout = startChallenge(c, id, { seed: Math.floor(Math.random() * 2 ** 31), ...ringNearPet(), sizeMul: G.settings.scale ?? 1 });
  useUpPrep(c);
  saveCreature();
  G.boutHide = new Set([c.id]);
  pet.interrupt();
  note.rebuild();
}

function endFight() {
  G.bout = null;
  G.boutHide = new Set();
  G.challenge = null;
}

// Called by the game loop when a challenge fight finishes. Its own creature comes back into view,
// with its notes, so the result shows where you expect it.
export function onChallengeEnded(bout) {
  const { id, cid } = G.challenge;
  const m = G.team.find((x) => x.c.id === cid);
  if (!m) {
    endFight();
    return;
  }
  G.lookAfter(m.c);
  const { c } = m;
  const result = settleChallenge(c, id, wonChallenge(bout));
  if (result.died) {
    die(c, result.def, bout);
    return;
  }
  if (result.legendary || result.offer) {
    const { name, color } = LEGENDARY[result.legendary || result.offer];
    G.fx.shout(bout.cx, bout.cy - bout.r * 0.6, `LEGENDARY MUTATION: ${name}${result.offer ? '?' : ''}`, color, 24, 4);
    toast(result.offer ? `${c.name.toUpperCase()} WON A ${name.toUpperCase()}! KEEP ITS OLD ONE OR TAKE THIS?` : `LEGENDARY MUTATION: ${name}!!!`, 'rare');
  }
  if (result.opened) toast('THE ULTIMATE MONSTERS HAVE COME OUT!', 'rare');
  if (result.won && result.def.ultimate && canBeReborn(c)) toast(`${c.name.toUpperCase()} BEAT EVERY ULTIMATE MONSTER! IT CAN BE REBORN!!!`, 'rare');
  dropRig(c);
  saveCreature();
  G.onCreatureChanged?.();
  setTimeout(() => {
    if (G.bout === bout) endFight();
    getNote('challenges')?.rebuild();
    getNote('ultimates')?.rebuild();
  }, CLEAR_RING_AFTER);
  const note = getNote('challenges');
  if (note) {
    note.spec.result = result;
    note.rebuild();
  } else {
    openChallenges(result);
  }
}

// Forever. The creature comes off the screen, and its file becomes a gravestone.
async function die(c, def, bout) {
  const { base } = memberOf(c);
  // Nothing can save over it from here on, so the file can't come back after the move.
  G.lose(c);
  G.drops = [];
  G.veins = G.veins.filter((v) => v.pet?.c !== c);
  forgetFighter(c.id);
  G.fx.shout(bout.cx, bout.cy - bout.r * 0.5, `${c.name} is gone.`, '#ff6b5e', 28, 4);
  toast(`${c.name.toUpperCase()} IS GONE FOREVER...`, 'bad');
  await api.buryCreature(base, creatureText(c));
  setTimeout(() => {
    if (G.bout === bout) endFight();
  }, CLEAR_RING_AFTER * 2);
  openFarewell(c, def, bout);
}

async function openFarewell(c, def, bout) {
  const rows = [];
  for (const f of await api.listCreatures()) {
    try {
      // Whoever is still out is shown as it is right now.
      const other = G.team.find((m) => m.base === f.base)?.c ?? parseCreature(f.text);
      if (!other.dead) rows.push({ base: f.base, c: other });
    } catch { /* an unreadable file just gets left out of the list */ }
  }
  // Those still out come first.
  rows.sort((a, b) => !!memberOf(b.c) - !!memberOf(a.c));
  let chosen = false;
  // Choosing what happens next clears the ring straight away.
  const clear = () => {
    if (G.bout === bout) endFight();
  };
  const raise = async (row) => {
    chosen = true;
    clear();
    closeNote('farewell');
    await G.bringOut(row.base, row.c);
  };
  const egg = () => {
    chosen = true;
    clear();
    closeNote('farewell');
    G.newEgg?.();
  };
  openNote('farewell', {
    title: `${c.name} is gone`,
    width: 320,
    // Closing this can't leave you with nothing on screen and no way to get anything back.
    onClose: () => {
      if (chosen) return;
      if (rows.length) raise(rows[0]);
      else egg();
    },
    build(body) {
      fill(body,
        h('p', { style: 'margin:0 0 6px' }, `Killed by ${def.name}. It was a ${stageOf(c).name}, ${pathTitle(c)}.`),
        h('div', { class: 'small' }, 'Its gravestone is in the Creatures note, and the game will never bring it back.'),
        h('div', { class: 'row gap' },
          button('Hatch a new egg', egg, 'big hot'),
          rows.map((row) => button(`Raise ${row.c.name}`, () => raise(row), 'big'))),
      );
    },
  });
}

function trainingRow(id, note) {
  const c = G.creature;
  const m = TRAINING_MONSTERS[id];
  const have = Math.floor(c.training[m.stat] ?? 0);
  const full = trainingFull(c, m.stat);
  return h('div', { class: 'monster' },
    picture(id),
    h('div', { class: 'grow' },
      h('div', { class: 'name' }, m.name),
      h('div', { class: 'small' }, full
        ? `${STAT_LABELS[m.stat]} training is full, at +${TRAINING_LIMIT}.`
        : `Trains ${STAT_LABELS[m.stat]}, now +${Math.min(have, TRAINING_LIMIT)} of +${TRAINING_LIMIT}.`)),
    button('Spawn', () => begin(id, note), '', full));
}

// The Legendary mutation a monster gives, and what winning it would mean for this creature.
function soulPrize(c, id) {
  const soul = LEGENDARY[id];
  const name = h('b', { style: `color:${soul.color}`, title: soul.blurb }, soul.name);
  if (c.souls.includes(id)) return ['Legendary mutation: ', name, ', which it already has.'];
  if (c.souls.length < soulCap(c)) return ['Legendary mutation: ', name, '.'];
  if (!swapsFor(c, id).length) return ['Legendary mutation: ', name, ', but it has no room, and giving one up for it would cost it a power.'];
  return ['Legendary mutation: ', name, `. It has no room for another: win, and you choose whether to give one up for it.`];
}

function prizeLine(c, m) {
  return [
    m.trophy && `Trophy: +${TROPHY_POINTS} ${STAT_LABELS[m.trophy]}, and +${TROPHY_POINTS} to its limit.${m.soul ? ' ' : ''}`,
    m.soul && soulPrize(c, m.soul),
  ];
}

function deadlyRow(id, note) {
  const c = G.creature;
  const m = DEADLY_MONSTERS[id];
  const beaten = beatenAlready(c, id);
  const line = h('div', { class: 'small' }, m.blurb);
  // Forever is a long time: the first press plays it out on copies and tells you the odds, the
  // second press means it, and moving away calls it off.
  let armed = false;
  const go = button('Spawn', () => {
    if (!armed) {
      armed = true;
      const odds = Math.round(oddsOfWinning(c, id) * 10);
      line.textContent = `It wins about ${odds} in 10. If it loses, ${c.name} dies forever.`;
      line.classList.add('warning');
      go.textContent = 'Fight';
      go.classList.add('hot');
      return;
    }
    begin(id, note);
  }, '', beaten);
  go.addEventListener('mouseleave', () => {
    armed = false;
    line.textContent = m.blurb;
    line.classList.remove('warning');
    go.textContent = 'Spawn';
    go.classList.remove('hot');
  });
  return h('div', { class: `monster ${beaten ? 'beaten' : ''}` },
    picture(id),
    h('div', { class: 'grow' },
      h('div', { class: 'name' }, m.name),
      line,
      h('div', { class: 'small' }, beaten ? (m.trophy ? 'Beaten. It has this trophy.' : 'Beaten.') : prizeLine(c, m))),
    beaten ? h('span', { class: 'small' }, 'Beaten') : go);
}

// Each road folds, so only the one you are looking at is open.
function buildList(body, note) {
  const c = G.creature;
  const beaten = (ids) => ids.filter((id) => beatenAlready(c, id)).length;
  const progress = (ids) => (beaten(ids) === ids.length ? 'all beaten' : `${beaten(ids)} of ${ids.length} beaten`);
  fill(body,
    note.spec.message && h('div', { class: 'warning' }, note.spec.message),
    offerBox(note),
    folds(note, 'roads', [
      {
        id: 'training',
        title: 'Training',
        tag: 'can\'t kill it',
        build: () => [
          h('div', { class: 'small' }, `Each win has a ${Math.round(TRAINING_CHANCE * 100)}% chance of +1 to their stat. They match its strength, and every fight burns a little fullness.`),
          h('div', { class: 'monsters' }, TRAINING_IDS.map((id) => trainingRow(id, note))),
        ],
      },
      {
        id: 'deadly',
        title: 'To the death',
        tag: progress(DEADLY_IDS),
        build: () => [
          h('div', { class: 'warning' }, 'If it loses, it dies forever.'),
          h('div', { class: 'small' }, 'A trophy is the only way past a stat limit. Each monster only gives one, and Old Rex and The Last Dragon give a Legendary mutation too.'),
          h('div', { class: 'monsters tall' }, DEADLY_IDS.map((id) => deadlyRow(id, note))),
        ],
      },
      {
        id: 'legend',
        title: 'Legendary road',
        tag: progress(LEGEND_IDS),
        build: () => [
          h('div', { class: 'warning' }, 'Also to the death.'),
          h('div', { class: 'small' }, `No trophies here: each gives a Legendary mutation and nothing else. Win any ${LEGEND_WINS_FOR_ULTIMATE} and the ultimate monsters come out.`),
          h('div', { class: 'monsters tall' }, LEGEND_IDS.map((id) => deadlyRow(id, note))),
        ],
      },
    ]),
    ultimateLink(),
  );
}

const rebornTitle = (c) => (timesReborn(c) ? `Ultimate road (reborn ${timesReborn(c)} time${timesReborn(c) === 1 ? '' : 's'})` : 'Ultimate road');

// The road is long, so the ultimate monsters have a note of their own, opened beside this one.
function ultimateLink() {
  const c = G.creature;
  const locked = ultimateWinsLeft(c);
  return h('div', { class: 'mega' },
    h('div', { class: 'row nowrap' },
      h('div', { class: 'grow' },
        h('div', { class: 'hand', style: 'font-weight:700' }, rebornTitle(c)),
        h('div', { class: 'small' }, locked
          ? `${ULTIMATE_IDS.length} ultimate monsters come out once it has won ${LEGEND_WINS_FOR_ULTIMATE} on the Legendary road, ${locked} to go.`
          : `Open: ${ULTIMATE_IDS.length - rebornLeft(c).length} of ${ULTIMATE_IDS.length} beaten. Beat them all and it can be reborn.`)),
      button('Open', () => openUltimates(), locked ? '' : 'hot')));
}

export function openUltimates() {
  if (!G.creature) return;
  const width = 340;
  const beside = getNote('challenges');
  const at = beside && !beside.buried ? { x: beside.el.offsetLeft - width - 10, y: beside.el.offsetTop } : null;
  openNote('ultimates', {
    title: 'Ultimate road',
    cls: 'chalk',
    help: 'chances',
    width,
    ...(at ? { at } : { corner: 'right' }),
    message: '',
    build(body, note) {
      if (G.challenge && G.bout && G.challenge.cid === G.creature?.id && DEADLY_MONSTERS[G.challenge.id]?.ultimate) buildFight(body, note);
      else buildUltimates(body, note);
    },
    tick(note) {
      if (G.challenge && G.bout && note.refs.clock) note.refs.clock.textContent = `${Math.floor(G.bout.t)}s`;
    },
  });
}

// The ultimate monsters, once it has won enough on the Legendary road, and being reborn once they
// are all beaten too.
function buildUltimates(body, note) {
  const c = G.creature;
  const locked = ultimateWinsLeft(c);
  const head = h('div', { class: 'sect', style: 'margin-top:0' }, rebornTitle(c));
  if (locked) {
    fill(body, head, h('div', { class: 'small' }, `${ULTIMATE_IDS.length} ultimate monsters come out once it has won ${LEGEND_WINS_FOR_ULTIMATE} fights on the Legendary road, ${locked} to go. Beat them all and it can be reborn.`));
    return;
  }
  const left = rebornLeft(c).length;
  fill(body,
    note.spec.message && h('div', { class: 'warning' }, note.spec.message),
    head,
    h('div', { class: 'warning' }, 'Still to the death.'),
    h('div', { class: 'small' }, timesReborn(c)
      ? `Reborn ${timesReborn(c)} time${timesReborn(c) === 1 ? '' : 's'}: every ultimate monster is ${ultimateStrength(c).toFixed(2)} times as strong for it, in health and in hits. Each rebirth makes them ${REBORN.harder} times stronger again.`
      : `Each time it is reborn, every ultimate monster comes back ${REBORN.harder} times as strong for it, and again the time after.`),
    h('div', { class: 'monsters tall' }, ULTIMATE_IDS.map((id) => deadlyRow(id, note))),
    h('div', { class: 'mega' },
      h('div', { class: 'row nowrap' },
        h('div', { class: 'grow' },
          h('div', { class: 'hand', style: 'font-weight:700' }, 'Be reborn'),
          h('div', { class: 'small' }, `It absorbs one of your creatures and takes up to ${REBORN.takes} of its gifts, then starts over as a Hatchling with nothing but its gifts.`)),
        button('Be reborn', () => openReborn(), 'hot', !canBeReborn(c) || !!G.bout)),
      left > 0 && h('div', { class: 'small' }, `Beat every ultimate monster first, ${left} to go.`)),
  );
}

function buildFight(body, note) {
  const { id } = G.challenge;
  const def = monsterDef(id);
  const deadly = isDeadly(id);
  note.refs.clock = h('span', { class: 'small' }, '');
  fill(body,
    h('div', { class: 'row nowrap' },
      picture(id),
      h('div', { class: 'grow hand' }, `${G.bout.fighters[0].name} against ${def.name}`),
      note.refs.clock),
    coachRow(note),
    deadly
      ? h('div', { class: 'warning' }, 'There is no running. It wins or it dies.')
      : h('div', { class: 'row gap' }, button('Run away', () => {
        endFight();
        note.rebuild();
      }, 'big')),
  );
}

function soulLine({ legendary, offer, noFit }) {
  if (legendary) return ` It grew a Legendary mutation, ${LEGENDARY[legendary].name}. ${LEGENDARY[legendary].blurb}`;
  if (offer) return ` It won a ${LEGENDARY[offer].name}, but it has no room for another Legendary mutation.`;
  if (noFit) return ` No ${LEGENDARY[noFit].name} for it, though: it has no room, and giving one up for it would cost it a power.`;
  return '';
}

// A Legendary mutation it won with no room left for it: give one up for it, or keep what it has.
function offerBox(note) {
  const c = G.creature;
  if (!c?.soulOffer) return null;
  const won = LEGENDARY[c.soulOffer];
  const room = c.souls.length < soulCap(c);
  const swaps = swapsFor(c, c.soulOffer);
  const done = () => {
    dropRig(c);
    saveCreature();
    G.onCreatureChanged?.();
    note.rebuild();
  };
  const take = (old) => {
    if (!takeSoulOffer(c, old)) return;
    toast(`LEGENDARY MUTATION: ${won.name}!!!`, 'rare');
    done();
  };
  return h('div', { class: 'callout' },
    h('div', null, h('b', null, `It won a ${won.name}. `), room ? 'It has room for it now.' : `It holds ${c.souls.length}, all it has room for. Give one up for it, or keep what it has?`),
    h('div', { class: 'small', style: 'margin-top:3px' }, h('b', { style: `color:${won.color}` }, `${won.name}: `), won.blurb),
    !room && !swaps.length && h('div', { class: 'warning' }, `Giving up any of them for a ${won.name} would cost it a power.`),
    h('div', { class: 'row gap' },
      room
        ? button(`Take the ${won.name}`, () => take(null), 'big hot')
        : c.souls.map((old) => button(`Give up ${LEGENDARY[old].name}`, () => take(old), 'big hot', !swaps.includes(old))),
      button('Keep what it has', () => {
        keepSoul(c);
        done();
      }, 'big')));
}

function resultLine(result, c) {
  const { def, won, deadly, trained, trophy } = result;
  if (!won) return `${def.name} won. It limps home with nothing but a sore everything.`;
  if (deadly) {
    const next = def.ultimate && canBeReborn(c) ? ' It has beaten every ultimate monster: it can be reborn now.'
      : result.opened ? ` That makes ${LEGEND_WINS_FOR_ULTIMATE} on the Legendary road, so the ultimate monsters have come out.` : '';
    const won = trophy ? `It beat ${def.name}! Trophy: ${STAT_LABELS[trophy]} is now ${computeStats(c)[trophy]}, and its limit went up by ${TROPHY_POINTS}.` : `It beat ${def.name}!`;
    return `${won}${soulLine(result)}${next}`;
  }
  if (trained) return `It won, and learned something: +1 ${STAT_LABELS[trained]}.`;
  return `It won, but learned nothing this time.`;
}

function buildResult(body, note) {
  const c = G.creature;
  const { result } = note.spec;
  fill(body,
    h('div', { class: 'row nowrap' },
      picture(result.def.id),
      h('div', { class: 'grow hand' }, result.won ? 'Won!' : 'Lost.')),
    h('p', { style: 'margin:5px 0 0' }, resultLine(result, c)),
    offerBox(note),
    h('div', { class: 'row gap' },
      !result.deadly && button('Again', () => {
        if (G.bout?.done) endFight();
        begin(result.def.id, note);
      }, 'big hot', trainingFull(c, result.def.stat)),
      button('All challenges', () => {
        if (G.bout?.done) endFight();
        note.spec.result = null;
        note.rebuild();
      }, 'big')),
  );
}

export function openChallenges(result = null) {
  if (!G.creature) return;
  openNote('challenges', {
    title: 'Challenges',
    cls: 'chalk',
    help: 'chances',
    width: 352,
    corner: 'right',
    result,
    message: '',
    build(body, note) {
      if (note.spec.result) buildResult(body, note);
      else if (G.challenge && G.bout) buildFight(body, note);
      else buildList(body, note);
    },
    tick(note) {
      if (G.challenge && G.bout && note.refs.clock) note.refs.clock.textContent = `${Math.floor(G.bout.t)}s`;
    },
  });
}
