// The endgame in a hidden window: past Chapter ???, the Negative's auto roll, crossing over with a
// Hatsu, Ascension crafting, the Elite Negative, the God Chapter and God Mode. A throwaway save folder,
// like test/e2e.cjs, so nothing touches your real world.
// Run: electron test/e2e-endgame.cjs <folder for screenshots>

const path = require('path');
const fs = require('fs');
const os = require('os');

const SHOTS = path.resolve(process.argv.find((a, i) => i > 1 && !a.startsWith('-') && !a.endsWith('.cjs')) ?? path.join(os.tmpdir(), 'creature-endgame-shots'));
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'creature-e2e-'));
process.env.CREATURE_TEST = '1';
process.env.CREATURE_FAKE_SCREEN = '1';
process.env.CREATURE_HOME = HOME;
process.env.CREATURE_ART = path.join(HOME, 'test-art');

const { app } = require('electron');

app.setPath('userData', path.join(HOME, 'userdata'));
fs.mkdirSync(SHOTS, { recursive: true });

const main = require('../main.cjs');

const results = [];
const pageErrors = [];
const ok = (name, cond, extra = '') => {
  results.push({ name, pass: !!cond });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`);
};
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

let win;
const js = (code) => win.webContents.executeJavaScript(code, true);
async function shot(name) {
  await win.webContents.capturePage(undefined, { stayHidden: true });
  await sleep(120);
  const img = await win.webContents.capturePage(undefined, { stayHidden: true });
  fs.writeFileSync(path.join(SHOTS, `${name}.png`), img.toPNG());
}
const waitFor = async (expr, ms = 8000) => {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (await js(`!!(${expr})`)) return true;
    await sleep(50);
  }
  return false;
};
// Like waitFor, for checks that wait on the save folder, whose answer comes back as a promise.
const waitForFiles = async (expr, ms = 8000) => {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (await js(expr) === true) return true;
    await sleep(50);
  }
  return false;
};
const clickText = (scope, text) => js(`(() => {
  const el = [...document.querySelectorAll('${scope} button')].find((b) => b.textContent.trim().startsWith(${JSON.stringify(text)}));
  if (!el) return 'no button: ' + ${JSON.stringify(text)};
  if (el.disabled) return 'disabled: ' + ${JSON.stringify(text)};
  el.click();
  return true;
})()`);
// Runs simulation time much faster than real time.
const fastForward = async (seconds) => {
  const chunks = Math.ceil(seconds / 2);
  for (let i = 0; i < chunks; i++) {
    await js(`(() => { for (let i = 0; i < 60; i++) window.__game.update(1/30); window.__game.draw(); })()`);
    await sleep(5);
  }
};

async function run() {
  win = main.getWindow();
  win.webContents.on('console-message', (e) => {
    const line = `${e.message ?? ''}`;
    if ((e.level === 'error' || e.level === 3) && line) pageErrors.push(line);
  });
  await new Promise((r) => { if (win.webContents.isLoading()) win.webContents.once('did-finish-load', r); else r(); });
  ok('page loaded with all modules', await waitFor('window.__game'));
  ok('egg falls, naming note appears', await waitFor(`document.querySelector('.note input')`));
  await js(`(() => { document.querySelector('.note input').value = 'Bobbo'; return true; })()`);
  await clickText('.note', 'Hatch it');
  ok('hatches', await waitFor('window.__game.G.pet', 6000));
  await sleep(300);

  // --- past Chapter ???: the Negative's eggs, crossing over, the Elite Negative, Ascension, the God Chapter and God Mode ---
  const noteTitled = (title) => `[...document.querySelectorAll('.note')].find((n) => n.querySelector('.note-title')?.textContent === ${JSON.stringify(title)})`;
  const negNote = noteTitled('The Negative Dimension');
  await js(`(async () => {
    const { closeAllNotes } = await import('./ui/notes.js');
    closeAllNotes();
    const { newNegCreature, negEggFromId, setHatsu, chooseClass } = await import('./core/negative.js');
    const { NEG_LEVEL_COUNT } = await import('./data/negative.js');
    const G = window.__game.G;
    G.house.universe = { resets: 1, abyssBest: 25, godBest: 0, lastReset: Date.now() };
    G.neg.shards = 5000;
    G.neg.stones = 12;
    const nc = newNegCreature('Gon', negEggFromId('00000000000000aa'));
    chooseClass(nc, 'monk');
    setHatsu(nc, 'enhancer', 'rock', 'Jajanken');
    nc.best = NEG_LEVEL_COUNT;
    G.neg.creatures.push(nc);
    G.open('negative:eggs');
    return true;
  })()`);
  ok('the Negative opens on its eggs', await waitFor(`!!${negNote} && ${negNote}.textContent.includes('Auto roll')`));
  await js(`(() => { const n = ${negNote}; [...n.querySelectorAll('button.chip')].find((b) => b.textContent === 'Voidling').click(); return true; })()`);
  await sleep(100);
  const shardsBefore = await js('window.__game.G.neg.shards');
  ok('auto roll runs once something is picked', (await clickText('.note.void', 'Auto roll')) === true);
  await sleep(150);
  ok('and lands a Voidling for some Void Shards', await js(`(() => { const G = window.__game.G; return G.neg.shards < ${shardsBefore} && ${negNote}.textContent.includes('Got it in'); })()`));
  await shot('47-negative-autoroll');
  await js(`window.__game.G.open('negative:cross')`);
  ok('crossing over offers to turn its Hatsu into a gift', await waitFor(`${negNote}.textContent.includes('Turn its Hatsu, Jajanken')`));
  await shot('48-negative-cross');
  const filesBeforeCross = await js('window.api.listCreatures().then((list) => list.length)');
  await js(`(() => { const b = [...${negNote}.querySelectorAll('.rosterrow button')].find((x) => x.textContent.startsWith('Cross over')); b.click(); b.click(); return true; })()`);
  ok('it crosses over with its Hatsu in its blood', await waitForFiles(`window.api.listCreatures().then((list) => list.length === ${filesBeforeCross} + 1 && list.some((f) => f.text.includes('hatsurock')))`));
  await js(`window.__game.G.open('negative:ascension')`);
  ok('the Ascension tab is open past Chapter ???', await waitFor(`${negNote}.textContent.includes('Requiem Arrow')`));
  ok('it crafts a Requiem Arrow from stones', (await clickText('.note.void', 'Craft a Requiem Arrow')) === true && await waitFor(`(window.__game.G.house.items.requiemarrow ?? 0) === 1 && window.__game.G.neg.stones === 9`));
  await shot('49-negative-ascension');
  await js(`window.__game.G.open('negative:elite')`);
  ok('the Elite Negative is under its Adventure', await waitFor(`${negNote}.textContent.includes('E1. Under the Floor')`));
  await shot('50-negative-elite');
  await js(`(async () => {
    const { closeAllNotes } = await import('./ui/notes.js');
    closeAllNotes();
    window.__game.G.open('adventure');
    return true;
  })()`);
  const advNote = noteTitled('Adventure');
  ok('Adventure says there is more in the Negative, and opens the God Chapter', await waitFor(`!!${advNote} && ${advNote}.textContent.includes('There is more in the Negative') && ${advNote}.textContent.includes('The God Chapter')`));
  await js(`(() => { [...${advNote}.querySelectorAll('.foldhead')].find((b) => b.textContent.includes('The God Chapter')).click(); return true; })()`);
  await sleep(100);
  await js(`(() => { [...${advNote}.querySelectorAll('button.lvl')].find((b) => b.textContent.startsWith('G1')).click(); return true; })()`);
  ok('a level of the God Chapter says only awakened powers wound it', await waitFor(`${advNote}.textContent.includes('G1. The Stair Up') && ${advNote}.textContent.includes('Only awakened powers')`));
  await shot('51-god-chapter');
  await js(`(async () => {
    const { closeAllNotes } = await import('./ui/notes.js');
    closeAllNotes();
    window.__game.G.house.universe.godBest = 10;
    window.__game.G.open('god');
    return true;
  })()`);
  const godNote = noteTitled('God Mode');
  ok('God Mode opens once God is beaten', await waitFor(`!!${godNote} && ${godNote}.textContent.includes('The Maker')`));
  await js(`(() => { const i = ${godNote}.querySelector('.hatchbar input'); i.value = 'Deity'; i.dispatchEvent(new Event('input')); i.dispatchEvent(new Event('change')); return true; })()`);
  await sleep(100);
  await js(`(() => { [...${godNote}.querySelectorAll('label.toggle')].find((l) => l.textContent.startsWith('Speedster')).querySelector('input').click(); return true; })()`);
  await sleep(100);
  await shot('52-god-maker');
  const filesBeforeMake = await js('window.api.listCreatures().then((list) => list.length)');
  ok('the Maker makes a creature', (await clickText('.note.god', 'Make it')) === true && await waitForFiles(`window.api.listCreatures().then((list) => list.length === ${filesBeforeMake} + 1)`));
  await clickText('.note.god', 'The God Ring');
  await sleep(100);
  await js(`(() => { const chips = [...${godNote}.querySelectorAll('.party button.chip')]; chips[0].click(); return true; })()`);
  await sleep(80);
  await js(`(() => { [...${godNote}.querySelectorAll('button.chip')].find((b) => b.textContent === 'God').click(); return true; })()`);
  await sleep(80);
  ok('the God Ring puts one of yours against God', (await clickText('.note.god', 'FIGHT')) === true && await waitFor('window.__game.G.bout && window.__game.G.bout.godRing'));
  await fastForward(20);
  await shot('53-god-ring');
  await js(`(() => { window.__game.G.bout = null; window.__game.G.boutHide = new Set(); return true; })()`);
  await clickText('.note.god', 'Tools');
  await sleep(100);
  const gemsBeforeRain = await js('window.__game.G.house.bank.gems');
  await js(`(() => { [...${godNote}.querySelectorAll('.way')].find((w) => w.textContent.includes('Rain gems')).querySelector('button').click(); return true; })()`);
  ok('a tool rains gems', await waitFor(`window.__game.G.house.bank.gems >= ${gemsBeforeRain} + 1000000`));
  await shot('54-god-tools');

  ok('no console errors in the page', pageErrors.length === 0, pageErrors.slice(0, 5).join(' | '));
}

app.whenReady().then(async () => {
  // main.cjs registered its own whenReady first, so the window exists by now.
  await sleep(100);
  try {
    await run();
  } catch (err) {
    console.error(err);
    results.push({ name: 'harness', pass: false });
  }
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed. Screenshots in ${SHOTS}`);
  app.exit(failed.length ? 1 : 0);
});
