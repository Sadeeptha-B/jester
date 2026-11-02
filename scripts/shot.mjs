// Dev helper: screenshot a page of the running dev server for visual review.
// usage: node scripts/shot.mjs <path-and-query> <out.png> [width] [height] [waitMs] [js-to-eval]
import { chromium } from '@playwright/test';

const [path = '/', out = 'shots/out.png', width = '1000', height = '900', wait = '800', js] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +width, height: +height } });
const logs = [];
page.on('console', (m) => {
  if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(`http://localhost:5199${path}`);
await page.waitForTimeout(+wait);
if (js) {
  await page.evaluate(js);
  await page.waitForTimeout(500);
}
await page.screenshot({ path: out, fullPage: path.startsWith('/props') });
await browser.close();
if (logs.length) console.log(logs.slice(0, 15).join('\n'));
console.log('saved', out);
