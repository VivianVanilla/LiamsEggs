// Writes art/FILES-TO-DRAW.md, makes the folders, and says what is still missing.
// Run: npm run art

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ART_FILES, ART_GROUPS } from '../src/data/art-list.js';

const artDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'art');
const exists = (file) => fs.existsSync(path.join(artDir, file));
const creditsFile = path.join(artDir, 'CREDITS.md');
const credits = fs.existsSync(creditsFile) ? fs.readFileSync(creditsFile, 'utf8') : '';

// A file listed in the credits came from a library. Anything else that exists is yours.
const status = (file) => {
  if (!exists(file)) return '';
  return credits.includes(`\`${file}\``) ? 'library' : 'yes';
};

ART_FILES.forEach(({ file }) => fs.mkdirSync(path.dirname(path.join(artDir, file)), { recursive: true }));

const drawn = ART_FILES.filter((a) => status(a.file) === 'yes').length;
const library = ART_FILES.filter((a) => status(a.file) === 'library').length;
const missing = ART_FILES.length - drawn - library;

const lines = [
  '# Files to draw',
  '',
  `**${missing} to draw**, ${library} from a free library, ${drawn} drawn by you, out of ${ART_FILES.length}. Run \`npm run art\` to refresh this list. To see new files in the game, use **Reload art** in the tray menu.`,
  '',
  'Every file is a **PNG with a transparent background**, saved in this folder under exactly the name below. The sizes are suggestions; only the creature layers must all share one canvas size.',
  '',
  'Until a file exists, the game shows a plain dashed box with its name. Mutations, jobs, Stands, Quirks and the speedster are the exception: those simply do not show yet.',
  '',
  '"library" means the picture came from a free human-made library (see CREDITS.md). To use your own drawing instead, save it over that file and remove its row from CREDITS.md.',
  '',
];

for (const group of ART_GROUPS) {
  const files = ART_FILES.filter((a) => a.group === group.name);
  lines.push(`## ${group.name} (${files.length})`, '', `${group.note} Suggested size: ${group.size}.`, '', '| Status | File | What |', '| --- | --- | --- |');
  for (const a of files) lines.push(`| ${status(a.file)} | \`${a.file}\` | ${a.what} |`);
  lines.push('');
}

fs.writeFileSync(path.join(artDir, 'FILES-TO-DRAW.md'), lines.join('\n'));
console.log(`${missing} to draw, ${library} from a library, ${drawn} drawn by you, out of ${ART_FILES.length}. List written to art/FILES-TO-DRAW.md`);
