// The village. Your three mains are out on your screen; everyone else lives here and works for the
// pool you all share. From here you send expeditions, hold the line against waves of raiders, raid
// hostile villages when hostile mode is on, and put your village on the map.

import { toast, rich } from './flair.js';
import { G, api, saveHouse, saveWorld, creatureText } from '../state.js';
import { h, fill, button, sureButton, openNote, getNote, pickRect } from './notes.js';
import { parseCreature, fullName, stageOf, pathTitle, powerOf, raceName, wildCreature } from '../core/creature.js';
import {
  workOf, villageOutput, villageDefense, winChance, expeditionProblem, startExpedition, awayBases, takeFound, setHostile, raidVillage, raidProblem,
} from '../core/village.js';
import { defenders, startWave, waveEnemies, waveHeld, waveReward } from '../core/waves.js';
import { newWorld, COLS, ROWS } from '../sim/society.js';
import { RACES } from '../data/races.js';
import { FRUITS, FRUIT_FROM_EXPEDITION } from '../data/fruits.js';
import { EXPEDITIONS, EXPEDITION_IDS, PARTY_MAX, EXPEDITIONS_AT_ONCE, PARTY_GEMS_PER_100, WAVE_FROM_VILLAGE, RAID_EVERY_HOURS } from '../data/village.js';
import { TEAM_MAX } from '../data/family.js';
import { PIGMENTS, CROPS } from '../data/crafting.js';
import { drawPortrait } from '../draw/art.js';
import { SocietyView } from '../draw/scene.js';
import { createCreature, openMenu } from './panels.js';
import { openRoll } from './roll.js';
import { openBreed } from './breed.js';
import { openSociety, forgetFighter } from './boards.js';

const TABS = [['creatures', 'Creatures'], ['expeditions', 'Expeditions'], ['defend', 'Defend'], ['raids', 'Raids'], ['map', 'Map']];
const pct = (v) => `${Math.round(v * 100)}%`;

