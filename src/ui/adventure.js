// Adventure: pick three of your creatures and fight your way through 60 levels in five acts, one
// ring at a time on your screen. Every fifth level a deadly monster leads the enemy, and every other
// level in Act 5. From Act 2 the enemy carries forged weapons, from Act 3 Legendary mutations. Nobody
// can die here: the party fights as copies. Every win counts toward the gifts earned in Adventure.
// Beating the last level cracks the universe, and resetting it opens Chapter ??? and the Negative.

import { toast } from './flair.js';
import { G, saveHouse } from '../state.js';
import { h, fill, button, sureButton, openNote, getNote, folds } from './notes.js';
import { fullName, stageOf, powerOf, negativeShare, awakenedKinds } from '../core/creature.js';
import { awayBases } from '../core/village.js';
import {
  LEVEL_COUNT, levelInfo, bossOf, bossMonster, levelEnemies, levelToughness, partyProblem, levelProblem, startLevel, levelWon, winLevel, creditParty,
  ABYSS_COUNT, abyssInfo, abyssBossOf, abyssBossMonster, abyssEnemies, abyssToughness, abyssProblem, startAbyss, abyssReward, winAbyss,
  GOD_COUNT, godInfo, godBossOf, godBossMonster, godEnemies, godToughness, godProblem, startGod, godReward, winGod,
} from '../core/adventure.js';
import { universeCracked, afterReset, resetsOf, gemMultiplier, abyssBeaten, godModeOpen } from '../core/universe.js';
import { GOD_GUARD, GOD_FULL, AWAKENINGS } from '../data/ascension.js';
import { earnTraits } from '../core/earned.js';
import { saveAnywhere } from './breed.js';
import { RACES } from '../data/races.js';
import {
  ADVENTURE_ACTS, ADVENTURE_PARTY, ADVENTURE_PRIZES, ADVENTURE_GEMS_PER_LEVEL, ADVENTURE_FINISH_GEMS, ADVENTURE_REPLAY_ORE, ADVENTURE_DROPS, ADVENTURE_DROPS_PER_LEVEL, ADVENTURE_ARMED,
  ADVENTURE_ELITE, ADVENTURE_ELITE_GIFTS, ABYSS, GOD,
} from '../data/adventure.js';
import { ITEMS } from '../data/items.js';
import { TRAITS } from '../data/powers.js';
import { drawPortrait } from '../draw/art.js';
import { loadVillage } from './village.js';

const WILD_WORDS = { 1: 'young scrappers', 2: 'seasoned fighters', 3: 'final forms' };
const fine = (v) => `${Number((v * 100).toFixed(v < 0.1 ? 1 : 0))}%`;
const big = (n) => Math.floor(n).toLocaleString('en-US');

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
  const run = G.adventureRun;
  openNote('adventure', {
    title: 'Adventure',
    cls: 'parch',
    width: 400,
    help: 'chances',
    picked: old?.picked ?? (run && !run.abyss && !run.god ? run.n : Math.min(LEVEL_COUNT, adv.best + 1)),
    abyss: old?.abyss ?? !!run?.abyss,
    pickedAbyss: old?.pickedAbyss ?? (run?.abyss ? run.n : Math.min(ABYSS_COUNT, (G.house.universe?.abyssBest ?? 0) + 1)),
    god: old?.god ?? !!run?.god,
    pickedGod: old?.pickedGod ?? (run?.god ? run.n : Math.min(GOD_COUNT, (G.house.universe?.godBest ?? 0) + 1)),
    message: '',
    build(body, note) {
      note.refs.portraits = [];
      // Everything scrolls, so the button to fight is always in reach however long the note gets.
      const page = h('div', { class: 'scrollnote' });
      fill(body, page);
      buildAdventure(page, note);
    },
    tick(note) {
      note.refs.portraits?.forEach(({ canvas, c }) => drawPortrait(canvas, c));
    },
  });
}

