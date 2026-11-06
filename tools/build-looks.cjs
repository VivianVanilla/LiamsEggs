// Builds the creature's body, mutation, job, Stand and Quirk pictures from human-made library art.
// Nothing is drawn here. Each layer is existing artwork placed on a 512 x 512 transparent canvas:
// the body and the Stands are the 1974 AIGA/US DOT sign figure, and the props are Twemoji pictures.
// Run: npm run looks   (with ELECTRON_RUN_AS_NODE unset). Writes PNGs into art/ and updates art/CREDITS.md.
// It only writes files that don't exist yet, so a drawing saved in art/ by hand is safe.
// Add --all to rebuild every file in LOOKS, which does replace those drawings.

const { app, BrowserWindow, net } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ART = path.join(__dirname, '..', 'art');
const CACHE = path.join(os.tmpdir(), 'creature-art-sources');
const TWEMOJI = 'https://raw.githubusercontent.com/twitter/twemoji/v14.0.2/assets/svg/';
const FIGURE_URL = 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Aiga_toiletsq_men.svg';
// Twemoji 15.1.0, kept going by its community at github.com/jdecked/twemoji under the same CC-BY 4.0
// license, for the few pictures Twemoji 14 doesn't have. `colors` swaps the picture's own colors.
const TWEMOJI_15 = 'https://raw.githubusercontent.com/jdecked/twemoji/v15.1.0/assets/svg/';
const EXTRA = {
  'wing-black': {
    url: `${TWEMOJI_15}1fabd.svg`,
    file: 'twemoji-15.1.0-1fabd.svg',
    credit: '`1fabd.svg` from Twemoji 15.1.0, recolored black',
    colors: { '#CAD4DB': '#3a3441', '#97A8B3': '#1e1a24' },
  },
};

function recolor(svg, colors) {
  return Object.entries(colors).reduce((s, [from, to]) => s.split(`"${from}"`).join(`"${to}"`).split(`"${from.toLowerCase()}"`).join(`"${to}"`), svg);
}

// Where the sign figure's own coordinates land on the canvas.
const K = 0.44;
const FIGURE_W = 744.09448819 * K;
const FIGURE_H = 1052.3622047 * K;
const FIGURE_X = 256 + (372.05 - 372) * K;
const FIGURE_Y = 510 - (1020 - 526.18) * K;

// The sign figure in one color. A plain 'figure' is the pale one the creature's body uses.
const figure = (color) => [color ? `figure:${color}` : 'figure', FIGURE_X, FIGURE_Y, [FIGURE_W, FIGURE_H]];

