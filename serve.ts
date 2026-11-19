// serve.ts — a tiny local static server for trying the app in a desktop browser.
//   node serve.ts   →   http://localhost:8080
// Standard library only; it serves this repository's app/ folder and nothing else.

import { readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = join(fileURLToPath(new URL('.', import.meta.url)), 'app');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json' };

createServer((req, res) => {
  const path = normalize(decodeURIComponent((req.url || '/').split('?')[0]));
  const file = join(appDir, path === '/' ? 'index.html' : path);
  if (!file.startsWith(appDir) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(8080, () => console.log('Senja Pelabuhan Leonida at http://localhost:8080'));