function rewardText(n, best) {
  if (n > best) {
    const prize = ADVENTURE_PRIZES[n] ?? {};
    const bits = [`${n * ADVENTURE_GEMS_PER_LEVEL + (prize.gems ?? 0) + (n === LEVEL_COUNT ? ADVENTURE_FINISH_GEMS : 0)} gems`];
    if (prize.ore) bits.push(`${prize.ore} Legendary ore`);
    Object.entries(prize.items ?? {}).forEach(([id, k]) => bits.push(`${k > 1 ? `${k} ` : 'a '}${ITEMS[id].name}`));
    if (prize.found) bits.push(`a ${RACES[prize.found].name} who wants to join you`);
    return `The first win pays ${bits.join(', ')}.${n === LEVEL_COUNT ? ' And it cracks the universe.' : ''}`;
  }
  return `Beaten already. Again, it can still drop loot${bossOf(n) ? `, and the boss always leaves ${ADVENTURE_REPLAY_ORE} ore` : ''}.`;
}

function buildAdventure(body, note) {
  const adv = G.house.adventure;
  const mult = gemMultiplier(G.house);
  fill(body,
    h('div', { class: 'small' }, `A campaign of ${LEVEL_COUNT} levels, fought in a ring on your screen. Take up to ${ADVENTURE_PARTY} creatures. Nobody can die here, and every level beaten opens the next.`),
    h('div', { class: 'purse' },
      h('span', null, 'Best: ', h('b', null, adv.best ? `level ${adv.best}` : 'none yet')),
      h('span', null, h('b', null, big(G.house.bank.gems)), ' gems'),
      h('span', null, h('b', null, Math.floor(G.house.ore)), ' ore'),
      mult > 1 && h('span', null, 'gems ', h('b', null, `x${mult.toFixed(1)}`))),
    universeCard(note),
    actFolds(note),
  );
  // The level picked, and what it holds.
  if (note.spec.god && abyssBeaten(G.house)) godDetails(body, note);
  else if (note.spec.abyss && afterReset(G.house)) abyssDetails(body, note);
  else levelDetails(body, note);
}

// Once the last level is beaten, the universe cracks. After a reset, the Negative and Chapter ???.
function universeCard(note) {
  const house = G.house;
  const cards = [];
  if (afterReset(house)) {
    cards.push(h('div', { class: 'mega void' },
      h('div', { class: 'row nowrap' },
        h('div', { class: 'grow' },
          h('div', { class: 'hand', style: 'font-weight:700' }, 'The Negative Dimension'),
          h('div', { class: 'small' }, 'A world of its own, on other rules: classes and spells, Nen, Alchemy. Win its last level and a creature can cross over, with its race and its gifts. Only Negative blood can wound what lives in Chapter ???.')),
        button('Enter', () => G.open?.('negative'), 'hot'))));
  }
  // Chapter ??? is beaten: there is more in the Negative, and the God Chapter is open.
  if (abyssBeaten(house)) {
    cards.push(h('div', { class: 'mega void' },
      h('div', { class: 'row nowrap' },
        h('div', { class: 'grow' },
          h('div', { class: 'hand', style: 'font-weight:700' }, 'There is more in the Negative'),
          h('div', { class: 'small' }, 'Under the bottom of the Negative\'s Adventure, the Elite Negative is open. Its wins pay Ascension Stones, and the stones craft a Requiem Arrow, a True Speed Stone, a Devil Fruit Awakening and a Cursed Technique Amplification: each awakens a power here into something far stronger. That is what the God Chapter, below, has to be fought with.')),
        button('Enter', () => G.open?.('negative:elite'), 'hot'))));
  }
  if (godModeOpen(house)) {
    cards.push(h('div', { class: 'mega void god' },
      h('div', { class: 'row nowrap' },
        h('div', { class: 'grow' },
          h('div', { class: 'hand', style: 'font-weight:700' }, 'God Mode'),
          h('div', { class: 'small' }, 'God is beaten. Make any creature you want, put anyone in the ring against anyone, and use the tools of whoever runs the universe now.')),
        button('Open', () => G.open?.('god'), 'hot'))));
  }
  if (universeCracked(house)) {
    cards.push(h('div', { class: 'mega void' },
      h('div', { class: 'hand', style: 'font-weight:700' }, afterReset(house) ? `The universe is cracked again (reset ${resetsOf(house)} time${resetsOf(house) === 1 ? '' : 's'})` : 'The universe is cracked'),
      h('div', { class: 'small' }, 'The End of All Things is gone, and so is the floor of the world. Reset the universe, and every creature you have dies: everything they built goes with them, gems, ore, weapons, the village, the altar, the breeders, every level of Adventure. What it opens: the Negative Dimension, and Chapter ???, 25 levels harder than anything here.'),
      abyssBeaten(house) && h('div', { class: 'small' }, 'Chapter ??? stays beaten through a reset, and so does everything past it: there is more in the Negative, where the Elite Negative pays Ascension Stones, and the God Chapter stays open here.'),
      h('div', { class: 'warning' }, 'This kills every creature you have, and it can\'t be undone.'),
      h('div', { class: 'row gap' }, sureButton('Reset the universe', async () => {
        if (G.bout) return;
        const more = abyssBeaten(house);
        const ok = await G.resetUniverse?.();
        if (ok) toast(more ? 'THE UNIVERSE WAS RESET. EVERYTHING IS GONE... BUT THERE IS MORE IN THE NEGATIVE. THE ELITE NEGATIVE IS WAITING UNDER IT.' : 'THE UNIVERSE WAS RESET. EVERYTHING IS GONE. THE NEGATIVE DIMENSION IS OPEN...', 'rare');
      }, 'big hot', !!G.bout))));
  }
  return cards;
}

