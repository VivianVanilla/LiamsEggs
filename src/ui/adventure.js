// Adventure: pick three of your creatures and fight your way through 20 levels, one ring at a time
// on your screen. Every fifth level a deadly monster leads the enemy. Nobody can die here: the party
// fights as copies.

import { toast } from './flair.js';
import { G, saveHouse } from '../state.js';
import { h, fill, button, openNote, getNote } from './notes.js';
import { fullName, stageOf, powerOf } from '../core/creature.js';
import { awayBases } from '../core/village.js';
import {
  LEVEL_COUNT, levelInfo, bossOf, levelEnemies, levelToughness, partyProblem, levelProblem, startLevel, levelWon, winLevel,
} from '../core/adventure.js';
import {
  ADVENTURE_PARTY, ADVENTURE_PRIZES, ADVENTURE_GEMS_PER_LEVEL, ADVENTURE_FINISH_GEMS, ADVENTURE_REPLAY_ORE, ADVENTURE_DROPS, ADVENTURE_DROPS_PER_LEVEL,
} from '../data/adventure.js';
import { DEADLY_MONSTERS } from '../data/monsters.js';
import { ITEMS } from '../data/items.js';
import { TRAITS } from '../data/powers.js';
import { drawPortrait } from '../draw/art.js';
import { loadVillage } from './village.js';

const WILD_WORDS = { 1: 'young scrappers', 2: 'seasoned fighters', 3: 'final forms' };
const fine = (v) => `${Number((v * 100).toFixed(v < 0.1 ? 1 : 0))}%`;

// Who can go: anyone alive who is not away on an expedition.
const ready = () => {
  const away = awayBases(G.house);
  return G.everyone.filter((r) => !away.has(r.base));
};

// The party as creatures, from the ids the household remembers.
function partyRows() {
  const rows = ready();
  return G.house.adventure.party.map((id) => rows.find((r) => r.c.id === id)).filter(Boolean);
}

export async function openAdventure() {
  await loadVillage();
  const adv = G.house.adventure;
  // A first party: whoever is out on the screen.
  if (!partyRows().length) adv.party = G.team.map((m) => m.c.id).slice(0, ADVENTURE_PARTY);
  const old = getNote('adventure')?.spec;
  openNote('adventure', {
    title: 'Adventure',
    cls: 'parch',
    width: 392,
    help: 'chances',
    picked: old?.picked ?? G.adventureRun?.n ?? Math.min(LEVEL_COUNT, adv.best + 1),
    message: '',
    build(body, note) {
      note.refs.portraits = [];
      buildAdventure(body, note);
    },
    tick(note) {
      note.refs.portraits?.forEach(({ canvas, c }) => drawPortrait(canvas, c));
    },
  });
}

function rewardText(n, best) {
  if (n > best) {
    const prize = ADVENTURE_PRIZES[n] ?? {};
    const bits = [`${n * ADVENTURE_GEMS_PER_LEVEL + (n === LEVEL_COUNT ? ADVENTURE_FINISH_GEMS : 0)} gems`];
    if (prize.ore) bits.push(`${prize.ore} Legendary ore`);
    Object.entries(prize.items ?? {}).forEach(([id, k]) => bits.push(`${k > 1 ? `${k} ` : 'a '}${ITEMS[id].name}`));
    return `The first win pays ${bits.join(', ')}.`;
  }
  return `Beaten already. Again, it can still drop loot${bossOf(n) ? `, and the boss always leaves ${ADVENTURE_REPLAY_ORE} ore` : ''}.`;
}

