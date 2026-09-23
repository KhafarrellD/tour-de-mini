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

/**
 * Plays whichever Ironman stage is on screen, the way each one is meant to
 * be played: stroking through the swim, braking into corners on the bike,
 * hitting the transition prompts, striding for the line. Runs from the test
 * so it can follow the stage the page reports.
 * @param {import('@playwright/test').Page} page
 * @param {(scene: string) => Promise<void> | void} [onStage] called once per new scene
 * @param {string} [until] stop once this scene has been played
 */
async function playIronman(page, onStage, until) {
  const deadline = Date.now() + 170_000;
  let seen = '';
  let braking = false;
  let lastTap = 0;
  while (Date.now() < deadline) {
    const scene = await page.evaluate(() => document.getElementById('game')?.dataset.scene ?? '');
    if (!scene || scene === 'results') break;
    if (scene !== seen) {
      if (until && seen === until) break;
      seen = scene;
      if (onStage) await onStage(scene);
    }
    const now = Date.now();
    if (scene.endsWith('swim-swimming') && now - lastTap > 300) {
      lastTap = now;
      await page.keyboard.press('Space');
    } else if (scene.endsWith('descent-riding')) {
      // Brake in bursts: enough to take corners, not enough to crawl.
      const brake = Math.floor(now / 700) % 3 === 0;
      if (brake !== braking) {
        braking = brake;
        await page.keyboard[brake ? 'down' : 'up']('Space');
      }
    } else if (scene.endsWith('transition') && now - lastTap > 560) {
      lastTap = now;
      await page.keyboard.press('Space');
    } else if (scene.endsWith('sprint-racing') && now - lastTap > 170) {
      lastTap = now;
      await page.keyboard.press('Space');
    }
    await page.waitForTimeout(50);
  }
  if (braking) await page.keyboard.up('Space');
}

test('the ironman: four stages, cards between them, one clock', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await startSport(page, 3);

  /** @type {string[]} */
  const stages = [];
  await playIronman(page, async (scene) => {
    stages.push(scene);
    // One screenshot per stage and per card, as they come up.
    const shot = {
      'ironman-swim-swim-swimming': 'ironman-1-swim',
      'ironman-card-swim': 'ironman-2-card-swim',
      'ironman-bike-descent-riding': 'ironman-3-bike',
      'ironman-t2-transition': 'ironman-4-t2',
      'ironman-run-sprint-racing': 'ironman-5-run',
      'ironman-card-run': 'ironman-6-card-run',
    }[scene];
    if (shot) {
      await page.waitForTimeout(scene.includes('card') ? 700 : 2200);
      await page.screenshot({ path: `screenshots/${shot}.png` });
    }
  });

  // Every stage was raced, in order, with a card after each one.
  for (const stage of ['swim-swimming', 'descent-riding', 'transition', 'sprint-racing']) {
    expect(stages.some((scene) => scene.endsWith(stage))).toBe(true);
  }
  expect(stages.filter((scene) => scene.startsWith('ironman-card-'))).toEqual([
    'ironman-card-swim',
    'ironman-card-bike',
    'ironman-card-t2',
    'ironman-card-run',
  ]);

  await waitForScene(page, 'results', 40_000);
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'screenshots/ironman-7-results.png' });
  expect(errors).toEqual([]);
});

test('the ironman fits every viewport, with the athlete clear of the HUD', async ({ page }) => {
  test.setTimeout(420_000);
  const errors = collectErrors(page);
  for (const viewport of [
    { width: 375, height: 812 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await startSport(page, 3);
    await waitForScene(page, 'ironman-swim-swim-swimming', 20_000);
    await expectNoHorizontalOverflow(page);
    const size = await page.locator('canvas.screen').evaluate((node) => {
      const el = /** @type {HTMLCanvasElement} */ (node);
      const box = el.getBoundingClientRect();
      return { width: el.width, height: el.height, right: box.right, bottom: box.bottom };
    });
    expect(size.width % 320).toBe(0);
    expect(size.width / 320).toBe(size.height / 180);
    expect(size.right).toBeLessThanOrEqual(viewport.width);
    expect(size.bottom).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({ path: `screenshots/ironman-swim-${viewport.width}.png` });

    // The transition is the busiest screen: HUD band, prompt, bar and rack.
    await playIronman(page, async (scene) => {
      if (scene === 'ironman-t2-transition') {
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `screenshots/ironman-t2-${viewport.width}.png` });
      }
      if (scene === 'ironman-run-sprint-racing') {
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `screenshots/ironman-run-${viewport.width}.png` });
      }
      // The rest of the run is the 1280px test's job; this one only checks
      // that every screen fits.
    }, 'ironman-run-sprint-racing');
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  }
  expect(errors).toEqual([]);
});