// The levels, one act at a time, Chapter ??? after a reset, and the God Chapter once that is beaten.
function actFolds(note) {
  const { spec } = note;
  const adv = G.house.adventure;
  const stone = (n) => {
    const locked = !!levelProblem(adv, n);
    const cls = ['lvl', n <= adv.best && 'beaten', n === adv.best + 1 && 'next', bossOf(n) && 'boss', n > 50 && 'act5', !spec.abyss && !spec.god && n === spec.picked && 'picked'].filter(Boolean).join(' ');
    return h('button', {
      class: cls,
      disabled: locked,
      title: `${n}. ${levelInfo(n).name}${bossOf(n) ? `: ${bossMonster(n).name}` : ''}`,
      onclick: () => {
        spec.picked = n;
        spec.abyss = false;
        spec.god = false;
        spec.message = '';
        note.rebuild();
      },
    }, String(n), bossOf(n) && h('small', null, 'BOSS'));
  };
  const abyssBest = G.house.universe?.abyssBest ?? 0;
  const abyssStone = (k) => {
    const locked = !!abyssProblem(G.house, k);
    const cls = ['lvl', 'abyss', k <= abyssBest && 'beaten', k === abyssBest + 1 && 'next', abyssBossOf(k) && 'boss', spec.abyss && !spec.god && k === spec.pickedAbyss && 'picked'].filter(Boolean).join(' ');
    return h('button', {
      class: cls,
      disabled: locked,
      title: `?${k}. ${abyssInfo(k).name}`,
      onclick: () => {
        spec.pickedAbyss = k;
        spec.abyss = true;
        spec.god = false;
        spec.message = '';
        note.rebuild();
      },
    }, `?${k}`, abyssBossOf(k) && h('small', null, 'BOSS'));
  };
  const actOfLevel = (n) => ADVENTURE_ACTS.filter((a) => n >= a.from).length;
  const acts = ADVENTURE_ACTS.map((a, i) => {
    const last = (ADVENTURE_ACTS[i + 1]?.from ?? LEVEL_COUNT + 1) - 1;
    const levels = Array.from({ length: last - a.from + 1 }, (_, k) => a.from + k);
    const won = levels.filter((n) => n <= adv.best).length;
    const [head, ...rest] = a.title.split('. ');
    return {
      id: `act${i + 1}`,
      title: head,
      tag: won === levels.length ? 'all beaten' : levelProblem(adv, a.from) ? 'locked' : `${won} of ${levels.length} beaten`,
      tagCls: levelProblem(adv, a.from) ? 'locked' : '',
      build: () => [
        rest.length > 0 && h('div', { class: 'small' }, rest.join('. ')),
        h('div', { class: 'levels' }, levels.map(stone)),
      ],
    };
  });
  if (afterReset(G.house)) {
    acts.push({
      id: 'abyss',
      title: 'Chapter ???',
      tag: abyssBest >= ABYSS_COUNT ? 'all beaten' : `${abyssBest} of ${ABYSS_COUNT} beaten`,
      build: () => [
        h('div', { class: 'small' }, `The Abyss Between, under both worlds. ${ABYSS_COUNT} levels, each ${ABYSS.grow} times harder than the one before, starting past the end of Act 5. Only Negative blood wounds what lives here: anything without it does ${Math.round((1 - ABYSS.voidGuard) * 100)}% of its damage, a quarter Negative about half, half Negative or more in full.`),
        h('div', { class: 'levels' }, Array.from({ length: ABYSS_COUNT }, (_, k) => abyssStone(k + 1))),
      ],
    });
  }
  const godBest = G.house.universe?.godBest ?? 0;
  const godStone = (k) => {
    const cls = ['lvl', 'abyss', 'act5', 'god', k <= godBest && 'beaten', k === godBest + 1 && 'next', godBossOf(k) && 'boss', spec.god && k === spec.pickedGod && 'picked'].filter(Boolean).join(' ');
    return h('button', {
      class: cls,
      disabled: !!godProblem(G.house, k),
      title: `G${k}. ${godInfo(k).name}`,
      onclick: () => {
        spec.pickedGod = k;
        spec.god = true;
        spec.abyss = false;
        spec.message = '';
        note.rebuild();
      },
    }, `G${k}`, godBossOf(k) && h('small', null, 'BOSS'));
  };
  if (abyssBeaten(G.house)) {
    acts.push({
      id: 'god',
      title: 'The God Chapter',
      tag: godBest >= GOD_COUNT ? 'all beaten' : `${godBest} of ${GOD_COUNT} beaten`,
      build: () => [
        h('div', { class: 'small' }, `The true final chapter, past the end of Chapter ???. ${GOD_COUNT} levels, each ${GOD.grow} times harder than the one before. What lives here is void-touched and god-touched: it takes ${Math.round((1 - GOD_GUARD) * 100)}% of a hit from anything that isn't awakened, about half from a creature with one awakened power, and full hits only from one with ${GOD_FULL} or more, and Negative blood as well. Ascension Stones from the Elite Negative craft what awakens them. Beat God, and God Mode is yours.`),
        h('div', { class: 'levels' }, Array.from({ length: GOD_COUNT }, (_, k) => godStone(k + 1))),
      ],
    });
  }
  return folds(note, 'acts', acts, spec.god ? 'god' : spec.abyss ? 'abyss' : `act${actOfLevel(spec.picked)}`);
}

