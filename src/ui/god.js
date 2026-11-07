// God Mode: one note with three tabs. The Maker makes any creature you want, the God Ring puts anyone
// in the ring against anyone, and the tools give the household whatever it needs. It opens once God
// is beaten in the God Chapter, and stays open for good. The rules are in core/god.js.

import { toast } from './flair.js';
import { G, saveHouse, saveNeg } from '../state.js';
import { h, fill, button, openNote, getNote } from './notes.js';
import { computeStats, powerOf, raceName, fullName, stageOf, pathTitle, STAT_KEYS, STAT_LABELS, STAGES, awakenedKinds } from '../core/creature.js';
import {
  godModeOpen, emptyMake, godMake, makeProblem, MAKER_RACES, FINAL_FORMS, MAKER_SOULS,
  godRing, ringProblem, RING_MONSTERS, RING_MONSTER_IDS, RING_MIGHT,
  GOD_GIFTS, godRain, godForge, godBag, godNegative, godRecall, GOD_BLESSINGS, GOD_BLESSING_IDS,
} from '../core/god.js';
import { RACES } from '../data/races.js';
import { TRAITS, TRAIT_IDS, STANDS, STAND_IDS, TECHNIQUES, TECHNIQUE_IDS, QUIRKS, QUIRK_IDS, LEGENDARY, MAX_HP_GIVEN } from '../data/powers.js';
import { FRUITS, FRUIT_IDS } from '../data/fruits.js';
import { PATHS } from '../data/paths.js';
import { WEAPONS, WEAPON_IDS } from '../data/forge.js';
import { AWAKENINGS } from '../data/ascension.js';
import { drawPortrait } from '../draw/art.js';
import { createCreature } from './panels.js';
import { loadVillage } from './village.js';
import { saveAnywhere } from './breed.js';

const TABS = [['make', 'The Maker'], ['ring', 'The God Ring'], ['tools', 'Tools']];
const big = (n) => Math.floor(n).toLocaleString('en-US');

export function openGod(tab = null) {
  if (!godModeOpen(G.house)) {
    toast('GOD MODE ONLY OPENS ONCE GOD IS BEATEN, AT THE END OF THE GOD CHAPTER.', 'info');
    return;
  }
  const old = getNote('god')?.spec;
  openNote('god', {
    title: 'God Mode',
    cls: 'void god',
    width: 430,
    focus: true,
    tab: tab ?? old?.tab ?? 'make',
    make: old?.make ?? emptyMake(),
    ring: old?.ring ?? { left: [], right: [], monsters: [], might: 1, freeForAll: false },
    message: '',
    build(body, note) {
      note.refs.portraits = [];
      const { spec } = note;
      fill(body,
        h('div', { class: 'small' }, 'God is beaten, and the universe answers to you now.'),
        h('div', { class: 'tabs' }, TABS.map(([id, label]) => button(label, () => {
          spec.tab = id;
          spec.message = '';
          note.rebuild();
        }, spec.tab === id ? 'hot' : ''))));
      const page = h('div', { class: 'scrollnote', style: 'margin-top:6px' });
      fill(body, page);
      if (spec.message) fill(page, h('div', { class: 'callout small', style: 'font-weight:600' }, spec.message));
      ({ make, ring, tools }[spec.tab] ?? make)(page, note);
    },
    tick(note) {
      note.refs.portraits?.forEach(({ canvas, c }) => drawPortrait(canvas, c));
    },
  });
}

const chip = (label, on, onclick, color = null, title = '') => h('button', { class: `chip${on ? ' on' : ''}`, style: color ? `--c:${color}` : '', title, onclick }, label);
const toggle = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
const select = (value, options, onchange) => h('select', { onchange: (e) => onchange(e.target.value || null) },
  options.map(([id, label]) => h('option', { value: id ?? '', selected: (id ?? null) === (value ?? null) }, label)));
