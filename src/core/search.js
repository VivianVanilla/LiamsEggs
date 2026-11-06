// Search everything: every menu, tab and page, and every race, monster, power, item and the rest,
// each pointing at the place in the game where it lives. Built from the same data the game uses,
// so a new monster or race turns up here by itself. No DOM, so tests can run it.
// `go` is a name G.open() understands (ui/panels.js openAny), like 'nursery:altar' or 'guide:codex/races'.

import { RACES } from '../data/races.js';
import { TRAINING_MONSTERS, DEADLY_MONSTERS } from '../data/monsters.js';
import { LEGENDARY, STANDS, TECHNIQUES, QUIRKS, TRAITS } from '../data/powers.js';
import { FRUITS } from '../data/fruits.js';
import { ITEMS } from '../data/items.js';
import { WEAPONS } from '../data/forge.js';
import { CHARMS, PAINTS, CROPS } from '../data/crafting.js';
import { PATHS } from '../data/paths.js';
import { MUTATIONS } from '../data/mutations.js';
import { EXPEDITIONS, EXPEDITION_KINDS } from '../data/village.js';
import { ADVENTURE_LEVELS } from '../data/adventure.js';

// [name, where it is, where to go, more words it should be found by]
const PLACES = [
  ['Menu', 'The creature you are looking after', 'menu', 'main stats home'],
  ['Snack', 'Care, Feed', 'feed', 'food feed eat free hungry fullness'],
  ['Mine colors', 'Menu', 'mine', 'dig colors screen spot'],
  ['Rename', 'Menu', 'rename', 'name'],
  ['Feed', 'Care', 'feed', 'food farmed plants eat mutations'],
  ['Farm', 'Menu', 'farm', 'fields crops animals plants water harvest larder'],
  ['Dye', 'Care, Gear', 'workshop:dye', 'color colour body wash'],
  ['Charms', 'Care, Gear', 'workshop:charms', 'craft gems wear necklace'],
  ['Paint', 'Care, Gear', 'workshop:paint', 'war paint next fight'],
  ['Forge', 'Care, Gear', 'workshop:forge', 'weapons ore armory'],
  ['Powers', 'Powers', 'powers', 'stand speedster technique quirk devil fruit legendary race gifts'],
  ['Battle plan', 'Powers', 'plan', 'stance moves fight plan target turn off'],
  ['What it has', 'Powers', 'sheet', 'sheet everything stats where from limits damage'],
  ['Adventure', 'Fight', 'adventure', 'levels party bosses chapters acts'],
  ['Challenges', 'Fight', 'challenges', 'training monsters deadly trophies death'],
  ['Legendary road', 'Fight, Challenges', 'challenges', 'legendary mutations souls'],
  ['Ultimate road', 'Fight, beside Challenges', 'ultimates', 'ultimate monsters'],
  ['Be reborn', 'Fight, Ultimate road', 'ultimates', 'reborn rebirth absorb start over'],
  ['Arena', 'Fight', 'arena', 'fight boards import friends'],
  ['Duel', 'Menu', 'duel', 'puzzle'],
  ['Your creatures', 'Home', 'creatures', 'roster list sort graveyard let go bring out'],
  ['Breed', 'Home, Nursery', 'nursery:breed', 'baby parents mega breeder pass on'],
  ['Eggs', 'Home, Nursery', 'nursery:eggs', 'roll hatch hyper roll new creature'],
  ['Items', 'Home, Nursery', 'nursery:bag', 'bag loot use expander key'],
  ['Bloodline Altar', 'Home, Nursery', 'nursery:altar', 'sacrifice race eggs'],
  ['Village', 'Home', 'village:work', 'work villagers jobs'],
  ['Legendary Mine', 'Home, Village', 'village:mine', 'ore miners'],
  ['Expeditions', 'Home, Village', 'village:expeditions', 'sea bizarre party send'],
  ['Guide', 'Help', 'guide:start', 'help start here how'],
  ['Stats', 'Help, Guide', 'guide:stats', 'might guard speed wits vigor limits caps'],
  ['Chances', 'Help, Guide', 'guide:chances', 'odds luck percent rates'],
  ['Breeding guide', 'Help, Guide', 'guide:breeding', 'pass on what babies get'],
  ['Codex', 'Help, Guide', 'guide:codex', 'everything list all'],
  ['Settings', 'Help', 'settings', 'options size sound calm screen'],
];

// The Codex pages, with their own names.
const CODEX = [
  ['races', 'Races'], ['jobs', 'Jobs'], ['gifts', 'Gifts'], ['mutations', 'Mutations'], ['powers', 'Powers'],
  ['gear', 'Gear and loot'], ['monsters', 'Monsters'], ['adventure', 'Adventure'],
];

const entry = (name, where, go, words = '', kind = '') => ({ name, where, go, kind, words: words.toLowerCase() });

