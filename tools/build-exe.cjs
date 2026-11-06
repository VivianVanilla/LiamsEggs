// Builds Creature.exe, the game's own launcher: double-click it to play, and pin it to the taskbar.
// Run: npm run exe. Windows only: it uses the C# compiler that comes with Windows (.NET Framework 4),
// so there is nothing extra to install. The egg picture in art/creature/egg.png becomes its icon.
// Writes Creature.exe into the game folder. The launcher's own code is tools/launcher/Creature.cs.

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync, spawnSync } = require('child_process');

const electron = require('electron');
if (typeof electron === 'string') {
  // Started as plain Node: start again inside Electron, which can read and resize the picture.
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const res = spawnSync(electron, [__filename], { stdio: 'inherit', env });
  process.exit(res.status ?? 1);
}

const { app, nativeImage } = electron;
const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(__dirname, 'launcher', 'Creature.cs');
const OUT = path.join(ROOT, 'Creature.exe');
const ICON_ART = ['creature/egg.png', 'icons/tray.png', 'creature/body.png'].map((f) => path.join(ROOT, 'art', f)).find((f) => fs.existsSync(f));
const SIZES = [16, 24, 32, 48, 64, 256];

function compiler() {
  const windir = process.env.WINDIR || 'C:\\Windows';
  const found = ['Framework64', 'Framework']
    .map((fw) => path.join(windir, 'Microsoft.NET', fw, 'v4.0.30319', 'csc.exe'))
    .find((f) => fs.existsSync(f));
  if (!found) throw new Error('No C# compiler found. It comes with Windows, in Microsoft.NET\\Framework64\\v4.0.30319.');
  return found;
}

// An .ico holding the picture at each size, each one stored as a PNG, which Windows reads fine.
function iconFile(picture) {
  const img = nativeImage.createFromPath(picture);
  if (img.isEmpty()) throw new Error(`Could not read ${picture}`);
  // Never blown up past twice its own size: a blurry big icon is worse than a smaller sharp one.
  const biggest = Math.max(16, img.getSize().width * 2);
  const pngs = SIZES.filter((s) => s <= biggest).map((s) => ({ size: s, data: img.resize({ width: s, height: s, quality: 'best' }).toPNG() }));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

function build() {
  if (process.platform !== 'win32') throw new Error('Creature.exe is for Windows. Elsewhere, start the game with npm start.');
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'creature-exe-'));
  try {
    const args = ['/nologo', '/target:winexe', '/optimize+', `/out:${OUT}`, '/reference:System.Windows.Forms.dll'];
    if (ICON_ART) {
      const ico = path.join(work, 'creature.ico');
      fs.writeFileSync(ico, iconFile(ICON_ART));
      args.push(`/win32icon:${ico}`);
    }
    args.push(SOURCE);
    execFileSync(compiler(), args, { stdio: 'inherit' });
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
  console.log(`Made ${path.relative(process.cwd(), OUT) || OUT}${ICON_ART ? `, with ${path.relative(ROOT, ICON_ART)} as its icon` : ''}.`);
  console.log('Double-click it to play. To pin it: start the game with it, right-click Creature on the taskbar, and choose Pin to taskbar.');
}

app.whenReady().then(() => {
  try {
    build();
    app.exit(0);
  } catch (err) {
    console.error(err.message);
    app.exit(1);
  }
});