export function timeLeft(ms) {
  const min = Math.max(1, Math.ceil(ms / 60000));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`;
}

// Every living creature and where each one is: out on your screen, at home, or away.
export async function loadVillage() {
  const rows = [];
  for (const f of await api.listCreatures()) {
    try {
      // Whoever is out is used as it is right now, not as its file was last saved.
      const c = G.team.find((m) => m.base === f.base)?.c ?? parseCreature(f.text);
      if (!c.dead) rows.push({ base: f.base, c });
    } catch { /* an unreadable file just gets left out */ }
  }
  const away = awayBases(G.house);
  G.everyone = rows;
  G.village = rows.filter((r) => !G.team.some((m) => m.base === r.base) && !away.has(r.base));
  getNote('village')?.rebuild();
  return rows;
}

const homeCreatures = () => G.village.map((r) => r.c);
const mains = () => G.team.map((m) => m.c);
export const defence = () => villageDefense(homeCreatures(), mains());

// What one villager does all day, in a line.
function workLine(c) {
  const w = workOf(c);
  const r = (v) => (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10);
  if (w.kind === 'mine') return `Mining: about ${r(w.colors)} ${PIGMENTS[w.color].name.toLowerCase()} an hour, and a gem every ${r(1 / w.gems)} hours.`;
  if (w.kind === 'farm') return `Farming: about ${r(w.store)} food and ${r(w.plants)} ${CROPS[w.crop].name} an hour.`;
  if (w.kind === 'battle') return 'Guarding: counts twice over against raids.';
  if (w.kind === 'care') return `Nursing: everyone at home works ${pct(w.boost)} harder.`;
  return `Helping out: about ${r(w.colors)} ${PIGMENTS[w.color].name.toLowerCase()} and ${r(w.store)} food an hour.`;
}

function perHour(out) {
  const r = (v) => Math.round(v * 10) / 10;
  const gems = out.gems >= 1 ? `${r(out.gems)} gems` : out.gems > 0 ? `a gem every ${r(1 / out.gems)} hours` : 'no gems';
  return `Each hour the village brings in about ${Math.round(out.colors)} colors, ${gems}, ${r(out.store)} food and ${r(out.plants)} plants${out.boost ? `, ${pct(out.boost)} more thanks to its nurses` : ''}.`;
}

export async function openVillage(tab = 'creatures') {
  await loadVillage();
  const graves = [];
  for (const text of await api.listGraves()) {
    try {
      graves.push(parseCreature(text));
    } catch { /* an unreadable gravestone just gets left out */ }
  }
  openNote('village', {
    title: 'Village',
    width: 396,
    help: 'start',
    tab,
    party: [],
    names: {},
    message: '',
    graves,
    build(body, note) {
      const { spec } = note;
      fill(body,
        h('div', { class: 'small' }, `Your ${G.team.length} main${G.team.length === 1 ? ' is' : 's are'} out on your screen. The other ${G.village.length} live here and work for the pool you all share.`),
        h('div', { class: 'small', style: 'font-weight:600' }, rich(perHour(villageOutput(homeCreatures())))),
        h('div', { class: 'tabs' }, TABS.map(([id, label]) => button(label, () => {
          spec.tab = id;
          spec.message = '';
          note.rebuild();
        }, spec.tab === id ? 'hot' : ''))),
        spec.message && h('div', { class: 'warning', style: 'margin-top:5px' }, spec.message),
      );
      const page = h('div', { class: 'scrollnote', style: 'margin-top:4px' });
      fill(body, page);
      if (spec.tab === 'expeditions') buildExpeditions(page, note);
      else if (spec.tab === 'defend') buildDefend(page, note);
      else if (spec.tab === 'raids') buildRaids(page, note);
      else if (spec.tab === 'map') buildMap(page, note);
      else buildCreatures(page, note);
    },
    tick(note) {
      note.refs.portraits?.forEach(({ canvas, c }) => drawPortrait(canvas, c));
      // Clocks in the note count down.
      note.refs.clocks?.forEach(({ el, end, text }) => { el.textContent = text(end - Date.now()); });
    },
  });
}

// ---------- creatures ----------

function creatureRow(note, row, place) {
  const { base, c } = row;
  const canvas = h('canvas');
  note.refs.portraits.push({ canvas, c });
  const m = G.team.find((x) => x.base === base);
  const fighting = !!G.bout && G.boutHide.has(c.id);
  const full = G.team.length >= TEAM_MAX;
  const buttons = [];
  if (place === 'out') {
    buttons.push(G.creature === c ? h('span', { class: 'small' }, 'looking after') : button('Look after', () => {
      G.lookAfter(c);
      openMenu();
      note.rebuild();
    }, 'mini'));
    if (G.team.length > 1) {
      buttons.push(button('Put away', async () => {
        await G.putAway(c);
        note.rebuild();
      }, 'mini', fighting));
    }
  } else if (place === 'home') {
    buttons.push(button(full ? 'Swap in' : 'Bring out', async () => {
      const out = await G.bringOut(base, c);
      if (!out) note.spec.message = 'Everyone out is in the middle of a fight.';
      note.rebuild();
    }, 'mini'));
  }
  if (place !== 'away') {
    buttons.push(sureButton('Get rid of', async () => {
      if (await G.getRidOf(base, c)) {
        note.spec.message = `${c.name} is gone for good. Its gravestone is below.`;
        note.spec.graves.push(c);
      }
      note.rebuild();
    }, 'mini', fighting));
  }
  return h('div', { class: 'rosterrow' },
    canvas,
    h('div', { class: 'grow', style: 'min-width:0' },
      h('div', { class: 'name' }, fullName(c)),
      h('div', { class: 'small' }, `${raceName(c)}. ${stageOf(c).name}, ${pathTitle(c)}. Power ${powerOf(c)}.`),
      place === 'home' && h('div', { class: 'small' }, workLine(c)),
      buttons.length > 0 && h('div', { class: 'row', style: 'margin-top:2px' }, buttons)));
}

function buildCreatures(page, note) {
  note.refs.portraits = [];
  note.refs.clocks = [];
  const away = G.house.expeditions.flatMap((e) => e.party.map((p) => ({ ...p, exp: e })));
  const outRows = G.everyone.filter((r) => G.team.some((m) => m.base === r.base));
  fill(page,
    h('div', { class: 'sect', style: 'margin-top:0' }, `Out on your screen (${G.team.length} of ${TEAM_MAX})`),
    h('div', { class: 'small' }, 'Your mains. Click one on your screen to look after it.'),
    h('div', { class: 'roster' }, outRows.map((r) => creatureRow(note, r, 'out'))),
    h('div', { class: 'sect' }, `At home in the village (${G.village.length})`),
    G.village.length === 0
      ? h('div', { class: 'small' }, 'Nobody at home yet. Put a main away, breed, roll an egg, or name what an expedition found.')
      : h('div', { class: 'roster' }, G.village.map((r) => creatureRow(note, r, 'home'))),
    away.length > 0 && h('div', { class: 'sect' }, 'Away on expeditions'),
    away.map((p) => {
      const el = h('span', null, timeLeft(p.exp.end - Date.now()));
      note.refs.clocks.push({ el, end: p.exp.end, text: timeLeft });
      return h('div', { class: 'small' }, `${p.name}: ${EXPEDITIONS[p.exp.where].name.toLowerCase()}, back in `, el, '.');
    }),
    h('div', { class: 'row gap' }, button('Roll an egg', () => openRoll(), 'big hot'), button('Breed two', () => openBreed(), 'big')),
    note.spec.graves.length > 0 && h('div', { class: 'sect' }, 'Graveyard'),
    note.spec.graves.length > 0 && h('div', { class: 'graves' }, note.spec.graves.map((g) => h('div', { class: 'small' },
      `${g.name}, ${pathTitle(g)}. ${g.dead.to ? `Gave its One For All to ${g.dead.to}.` : g.dead.by === 'you' ? 'You got rid of it.' : `Killed by ${g.dead.by}.`}`))),
  );
}

// ---------- expeditions ----------

function buildExpeditions(page, note) {
  const { spec } = note;
  note.refs.clocks = [];
  spec.party = spec.party.filter((b) => G.village.some((r) => r.base === b));
  const party = spec.party.map((b) => G.village.find((r) => r.base === b));
  const power = party.reduce((s, r) => s + powerOf(r.c), 0);
  const fruitOdds = `${Math.round(FRUIT_FROM_EXPEDITION * 100)}%`;
  fill(page,
    h('div', { class: 'small' }, `Send up to ${PARTY_MAX} from the village, and up to ${EXPEDITIONS_AT_ONCE} expeditions at once. They are away until they get back, even while the game is closed. They always bring gems, sometimes a creature of another race, and ${fruitOdds} of the time a Devil Fruit.`),
    G.house.found.length > 0 && h('div', { class: 'sect' }, 'Found on an expedition'),
    G.house.found.map((found, i) => {
      const input = h('input', { type: 'text', maxLength: 24, placeholder: 'Name it', spellcheck: false, value: spec.names[i] ?? '' });
      input.addEventListener('input', () => { spec.names[i] = input.value; });
      return h('div', { class: 'way' },
        h('div', { class: 'top' }, `A ${RACES[found.race].name}!`),
        h('div', { class: 'small' }, `${found.where ? `Found ${EXPEDITIONS[found.where].name.toLowerCase()}. ` : ''}${RACES[found.race].blurb}`),
        h('div', { class: 'row', style: 'margin-top:3px' }, input, button('Take it in', async () => {
          const name = input.value.trim();
          if (!name) {
            input.focus();
            return;
          }
          const c = takeFound(G.house, i, name);
          spec.names = {};
          await saveHouse();
          await createCreature(name, c);
          toast(`${name.toUpperCase()} THE ${raceName(c).toUpperCase()} JOINED THE VILLAGE!`, 'rare');
          spec.message = '';
          await loadVillage();
        }, 'mini hot')));
    }),
    G.house.expeditions.length > 0 && h('div', { class: 'sect' }, 'Out now'),
    G.house.expeditions.map((e) => {
      const el = h('span', null, timeLeft(e.end - Date.now()));
      note.refs.clocks.push({ el, end: e.end, text: timeLeft });
      return h('div', { class: 'small' }, `${e.party.map((p) => p.name).join(', ')}: ${EXPEDITIONS[e.where].name.toLowerCase()}. Back in `, el, '.');
    }),
    h('div', { class: 'sect' }, `Who goes (${party.length} of ${PARTY_MAX})`),
    G.village.length === 0
      ? h('div', { class: 'small' }, 'Nobody is at home to send.')
      : h('div', { class: 'chips' }, G.village.map((r) => h('button', {
        class: `chip${spec.party.includes(r.base) ? ' on' : ''}`,
        disabled: !spec.party.includes(r.base) && spec.party.length >= PARTY_MAX,
        onclick: () => {
          spec.party = spec.party.includes(r.base) ? spec.party.filter((b) => b !== r.base) : [...spec.party, r.base];
          note.rebuild();
        },
      }, `${r.c.name} (${powerOf(r.c)})`))),
    h('div', { class: 'sect' }, 'Where to'),
    EXPEDITION_IDS.map((where) => {
      const place = EXPEDITIONS[where];
      const problem = expeditionProblem(G.house, where, party);
      const extra = Math.floor((power / 100) * PARTY_GEMS_PER_100);
      const finds = Object.entries(place.finds).map(([race, chance]) => `${RACES[race].name} ${(chance * 100).toFixed(chance < 0.01 ? 1 : 0)}%`).join(', ');
      return h('div', { class: 'way' },
        h('div', { class: 'top' }, `${place.name}`, h('span', null, `${place.hours} hour${place.hours === 1 ? '' : 's'}`)),
        h('div', { class: 'small' }, rich(`${place.gems[0]} to ${place.gems[1]} gems${extra ? `, plus ${extra} for this party's power` : ''}. Could find: ${finds}. Devil Fruit ${fruitOdds}.`)),
        h('div', { class: 'row', style: 'margin-top:3px' }, button('Send them', async () => {
          if (!startExpedition(G.house, where, party, Date.now())) return;
          spec.party = [];
          toast(`EXPEDITION SENT: ${place.name.toUpperCase()}!`, 'info');
          await saveHouse();
          await loadVillage();
        }, 'mini hot', !!problem), problem && party.length > 0 && h('span', { class: 'small' }, problem)));
    }),
  );
}

// ---------- defend ----------

function buildDefend(page, note) {
  const run = G.waveRun;
  const line = defenders(mains(), homeCreatures());
  const best = G.house.waves.best;
  fill(page,
    h('div', { class: 'small' }, `Waves of raiders come at your village, more and tougher each time. Your mains and your ${WAVE_FROM_VILLAGE} strongest at home hold the line in a ring on your screen. Nobody can die: it is a test of your village. Reaching a wave for the first time pays its number in gems.`),
    h('div', { class: 'small', style: 'font-weight:600;margin-top:3px' }, `Best wave so far: ${best || 'none yet'}.`),
    h('div', { class: 'small' }, `Holding the line: ${line.map((c) => c.name).join(', ')}. Power ${line.reduce((s, c) => s + powerOf(c), 0)} between them.`),
  );
  if (run && G.bout?.wave) {
    const { raiders, boss } = waveEnemies(run.n, run.seed);
    fill(page,
      h('div', { class: 'nameline', style: 'margin-top:5px' }, `Wave ${run.n}`),
      h('div', { class: 'small' }, `${raiders.length} raider${raiders.length === 1 ? '' : 's'}${boss ? `, led by a monster from the Challenges note` : ''}. Hold the line!`),
      h('div', { class: 'row gap' }, button('Call it off', () => {
        endWaves();
        note.rebuild();
      }, 'big')),
    );
    return;
  }
  if (run?.result) fill(page, h('div', { class: 'callout' }, h('div', { class: 'hand' }, run.result)));
  const next = run?.held ? run.n + 1 : 1;
  fill(page, h('div', { class: 'row gap' },
    button(next === 1 ? 'Start at wave 1' : `Wave ${next}`, () => beginWave(next, note), 'big hot', !!G.bout || line.length === 0),
    run?.held && button('Stop here', () => {
      G.waveRun = null;
      note.rebuild();
    }, 'big')),
    G.bout && !G.bout.wave && h('div', { class: 'small' }, 'Finish the fight that is already on first.'));
}

function waveRing() {
  const { work } = G.screen;
  const r = Math.min(work.h * 0.42, work.w * 0.3);
  return { cx: work.x + work.w / 2, cy: work.y + work.h / 2 + 34, r };
}

function beginWave(n, note) {
  if (G.bout) return;
  const line = defenders(mains(), homeCreatures());
  if (!line.length) return;
  const seed = Math.floor(Math.random() * 2 ** 31);
  G.waveRun = { n, seed, held: false, result: '' };
  G.bout = startWave(n, line, { seed, ...waveRing(), sizeMul: G.settings.scale ?? 1 });
  G.boutHide = new Set(G.team.map((m) => m.c.id));
  G.team.forEach((m) => m.pet.interrupt());
  note.rebuild();
}

function endWaves() {
  if (G.bout?.wave) {
    G.bout = null;
    G.boutHide = new Set();
  }
  G.waveRun = null;
}

// Called by the game loop when a wave is over.
export function onWaveEnded(bout) {
  const run = G.waveRun;
  if (!run) return;
  const held = waveHeld(bout);
  const pay = held ? waveReward(run.n, G.house.waves.best) : 0;
  if (held && run.n > G.house.waves.best) G.house.waves.best = run.n;
  G.house.bank.gems += pay;
  saveHouse();
  run.held = held;
  run.result = held
    ? `Wave ${run.n} held!${pay ? ` A new best: +${pay} gems.` : ''}`
    : `The line broke at wave ${run.n}. Best so far: ${G.house.waves.best || 'none'}.`;
  G.fx.shout(bout.cx, bout.cy - bout.r * 0.6, held ? `WAVE ${run.n} HELD` : 'THE LINE BROKE', held ? '#8ef06a' : '#ff6b5e', 26, 3);
  toast(held ? `WAVE ${run.n} HELD!${pay ? ` NEW BEST! +${pay} gems!!!` : ''}` : `THE LINE BROKE AT WAVE ${run.n}!`, held ? (pay ? 'rare' : 'good') : 'bad');
  setTimeout(() => {
    if (G.bout === bout) {
      G.bout = null;
      G.boutHide = new Set();
    }
    getNote('village')?.rebuild();
  }, 2200);
  getNote('village')?.rebuild();
}

// ---------- raids ----------

function buildRaids(page, note) {
  const hostile = G.house.hostile;
  const def = defence();
  fill(page,
    h('div', { class: 'row nowrap' },
      h('div', { class: 'grow hand' }, `Hostile mode: ${hostile.on ? 'on' : 'off'}`),
      button(hostile.on ? 'Turn it off' : 'Turn it on', async () => {
        setHostile(G.house, !hostile.on, def, Date.now());
        await saveHouse();
        note.rebuild();
      }, hostile.on ? 'mini' : 'mini hot')),
    h('div', { class: 'small' }, `With hostile mode on, three hostile villages appear nearby. While the game is open, one of them raids yours every ${RAID_EVERY_HOURS[0]} to ${RAID_EVERY_HOURS[1]} hours, and your village's defence decides it. Hold them off and they leave gems behind; lose and they take some of your colors, food and gems. You can raid them back. They get a little stronger every day. Turned off, they are gone.`),
  );
  if (!hostile.on) return;
  note.refs.clocks = [];
  const el = h('span', null, timeLeft(hostile.nextRaid - Date.now()));
  note.refs.clocks.push({ el, end: hostile.nextRaid, text: timeLeft });
  fill(page,
    h('div', { class: 'small', style: 'font-weight:600;margin-top:4px' }, `Your defence: ${def}. That is everyone at home, fighters twice over, and your mains at half.`),
    h('div', { class: 'small' }, 'The next raid could come in about ', el, '.'),
    h('div', { class: 'sect' }, 'Hostile villages'),
    hostile.villages.map((v) => {
      const problem = raidProblem(G.house, v.id, Date.now());
      return h('div', { class: 'way' },
        h('div', { class: 'top' }, v.name, h('span', null, `strength ${Math.round(v.power)}`)),
        h('div', { class: 'small' }, `If they raid you, you hold them off about ${pct(winChance(def, v.power))} of the time. If you raid them, you win about ${pct(winChance(def, v.power))} of the time.`),
        h('div', { class: 'row', style: 'margin-top:3px' }, button('Raid them', async () => {
          const res = raidVillage(G.house, v.id, def, Date.now());
          if (!res) return;
          await saveHouse();
          note.spec.message = res.won ? `You beat ${res.village}: +${res.gems} gems and ${res.colors} colors.` : `${res.village} drove your raiders off.`;
          if (G.pet) G.fx.shout(G.pet.x, G.pet.y - 120, res.won ? 'RAID WON' : 'RAID LOST', res.won ? '#8ef06a' : '#ff6b5e', 22, 3);
          toast(res.won ? `RAID WON! +${res.gems} gems!` : 'RAID LOST!', res.won ? 'good' : 'bad');
          note.rebuild();
        }, 'mini hot', !!problem), problem && h('span', { class: 'small' }, problem)));
    }),
    hostile.log.length > 0 && h('div', { class: 'sect' }, 'What happened'),
    hostile.log.slice().reverse().slice(0, 8).map((l) => h('div', { class: 'small' }, l.text)),
  );
}

