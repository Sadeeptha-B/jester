// Serves dist/ only under /jester/, as GitHub Pages does, and can pretend a new
// version has been deployed: POST /__deploy changes sw.js, which is what a browser
// checks to discover an update.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const ROOT = join(import.meta.dirname, '../../dist');
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.webmanifest': 'application/manifest+json',
};

let deploys = 0;

createServer(async (req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  if (path === '/__deploy') {
    deploys += 1;
    res.writeHead(204).end();
    return;
  }
  if (!path.startsWith('/jester/')) {
    res.writeHead(404).end();
    return;
  }
  const rel = normalize(path.slice('/jester/'.length) || 'index.html');
  try {
    let body = await readFile(join(ROOT, rel));
    if (rel === 'sw.js') body = Buffer.concat([body, Buffer.from(`\n// deploy ${deploys}\n`)]);
    res.writeHead(200, { 'content-type': TYPES[extname(rel)] ?? 'application/octet-stream', 'cache-control': 'max-age=600' }).end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(5198);