function buildAdventure(body, note) {
  const { spec } = note;
  const adv = G.house.adventure;
  const run = G.adventureRun;
  const fighting = !!G.bout?.adventure;
  fill(body,
    h('div', { class: 'small' }, `A campaign of ${LEVEL_COUNT} levels, fought in a ring on your screen. Take up to ${ADVENTURE_PARTY} creatures. Nobody can die here, and every level beaten opens the next.`),
    h('div', { class: 'purse' },
      h('span', null, 'Best: ', h('b', null, adv.best ? `level ${adv.best}` : 'none yet')),
      h('span', null, h('b', null, Math.floor(G.house.bank.gems)), ' gems'),
      h('span', null, h('b', null, Math.floor(G.house.ore)), ' ore')),
    h('div', { class: 'levels' }, Array.from({ length: LEVEL_COUNT }, (_, i) => {
      const n = i + 1;
      const locked = !!levelProblem(adv, n);
      const cls = ['lvl', n <= adv.best && 'beaten', n === adv.best + 1 && 'next', bossOf(n) && 'boss', n === spec.picked && 'picked'].filter(Boolean).join(' ');
      return h('button', {
        class: cls,
        disabled: locked,
        title: `${n}. ${levelInfo(n).name}${bossOf(n) ? `: ${DEADLY_MONSTERS[bossOf(n)].name}` : ''}`,
        onclick: () => {
          spec.picked = n;
          spec.message = '';
          note.rebuild();
        },
      }, String(n), bossOf(n) && h('small', null, 'BOSS'));
    })),
  );

  // The level picked, and what it holds.
  const n = spec.picked;
  const info = levelInfo(n);
  const { fighters, boss } = levelEnemies(n, 1);
  const wild = n >= 12 ? 3 : n >= 5 ? 2 : 1;
  fill(body, h('div', { class: 'levelcard' },
    h('div', { class: 'row nowrap' },
      h('div', { class: 'nameline grow', style: 'font-size:16px' }, `${n}. ${info.name}`),
      boss && h('span', { class: 'badge boss' }, 'boss')),
    h('div', { class: 'small' }, info.text),
    h('div', { class: 'small', style: 'margin-top:3px' }, `${fighters.length ? `${fighters.length} ${fighters.length === 1 ? WILD_WORDS[wild].replace(/s$/, '') : WILD_WORDS[wild]}` : ''}${boss ? `${fighters.length ? ', led by ' : ''}${DEADLY_MONSTERS[boss].name}` : ''}${n > 1 ? `, ${Math.round((levelToughness(n) - 1) * 100)}% tougher than usual` : ''}.`),
    h('div', { class: 'small', style: 'font-weight:600' }, rewardText(n, adv.best)),
    h('div', { class: 'small' }, `Any win: ${Object.entries(ADVENTURE_DROPS).map(([id, p]) => `${ITEMS[id].name} ${fine(p + n * ADVENTURE_DROPS_PER_LEVEL[id])}`).join(', ')}.`)));

  // The party.
  const rows = ready();
  const party = partyRows();
  fill(body,
    h('div', { class: 'sect' }, `The party (${party.length} of ${ADVENTURE_PARTY})`),
    rows.length === 0
      ? h('div', { class: 'small' }, 'Everyone is away on an expedition.')
      : h('div', { class: 'party' }, rows.slice().sort((a, b) => powerOf(b.c) - powerOf(a.c)).map((r) => {
        const on = adv.party.includes(r.c.id);
        const gift = r.c.traits[0];
        return h('button', {
          class: `chip${on ? ' on' : ''}`,
          style: gift ? `--c:${TRAITS[gift].color}` : '',
          disabled: fighting || (!on && party.length >= ADVENTURE_PARTY),
          title: `${fullName(r.c)}: ${stageOf(r.c).name}, power ${powerOf(r.c)}`,
          onclick: () => {
            adv.party = on ? adv.party.filter((id) => id !== r.c.id) : [...party.map((p) => p.c.id), r.c.id];
            saveHouse();
            note.rebuild();
          },
        }, `${r.c.name} (${powerOf(r.c)})`);
      })),
    party.length > 0 && h('div', { class: 'row', style: 'margin-top:5px;gap:4px' }, party.map((r) => {
      const canvas = h('canvas', { style: 'width:44px;height:52px' });
      note.refs.portraits.push({ canvas, c: r.c });
      return canvas;
    }), h('span', { class: 'small grow' }, `Power ${party.reduce((s, r) => s + powerOf(r.c), 0)} between them.`)),
  );

  if (fighting && run) {
    fill(body,
      h('div', { class: 'callout' }, h('div', { class: 'hand' }, `Level ${run.n}: fight!`)),
      h('div', { class: 'row gap' }, button('Give up', () => {
        endLevel();
        note.rebuild();
      }, 'big')));
    return;
  }
  if (run?.result) fill(body, h('div', { class: 'callout' }, h('div', { class: 'hand' }, run.result)));
  const problem = partyProblem(party.map((r) => r.c)) ?? levelProblem(adv, n);
  fill(body,
    (spec.message || (party.length === 0 && problem)) && h('div', { class: 'warning' }, spec.message || problem),
    h('div', { class: 'row gap' }, button(n <= adv.best ? `Play level ${n} again` : `Fight level ${n}`, () => begin(note), 'big hot', !!problem || !!G.bout)),
    G.bout && !G.bout.adventure && h('div', { class: 'small' }, 'Finish the fight that is already on first.'),
  );
}

