import { expect, test, type Page } from '@playwright/test';

/**
 * These run against the production build under /jester/, because a service worker
 * only exists there. The dev-only `window.jester` is absent, so they look at what a
 * real visitor's browser has: the page, the service worker and IndexedDB.
 */
test.use({ baseURL: 'http://localhost:5198/jester/' });

const ready = (page: Page) => page.evaluate(`navigator.serviceWorker.ready.then((r) => Boolean(r.active))`);

const started = (page: Page) => expect(page.locator('.world canvas')).toHaveCount(1, { timeout: 20_000 });

/** The seed of the newest saved kingdom, read straight out of the browser's storage. */
const savedSeed = (page: Page) =>
  page.evaluate(`new Promise((done) => {
    const open = indexedDB.open('jester');
    open.onsuccess = () => {
      const db = open.result;
      const store = db.transaction('saves').objectStore('saves');
      const a = store.get('slotA');
      const b = store.get('slotB');
      b.onsuccess = () => {
        db.close();
        const saves = [a.result, b.result, localStorage.getItem('jester-last-words')].filter(Boolean).map((s) => JSON.parse(s));
        saves.sort((x, y) => y.savedAt - x.savedAt);
        done(saves[0]?.seed ?? null);
      };
    };
  })`);

test('is installable, by Chrome’s own reckoning', async ({ page }) => {
  await page.goto('');
  await started(page);
  await ready(page);
  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  expect(installabilityErrors).toEqual([]);
  const { errors } = await cdp.send('Page.getAppManifest');
  expect(errors).toEqual([]);
});

test('serves the manifest, every icon and a favicon', async ({ page, request }) => {
  const manifest = await (await request.get('manifest.webmanifest')).json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  for (const icon of manifest.icons) {
    const image = await request.get(icon.src);
    expect(image.status(), icon.src).toBe(200);
    expect(image.headers()['content-type']).toBe('image/png');
  }
  await page.goto('');
  const size = (await page.evaluate(`(async () => {
    const img = new Image();
    img.src = document.querySelector('link[rel="icon"]').href;
    await img.decode();
    return img.naturalWidth;
  })()`)) as number;
  expect(size).toBe(96);
});

test('starts with no network at all, with its fonts, and keeps its kingdom', async ({ page, context }) => {
  await page.goto('');
  await started(page);
  await ready(page);
  await page.evaluate(`document.fonts.ready`);
  await page.reload();
  await started(page);
  const seed = await savedSeed(page);
  expect(seed).not.toBeNull();

  await context.setOffline(true);
  await page.reload();
  await started(page);
  await expect(page.getByRole('button', { name: 'Gazette' })).toBeVisible();
  expect(await page.evaluate(`navigator.onLine`)).toBe(false);
  // Fetch every face the app uses, with no network: each must come from the cache.
  const faces = ["16px 'IM Fell English'", "italic 16px 'IM Fell English'", "400 13px 'Pixelify Sans'", "500 13px 'Pixelify Sans'"];
  for (const face of faces) {
    const loaded = await page.evaluate(`document.fonts.load(${JSON.stringify(face)}, 'Elsewhere').then((f) => f.length, () => -1)`);
    expect(loaded, face).toBeGreaterThan(0);
  }
  expect(await savedSeed(page)).toBe(seed);
  await context.setOffline(false);
});

test('a new version waits politely, then takes over on the next launch', async ({ page, context, request }) => {
  await page.goto('');
  await started(page);
  await ready(page);
  await page.reload();
  await started(page);
  await page.evaluate(`window.stillHere = true`);

  await request.post('http://localhost:5198/__deploy');
  await page.evaluate(`navigator.serviceWorker.ready.then((r) => r.update())`);
  await page.waitForFunction(`navigator.serviceWorker.getRegistration().then((r) => Boolean(r?.waiting))`);

  // The running kingdom is left alone, and told about it.
  await expect(page.locator('.ticker')).toContainText('new edition');
  expect(await page.evaluate(`window.stillHere`)).toBe(true);
  await page.waitForTimeout(1000);
  expect(await page.evaluate(`window.stillHere`)).toBe(true);

  // Closing every window is what lets it in.
  const seed = await savedSeed(page);
  await page.close();
  const next = await context.newPage();
  await next.goto('');
  await started(next);
  await next.waitForFunction(`navigator.serviceWorker.getRegistration().then((r) => r?.active && !r.waiting)`);
  expect(await savedSeed(next)).toBe(seed);
});

test('only one window runs the kingdom, and the other takes over when it closes', async ({ page, context }) => {
  await page.goto('');
  await started(page);
  await page.waitForTimeout(800);

  const second = await context.newPage();
  await second.goto('');
  await expect(second.getByText('open in another window')).toBeVisible();
  await expect(second.locator('.world canvas')).toHaveCount(0);

  // The first one carries on undisturbed.
  await expect(page.getByText('open in another window')).toHaveCount(0);
  await page.close();

  await started(second);
  await expect(second.getByText('open in another window')).toHaveCount(0);
});

test('a reload goes straight back to the same kingdom', async ({ page }) => {
  await page.goto('');
  await started(page);
  await page.waitForTimeout(500);
  await page.reload();
  await started(page);
  await expect(page.getByText('open in another window')).toHaveCount(0);
  const seed = await savedSeed(page);
  expect(seed).not.toBeNull();
  await page.reload();
  await started(page);
  expect(await savedSeed(page)).toBe(seed);
});

test('leaving the page within seconds of starting still saves the kingdom', async ({ page }) => {
  await page.goto('');
  await started(page);
  await page.waitForTimeout(500);
  await page.goto('manifest.webmanifest');
  const seed = await page.evaluate(`JSON.parse(localStorage.getItem('jester-last-words')).seed`);
  await page.goto('');
  await started(page);
  await page.waitForTimeout(300);
  await page.reload();
  await started(page);
  expect(await savedSeed(page)).toBe(seed);
});

test('beginning a new kingdom really does end the old one', async ({ page }) => {
  await page.goto('');
  await started(page);
  await page.waitForTimeout(500);
  await page.reload();
  await started(page);
  const before = await savedSeed(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Begin a new kingdom' }).click();
  await page.getByRole('button', { name: 'Yes, end this kingdom' }).click();
  await page.waitForTimeout(1500);
  await started(page);
  await page.reload();
  await started(page);
  const after = await savedSeed(page);
  expect(after).not.toBeNull();
  expect(after).not.toBe(before);
});

test('offers to install, and hands over to the browser', async ({ page }) => {
  await page.goto('');
  await started(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('button', { name: 'Install as an app' })).toHaveCount(0);
  await page.evaluate(`dispatchEvent(Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: async () => { window.installAsked = true; },
    userChoice: Promise.resolve({ outcome: 'accepted' }),
  }))`);
  await page.getByRole('button', { name: 'Install as an app' }).click();
  expect(await page.evaluate(`window.installAsked`)).toBe(true);
  await expect(page.getByRole('button', { name: 'Install as an app' })).toHaveCount(0);
});