function bossLine(def) {
  return def?.passive?.text ? h('div', { class: 'small warning' }, h('b', null, `${def.name}: `), def.passive.text) : null;
}

function levelDetails(body, note) {
  const { spec } = note;
  const adv = G.house.adventure;
  const n = spec.picked;
  const info = levelInfo(n);
  const { fighters, boss } = levelEnemies(n, 1);
  const wild = n >= 12 ? 3 : n >= 5 ? 2 : 1;
  const twin = boss?.twin > 1 ? `${boss.twin} of ${bossMonster(n).name}` : boss ? bossMonster(n).name : '';
  fill(body, h('div', { class: `levelcard${n > 50 ? ' act5' : ''}` },
    h('div', { class: 'row nowrap' },
      h('div', { class: 'nameline grow', style: 'font-size:16px' }, `${n}. ${info.name}`),
      boss && h('span', { class: 'badge boss' }, 'boss')),
    h('div', { class: 'small' }, info.text),
    h('div', { class: 'small', style: 'margin-top:3px' }, `${fighters.length ? `${fighters.length} ${fighters.length === 1 ? WILD_WORDS[wild].replace(/s$/, '') : WILD_WORDS[wild]}` : ''}${boss ? `${fighters.length ? ', led by ' : ''}${twin}` : ''}${n >= ADVENTURE_ARMED ? ', every one of them armed' : ''}${n >= ADVENTURE_ELITE ? `, Elders trained to the limit and born with ${ADVENTURE_ELITE_GIFTS} gifts` : ''}${n > 1 ? `, ${Math.round((levelToughness(n) - 1) * 100)}% tougher than usual` : ''}.`),
    boss && bossLine(bossMonster(n)),
    h('div', { class: 'small', style: 'font-weight:600' }, rewardText(n, adv.best)),
    h('div', { class: 'small' }, `Any win: ${Object.entries(ADVENTURE_DROPS).map(([id, p]) => `${ITEMS[id].name} ${fine(p + n * ADVENTURE_DROPS_PER_LEVEL[id])}`).join(', ')}.`)));
  partyAndGo(body, note, n, levelProblem(adv, n), n <= adv.best);
}

