// Puzzle duels against your creature. It gets better as its Wits and job improve.

import { G, saveCreature } from '../state.js';
import { h, fill, button, openNote } from './notes.js';
import { pathChoice } from '../core/creature.js';
import {
  duelSkill, nimMove, newFour, fourDrop, fourMove, fourWinner, fourLegal, FOUR_COLS, FOUR_ROWS,
  makeLights, lightsPress, lightsSolved, lightsDelay, echoRecallChance, applyDuelResult,
} from '../sim/puzzles.js';

const PUZZLES = [
  { id: 'four', name: 'Four Stones', blurb: 'Drop stones. Four in a row wins.', run: playFour },
  { id: 'sticks', name: 'Stick Pile', blurb: 'Take 1 to 3. Whoever takes the last stick loses.', run: playSticks },
  { id: 'lights', name: 'Light Race', blurb: 'Same board, both of you. First to turn every light off.', run: playLights },
  { id: 'echo', name: 'Echo', blurb: 'Repeat the pattern. It repeats one too. First to slip loses.', run: playEcho },
];

const TAUNTS = {
  start: ['i have been practising', 'do your worst', 'i am very smart', 'ok go'],
  win: ['HA', 'i knew it', 'too easy', 'get better'],
  lose: ['how', 'i will remember this', 'you cheated', 'again. now.'],
};
const taunt = (key) => TAUNTS[key][Math.floor(Math.random() * TAUNTS[key].length)];

export function openDuel() {
  const c = G.creature;
  const pet = G.pet;
  pet.interrupt();
  pet.still = true;
  openNote('duel', {
    title: `Puzzle duel with ${c.name}`,
    width: 346,
    cls: 'paper',
    // The duel stays with this creature, even while you look after another.
    c,
    pet,
    onClose: () => { pet.still = false; },
    build(body, note) {
      pet.still = true;
      fill(body, 
        h('div', { class: 'small', style: 'margin-bottom:6px' }, `Its puzzle skill: ${Math.round(duelSkill(c) * 100)} of 100. Raised by Wits.`),
        PUZZLES.map((p) => h('button', {
          class: 'pathcard',
          style: 'display:block;width:100%;margin-bottom:6px',
          onclick: () => startPuzzle(note, p),
        }, h('h4', null, p.name), h('p', { style: 'margin:0' }, p.blurb))),
      );
    },
  });
}

function startPuzzle(note, puzzle) {
  const { c, pet } = note.spec;
  note.body.replaceChildren();
  note.setTitle(puzzle.name);
  const says = h('div', { class: 'says' }, '');
  const stage = h('div', null);
  note.body.append(says, stage);
  pet.still = true;
  pet.say(taunt('start'), 2.5);
  const ctx = {
    note,
    c,
    pet,
    stage,
    says: (text) => { says.textContent = text; },
    skill: duelSkill(c),
    alive: () => note.alive && !ctx.over,
    over: false,
    finish: (result) => finishDuel(ctx, puzzle, result),
    later(fn, ms) {
      setTimeout(() => { if (ctx.alive()) fn(); }, ms);
    },
  };
  puzzle.run(ctx);
}

function finishDuel(ctx, puzzle, result) {
  if (ctx.over) return;
  ctx.over = true;
  const { note, c, pet } = ctx;
  let line;
  if (result === 'draw') {
    pet.say('hm', 2);
    line = 'A draw. Nobody learned anything.';
  } else {
    const playerWon = result === 'player';
    const { xp } = applyDuelResult(c, playerWon, puzzle.id);
    saveCreature(c);
    pet.say(taunt(playerWon ? 'lose' : 'win'), 3, true);
    line = playerWon ? `You win. ${c.name} learned from it (+${Math.round(xp)} XP).` : `${c.name} wins (+${Math.round(xp)} XP). It is unbearable about it.`;
    G.fx.float(pet.x, pet.y - 110, `+${Math.round(xp)} XP`, '#ffe680', 16);
    G.onCreatureChanged?.();
  }
  ctx.says(line);
  ctx.stage.append(h('div', { class: 'row gap' },
    button('Rematch', () => startPuzzle(note, puzzle), 'big hot'),
    button('Other puzzle', () => {
      note.setTitle(`Puzzle duel with ${c.name}`);
      note.rebuild();
    }, 'big'),
  ));
  if (pathChoice(c)) G.onPathReady?.(c);
}