/**
 * Counts the voices the page synthesises, so sound can be verified without
 * anyone listening: every effect and every note of music goes through
 * createOscillator or createBufferSource.
 * @param {import('@playwright/test').Page} page
 */
async function countVoices(page) {
  await page.addInitScript(() => {
    /** @type {any} */ (window).voices = 0;
    const Ctor = window.AudioContext;
    /** @type {any} */ (window).AudioContext = class extends Ctor {
      createOscillator() {
        /** @type {any} */ (window).voices++;
        return super.createOscillator();
      }
      createBufferSource() {
        /** @type {any} */ (window).voices++;
        return super.createBufferSource();
      }
    };
  });
}

/** @param {import('@playwright/test').Page} page */
const voices = (page) => page.evaluate(() => /** @type {any} */ (window).voices);

test('sound is off until asked for, and then it really makes sound', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await countVoices(page);
  await page.goto('/');
  await waitForScene(page, 'title');
  await page.waitForTimeout(600);

  // Nothing is heard, and no audio clock is even started, until asked.
  const toggle = page.locator('.sound-toggle');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(await voices(page)).toBe(0);

  // Playing the game while muted stays silent.
  await page.keyboard.press('Space');
  await waitForScene(page, 'sport-select');
  await page.waitForTimeout(300);
  expect(await voices(page)).toBe(0);

  // The switch turns it on, and the menus start making noise.
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(400);
  const afterToggle = await voices(page);
  expect(afterToggle).toBeGreaterThan(0);

  // Pressing the switch does not also count as a tap on the game.
  expect(await page.locator('#game').getAttribute('data-scene')).toBe('sport-select');

  // Moving along the menu is audible.
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  expect(await voices(page)).toBeGreaterThan(afterToggle);

  // M turns it off again, and the choice survives a reload.
  await page.keyboard.press('KeyM');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await waitForScene(page, 'title');
  await expect(page.locator('.sound-toggle')).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});

test('a race with the sound on plays effects and stops the menu music', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await countVoices(page);
  await page.goto('/');
  await waitForScene(page, 'title');
  await page.waitForTimeout(400);
  await page.locator('.sound-toggle').click();
  await expect(page.locator('.sound-toggle')).toHaveAttribute('aria-pressed', 'true');

  await page.keyboard.press('Space');
  await waitForScene(page, 'sport-select');
  await page.waitForTimeout(400);
  await hold(page);
  await waitForScene(page, 'athlete-select');
  await page.waitForTimeout(400);
  await hold(page);
  await waitForScene(page, 'marathon-racing', 20_000);
  const atStart = await voices(page);
  await tapOnTheBeat(page);
  await page.waitForTimeout(6000);
  // Judgements are heard: more voices than the music alone would queue.
  expect(await voices(page)).toBeGreaterThan(atStart);
  expect(errors).toEqual([]);
});

test('a deploy is never stale, and a second visit works offline', async ({ page, context }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);

  // A file that changes on the server between two requests. The worker sees
  // both requests, so this shows which one it answers with.
  let build = 'first build';
  await context.route('**/build-probe.js', (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: `export const BUILD = '${build}';` }),
  );

  await page.goto('/');
  await waitForScene(page, 'title');
  // The worker takes over the page it was registered from.
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 20_000 });

  /** @param {import('@playwright/test').Page} p */
  const probe = (p) => p.evaluate(async () => (await fetch('build-probe.js')).text());

  expect(await probe(page)).toContain('first build');
  // Now the server has a newer build. A cache-first worker would keep
  // serving the old one; this one asks the network every time.
  build = 'second build';
  expect(await probe(page)).toContain('second build');

  // Offline: the game still boots, from what the worker kept.
  await page.reload();
  await waitForScene(page, 'title');
  await context.setOffline(true);
  await page.reload();
  await waitForScene(page, 'title', 20_000);
  await expect(page.locator('canvas.screen')).toBeVisible();
  await page.keyboard.press('Space');
  await waitForScene(page, 'sport-select');
  // And the last thing it saw is what it serves.
  expect(await probe(page)).toContain('second build');
  await context.setOffline(false);
  expect(errors).toEqual([]);
});

test('the sound switch keeps out of the HUD: menus only, but M works anywhere', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await page.goto('/');
  await waitForScene(page, 'title');
  const toggle = page.locator('.sound-toggle');
  await expect(toggle).toBeVisible();

  await startSport(page, 0);
  await waitForScene(page, 'marathon-countdown', 20_000);
  // Racing: the corner belongs to the distance and the clock.
  await expect(toggle).toBeHidden();
  await waitForScene(page, 'marathon-racing', 20_000);
  await expect(toggle).toBeHidden();
  // The key still works while hidden.
  await page.keyboard.press('KeyM');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('KeyM');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});