function abyssDetails(body, note) {
  const { spec } = note;
  const k = spec.pickedAbyss;
  const info = abyssInfo(k);
  const { fighters, boss } = abyssEnemies(k, 1);
  const best = G.house.universe?.abyssBest ?? 0;
  const pay = abyssReward(k, best, () => 1);
  const name = boss ? `${boss.twin > 1 ? `${boss.twin} of ` : ''}${abyssBossMonster(k).name}` : '';
  fill(body, h('div', { class: 'levelcard abyss' },
    h('div', { class: 'row nowrap' },
      h('div', { class: 'nameline grow', style: 'font-size:16px' }, `?${k}. ${info.name}`),
      boss && h('span', { class: 'badge boss' }, 'boss')),
    h('div', { class: 'small' }, info.text),
    h('div', { class: 'small', style: 'margin-top:3px' }, `${fighters.length} void-touched Elders of the Negative's races${boss ? `, led by ${name}` : ''}, each with three Legendary mutations, armed, ${abyssToughness(k).toFixed(1)} times as strong as usual.`),
    boss && bossLine(abyssBossMonster(k)),
    h('div', { class: 'small warning' }, `Only Negative blood wounds them: without it, only ${Math.round((1 - ABYSS.voidGuard) * 100)}% of the damage lands.`),
    h('div', { class: 'small', style: 'font-weight:600' }, pay.first ? `The first win pays ${big(pay.gems)} gems, ${pay.ore} ore, and loot.` : `Beaten already. Again, it pays ${big(pay.gems)} gems.`)));
  partyAndGo(body, note, k, abyssProblem(G.house, k), k <= best, 'abyss');
}

function godDetails(body, note) {
  const { spec } = note;
  const k = spec.pickedGod;
  const info = godInfo(k);
  const { fighters, boss } = godEnemies(k, 1);
  const best = G.house.universe?.godBest ?? 0;
  const pay = godReward(k, best, () => 1);
  fill(body, h('div', { class: 'levelcard abyss act5 god' },
    h('div', { class: 'row nowrap' },
      h('div', { class: 'nameline grow', style: 'font-size:16px' }, `G${k}. ${info.name}`),
      boss && h('span', { class: 'badge boss' }, 'boss')),
    h('div', { class: 'small' }, info.text),
    h('div', { class: 'small', style: 'margin-top:3px' }, `${fighters.length ? `${fighters.length} god-touched Elders of the Negative's races, each with three Legendary mutations, armed` : ''}${boss ? `${fighters.length ? ', led by ' : ''}${godBossMonster(k).name}` : ''}, ${godToughness(k).toFixed(0)} times as strong as usual.`),
    boss && bossLine(godBossMonster(k)),
    h('div', { class: 'small warning' }, `Only awakened powers and Negative blood wound them. A creature with no awakened power lands ${Math.round((1 - GOD_GUARD) * 100)}% of its damage, one awakened power about half, ${GOD_FULL} or more in full, and without Negative blood all of that only lands ${Math.round((1 - ABYSS.voidGuard) * 100)}% again.`),
    h('div', { class: 'small', style: 'font-weight:600' }, pay.first
      ? `The first win pays ${big(pay.gems)} gems, ${pay.ore} ore, and loot${godBossOf(k) ? ', with one of each Ascension item' : ''}.${pay.godMode ? ' And God Mode.' : ''}`
      : `Beaten already. Again, it pays ${big(pay.gems)} gems.`)));
  partyAndGo(body, note, k, godProblem(G.house, k), k <= best, 'god');
}

function partyAndGo(body, note, n, levelBlock, beaten, chapter = null) {
  const abyss = chapter === 'abyss' || chapter === 'god';
  const god = chapter === 'god';
  const { spec } = note;
  const adv = G.house.adventure;
  const run = G.adventureRun;
  const fighting = !!G.bout?.adventure;
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
        const neg = negativeShare(r.c);
        const woke = awakenedKinds(r.c);
        return h('button', {
          class: `chip${on ? ' on' : ''}`,
          style: gift ? `--c:${TRAITS[gift].color}` : '',
          disabled: fighting || (!on && party.length >= ADVENTURE_PARTY),
          title: `${fullName(r.c)}: ${stageOf(r.c).name}, power ${powerOf(r.c)}${neg ? `, ${Math.round(neg * 100)}% Negative` : ''}${woke.length ? `, awakened: ${woke.map((kind) => AWAKENINGS[kind].name).join(', ')}` : ''}`,
          onclick: () => {
            adv.party = on ? adv.party.filter((id) => id !== r.c.id) : [...party.map((p) => p.c.id), r.c.id];
            saveHouse();
            note.rebuild();
          },
        }, `${r.c.name} (${powerOf(r.c)})${abyss && neg ? ' ◆' : ''}${god && woke.length ? ` ${'✦'.repeat(woke.length)}` : ''}`);
      })),
    abyss && h('div', { class: 'small' }, god ? '◆ has Negative blood. ✦ is one awakened power.' : '◆ has Negative blood.'),
    party.length > 0 && h('div', { class: 'row', style: 'margin-top:5px;gap:4px' }, party.map((r) => {
      const canvas = h('canvas', { style: 'width:44px;height:52px' });
      note.refs.portraits.push({ canvas, c: r.c });
      return canvas;
    }), h('span', { class: 'small grow' }, `Power ${party.reduce((s, r) => s + powerOf(r.c), 0)} between them.`)),
  );

  if (fighting && run) {
    fill(body,
      h('div', { class: 'callout' }, h('div', { class: 'hand' }, `${runName(run)}: fight!`)),
      h('div', { class: 'row gap' }, button('Give up', () => {
        endLevel();
        note.rebuild();
      }, 'big')));
    return;
  }
  if (run?.result) fill(body, h('div', { class: 'callout' }, h('div', { class: 'hand' }, run.result)));
  const problem = partyProblem(party.map((r) => r.c)) ?? levelBlock;
  const where = god ? `G${n}` : abyss ? `?${n}` : `level ${n}`;
  const label = beaten ? `Play ${where} again` : `Fight ${where}`;
  fill(body,
    (spec.message || (party.length === 0 && problem)) && h('div', { class: 'warning' }, spec.message || problem),
    h('div', { class: 'row gap' }, button(label, () => begin(note), 'big hot', !!problem || !!G.bout)),
    G.bout && !G.bout.adventure && h('div', { class: 'small' }, 'Finish the fight that is already on first.'),
  );
}

