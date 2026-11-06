// Electron main process: the transparent always-on-top overlay, click-through switching,
// the tray and taskbar button, screen color sampling, and all file access. The page gets no
// direct file or Node access; everything goes through the narrow handlers below.

const {
  app, BrowserWindow, BaseWindow, ipcMain, screen, desktopCapturer, dialog, shell, Tray, Menu, nativeImage, globalShortcut, powerMonitor,
} = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { pathToFileURL } = require('url');

const TEST = process.env.CREATURE_TEST === '1';
const SHOW = !TEST || process.env.CREATURE_SHOW === '1'; // automated runs stay hidden unless asked
const ROOT = app.isPackaged ? path.dirname(process.execPath) : __dirname;
const HOME = process.env.CREATURE_HOME || path.join(ROOT, 'world');
const ART_DIR = process.env.CREATURE_ART || path.join(__dirname, 'art');
const DIRS = {
  creatures: path.join(HOME, 'creatures'),
  digested: path.join(HOME, 'digested'),
  graveyard: path.join(HOME, 'graveyard'),
  data: path.join(HOME, 'data'),
};
const FOOD_EXTS = new Set(['bone', 'sap', 'spark', 'ink', 'ember', 'goo']);
const MAX_FOOD_BYTES = 1024 * 1024;
const MAX_CREATURE_BYTES = 4 * 1024 * 1024;
// negative is the Negative Dimension (src/core/negative.js), which a universe reset never touches.
const DATA_KEYS = new Set(['arena', 'household', 'negative']);
const DWELL_MS = 220; // the cursor must rest on the creature this long, so quick clicks reach your apps
const APP_ID = 'creature.overlay.game';
const TEAM_MAX = 3;
const OPENABLE = new Set(['menu', 'feed', 'nursery', 'creatures', 'village', 'adventure', 'powers', 'search', 'negative']);
// Creature.exe, when the game was started with it (tools/launcher/Creature.cs). A pinned taskbar
// button and the jump list then start the game through it, with its icon, and in the same world.
const LAUNCHER = (() => {
  const exe = process.env.CREATURE_LAUNCHER;
  return exe && /\.exe$/i.test(exe) && fs.existsSync(exe) ? exe : null;
})();
const WORLD = /^[a-z0-9_-]{1,40}$/.test(process.env.CREATURE_WORLD ?? '') ? process.env.CREATURE_WORLD : '';

let win = null;
let tray = null;
let launcher = null;
let displayId = null;
let rects = [];
let captureAll = false;
let ignoring = true;
let dwellSince = 0;
let hiddenByUser = false;
let quitting = false;
let wantsFocus = false;
let lastCursor = 0;
const settings = { quiet: false, bottomOnly: false, calm: false, dark: false, scale: 1, opacity: 0.75, team: [] };

// ---------- helpers ----------

function ensureDirs() {
  Object.values(DIRS).forEach((d) => fs.mkdirSync(d, { recursive: true }));
}

// Turns any name into one safe Windows file name with no path parts or reserved words.
function safeBase(name) {
  let base = String(name ?? '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/[. ]+$/g, '')
    .replace(/^[. ]+/g, '')
    .slice(0, 40);
  if (!base) base = 'unnamed';
  if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(base)) base = `_${base}`;
  return base;
}

function uniquePath(dir, base, ext) {
  let candidate = path.join(dir, `${base}.${ext}`);
  for (let n = 2; fs.existsSync(candidate); n++) candidate = path.join(dir, `${base} ${n}.${ext}`);
  return candidate;
}

function atomicWrite(file, text) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}

function extOf(file) {
  return path.extname(String(file)).slice(1).toLowerCase();
}

function readCreatureFile(file) {
  if (extOf(file) !== 'creature') throw new Error('That is not a .creature file');
  const stat = fs.lstatSync(file);
  if (!stat.isFile()) throw new Error('That is not a file');
  if (stat.size > MAX_CREATURE_BYTES) throw new Error('That .creature file is too big');
  return fs.readFileSync(file, 'utf8');
}

function currentDisplay() {
  const all = screen.getAllDisplays();
  return all.find((d) => d.id === displayId) ?? screen.getPrimaryDisplay();
}

function displayInfo() {
  const d = currentDisplay();
  return {
    width: d.bounds.width,
    height: d.bounds.height,
    work: {
      x: d.workArea.x - d.bounds.x,
      y: d.workArea.y - d.bounds.y,
      w: d.workArea.width,
      h: d.workArea.height,
    },
    scale: d.scaleFactor,
  };
}