// [ picture, center x, center y, size, turn in degrees, mirrored, share of its height to keep ]
// Helmets keep only their top: with his head behind it, the chin strap looks like a mouth.
const LOOKS = {
  'creature/body.png': [figure()],

  // bone
  'mutations/horns.png': [['1f9b4', 220, 64, 66, 18], ['1f9b4', 292, 64, 66, -18, true]],
  'mutations/plates.png': [['1f6e1', 256, 225, 112]],
  'mutations/spikes.png': [['1f5e1', 165, 170, 84, 80], ['1f5e1', 347, 170, 84, -170], ['1f5e1', 160, 255, 84, 50], ['1f5e1', 352, 255, 84, -140]],
  'mutations/clubtail.png': [['1f9b4', 360, 385, 110, 20], ['1faa8', 420, 430, 76]],
  // mutations/skullmask.png stays empty: the only skull in the library has eye sockets.

  // sap
  'mutations/leafcrown.png': [['1f33f', 226, 76, 76, -40], ['1f33f', 286, 76, 76, 40, true]],
  'mutations/vines.png': [['1f33f', 190, 235, 92, 80], ['1f33f', 322, 235, 92, -80, true], ['1f33f', 229, 420, 80, 80], ['1f33f', 283, 420, 80, -80, true]],
  'mutations/moss.png': [['1f340', 232, 190, 48], ['1f340', 282, 240, 54], ['1f340', 234, 292, 46]],
  'mutations/bloom.png': [['1f338', 292, 88, 54]],
  'mutations/roots.png': [['1fab5', 214, 490, 62], ['1fab5', 298, 490, 62, 0, true]],

  // spark
  'mutations/antennae.png': [['1f4e1', 256, 52, 84]],
  'mutations/coillegs.png': [['1f300', 229, 400, 56], ['1f300', 283, 400, 56]],
  'mutations/arcs.png': [['26a1', 150, 150, 70, -20], ['26a1', 362, 150, 70, 20, true], ['26a1', 150, 330, 54], ['26a1', 362, 330, 54, 0, true]],
  'mutations/zaptail.png': [['26a1', 370, 400, 130, -30]],
  'mutations/jets.png': [['1f680', 165, 225, 96, -45], ['1f680', 347, 225, 96, 45, true]],

  // ink
  'mutations/mindgem.png': [['1f48e', 256, 113, 34]],
  'mutations/bigbrain.png': [['1f9e0', 256, 78, 92]],
  'mutations/glyphs.png': [['1f4a0', 256, 195, 40], ['1f4a0', 256, 275, 40], ['1f4a0', 229, 410, 30], ['1f4a0', 283, 410, 30]],
  'mutations/tentacle.png': [['1fab1', 135, 215, 140, 15]],
  'mutations/halo.png': [['1f4ab', 256, 44, 70]],

  // ember
  'mutations/flamehair.png': [['1f525', 256, 62, 92]],
  'mutations/claws.png': [['1fa9d', 196, 352, 56, 0, true], ['1fa9d', 316, 352, 56]],
  'mutations/smoke.png': [['1f4a8', 140, 130, 82], ['1f4a8', 372, 130, 82, 0, true]],
  'mutations/magma.png': [['1f30b', 256, 240, 104]],
  'mutations/firetail.png': [['2604', 385, 400, 120, 90]],

  // goo
  'mutations/extraarms.png': [['1f9be', 138, 235, 112, 0, true], ['1f9be', 374, 235, 112]],
  'mutations/extralegs.png': [['1f9bf', 150, 420, 112, 0, true], ['1f9bf', 362, 420, 112]],
  'mutations/secondhead.png': [['26aa', 330, 112, 56]],
  'mutations/blobbelly.png': [['1f7e2', 256, 268, 96]],
  'mutations/feelers.png': [['1f4cd', 226, 52, 62, -18], ['1f4cd', 286, 52, 62, 18]],

  // miner jobs
  'jobs/miner.png': [['26d1', 256, 86, 92, 0, false, 0.6], ['26cf', 340, 285, 116]],
  'jobs/prospector.png': [['26d1', 256, 86, 92, 0, false, 0.6], ['1f50d', 345, 315, 86]],
  'jobs/excavator.png': [['26d1', 256, 86, 92, 0, false, 0.6], ['26cf', 360, 250, 176]],
  'jobs/hoarder.png': [['1f451', 256, 62, 88], ['1f4b0', 345, 352, 96], ['1f48e', 172, 345, 52]],
  'jobs/sage.png': [['2728', 256, 44, 62], ['1fa84', 348, 285, 112], ['1f52e', 170, 325, 80]],
  'jobs/driller.png': [['26d1', 256, 86, 92, 0, false, 0.6], ['1fa9b', 345, 285, 116], ['1f527', 170, 305, 88]],
  'jobs/wraith.png': [['1f573', 256, 498, 200], ['26cf', 340, 285, 116]],

  // farmer jobs
  'jobs/farmer.png': [['1f452', 256, 76, 120]],
  'jobs/cultivator.png': [['1f452', 256, 76, 120], ['1fab4', 345, 345, 92]],
  'jobs/rancher.png': [['1f9e2', 256, 80, 100], ['1faa2', 345, 330, 94]],
  'jobs/warden.png': [['1f33f', 256, 60, 84, -45], ['1f333', 370, 270, 156]],
  'jobs/monarch.png': [['1f451', 256, 62, 88], ['1f9fa', 345, 352, 96]],
  'jobs/beastmaster.png': [['1f9e2', 256, 80, 100], ['1f43e', 256, 235, 76], ['1faa2', 345, 330, 94]],
  'jobs/swarm.png': [['1f41d', 170, 90, 58], ['1f41d', 348, 130, 58], ['1f41d', 150, 230, 48], ['1f36f', 345, 348, 88]],

  // fighter jobs
  'jobs/fighter.png': [['1f94a', 196, 335, 76, 0, true], ['1f94a', 316, 335, 76]],
  'jobs/tactician.png': [['1f4dc', 345, 325, 88], ['265f', 170, 320, 76]],
  'jobs/berserker.png': [['1fa93', 350, 275, 136], ['1f94a', 196, 335, 76, 0, true]],
  'jobs/grandmaster.png': [['1f393', 256, 78, 106], ['265f', 345, 330, 86], ['1f4dc', 170, 325, 76]],
  'jobs/trickster.png': [['1f3a9', 256, 58, 92], ['1fa84', 348, 285, 112]],
  'jobs/warlord.png': [['1fa96', 256, 86, 98, 0, false, 0.6], ['2694', 355, 290, 124], ['1f6e1', 165, 300, 92]],
  'jobs/doom.png': [['1fa96', 256, 86, 98, 0, false, 0.6], ['1f5e1', 370, 265, 176, 135], ['26d3', 165, 300, 92]],

  // races, for the ones that are more than a size
  'races/fishman.png': [['1f30a', 256, 452, 112]],
  'races/mink.png': [['1f43e', 166, 362, 54], ['26a1', 352, 296, 70, 15]],
  'races/lunarian.png': [['1f525', 186, 196, 58, -15], ['1f525', 326, 196, 58, 15, true]],
  // Behind the body: black wings, and the fire on its back burning up between them.
  'races/lunarian-back.png': [['wing-black', 384, 158, 214], ['wing-black', 128, 158, 214, 0, true], ['1f525', 256, 118, 150]],
  'races/devil.png': [['1f531', 350, 300, 132]],
  'races/halfdevil.png': [['1fa9a', 352, 300, 104, -30]],

  // nurse jobs
  'jobs/nurse.png': [['1fa7a', 256, 232, 118]],
  'jobs/medic.png': [['1fa7a', 256, 232, 118], ['1fa79', 345, 330, 64, 30]],
  'jobs/midwife.png': [['1fa7a', 256, 232, 118], ['1f37c', 348, 330, 84, 20]],
  'jobs/surgeon.png': [['1fa7a', 256, 232, 118], ['1f489', 352, 300, 104, -35]],
  'jobs/battlemedic.png': [['1fa96', 256, 86, 98, 0, false, 0.6], ['1fa79', 256, 228, 60, 20], ['1f489', 352, 300, 104, -35]],
  'jobs/broodmother.png': [['1fa7a', 256, 232, 118], ['1f95a', 168, 362, 54], ['1f95a', 202, 386, 46, 15], ['1f37c', 348, 330, 84, 20]],
  'jobs/nightnurse.png': [['1f319', 256, 52, 66], ['1fa7a', 256, 232, 118], ['1f48a', 348, 330, 66, 30]],

  // Stands: the sign figure in the Stand's color, holding what it is known for. No faces on any of it.
  'stands/starplatinum.png': [figure('#7a5bd6'), ['2b50', 256, 222, 76], ['1f94a', 182, 345, 74, 0, true], ['1f94a', 330, 345, 74]],
  'stands/theworld.png': [figure('#e3bd35'), ['1f570', 256, 222, 84], ['1f52a', 350, 300, 96, 135], ['1f52a', 162, 300, 96, -135, true]],
  'stands/kingcrimson.png': [figure('#b3203a'), ['23ed', 256, 222, 72], ['1fa78', 182, 345, 54], ['1fa78', 330, 345, 54]],
  'stands/magiciansred.png': [figure('#d9542f'), ['1f525', 256, 42, 78], ['1f525', 176, 325, 86], ['1f525', 336, 325, 86]],
  'stands/stonefree.png': [figure('#4d86c9'), ['1f9f5', 256, 222, 78], ['1f98b', 330, 150, 52], ['1f9f5', 182, 345, 48], ['1f9f5', 330, 345, 48]],
  'stands/thehand.png': [figure('#3a66c9'), ['1f573', 256, 225, 92], ['270b', 176, 340, 84, 0, true], ['270b', 336, 340, 84]],
  'stands/silverchariot.png': [figure('#bfc7d4'), ['1fa96', 256, 86, 98, 0, false, 0.6], ['1f5e1', 365, 270, 164, 135], ['1f6e1', 168, 300, 84]],
  'stands/stickyfingers.png': [figure('#3f63a8'), ['1f9f7', 256, 170, 52], ['1f9f7', 256, 225, 52], ['1f9f7', 256, 280, 52], ['1f6aa', 345, 335, 92]],
  'stands/crazydiamond.png': [figure('#e58ab8'), ['1f48e', 256, 222, 76], ['1fa79', 182, 345, 62], ['1fa79', 330, 345, 62]],
  'stands/goldexperience.png': [figure('#e6c84c'), ['1f98b', 256, 222, 80], ['1f331', 182, 340, 62], ['1f331', 330, 340, 62]],
  'stands/purplehaze.png': [figure('#8a4fb8'), ['2623', 256, 222, 72], ['1f4a8', 150, 330, 74], ['1f4a8', 362, 330, 74, 0, true]],
  'stands/hierophant.png': [figure('#3fb56a'), ['2747', 256, 222, 72], ['1f48e', 182, 345, 50], ['1f48e', 330, 345, 50], ['2747', 150, 240, 42], ['2747', 362, 240, 42]],
  'stands/heavensdoor.png': [figure('#d8c48e'), ['1f4d6', 256, 222, 92], ['1f6aa', 345, 335, 92]],
  'stands/killerqueen.png': [figure('#d98fb0'), ['1f451', 256, 62, 88], ['1f4a3', 336, 340, 84], ['1f4a3', 176, 340, 60]],

  // Speedster: running shoes and lightning.
  'powers/speedster.png': [['1f45f', 208, 482, 66], ['1f45f', 304, 482, 66], ['26a1', 138, 452, 52], ['26a1', 374, 452, 52, 0, true]],

  // Quirks
  'quirks/oneforall.png': [['1f4aa', 138, 215, 92], ['26a1', 374, 180, 58, 0, true], ['26a1', 112, 130, 44]],
  'quirks/allforone.png': [['1f9f2', 130, 240, 86], ['1f5a4', 380, 150, 54]],
  'quirks/decay.png': [['1f940', 130, 250, 92], ['1f940', 382, 250, 92, 0, true]],
  'quirks/halfhalf.png': [['1f525', 130, 170, 84], ['2744', 382, 170, 78]],
  'quirks/hellflame.png': [['1f525', 256, 40, 88], ['1f525', 128, 185, 92], ['1f525', 384, 185, 92]],
  'quirks/explosion.png': [['1f4a5', 130, 300, 92], ['1f4a5', 382, 300, 92, 0, true], ['1f9e8', 382, 170, 62]],
  'quirks/erasure.png': [['1f9e3', 256, 150, 92], ['1f6ab', 382, 170, 62]],
  'quirks/darkshadow.png': [['1f311', 388, 110, 118], ['1fab6', 110, 180, 84, -30]],
  'quirks/zerogravity.png': [['1f388', 120, 120, 92], ['1fa90', 388, 160, 74]],
  'quirks/engine.png': [['2699', 208, 395, 56], ['2699', 304, 395, 56], ['1f4a8', 140, 410, 68]],
  'quirks/hardening.png': [['1faa8', 150, 165, 78], ['1faa8', 362, 165, 78, 0, true]],
  'quirks/electrification.png': [['1f50c', 382, 240, 74], ['26a1', 128, 160, 62], ['26a1', 384, 130, 50, 0, true]],

  // Cursed techniques, sitting around the body. No faces on these either.
  'techniques/limitless.png': [['1f535', 128, 170, 62], ['1f534', 384, 170, 62], ['1f7e3', 256, 36, 66]],
  'techniques/shrine.png': [['26e9', 392, 118, 112], ['2702', 126, 250, 84]],
  'techniques/tenshadows.png': [['1f43e', 128, 410, 72], ['1f43e', 384, 410, 72, 0, true], ['1f311', 126, 150, 72]],
  'techniques/strawdoll.png': [['1f528', 386, 280, 112], ['1f4cd', 128, 232, 62], ['1f4cd', 106, 292, 50]],
  'techniques/ratio.png': [['1f4d0', 386, 270, 100], ['1f4cf', 126, 270, 92]],
  'techniques/speech.png': [['1f4e2', 392, 150, 92], ['1f50a', 116, 160, 62]],
  'techniques/flames.png': [['1f30b', 392, 128, 102], ['1f525', 126, 260, 78]],
  'techniques/boogie.png': [['1f44f', 386, 270, 92], ['1f501', 126, 200, 66]],

  // The Legendary mutations.
  'legendary/twinsoul.png': [['1f31f', 256, 32, 62], ['2728', 150, 90, 54], ['2728', 362, 90, 54], ['2728', 118, 300, 40], ['2728', 394, 300, 40]],
  'legendary/malevolentsoul.png': [['1f5a4', 256, 215, 62], ['26d3', 124, 270, 84], ['26d3', 388, 270, 84, 0, true], ['1fa78', 134, 130, 46], ['1fa78', 378, 130, 46]],
  'legendary/ironsoul.png': [['2699', 256, 32, 62], ['1f529', 138, 112, 46, 30], ['1f529', 374, 112, 46, -30, true]],
  'legendary/ghostsoul.png': [['1f319', 256, 32, 60], ['1f4a8', 118, 250, 70, 0, true], ['1f4a8', 394, 250, 70]],
  'legendary/tidesoul.png': [['1f30a', 256, 34, 64], ['1fae7', 134, 116, 50], ['1fae7', 378, 116, 50], ['1f4a7', 118, 300, 40], ['1f4a7', 394, 300, 40]],
  'legendary/warsoul.png': [['2694', 256, 32, 62], ['1f525', 134, 118, 48], ['1f525', 378, 118, 48]],

  // Charms.
  'crafts/ruby.png': [['1f534', 256, 256, 480]],
  'crafts/citrine.png': [['1f7e1', 256, 256, 480]],
  'crafts/emerald.png': [['1f7e2', 256, 256, 480]],
  'crafts/sapphire.png': [['1f535', 256, 256, 480]],
  'crafts/amethyst.png': [['1f7e3', 256, 256, 480]],
  'crafts/prism.png': [['1f308', 256, 256, 480]],
  'crafts/ash.png': [['26ab', 256, 256, 480]],
  'crafts/flint.png': [['1f7e4', 256, 256, 480]],

  // Special crops, and thrown shots.
  'farm/pepper.png': [['1f336', 256, 256, 480]],
  'farm/root.png': [['1f955', 256, 256, 480]],
  'farm/beet.png': [['1f360', 256, 256, 480]],
  'farm/bean.png': [['1fad8', 256, 256, 480]],
  'farm/melon.png': [['1f348', 256, 256, 480]],
  'farm/cap.png': [['1f344', 256, 256, 480]],
  'fx/bolt.png': [['26aa', 256, 256, 480]],

  // Monsters, from the Challenges note.
  'monsters/bull.png': [['1f402', 256, 256, 500, 0, true]],
  'monsters/crab.png': [['1f980', 256, 256, 500]],
  'monsters/hare.png': [['1f407', 256, 256, 500, 0, true]],
  'monsters/owl.png': [['1f989', 256, 256, 500]],
  'monsters/croc.png': [['1f40a', 256, 256, 500, 0, true]],
  'monsters/rat.png': [['1f400', 256, 256, 500, 0, true]],
  'monsters/scorpion.png': [['1f982', 256, 256, 500, 0, true]],
  'monsters/spider.png': [['1f577', 256, 256, 500]],
  'monsters/serpent.png': [['1f40d', 256, 256, 500, 0, true]],
  'monsters/eagle.png': [['1f985', 256, 256, 500, 0, true]],
  'monsters/tortoise.png': [['1f422', 256, 256, 500, 0, true]],
  'monsters/squid.png': [['1f991', 256, 256, 500]],
  'monsters/mammoth.png': [['1f9a3', 256, 256, 500, 0, true]],
  'monsters/rex.png': [['1f996', 256, 256, 500, 0, true]],
  'monsters/dragon.png': [['1f409', 256, 256, 500, 0, true]],
  // The Legendary road.
  'monsters/rhino.png': [['1f98f', 256, 256, 500, 0, true]],
  'monsters/leopard.png': [['1f406', 256, 256, 500, 0, true]],
  'monsters/shark.png': [['1f988', 256, 256, 500, 0, true]],
  'monsters/gorilla.png': [['1f98d', 256, 256, 500, 0, true]],
  // The ultimate monsters.
  'monsters/lobster.png': [['1f99e', 256, 256, 500]],
  'monsters/tiger.png': [['1f405', 256, 256, 500, 0, true]],
  'monsters/leviathan.png': [['1f40b', 256, 256, 500, 0, true]],
  'monsters/kraken.png': [['1f419', 256, 256, 500]],
  'monsters/behemoth.png': [['1f99b', 256, 256, 500, 0, true]],

  // The living shadow from that Quirk.
  'animals/shadow.png': [figure('#16141f')],
};

