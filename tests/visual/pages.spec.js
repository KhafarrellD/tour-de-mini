// Loads each page at phone, tablet and desktop widths, fails on any console
// error or horizontal overflow, and saves screenshots to screenshots/ for a
// human to review. Automated checks cannot judge whether pixel art looks
// right; the screenshots exist so someone actually looks.
import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'phone', width: 375, height: 812, deviceScaleFactor: 3 },
  { name: 'phone-landscape', width: 812, height: 375, deviceScaleFactor: 3 },
  { name: 'tablet', width: 768, height: 1024, deviceScaleFactor: 2 },
  { name: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1 },
];

/** @param {import('@playwright/test').Page} page */
function collectErrors(page) {
  /** @type {string[]} */
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/** @param {import('@playwright/test').Page} page */
async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function waitForScene(page, name, timeout = 15000) {
  await page.waitForFunction((n) => document.getElementById('game')?.dataset.scene === n, name, { timeout });
}

/** Holds the button long enough to select in a menu. */
async function hold(/** @type {import('@playwright/test').Page} */ page) {
  await page.keyboard.down('Space');
  await page.waitForTimeout(650);
  await page.keyboard.up('Space');
}

/**
 * Plays the marathon like a person keeping a rhythm: one tap per second,
 * aimed at the middle of each km, with normally distributed timing error
 * (60 ms). Runs inside the page so browser automation latency doesn't add
 * to the error. Call as the race starts.
 * @param {import('@playwright/test').Page} page
 */
async function tapOnTheBeat(page) {
  await page.evaluate(() => {
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const gaussian = () => Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
    const start = performance.now();
    for (let km = 0; km < 43; km++) {
      const at = (km + 0.5) * 1000 + gaussian() * 60;
      setTimeout(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
        setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })), 90);
      }, Math.max(0, at - (performance.now() - start)));
    }
  });
}

/**
 * Walks the hub to a sport's athlete select and picks the first athlete.
 * @param {import('@playwright/test').Page} page
 * @param {number} sportIndex
 */
async function startSport(page, sportIndex) {
  await page.goto('/');
  await waitForScene(page, 'title');
  await page.waitForTimeout(300);
  await page.keyboard.press('Space');
  await waitForScene(page, 'sport-select');
  await page.waitForTimeout(300);
  for (let i = 0; i < sportIndex; i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
  }
  await hold(page);
  await waitForScene(page, 'athlete-select');
  // Let the button come back up before holding again, as a person would.
  await page.waitForTimeout(400);
  await hold(page);
}

/**
 * Holds and releases the button on a rhythm, like braking into corners.
 * @param {import('@playwright/test').Page} page
 * @param {number} seconds
 * @param {number} holdMs
 * @param {number} gapMs
 */
