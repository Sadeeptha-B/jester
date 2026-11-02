// Dev helper: capture several world states side by side in a single PNG.
// usage: node scripts/montage.mjs <out.png> <w> <h> <query> [query...]
import { chromium } from '@playwright/test';

const [out, w, h, ...queries] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const shots = [];
for (const q of queries) {
  const page = await browser.newPage({ viewport: { width: +w, height: +h } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://localhost:5199/?seed=7&nocurtain&${q}`);
  await page.waitForTimeout(2200);
  shots.push((await page.screenshot()).toString('base64'));
  await page.close();
}
const page = await browser.newPage({ viewport: { width: Math.min(1900, (+w + 6) * shots.length), height: +h } });
await page.setContent(`<body style="margin:0;background:#000;display:flex;gap:6px">${shots.map((s) => `<img src="data:image/png;base64,${s}">`).join('')}</body>`);
await page.waitForTimeout(200);
await page.screenshot({ path: out });
await browser.close();
console.log('saved', out);