// ---------- the map ----------

// Your village as a people on your screen, from the society: it grows, farms, builds and, with
// hostile mode on, fights the hostile villages for the land.
async function foundVillageMap(note, area = null) {
  const leaderRow = G.everyone.slice().sort((a, b) => powerOf(b.c) - powerOf(a.c))[0];
  if (!leaderRow) return;
  const seed = Math.floor(Math.random() * 2 ** 31);
  const roster = [parseCreature(creatureText(leaderRow.c))];
  const rivals = G.house.hostile.on ? G.house.hostile.villages : [];
  rivals.forEach((v, i) => {
    const rival = wildCreature(seed + i + 1, v.power < 80 ? 1 : v.power < 140 ? 2 : 3);
    rival.name = v.name.split(' ')[0];
    roster.push(rival);
  });
  const spot = area ?? G.screen.work;
  let colors = null;
  try {
    const grid = await api.sampleScreen({ x: spot.x, y: spot.y, w: spot.w, h: spot.h, cols: COLS, rows: ROWS });
    if (grid.cols === COLS && grid.rows === ROWS) colors = grid.colors;
  } catch (err) {
    console.error(err);
  }
  const world = newWorld(roster, { colors, seed });
  world.tribes[0].name = 'Your village';
  // Everyone at home lives there, so it starts bigger.
  world.tribes[0].pop += 3 * G.everyone.length;
  rivals.forEach((v, i) => { world.tribes[i + 1].name = v.name; });
  world.village = true;
  if (area) world.area = area;
  G.society = world;
  G.societyView = new SocietyView();
  await saveWorld();
  note.rebuild();
}

