// Search everything: type a word and jump to the menu, tab or page it lives in. What is searched is
// in core/search.js; this is the note.

import { G } from '../state.js';
import { h, fill, openNote, closeNote, getNote, lazyKeys } from './notes.js';
import { searchIndex, searchFor } from '../core/search.js';
import { awayBases } from '../core/village.js';

const KIND_LABEL = {
  place: 'Menu', race: 'Race', monster: 'Monster', power: 'Power', gift: 'Gift', item: 'Item', job: 'Job', mutation: 'Mutation', level: 'Level', creature: 'Creature',
};

// Your own creatures can be found by name too.
function yourCreatures() {
  const away = awayBases(G.house);
  return (G.everyone ?? []).map((r) => ({
    name: r.c.name,
    place: G.team.some((m) => m.base === r.base) ? 'on your screen' : away.has(r.base) ? 'away' : 'in the village',
  }));
}

// Opens what a result points at, and a creature result opens the roster on its name. The search
// stays open, so you can go on to the next thing.
function go(result) {
  G.open(result.go);
  if (result.find) {
    const roster = getNote('creatures');
    if (roster) {
      roster.spec.search = result.find;
      roster.rebuild();
    } else {
      // The roster loads its creatures first, so it can be a moment before it is there.
      setTimeout(() => {
        const later = getNote('creatures');
        if (!later) return;
        later.spec.search = result.find;
        later.rebuild();
      }, 300);
    }
  }
}

function resultRows(found) {
  return found.map((r) => h('button', { class: 'searchrow', onclick: () => go(r) },
    h('span', { class: 'searchname' }, r.name),
    h('span', { class: 'searchkind' }, KIND_LABEL[r.kind] ?? ''),
    h('span', { class: 'small searchwhere' }, r.where)));
}

// The little search box beside a creature's name, in its menu's title bar. Results drop down under
// it and stay there while you open one thing after another; Escape or clearing the box puts them away.
export function searchBox() {
  const drop = h('div', { class: 'searchdrop', style: 'display:none' });
  const input = lazyKeys(h('input', { type: 'search', placeholder: 'Search', spellcheck: false, title: 'Find any menu, monster, race, power, item or creature, and open it' }));
  const show = () => {
    const q = input.value;
    if (!q.trim()) {
      drop.style.display = 'none';
      drop.replaceChildren();
      return;
    }
    const found = searchFor(q, searchIndex(yourCreatures()), 20);
    drop.replaceChildren();
    fill(drop, found.length ? resultRows(found) : h('div', { class: 'small' }, 'Nothing by that name.'));
    drop.style.display = '';
  };
  input.addEventListener('input', show);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const first = searchFor(input.value, searchIndex(yourCreatures()))[0];
      if (first) go(first);
    }
    if (e.key === 'Escape') {
      input.value = '';
      show();
    }
  });
  return h('div', { class: 'headsearch' }, input, drop);
}

export function openSearch() {
  const old = getNote('search')?.spec;
  openNote('search', {
    title: 'Search everything',
    cls: 'paper',
    width: 360,
    focus: true,
    query: old?.query ?? '',
    build(body, note) {
      const index = searchIndex(yourCreatures());
      const list = h('div', { class: 'scrollnote', style: 'max-height:min(420px, calc(100vh - 200px));margin-top:6px' });
      const show = () => {
        const q = note.spec.query;
        const found = searchFor(q, index);
        list.replaceChildren();
        if (!q.trim()) {
          fill(list, h('div', { class: 'small' }, 'Type anything: a menu or tab, a monster, a race, a power, a gift, an item, a job, an Adventure level, or one of your creatures. Enter opens the top one, and this stays open.'));
          return;
        }
        if (!found.length) {
          fill(list, h('div', { class: 'small' }, 'Nothing by that name.'));
          return;
        }
        fill(list, resultRows(found));
      };
      const input = h('input', { type: 'search', placeholder: 'Find anything', spellcheck: false, value: note.spec.query });
      // Only the list is redrawn while typing, so the box keeps its place and its focus.
      input.addEventListener('input', () => {
        note.spec.query = input.value;
        show();
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const first = searchFor(note.spec.query, index)[0];
          if (first) go(first);
        }
        if (e.key === 'Escape') closeNote('search');
      });
      fill(body, input, list);
      show();
      setTimeout(() => input.focus(), 0);
    },
  });
}
