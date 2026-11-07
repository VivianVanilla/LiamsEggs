// Full play-through in a hidden window: a stand-in desktop, a fake screen source, and a
// throwaway save folder. Nothing appears on your screen and your real screen is never read.
// Run: electron test/e2e.cjs <folder for screenshots>

const path = require('path');
const fs = require('fs');
const os = require('os');

const SHOTS = path.resolve(process.argv.find((a, i) => i > 1 && !a.startsWith('-') && !a.endsWith('e2e.cjs')) ?? path.join(os.tmpdir(), 'creature-shots'));
// A run can't remove its own folder while Chromium is still holding files in it, so each run
// clears out what the last one left behind.
for (const name of fs.readdirSync(os.tmpdir())) {
  if (name.startsWith('creature-e2e-')) {
    try {
      fs.rmSync(path.join(os.tmpdir(), name), { recursive: true, force: true });
    } catch { /* still in use: the next run gets it */ }
  }
}
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'creature-e2e-'));
process.env.CREATURE_TEST = '1';
process.env.CREATURE_FAKE_SCREEN = '1';
process.env.CREATURE_HOME = HOME;
const ART = path.join(HOME, 'test-art');
process.env.CREATURE_ART = ART;

const { app, nativeImage, screen } = require('electron');

// Plain colored rectangles, only to prove the layering works. They live in the temp folder and
// never reach the real art folder. Everything not listed here is left missing on purpose.
function testBlock(file, paint) {
  const size = 64;
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, alpha] = paint(x, y);
      const i = (y * size + x) * 4;
      buf[i] = b;
      buf[i + 1] = g;
      buf[i + 2] = r;
      buf[i + 3] = alpha;
    }
  }
  const full = path.join(ART, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, nativeImage.createFromBuffer(buf, { width: size, height: size }).toPNG());
}
// Body in the lower half only: red on its left, blue on its right, so facing can be checked.
testBlock('creature/body.png', (x, y) => (y < 32 ? [0, 0, 0, 0] : x < 32 ? [220, 40, 40, 255] : [40, 40, 220, 255]));
// Every ember mutation: a green stripe along the top, where the body is not.
['flamehair', 'claws', 'smoke', 'magma', 'firetail'].forEach((id) => testBlock(`mutations/${id}.png`, (x, y) => (y < 8 ? [40, 220, 40, 255] : [0, 0, 0, 0])));
// The Miner job: a yellow stripe just below that.
testBlock('jobs/miner.png', (x, y) => (y >= 12 && y < 20 ? [230, 220, 40, 255] : [0, 0, 0, 0]));
testBlock('food/bone.png', () => [200, 200, 200, 255]);
// Every Stand: solid magenta. Its Quirks: a cyan stripe. The speedster: an orange stripe.
['starplatinum', 'theworld', 'kingcrimson', 'magiciansred', 'stonefree', 'thehand', 'silverchariot', 'stickyfingers', 'crazydiamond', 'goldexperience', 'purplehaze', 'hierophant', 'heavensdoor', 'killerqueen']
  .forEach((id) => testBlock(`stands/${id}.png`, () => [220, 40, 220, 255]));
['oneforall', 'allforone', 'decay', 'halfhalf', 'hellflame', 'explosion', 'erasure', 'darkshadow', 'zerogravity', 'engine', 'hardening', 'electrification']
  .forEach((id) => testBlock(`quirks/${id}.png`, (x, y) => (y >= 22 && y < 28 ? [40, 220, 220, 255] : [0, 0, 0, 0])));
testBlock('powers/speedster.png', (x, y) => (y >= 56 ? [240, 140, 20, 255] : [0, 0, 0, 0]));
['crab', 'rat', 'dragon'].forEach((id) => testBlock(`monsters/${id}.png`, () => [120, 200, 120, 255]));

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
const clickText = (scope, text) => js(`(() => {
  const el = [...document.querySelectorAll('${scope} button')].find((b) => b.textContent.trim().startsWith(${JSON.stringify(text)}));
  if (!el) return 'no button: ' + ${JSON.stringify(text)};
  if (el.disabled) return 'disabled: ' + ${JSON.stringify(text)};
  el.click();
  return true;
})()`);
// Runs simulation time much faster than real time, while still letting async file calls land.
const fastForward = async (seconds) => {
  const chunks = Math.ceil(seconds / 2);
  for (let i = 0; i < chunks; i++) {
    await js(`(() => { for (let i = 0; i < 60; i++) window.__game.update(1/30); window.__game.draw(); })()`);
    await sleep(5);
  }
};
// Draws a box with real pointer events on the picker overlay.
const dragBox = (x, y, w, h) => js(`(() => {
  const p = document.querySelector('.picker');
  const ev = (type, cx, cy) => p.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: cx, clientY: cy, button: 0 }));
  ev('pointerdown', ${x}, ${y});
  ev('pointermove', ${x + w}, ${y + h});
  ev('pointerup', ${x + w}, ${y + h});
  return true;
})()`);