function send(type, payload = {}) {
  if (win && !win.isDestroyed()) win.webContents.send('cmd', { type, ...payload });
}

// A short record of locks, sleeps and monitor changes, and what the overlay did about each, in
// case clicks ever stop reaching the creature again. Never more than LOG_LINES lines.
const LOG_LINES = 300;
function logWindow(what) {
  try {
    const file = path.join(app.getPath('userData'), 'window-log.txt');
    let lines = [];
    try {
      lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
    } catch { /* first line */ }
    lines.push(`${new Date().toISOString()} ${what}`);
    fs.writeFileSync(file, `${lines.slice(-LOG_LINES).join('\n')}\n`);
  } catch { /* the log only helps; it is never a reason to stop */ }
}

// ---------- keeping the overlay where it belongs ----------

// The monitor it belongs on: the one you picked while it is plugged in, otherwise the main one.
// A monitor that drops out for a moment, like when the screen is locked, doesn't change your pick.
function homeDisplay() {
  return screen.getAllDisplays().find((d) => d.id === settings.display) ?? screen.getPrimaryDisplay();
}

let lastSentDisplay = '';
function sendDisplay(force = false) {
  const info = displayInfo();
  const key = JSON.stringify(info);
  if (!force && key === lastSentDisplay) return;
  lastSentDisplay = key;
  send('display', { display: info });
}

// Puts the overlay back exactly over its monitor. Locking the screen can switch monitors off and
// on, and Windows can then move or resize the window without a word. If the window and the page
// disagree about the screen, the creature shows in one place and takes clicks in another.
function fitOverlay(reason) {
  if (!win || win.isDestroyed()) return false;
  const d = homeDisplay();
  const moved = d.id !== displayId;
  displayId = d.id;
  const b = win.getBounds();
  // A pixel of rounding on a scaled monitor is not worth moving for.
  const off = ['x', 'y', 'width', 'height'].some((k) => Math.abs(b[k] - d.bounds[k]) > 2);
  if (off) {
    // Twice on purpose: crossing between monitors with different scaling can land wrong the first time.
    win.setBounds(d.bounds);
    win.setBounds(d.bounds);
  }
  if (off || moved) logWindow(`${reason}: fitted to monitor ${d.id} ${JSON.stringify(d.bounds)}, was ${JSON.stringify(b)}`);
  sendDisplay(off || moved);
  return off || moved;
}

// Starts click-through over from a known state and puts the window back on top.
function resetMouse() {
  if (!win || win.isDestroyed()) return;
  ignoring = true;
  dwellSince = 0;
  win.setIgnoreMouseEvents(true);
  if (!hiddenByUser) win.setAlwaysOnTop(true, 'screen-saver');
}

function repairOverlay(reason) {
  fitOverlay(reason);
  resetMouse();
  send('repair');
}

// Monitors can take a few seconds to come back after a lock or sleep, so it checks a few times.
let repairTimers = [];
function repairSoon(reason) {
  logWindow(reason);
  repairTimers.forEach(clearTimeout);
  repairTimers = [300, 1500, 5000].map((ms) => setTimeout(() => repairOverlay(reason), ms));
}

// ---------- the taskbar button ----------

// The game's own button on the taskbar. Its window is never seen: it sits minimized, and
// clicking the button opens or closes the creature menu, and puts the overlay right first.
function taskbarClick() {
  repairOverlay('taskbar button');
  if (hiddenByUser) {
    toggleHidden(false);
    send('open', { what: 'menu' });
    return;
  }
  send('toggleMenu');
}

// What starts the game again: Creature.exe if that is how it was started, or Electron with this
// folder. extra is more arguments, like --creature=feed.
function relaunchArgs(extra = '') {
  if (LAUNCHER) return `${WORLD} ${extra}`.trim();
  return `${app.isPackaged ? '' : `"${app.getAppPath()}" `}${extra}`.trim();
}
const relaunchProgram = () => LAUNCHER ?? process.execPath;

