import { expect, test, type Page } from '@playwright/test';

/** Dev builds expose the running game, so tests can look behind the curtain. */
const world = <T>(page: Page, read: string): Promise<T> => page.evaluate(`window.jester.world.${read}`) as Promise<T>;

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

async function saveNow(page: Page) {
  await page.evaluate('window.jester.repo.save(window.jester.world)');
  await page.waitForTimeout(200);
}

async function answerFirstQuestion(page: Page, choice: string) {
  await page.waitForFunction('window.jester?.world.pending', null, { timeout: 60_000 });
  await page.locator('.ticker').click();
  await page.getByRole('button', { name: choice }).click();
  await expect.poll(() => world(page, 'pending')).toBeNull();
}

test('A: passive watching needs no input, and the world is plainly alive', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?fresh&seed=11&speed=4&nocurtain');
  await page.waitForFunction('window.jester');
  await page.waitForTimeout(800);
  const start = await page.evaluate(`JSON.stringify(Object.values(window.jester.world.citizens).map((c) => c.pos))`);
  await expect(page.locator('.bubble').first()).toBeVisible({ timeout: 30_000 });
  const later = await page.evaluate(`JSON.stringify(Object.values(window.jester.world.citizens).map((c) => c.pos))`);
  expect(later).not.toBe(start);
  expect(await page.locator('.dispatch, .panel').count()).toBe(0);
  expect(errors).toEqual([]);
});

test('B: a decision travels by Herald and leaves a lasting mark', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?fresh&seed=7&speed=12&nocurtain');
  await answerFirstQuestion(page, 'Recognise the new administration');
  expect(await world(page, 'offices.weather')).toBe('ignatius');
  await page.waitForFunction("window.jester?.world.citizens.gerald.hat === 'minister'", null, { timeout: 60_000 });
  expect(await world(page, 'offices.weather')).toBe('gerald');

  await page.getByRole('button', { name: 'Gazette' }).click();
  await expect(page.getByText('The Pigeon Years')).toBeVisible();
  await expect(page.getByText(/recognised as Minister of Weather/)).toBeVisible();
  await page.getByRole('tab', { name: 'Affairs of State' }).click();
  await expect(page.getByText(/Minister of Weather: Gerald/)).toBeVisible();

  // Survives a genuine reload, through IndexedDB.
  await saveNow(page);
  await page.goto('/?nocurtain');
  await page.waitForFunction('window.jester');
  expect(await world(page, 'citizens.gerald.hat')).toBe('minister');
  await page.getByRole('button', { name: 'Gazette' }).click();
  await expect(page.getByText('The Pigeon Years')).toBeVisible();
  expect(errors).toEqual([]);
});

test('C: returning after a long absence shows a recap, and history has moved on', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?fresh&seed=7&speed=12&nocurtain');
  await page.waitForFunction('window.jester?.world.pending', null, { timeout: 60_000 });
  await saveNow(page);
  const day = await world<number>(page, 'clock.day');

  await page.goto('/?away=30');
  await expect(page.getByText('Previously, in')).toBeVisible();
  await page.waitForFunction('window.jester');
  await expect(page.locator('.recap li').first()).toBeVisible();
  const tick = await world<number>(page, 'tick');
  await page.waitForTimeout(600);
  expect(await world(page, 'tick')).toBe(tick);

  expect(await world<number>(page, 'clock.day')).toBeGreaterThan(day);
  expect(await world(page, 'offices.weather')).toBe('gerald');
  await page.getByRole('button', { name: 'Raise the curtain' }).click();
  await expect(page.locator('.recap')).toHaveCount(0);
  await expect.poll(() => world<number>(page, 'tick')).toBeGreaterThan(tick);
  expect(errors).toEqual([]);
});