const check = (on, label, onchange) => h('label', { class: 'toggle' }, h('input', { type: 'checkbox', checked: on, onchange: (e) => onchange(e.target.checked) }), label);

// ---------- the Maker ----------

function make(page, note) {
  const m = note.spec.make;
  const redo = () => note.rebuild();
  const problem = makeProblem(m);
  // What it would be, right now.
  const preview = (() => {
    try {
      return godMake({ ...m, name: m.name || 'Preview' });
    } catch {
      return null;
    }
  })();
  const input = h('input', { type: 'text', maxLength: 24, placeholder: 'Name it', spellcheck: false, value: m.name });
  input.addEventListener('input', () => { m.name = input.value; });
  input.addEventListener('change', redo);
  const hpGiven = m.quirks.reduce((s, id) => s + (QUIRKS[id]?.cost ?? 0), 0);
  const canvas = h('canvas', { style: 'width:64px;height:76px' });
  if (preview) note.refs.portraits.push({ canvas, c: preview });
  const stats = preview && computeStats(preview);
  fill(page,
    h('div', { class: 'small' }, 'Make any creature you want. It is a real creature: it lives in your village, grows, breeds and fights like any other.'),
    h('div', { class: 'hatchbar' }, input),
    h('div', { class: 'sublabel' }, 'Race'),
    h('div', { class: 'row' }, select(m.race, MAKER_RACES.map((id) => [id, RACES[id].name]), (v) => { m.race = v ?? 'human'; redo(); }),
      h('span', { class: 'small' }, 'and'),
      select(m.race2, [[null, 'nothing else'], ...MAKER_RACES.filter((id) => id !== m.race).map((id) => [id, `half ${RACES[id].name}`])], (v) => { m.race2 = v; redo(); })),
    m.race2 && check(m.pureBlood, 'Pure-blooded: every race in it at full power', (v) => { m.pureBlood = v; redo(); }),
    h('div', { class: 'sublabel' }, `Gifts (${m.traits.length})`),
    h('div', { class: 'chips' }, TRAIT_IDS.map((id) => chip(TRAITS[id].name, m.traits.includes(id), () => { m.traits = toggle(m.traits, id); redo(); }, TRAITS[id].color, TRAITS[id].blurb))),
    h('div', { class: 'sublabel' }, 'Powers'),
    h('div', { class: 'row' }, h('span', { class: 'small' }, 'Stand'), select(m.stand, [[null, 'none'], ...STAND_IDS.map((id) => [id, STANDS[id].name])], (v) => { m.stand = v; redo(); })),
    h('div', { class: 'row' }, h('span', { class: 'small' }, 'Cursed technique'), select(m.technique, [[null, 'none'], ...TECHNIQUE_IDS.map((id) => [id, `${TECHNIQUES[id].name} (${TECHNIQUES[id].family})`])], (v) => { m.technique = v; redo(); })),
    h('div', { class: 'row' }, h('span', { class: 'small' }, 'Devil Fruit'), select(m.fruit, [[null, 'none'], ...FRUIT_IDS.map((id) => [id, FRUITS[id].name])], (v) => { m.fruit = v; redo(); })),
    check(m.speedster, 'Speedster', (v) => { m.speedster = v; redo(); }),
    check(m.awaken, `Awaken every power it has (${Object.values(AWAKENINGS).map((a) => a.name).join(', ')})`, (v) => { m.awaken = v; redo(); }),
    h('div', { class: 'sublabel' }, `Quirks (${hpGiven}% of ${MAX_HP_GIVEN}% max HP)`),
    h('div', { class: 'chips' }, QUIRK_IDS.map((id) => chip(`${QUIRKS[id].name} ${QUIRKS[id].cost}%`, m.quirks.includes(id), () => { m.quirks = toggle(m.quirks, id); redo(); }, QUIRKS[id].color, QUIRKS[id].blurb))),
    hpGiven > MAX_HP_GIVEN && h('div', { class: 'small warning' }, `Only the first ones that fit in ${MAX_HP_GIVEN}% come with it.`),
    h('div', { class: 'sublabel' }, 'Legendary mutations'),
    h('div', { class: 'chips' }, MAKER_SOULS.map((id) => chip(LEGENDARY[id].name, m.souls.includes(id), () => { m.souls = toggle(m.souls, id).slice(-3); redo(); }, LEGENDARY[id].color, LEGENDARY[id].passive?.text))),
    h('div', { class: 'small' }, 'Up to 3. Any more its powers need to fit are added for you.'),
    h('div', { class: 'sublabel' }, 'Everything else'),
    h('div', { class: 'row' }, h('span', { class: 'small' }, 'Job'), select(m.job, [[null, 'no job yet'], ...FINAL_FORMS.map((id) => [id, PATHS[id].name])], (v) => { m.job = v; redo(); })),
    h('div', { class: 'row' }, h('span', { class: 'small' }, 'Age'), select(String(m.stage), STAGES.map((s, i) => [String(i), s.name]), (v) => { m.stage = Number(v); redo(); })),
    h('div', { class: 'row' }, h('span', { class: 'small' }, 'Weapon'), select(m.weapon, [[null, 'none'], ...WEAPON_IDS.map((id) => [id, WEAPONS[id].name])], (v) => { m.weapon = v; redo(); })),
    check(m.trained, 'Trained to the limit', (v) => { m.trained = v; redo(); }),
    check(m.trophies, 'Every trophy', (v) => { m.trophies = v; redo(); }),
    preview && h('div', { class: 'ncard' },
      h('div', { class: 'row nowrap' }, canvas,
        h('div', { class: 'grow' },
          h('div', { class: 'nameline' }, m.name || 'Nameless'),
          h('div', { class: 'small' }, `${raceName(preview)}, ${stageOf(preview).name}, ${pathTitle(preview)}. Power ${powerOf(preview)}.`),
          h('div', { class: 'small' }, STAT_KEYS.map((k) => `${STAT_LABELS[k]} ${stats[k]}`).join(', ')),
          preview.souls.length > 0 && h('div', { class: 'small' }, `Legendary: ${preview.souls.map((id) => LEGENDARY[id].name).join(', ')}`),
          awakenedKinds(preview).length > 0 && h('div', { class: 'small' }, `Awakened: ${awakenedKinds(preview).map((k) => AWAKENINGS[k].name).join(', ')}`)))),
    problem && h('div', { class: 'warning' }, problem),
    h('div', { class: 'row gap' },
      button('Make it', () => makeNow(note), 'big hot', !!problem),
      button('Start over', () => {
        note.spec.make = emptyMake();
        redo();
      }, 'big')),
  );
}