function createLauncher() {
  const drawn = path.join(ART_DIR, 'icons', 'tray.png');
  const icon = fs.existsSync(drawn) ? nativeImage.createFromPath(drawn) : undefined;
  const area = screen.getPrimaryDisplay().workArea;
  launcher = new BaseWindow({
    x: area.x + area.width - 2,
    y: area.y + area.height - 2,
    width: 1,
    height: 1,
    show: false,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: false,
    title: 'Creature',
    ...(icon ? { icon } : {}),
  });
  if (process.platform === 'win32') {
    // So a pinned button starts the game, not a bare Electron: right-click the button and pin it,
    // and it starts Creature.exe from then on, with its icon.
    launcher.setAppDetails({
      appId: APP_ID,
      relaunchCommand: `"${relaunchProgram()}" ${relaunchArgs()}`.trim(),
      relaunchDisplayName: WORLD ? `Creature (${WORLD})` : 'Creature',
      appIconPath: relaunchProgram(),
      appIconIndex: 0,
    });
    launcher.setThumbnailToolTip('Creature: click to open its menu');
  }
  launcher.on('restore', () => {
    setTimeout(() => {
      if (launcher && !launcher.isDestroyed()) launcher.minimize();
    }, 0);
    taskbarClick();
  });
  // Closing it from the taskbar closes the game, saving first like any other way out.
  launcher.on('close', (e) => {
    if (quitting) return;
    e.preventDefault();
    app.quit();
  });
  launcher.on('closed', () => { launcher = null; });
  launcher.showInactive();
  launcher.minimize();
}

// Right-click the taskbar button for these.
function setJumpList() {
  if (process.platform !== 'win32') return;
  const task = (title, what, description) => ({
    program: relaunchProgram(), arguments: relaunchArgs(`--creature=${what}`), iconPath: relaunchProgram(), iconIndex: 0, title, description,
  });
  try {
    app.setUserTasks([
      task('Open the menu', 'menu', 'Opens the creature menu'),
      task('Search everything', 'search', 'Find any menu, monster, race, power or item'),
      task('Your creatures', 'creatures', 'Every creature you have, in one place'),
      task('Nursery', 'nursery', 'Breed, hatch eggs and use items'),
      task('Adventure', 'adventure', 'The 50-level campaign'),
      task('Village', 'village', 'Work, the Legendary Mine and expeditions'),
      task('Hide or show', 'hide', 'Hides everything, or brings it back'),
    ]);
  } catch (err) {
    logWindow(`jump list: ${err.message}`);
  }
}

// What a second launch asked for, from its command line.
function openFromArgs(argv) {
  const want = argv.find((a) => String(a).startsWith('--creature='))?.slice(11);
  if (want === 'hide') {
    toggleHidden();
    return;
  }
  repairOverlay('opened again');
  toggleHidden(false);
  send('open', { what: OPENABLE.has(want) ? want : 'menu' });
}

// ---------- the overlay window ----------