test('D: a decree summons a visitor, who arrives and stays', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?fresh&seed=9&speed=10&nocurtain');
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Decree' }).click();
  await page.getByRole('button', { name: 'Summon a Strange Visitor' }).click();
  await page.waitForFunction('window.jester?.world.citizens.visitor.absent === false', null, { timeout: 60_000 });
  await expect(page.locator('.ticker')).toContainText(/stranger/, { timeout: 10_000 });
  await saveNow(page);
  await page.goto('/?nocurtain');
  await page.waitForFunction('window.jester');
  expect(await world(page, 'citizens.visitor.absent')).toBe(false);
  expect(errors).toEqual([]);
});

test('the Hand lifts and drops a citizen, who remembers', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?fresh&seed=7&hour=10&nocurtain');
  await page.waitForFunction('window.jester');
  await page.waitForTimeout(800);
  const at = (await page.evaluate(`(() => { const { engine, renderer } = window.jester; const c = engine.world.citizens.percival; return renderer.project(c.pos.x, c.pos.y - 8); })()`)) as { x: number; y: number };
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.move(at.x + 40, at.y + 60, { steps: 6 });
  await expect.poll(() => world(page, 'citizens.percival.lifted')).toBe(true);
  await page.mouse.up();
  await expect.poll(() => world(page, 'citizens.percival.liftCount')).toBe(1);
  await expect(page.locator('.bubble').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('clicking inspects a citizen, a building and a monument', async ({ page }) => {
  await page.goto('/?fresh&seed=7&hour=10&nocurtain');
  await page.waitForFunction('window.jester');
  await page.waitForTimeout(800);
  const point = (script: string) => page.evaluate(script) as Promise<{ x: number; y: number }>;
  const p = await point(`(() => { const { engine, renderer } = window.jester; const c = engine.world.citizens.jester; return renderer.project(c.pos.x, c.pos.y - 8); })()`);
  await page.mouse.click(p.x, p.y);
  await expect(page.locator('.card h3')).toHaveText('The Jester');
  await page.getByRole('button', { name: 'Throw a tomato' }).click();
  await expect.poll(() => page.evaluate('window.jester.world.citizens.jester.deeds.length')).toBe(1);
  await expect(page.locator('.card-deeds')).toContainText('tomato');
  await page.getByRole('button', { name: 'Close' }).click();

  const castle = await point('window.jester.renderer.project(112, 20)');
  await page.mouse.click(castle.x, castle.y);
  await expect(page.locator('.card h3')).toHaveText('The Royal Castle');
});

test('a corrupt save is survived with an apology', async ({ page }) => {
  await page.goto('/?fresh&seed=7&nocurtain');
  await page.waitForFunction('window.jester');
  await page.evaluate(`new Promise((done) => {
    const open = indexedDB.open('jester', 1);
    open.onsuccess = () => {
      const tx = open.result.transaction('saves', 'readwrite');
      tx.objectStore('saves').put('{"version":1,"truncat', 'slotA');
      tx.oncomplete = () => { open.result.close(); done(null); };
    };
  })`);
  await page.addInitScript(() => addEventListener('pagehide', (e) => e.stopImmediatePropagation(), true));
  await page.goto('/?nocurtain');
  await expect(page.getByText(/Mice have eaten the archives/)).toBeVisible();
  await page.getByRole('button', { name: 'Very well' }).click();
  await page.waitForFunction('window.jester');
});

for (const [width, height] of [[380, 620], [450, 700], [650, 860], [1280, 800]] as const) {
  test(`stays usable at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/?fresh&seed=7&speed=12&nocurtain');
    await page.waitForFunction('window.jester?.world.pending', null, { timeout: 60_000 });
    const overflow = await page.evaluate('document.documentElement.scrollWidth > innerWidth');
    expect(overflow).toBe(false);
    await page.locator('.ticker').click();
    const choice = page.getByRole('button', { name: 'Demand democratic elections' });
    await expect(choice).toBeInViewport();
    await page.screenshot({ path: `shots/size-${width}.png` });
    await page.locator('.dispatch .card-close').click();
    await page.getByRole('button', { name: 'Gazette' }).click();
    await expect(page.getByRole('tab', { name: 'Persons of Note' })).toBeInViewport();
  });
}
