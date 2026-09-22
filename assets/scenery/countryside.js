/**
 * Roadside scenery for side-view events, painted pixel by pixel into
 * repeating tiles at load time. Silhouettes are sums of sine waves with
 * whole-number frequencies, so every tile wraps seamlessly when it scrolls.
 */
import { PALETTE, color } from '../palette.js';
import { createPixelCanvas } from '../../engine/screen.js';
import { createRng } from '../../engine/rng.js';

/** Layout of the side-view scene, in game pixels. */
export const SCENE = {
  /** Top of the road; everything below is the ground band (30% of 180). */
  roadTop: 126,
  /** Where riders and runners touch the road. */
  laneY: 158,
};

const TILE_WIDTH = 320;

/**
 * @param {number} x
 * @param {readonly (readonly [amplitude: number, frequency: number, phase: number])[]} waves
 */
function ridge(x, waves) {
  let height = 0;
  for (const [amplitude, frequency, phase] of waves) {
    height += amplitude * Math.sin((2 * Math.PI * frequency * x) / TILE_WIDTH + phase);
  }
  return height;
}

/**
 * The sky, in flat bands with a one-row checkerboard between them, the
 * classic way to fake a gradient with a limited palette.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} height
 */
export function paintSky(ctx, height) {
  const bands = [PALETTE.skyHigh, PALETTE.skyMid, PALETTE.skyHaze];
  const bandHeight = Math.ceil(height / bands.length);
  bands.forEach((band, i) => {
    ctx.fillStyle = band;
    ctx.fillRect(0, i * bandHeight, TILE_WIDTH, bandHeight);
    if (i === 0) return;
    ctx.fillStyle = bands[i - 1];
    for (let x = 0; x < TILE_WIDTH; x += 2) ctx.fillRect(x, i * bandHeight, 1, 1);
  });
}

/** Far mountains with snowy peaks; the slopes facing right are in shade. */
export function mountainTile() {
  const height = 56;
  const { canvas, ctx } = createPixelCanvas(TILE_WIDTH, height);
  const waves = /** @type {const} */ ([
    [12, 2, 0.4],
    [7, 5, 1.9],
    [3, 11, 0.7],
    [1.5, 23, 2.2],
  ]);
  // Shade by the broad slope only, so small jags don't stripe the rock.
  const broad = waves.slice(0, 2);
  for (let x = 0; x < TILE_WIDTH; x++) {
    const y = Math.round(26 - ridge(x, waves));
    const shaded = ridge(x + 1, broad) < ridge(x, broad);
    ctx.fillStyle = shaded ? PALETTE.mountainShade : PALETTE.mountain;
    ctx.fillRect(x, y, 1, height - y);
    if (y < 18) {
      ctx.fillStyle = shaded ? PALETTE.cloudShade : PALETTE.snow;
      ctx.fillRect(x, y, 1, Math.min(4, 18 - y + 1));
    }
  }
  return canvas;
}

/** Rolling green hills dotted with trees. */
export function hillTile() {
  const height = 34;
  const { canvas, ctx } = createPixelCanvas(TILE_WIDTH, height);
  const waves = /** @type {const} */ ([
    [5, 3, 1.1],
    [3, 7, 0.3],
    [1, 16, 2.6],
  ]);
  const rng = createRng(11);
  for (let x = 0; x < TILE_WIDTH; x++) {
    const y = Math.round(12 - ridge(x, waves));
    ctx.fillStyle = PALETTE.hill;
    ctx.fillRect(x, y, 1, height - y);
    ctx.fillStyle = PALETTE.hillShade;
    ctx.fillRect(x, y + 6 + (x % 3 === 0 ? 1 : 0), 1, height);
  }
  for (let x = 4; x < TILE_WIDTH - 4; x += rng.int(9, 22)) {
    const y = Math.round(12 - ridge(x, waves));
    ctx.fillStyle = PALETTE.hillDark;
    ctx.fillRect(x - 1, y - 3, 3, 3);
    ctx.fillRect(x, y - 5, 1, 2);
  }
  return canvas;
}

/**
 * Spectators behind a barrier along the far edge of the road. Each fan is a
 * 3x5 figure in a random kit color; some have their arms up.
 */
export function crowdTile() {
  const height = 14;
  const { canvas, ctx } = createPixelCanvas(TILE_WIDTH, height);
  const rng = createRng(29);
  const shirts = ['red', 'yellow', 'white', 'blue', 'green', 'pink', 'orange', 'navy'];
  const skins = ['skinPale', 'skinFair', 'skinTan', 'skinBrown', 'skinDark'];
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 6, TILE_WIDTH, height - 6);
  for (let x = 1; x < TILE_WIDTH - 3; x += rng.int(3, 5)) {
    const y = rng.int(0, 2);
    ctx.fillStyle = color(rng.pick(shirts));
    ctx.fillRect(x, y + 3, 3, 4);
    ctx.fillStyle = color(rng.pick(skins));
    ctx.fillRect(x + 1, y + 1, 1, 2);
    if (rng.next() < 0.3) {
      ctx.fillRect(x, y, 1, 3);
      ctx.fillRect(x + 2, y, 1, 3);
    }
  }
  // Barrier: white panels with a red base rail, posts every 16px.
  ctx.fillStyle = PALETTE.white;
  ctx.fillRect(0, 7, TILE_WIDTH, 4);
  ctx.fillStyle = PALETTE.red;
  ctx.fillRect(0, 11, TILE_WIDTH, 2);
  ctx.fillStyle = PALETTE.whiteShade;
  for (let x = 0; x < TILE_WIDTH; x += 16) ctx.fillRect(x, 7, 1, 6);
  ctx.fillStyle = PALETTE.outline;
  ctx.fillRect(0, 13, TILE_WIDTH, 1);
  return canvas;
}

/** Asphalt with a speckled texture, a bright edge line and center dashes. */
export function roadTile() {
  const height = 180 - SCENE.roadTop;
  const { canvas, ctx } = createPixelCanvas(TILE_WIDTH, height);
  const rng = createRng(5);
  ctx.fillStyle = PALETTE.road;
  ctx.fillRect(0, 0, TILE_WIDTH, height);
  ctx.fillStyle = PALETTE.roadLight;
  for (let i = 0; i < 700; i++) ctx.fillRect(rng.int(0, TILE_WIDTH - 1), rng.int(3, height - 1), 1, 1);
  ctx.fillStyle = PALETTE.roadLine;
  ctx.fillRect(0, 2, TILE_WIDTH, 1);
  for (let x = 0; x < TILE_WIDTH; x += 32) ctx.fillRect(x, 20, 14, 2);
  ctx.fillStyle = PALETTE.grassShade;
  ctx.fillRect(0, height - 6, TILE_WIDTH, 6);
  ctx.fillStyle = PALETTE.grass;
  for (let x = 0; x < TILE_WIDTH; x += 2) ctx.fillRect(x, height - 6, 1, 1);
  return canvas;
}