// ---------- Four Stones ----------

function playFour(ctx) {
  let board = newFour();
  let locked = false;
  const cells = [];
  const grid = h('div', { class: 'fourboard' });
  for (let i = 0; i < FOUR_COLS * FOUR_ROWS; i++) {
    const col = i % FOUR_COLS;
    const cell = h('button', { class: 'fourcell', onclick: () => player(col) });
    cells.push(cell);
    grid.append(cell);
  }
  ctx.stage.append(grid);
  ctx.says('You are red, it is gold. Your move.');

  const paint = (win) => {
    cells.forEach((cell, i) => {
      cell.className = `fourcell${board[i] === 1 ? ' p' : board[i] === -1 ? ' c' : ''}`;
    });
    win?.cells.forEach((i) => cells[i].classList.add('win'));
  };

  const ended = () => {
    const win = fourWinner(board);
    if (win) {
      paint(win);
      ctx.finish(win.who === 1 ? 'player' : 'creature');
      return true;
    }
    if (!fourLegal(board).length) {
      ctx.finish('draw');
      return true;
    }
    return false;
  };

  function player(col) {
    if (locked || ctx.over || !fourLegal(board).includes(col)) return;
    board = fourDrop(board, col, 1).board;
    paint();
    if (ended()) return;
    locked = true;
    ctx.says('It is thinking...');
    ctx.later(() => {
      const move = fourMove(board, -1, ctx.skill);
      board = fourDrop(board, move, -1).board;
      paint();
      if (ended()) return;
      locked = false;
      ctx.says('Your move.');
    }, 480);
  }
}

// ---------- Stick Pile ----------

function playSticks(ctx) {
  let n = 13 + Math.floor(Math.random() * 9);
  const pile = h('div', { class: 'piles' });
  const buttons = [1, 2, 3].map((k) => button(`Take ${k}`, () => take(k), 'big'));
  ctx.stage.append(pile, h('div', { class: 'row' }, buttons));

  const paint = () => {
    pile.replaceChildren(...Array.from({ length: n }, (_, i) => h('i', { class: 'stick', style: `--r:${((i * 37) % 15) - 7}deg` })));
    buttons.forEach((b, i) => { b.disabled = ctx.over || i + 1 > n; });
  };
  paint();
  ctx.says(`${n} sticks. Do not take the last one. You first.`);

  function take(k) {
    if (ctx.over || k > n) return;
    n -= k;
    paint();
    if (n === 0) {
      ctx.finish('creature');
      return;
    }
    buttons.forEach((b) => { b.disabled = true; });
    ctx.says('It is counting on its fingers...');
    ctx.later(() => {
      const move = nimMove(n, ctx.skill);
      n -= move;
      paint();
      if (n === 0) {
        ctx.finish('player');
        return;
      }
      ctx.says(`It took ${move}. ${n} left.`);
    }, 800);
  }
}

// ---------- Light Race ----------