async function makeNow(note) {
  const m = note.spec.make;
  if (makeProblem(m)) return;
  const made = await createCreature(m.name, godMake(m));
  await loadVillage();
  note.spec.message = `${made.c.name} is made: ${raceName(made.c)}, power ${powerOf(made.c)}. It is living in your village.`;
  toast(`${made.c.name.toUpperCase()} WAS MADE BY GOD!!!`, 'rare');
  const out = await G.bringOut(made.base, made.c);
  if (out) out.pet.say(`i am ${fullName(made.c)}`, 4, true);
  note.rebuild();
}

// ---------- the God Ring ----------

const rowOf = (id) => G.everyone.find((r) => r.c.id === id) ?? null;

function ringLayout() {
  const { work } = G.screen;
  const r = Math.min(work.h * 0.42, work.w * 0.3);
  return { cx: work.x + work.w / 2, cy: work.y + work.h / 2 + 34, r };
}

function ring(page, note) {
  const st = note.spec.ring;
  st.left = st.left.filter(rowOf);
  st.right = st.right.filter(rowOf);
  const fighting = !!G.bout?.godRing;
  const sideOf = (id) => (st.left.includes(id) ? 'left' : st.right.includes(id) ? 'right' : null);
  // Each click moves a creature along: out, left, right, out.
  const cycle = (id) => {
    const side = sideOf(id);
    st.left = st.left.filter((x) => x !== id);
    st.right = st.right.filter((x) => x !== id);
    if (side === null) st.left.push(id);
    else if (side === 'left' && !st.freeForAll) st.right.push(id);
    note.rebuild();
  };
  const plan = { left: st.left.map((id) => rowOf(id).c), right: st.right.map((id) => rowOf(id).c), monsters: st.monsters, might: st.might, freeForAll: st.freeForAll };
  const problem = ringProblem(plan);
  fill(page,
    h('div', { class: 'small' }, 'Put anyone in the ring against anyone. They fight as copies: nobody gets hurt, nobody dies, and nothing is won or lost.'),
    h('div', { class: 'chips' },
      chip('Two sides', !st.freeForAll, () => { st.freeForAll = false; note.rebuild(); }),
      chip('Everyone for themselves', st.freeForAll, () => {
        st.freeForAll = true;
        st.left = [...st.left, ...st.right];
        st.right = [];
        note.rebuild();
      })),
    h('div', { class: 'sublabel' }, st.freeForAll ? 'Your creatures (click to put one in)' : 'Your creatures (click: left side, again: right side, again: out)'),
    h('div', { class: 'party' }, G.everyone.slice().sort((a, b) => powerOf(b.c) - powerOf(a.c)).map((r) => {
      const side = sideOf(r.c.id);
      return h('button', {
        class: `chip${side ? ' on' : ''}`,
        style: side === 'right' ? '--c:#ff6b5e' : side === 'left' ? '--c:#6fe7ff' : '',
        disabled: fighting,
        title: `${fullName(r.c)}: ${raceName(r.c)}, power ${powerOf(r.c)}`,
        onclick: () => cycle(r.c.id),
      }, `${side === 'left' ? (st.freeForAll ? '● ' : '◀ ') : side === 'right' ? '▶ ' : ''}${r.c.name} (${powerOf(r.c)})`);
    })),
    h('div', { class: 'sublabel' }, st.freeForAll ? 'Monsters and bosses (each fights for itself)' : 'Monsters and bosses, on the right side'),
    h('div', { class: 'chips' }, RING_MONSTER_IDS.map((id) => {
      const n = st.monsters.filter((x) => x === id).length;
      return chip(`${RING_MONSTERS[id].def.name}${n > 1 ? ` x${n}` : ''}`, n > 0, () => {
        st.monsters = n >= 3 ? st.monsters.filter((x) => x !== id) : [...st.monsters, id];
        note.rebuild();
      }, null, RING_MONSTERS[id].def.passive?.text ?? 'Click again for another, up to 3.');
    })),
    h('div', { class: 'row', style: 'margin-top:4px' },
      h('span', { class: 'small' }, st.freeForAll ? 'Monsters this strong' : 'Right side this strong'),
      RING_MIGHT.map((k) => chip(`x${k}`, st.might === k, () => { st.might = k; note.rebuild(); }))),
    !st.freeForAll && h('div', { class: 'small' }, `Left: ${st.left.map((id) => rowOf(id).c.name).join(', ') || 'nobody'}. Right: ${[...st.right.map((id) => rowOf(id).c.name), ...st.monsters.map((id) => RING_MONSTERS[id].def.name)].join(', ') || 'nobody'}.`),
  );
  if (fighting) {
    const bout = G.bout;
    fill(page,
      h('div', { class: 'callout' }, h('div', { class: 'hand' }, bout.done ? (bout.winner ? `${bout.winner.name} wins!` : 'Nobody wins.') : 'Fight!')),
      h('div', { class: 'row gap' }, button(bout.done ? 'Clear the ring' : 'Stop the fight', () => {
        G.bout = null;
        G.boutHide = new Set();
        note.rebuild();
      }, 'big')));
    return;
  }
  fill(page,
    problem && h('div', { class: 'warning' }, problem),
    h('div', { class: 'row gap' }, button('FIGHT', () => {
      if (ringProblem(plan) || G.bout) return;
      G.bout = godRing(plan, { seed: Math.floor(Math.random() * 2 ** 31), ...ringLayout(), sizeMul: G.settings.scale ?? 1 });
      G.boutHide = new Set(G.team.map((m) => m.c.id));
      G.team.forEach((m) => m.pet.interrupt());
      note.spec.message = '';
      note.rebuild();
    }, 'big hot', !!problem || !!G.bout)),
    G.bout && !G.bout.godRing && h('div', { class: 'small' }, 'Finish the fight that is already on first.'),
  );
}