// Draws a box for the map: where a new one goes, or where an old one moves to.
async function boxForMap(note, found) {
  const rect = await pickRect(found ? 'Drag a box where your village should be' : 'Drag a box where your village should move to', { min: 160 });
  if (!rect) return;
  if (found) {
    await foundVillageMap(note, rect);
    return;
  }
  G.society.area = rect;
  // Its people walk from their new homes.
  G.societyView = new SocietyView();
  await saveWorld();
  note.rebuild();
}

function buildMap(page, note) {
  const w = G.society;
  fill(page, h('div', { class: 'small' }, 'Put your village on your screen as a people: it settles land, farms, digs ore and builds. With hostile mode on, the hostile villages are on the map too, and they fight over the land. It keeps going while you work.'));
  if (!w) {
    fill(page,
      h('div', { class: 'row gap' },
        button('In a box you draw', () => boxForMap(note, true), 'big hot', !G.everyone.length),
        button('Across the whole screen', () => foundVillageMap(note), 'big', !G.everyone.length)),
      h('div', { class: 'small', style: 'margin-top:4px' }, 'Its land is read from the colors on your screen right there, right now, the same as for a society. You can move it any time.'),
      h('div', { class: 'row', style: 'margin-top:4px' }, button('Or a world of any .creature files', () => openSociety(), 'mini')));
    return;
  }
  const mine = w.tribes.find((t) => t.name === 'Your village');
  fill(page,
    h('div', { class: 'small', style: 'font-weight:600;margin-top:4px' }, w.ended
      ? `Day ${w.tick}. It is over.`
      : `Day ${w.tick}.${mine ? ` Your village holds ${mine.cells} land and ${Math.round(mine.pop)} people.` : ''}`),
    h('div', { class: 'row gap' },
      button('Move or resize it', () => boxForMap(note, false), 'hot'),
      w.area && button('Whole screen again', async () => {
        delete w.area;
        G.societyView = new SocietyView();
        await saveWorld();
        note.rebuild();
      }),
      button(w.hideView ? 'Show it on screen' : 'Hide it from screen', () => {
        w.hideView = !w.hideView;
        note.rebuild();
      }),
      button('Full details', () => openSociety()),
      sureButton('End the map', () => {
        G.society = null;
        G.societyView = null;
        api.saveData('society', 'null');
        note.rebuild();
      })),
  );
}