// Everything there is to find. `creatures` adds your own creatures by name: [{ name, place }].
export function searchIndex(creatures = []) {
  const out = PLACES.map(([name, where, go, words]) => entry(name, where, go, words, 'place'));
  CODEX.forEach(([id, label]) => out.push(entry(`Codex: ${label}`, 'Help, Guide, Codex', `guide:codex/${id}`, label, 'place')));

  Object.entries(RACES).filter(([id]) => id !== 'halfdevil').forEach(([, r]) => out.push(entry(r.name, 'Race, in the Codex', 'guide:codex/races', `race ${r.from} ${r.passive?.text ?? ''}`, 'race')));
  Object.entries(EXPEDITIONS).forEach(([, e]) => out.push(entry(e.name, `${EXPEDITION_KINDS[e.kind]}, Village`, 'village:expeditions',
    `expedition ${e.kind} ${Object.keys(e.finds).map((r) => RACES[r].name).join(' ')}`, 'place')));
  Object.values(TRAINING_MONSTERS).forEach((m) => out.push(entry(m.name, 'Training monster, Challenges', 'challenges', `monster training ${m.stat}`, 'monster')));
  Object.values(DEADLY_MONSTERS).forEach((m) => {
    const where = m.ultimate ? 'Ultimate monster, Ultimate road' : m.road === 'legend' ? 'Legendary road, Challenges' : 'Deadly monster, Challenges';
    out.push(entry(m.name, where, m.ultimate ? 'ultimates' : 'challenges', `monster deadly ${m.trophy ?? ''} ${m.soul ? LEGENDARY[m.soul].name : ''}`, 'monster'));
  });
  Object.values(LEGENDARY).forEach((l) => out.push(entry(l.name, 'Legendary mutation, from Challenges', 'challenges', 'legendary soul mutation', 'power')));
  Object.values(STANDS).forEach((s) => out.push(entry(s.name, 'Stand, Powers', 'powers', 'stand jojo wits', 'power')));
  Object.values(TECHNIQUES).forEach((t) => out.push(entry(t.name, `Cursed technique of the ${t.family} family, Powers`, 'powers', `technique cursed ${t.family}`, 'power')));
  Object.values(QUIRKS).forEach((q) => out.push(entry(q.name, 'Quirk, Powers', 'powers', 'quirk', 'power')));
  Object.values(FRUITS).forEach((f) => out.push(entry(f.name, `Devil Fruit (${f.type}), Powers`, 'powers', 'devil fruit', 'power')));
  out.push(entry('Speedster', 'Powers', 'powers', 'speed fast', 'power'));
  Object.values(TRAITS).forEach((t) => out.push(entry(t.name, 'Gift, in the Codex', 'guide:codex/gifts', 'gift trait born bred earned', 'gift')));
  Object.values(ITEMS).forEach((i) => out.push(entry(i.name, 'Item, Nursery', 'nursery:bag', `item loot ${i.text}`, 'item')));
  Object.values(WEAPONS).forEach((w) => out.push(entry(w.name, 'Weapon, Forge', 'workshop:forge', 'weapon forge ore', 'item')));
  Object.values(CHARMS).forEach((c) => out.push(entry(c.name, 'Charm, Gear', 'workshop:charms', 'charm craft', 'item')));
  Object.values(PAINTS).forEach((p) => out.push(entry(p.name, 'Paint, Gear', 'workshop:paint', `paint ${p.text}`, 'item')));
  Object.values(CROPS).forEach((c) => out.push(entry(c.name, 'Crop, Farm', 'farm', `crop plant seed ${c.grows}`, 'item')));
  Object.values(PATHS).forEach((p) => out.push(entry(p.name, 'Job, in the Codex', 'guide:codex/jobs', 'job path', 'job')));
  Object.values(MUTATIONS).forEach((m) => out.push(entry(m.name, 'Mutation, in the Codex', 'guide:codex/mutations', `mutation ${m.family}`, 'mutation')));
  ADVENTURE_LEVELS.forEach((l, i) => out.push(entry(l.name, `Adventure level ${i + 1}`, 'adventure', `adventure level ${i + 1}`, 'level')));
  creatures.forEach((c) => out.push({ ...entry(c.name, `Your creature${c.place ? `, ${c.place}` : ''}`, 'creatures', 'creature mine', 'creature'), find: c.name }));
  return out;
}

const norm = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();

// The best matches for what was typed, best first. Every word typed has to be found somewhere;
// the name counts most, then where it is, then the other words.
export function searchFor(query, index, limit = 30) {
  const words = norm(query).split(' ').filter(Boolean);
  if (!words.length) return [];
  const whole = words.join(' ');
  const scored = [];
  for (const e of index) {
    const name = norm(e.name);
    const nameWords = name.split(' ');
    const rest = `${norm(e.where)} ${norm(e.words)}`;
    let score = 0;
    let ok = true;
    for (const w of words) {
      if (nameWords.some((n) => n.startsWith(w))) score += 10;
      else if (name.includes(w)) score += 6;
      else if (rest.split(' ').some((n) => n.startsWith(w))) score += 3;
      else if (rest.includes(w)) score += 1;
      else {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    if (name === whole) score += 40;
    else if (name.startsWith(whole)) score += 20;
    // Menus and tabs first when it's a tie.
    if (e.kind === 'place') score += 2;
    scored.push({ e, score });
  }
  scored.sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name));
  return scored.slice(0, limit).map((s) => s.e);
}