async function pulse(page, seconds, holdMs, gapMs) {
  const until = Date.now() + seconds * 1000;
  while (Date.now() < until) {
    await page.keyboard.down('Space');
    await page.waitForTimeout(holdMs);
    await page.keyboard.up('Space');
    await page.waitForTimeout(gapMs);
  }
}

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} ${viewport.width}px`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor,
    });

    test('hub flow into a marathon', async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto('/');
      const canvas = page.locator('canvas.screen');
      await expect(canvas).toBeVisible();
      await waitForScene(page, 'title');
      await page.waitForTimeout(500);
      await expectNoHorizontalOverflow(page);

      // The canvas backing store is an exact multiple of 320x180 and fits the viewport.
      const size = await canvas.evaluate((node) => {
        const el = /** @type {HTMLCanvasElement} */ (node);
        const box = el.getBoundingClientRect();
        return { width: el.width, height: el.height, right: box.right, bottom: box.bottom };
      });
      expect(size.width % 320).toBe(0);
      expect(size.height % 180).toBe(0);
      expect(size.width / 320).toBe(size.height / 180);
      expect(size.right).toBeLessThanOrEqual(viewport.width);
      expect(size.bottom).toBeLessThanOrEqual(viewport.height);
      await page.screenshot({ path: `screenshots/${viewport.width}-1-title.png` });

      await page.keyboard.press('Space');
      await waitForScene(page, 'sport-select');
      await page.waitForTimeout(500);
      await page.screenshot({ path: `screenshots/${viewport.width}-2-sport.png` });

      // Hold to take the first card (the marathon), tap once to change athlete.
      await hold(page);
      await waitForScene(page, 'athlete-select');
      await page.waitForTimeout(400);
      await page.keyboard.press('Space');
      await page.waitForTimeout(400);
      await page.screenshot({ path: `screenshots/${viewport.width}-3-athlete.png` });

      await hold(page);
      await waitForScene(page, 'marathon-countdown');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `screenshots/${viewport.width}-4-countdown.png` });

      await waitForScene(page, 'marathon-racing');
      await tapOnTheBeat(page);
      await page.waitForTimeout(6600);
      await page.screenshot({ path: `screenshots/${viewport.width}-5-racing.png` });
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      expect(errors).toEqual([]);
    });

    test('sprite gallery', async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto('/gallery.html');
      await page.waitForSelector('.card canvas.zoomed');
      await page.waitForTimeout(700);
      await expectNoHorizontalOverflow(page);
      const tallest = Number(await page.locator('.scale-check').getAttribute('data-tallest'));
      expect(tallest).toBeGreaterThan(20);
      expect(tallest).toBeLessThanOrEqual(36);
      await page.screenshot({ path: `screenshots/gallery-${viewport.width}-top.png` });
      await page.screenshot({ path: `screenshots/gallery-${viewport.width}-full.png`, fullPage: true });
      expect(errors).toEqual([]);
    });
  });
}

test('inside an iframe, Space plays the game without scrolling the parent page', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/tests/visual/fixtures/embed.html');
  const frame = page.frameLocator('iframe');
  await frame.locator('canvas.screen').click();
  for (let i = 0; i < 3; i++) await page.keyboard.press('Space');
  await page.keyboard.down('Space');
  await page.waitForTimeout(500);
  await page.keyboard.up('Space');
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  const size = await frame.locator('canvas.screen').evaluate((node) => {
    const el = /** @type {HTMLCanvasElement} */ (node);
    return { width: el.width, height: el.height };
  });
  expect(size.width % 320).toBe(0);
  expect(size.width / 320).toBe(size.height / 180);
  await page.screenshot({ path: 'screenshots/embed-iframe.png' });
  expect(errors).toEqual([]);
});

test('a full marathon played on the beat reaches the results screen', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await startSport(page, 0);
  await waitForScene(page, 'marathon-racing', 20_000);
  await tapOnTheBeat(page);
  const shots = /** @type {const} */ ([
    [31.5, 'wall'],
    [40.8, 'final-push'],
  ]);
  const start = Date.now();
  for (const [seconds, name] of shots) {
    await page.waitForTimeout(Math.max(0, seconds * 1000 - (Date.now() - start)));
    await page.screenshot({ path: `screenshots/race-${name}.png` });
  }
  await waitForScene(page, 'results', 20_000);
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'screenshots/race-results.png' });
  expect(errors).toEqual([]);
});

test('the sprint: pedalling, the draft and an attack bar, through to results', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await startSport(page, 1);
  await waitForScene(page, 'sprint-racing', 20_000);
  // Tap about five times a second, the way a person mashes a sprint.
  await page.evaluate(() => {
    const id = setInterval(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
      setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })), 60);
    }, 190);
    setTimeout(() => clearInterval(id), 120_000);
  });
  await page.waitForTimeout(12_000);
  await page.screenshot({ path: 'screenshots/sprint-racing.png' });
  await waitForScene(page, 'results', 120_000);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'screenshots/sprint-results.png' });
  expect(errors).toEqual([]);
});

test('the descent: corners, signs and the speed gauge', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await startSport(page, 2);
  await waitForScene(page, 'descent-riding', 20_000);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'screenshots/descent-road.png' });
  await pulse(page, 14, 500, 900);
  await page.screenshot({ path: 'screenshots/descent-corner.png' });
  const state = await page.locator('#game').getAttribute('data-scene');
  expect(state).toContain('descent');
  expect(errors).toEqual([]);
});