async function fetchSource(url, file) {
  const full = path.join(CACHE, file);
  if (fs.existsSync(full)) return fs.readFileSync(full, 'utf8');
  const res = await net.fetch(url, { headers: { 'User-Agent': 'creature-game-art-build/1.0' } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const text = await res.text();
  if (/<script/i.test(text)) throw new Error(`${url} contains a script, refusing it`);
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(full, text);
  return text;
}

// The sign figure is black on white; it becomes white with a thin dark edge, so mined colors
// can tint it and it still shows up on a white screen. Stands take a color of their own.
function colorFigure(svg, color = '#ffffff') {
  return svg
    .replace(/style="[^"]*"/g, `style="fill:${color};stroke:#20222c;stroke-width:13;stroke-linejoin:round"`)
    .replace('<svg', '<svg viewBox="0 0 744.09448819 1052.3622047"');
}

const dataUrl = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

// Runs in a hidden page: places pictures on canvases and hands back the PNGs.
const ARRANGE = `async (sources, layers) => {
  const images = {};
  for (const [code, url] of Object.entries(sources)) {
    images[code] = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('could not load ' + code));
      img.src = url;
    });
  }
  const out = {};
  for (const [file, items] of Object.entries(layers)) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    for (const [code, x, y, size, turn = 0, mirrored = false, keep = 1] of items) {
      const [w, h] = Array.isArray(size) ? size : [size, size];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((turn * Math.PI) / 180);
      if (mirrored) ctx.scale(-1, 1);
      ctx.beginPath();
      ctx.rect(-w / 2, -h / 2, w, h * keep);
      ctx.clip();
      ctx.drawImage(images[code], -w / 2, -h / 2, w, h);
      ctx.restore();
    }
    out[file] = canvas.toDataURL('image/png');
  }
  return out;
}`;

function updateCredits() {
  const creditsFile = path.join(ART, 'CREDITS.md');
  const start = '<!-- looks start -->';
  const end = '<!-- looks end -->';
  const rows = Object.entries(LOOKS).filter(([file]) => file !== 'creature/body.png').map(([file, items]) => {
    const parts = [...new Set(items.map(([code]) => (code.startsWith('figure') ? 'the AIGA figure' : EXTRA[code]?.credit ?? `\`${code}.svg\``)))].join(', ');
    return `| \`${file}\` | ${parts} |`;
  });
  const section = [
    start,
    '## The creature\'s looks',
    '',
    '`creature/body.png` is the Men sign figure from the AIGA Symbol Signs, designed in 1974 by Roger Cook and Don Shanosky for the US Department of Transportation. Public domain, from [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Aiga_toiletsq_men.svg). Changed from black to white, with a thin dark edge.',
    '',
    `The mutation, job, Stand, Quirk, technique, crafting and monster pictures below are Twemoji pictures (same credit and license as above), turned, mirrored, cropped (the helmets lose their chin straps) and placed on a transparent canvas by \`tools/build-looks.cjs\`. The Stands and the Dark Shadow also use the AIGA figure above, recolored. To swap one for your own drawing, save over the file and remove it from \`LOOKS\` in that tool and from this list.`,
    '',
    'The Lunarian\'s wings are the wing picture from Twemoji 15.1.0, the version of Twemoji its community keeps going at [jdecked/twemoji](https://github.com/jdecked/twemoji), under the same CC-BY 4.0 license. Recolored from grey to black.',
    '',
    'Stands, Quirks and cursed techniques borrow their names and powers from *JoJo\'s Bizarre Adventure*, *My Hero Academia* and *Jujutsu Kaisen*. None of the pictures come from those shows.',
    '',
    '| File in this folder | Pictures used |',
    '| --- | --- |',
    ...rows,
    end,
  ].join('\n');
  let credits = fs.readFileSync(creditsFile, 'utf8');
  credits = credits.includes(start)
    ? credits.slice(0, credits.indexOf(start)) + section + credits.slice(credits.indexOf(end) + end.length)
    : `${credits.trimEnd()}\n\n${section}\n`;
  fs.writeFileSync(creditsFile, credits);
}

app.disableHardwareAcceleration();
app.setPath('userData', path.join(CACHE, 'userdata'));

app.whenReady().then(async () => {
  try {
    const todo = Object.fromEntries(Object.entries(LOOKS).filter(([file]) => process.argv.includes('--all') || !fs.existsSync(path.join(ART, file))));
    const codes = [...new Set(Object.values(todo).flat().map(([code]) => code))];
    const sources = {};
    for (const code of codes) {
      if (code.startsWith('figure')) sources[code] = dataUrl(colorFigure(await fetchSource(FIGURE_URL, 'figure.svg'), code.split(':')[1]));
      else if (EXTRA[code]) sources[code] = dataUrl(recolor(await fetchSource(EXTRA[code].url, EXTRA[code].file), EXTRA[code].colors));
      else sources[code] = dataUrl(await fetchSource(`${TWEMOJI}${code}.svg`, `${code}.svg`));
    }
    const win = new BrowserWindow({ show: false });
    await win.loadURL('about:blank');
    const out = await win.webContents.executeJavaScript(`(${ARRANGE})(${JSON.stringify(sources)}, ${JSON.stringify(todo)})`, true);
    for (const [file, url] of Object.entries(out)) {
      const full = path.join(ART, file);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, Buffer.from(url.split(',')[1], 'base64'));
    }
    updateCredits();
    console.log(`wrote ${Object.keys(out).length} pictures from ${codes.length} library sources`);
    win.destroy();
    app.exit(0);
  } catch (err) {
    console.error(err);
    app.exit(1);
  }
});
