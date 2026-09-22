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

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} ${viewport.width}px`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor,
    });

    test('title screen', async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto('/');
      const canvas = page.locator('canvas.screen');
      await expect(canvas).toBeVisible();
      await page.waitForTimeout(600);
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
      await page.screenshot({ path: `screenshots/title-${viewport.width}.png` });

      // Hold the button: the leader attacks, easing ahead with speed lines.
      await page.keyboard.down('Space');
      await page.waitForTimeout(900);
      await page.screenshot({ path: `screenshots/title-${viewport.width}-attack.png` });
      await page.keyboard.up('Space');
      const scrolled = await page.evaluate(() => window.scrollY);
      expect(scrolled).toBe(0);
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
