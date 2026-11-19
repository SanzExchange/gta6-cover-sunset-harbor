// Senja Pelabuhan Leonida — Sunset Cover Maker: entrypoint program (Node 22, standard library only).
//
// What this program does at grading time:
//   1. copies the static web app in app/ (plain files, loads offline in desktop Chrome) into the output folder,
//   2. copies the maker's screenshots in screenshots/ next to it,
//   3. writes dossier.json there with buildDossier from the vendored make.fun library, byte for byte the
//      summary the scorer rebuilds and compares.
// Outside the grader, MAKEFUN_OUTPUT_DIR names the output folder instead of /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoDir, 'app'), join(outputDir, 'app'), { recursive: true });

const shotsDir = join(outputDir, 'screenshots');
mkdirSync(shotsDir, { recursive: true });
if (existsSync(join(repoDir, 'screenshots'))) {
  cpSync(join(repoDir, 'screenshots'), shotsDir, { recursive: true });
}

// The caps below are the scorer's own gate numbers for this bounty: the dossier text cap, at most 4
// screenshots of at most 256 KiB each, and app/ at most 993 entries / 48 MiB with paths of at most
// 1000 bytes. Passing them here means buildDossier refuses anything the sealed gate would refuse.
const dossierBytes = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossierBytes);
console.log(`Senja Pelabuhan Leonida handed in: app/ + screenshots/ copied, dossier.json written (${dossierBytes.length} bytes) to ${outputDir}`);
