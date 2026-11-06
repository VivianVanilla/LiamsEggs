// Search everything: it finds every kind of thing, and points each one somewhere real.

import test from 'node:test';
import assert from 'node:assert/strict';
import { searchIndex, searchFor } from '../src/core/search.js';
import { RACES } from '../src/data/races.js';
import { DEADLY_MONSTERS, TRAINING_MONSTERS } from '../src/data/monsters.js';
import { LEGENDARY, STANDS, TRAITS } from '../src/data/powers.js';
import { ITEMS } from '../src/data/items.js';
import { EXPEDITIONS } from '../src/data/village.js';

// Every name G.open() understands (ui/panels.js), and the Codex pages (ui/codex.js).
const OPENS = new Set(['menu', 'mine', 'rename', 'feed', 'farm', 'workshop', 'powers', 'plan', 'sheet', 'adventure', 'challenges', 'ultimates',
  'arena', 'duel', 'creatures', 'nursery', 'village', 'guide', 'settings', 'search']);
const TABS = {
  workshop: ['dye', 'charms', 'paint', 'forge'], nursery: ['breed', 'eggs', 'bag', 'altar'], village: ['work', 'mine', 'expeditions'],
  guide: ['start', 'stats', 'chances', 'breeding', 'codex', ...['races', 'jobs', 'gifts', 'mutations', 'powers', 'gear', 'monsters', 'adventure'].map((p) => `codex/${p}`)],
};

test('everything can be found, and each points at a real place', () => {
  const index = searchIndex([{ name: 'Garlic', place: 'in the village' }]);
  index.forEach((e) => {
    const [key, tab] = e.go.split(':');
    assert.ok(OPENS.has(key), `${e.name} goes to ${e.go}`);
    if (tab) assert.ok(TABS[key]?.includes(tab), `${e.name} goes to the ${tab} tab of ${key}`);
    assert.ok(e.name && e.where, `${e.go} has a name and says where`);
  });
  const names = new Set(index.map((e) => e.name));
  const all = [
    ...Object.values(RACES).filter((r) => r.name !== 'Half-devil'), ...Object.values(DEADLY_MONSTERS), ...Object.values(TRAINING_MONSTERS),
    ...Object.values(LEGENDARY), ...Object.values(STANDS), ...Object.values(TRAITS), ...Object.values(ITEMS), ...Object.values(EXPEDITIONS),
  ];
  all.forEach((x) => assert.ok(names.has(x.name), `${x.name} can be found`));
});

test('the best match comes first', () => {
  const index = searchIndex([{ name: 'Garlic', place: 'in the village' }]);
  const top = (q) => searchFor(q, index)[0];
  assert.equal(top('altar').go, 'nursery:altar');
  assert.equal(top('Bloodline').name, 'Bloodline Altar');
  assert.equal(top('vamp').name, 'Vampire');
  assert.equal(top('legendary exp').name, 'Legendary Expander');
  assert.equal(top('ultimate').go, 'ultimates');
  assert.equal(top('garlic').find, 'Garlic', 'your own creatures by name');
  assert.equal(top('THE LAST dragon').name, 'The Last Dragon', 'case and spacing don\'t matter');
  assert.deepEqual(searchFor('', index), []);
  assert.deepEqual(searchFor('zzzzqqq', index), []);
  // Every word has to match something.
  assert.ok(searchFor('vampire ruins', index).every((e) => /vampire|ruins/i.test(`${e.name} ${e.where} ${e.words}`)));
});