// What a run is called: 'Level 12', '?3' or 'G4'.
const runName = (run) => (run.god ? `G${run.n}` : run.abyss ? `?${run.n}` : `Level ${run.n}`);

function ring() {
  const { work } = G.screen;
  const r = Math.min(work.h * 0.42, work.w * 0.3);
  return { cx: work.x + work.w / 2, cy: work.y + work.h / 2 + 34, r };
}

function begin(note) {
  if (G.bout) return;
  const god = note.spec.god && abyssBeaten(G.house);
  const abyss = !god && note.spec.abyss && afterReset(G.house);
  const n = god ? note.spec.pickedGod : abyss ? note.spec.pickedAbyss : note.spec.picked;
  const party = partyRows().map((r) => r.c);
  const problem = partyProblem(party) ?? (god ? godProblem(G.house, n) : abyss ? abyssProblem(G.house, n) : levelProblem(G.house.adventure, n));
  if (problem) {
    note.spec.message = problem;
    note.rebuild();
    return;
  }
  const seed = Math.floor(Math.random() * 2 ** 31);
  G.adventureRun = { n, seed, result: '', abyss, god };
  const opts = { seed, ...ring(), sizeMul: G.settings.scale ?? 1 };
  G.bout = god ? startGod(n, party, opts) : abyss ? startAbyss(n, party, opts) : startLevel(n, party, opts);
  // Everyone out steps aside while the ring is up.
  G.boutHide = new Set(G.team.map((m) => m.c.id));
  G.team.forEach((m) => m.pet.interrupt());
  note.spec.message = '';
  const name = god ? `THE GOD CHAPTER, G${n}: ${godInfo(n).name}` : abyss ? `?${n}: ${abyssInfo(n).name}` : `LEVEL ${n}: ${levelInfo(n).name}`;
  toast(`${name.toUpperCase()}!`, (god ? godBossOf(n) : abyss ? abyssBossOf(n) : bossOf(n)) ? 'rare' : 'info');
  note.rebuild();
}

function endLevel() {
  if (G.bout?.adventure) {
    G.bout = null;
    G.boutHide = new Set();
  }
  if (G.adventureRun) G.adventureRun.result = `You called off ${runName(G.adventureRun).replace(/^Level/, 'level')}.`;
}