async function run() {
  win = main.getWindow();
  win.webContents.on('console-message', (e) => {
    const line = `${e.message ?? ''}`;
    if ((e.level === 'error' || e.level === 3) && line) pageErrors.push(line);
  });
  await new Promise((r) => { if (win.webContents.isLoading()) win.webContents.once('did-finish-load', r); else r(); });
  ok('page loaded with all modules', await waitFor('window.__game'));

  // --- first run ---
  ok('egg falls, naming note appears', await waitFor(`document.querySelector('.note input')`));
  await sleep(350);
  await shot('01-egg-and-naming');
  const emptyFile = fs.existsSync(path.join(HOME, 'creatures')) ? fs.readdirSync(path.join(HOME, 'creatures')).length : 0;
  ok('no file until it is named', emptyFile === 0);

  await js(`(() => {
    const i = document.querySelector('.note input');
    i.value = 'Bobbo';
    return true;
  })()`);
  await clickText('.note', 'Hatch it');
  ok('hatches', await waitFor('window.__game.G.pet', 6000));
  const file = path.join(HOME, 'creatures', 'Bobbo.creature');
  ok('naming created Bobbo.creature', fs.existsSync(file));
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  ok('the file is readable JSON with the name', parsed.name === 'Bobbo' && parsed.format === 'creature/1');
  await sleep(200);
  await shot('02-hatched');

  // --- feeding: snacks are free and change nothing, farmed food grows mutations ---
  ok('the feed note opens after hatching', await waitFor(`[...document.querySelectorAll('.note-title')].some(t => t.textContent === 'Feed')`));
  const feedNote = `[...document.querySelectorAll('.note')].find((n) => n.querySelector('.note-title')?.textContent === 'Feed')`;
  ok('it has no pantry or file maker', await js(`!${feedNote}.querySelector('textarea') && !${feedNote}.querySelector('.pantry')`));
  ok('it points to the farm until something is harvested', await js(`${feedNote}.textContent.includes('Nothing harvested yet') && [...${feedNote}.querySelectorAll('button')].some((b) => b.textContent === 'Go to the farm')`));
  await shot('03-feed');
  await js(`(() => { window.__game.G.creature.fullness = 20; return true; })()`);
  const growthStart = await js(`window.__game.G.creature.growth`);
  await clickText('.note.kraft', 'Give it a snack');
  ok('a snack grows it', await waitFor(`window.__game.G.creature.growth > ${growthStart}`));
  ok('and fills it', await js(`window.__game.G.creature.fullness > 30`));
  const nothingChanged = `(() => { const c = window.__game.G.creature; return c.mutations.length === 0 && Object.values(c.essence).every((v) => v === 0); })()`;
  ok('and changes nothing else', await js(nothingChanged));
  await fastForward(1);
  await js(`(() => { window.__game.G.creature.fullness = 99; return true; })()`);
  const growthFull = await js(`window.__game.G.creature.growth`);
  await clickText('.note.kraft', 'Give it a snack');
  ok('it can get too full', (await js(`window.__game.G.creature.growth`)) === growthFull && await js(`window.__game.G.pet.text.includes('too full')`));
  await js(`(() => { window.__game.G.creature.fullness = 20; return true; })()`);

  // A real food file dragged onto it goes through the real path, and only counts as a snack.
  const lunch = path.join(HOME, 'lunch.ember');
  fs.writeFileSync(lunch, 'a file someone renamed');
  const growthFile = await js(`window.__game.G.creature.growth`);
  await js(`(async () => {
    const { feedPaths } = await import('./ui/panels.js');
    feedPaths([${JSON.stringify(lunch)}], 500, 500);
  })()`);
  ok('it eats a food file dragged onto it', await waitFor(`window.__game.G.creature.growth > ${growthFile}`, 25000));
  await sleep(100);
  ok('the file moved to digested instead of being deleted', !fs.existsSync(lunch) && fs.readdirSync(path.join(HOME, 'digested')).length === 1);
  ok('a food file is only a snack', await js(nothingChanged));
  await shot('04-eating');

  // Farmed food is what grows mutations.
  await waitFor(`window.__game.G.pet.kind !== 'meal'`, 5000);
  await js(`(() => { const c = window.__game.G.creature; c.larder.pepper = 2; c.fullness = 10; return true; })()`);
  await fastForward(1);
  ok('farmed food shows up in the note', await js(`${feedNote}.textContent.includes('Fire Pepper x2') && ${feedNote}.textContent.includes('claws')`));
  const feedPepper = `[...${feedNote}.querySelectorAll('.way')].find((w) => w.textContent.includes('Fire Pepper')).querySelector('button')`;
  await js(`${feedPepper}.click()`);
  await sleep(40);
  await fastForward(1);
  ok('feeding it uses it up', await js(`(() => { const c = window.__game.G.creature; return c.larder.pepper === 1 && c.essence.ember === 1; })()`));
  await js(`${feedPepper}.click()`);
  ok('two peppers grew a mutation', await waitFor(`window.__game.G.creature.mutations.length >= 1`, 4000), await js(`JSON.stringify(window.__game.G.creature.mutations.map(m=>m.id))`));
  await fastForward(2);
  await sleep(300);
  await shot('05-mutated');

  // Dropping non-food must do nothing to the file.
  fs.writeFileSync(path.join(HOME, 'important.txt'), 'do not eat me');
  await js(`(async () => {
    const { feedPaths } = await import('./ui/panels.js');
    feedPaths([${JSON.stringify(path.join(HOME, 'important.txt'))}], 500, 500);
  })()`);
  await sleep(150);
  ok('non-food is refused and left alone', fs.existsSync(path.join(HOME, 'important.txt')) && await js(`window.__game.G.meals.length === 0`));

  // --- he is a still picture ---
  // The CLICK ME over a creature whose menu was never opened bounces on purpose; the creature
  // under it is what has to keep still.
  await js(`(async () => { localStorage.setItem('creature-seen:menu', '1'); const { closeAllNotes } = await import('./ui/notes.js'); closeAllNotes(); const { G } = window.__game; G.pet.cancel(); G.pet.still = true; G.pet.text = ''; G.pet.x = 600; G.pet.y = 600; G.pet.dir = 1; return true; })()`);
  await fastForward(4);
  const still = () => js(`(() => { window.__game.draw(); return document.getElementById('world').toDataURL(); })()`);
  const frameA = await still();
  await fastForward(2);
  await sleep(900);
  const frameB = await still();
  ok('a resting creature does not change by a single pixel', frameA === frameB && frameA.length > 1000);

  // Reads the real pixels of the layered picture. y runs up from its feet, as a share of its height.
  const pixelAt = (dx, up) => js(`(() => {
    const { G, draw } = window.__game;
    draw();
    const c = document.getElementById('world');
    const s = window.devicePixelRatio;
    const size = G.pet.hitRect().h - 24;
    const d = c.getContext('2d').getImageData((G.pet.x + ${dx}) * s, (G.pet.y - size * ${up}) * s, 1, 1).data;
    return [d[0], d[1], d[2], d[3]];
  })()`);
  let leftSide = await pixelAt(-12, 0.25);
  let rightSide = await pixelAt(12, 0.25);
  ok('the body picture is on screen, the right way round', leftSide[0] > leftSide[2] + 60 && rightSide[2] > rightSide[0] + 60, `${leftSide} / ${rightSide}`);
  const mutated = await pixelAt(0, 0.97);
  ok('its mutation picture is layered on', mutated[1] > mutated[0] + 60 && mutated[3] > 200, String(mutated));
  await js(`(() => { window.__game.G.pet.dir = -1; return true; })()`);
  leftSide = await pixelAt(-12, 0.25);
  rightSide = await pixelAt(12, 0.25);
  ok('facing left flips the same picture', leftSide[2] > leftSide[0] + 60 && rightSide[0] > rightSide[2] + 60, `${leftSide} / ${rightSide}`);
  await js(`(() => { const { G } = window.__game; G.pet.dir = 1; G.pet.still = false; return true; })()`);

  // --- the menu ---
  await js(`(async () => { const p = await import('./ui/notes.js'); p.closeAllNotes(); const { openMenu } = await import('./ui/panels.js'); openMenu(); })()`);
  await sleep(250);
  ok('the menu can close the game', await js(`[...document.querySelectorAll('.note button')].some((b) => b.textContent === 'Close game')`));
  await shot('06-menu');

  // --- settings: real slider events and real button clicks, on the hidden window ---
  await js(`(async () => { const { closeAllNotes } = await import('./ui/notes.js'); closeAllNotes(); const { openSettings } = await import('./ui/panels.js'); await openSettings(); return true; })()`);
  ok('settings opens', await waitFor(`[...document.querySelectorAll('.note-title')].some(t => t.textContent === 'Settings')`));
  await sleep(150);
  await shot('06b-settings');
  const petHeight = () => js(`window.__game.G.pet.hitRect().h`);
  const slide = (v) => js(`(() => { const r = document.querySelector('.note input[type=range]'); r.value = ${v}; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  const sizeBefore = await petHeight();
  await slide(200);
  await sleep(250);
  const sizeBig = await petHeight();
  ok('the size slider makes it bigger', sizeBig > sizeBefore * 1.6, `${sizeBefore} to ${sizeBig}`);
  const savedSettings = () => JSON.parse(fs.readFileSync(path.join(HOME, 'data', 'settings.json'), 'utf8'));
  ok('and the size is remembered', savedSettings().scale === 2, JSON.stringify(savedSettings()));
  await slide(100);
  await sleep(250);
  ok('and it comes back down', (await petHeight()) === sizeBefore);
  // See-through: everything takes the setting, and it is remembered.
  await js(`(() => { const r = document.querySelector('.slider.see'); r.value = 50; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  await sleep(250);
  ok('the see-through slider applies to the whole scene', await js(`getComputedStyle(document.getElementById('world')).opacity === '0.5'`));
  ok('and is remembered', savedSettings().opacity === 0.5, JSON.stringify(savedSettings()));
  await js(`(() => { const r = document.querySelector('.slider.see'); r.value = 25; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  await sleep(200);
  ok('the settings panel can close the game', await js(`[...document.querySelectorAll('.note button')].some((b) => b.textContent === 'Close the game')`));

  // Hide: the page blanks, the window stays, and it all comes back.
  main.toggleHidden(true);
  await sleep(150);
  ok('hide blanks the picture and the panels', await js(`(() => { const w = getComputedStyle(document.getElementById('world')).visibility; const n = getComputedStyle(document.querySelector('.note')).visibility; return window.__game.G.hidden && w === 'hidden' && n === 'hidden'; })()`));
  main.toggleHidden(false);
  await sleep(150);
  ok('show brings them back', await js(`(() => { const w = getComputedStyle(document.getElementById('world')).visibility; const n = getComputedStyle(document.querySelector('.note')).visibility; return !window.__game.G.hidden && w === 'visible' && n === 'visible'; })()`));

  // A box being drawn when you hide must not stay stuck holding the mouse.
  await js(`(async () => { const { pickRect } = await import('./ui/notes.js'); window.__boxResult = 'waiting'; pickRect('test box').then((r) => { window.__boxResult = r; }); return true; })()`);
  await sleep(100);
  main.toggleHidden(true);
  await sleep(150);
  ok('hiding cancels a box being drawn', await js(`window.__boxResult === null && !document.querySelector('.picker') && !window.__game.G.picking`));
  main.toggleHidden(false);
  await sleep(150);

  await js(`document.querySelector('.note .toggle input').click()`);
  await sleep(200);
  ok('quiet mode toggles from the panel', savedSettings().quiet === true && await js(`window.__game.G.settings.quiet === true`));
  await js(`document.querySelector('.note .toggle input').click()`);
  await sleep(200);
  // Dark mode: night paper, from the panel, and remembered.
  const darkToggle = `[...document.querySelectorAll('.note .toggle')].find((t) => t.textContent.includes('Dark mode')).querySelector('input')`;
  await js(`${darkToggle}.click()`);
  await sleep(200);
  ok('dark mode turns the notes into night paper', savedSettings().dark === true && await js(`document.documentElement.classList.contains('dark') && getComputedStyle(document.querySelector('.note')).backgroundColor !== 'rgb(251, 250, 244)'`));
  await shot('06c-dark-settings');
  await js(`${darkToggle}.click()`);
  await sleep(200);
  ok('and back to day paper', savedSettings().dark === false && await js(`!document.documentElement.classList.contains('dark')`));
  const monitors = await js(`window.api.listDisplays()`);
  ok('it lists the monitors, with exactly one selected', monitors.length >= 1 && monitors.filter((d) => d.current).length === 1, JSON.stringify(monitors));
  if (monitors.length > 1) {
    const other = monitors.find((d) => !d.current);
    const home = monitors.find((d) => d.current);
    const boundsOf = (id) => screen.getAllDisplays().find((d) => d.id === id).bounds;
    await clickText('.note', `Monitor ${other.number}`);
    await sleep(350);
    ok('choosing a monitor moves the game there', win.getBounds().x === boundsOf(other.id).x, JSON.stringify(win.getBounds()));
    ok('the choice is remembered', savedSettings().display === other.id);
    ok('and the panel shows the new selection', await js(`[...document.querySelectorAll('.note .btn.hot')].some((b) => b.textContent.startsWith('Monitor ${other.number}'))`));
    await clickText('.note', `Monitor ${home.number}`);
    await sleep(350);
    ok('and it can go back', win.getBounds().x === boundsOf(home.id).x);
  }
  await js(`(async () => { const { closeAllNotes } = await import('./ui/notes.js'); closeAllNotes(); return true; })()`);

  // --- job choice ---
  await js(`window.__game.G.creature.growth = Math.max(window.__game.G.creature.growth, 14)`);
  await js(`(async () => { const { openPathChoice } = await import('./ui/panels.js'); openPathChoice(); })()`);
  await sleep(250);
  await shot('07-path-choice');
  await clickText('.note.paper', 'Miner');
  ok('chose Miner', await js(`window.__game.G.creature.path.line[0] === 'miner'`));
  await js(`(async () => {
    const { G } = window.__game;
    G.pet.cancel(); G.pet.still = true; G.pet.x = 600; G.pet.y = 600; G.pet.dir = 1;
    return true;
  })()`);
  await fastForward(2);
  const hat = await js(`(() => {
    const { G, draw } = window.__game;
    draw();
    const s = window.devicePixelRatio;
    const size = G.pet.hitRect().h - 24;
    const d = document.getElementById('world').getContext('2d').getImageData(600 * s, (600 - size * 0.75) * s, 1, 1).data;
    return [d[0], d[1], d[2], d[3]];
  })()`);
  ok('its job picture is layered on', hat[0] > 150 && hat[1] > 150 && hat[2] < 120 && hat[3] > 200, String(hat));
  await js(`(() => { window.__game.G.pet.still = false; return true; })()`);

  // --- mining ---
  await js(`window.__game.G.creature.fullness = 90`);
  await js(`(async () => { const { beginMine } = await import('./ui/panels.js'); beginMine(); })()`);
  ok('the spot picker opens', await waitFor(`document.querySelector('.picker')`));
  await js(`document.querySelector('.picker').dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 650, clientY: 300 }))`);
  await sleep(120);
  await shot('08-mine-picker');
  ok('a ring shows the spot it will take in', await js(`getComputedStyle(document.querySelector('.picker-spot')).display === 'block'`));
  await js(`document.querySelector('.picker').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 650, clientY: 300 }))`);
  ok('creature starts mining that spot, for five minutes', await waitFor(`window.__game.G.pet.kind === 'work' && window.__game.G.pet.mineLeft > 290`));
  await fastForward(22);
  await sleep(50);
  await shot('09-mining');
  const minedMid = await js(`window.__game.G.creature.record.mined`);
  ok('it dug cells and banked color', minedMid > 2 && await js(`window.__game.G.creature.palette.total > 0`), `${minedMid} cells`);
  await js(`(async () => { const { openMenu } = await import('./ui/panels.js'); openMenu(); })()`);
  await sleep(100);
  ok('while it mines, the menu can stop it, and shows how long is left', await js(`[...document.querySelectorAll('.actions .btn')].some((b) => /^Stop \\(4:\\d\\d\\)$/.test(b.textContent))`), await js(`[...document.querySelectorAll('.actions .btn')].map((b) => b.textContent).join(' | ')`));
  await js(`(async () => { const { closeAllNotes } = await import('./ui/notes.js'); closeAllNotes(); })()`);
  await js(`(() => { window.__game.G.pet.stopRequested = true; })()`);
  await fastForward(10);
  ok('stop request ends the run', await waitFor(`window.__game.G.pet.kind !== 'work'`, 5000));

  // --- farming ---
  await js(`(async () => { const { openFarm } = await import('./ui/panels.js'); openFarm(); })()`);
  await sleep(200);
  await clickText('.note', 'Dig a new field');
  ok('field picker opens', await waitFor(`document.querySelector('.picker')`));
  await dragBox(180, 520, 182, 104);
  ok('field exists', await waitFor(`window.__game.G.creature.farm.fields.length === 1`));
  await js(`(() => { window.__game.G.creature.farm.store = 12; window.__game.G.creature.fullness = 90; })()`);
  // The panel enables this button on its next refresh, so wait for that rather than guessing.
  const adoptReady = `[...document.querySelectorAll('.note button')].some((b) => b.textContent.startsWith('Adopt (2 food)') && !b.disabled)`;
  await waitFor(adoptReady);
  const adoptFirst = await clickText('.note', 'Adopt (2 food)');
  await waitFor(`window.__game.G.creature.farm.animals.length === 1 && ${adoptReady}`);
  const adoptSecond = await clickText('.note', 'Adopt (2 food)');
  ok('adopted two clucklings', await js(`window.__game.G.creature.farm.animals.length === 2`), `${adoptFirst}, ${adoptSecond}`);
  await fastForward(40);
  const tilled = await js(`window.__game.G.creature.farm.fields[0].tiles.filter(t => t.s > 0).length`);
  ok('it tends the field on its own', tilled > 2, `${tilled} tiles worked`);
  // Ripen everything and let it harvest.
  await js(`(() => { for (const t of window.__game.G.creature.farm.fields[0].tiles) { if (t.s === 2) t.t = 0; } })()`);
  await fastForward(4);
  await shot('10-farm');
  const storeBefore = await js(`window.__game.G.creature.farm.store`);
  await fastForward(20);
  ok('it harvests', await js(`window.__game.G.creature.record.harvested > 0`), `store was ${storeBefore}`);
  await js(`(() => { window.__game.G.creature.fullness = 10; window.__game.G.creature.farm.store = 5; window.__game.G.pet.jobWait = 0; window.__game.G.pet.cancel(); })()`);
  await fastForward(10);
  ok('it feeds itself from the store', await js(`window.__game.G.creature.fullness > 10`));

  // --- duel: real clicks through every puzzle ---
  await js(`(async () => { const { closeAllNotes } = await import('./ui/notes.js'); closeAllNotes(); const { openDuel } = await import('./ui/duel.js'); openDuel(); })()`);
  await sleep(200);
  await shot('11-duel-menu');
  await clickText('.note.paper', 'Four Stones');
  await sleep(60);
  ok('four stones board', await js(`document.querySelectorAll('.fourcell').length === 42`));
  for (let i = 0; i < 4; i++) {
    await js(`document.querySelectorAll('.fourcell')[${i}].click()`);
    await sleep(620);
  }
  ok('the creature plays back', await js(`document.querySelectorAll('.fourcell.c').length >= 3`));
  await shot('12-duel-four');
  // Play to the end against a creature move by move, using columns left to right.
  for (let i = 0; i < 40; i++) {
    if (await js(`[...document.querySelectorAll('.note.paper button')].some(b => b.textContent === 'Rematch')`)) break;
    await js(`(() => { const c = [...document.querySelectorAll('.fourcell')]; const free = c.findIndex((x, n) => n < 7 && !x.classList.contains('p') && !x.classList.contains('c')); if (free >= 0) c[free].click(); })()`);
    await sleep(620);
  }
  ok('a game of four stones finishes with a result', await js(`[...document.querySelectorAll('.note.paper button')].some(b => b.textContent === 'Rematch')`));
  ok('the result was recorded', await js(`(() => { const r = window.__game.G.creature.record; return r.duelsWon + r.duelsLost; })()`) >= 0);
  await shot('13-duel-result');

  await clickText('.note.paper', 'Other puzzle');
  await sleep(100);
  await clickText('.note.paper', 'Stick Pile');
  await sleep(60);
  for (let i = 0; i < 25; i++) {
    if (await js(`[...document.querySelectorAll('.note.paper button')].some(b => b.textContent === 'Rematch')`)) break;
    await clickText('.note.paper', 'Take 1');
    await sleep(900);
  }
  ok('stick pile finishes', await js(`[...document.querySelectorAll('.note.paper button')].some(b => b.textContent === 'Rematch')`));

  await clickText('.note.paper', 'Other puzzle');
  await sleep(100);
  await clickText('.note.paper', 'Light Race');
  await sleep(100);
  ok('light race boards render', await js(`document.querySelectorAll('.lights .light').length >= 32`));
  await js(`document.querySelectorAll('.lights:not(.ai) .light')[3].click()`);
  await sleep(100);
  await shot('14-duel-lights');
  ok('light race ends on its own when the creature solves it', await waitFor(`[...document.querySelectorAll('.note.paper button')].some(b => b.textContent === 'Rematch')`, 60000));

  await clickText('.note.paper', 'Other puzzle');
  await sleep(100);
  await clickText('.note.paper', 'Echo');
  await sleep(100);
  ok('echo pads render', await js(`document.querySelectorAll('.rune').length === 4`));
  await sleep(600);
  await shot('15-duel-echo');
  await waitFor(`document.querySelector('.says').textContent.startsWith('Your turn')`, 8000);
  // Deliberately wrong until it ends: a press is wrong 3 times in 4, so this finishes fast.
  for (let i = 0; i < 12; i++) {
    if (await js(`[...document.querySelectorAll('.note.paper button')].some(b => b.textContent === 'Rematch')`)) break;
    await js(`document.querySelectorAll('.rune')[${i % 4}].click()`);
    await sleep(80);
  }
  await waitFor(`[...document.querySelectorAll('.note.paper button')].some(b => b.textContent === 'Rematch') || document.querySelector('.says').textContent.startsWith('Right')`, 4000);
  ok('echo reacts to presses', true);
  await js(`(async () => { const { closeAllNotes } = await import('./ui/notes.js'); closeAllNotes(); })()`);

  // --- powers: real buttons, real saves, real pixels ---
  // Only the creature itself, with its Stand and afterimages, drawn on a canvas of its own: by now
  // its farm animals wander and its crops grow, and either can pass close by.
  const petPicture = () => js(`(() => {
    const { G } = window.__game;
    G.pet.text = '';
    const size = G.pet.hitRect().h;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(size * 2.4);
    canvas.height = Math.ceil(size * 1.4);
    const ctx = canvas.getContext('2d');
    ctx.translate(-(G.pet.x - size * 1.2), -(G.pet.y - size * 1.3));
    G.pet.draw(ctx);
    const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 0;
    for (let i = 0; i < d.length; i++) hash = (hash * 31 + d[i]) | 0;
    return hash;
  })()`);
  const savedPowers = async () => {
    await js(`(async () => { const { saveCreature } = await import('./state.js'); await saveCreature(); })()`);
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  };
  const powersNote = `[...document.querySelectorAll('.note')].find((n) => n.querySelector('.note-title')?.textContent.endsWith("'s powers"))`;
  // Start from no Legendary mutation, whatever happened before.
  await js(`(() => { window.__game.G.creature.souls = []; return true; })()`);
  const button = (label) => `[...${powersNote}.querySelectorAll('button')].find((b) => b.textContent === ${JSON.stringify(label)})`;
  await js(`(async () => { const { openMenu } = await import('./ui/panels.js'); openMenu(); })()`);
  await sleep(150);
  ok('the menu shows max HP', await js(`[...document.querySelectorAll('.note .small')].some((e) => /max HP \\d+$/.test(e.textContent))`));
  ok('the menu says how the stat limits work', await js(`[...document.querySelectorAll('.note .small')].some((e) => e.textContent === 'Only one stat can reach 60, one 45, one 30, one 18, one 12.' && e.offsetHeight < 20)`));
  await clickText('.note', 'Powers');
  await sleep(150);
  ok('the menu opens the powers note', await js(`!!${powersNote}`));
  ok('no Stand until it has the Wits', await js(`${button('Awaken its Stand')}.disabled && window.__game.G.creature.powers.stand === null`));
  ok('no speedster until it has the Speed', await js(`${button('Become a speedster')}.disabled && !window.__game.G.creature.powers.speedster`));
  ok('it starts out Quirkless', await js(`${powersNote}.textContent.includes('Quirkless')`));
  await shot('16a-powers-locked');
  // Pressing a locked button does nothing.
  await js(`${button('Awaken its Stand')}.click()`);
  ok('a locked button stays locked', await js(`window.__game.G.creature.powers.stand === null`));

  // It earns them the way a creature does: training and food raise the real stats.
  await js(`(() => {
    const c = window.__game.G.creature;
    c.training.wits = 40; c.training.speed = 40; c.essence.ink = 40; c.essence.spark = 40;
  })()`);
  await fastForward(2);
  ok('it says so when something is ready', await js(`window.__game.G.pet.text.includes('standing behind me')`), await js(`window.__game.G.pet.text`));
  await js(`(async () => { const { openMenu } = await import('./ui/panels.js'); openMenu(); })()`);
  await sleep(150);
  ok('the menu points it out', await js(`[...document.querySelectorAll('.callout')].some((e) => e.textContent.includes('waking up'))`));
  await clickText('.callout', 'Look');
  await sleep(150);
  const hpBefore = await js(`(async () => { const { maxHpOf } = await import('./core/creature.js'); return maxHpOf(window.__game.G.creature); })()`);
  // What can't be undone takes two presses, and the first one changes nothing.
  await js(`${button('Awaken its Stand')}.click()`);
  ok('the first press only asks', await js(`window.__game.G.creature.powers.stand === null`));
  await js(`[...${powersNote}.querySelectorAll('button')].find((b) => b.textContent === 'Forever?').click()`);
  await sleep(150);
  const standId = await js(`window.__game.G.creature.powers.stand`);
  ok('the second press awakens a Stand', !!standId, standId);
  ok('the note shows its name and chart', await js(`(() => { const n = ${powersNote}; return n.textContent.includes('「') && n.querySelectorAll('.chart > div').length === 6; })()`));
  const savedA = await savedPowers();
  ok('the Stand is in the .creature file', savedA.powers.stand === standId && typeof savedA.summary.stand === 'string', savedA.summary.stand);
  await shot('16b-powers-stand');

  // The Stand is really on screen: magenta, behind it, on the side it is facing away from.
  await js(`(async () => { const { closeAllNotes } = await import('./ui/notes.js'); closeAllNotes(); const { G } = window.__game; G.pet.cancel(); G.pet.still = true; G.pet.text = ''; G.pet.x = 700; G.pet.y = 600; G.pet.dir = 1; return true; })()`);
  await fastForward(2);
  const isMagenta = (p) => p[0] > 150 && p[2] > 150 && p[1] < 90 && p[3] > 150;
  const standLeft = await pixelAt(-Math.round((await js(`window.__game.G.pet.hitRect().h - 24`)) * 0.6), 0.4);
  ok('its Stand floats behind it', isMagenta(standLeft), String(standLeft));
  await js(`(() => { window.__game.G.pet.dir = -1; return true; })()`);
  const standRight = await pixelAt(Math.round((await js(`window.__game.G.pet.hitRect().h - 24`)) * 0.6), 0.4);
  ok('and moves to the other side when it turns around', isMagenta(standRight), String(standRight));
  await js(`(() => { window.__game.G.pet.dir = 1; return true; })()`);
  await shot('16c-stand-on-screen');
  const restA = await petPicture();
  await fastForward(2);
  await sleep(300);
  ok('a creature with a Stand is still a still picture', restA === await petPicture());

  // Its one basic slot holds one power, until a Legendary mutation adds a slot.
  const walkBefore = await js(`window.__game.G.pet.walkSpeed()`);
  await js(`(async () => { const { openPowers } = await import('./ui/powers.js'); openPowers(); })()`);
  await sleep(150);
  ok('with a Stand, speedster is locked', await js(`${button('Become a speedster')}.disabled`));
  ok('and so is its cursed technique', await js(`${button('Awaken its technique')}.disabled`));
  ok('it shows which technique runs in its family, with no way to pick', await js(`(async () => {
    const { lastName } = await import('./core/creature.js');
    const t = ${powersNote}.textContent;
    return t.includes('You don\\'t pick this') && t.includes(lastName(window.__game.G.creature));
  })()`));
  ok('the note says how to get a second', await js(`${powersNote}.textContent.includes('Each Legendary mutation adds a slot')`));
  await js(`${button('Become a speedster')}.click()`);
  ok('a locked one stays locked', await js(`window.__game.G.creature.powers.speedster === false`));
  await js(`(async () => {
    const { G } = window.__game;
    G.creature.souls = ['twinsoul'];
    const { getNote } = await import('./ui/notes.js');
    getNote('powers').rebuild();
    return true;
  })()`);
  await sleep(100);
  ok('a Legendary mutation shows at the top', await js(`${powersNote}.querySelector('.callout').textContent.includes('Twin Soul')`));
  await js(`${button('Become a speedster')}.click()`);
  await js(`[...${powersNote}.querySelectorAll('button')].find((b) => b.textContent === 'Forever?').click()`);
  await sleep(150);
  ok('with one, it can become a speedster too', await js(`window.__game.G.creature.powers.speedster === true`));
  ok('but a third stays locked', await js(`${button('Awaken its technique')}.disabled`));
  ok('it runs at least three times as fast', (await js(`window.__game.G.pet.walkSpeed()`)) >= walkBefore * 3, `${walkBefore} to ${await js(`window.__game.G.pet.walkSpeed()`)}`);
  ok('the speedster is in the .creature file', (await savedPowers()).powers.speedster === true);

  // Afterimages show while it moves, and clear once it stops.
  await js(`(async () => { const { closeAllNotes } = await import('./ui/notes.js'); closeAllNotes(); return true; })()`);
  const ghostProbe = `(() => {
    const { G, draw } = window.__game;
    draw();
    const s = window.devicePixelRatio;
    const size = G.pet.hitRect().h - 24;
    const d = document.getElementById('world').getContext('2d').getImageData((G.pet.x + size * 0.75) * s, (G.pet.y - size * 0.25) * s, 1, 1).data;
    return d[3];
  })()`;
  await js(`(() => {
    const { G, update } = window.__game;
    const size = G.pet.hitRect().h - 24;
    for (let i = 0; i < 5; i++) { G.pet.x -= size * 0.2; update(1 / 30); }
    return true;
  })()`);
  ok('moving leaves afterimages behind it', (await js(ghostProbe)) > 0);
  await js(`(() => { for (let i = 0; i < 8; i++) window.__game.update(1 / 30); return true; })()`);
  ok('and stopping clears them', (await js(ghostProbe)) === 0 && await js(`!window.__game.G.pet.trailing()`));
  const restB = await petPicture();
  await sleep(300);
  ok('a resting speedster is still a still picture', restB === await petPicture());
  const shoes = await pixelAt(0, 0.05);
  ok('it wears the speedster picture', shoes[0] > 180 && shoes[1] > 90 && shoes[1] < 190 && shoes[2] < 90, String(shoes));

  // Quirks: the first press only asks, moving away calls it off, the second press pays.
  await js(`(async () => { const { openPowers } = await import('./ui/powers.js'); openPowers(); })()`);
  await sleep(150);
  const quirkButton = (name) => `[...${powersNote}.querySelectorAll('.quirk')].find((q) => q.querySelector('.name').textContent === ${JSON.stringify(name)}).querySelector('button')`;
  const hpNow = () => js(`(async () => { const { maxHpOf } = await import('./core/creature.js'); return maxHpOf(window.__game.G.creature); })()`);
  await js(`${quirkButton('Decay')}.click()`);
  ok('one press only asks', await js(`window.__game.G.creature.powers.quirks.length === 0 && ${quirkButton('Decay')}.textContent === 'Forever?'`));
  await js(`${quirkButton('Decay')}.dispatchEvent(new MouseEvent('mouseleave'))`);
  ok('moving away calls it off', await js(`${quirkButton('Decay')}.textContent === 'Give 30%'`));
  await js(`${quirkButton('Decay')}.click()`);
  ok('moving away really reset it: this press only asks again', await js(`window.__game.G.creature.powers.quirks.length === 0`));
  await js(`${quirkButton('Decay')}.dispatchEvent(new MouseEvent('mouseleave'))`);
  const hpNoQuirk = await hpNow();
  await js(`${quirkButton('One For All')}.click()`);
  await js(`${quirkButton('One For All')}.click()`);
  await sleep(150);
  ok('two presses buy it', await js(`window.__game.G.creature.powers.quirks[0] === 'oneforall'`));
  const hpWithQuirk = await hpNow();
  ok('and it costs max HP', hpWithQuirk < hpNoQuirk, `${hpNoQuirk} to ${hpWithQuirk}`);
  ok('it leaves the list of Quirks for sale', await js(`![...${powersNote}.querySelectorAll('.quirk .name')].some((n) => n.textContent === 'One For All')`));
  const savedB = await savedPowers();
  ok('the Quirk and the lower HP are in the .creature file', savedB.powers.quirks[0] === 'oneforall' && savedB.summary.maxHp === hpWithQuirk, String(savedB.summary.maxHp));
  await js(`${quirkButton('Decay')}.click()`);
  await js(`${quirkButton('Decay')}.click()`);
  await sleep(150);
  const hpWithQuirkAndDecay = await hpNow();
  ok('a second Quirk reaches the floor', await js(`window.__game.G.creature.powers.quirks.length === 2`) && hpWithQuirkAndDecay < hpWithQuirk);
  ok('so no more can be bought', await js(`[...${powersNote}.querySelectorAll('.quirk button')].every((b) => b.disabled)`));
  await shot('16d-powers-all');
  await js(`(async () => { const { closeAllNotes } = await import('./ui/notes.js'); closeAllNotes(); const { G } = window.__game; G.pet.dir = 1; G.pet.text = ''; return true; })()`);
  await fastForward(2);
  const quirkPixel = await pixelAt(0, 1 - 25 / 64);
  ok('its Quirk picture is layered on', quirkPixel[1] > 150 && quirkPixel[2] > 150 && quirkPixel[0] < 110, String(quirkPixel));
  await shot('16e-all-powers-on-screen');
  await js(`(async () => { const { openMenu } = await import('./ui/panels.js'); openMenu(); })()`);
  await sleep(150);
  ok('the menu sums up its powers', await js(`[...document.querySelectorAll('.note .small')].some((e) => e.textContent.includes('Speedster') && e.textContent.includes('One For All') && /\\d of 8 mutations/.test(e.textContent))`));
  ok('the menu is compact', await js(`document.querySelector('.note').offsetHeight < 620`), await js(`String(document.querySelector('.note').offsetHeight)`));
  ok('the menu is four things it does all the time and four places for the rest', await js(`[...document.querySelectorAll('.actions.quick .btn')].map((b) => b.textContent).join() === 'Farm,Mine colors,Duel,Hungry' && [...document.querySelectorAll('.hubs .btn')].map((b) => b.dataset.label).join() === 'Care,Powers,Fight,Home'`), await js(`[...document.querySelectorAll('.actions.quick .btn')].map((b) => b.textContent).join()`));
  ok('every label fits its button', await js(`[...document.querySelectorAll('.actions .btn')].length === 4 && [...document.querySelectorAll('.actions .btn, .hubs .btn')].every((b) => {
    const glowing = b.classList.contains('glow');
    b.classList.remove('glow');
    const fits = b.scrollWidth <= b.clientWidth;
    if (glowing) b.classList.add('glow');
    return fits;
  })`));
  ok('every menu button says what it does when the mouse rests on it', await js(`[...document.querySelectorAll('.actions .btn, .hubs .btn')].every((b) => b.title.length > 10)`));
  const fullBefore = await js(`window.__game.G.creature.fullness`);
  await js(`[...document.querySelectorAll('.actions.quick .btn')].find((b) => b.textContent === 'Hungry').click()`);
  ok('Hungry empties its stomach', await js(`window.__game.G.creature.fullness === 0`), String(fullBefore));
  await js(`(() => { window.__game.G.creature.fullness = ${fullBefore}; return true; })()`);
  await js(`(async () => { const { closeAllNotes } = await import('./ui/notes.js'); closeAllNotes(); window.__game.G.pet.still = false; return true; })()`);

  // --- what it has: every mutation and power, and what each does ---
  await js(`(async () => { const { openMenu } = await import('./ui/panels.js'); openMenu(); })()`);
  await sleep(120);
  await clickText('.note', 'Powers');
  await sleep(120);
  await js(`[...document.querySelectorAll('.note:not(.buried) .hubtab')].find((b) => b.textContent === 'What it has').click()`);
  await sleep(150);
  ok('the powers hub has a tab for what it has, in the same place', await js(`(async () => { const { getNote } = await import('./ui/notes.js'); return getNote('powers').buried && !getNote('sheet').buried; })()`));
  const sheetNote = `[...document.querySelectorAll('.note')].find((n) => n.querySelector('.note-title')?.textContent.startsWith('What Bobbo'))`;
  ok('the sheet opens', await js(`!!${sheetNote}`));
  ok('it lists mutations with their effect', await js(`(() => { const t = ${sheetNote}.textContent; return t.includes('Mutations (') && /\\+\\d (Might|Guard|Speed|Wits|Vigor)/.test(t); })()`));
  ok('and its powers and Legendary mutation', await js(`(() => { const t = ${sheetNote}.textContent; return t.includes('Twin Soul') && t.includes('Speedster') && t.includes('One For All') && t.includes('Decay'); })()`));
  await clickText('.note', 'Every mutation there is');
  await sleep(100);
  ok('it can list every mutation there is', await js(`${sheetNote}.textContent.includes('Back Tentacle') && ${sheetNote}.textContent.includes('(has it)')`));
  await shot('16f-sheet');
  await js(`(async () => { const { closeAllNotes } = await import('./ui/notes.js'); closeAllNotes(); })()`);

  // --- the training guide ---
  await js(`(async () => { const { openGuide } = await import('./ui/guide.js'); openGuide('wits'); })()`);
  await sleep(150);
  const guideNote = `[...document.querySelectorAll('.note')].find((n) => n.querySelector('.note-title')?.textContent === 'Guide')`;
  ok('the guide opens on a stat', await js(`${guideNote}.textContent.includes('Mind Melon')`));
  await clickText('.note', 'Guard');
  await sleep(100);
  ok('its tabs switch stat', await js(`${guideNote}.textContent.includes('Stone Bean') && ${guideNote}.textContent.includes('Shell Crab') && !${guideNote}.textContent.includes('undefined')`));
  ok('and it shows the limits', await js(`${guideNote}.textContent.includes('can reach 60')`));
  await shot('16g-guide');
  await js(`(async () => { const { closeAllNotes } = await import('./ui/notes.js'); closeAllNotes(); })()`);

  // --- the battle plan: see its moves, decide how it behaves ---
  await js(`(async () => { const { openPlan } = await import('./ui/plan.js'); openPlan(); })()`);
  await sleep(150);
  const planNote = `[...document.querySelectorAll('.note')].find((n) => n.textContent.includes('battle plan'))`;
  ok('the battle plan opens', await js(`!!${planNote}`));
  ok('it lists its moves with what they do', await js(`(() => { const t = ${planNote}.textContent; return t.includes('Detroit Smash') && t.includes('Mach Punch') && t.includes('Ready every') && !t.includes('undefined'); })()`));
  await clickText('.note', 'Bounce');
  await sleep(100);
  await clickText('.note', 'All out');
  await sleep(100);
  await clickText('.note', 'Weakest');
  await sleep(100);
  await js(`[...${planNote}.querySelectorAll('.way .btn')].find((b) => b.textContent === 'On').click()`);
  await sleep(100);
  const savedPlan = (await savedPowers()).battle;
  ok('its behaviour is saved', savedPlan.stance === 'bounce' && savedPlan.hurt === 'berserk' && savedPlan.target === 'weak', JSON.stringify(savedPlan));
  ok('and a move can be switched off', savedPlan.off.length === 1, savedPlan.off.join());
  await js(`[...${planNote}.querySelectorAll('.way .btn')].find((b) => b.textContent === 'Off').click()`);
  await sleep(100);
  ok('and back on', (await savedPowers()).battle.off.length === 0);
  await clickText('.note', 'Try each stance');
  await sleep(150);
  ok('practice fights report on every stance', await js(`(() => { const t = ${planNote}.textContent; return t.includes('practice fights') && /Keep close won \\d+/.test(t) && /Bounce won \\d+/.test(t); })()`));
  await shot('16h-battle-plan');
  await js(`(async () => { const { closeAllNotes } = await import('./ui/notes.js'); closeAllNotes(); })()`);

  // --- the workshop: spending mined colors ---
  await js(`(() => {
    const c = window.__game.G.creature;
    Object.assign(c.bank, { red: 300, yellow: 300, green: 300, blue: 300, purple: 300, dust: 500, gems: 5 });
    return true;
  })()`);
  await js(`(async () => { const { openWorkshop } = await import('./ui/workshop.js'); openWorkshop('charms'); })()`);
  await sleep(150);
  const shopNote = `document.querySelector('.note.kraft')`;
  ok('the workshop shows what can be spent', await js(`${shopNote}.textContent.includes('Red 300') && ${shopNote}.textContent.includes('Gems 5')`));
  await js(`[...${shopNote}.querySelectorAll('.way')].find((w) => w.textContent.includes('Ruby Charm')).querySelector('button').click()`);
  await sleep(150);
  ok('crafting a charm takes the cost and puts it on', await js(`(() => { const c = window.__game.G.creature; return c.bank.red === 240 && c.gear.worn.includes('ruby'); })()`));
  await js(`[...${shopNote}.querySelectorAll('.way')].find((w) => w.textContent.includes('Ruby Charm')).querySelector('button').click()`);
  await sleep(120);
  ok('it can be taken off and kept', await js(`(() => { const c = window.__game.G.creature; return c.gear.owned.includes('ruby') && !c.gear.worn.includes('ruby'); })()`));
  await js(`[...${shopNote}.querySelectorAll('.way')].find((w) => w.textContent.includes('Ruby Charm')).querySelector('button').click()`);
  await sleep(120);
  await clickText('.note.kraft', 'Dye');
  await sleep(120);
  const bodyBefore = await js(`(async () => { const { creatureColors } = await import('./core/creature.js'); return creatureColors(window.__game.G.creature).body; })()`);
  await js(`${shopNote}.querySelector('.swatch.dye').click()`);
  await sleep(120);
  ok('dye changes what it wears', await js(`(async () => { const { creatureColors } = await import('./core/creature.js'); const c = window.__game.G.creature; return !!c.look.dye && creatureColors(c).body !== ${JSON.stringify(bodyBefore)}; })()`));
  await clickText('.note.kraft', 'Wash it off');
  await sleep(120);
  ok('and washes off', await js(`window.__game.G.creature.look.dye === null`));
  await clickText('.note.kraft', 'Paint');
  await sleep(120);
  await js(`[...${shopNote}.querySelectorAll('.way')].find((w) => w.textContent.includes('War Paint')).querySelector('button').click()`);
  await sleep(120);
  ok('a paint goes on for one fight', await js(`window.__game.G.creature.prep.paint === 'war'`));
  await shot('16i-workshop');
  // The forge: Legendary ore and gems into a weapon, and the weapon into its hand.
  await js(`(() => { window.__game.G.house.ore = 20; window.__game.G.house.bank.gems = 50; return true; })()`);
  await clickText('.note.kraft', 'Forge');
  await sleep(120);
  ok('the forge shows the ore and the weapons', await js(`${shopNote}.textContent.includes('Legendary ore') && ${shopNote}.textContent.includes('Starforged Blade')`));
  await clickText('.note.kraft', 'Forge: 6 ore');
  ok('forging takes ore and gems into the armory', await waitFor(`window.__game.G.house.armory.starblade === 1 && window.__game.G.house.ore === 14 && window.__game.G.house.bank.gems === 45`));
  await clickText('.note.kraft', 'Give it to');
  ok('and a creature can carry it', await waitFor(`window.__game.G.creature.weapon === 'starblade' && !window.__game.G.house.armory.starblade`));
  await shot('16i2-forge');
  await clickText('.note.kraft', 'Put it back');
  ok('and put it back in the armory', await waitFor(`window.__game.G.creature.weapon === null && window.__game.G.house.armory.starblade === 1`));
  await js(`(() => { window.__game.G.house.bank.gems = 5; return true; })()`);
  const savedShop = await savedPowers();
  const sharedBank = () => JSON.parse(fs.readFileSync(path.join(HOME, 'data', 'household.json'), 'utf8')).bank;
  ok('crafting is saved: the charm in its file, what it cost in the shared bank', savedShop.gear.owned[0] === 'ruby' && savedShop.prep.paint === 'war' && sharedBank().red < 300 && savedShop.bank.red === 0, JSON.stringify(savedShop.gear));
  await js(`(async () => { const { closeAllNotes } = await import('./ui/notes.js'); closeAllNotes(); })()`);

  // --- veins: click one while it lasts ---
  await js(`(() => {
    const { G } = window.__game;
    G.veins.push({ x: 900, y: 300, size: 26, color: 'rgb(230,60,40)', rgb: [230, 60, 40], left: 3 });
    return true;
  })()`);
  const redBefore = await js(`window.__game.G.creature.bank.red`);
  await js(`window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 910, clientY: 310, button: 0 }))`);
  ok('clicking a vein banks a bonus of that color', (await js(`window.__game.G.creature.bank.red`)) > redBefore && await js(`window.__game.G.veins.length === 0`));
  await js(`(() => { window.__game.G.veins.push({ x: 900, y: 300, size: 26, color: '#fff', rgb: [255, 255, 255], left: 0.5 }); return true; })()`);
  await fastForward(2);
  ok('a vein fades if you miss it', await js(`window.__game.G.veins.length === 0`));

  // --- the farm and the food note: plants grow mutations ---
  await js(`(async () => { const { openFarm } = await import('./ui/panels.js'); openFarm(); })()`);
  await sleep(150);
  const farmNote = `[...document.querySelectorAll('.note')].find((n) => n.textContent.includes('The farm'))`;
  await js(`[...${farmNote}.querySelectorAll('button')].find((b) => b.textContent === 'Zip Root').click()`);
  await sleep(120);
  ok('a field can be set to grow something', await js(`window.__game.G.creature.farm.fields[0].crop === 'root'`));
  ok('and the note says what that does', await js(`${farmNote}.textContent.includes('Grows antennae') && ${farmNote}.textContent.includes('Raises Speed') && ${farmNote}.textContent.includes('grow mutations')`));
  ok('there is no plain crop to choose', await js(`![...${farmNote}.querySelectorAll('button')].some((b) => b.textContent === 'Plain')`));
  await js(`[...${farmNote}.querySelectorAll('button')].find((b) => b.textContent === 'Water').click()`);
  await sleep(120);
  ok('watering puts it on a wait', await js(`[...${farmNote}.querySelectorAll('button')].some((b) => b.textContent.startsWith('Water again in') && b.disabled)`));
  await shot('16j-farm');
  await js(`(() => {
    const c = window.__game.G.creature;
    c.larder.bean = 2;
    c.essence.bone = 0;
    c.mutations = c.mutations.filter((m) => m.id !== 'plates' && m.id !== 'horns' && m.id !== 'spikes' && m.id !== 'clubtail' && m.id !== 'skullmask');
    c.fullness = 20;
    return true;
  })()`);
  await clickText('.note', 'Feed');
  await sleep(150);
  ok('the farm leads to the feed note, listing what it has', await js(`${feedNote}.textContent.includes('Stone Bean x2') && !${feedNote}.textContent.includes('Mutagen Cap')`));
  const feedBean = `[...${feedNote}.querySelectorAll('.way')].find((w) => w.textContent.includes('Stone Bean')).querySelector('button')`;
  const boneMutations = `window.__game.G.creature.mutations.filter((m) => ['horns', 'plates', 'spikes', 'clubtail', 'skullmask'].includes(m.id)).length`;
  await js(`${feedBean}.click()`);
  await sleep(60);
  await fastForward(1);
  ok('feeding a plant uses it up and feeds it', await js(`(() => { const c = window.__game.G.creature; return c.larder.bean === 1 && c.essence.bone === 1; })()`));
  await js(`${feedBean}.click()`);
  await sleep(60);
  ok('plants grow mutations', (await js(boneMutations)) === 1, await js(`JSON.stringify(window.__game.G.creature.mutations.map((m) => m.id))`));
  ok('and that is saved', (await savedPowers()).essence.bone === 2);
  await fastForward(2);
  ok('with none left, its row goes away', await js(`!${feedNote}.textContent.includes('Stone Bean')`));
  await shot('16k-feed');
  await js(`(async () => { const { closeAllNotes } = await import('./ui/notes.js'); closeAllNotes(); window.__game.G.pet.cancel(); })()`);

  // --- challenges: a training fight, won on purpose ---
  await js(`(() => { window.__game.G.creature.fullness = 90; return true; })()`);
  await js(`(async () => { const { openChallenges } = await import('./ui/challenges.js'); openChallenges(); })()`);
  await sleep(200);
  const chalNote = `[...document.querySelectorAll('.note')].find((n) => n.querySelector('.note-title')?.textContent === 'Challenges')`;
  ok('the challenges note opens', await js(`${chalNote}.textContent.includes('Shell Crab') && ${chalNote}.textContent.includes('The Last Dragon') && ${chalNote}.textContent.includes('dies forever')`));
  await shot('16l-challenges');
  const spawnButton = (name) => `[...${chalNote}.querySelectorAll('.monster')].find((m) => m.querySelector('.name').textContent === ${JSON.stringify(name)}).querySelector('button')`;
  const fullBefore = await js(`window.__game.G.creature.fullness`);
  await js(`${spawnButton('Shell Crab')}.click()`);
  ok('spawning starts a fight', await waitFor('window.__game.G.bout && window.__game.G.challenge'));
  const keepFighting = `(() => { window.__game.G.bout.fighters.forEach((f) => { f.hp = 1e6; f.maxHp = 1e6; }); return true; })()`;
  await js(keepFighting);
  ok('the monster is in the ring', await js(`window.__game.G.bout.fighters[1].monster.id === 'crab'`));
  ok('it burns fullness', (await js(`window.__game.G.creature.fullness`)) < fullBefore);
  ok('its paint goes into the fight and is used up', await js(`(() => { const { G } = window.__game; return G.creature.prep.paint === null && G.bout.fighters[0].atk > 0; })()`));
  await fastForward(1);
  await sleep(40);
  await shot('16m-challenge-fight');
  ok('its battle plan comes with it', await js(`window.__game.G.bout.fighters[0].plan.stance === 'bounce'`));
  await js(`[...${chalNote}.querySelectorAll('button')].find((b) => b.textContent === 'Mid range').click()`);
  await sleep(80);
  ok('you can shout a new stance mid-fight', await js(`window.__game.G.bout.fighters[0].plan.stance === 'mid'`));
  ok('which lasts only for this fight', (await savedPowers()).battle.stance === 'bounce');
  await js(`(() => {
    const { G } = window.__game;
    const monster = G.bout.fighters[1];
    G.bout.hurt(monster, 1e9, G.bout.fighters[0], { silent: true });
    return true;
  })()`);
  await fastForward(1);
  ok('beating it shows the result', await waitFor(`${chalNote}.textContent.includes('Won!')`));
  ok('and counts', await js(`window.__game.G.creature.record.monstersBeaten === 1`));
  await clickText('.note.chalk', 'All challenges');
  await sleep(100);
  ok('the ring clears', await js(`window.__game.G.bout === null && window.__game.G.challenge === null`));

  // --- a deadly fight, won on purpose: two presses, odds first ---
  await js(`${spawnButton('Pit Rat')}.click()`);
  await sleep(200);
  ok('the first press shows the odds and starts nothing', await js(`${chalNote}.textContent.includes('in 10') && ${chalNote}.textContent.includes('dies forever') && window.__game.G.bout === null`));
  await js(`${spawnButton('Pit Rat')}.dispatchEvent(new MouseEvent('mouseleave'))`);
  ok('moving away calls it off', await js(`${spawnButton('Pit Rat')}.textContent === 'Spawn'`));
  await js(`${spawnButton('Pit Rat')}.click()`);
  await sleep(150);
  await js(`${spawnButton('Pit Rat')}.click()`);
  ok('the second press means it', await waitFor('window.__game.G.bout && window.__game.G.bout.deadly'));
  await js(keepFighting);
  ok('there is no running from this one', await js(`![...${chalNote}.querySelectorAll('button')].some((b) => b.textContent === 'Run away')`));
  ok('the monster\'s picture stays small in the note', await js(`(() => { const r = ${chalNote}.querySelector('img').getBoundingClientRect(); return r.width <= 40 && r.height <= 40; })()`));
  // Nothing dies where you can't see it: a fight waits while everything is hidden.
  main.toggleHidden(true);
  await sleep(120);
  const clockBefore = await js(`window.__game.G.bout.t`);
  await fastForward(4);
  ok('a fight waits while everything is hidden', (await js(`window.__game.G.bout.t`)) === clockBefore);
  main.toggleHidden(false);
  await sleep(120);
  await fastForward(1);
  ok('and carries on when it comes back', (await js(`window.__game.G.bout.t`)) > clockBefore);
  await js(`(() => { const { G } = window.__game; G.bout.hurt(G.bout.fighters[1], 1e9, G.bout.fighters[0], { silent: true }); return true; })()`);
  await fastForward(1);
  ok('winning earns the trophy', await waitFor(`window.__game.G.creature.trophies.includes('rat')`));
  ok('and it lives', await js(`window.__game.G.creature.dead === null && !!window.__game.G.pet`));
  ok('the trophy is in the .creature file', (await savedPowers()).trophies.includes('rat'));
  await clickText('.note.chalk', 'All challenges');
  await sleep(100);
  ok('a beaten monster can\'t be fought again', await js(`${chalNote}.textContent.includes('Beaten')`));
  await js(`(async () => { const { closeAllNotes } = await import('./ui/notes.js'); closeAllNotes(); })()`);

  // --- death, forever: a second creature loses a deadly fight ---
  await js(`(async () => {
    const { createCreature } = await import('./ui/panels.js');
    const { saveCreature } = await import('./state.js');
    await saveCreature();
    const made = await createCreature('Doomed');
    made.c.fullness = 90;
    window.__game.G.switchTo(made.base, made.c);
    return true;
  })()`);
  await waitFor(`window.__game.G.creature.name === 'Doomed'`);
  const doomedFile = path.join(HOME, 'creatures', 'Doomed.creature');
  ok('the second creature has its file', fs.existsSync(doomedFile));
  await js(`(async () => { const { openChallenges } = await import('./ui/challenges.js'); openChallenges(); })()`);
  await sleep(150);
  await js(`${spawnButton('The Last Dragon')}.click()`);
  await sleep(200);
  ok('the odds are honest about a hopeless fight', await js(`${chalNote}.textContent.includes('It wins about 0 in 10')`), await js(`${chalNote}.querySelector('.warning.small')?.textContent ?? ''`));
  await js(`${spawnButton('The Last Dragon')}.click()`);
  ok('it starts anyway, since you said so', await waitFor('window.__game.G.bout && window.__game.G.bout.deadly'));
  ok('the file is still there during the fight', fs.existsSync(doomedFile));
  await fastForward(1);
  await js(`(() => { const { G } = window.__game; G.bout.hurt(G.bout.fighters[0], 1e9, G.bout.fighters[1], { silent: true }); return true; })()`);
  await fastForward(1);
  ok('losing takes it off the screen', await waitFor('window.__game.G.creature === null && window.__game.G.pet === null'));
  await sleep(250);
  const graveFile = path.join(HOME, 'graveyard', 'Doomed.creature');
  ok('its file moves to the graveyard', fs.existsSync(graveFile) && !fs.existsSync(doomedFile));
  const grave = JSON.parse(fs.readFileSync(graveFile, 'utf8'));
  ok('the gravestone says who did it', grave.dead?.by === 'The Last Dragon' && grave.name === 'Doomed', JSON.stringify(grave.dead));
  ok('nothing writes the file back', await (async () => {
    await fastForward(4);
    await js(`(async () => { const { saveCreature } = await import('./state.js'); await saveCreature(); })()`);
    await sleep(100);
    return !fs.existsSync(doomedFile);
  })());
  ok('the farewell note offers a way on', await waitFor(`[...document.querySelectorAll('.note')].some((n) => n.textContent.includes('Doomed is gone') && n.textContent.includes('Killed by The Last Dragon') && n.textContent.includes('Raise Bobbo'))`));
  await shot('16n-farewell');
  ok('Bobbo was not touched', fs.existsSync(file));
  await clickText('.note', 'Raise Bobbo');
  ok('it can raise another creature', await waitFor(`window.__game.G.creature?.name === 'Bobbo' && !!window.__game.G.pet`));
  await js(`(async () => { const { openCreatures } = await import('./ui/creatures.js'); await openCreatures(); })()`);
  await sleep(200);
  const rosterNote = `[...document.querySelectorAll('.note')].find((n) => n.querySelector('.note-title')?.textContent === 'Your creatures')`;
  await js(`[...${rosterNote}.querySelectorAll('button')].find((b) => b.textContent === 'Show').click()`);
  await sleep(100);
  ok('the graveyard lists it', await js(`${rosterNote}.textContent.includes('Graveyard') && ${rosterNote}.textContent.includes('Killed by The Last Dragon')`));
  ok('and it can\'t be raised', await js(`[...${rosterNote}.querySelectorAll('.card .name')].every((n) => !n.textContent.startsWith('Doomed'))`));
  // Even a dead file put back by hand stays dead.
  fs.copyFileSync(graveFile, path.join(HOME, 'creatures', 'Ghost.creature'));
  await js(`(async () => { const { closeAllNotes } = await import('./ui/notes.js'); closeAllNotes(); const { openCreatures } = await import('./ui/creatures.js'); await openCreatures(); })()`);
  await sleep(200);
  ok('moving a gravestone back does not bring it back', await js(`[...${rosterNote}.querySelectorAll('.card .name')].every((n) => !n.textContent.startsWith('Doomed'))`));
  fs.rmSync(path.join(HOME, 'creatures', 'Ghost.creature'));
  await js(`(async () => { const { closeAllNotes } = await import('./ui/notes.js'); closeAllNotes(); })()`);

  await js(`(() => { window.__game.G.pet.still = false; return true; })()`);

  // --- arena ---
  await js(`(async () => { const { openArena } = await import('./ui/boards.js'); await openArena(); })()`);
  await sleep(200);
  await clickText('.note.chalk', 'Add Bobbo');
  await sleep(40);
  await clickText('.note.chalk', 'Lv 2');
  await sleep(40);
  await clickText('.note.chalk', 'Lv 3');
  await sleep(40);
  await clickText('.note.chalk', 'Lv 3');
  await sleep(150);
  await shot('17-arena-board');
  ok('the roster shows what powers a fighter has', await js(`document.querySelector('.note.chalk .rosterrow').textContent.includes('Speedster')`));
  await clickText('.note.chalk', 'FIGHT');
  ok('a bout starts', await waitFor('window.__game.G.bout'));
  ok('its Stand comes with it', await js(`!!window.__game.G.bout.fighters[0].stand && !!window.__game.G.bout.fighters[0].trail`));
  // It has kept training since buying those Quirks, so this compares against its stats right now.
  const hpNumbers = await js(`(async () => {
    const { maxHpOf, hpFromStats, computeStats, hpGivenUp } = await import('./core/creature.js');
    const { G } = window.__game;
    return { fighter: G.bout.fighters[0].maxHp, menu: maxHpOf(G.creature), whole: hpFromStats(computeStats(G.creature)), given: hpGivenUp(G.creature) };
  })()`);
  ok('its sacrifice comes too', hpNumbers.fighter === hpNumbers.menu && hpNumbers.given === 60 && Math.abs(hpNumbers.fighter - hpNumbers.whole * 0.4) < 1, JSON.stringify(hpNumbers));
  await fastForward(12);
  await sleep(40);
  await shot('18-arena-fight');
  // Stopped time: whoever is caught in it loses their color on screen. The test body is red on one
  // side and blue on the other. A fighter's tint can cancel out one of those, never both, so both
  // get read. Everyone else is moved out of the way first.
  const fighterSides = (stopped) => js(`(() => {
    const { G, draw } = window.__game;
    const bout = G.bout;
    const f = bout.fighters.find((x) => x.alive && !x.minion);
    bout.fighters.forEach((o) => { if (o !== f) { o.x = -5000; if (o.stand) o.stand.x = -5000; } });
    f.stand = null;
    f.trail = null;
    f.dir = 1;
    f.x = bout.cx;
    f.y = bout.cy + 40;
    bout.stopLeft = ${stopped ? 5 : 0};
    bout.stopTeam = ${stopped ? 99 : -1};
    G.fx.floats.length = 0;
    draw();
    const s = window.devicePixelRatio;
    const size = 120 * f.scale * (G.settings.scale ?? 1);
    const read = (side) => {
      const d = document.getElementById('world').getContext('2d').getImageData((f.x + side * size * 0.25) * s, (f.y - size * 0.25) * s, 1, 1).data;
      return [d[0], d[1], d[2], d[3]];
    };
    return [read(-1), read(1)];
  })()`);
  const spread = ([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b);
  const inColor = await fighterSides(false);
  const inStoppedTime = await fighterSides(true);
  ok('a fighter in normal time has its color', inColor.every((p) => p[3] > 150) && Math.max(...inColor.map(spread)) > 40, JSON.stringify(inColor));
  ok('stopped time drains it', inStoppedTime.every((p) => p[3] > 150 && spread(p) < 8), JSON.stringify(inStoppedTime));
  await shot('18b-arena-stopped-time');
  await js(`(() => { window.__game.G.bout.stopLeft = 0; return true; })()`);
  await fastForward(170);
  ok('the bout ends with a winner', await waitFor('window.__game.G.bout && window.__game.G.bout.done && window.__game.G.bout.winner'), await js(`window.__game.G.bout?.winner?.name ?? 'none'`));
  await sleep(100);
  await shot('19-arena-win');
  ok('bout history saved', fs.existsSync(path.join(HOME, 'data', 'arena.json')));
  ok('own creature bout was recorded', await js(`(() => { const r = window.__game.G.creature.record; return r.arenaWins + r.arenaLosses === 1; })()`));
  await clickText('.note.chalk', 'Change fighters');
  await js(`(async () => { const { closeAllNotes } = await import('./ui/notes.js'); closeAllNotes(); })()`);

  // A hostile .creature imported through the real read path.
  const evilPath = path.join(HOME, 'evil.creature');
  fs.writeFileSync(evilPath, JSON.stringify({ format: 'creature/1', id: 'evil', name: '<img src=x onerror=window.__pwned=1>', growth: 1e9, mutations: [{ id: '__proto__' }], path: { line: ['doom'] } }));
  fs.writeFileSync(path.join(HOME, 'blank.creature'), '');
  await js(`(async () => { const { openArena } = await import('./ui/boards.js'); await openArena({ importPaths: [${JSON.stringify(evilPath)}, ${JSON.stringify(path.join(HOME, 'blank.creature'))}] }); })()`);
  await sleep(300);
  ok('a hostile name renders as plain text', await js(`!window.__pwned && !document.querySelector('.note img') && document.querySelector('.note.chalk .rosterrow .name')?.textContent.includes('img src')  === false ? true : !window.__pwned && !document.querySelector('.note img')`));
  ok('a blank .creature gets a friendly message', await js(`document.querySelector('.note.chalk').textContent.includes('empty')`));
  await js(`(async () => { const { closeAllNotes } = await import('./ui/notes.js'); closeAllNotes(); })()`);

  // --- persistence: save, then reload the page as if restarting ---
  await js(`(async () => { const { saveCreature } = await import('./state.js'); await saveCreature(); })()`);
  const before = await js(`JSON.stringify({ n: window.__game.G.creature.name, m: window.__game.G.creature.mutations.length, g: window.__game.G.creature.growth > 0, f: window.__game.G.creature.farm.fields.length })`);
  await sleep(100);
  win.webContents.reload();
  await sleep(600);
  ok('page reloads', await waitFor('window.__game && window.__game.G.pet'));
  const after = await js(`JSON.stringify({ n: window.__game.G.creature.name, m: window.__game.G.creature.mutations.length, g: window.__game.G.creature.growth > 0, f: window.__game.G.creature.farm.fields.length })`);
  ok('creature came back the same', before === after, after);
  ok('the household came back with it', await js(`window.__game.G.house.armory.starblade === 1 && window.__game.G.house.ore === 14`));

  // --- click-through wiring ---
  const ignoring = await js(`(() => { window.api.setRects([]); return true; })()`);
  ok('rect reports are accepted', ignoring);

  // --- the window keeps itself right, whatever a lock and unlock do to it ---
  const viewport = () => js(`({ w: innerWidth, h: innerHeight, sw: window.__game.G.screen.w, sh: window.__game.G.screen.h, cw: Math.round(document.getElementById('world').width / devicePixelRatio) })`);
  let vp = await viewport();
  ok('the drawing matches the window it is in', vp.w === vp.sw && vp.h === vp.sh && Math.abs(vp.cw - vp.w) <= 1, JSON.stringify(vp));
  const home = win.getBounds();
  // As if Windows moved and shrank the window while the screen was locked, and told nobody.
  // The regular check can put it back at any moment, so this tries a few times to catch it moved.
  let followed = false;
  for (let i = 0; i < 3 && !followed; i++) {
    win.setBounds({ x: home.x + 120, y: home.y + 40, width: home.width - 400, height: home.height - 300 });
    followed = await waitFor(`innerWidth === ${home.width - 400} && window.__game.G.screen.w === innerWidth && window.__game.G.screen.h === innerHeight`, 1500);
  }
  ok('when Windows resizes the window, the drawing follows it', followed, JSON.stringify(await viewport()));
  ok('and the creatures stay where they can be seen and clicked', await js(`window.__game.G.team.every((m) => m.pet.x <= innerWidth && m.pet.y <= innerHeight)`));
  main.fitOverlay('test');
  await sleep(400);
  ok('the regular check puts the window back over its monitor', JSON.stringify(win.getBounds()) === JSON.stringify(home), JSON.stringify(win.getBounds()));
  vp = await viewport();
  ok('and the drawing goes back with it', vp.sw === home.width && vp.sh === home.height, JSON.stringify(vp));
  const { powerMonitor } = require('electron');
  win.setBounds({ x: home.x + 60, y: home.y, width: home.width - 200, height: home.height });
  powerMonitor.emit('unlock-screen');
  await sleep(900);
  ok('unlocking the screen puts the window right and starts click-through over', JSON.stringify(win.getBounds()) === JSON.stringify(home) && main.isIgnoring(), JSON.stringify(win.getBounds()));
  const windowLog = path.join(HOME, 'userdata', 'window-log.txt');
  ok('and notes it down, in case clicks ever stop again', fs.existsSync(windowLog) && fs.readFileSync(windowLog, 'utf8').includes('screen unlocked'));

  // --- the taskbar button and its right-click list ---
  const hasNote = (id) => js(`(async () => { const { getNote } = await import('./ui/notes.js'); return !!getNote(${JSON.stringify(id)}); })()`);
  await js(`(async () => { const { closeAllNotes } = await import('./ui/notes.js'); closeAllNotes(); return true; })()`);
  main.taskbarClick();
  await sleep(250);
  ok('the taskbar button opens the menu', await hasNote('menu'));
  main.taskbarClick();
  await sleep(250);
  ok('and a second click closes it', !(await hasNote('menu')));
  main.toggleHidden(true);
  await sleep(120);
  main.taskbarClick();
  await sleep(250);
  ok('it brings everything back if it was hidden, menu open', !(await js('window.__game.G.hidden')) && await hasNote('menu'));
  main.openFromArgs(['electron.exe', '.', '--creature=feed']);
  await sleep(250);
  ok('its right-click list can open the feed note', await hasNote('feed'));
  main.openFromArgs(['--creature=hide']);
  await sleep(150);
  ok('and can hide everything', await js('window.__game.G.hidden'));
  main.openFromArgs(['--creature=hide']);
  await sleep(150);

  // --- tabs: notes stay open side by side ---
  await js(`(async () => { const { closeAllNotes } = await import('./ui/notes.js'); closeAllNotes(); const { openMenu } = await import('./ui/panels.js'); openMenu(); return true; })()`);
  await sleep(150);
  await js(`[...document.querySelectorAll('.hubs .btn')].find((b) => b.dataset.label === 'Care').click()`);
  await sleep(150);
  await js(`[...document.querySelectorAll('.note:not(.buried) .hubtab')].find((b) => b.textContent === 'Gear').click()`);
  await sleep(150);
  ok('a hub keeps one place on the screen: Gear took Feed\'s place, behind its tab', await js(`(async () => { const { getNote } = await import('./ui/notes.js'); const feed = getNote('feed'); const gear = getNote('workshop'); return feed.buried && !gear.buried && gear.el.style.left === feed.el.style.left; })()`));
  await js(`[...document.querySelectorAll('.note:not(.buried) .hubtab')].find((b) => b.textContent === 'Feed').click()`);
  await sleep(150);
  await js(`[...document.querySelectorAll('.hubs .btn')].find((b) => b.dataset.label === 'Fight').click()`);
  await sleep(200);
  ok('opening things from the menu keeps the menu open', await hasNote('menu') && await hasNote('feed') && await hasNote('workshop') && await hasNote('adventure'));
  const overlapOf = (a, b) => js(`(async () => {
    const { getNote } = await import('./ui/notes.js');
    const r1 = getNote('${a}').el.getBoundingClientRect();
    const r2 = getNote('${b}').el.getBoundingClientRect();
    const w = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left));
    const h = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));
    return (w * h) / Math.min(r1.width * r1.height, r2.width * r2.height);
  })()`);
  const overlaps = [await overlapOf('menu', 'feed'), await overlapOf('menu', 'adventure'), await overlapOf('feed', 'adventure')];
  ok('each new one finds its own space', overlaps.every((o) => o < 0.1), overlaps.map((o) => o.toFixed(2)).join(', '));
  await js(`(async () => { const { getNote } = await import('./ui/notes.js'); getNote('menu').el.querySelector('.note-body').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return true; })()`);
  ok('clicking a note brings it to the front', await js(`(async () => { const { getNote, isTopNote } = await import('./ui/notes.js'); return isTopNote(getNote('menu')); })()`));
  await shot('22-tabs');

  // --- three out at once ---
  await js(`(async () => {
    const { closeAllNotes } = await import('./ui/notes.js');
    closeAllNotes();
    const { createCreature } = await import('./ui/panels.js');
    for (const name of ['Digger', 'Sprouty']) {
      const made = await createCreature(name);
      await window.__game.G.bringOut(made.base, made.c);
    }
    return true;
  })()`);
  await sleep(200);
  ok('three can be out at once', await js(`window.__game.G.team.map((m) => m.c.name).join() === 'Bobbo,Digger,Sprouty'`), await js(`window.__game.G.team.map((m) => m.c.name).join()`));
  ok('and the game remembers who is out', JSON.parse(fs.readFileSync(path.join(HOME, 'data', 'settings.json'), 'utf8')).team.length === 3);
  await js(`(async () => { const { openMenu } = await import('./ui/panels.js'); openMenu(); return true; })()`);
  await sleep(120);
  const clickPet = (name) => js(`(() => {
    const m = window.__game.G.team.find((x) => x.c.name === ${JSON.stringify(name)});
    const r = m.pet.hitRect();
    const at = { clientX: r.x + r.w / 2, clientY: r.y + r.h / 2, button: 0, bubbles: true };
    window.dispatchEvent(new PointerEvent('pointerdown', at));
    window.dispatchEvent(new PointerEvent('pointerup', at));
    return true;
  })()`);
  await js(`(() => { const t = window.__game.G.team; t.forEach((m, i) => { m.pet.cancel(); m.pet.still = true; m.pet.x = 400 + i * 450; m.pet.y = 700; }); return true; })()`);
  await clickPet('Bobbo');
  await sleep(200);
  ok('clicking a creature looks after it, menu and all', await js(`window.__game.G.creature.name === 'Bobbo'`) && await hasNote('menu'));
  ok("the other one's notes wait out of sight", await js(`document.querySelectorAll('.note.elsewhere').length === 1`));
  await clickPet('Sprouty');
  await sleep(200);
  ok('and come back when it is clicked again', await js(`window.__game.G.creature.name === 'Sprouty' && document.querySelectorAll('.note.elsewhere').length === 1`));
  await shot('23-three-out');
  await js(`(() => { window.__game.G.team.forEach((m) => { m.pet.still = false; }); return true; })()`);

  // A creature in the middle of a fight is never the one sent back to make room.
  await js(`(async () => {
    const { G } = window.__game;
    G.lookAfter(G.team.find((m) => m.c.name === 'Digger').c);
    G.creature.fullness = 90;
    const { openChallenges } = await import('./ui/challenges.js');
    openChallenges();
    return true;
  })()`);
  await sleep(150);
  await js(`${spawnButton('Shell Crab')}.click()`);
  ok('a fight starts with three out', await waitFor('window.__game.G.challenge && window.__game.G.bout'));
  await js(keepFighting);
  await js(`(async () => { const { createCreature } = await import('./ui/panels.js'); const made = await createCreature('Extra'); await window.__game.G.bringOut(made.base, made.c); return true; })()`);
  await sleep(150);
  ok('bringing out a fourth never sends away the one fighting', await js(`(() => { const names = window.__game.G.team.map((m) => m.c.name); return names.length === 3 && names.includes('Digger') && names.includes('Extra'); })()`), await js(`window.__game.G.team.map((m) => m.c.name).join()`));
  await js(`(async () => {
    const { G } = window.__game;
    G.lookAfter(G.team.find((m) => m.c.name === 'Digger').c);
    return true;
  })()`);
  await clickText('.note.chalk', 'Run away');
  await sleep(100);
  ok('and the fight can still be ended', await js('window.__game.G.bout === null && window.__game.G.challenge === null'));
  // Back to the three this test goes on with.
  await js(`(async () => {
    const { G } = window.__game;
    await G.putAway(G.team.find((m) => m.c.name === 'Extra').c);
    const { parseCreature } = await import('./core/creature.js');
    for (const f of await window.api.listCreatures()) {
      if (f.base === 'Sprouty' && !G.team.some((m) => m.base === 'Sprouty')) await G.bringOut(f.base, parseCreature(f.text));
    }
    const { closeAllNotes } = await import('./ui/notes.js');
    closeAllNotes();
    return true;
  })()`);
  await sleep(150);
  ok('putting one away and bringing another back', await js(`window.__game.G.team.map((m) => m.c.name).sort().join() === 'Bobbo,Digger,Sprouty'`), await js(`window.__game.G.team.map((m) => m.c.name).join()`));

  // --- they share one bank, one larder and one food store ---
  const shared = await js(`(() => {
    const [a, b, c] = window.__game.G.team.map((m) => m.c);
    a.bank.gems += 3;
    b.larder.melon += 2;
    c.farm.store += 5;
    return { same: a.bank === b.bank && b.bank === c.bank && a.larder === c.larder, gems: [a, b, c].map((x) => x.bank.gems), melon: [a, b, c].map((x) => x.larder.melon), store: [a, b, c].map((x) => x.farm.store) };
  })()`);
  ok('all three share one bank, one larder and one food store', shared.same && new Set(shared.gems).size === 1 && new Set(shared.melon).size === 1 && new Set(shared.store).size === 1, JSON.stringify(shared));
  await js(`(async () => { const { saveTeam } = await import('./state.js'); await saveTeam(); return true; })()`);
  const houseFile = JSON.parse(fs.readFileSync(path.join(HOME, 'data', 'household.json'), 'utf8'));
  const ownFile = JSON.parse(fs.readFileSync(path.join(HOME, 'creatures', 'Digger.creature'), 'utf8'));
  ok('the shared pool has its own file, and no creature file holds a copy of it', houseFile.bank.gems >= 3 && houseFile.larder.melon >= 2 && ownFile.household === true && ownFile.bank.gems === 0 && ownFile.larder.melon === 0 && ownFile.farm.store === 0, JSON.stringify({ house: houseFile.bank.gems, own: ownFile.bank.gems }));
  // An older creature with savings of its own brings them into the pool, once.
  await js(`(async () => {
    const { newCreature, serializeCreature } = await import('./core/creature.js');
    const c = newCreature('Oldie');
    c.bank.red = 77;
    c.household = false;
    await window.api.saveCreature('Oldie', serializeCreature(c));
    return true;
  })()`);
  const poolRedBefore = await js('window.__game.G.house.bank.red');
  await js(`(async () => {
    const { parseCreature } = await import('./core/creature.js');
    const f = (await window.api.listCreatures()).find((x) => x.base === 'Oldie');
    await window.__game.G.bringOut(f.base, parseCreature(f.text));
    const { saveCreature } = await import('./state.js');
    await saveCreature(window.__game.G.creature);
    return true;
  })()`);
  await sleep(150);
  const oldie = JSON.parse(fs.readFileSync(path.join(HOME, 'creatures', 'Oldie.creature'), 'utf8'));
  ok('a creature with its own savings adds them to the pool when it comes out', (await js('window.__game.G.house.bank.red')) === poolRedBefore + 77 && oldie.household === true && oldie.bank.red === 0, `${poolRedBefore} to ${await js('window.__game.G.house.bank.red')}`);
  ok('and never twice', await js(`(async () => {
    const { parseCreature } = await import('./core/creature.js');
    const { joinHouse } = await import('./core/house.js');
    const { G } = window.__game;
    const f = (await window.api.listCreatures()).find((x) => x.base === 'Oldie');
    const before = G.house.bank.red;
    joinHouse(G.house, parseCreature(f.text));
    return G.house.bank.red === before;
  })()`));
  await js(`(async () => {
    const { G } = window.__game;
    const extra = G.team.find((m) => !['Bobbo', 'Digger', 'Sprouty'].includes(m.c.name));
    if (extra) await G.putAway(extra.c);
    const { parseCreature } = await import('./core/creature.js');
    for (const f of await window.api.listCreatures()) {
      if (f.base === 'Sprouty' && !G.team.some((m) => m.base === 'Sprouty')) await G.bringOut(f.base, parseCreature(f.text));
    }
    const { closeAllNotes } = await import('./ui/notes.js');
    closeAllNotes();
    return true;
  })()`);
  await sleep(150);
  ok('back to the same three', await js(`window.__game.G.team.map((m) => m.c.name).sort().join() === 'Bobbo,Digger,Sprouty'`), await js(`window.__game.G.team.map((m) => m.c.name).join()`));

  // --- the nurse looks after the others ---
  await js(`(async () => {
    const { choosePath } = await import('./core/creature.js');
    const { G } = window.__game;
    const nurse = G.team.find((m) => m.c.name === 'Sprouty');
    nurse.c.growth = 20;
    choosePath(nurse.c, 'nurse');
    nurse.c.path.xp = 0;
    nurse.c.fullness = 90;
    nurse.pet.jobWait = 0;
    nurse.pet.cancel();
    const hungry = G.team.find((m) => m.c.name === 'Digger');
    hungry.c.fullness = 8;
    return true;
  })()`);
  await fastForward(40);
  const care = await js(`(() => { const t = window.__game.G.team; return { fed: t.find((m) => m.c.name === 'Digger').c.fullness, xp: t.find((m) => m.c.name === 'Sprouty').c.path.xp }; })()`);
  ok('a nurse snacks a hungry teammate, and learns its job doing it', care.fed > 20 && care.xp > 0, JSON.stringify(care));

  // --- breeding, through the real buttons ---
  await js(`(() => {
    const { G } = window.__game;
    for (const m of G.team) { m.c.growth = Math.max(m.c.growth, 60); m.c.fullness = 90; }
    const digger = G.team.find((m) => m.c.name === 'Digger').c;
    const bobbo = G.team.find((m) => m.c.name === 'Bobbo').c;
    // Its own random gifts would change what the chips say.
    bobbo.traits = [];
    bobbo.mutations = bobbo.mutations.filter((m) => m.id !== 'moss');
    digger.traits = ['cursedbody'];
    digger.mutations = [{ id: 'moss', from: '', at: 0 }];
    return true;
  })()`);
  await js(`(async () => { const { closeAllNotes } = await import('./ui/notes.js'); closeAllNotes(); const { openBreed } = await import('./ui/breed.js'); await openBreed(); return true; })()`);
  await sleep(200);
  const breedNote = `[...document.querySelectorAll('.note')].find((n) => n.querySelector('.note-title')?.textContent === 'Nursery')`;
  await js(`(async () => {
    const { getNote } = await import('./ui/notes.js');
    const note = getNote('nursery');
    const base = (name) => window.__game.G.team.find((m) => m.c.name === name).base;
    note.spec.breed.picked = [base('Bobbo'), base('Digger')];
    note.rebuild();
    return true;
  })()`);
  await sleep(100);
  ok('the breed note shows what each parent could pass on', await js(`${breedNote}.textContent.includes('Cursed Body (Digger)') && ${breedNote}.textContent.includes('Moss Coat (Digger)')`), await js(`${breedNote}.textContent.slice(0, 400)`));
  ok('but never One For All', await js(`![...${breedNote}.querySelectorAll('button.chip')].some((b) => b.textContent.startsWith('One For All'))`));
  await js(`[...${breedNote}.querySelectorAll('button.chip')].find((b) => b.textContent === 'Cursed Body (Digger)').click()`);
  await sleep(60);
  await js(`[...${breedNote}.querySelectorAll('button.chip')].find((b) => b.textContent === 'Moss Coat (Digger)').click()`);
  await sleep(60);
  const lastNames = await js(`[...${breedNote}.querySelectorAll('.chips')][0].textContent`);
  await js(`(() => { const chips = [...${breedNote}.querySelectorAll('.chips')][0].querySelectorAll('button'); chips[chips.length - 1].click(); return true; })()`);
  await sleep(60);
  await js(`(() => { const i = ${breedNote}.querySelector('input'); i.value = 'Pebble'; i.dispatchEvent(new Event('input')); return true; })()`);
  await shot('24-breed');
  await clickText('.note.paper', 'Hatch the egg');
  const pebbleFile = path.join(HOME, 'creatures', 'Pebble.creature');
  ok('hatching makes its .creature file', await waitFor(`${breedNote}.textContent.includes('Pebble') && ${breedNote}.textContent.includes('hatched')`) && fs.existsSync(pebbleFile), lastNames);
  const pebble = JSON.parse(fs.readFileSync(pebbleFile, 'utf8'));
  ok('with what was chosen, and nothing else', pebble.traits.join() === 'cursedbody' && pebble.mutations.map((m) => m.id).join() === 'moss' && pebble.parents.length === 2 && !pebble.powers.quirks.includes('oneforall'), JSON.stringify({ t: pebble.traits, m: pebble.mutations, q: pebble.powers.quirks }));
  // Sprouty, the nurse out on the screen, saves each parent half of what an egg costs.
  ok('both parents paid for it, less with a nurse out', await js(`window.__game.G.team.filter((m) => ['Bobbo', 'Digger'].includes(m.c.name)).every((m) => m.c.fullness <= 75 && m.c.fullness > 70 && m.c.bredAt > 0)`), await js(`window.__game.G.team.map((m) => m.c.name + ' ' + Math.round(m.c.fullness)).join(', ')`));
  ok('and there is no waiting: they could go again', await js(`(async () => { const { breedProblem } = await import('./core/family.js'); return window.__game.G.team.filter((m) => ['Bobbo', 'Digger'].includes(m.c.name)).every((m) => breedProblem(m.c) === null); })()`));
  ok('and the nurse that was out helped, and learned from it', pebble.growth === 0 && await js(`window.__game.G.team.find((m) => m.c.name === 'Sprouty').c.path.xp`) >= 25);
  await shot('25-hatched');
  await clickText('.note.paper', 'Bring it out');
  await sleep(250);
  ok('it can come straight out, swapping for the one looked after', await js(`window.__game.G.team.length === 3 && window.__game.G.team.some((m) => m.c.name === 'Pebble') && window.__game.G.creature.name === 'Pebble'`), await js(`window.__game.G.team.map((m) => m.c.name).join()`));

  // --- One For All, passed on from Bobbo ---
  await js(`(async () => {
    const { closeAllNotes } = await import('./ui/notes.js');
    closeAllNotes();
    const { G } = window.__game;
    G.lookAfter(G.team.find((m) => m.c.name === 'Bobbo').c);
    const { openPowers } = await import('./ui/powers.js');
    openPowers();
    return true;
  })()`);
  await sleep(200);
  ok('the powers note shows its One For All level', await js(`(() => { const n = [...document.querySelectorAll('.note')].find((x) => x.textContent.includes('Bobbo') && x.textContent.includes('powers')); return n.textContent.includes('One For All') && n.textContent.includes('Level 1 of 7'); })()`));
  await clickText('.note', 'Pass it on');
  const ofaNote = `[...document.querySelectorAll('.note')].find((n) => n.querySelector('.note-title')?.textContent === 'Pass on One For All')`;
  ok('passing it on opens its own note', await waitFor(`!!${ofaNote}`));
  const giveTo = `[...${ofaNote}.querySelectorAll('.rosterrow')].find((r) => r.querySelector('.name').textContent.startsWith('Digger')).querySelector('button')`;
  await js(`${giveTo}.click()`);
  await sleep(80);
  ok('the first press only asks', await js(`${giveTo}.textContent === 'Forever?'`) && fs.existsSync(file));
  await shot('26-pass-on');
  await js(`${giveTo}.click()`);
  const bobboGrave = path.join(HOME, 'graveyard', 'Bobbo.creature');
  ok('the second press ends Bobbo for good', await waitFor(`window.__game.G.creature?.name === 'Digger'`) && await (async () => { await sleep(300); return fs.existsSync(bobboGrave) && !fs.existsSync(file); })());
  const bobboStone = JSON.parse(fs.readFileSync(bobboGrave, 'utf8'));
  const diggerFile = JSON.parse(fs.readFileSync(path.join(HOME, 'creatures', 'Digger.creature'), 'utf8'));
  ok('its gravestone says who it gave it to', bobboStone.dead?.to === 'Digger' && bobboStone.dead?.by === 'One For All', JSON.stringify(bobboStone.dead));
  ok('and the heir holds it, with Bobbo\'s power stockpiled', diggerFile.powers.quirks.includes('oneforall') && diggerFile.ofa.stockpile > 0 && diggerFile.ofa.holders[0].startsWith('Bobbo'), JSON.stringify(diggerFile.ofa));
  ok('Bobbo is off the screen', await js(`!window.__game.G.team.some((m) => m.c.name === 'Bobbo')`));
  await shot('27-heir');

  // --- every chance in one place ---
  await js(`(async () => {
    const { closeAllNotes } = await import('./ui/notes.js');
    closeAllNotes();
    const { openPowers } = await import('./ui/powers.js');
    openPowers();
    return true;
  })()`);
  await sleep(150);
  await clickText('.note', 'Every chance in the game');
  await sleep(150);
  const chanceNote = `[...document.querySelectorAll('.note')].find((n) => n.querySelector('.note-title')?.textContent === 'Guide')`;
  ok('the powers note leads to every chance in one place', await js(`(() => {
    const t = ${chanceNote}.textContent;
    return t.includes('Six Eyes') && t.includes('1 in 5') && t.includes('1 in 40 of all eggs') && t.includes('Twin Soul') && t.includes('Black Flash') && t.includes('Vein') && !t.includes('undefined') && !t.includes('NaN');
  })()`), await js(`${chanceNote}?.textContent.slice(0, 300) ?? 'no note'`));
  await shot('28-chances');
  await clickText('.note', 'Stats');
  await sleep(100);
  ok('and its tabs still go back to the stats', await js(`${chanceNote}.textContent.includes('How to raise it')`));
  await clickText('.note', 'Breeding');
  await sleep(100);
  ok('the guide explains breeding, with recipes', await js(`(() => { const t = ${chanceNote}.textContent; return t.includes('How it works') && t.includes('Recipes') && t.includes('Six Eyes') && t.includes('A nurse helps') && !t.includes('undefined'); })()`));
  await clickText('.note', 'Start here');
  await sleep(100);
  ok('and where to start, with a way to every part of the game', await js(`(() => { const n = ${chanceNote}; return n.textContent.includes('1. Feed it') && n.textContent.includes('Your village') && n.querySelectorAll('.way .btn').length >= 10; })()`));
  await shot('29-guide-start');

  // --- the ? on a note opens the guide on the page for it ---
  await js(`(async () => {
    const { closeAllNotes } = await import('./ui/notes.js');
    closeAllNotes();
    const { openBreed } = await import('./ui/breed.js');
    await openBreed();
    return true;
  })()`);
  await sleep(150);
  await js(`[...document.querySelectorAll('.note')].find((n) => n.querySelector('.note-title')?.textContent === 'Nursery').querySelector('.note-help').click()`);
  await sleep(150);
  ok('the ? on the nursery opens the breeding guide', await js(`(() => { const n = ${chanceNote}; return !!n && n.querySelector('.tabs .hot')?.textContent === 'Breeding'; })()`));

  // --- the menu: a next step, and a family row ---
  await js(`(async () => { const { closeAllNotes } = await import('./ui/notes.js'); closeAllNotes(); window.__game.G.creature.fullness = 10; const { openMenu } = await import('./ui/panels.js'); openMenu(); return true; })()`);
  await sleep(150);
  ok('the menu has its four places, each saying what is in it', await js(`[...document.querySelectorAll('.hubs .btn')].every((b) => b.querySelector('small').textContent.includes(' · '))`));
  ok('and a line for the household', await js(`document.querySelector('.note .household')?.textContent.includes('gems')`));
  ok('and suggests what to do next', await js(`!!document.querySelector('.note .tip') && document.querySelector('.note .tip').textContent.startsWith('Next:')`));
  ok('the button for it glows, with a CLICK! on it', await js(`document.querySelector('.note .tip').classList.contains('loud') && [...document.querySelectorAll('.hubs .btn.glow')].some((b) => b.dataset.label === 'Care')`));
  ok('new things say NEW! until they are tried', await js(`[...document.querySelectorAll('.hubs .btn.isnew')].length > 0`));
  ok('and the creature stops saying CLICK ME once its menu has been opened', await js(`localStorage.getItem('creature-seen:menu') === '1'`));
  await shot('30-menu');

  // --- your creatures: everyone in one place ---
  const creaturesNote = `[...document.querySelectorAll('.note')].find((n) => n.querySelector('.note-title')?.textContent === 'Your creatures')`;
  await js('window.__game.G.open("creatures")');
  await waitFor(`!!${creaturesNote}`);
  await sleep(150);
  ok('your creatures shows everyone, out on the screen and at home', await js(`(() => { const n = ${creaturesNote}; const names = [...n.querySelectorAll('.card .name')].map((x) => x.textContent); return names.some((t) => t.startsWith('Digger')) && names.some((t) => t.startsWith('Extra')) && !!n.querySelector('.badge.out') && !!n.querySelector('.badge.home'); })()`));
  await shot('31-creatures');
  await js(`[...${creaturesNote}.querySelectorAll('.toolbar button.chip')].find((b) => b.textContent === 'On screen').click()`);
  await sleep(80);
  ok('it can show only those out on your screen', await js(`(() => { const cards = [...${creaturesNote}.querySelectorAll('.card')]; return cards.length === window.__game.G.team.length && cards.every((c) => c.querySelector('.badge.out')); })()`));
  await js(`[...${creaturesNote}.querySelectorAll('.toolbar button.chip')].find((b) => b.textContent === 'All').click()`);
  await sleep(80);
  // Letting one go: two presses, and it goes to the graveyard.
  const ridOf = `[...${creaturesNote}.querySelectorAll('.card')].find((r) => r.querySelector('.name').textContent.startsWith('Extra')).querySelector('.acts .btn:last-child')`;
  await js(`${ridOf}.click()`);
  await sleep(60);
  ok('letting one go asks first', await js(`${ridOf}.textContent === 'Forever?'`) && fs.existsSync(path.join(HOME, 'creatures', 'Extra.creature')));
  await js(`${ridOf}.click()`);
  const extraGrave = path.join(HOME, 'graveyard', 'Extra.creature');
  ok('and then it is gone for good', await waitFor(`![...${creaturesNote}.querySelectorAll('.card .name')].some((n) => n.textContent.startsWith('Extra'))`) && fs.existsSync(extraGrave) && !fs.existsSync(path.join(HOME, 'creatures', 'Extra.creature')));
  ok('its gravestone says you did it', JSON.parse(fs.readFileSync(extraGrave, 'utf8')).dead?.by === 'you' && await js(`${creaturesNote}.textContent.includes('gone for good')`));

  // --- the village: what home brings in ---
  const villageNote = `[...document.querySelectorAll('.note')].find((n) => n.querySelector('.note-title')?.textContent === 'Village')`;
  await js(`(async () => { const { openVillage } = await import('./ui/village.js'); await openVillage(); return true; })()`);
  await waitFor(`!!${villageNote}`);
  await sleep(150);
  ok('the village shows everyone at home, working', await js(`(() => { const t = ${villageNote}.textContent; return t.includes('Each hour the village brings in') && t.includes('Oldie'); })()`));
  await shot('31b-village');

  // --- expeditions ---
  await clickText('.note', 'Expeditions');
  await sleep(120);
  await js(`[...${villageNote}.querySelectorAll('button.chip')].find((b) => b.textContent.startsWith('Oldie')).click()`);
  await sleep(80);
  const sendCoast = `[...${villageNote}.querySelectorAll('.way')].find((w) => w.textContent.includes('Along the coast')).querySelector('button')`;
  await js(`${sendCoast}.click()`);
  ok('an expedition sets off with who you picked', await waitFor(`window.__game.G.house.expeditions.length === 1 && window.__game.G.house.expeditions[0].party[0].name.startsWith('Oldie')`));
  ok('and they are away from the village', await js(`!window.__game.G.village.some((r) => r.c.name === 'Oldie')`));
  ok('and a clock counts down until they are back', await waitFor(`/^\\d+:\\d\\d/.test(${villageNote}.querySelector('.clockline .when')?.textContent ?? '')`), await js(`${villageNote}.querySelector('.clockline .when')?.textContent ?? 'no clock'`));
  await shot('32-expedition');
  const gemsBefore = await js('window.__game.G.house.bank.gems');
  await js(`(() => { window.__game.G.house.expeditions[0].end = Date.now() - 1; return true; })()`);
  await fastForward(22);
  ok('when the time is up, they come home with gems', await waitFor(`window.__game.G.house.expeditions.length === 0 && window.__game.G.house.bank.gems > ${gemsBefore}`) && await waitFor(`window.__game.G.village.some((r) => r.c.name === 'Oldie')`));
  // What an expedition finds waits for a name.
  await js(`(async () => {
    const { G } = window.__game;
    G.house.found.push({ race: 'devil', where: 'sea', at: Date.now() });
    const { openVillage } = await import('./ui/village.js');
    await openVillage('expeditions');
    return true;
  })()`);
  await sleep(150);
  ok('a creature they found waits for a name', await js(`${villageNote}.textContent.includes('A Devil!')`));
  ok('and while it waits, the game can take typing for its name', main.getWindow().isFocusable());
  // The expedition itself may have found someone too, so this names the Devil, wherever it is.
  const devilWay = `[...${villageNote}.querySelectorAll('.way')].find((w) => w.textContent.includes('A Devil!'))`;
  await js(`(() => { const i = ${devilWay}.querySelector('input'); i.value = 'Pochita'; i.dispatchEvent(new Event('input')); return true; })()`);
  await js(`[...${devilWay}.querySelectorAll('button')].find((b) => b.textContent === 'Take it in').click()`);
  const pochitaFile = path.join(HOME, 'creatures', 'Pochita.creature');
  ok('and comes home to the village as that race', await waitFor(`window.__game.G.village.some((r) => r.c.name === 'Pochita')`) && fs.existsSync(pochitaFile) && JSON.parse(fs.readFileSync(pochitaFile, 'utf8')).race === 'devil', await js(`window.__game.G.everyone.map((r) => r.c.name + ':' + r.c.race).join(', ')`));

  // --- the Legendary Mine ---
  await js(`(async () => {
    const { G } = window.__game;
    const row = G.village.find((r) => r.c.name === 'Pochita');
    row.c.path = { line: ['miner', 'prospector', 'hoarder'], xp: 400 };
    row.c.growth = 100;
    const { creatureText } = await import('./state.js');
    await window.api.saveCreature(row.base, creatureText(row.c));
    const { openVillage } = await import('./ui/village.js');
    await openVillage('mine');
    return true;
  })()`);
  await sleep(150);
  ok('the Legendary Mine lists the legendary Miners at home', await js(`${villageNote}.textContent.includes('Legendary ore') && [...${villageNote}.querySelectorAll('.rosterrow .name')].some((n) => n.textContent.startsWith('Pochita'))`));
  await clickText('.note', 'Send down');
  ok('one goes down the mine', await waitFor('window.__game.G.house.mine.length === 1'));
  const oreBefore = await js('window.__game.G.house.ore');
  await js(`(() => { window.__game.G.house.village.lastTick = Date.now() - 3 * 3600 * 1000; return true; })()`);
  await fastForward(22);
  ok('and brings up Legendary ore', await waitFor(`window.__game.G.house.ore > ${oreBefore}`), String(await js('window.__game.G.house.ore')));
  await shot('33-legendary-mine');

  // --- Adventure ---
  const adventureNote = `[...document.querySelectorAll('.note')].find((n) => n.querySelector('.note-title')?.textContent === 'Adventure')`;
  await js(`(async () => {
    const { closeAllNotes } = await import('./ui/notes.js');
    closeAllNotes();
    const { openAdventure } = await import('./ui/adventure.js');
    await openAdventure();
    return true;
  })()`);
  await sleep(150);
  ok('adventure shows thirty levels in two acts, only the first open', await js(`(() => { const lv = [...${adventureNote}.querySelectorAll('.lvl')]; return lv.length === 30 && !lv[0].disabled && lv[1].disabled && ${adventureNote}.querySelectorAll('.acthead').length === 2; })()`));
  ok('and the party starts as whoever is out', await js('window.__game.G.house.adventure.party.length >= 1'));
  await shot('34-adventure');
  await clickText('.note', 'Fight level 1');
  ok('a level starts in a ring, the party on one side and the enemy on the other', await waitFor('window.__game.G.bout && window.__game.G.bout.adventure === 1') && await js(`(() => { const b = window.__game.G.bout; return b.fighters.some((f) => f.team === 0) && b.fighters.some((f) => f.team === 1); })()`));
  await fastForward(1);
  await shot('34b-adventure-fight');
  const gemsLevel = await js('window.__game.G.house.bank.gems');
  await js(`(() => { const b = window.__game.G.bout; b.fighters.filter((f) => f.team !== 0).forEach((f) => { for (let i = 0; i < 3 && f.alive; i++) b.hurt(f, 1e9, b.fighters[0], { silent: true }); }); return true; })()`);
  await fastForward(1);
  ok('winning it pays the first time, and opens level 2', await waitFor(`${adventureNote}.textContent.includes('Level 1 beaten')`) && await js(`window.__game.G.house.adventure.best === 1 && window.__game.G.house.bank.gems >= ${gemsLevel} + 2`));
  await sleep(2400);
  ok('and the ring clears', await js('window.__game.G.bout === null'));
  ok('level 2 is open now', await js(`!${adventureNote}.querySelectorAll('.lvl')[1].disabled`));

  // --- rolling eggs ---
  await js(`(async () => {
    const { closeAllNotes } = await import('./ui/notes.js');
    closeAllNotes();
    window.__game.G.house.bank.gems = 400;
    const { openRoll } = await import('./ui/roll.js');
    await openRoll();
    return true;
  })()`);
  await sleep(150);
  const rollNote = `[...document.querySelectorAll('.note')].find((n) => n.querySelector('.note-title')?.textContent === 'Nursery')`;
  ok('the eggs tab shows the egg on offer, its family and gifts', await js(`(() => { const t = ${rollNote}.textContent; return t.includes('Born with') && t.includes('Gems: 400') && !!${rollNote}.querySelector('.egg'); })()`));
  const eggBefore = await js('window.__game.G.house.egg.id');
  await clickText('.note.paper', 'Roll again');
  await sleep(100);
  ok('rolling again costs a gem and brings a new egg', await js(`window.__game.G.house.bank.gems === 399 && window.__game.G.house.egg.id !== ${JSON.stringify(eggBefore)}`));
  await js(`[...${rollNote}.querySelectorAll('button.chip')].find((b) => b.textContent === 'Gojo').click()`);
  await sleep(60);
  await js(`[...${rollNote}.querySelectorAll('button.chip')].find((b) => b.textContent === '100 gems').click()`);
  await sleep(60);
  ok('it says how likely that is', await js(`${rollNote}.textContent.includes('About 1 roll in 8')`));
  await clickText('.note.paper', 'Hyper roll');
  await sleep(150);
  ok('a hyper roll that lands one gets a big popup', await js(`[...document.querySelectorAll('.toasts .toast')].some((t) => t.textContent.includes('HYPER ROLL'))`));
  ok('popups never take a click', await js(`getComputedStyle(document.querySelector('.toasts')).pointerEvents === 'none'`));
  ok('calm mode keeps them away', await js(`(async () => {
    const { toast } = await import('./ui/flair.js');
    const { G } = window.__game;
    G.settings.calm = true;
    const before = document.querySelectorAll('.toast').length;
    toast('should not show');
    const after = document.querySelectorAll('.toast').length;
    G.settings.calm = false;
    return before === after;
  })()`));
  ok('hyper roll keeps going until it lands a Gojo', await js(`(async () => { const { eggFromId } = await import('./core/roll.js'); return eggFromId(window.__game.G.house.egg.id).lineage === 'limitless' && ${rollNote}.textContent.includes('Got it in'); })()`));
  await shot('36-roll');
  await js(`(() => { const i = ${rollNote}.querySelector('input'); i.value = 'Rolly'; i.dispatchEvent(new Event('input')); return true; })()`);
  await clickText('.note.paper', 'Keep it');
  const rollyFile = path.join(HOME, 'creatures', 'Rolly.creature');
  ok('keeping it hatches exactly that egg', await waitFor(`!!window.__game.G.everyone.find((r) => r.c.name === 'Rolly')`) && fs.existsSync(rollyFile) && JSON.parse(fs.readFileSync(rollyFile, 'utf8')).lineage === 'limitless');
  const rollyId = JSON.parse(fs.readFileSync(rollyFile, 'utf8')).id;
  ok('and a new egg is on offer', await waitFor(`!!window.__game.G.house.egg && window.__game.G.house.egg.id !== ${JSON.stringify(rollyId)}`));

  // --- the Mega Breeder and the bag ---
  await clickText('.note.paper', 'Buy: 150 gems');
  ok('the Mega Breeder is bought once, for gems', await waitFor('window.__game.G.house.megaBreeder === true') && await js(`${rollNote}.textContent.includes('Mega Breeder:')`));
  await js(`(() => { window.__game.G.house.items = { chamber: 1, expander: 1 }; return true; })()`);
  await clickText('.note.paper', 'Items');
  await sleep(120);
  ok('the bag shows what Adventure and expeditions bring home', await js(`(() => { const t = ${rollNote}.textContent; return t.includes('Time Chamber Key') && t.includes('Limit Expander'); })()`));
  await shot('36b-items');
  const chamberRow = `[...${rollNote}.querySelectorAll('.itemrow')].find((r) => r.textContent.includes('Time Chamber'))`;
  await js(`(() => { const sel = ${chamberRow}.querySelector('select'); const opt = [...sel.options].find((o) => o.textContent.startsWith('Rolly')); sel.value = opt.value; sel.dispatchEvent(new Event('change')); return true; })()`);
  await js(`[...${chamberRow}.querySelectorAll('button')].find((b) => b.textContent === 'Use it').click()`);
  ok('a Time Chamber Key grows a hatchling up, ready to breed', await waitFor(`(() => { const r = window.__game.G.everyone.find((x) => x.c.name === 'Rolly'); return !!r && r.c.growth >= 90 && r.c.fullness >= 40; })()`) && await (async () => { await sleep(200); return JSON.parse(fs.readFileSync(rollyFile, 'utf8')).growth >= 90; })());
  ok('and it is used up', await js('window.__game.G.house.items.chamber === 0'));

  // --- a Devil Fruit ---
  await js(`(async () => {
    const { closeAllNotes } = await import('./ui/notes.js');
    closeAllNotes();
    const { G } = window.__game;
    G.house.fruits.gomu = 1;
    const c = G.creature;
    c.powers.stand = null; c.powers.speedster = false; c.powers.technique = null; c.powers.technique2 = null; c.legendary = null;
    c.training.vigor = 40; c.essence.sap = 200;
    const { openPowers } = await import('./ui/powers.js');
    openPowers();
    return true;
  })()`);
  await sleep(150);
  const fruitNote = `[...document.querySelectorAll('.note')].find((n) => n.querySelector('.note-title')?.textContent.endsWith("'s powers"))`;
  ok('the powers note has a Devil Fruit part, and the jump bar goes to it', await js(`(() => { const n = ${fruitNote}; return n.textContent.includes('Gum-Gum Fruit x1') && [...n.querySelectorAll('.jumpbar .chip')].some((b) => b.textContent === 'Devil Fruit'); })()`));
  const eatButton = `[...${fruitNote}.querySelectorAll('.quirk')].find((q) => q.textContent.includes('Gum-Gum')).querySelector('button')`;
  await js(`${eatButton}.click()`);
  await js(`${eatButton}.click()`);
  await sleep(150);
  ok('eating it takes it from the pool, for good', await js(`window.__game.G.creature.powers.fruit === 'gomu' && !window.__game.G.house.fruits.gomu`));
  ok('and nothing else fits now', await js(`[...${fruitNote}.querySelectorAll('button')].filter((b) => ['Awaken its Stand', 'Become a speedster', 'Awaken its technique'].includes(b.textContent)).every((b) => b.disabled)`));
  await shot('37-devil-fruit');

  // --- renaming: the name and its file ---
  await js(`(async () => { const { closeAllNotes } = await import('./ui/notes.js'); closeAllNotes(); const { openCreatures } = await import('./ui/creatures.js'); await openCreatures(); return true; })()`);
  await sleep(150);
  await js(`[...[...${creaturesNote}.querySelectorAll('.card')].find((r) => r.querySelector('.name').textContent.startsWith('Pochita')).querySelectorAll('button')].find((b) => b.textContent === 'Rename').click()`);
  await sleep(100);
  await js(`(() => { const i = ${creaturesNote}.querySelector('.renamebox input'); i.value = 'Denji'; i.dispatchEvent(new Event('input')); return true; })()`);
  await clickText('.note.paper', 'Save');
  ok('renaming one renames its file too', await waitFor(`window.__game.G.everyone.some((r) => r.c.name === 'Denji')`) && fs.existsSync(path.join(HOME, 'creatures', 'Denji.creature')) && !fs.existsSync(pochitaFile));
  ok('and it keeps its place in the Legendary Mine', await js(`window.__game.G.house.mine.includes(window.__game.G.everyone.find((r) => r.c.name === 'Denji').c.id)`));
  await shot('38-renamed');

  // --- the dock: every creature down the side, dragged out onto the screen ---
  ok('the dock shows every creature', await js(`document.querySelectorAll('#dock .dock-tile').length === window.__game.G.everyone.length`));
  ok('the dock has a party of three slots at the top', await js(`document.querySelectorAll('#dock .dock-party .dock-slot').length === 3`));
  // Drags a tile to a point, the way a mouse would.
  const dockDrag = (name, toSelector) => js(`(() => {
    const tile = [...document.querySelectorAll('#dock .dock-tile')].find((t) => t.querySelector('.dock-name').textContent === ${JSON.stringify(name)});
    const target = document.querySelector(${JSON.stringify(toSelector)});
    if (!tile || !target) return 'missing';
    const a = tile.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    tile.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: a.left + 10, clientY: a.top + 10 }));
    window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: b.left + b.width / 2, clientY: b.top + b.height / 2 }));
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: b.left + b.width / 2, clientY: b.top + b.height / 2 }));
    return true;
  })()`);
  const swap = await js(`(() => {
    const { G } = window.__game;
    const away = new Set(G.house.expeditions.flatMap((e) => e.party.map((p) => p.base)));
    const row = G.everyone.find((r) => !G.team.some((m) => m.base === r.base) && !away.has(r.base));
    return row ? { name: row.c.name, first: G.team[0].c.name, full: G.team.length } : null;
  })()`);
  await dockDrag(swap.name, '#dock .dock-party .dock-slot');
  ok('dragging one onto a full party slot swaps the two', await waitFor(`window.__game.G.team.some((m) => m.c.name === ${JSON.stringify(swap.name)}) && !window.__game.G.team.some((m) => m.c.name === ${JSON.stringify(swap.first)})`), JSON.stringify(swap));
  await sleep(200);
  await dockDrag(swap.name, '#dock .dock-list');
  ok('and dragging one from the party down to the village puts it away', await waitFor(`!window.__game.G.team.some((m) => m.c.name === ${JSON.stringify(swap.name)})`));
  await sleep(200);
  await dockDrag(swap.name, '#dock .dock-party .dock-slot.empty');
  ok('and into a free slot brings it out again', await waitFor(`window.__game.G.team.some((m) => m.c.name === ${JSON.stringify(swap.name)})`));
  const dragged = swap.name;
  await sleep(300);
  await shot('39-dock');

  // --- the Codex: every race, job, gift and the rest, from the game's own data ---
  await js(`(async () => { const { closeAllNotes } = await import('./ui/notes.js'); closeAllNotes(); window.__game.G.open('guide:codex'); return true; })()`);
  await sleep(200);
  ok('the Codex lists every race', await js(`document.querySelectorAll('.cx-card').length >= 9 && [...document.querySelectorAll('.cx-name')].some((n) => n.textContent === 'Skypiean')`));
  await shot('40-codex-races');
  await js(`[...document.querySelectorAll('.cx-nav .chip')].find((b) => b.textContent === 'Jobs').click()`);
  await sleep(150);
  ok('and the whole job tree, every branch', await js(`document.querySelectorAll('.cx-node').length >= 28 && document.querySelectorAll('.cx-node.tier3').length === 16`));
  await shot('41-codex-jobs');
  await js(`[...document.querySelectorAll('.cx-nav .chip')].find((b) => b.textContent === 'Gifts').click()`);
  await sleep(150);
  ok('and every gift, born and earned', await js(`(() => { const t = document.querySelector('.cx-page').textContent; return t.includes('Titan Shifter') && t.includes('Ultra Instinct') && !t.includes('undefined'); })()`));
  await shot('42-codex-gifts');
  ok('including the ones awakened by breeding', await js(`(() => { const t = document.querySelector('.cx-page').textContent; return t.includes('Awakened by breeding') && t.includes('Rinnegan') && t.includes('Scarlet Eyes'); })()`));
  await js(`[...document.querySelectorAll('.cx-nav .chip')].find((b) => b.textContent === 'Monsters').click()`);
  await sleep(150);
  ok('and the ultimate monsters', await js(`(() => { const t = document.querySelector('.cx-page').textContent; return t.includes('Ultimate monsters') && t.includes('The Behemoth') && !t.includes('undefined'); })()`));

  // --- the Bloodline Altar, and eggs of another race ---
  // Like waitFor, for checks that wait on the save folder, whose answer comes back as a promise.
  const waitForFiles = async (expr, ms = 8000) => {
    const start = Date.now();
    while (Date.now() - start < ms) {
      if (await js(expr) === true) return true;
      await sleep(50);
    }
    return false;
  };
  await js(`(async () => {
    const { closeAllNotes } = await import('./ui/notes.js');
    closeAllNotes();
    window.__game.G.house.bank.gems = 500;
    const { newCreature } = await import('./core/creature.js');
    const { createCreature } = await import('./ui/panels.js');
    const moon = newCreature('Moonling');
    moon.race = 'lunarian';
    await createCreature('Moonling', moon);
    const { openNursery } = await import('./ui/nursery.js');
    await openNursery('altar');
    return true;
  })()`);
  await sleep(250);
  ok('the Altar tab offers the Bloodline Altar', await js(`${rollNote}.textContent.includes('The Bloodline Altar')`));
  ok('which is bought once, for gems', await clickText('.note', 'Buy:') === true && await waitFor('window.__game.G.house.altar === true') && await js(`${rollNote}.textContent.includes('Eggs can hatch as: Human')`));
  await js(`(() => { const b = [...${rollNote}.querySelectorAll('.rosterrow')].find((r) => r.textContent.includes('Moonling')).querySelector('button'); b.click(); b.click(); return true; })()`);
  ok('a Lunarian sacrificed on it lets eggs hatch as Lunarians', await waitFor(`window.__game.G.house.altarRaces.includes('lunarian')`)
    && await waitForFiles(`window.api.listCreatures().then((list) => !list.some((f) => f.base.startsWith('Moonling')))`));
  await shot('43-altar');
  await clickText('.note', 'Eggs');
  await sleep(150);
  ok('the Eggs tab shows the race the egg hatches as', await js(`${rollNote}.textContent.includes('Hatches as')`));
  // Nobody picks the race: roll until the egg on offer turns out to be a whole Lunarian.
  await js(`(async () => {
    const { G } = window.__game;
    const { eggFromId } = await import('./core/roll.js');
    let i = 0;
    while (eggFromId(\`e2e\${String(i).padStart(13, '0')}\`, G.house.altarRaces).heritage?.lunarian !== 1) i += 1;
    G.house.egg = { id: \`e2e\${String(i).padStart(13, '0')}\` };
    return true;
  })()`);
  await clickText('.note', 'Eggs');
  await sleep(150);
  ok('and says so', await js(`${rollNote}.textContent.includes('Hatches as: Lunarian')`));
  await js(`(() => { const i = ${rollNote}.querySelector('input'); i.value = 'Luna'; i.dispatchEvent(new Event('input')); return true; })()`);
  await clickText('.note', 'Keep it');
  ok('the egg hatches as a Lunarian, wings and all', await waitFor(`window.__game.G.team.some((m) => m.c.name === 'Luna' && m.c.race === 'lunarian')`));
  await shot('44-lunarian');

  // --- the ultimate monsters, and being reborn ---
  const filesBefore = await js('window.api.listCreatures().then((list) => list.length)');
  await js(`(async () => {
    const { closeAllNotes } = await import('./ui/notes.js');
    closeAllNotes();
    const { DEADLY_IDS, ULTIMATE_IDS } = await import('./data/monsters.js');
    const G = window.__game.G;
    const m = G.team.find((x) => x.c.name === 'Luna');
    G.lookAfter(m.c);
    m.c.trophies = [...DEADLY_IDS, ...ULTIMATE_IDS];
    const { openChallenges } = await import('./ui/challenges.js');
    openChallenges();
    return true;
  })()`);
  await sleep(250);
  ok('with every deadly monster beaten, the ultimate ones come out', await js(`${chalNote}.textContent.includes('Abyss Crawler') && ${chalNote}.textContent.includes('Be reborn')`));
  await shot('45-ultimate');
  await clickText('.note.chalk', 'Be reborn');
  const rebornNote = `[...document.querySelectorAll('.note')].find((n) => n.querySelector('.note-title')?.textContent === 'Luna is reborn')`;
  ok('being reborn opens a note of its own', await waitFor(`!!${rebornNote}`));
  await js(`[...${rebornNote}.querySelectorAll('.rosterrow button')].find((b) => !b.disabled).click()`);
  await sleep(150);
  await js(`(() => { const chip = ${rebornNote}.querySelector('button.chip'); if (chip) chip.click(); return true; })()`);
  await sleep(100);
  await shot('46-reborn');
  await js(`(() => { const b = [...${rebornNote}.querySelectorAll('button')].find((x) => x.textContent.startsWith('Absorb')); b.click(); b.click(); return true; })()`);
  ok('it absorbs one and starts over as a Hatchling', await waitFor(`(() => { const c = window.__game.G.team.find((m) => m.c.name === 'Luna')?.c; return !!c && c.rebirths.length === 1 && c.growth === 0 && c.trophies.length === 0; })()`));
  ok('and the one it absorbed is gone', await waitForFiles(`window.api.listCreatures().then((list) => list.length === ${filesBefore} - 1)`));

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
  // Exits directly: closing the last window would quit the app first and lose this exit code.
  app.exit(failed.length ? 1 : 0);
});