// Called by the game loop when a fight in the God Ring is over.
export function onGodRingEnded(bout) {
  G.fx.shout(bout.cx, bout.cy - bout.r * 0.6, bout.winner ? `${bout.winner.name.toUpperCase()} WINS` : 'NOBODY WINS', '#ffd84a', 26, 3);
  const note = getNote('god');
  if (note) note.spec.message = bout.winner ? `${bout.winner.name} won in the God Ring.` : 'Nobody won in the God Ring.';
  note?.rebuild();
}

// ---------- the tools ----------

async function blessEveryone(note, id) {
  const b = GOD_BLESSINGS[id];
  let changed = 0;
  for (const row of G.everyone) {
    if (!b.apply(row.c)) continue;
    changed += 1;
    await saveAnywhere(row.c, row.base);
  }
  await loadVillage();
  G.onCreatureChanged?.();
  note.spec.message = changed ? `${changed} creature${changed === 1 ? ' is' : 's are'} ${b.text} now.` : `Everyone was already ${b.text}.`;
  note.rebuild();
}

function tools(page, note) {
  const done = (msg) => {
    saveHouse();
    note.spec.message = msg;
    toast(msg.toUpperCase(), 'rare');
    note.rebuild();
  };
  const tool = (name, text, onclick) => h('div', { class: 'way', style: 'margin-top:4px' },
    h('div', { class: 'top' }, h('span', { class: 'plain' }, h('b', null, name)), button('Do it', onclick, 'mini hot')),
    h('div', { class: 'small' }, text));
  fill(page,
    h('div', { class: 'small' }, `The household: ${big(G.house.bank.gems)} gems, ${Math.floor(G.house.ore)} ore. The Negative: ${big(G.neg.shards)} Void Shards, ${big(G.neg.stones ?? 0)} Ascension Stones.`),
    h('div', { class: 'sect' }, 'For the household'),
    tool('Rain gems', `${big(GOD_GIFTS.gems)} gems, straight into the bank.`, () => { godRain(G.house); done(`+${big(GOD_GIFTS.gems)} gems`); }),
    tool('Fill the forge', 'All the Legendary ore the forge can hold.', () => { godForge(G.house); done('The forge is full of ore'); }),
    tool('Open the bag', `${GOD_GIFTS.items} more of every item, Ascension items too.`, () => { godBag(G.house); done(`+${GOD_GIFTS.items} of every item`); }),
    tool('Call everyone home', 'Every expedition comes back right now, with whatever it found.', () => { godRecall(G.house); done('Every expedition is on its way home'); }),
    tool('Fill the Negative', `${big(GOD_GIFTS.shards)} Void Shards and ${GOD_GIFTS.stones} Ascension Stones.`, () => {
      godNegative(G.neg);
      saveNeg();
      done(`+${big(GOD_GIFTS.shards)} Void Shards, +${GOD_GIFTS.stones} Ascension Stones`);
    }),
    h('div', { class: 'sect' }, `For every creature (${G.everyone.length})`),
    GOD_BLESSING_IDS.map((id) => tool(GOD_BLESSINGS[id].name, `Everyone, ${GOD_BLESSINGS[id].text}.`, () => blessEveryone(note, id))),
  );
}