// Called by the game loop when a level is over.
export function onLevelEnded(bout) {
  const run = G.adventureRun;
  if (!run) return;
  const won = levelWon(bout);
  const n = run.n;
  const where = runName(run);
  if (won) {
    const reward = run.god ? winGod(G.house, n) : run.abyss ? winAbyss(G.house, n) : winLevel(G.house, n);
    saveHouse();
    if (!run.abyss && !run.god) creditAndGift(n);
    const bits = [reward.gems && `+${big(reward.gems)} gems`, reward.ore && `+${reward.ore} ore`, ...reward.items.map((id) => `a ${ITEMS[id].name}`), reward.found && `a ${RACES[reward.found].name} wants to join you (name it in the Village)`].filter(Boolean);
    const cracked = !run.abyss && !run.god && n === LEVEL_COUNT && reward.first;
    // Past the bottom of Chapter ???, there is more: in the Negative.
    const answered = run.abyss && n === ABYSS_COUNT && reward.first;
    run.result = `${where} beaten!${bits.length ? ` ${bits.join(', ')}.` : ''}${cracked ? ' The whole campaign is done, and the universe is cracking.' : ''}${answered ? ' Nobody has ever heard the answer before. And the answer is: there is more in the Negative. Under its Adventure, the Elite Negative is open, and it pays Ascension Stones, which awaken your powers. Awakened, you can face the God Chapter.' : ''}${reward.godMode ? ' God is beaten. God Mode is yours: it is in the menu now, and on this note.' : ''}`;
    const note = getNote('adventure');
    if (note && run.god && n < GOD_COUNT && n >= (G.house.universe.godBest ?? 0)) note.spec.pickedGod = n + 1;
    if (note && run.abyss && n < ABYSS_COUNT && n >= (G.house.universe.abyssBest ?? 0)) note.spec.pickedAbyss = n + 1;
    if (note && !run.abyss && !run.god && n < LEVEL_COUNT && n >= G.house.adventure.best) note.spec.picked = n + 1;
    const shout = reward.godMode ? 'GOD FALLS' : run.god || run.abyss ? `${where} BEATEN` : n === 20 ? 'THE DRAGON FALLS' : n === 50 ? 'THE FIRST BEAST FALLS' : n === LEVEL_COUNT ? 'EVERYTHING ENDS' : `LEVEL ${n} BEATEN`;
    G.fx.shout(bout.cx, bout.cy - bout.r * 0.6, shout, '#8ef06a', 26, 3);
    toast(`${where.toUpperCase()} BEATEN!${bits.length ? ` ${bits.join(', ').toUpperCase()}!!!` : ''}`, reward.items.length || reward.first ? 'rare' : 'good');
    if (cracked) toast('THE UNIVERSE IS CRACKING. THE ADVENTURE NOTE CAN RESET IT...', 'rare');
    if (answered) toast('THERE IS MORE IN THE NEGATIVE WORLD... THE ELITE NEGATIVE IS OPEN. HEAD INTO THE NEGATIVE FOR ASCENSION STONES!', 'rare');
    if (reward.godMode) {
      toast('GOD IS BEATEN. GOD MODE IS YOURS!!!', 'rare');
      G.onCreatureChanged?.();
    }
  } else {
    run.result = run.god
      ? `${where} was too much. Only awakened powers wound what lives there, two of them for a full hit, and Negative blood too: craft Ascension items from the Elite Negative's stones, and use them in the Nursery's Bag.`
      : run.abyss
      ? `${where} was too much. Only Negative blood wounds what lives there: cross creatures over from the Negative, or breed them with the Deluxe Breeder.`
      : `${where} was too much this time. Grow the party, give them weapons from the forge, and try again.`;
    G.fx.shout(bout.cx, bout.cy - bout.r * 0.6, 'THE PARTY FELL', '#ff6b5e', 26, 3);
    toast(`THE PARTY FELL ON ${where.toUpperCase()}!`, 'bad');
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

// Each real creature in the party gets credit for the win, and anything it has now earned.
async function creditAndGift(n) {
  const rows = partyRows();
  creditParty(rows.map((r) => r.c), n);
  for (const row of rows) {
    for (const id of earnTraits(row.c)) toast(`${row.c.name.toUpperCase()} EARNED ${TRAITS[id].name.toUpperCase()}!!!`, 'rare');
    await saveAnywhere(row.c, row.base);
  }
}
