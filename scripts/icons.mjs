// Draws the app icons from the Jester's portrait, so they stay in the palette.
// Run with `node scripts/icons.mjs`; the results in public/icons are committed.
import { mkdirSync, writeFileSync } from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';
import { createServer } from 'vite';

const PLUM = [0x2a, 0x1f, 0x3d];

function png(width, height, rgba) {
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), body.length + 4);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) Buffer.from(rgba.buffer, y * width * 4, width * 4).copy(rows, y * (width * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}

/** The portrait, scaled by whole pixels and centred on a square. */
function compose(art, size, scale, background) {
  const out = new Uint8Array(size * size * 4);
  if (background) for (let i = 0; i < size * size; i++) out.set([...background, 255], i * 4);
  const pixels = art.toRGBA();
  const offset = Math.floor((size - art.w * scale) / 2);
  for (let y = 0; y < art.h * scale; y++)
    for (let x = 0; x < art.w * scale; x++) {
      const from = (Math.floor(y / scale) * art.w + Math.floor(x / scale)) * 4;
      if (pixels[from + 3]) out.set(pixels.subarray(from, from + 4), ((y + offset) * size + x + offset) * 4);
    }
  return out;
}

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { jesterPortrait } = await vite.ssrLoadModule('/src/presentation/world/art/portrait.ts');
const art = jesterPortrait('smug', false);

const icons = [
  ['icon-192.png', 192, 4, PLUM],
  ['icon-512.png', 512, 10, PLUM],
  // Maskable icons get cropped to a shape, so everything stays inside the middle 80%.
  ['maskable-512.png', 512, 8, PLUM],
  ['apple-touch-icon.png', 180, 3, PLUM],
  ['favicon-96.png', 96, 2, null],
];

mkdirSync('public/icons', { recursive: true });
for (const [name, size, scale, background] of icons) {
  writeFileSync(`public/icons/${name}`, png(size, size, compose(art, size, scale, background)));
  console.log(name);
}
await vite.close();