function playLights(ctx) {
  const size = ctx.skill > 0.7 ? 5 : 4;
  const { board: start, solution } = makeLights(size, 4 + Math.floor(ctx.skill * 4));
  let mine = start.slice();
  let theirs = start.slice();
  const todo = solution.slice();
  const myCells = [];
  const aiCells = [];
  const myGrid = h('div', { class: 'lights', style: `grid-template-columns:repeat(${size},40px)` });
  const aiGrid = h('div', { class: 'lights ai', style: `grid-template-columns:repeat(${size},16px)` });
  for (let i = 0; i < size * size; i++) {
    const cell = h('button', {
      class: 'light',
      onclick: () => {
        if (ctx.over) return;
        mine = lightsPress(mine, size, i);
        paint();
        if (lightsSolved(mine)) ctx.finish('player');
      },
    });
    myCells.push(cell);
    myGrid.append(cell);
    const small = h('div', { class: 'light' });
    aiCells.push(small);
    aiGrid.append(small);
  }
  ctx.stage.append(h('div', { class: 'lightpair' }, myGrid, h('div', { class: 'center small' }, 'Theirs', aiGrid)));
  ctx.says('Pressing a light flips it and its neighbours. Go!');

  const paint = () => {
    mine.forEach((v, i) => myCells[i].classList.toggle('on', !!v));
    theirs.forEach((v, i) => aiCells[i].classList.toggle('on', !!v));
  };
  paint();

  const step = () => {
    if (!todo.length) return;
    // A careless creature hits the wrong light, and now has to undo it too.
    let press;
    if (Math.random() < (1 - ctx.skill) * 0.22) {
      press = Math.floor(Math.random() * size * size);
      const seen = todo.indexOf(press);
      if (seen >= 0) todo.splice(seen, 1);
      else todo.push(press);
    } else {
      press = todo.splice(Math.floor(Math.random() * todo.length), 1)[0];
    }
    theirs = lightsPress(theirs, size, press);
    paint();
    if (lightsSolved(theirs)) {
      ctx.finish('creature');
      return;
    }
    ctx.later(step, lightsDelay(ctx.skill));
  };
  ctx.later(step, lightsDelay(ctx.skill) + 600);
}

// ---------- Echo ----------

const RUNES = [
  { glyph: 'A', color: '#ff7b6b' },
  { glyph: 'B', color: '#7fd65a' },
  { glyph: 'C', color: '#6ab8ff' },
  { glyph: 'D', color: '#ffd24a' },
];

function playEcho(ctx) {
  let length = 3;
  let seq = [];
  let index = 0;
  let accepting = false;
  const pads = RUNES.map((r, i) => h('button', {
    class: 'rune',
    style: `background:${r.color};--c:${r.color}`,
    onclick: () => press(i),
  }, r.glyph));
  ctx.stage.append(h('div', { class: 'runes' }, pads));

  const flash = (i, ms = 300) => {
    pads[i].classList.add('lit');
    setTimeout(() => pads[i].classList.remove('lit'), ms);
  };

  function play(list, then) {
    let k = 0;
    const next = () => {
      if (k >= list.length) {
        then();
        return;
      }
      flash(list[k]);
      k++;
      ctx.later(next, 480);
    };
    ctx.later(next, 450);
  }

  const newSeq = () => Array.from({ length }, () => Math.floor(Math.random() * 4));

  function yourTurn() {
    seq = newSeq();
    accepting = false;
    ctx.says(`Watch. ${length} runes.`);
    play(seq, () => {
      index = 0;
      accepting = true;
      ctx.says('Your turn. Repeat it.');
    });
  }

  function press(i) {
    if (!accepting || ctx.over) return;
    flash(i, 160);
    if (i !== seq[index]) {
      accepting = false;
      ctx.finish('creature');
      return;
    }
    index++;
    if (index === seq.length) {
      accepting = false;
      ctx.says('Right. Now it has to do one.');
      ctx.later(creatureTurn, 650);
    }
  }

  function creatureTurn() {
    const theirs = newSeq();
    ctx.says(`It is watching ${length} runes...`);
    play(theirs, () => {
      const remembered = Math.random() < echoRecallChance(length, ctx.skill);
      const replay = remembered ? theirs : slip(theirs);
      ctx.says('It is repeating them...');
      play(replay, () => {
        if (!remembered) {
          ctx.says('It slipped!');
          ctx.finish('player');
          return;
        }
        length++;
        if (length > 16) {
          ctx.finish('draw');
          return;
        }
        ctx.later(yourTurn, 550);
      });
    });
  }

  const slip = (list) => {
    const out = list.slice();
    const at = Math.floor(Math.random() * out.length);
    out[at] = (out[at] + 1 + Math.floor(Math.random() * 3)) % 4;
    return out;
  };

  yourTurn();
}