function createOverlay() {
  const d = currentDisplay();
  displayId = d.id;
  win = new BrowserWindow({
    x: d.bounds.x,
    y: d.bounds.y,
    width: d.bounds.width,
    height: d.bounds.height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    thickFrame: false,
    roundedCorners: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: false,
    show: false,
    title: 'Creature',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setIgnoreMouseEvents(true);
  ignoring = true;
  win.setMenu(null);

  // A file dropped on the page must never navigate it away.
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.once('ready-to-show', () => {
    if (SHOW) win.showInactive();
    win.setBounds(currentDisplay().bounds);
  });
  win.on('closed', () => { win = null; });
}

function pollCursor() {
  if (!win || win.isDestroyed()) return;
  const now = Date.now();
  const p = screen.getCursorScreenPoint();
  const b = win.getBounds();
  const x = p.x - b.x;
  const y = p.y - b.y;

  // While hidden nothing can take a click, whatever the page last asked for.
  let want = captureAll && !hiddenByUser;
  if (!want && !hiddenByUser) {
    let overInstant = false;
    let overDwell = false;
    for (const r of rects) {
      if (x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h) {
        if (r.instant) overInstant = true;
        else overDwell = true;
      }
    }
    if (overInstant) {
      want = true;
    } else if (overDwell) {
      if (!dwellSince) dwellSince = now;
      want = !ignoring || now - dwellSince >= DWELL_MS;
    } else {
      dwellSince = 0;
    }
  }
  if (want === ignoring) {
    ignoring = !want;
    win.setIgnoreMouseEvents(ignoring);
  }
  if (!hiddenByUser && now - lastCursor > 90) {
    lastCursor = now;
    send('cursor', { x, y });
  }
}

function setFocus(on) {
  if (!win || win.isDestroyed()) return;
  wantsFocus = on;
  win.setFocusable(on);
  if (on) win.focus();
  else win.blur();
}

// Native dialogs need our window focusable, or they can open behind whatever you were using.
async function withDialog(run) {
  const was = wantsFocus;
  setFocus(true);
  try {
    return await run();
  } finally {
    setFocus(was);
  }
}

// The window itself never hides: the page blanks and every click passes through. Hiding and
// re-showing a transparent always-on-top window is the fragile path, so it is not used at all.
function toggleHidden(force) {
  if (!win || win.isDestroyed()) return;
  hiddenByUser = force ?? !hiddenByUser;
  captureAll = false; // a drag or a box in progress ends here, so nothing stays stuck holding the mouse
  send('hidden', { hidden: hiddenByUser });
  if (!hiddenByUser) win.setAlwaysOnTop(true, 'screen-saver');
  rebuildTray();
}

// Only for a monitor you picked: that becomes where it belongs.
function moveToDisplay(d) {
  if (!win || win.isDestroyed()) return;
  settings.display = d.id;
  saveSettings();
  fitOverlay('monitor picked');
  sendDisplay(true);
}

function nextMonitor() {
  const all = screen.getAllDisplays();
  if (all.length < 2) return;
  const i = all.findIndex((d) => d.id === displayId);
  moveToDisplay(all[(i + 1) % all.length]);
}

function listDisplays() {
  const main = screen.getPrimaryDisplay().id;
  const current = currentDisplay().id;
  return screen.getAllDisplays().map((d, i) => ({
    id: d.id,
    number: i + 1,
    width: d.bounds.width,
    height: d.bounds.height,
    main: d.id === main,
    current: d.id === current,
  }));
}

function rebuildTray() {
  if (!tray) return;
  const multi = screen.getAllDisplays().length > 1;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open creature menu', click: () => { toggleHidden(false); send('openMenu'); } },
    { label: 'Settings', click: () => { toggleHidden(false); send('openSettings'); } },
    { label: hiddenByUser ? 'Show (Ctrl+Alt+H)' : 'Hide (Ctrl+Alt+H)', click: () => toggleHidden() },
    { type: 'separator' },
    { label: 'Quiet mode (no speech bubbles)', type: 'checkbox', checked: settings.quiet, click: (i) => updateSetting('quiet', i.checked) },
    { label: 'Stay near the bottom of the screen', type: 'checkbox', checked: settings.bottomOnly, click: (i) => updateSetting('bottomOnly', i.checked) },
    { label: 'Dark mode', type: 'checkbox', checked: settings.dark, click: (i) => updateSetting('dark', i.checked) },
    ...(multi ? [{ label: 'Move to next monitor', click: nextMonitor }] : []),
    { type: 'separator' },
    { label: 'Open world folder', click: () => shell.openPath(HOME) },
    { label: 'Open art folder', click: () => shell.openPath(ART_DIR) },
    { label: 'Reload art', click: () => send('reloadArt') },
    { label: 'Close game', click: () => app.quit() },
  ]));
}

function saveSettings() {
  atomicWrite(path.join(DIRS.data, 'settings.json'), JSON.stringify(settings, null, 2));
}

function updateSetting(key, value) {
  settings[key] = value;
  saveSettings();
  send('settings', { settings });
  rebuildTray();
}

const cleanTeam = (list) => [...new Set(list.filter((b) => typeof b === 'string').map(safeBase))].slice(0, TEAM_MAX);

function loadSettings() {
  try {
    const saved = JSON.parse(fs.readFileSync(path.join(DIRS.data, 'settings.json'), 'utf8'));
    settings.quiet = !!saved.quiet;
    settings.bottomOnly = !!saved.bottomOnly;
    settings.calm = !!saved.calm;
    settings.dark = !!saved.dark;
    if (Number.isFinite(saved.scale)) settings.scale = Math.min(3, Math.max(0.5, saved.scale));
    if (Number.isFinite(saved.opacity)) settings.opacity = Math.min(1, Math.max(0.2, saved.opacity));
    if (Number.isFinite(saved.display)) {
      settings.display = saved.display;
      displayId = saved.display; // if that monitor is gone, currentDisplay() falls back to the main one
    }
    if (typeof saved.active === 'string') settings.active = safeBase(saved.active);
    if (Array.isArray(saved.team)) settings.team = cleanTeam(saved.team);
  } catch { /* first run */ }
}