function ring() {
  const { work } = G.screen;
  const r = Math.min(work.h * 0.42, work.w * 0.3);
  return { cx: work.x + work.w / 2, cy: work.y + work.h / 2 + 34, r };
}

function begin(note) {
  if (G.bout) return;
  const n = note.spec.picked;
  const party = partyRows().map((r) => r.c);
  const problem = partyProblem(party) ?? levelProblem(G.house.adventure, n);
  if (problem) {
    note.spec.message = problem;
    note.rebuild();
    return;
  }
  const seed = Math.floor(Math.random() * 2 ** 31);
  G.adventureRun = { n, seed, result: '' };
  G.bout = startLevel(n, party, { seed, ...ring(), sizeMul: G.settings.scale ?? 1 });
  // Everyone out steps aside while the ring is up.
  G.boutHide = new Set(G.team.map((m) => m.c.id));
  G.team.forEach((m) => m.pet.interrupt());
  note.spec.message = '';
  toast(`LEVEL ${n}: ${levelInfo(n).name.toUpperCase()}!`, bossOf(n) ? 'rare' : 'info');
  note.rebuild();
}

function endLevel() {
  if (G.bout?.adventure) {
    G.bout = null;
    G.boutHide = new Set();
  }
  if (G.adventureRun) G.adventureRun.result = `You called off level ${G.adventureRun.n}.`;
}

// Called by the game loop when a level is over.
export function onLevelEnded(bout) {
  const run = G.adventureRun;
  if (!run) return;
  const won = levelWon(bout);
  const n = run.n;
  if (won) {
    const reward = winLevel(G.house, n);
    saveHouse();
    const bits = [reward.gems && `+${reward.gems} gems`, reward.ore && `+${reward.ore} ore`, ...reward.items.map((id) => `a ${ITEMS[id].name}`)].filter(Boolean);
    run.result = `Level ${n} beaten!${bits.length ? ` ${bits.join(', ')}.` : ''}${n === LEVEL_COUNT && reward.first ? ' The whole campaign is done!' : ''}`;
    const note = getNote('adventure');
    if (note && n < LEVEL_COUNT) note.spec.picked = n + 1;
    G.fx.shout(bout.cx, bout.cy - bout.r * 0.6, n === LEVEL_COUNT ? 'THE DRAGON FALLS' : `LEVEL ${n} BEATEN`, '#8ef06a', 26, 3);
    toast(`LEVEL ${n} BEATEN!${bits.length ? ` ${bits.join(', ').toUpperCase()}!!!` : ''}`, reward.items.length || reward.first ? 'rare' : 'good');
  } else {
    run.result = `Level ${n} was too much this time. Grow the party, give them weapons from the forge, and try again.`;
    G.fx.shout(bout.cx, bout.cy - bout.r * 0.6, 'THE PARTY FELL', '#ff6b5e', 26, 3);
    toast(`THE PARTY FELL ON LEVEL ${n}!`, 'bad');
  }
  setTimeout(() => {
    if (G.bout === bout) {
      G.bout = null;
      G.boutHide = new Set();
    }
    getNote('adventure')?.rebuild();
  }, 2200);
  getNote('adventure')?.rebuild();
}