async function createTray() {
  // Until art/icons/tray.png is drawn, the tray borrows Electron's own icon so its menu can be reached.
  const drawn = path.join(ART_DIR, 'icons', 'tray.png');
  const icon = fs.existsSync(drawn)
    ? nativeImage.createFromPath(drawn).resize({ width: 32, height: 32 })
    : await app.getFileIcon(process.execPath, { size: 'small' });
  tray = new Tray(icon);
  tray.setToolTip('Creature');
  tray.on('click', () => { toggleHidden(false); send('openMenu'); });
  rebuildTray();
}

// ---------- screen colors ----------

// Takes a screenshot in memory, shrinks the chosen area to a small grid of average colors,
// and returns only those. The screenshot is never saved and never leaves this function.
async function sampleColors({ x, y, w, h, cols, rows }) {
  cols = Math.max(1, Math.min(64, Math.floor(cols)));
  rows = Math.max(1, Math.min(64, Math.floor(rows)));
  if (process.env.CREATURE_FAKE_SCREEN === '1') return fakeColors(cols, rows);
  const d = currentDisplay();
  const sf = d.scaleFactor;
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: Math.round(d.size.width * sf), height: Math.round(d.size.height * sf) },
  });
  const source = sources.find((s) => s.display_id === String(d.id)) ?? sources[0];
  if (!source) throw new Error('No screen to read');
  const shot = source.thumbnail;
  const size = shot.getSize();
  const k = size.width / d.bounds.width;
  const area = {
    x: Math.max(0, Math.round(x * k)),
    y: Math.max(0, Math.round(y * k)),
    width: Math.max(1, Math.round(w * k)),
    height: Math.max(1, Math.round(h * k)),
  };
  area.width = Math.min(area.width, size.width - area.x);
  area.height = Math.min(area.height, size.height - area.y);
  const small = shot.crop(area).resize({ width: cols, height: rows, quality: 'good' });
  const got = small.getSize();
  const bmp = small.toBitmap();
  const colors = [];
  for (let i = 0; i < got.width * got.height; i++) {
    colors.push([bmp[i * 4 + 2], bmp[i * 4 + 1], bmp[i * 4]]); // bitmap is BGRA
  }
  return { cols: got.width, rows: got.height, colors };
}

// Test stand-in, so automated runs never read the real screen.
function fakeColors(cols, rows) {
  const colors = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      colors.push([Math.round((x / cols) * 255), Math.round((y / rows) * 255), 180 - x * 3]);
    }
  }
  return { cols, rows, colors };
}

// ---------- file handlers ----------

function listCreatures() {
  return fs.readdirSync(DIRS.creatures)
    .filter((f) => extOf(f) === 'creature')
    .map((f) => {
      const full = path.join(DIRS.creatures, f);
      try {
        return { base: path.basename(f, '.creature'), text: readCreatureFile(full), mtime: fs.statSync(full).mtimeMs };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.mtime - a.mtime);
}

// A creature that died in a challenge moves to the graveyard. The gravestone is written first, so
// a failure part way through can't lose it, and this refuses anything not already marked dead.
function buryCreature(base, text) {
  const body = String(text);
  if (!JSON.parse(body).dead) throw new Error('That creature is not dead');
  const name = safeBase(base);
  atomicWrite(uniquePath(DIRS.graveyard, name, 'creature'), body);
  fs.rmSync(path.join(DIRS.creatures, `${name}.creature`), { force: true });
  if (settings.active === name) delete settings.active;
  settings.team = settings.team.filter((b) => b !== name);
  saveSettings();
}

// A creature with a new name gets a file to match. The new file is written before the old one goes,
// so a failure part way through can't lose it. Returns the new file name, without .creature.
function renameCreature(base, name, text) {
  const old = safeBase(base);
  const from = path.join(DIRS.creatures, `${old}.creature`);
  if (!fs.existsSync(from)) throw new Error('That creature has no file');
  const body = String(text);
  if (Buffer.byteLength(body) > MAX_CREATURE_BYTES || !JSON.parse(body)?.format) throw new Error('That is not a creature');
  const wanted = safeBase(name);
  // The same name, maybe in other capitals, keeps its file; anything else gets one of its own.
  const same = wanted.toLowerCase() === old.toLowerCase();
  const to = same ? path.join(DIRS.creatures, `${wanted}.creature`) : uniquePath(DIRS.creatures, wanted, 'creature');
  if (same) {
    atomicWrite(from, body);
    if (wanted !== old) fs.renameSync(from, to);
  } else {
    atomicWrite(to, body);
    fs.rmSync(from, { force: true });
  }
  const now = path.basename(to, '.creature');
  if (settings.active === old) settings.active = now;
  settings.team = settings.team.map((b) => (b === old ? now : b));
  saveSettings();
  return now;
}

function listGraves() {
  return fs.readdirSync(DIRS.graveyard)
    .filter((f) => extOf(f) === 'creature')
    .map((f) => {
      try {
        return readCreatureFile(path.join(DIRS.graveyard, f));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// Eats a food file: reads it, hashes it, and moves it to world/digested.
// Only known food types are ever touched, and nothing is deleted outright.
function consumeFood(file) {
  const ext = extOf(file);
  if (!FOOD_EXTS.has(ext)) throw new Error('not food');
  const stat = fs.lstatSync(file);
  if (!stat.isFile()) throw new Error('not a file');
  if (stat.size > MAX_FOOD_BYTES) throw new Error('too big');
  const bytes = fs.readFileSync(file);
  const sha = crypto.createHash('sha256').update(bytes).digest('hex');
  const name = path.basename(file);
  const dest = uniquePath(DIRS.digested, safeBase(path.basename(file, path.extname(file))), ext);
  try {
    fs.renameSync(file, dest);
  } catch {
    // Different drive: copy, then remove the original only after the copy succeeded.
    fs.copyFileSync(file, dest);
    fs.unlinkSync(file);
  }
  return { ext, name, sha, size: stat.size, snippet: bytes.subarray(0, 200).toString('utf8').replace(/[^\x20-\x7e\n]/g, '') };
}

// Every file in the art folder, as paths relative to it.
function listArt(dir = ART_DIR, prefix = '') {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const rel = `${prefix}${entry.name}`;
    return entry.isDirectory() ? listArt(path.join(dir, entry.name), `${rel}/`) : [rel];
  });
}

function wireIpc() {
  ipcMain.handle('info', () => ({
    display: displayInfo(),
    settings,
    home: HOME,
    speed: Number(process.env.CREATURE_SPEED) || 1,
    hidden: hiddenByUser,
    test: TEST,
    fakeDesktop: TEST && !SHOW,
  }));

  ipcMain.on('rects', (_e, list) => {
    if (!Array.isArray(list)) return;
    rects = list.filter((r) => r && [r.x, r.y, r.w, r.h].every(Number.isFinite)).slice(0, 40);
  });
  ipcMain.on('captureAll', (_e, on) => { captureAll = !!on; });
  // Only a change does anything, so a note being redrawn never pulls the keyboard away from
  // whatever app you are typing in.
  ipcMain.on('focus', (_e, on) => {
    if (!!on !== wantsFocus) setFocus(!!on);
  });
  ipcMain.on('quitReady', () => { quitting = true; app.quit(); });
  ipcMain.on('closeGame', () => app.quit());

  ipcMain.handle('displays:list', () => listDisplays());
  ipcMain.handle('displays:set', (_e, id) => {
    const d = screen.getAllDisplays().find((x) => x.id === id);
    if (d) moveToDisplay(d);
  });
  ipcMain.handle('settings:set', (_e, key, value) => {
    if (key === 'quiet' || key === 'bottomOnly' || key === 'calm' || key === 'dark') updateSetting(key, !!value);
    else if (key === 'scale') updateSetting(key, Math.min(3, Math.max(0.5, Number(value) || 1)));
    else if (key === 'opacity') updateSetting(key, Math.min(1, Math.max(0.2, Number(value) || 1)));
  });
  ipcMain.handle('art:list', () => ({ base: `${pathToFileURL(ART_DIR).href}/`, files: listArt() }));
  ipcMain.handle('screen:sample', (_e, a) => sampleColors(a));

  ipcMain.handle('creature:list', () => listCreatures());
  ipcMain.handle('creature:save', (_e, base, text) => {
    atomicWrite(path.join(DIRS.creatures, `${safeBase(base)}.creature`), String(text));
  });
  ipcMain.handle('creature:bury', (_e, base, text) => buryCreature(base, text));
  ipcMain.handle('creature:rename', (_e, base, name, text) => renameCreature(base, name, text));
  ipcMain.handle('creature:graves', () => listGraves());
  ipcMain.handle('creature:newBase', (_e, name) => path.basename(uniquePath(DIRS.creatures, safeBase(name), 'creature'), '.creature'));
  ipcMain.handle('creature:readDropped', (_e, file) => readCreatureFile(file));
  ipcMain.handle('creature:importDialog', () => withDialog(async () => {
    const res = await dialog.showOpenDialog(win, {
      title: 'Import .creature files',
      filters: [{ name: 'Creature', extensions: ['creature'] }],
      properties: ['openFile', 'multiSelections'],
    });
    if (res.canceled) return [];
    return res.filePaths.map((f) => {
      try {
        return { name: path.basename(f), text: readCreatureFile(f) };
      } catch (err) {
        return { name: path.basename(f), error: err.message };
      }
    });
  }));
  ipcMain.handle('creature:exportDialog', (_e, base, text) => withDialog(async () => {
    const res = await dialog.showSaveDialog(win, {
      title: 'Export your creature',
      defaultPath: path.join(app.getPath('desktop'), `${safeBase(base)}.creature`),
      filters: [{ name: 'Creature', extensions: ['creature'] }],
    });
    if (res.canceled || !res.filePath) return null;
    fs.writeFileSync(res.filePath, String(text));
    shell.showItemInFolder(res.filePath);
    return res.filePath;
  }));

  ipcMain.handle('food:consume', (_e, file) => consumeFood(String(file)));

  ipcMain.handle('data:load', (_e, key) => {
    if (!DATA_KEYS.has(key)) return null;
    try {
      return fs.readFileSync(path.join(DIRS.data, `${key}.json`), 'utf8');
    } catch {
      return null;
    }
  });
  ipcMain.handle('data:save', (_e, key, text) => {
    if (!DATA_KEYS.has(key)) return;
    atomicWrite(path.join(DIRS.data, `${key}.json`), String(text));
  });
  ipcMain.handle('active:set', (_e, base) => {
    settings.active = safeBase(base);
    saveSettings();
  });
  // Which creatures are out on the screen, and which of them you are looking after.
  ipcMain.handle('team:set', (_e, bases, active) => {
    settings.team = Array.isArray(bases) ? cleanTeam(bases) : [];
    if (typeof active === 'string') settings.active = safeBase(active);
    saveSettings();
  });
}

// ---------- startup ----------

if (!TEST && !app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => openFromArgs(argv));

  if (process.platform === 'win32') app.setAppUserModelId(APP_ID);

  app.whenReady().then(() => {
    ensureDirs();
    loadSettings();
    wireIpc();
    createOverlay();
    if (SHOW) {
      createTray();
      createLauncher();
      setJumpList();
    }
    setInterval(pollCursor, 40);
    // Other always-on-top windows can push us down, so reassert now and then.
    // Not moveTop(): it can resize the window on scaled displays.
    setInterval(() => {
      if (win && !win.isDestroyed() && !hiddenByUser) win.setAlwaysOnTop(true, 'screen-saver');
    }, 15000);
    // Windows can move or resize the window without telling anyone, so check now and then.
    setInterval(() => {
      if (!hiddenByUser) fitOverlay('check');
    }, 3000);
    // A monitor going away moves it to the main one for now. When it comes back, so does the game.
    screen.on('display-removed', () => {
      repairSoon('monitor removed');
      rebuildTray();
    });
    screen.on('display-added', () => {
      repairSoon('monitor added');
      rebuildTray();
    });
    screen.on('display-metrics-changed', () => repairSoon('monitor changed'));
    powerMonitor.on('lock-screen', () => logWindow('screen locked'));
    powerMonitor.on('unlock-screen', () => repairSoon('screen unlocked'));
    powerMonitor.on('suspend', () => logWindow('going to sleep'));
    powerMonitor.on('resume', () => repairSoon('woke up'));
    if (SHOW) globalShortcut.register('Control+Alt+H', () => toggleHidden());
  });

  // Give the page a moment to save before closing.
  app.on('before-quit', (e) => {
    if (quitting || !win || win.isDestroyed()) return;
    e.preventDefault();
    send('quit');
    setTimeout(() => {
      quitting = true;
      app.quit();
    }, 1000);
  });

  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('window-all-closed', () => app.quit());
}

module.exports = {
  getWindow: () => win, isIgnoring: () => ignoring, toggleHidden, nextMonitor, taskbarClick, repairOverlay, fitOverlay, homeDisplay, openFromArgs,
};
