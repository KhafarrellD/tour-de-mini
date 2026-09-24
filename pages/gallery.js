/**
 * Sprite gallery: every athlete at native size (1 game pixel per CSS pixel)
 * and enlarged, with idle and motion cycles playing, plus the bike and an
 * in-game scale check that measures every sprite against the 36px limit.
 */
import { ATHLETES, athletesFor } from '../data/athletes.js';
import {
  drawBike,
  drawRider,
  drawRiderRear,
  drawRunner,
  drawSwimmer,
  PEDAL_FRAMES,
  MAX_LEAN,
} from '../engine/character.js';
import { cycleFrame, wheelTurns } from '../engine/animation.js';
import { startLoop } from '../engine/loop.js';
import { drawText, measureText, wrapText, LINE_HEIGHT } from '../engine/font.js';
import { createPixelCanvas, WIDTH, HEIGHT } from '../engine/screen.js';
import { PALETTE } from '../assets/palette.js';
import { WHEEL } from '../assets/sprites/bike.js';
import { createSideScene, SCENE } from '../games/shared/side-scene.js';

/** @typedef {import('../data/athletes.js').Athlete} Athlete */

const STAGE_WIDTH = 40;
const STAGE_HEIGHT = 50;
const GROUND = 38;
const WATER_LINE = GROUND - 6;
const HEIGHT_LIMIT = 36;

// Showcase speeds: 90 rpm cadence, a steady roll, an easy running pace.
const CADENCE = 90 / 60;
const ROAD_SPEED = 48;
const STRIDES = 1.4;
const STROKES = 0.9;
const BREATHS = 0.6;

/** @param {number} time */
const pedalFrame = (time) => cycleFrame(time * CADENCE, PEDAL_FRAMES);
/** @param {number} time */
const rearPedalFrame = (time) => cycleFrame(time * CADENCE, 4);
/** @param {number} time @param {number} speed */
const wheelFrame = (time, speed = ROAD_SPEED) => cycleFrame(wheelTurns(time * speed, WHEEL.size) * 4, 4);
/** @param {number} time */
const treadFrame = (time) => cycleFrame((time * ROAD_SPEED) / 12, 3);
/** @param {number} time */
const breath = (time) => cycleFrame(time * BREATHS, 2);
/** @param {number} time */
const lean = (time) => Math.round(Math.sin(time * 1.6) * MAX_LEAN);

/**
 * @typedef {object} Stage
 * @property {string} label
 * @property {'road' | 'water'} ground
 * @property {(ctx: CanvasRenderingContext2D, x: number, time: number) => void} draw
 */

/**
 * @param {Athlete} athlete
 * @returns {Stage[]}
 */
function stagesFor(athlete) {
  const idle = /** @type {Stage} */ ({
    label: 'IDLE',
    ground: 'road',
    draw: (ctx, x, t) => drawRunner(ctx, athlete, 'run', 'idle', breath(t), x, GROUND),
  });
  const run = /** @type {Stage} */ ({
    label: 'RUN',
    ground: 'road',
    draw: (ctx, x, t) => drawRunner(ctx, athlete, 'run', 'run', cycleFrame(t * STRIDES, 6), x, GROUND),
  });
  const behind = /** @type {Stage} */ ({
    label: 'BEHIND',
    ground: 'road',
    draw: (ctx, x, t) => drawRiderRear(ctx, athlete, 'bike', rearPedalFrame(t), treadFrame(t), 0, x, GROUND),
  });
  const leaning = /** @type {Stage} */ ({
    label: 'LEAN',
    ground: 'road',
    draw: (ctx, x, t) => drawRiderRear(ctx, athlete, 'bike', rearPedalFrame(t), treadFrame(t), lean(t), x, GROUND),
  });

  if (athlete.sport === 'cycling') {
    return [
      {
        label: 'IDLE',
        ground: 'road',
        draw: (ctx, x, t) => drawRider(ctx, athlete, 'bike', 'idle', breath(t), 0, x, GROUND),
      },
      {
        label: 'PEDAL',
        ground: 'road',
        draw: (ctx, x, t) => drawRider(ctx, athlete, 'bike', 'pedal', pedalFrame(t), wheelFrame(t), x, GROUND),
      },
      behind,
      leaning,
    ];
  }
  if (athlete.sport === 'marathon') return [idle, run];
  return [
    {
      label: 'SWIM',
      ground: 'water',
      draw: (ctx, x, t) => drawSwimmer(ctx, athlete, 'stroke', cycleFrame(t * STROKES, 4), x, WATER_LINE),
    },
    leaning,
    run,
    idle,
  ];
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Stage} stage
 * @param {number} left
 */
function paintStageBackground(ctx, stage, left) {
  ctx.fillStyle = PALETTE.skyMid;
  ctx.fillRect(left, 0, STAGE_WIDTH, STAGE_HEIGHT);
  if (stage.ground === 'water') {
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(left, WATER_LINE, STAGE_WIDTH, STAGE_HEIGHT);
    ctx.fillStyle = PALETTE.waterLight;
    for (let x = left; x < left + STAGE_WIDTH; x += 3) ctx.fillRect(x, WATER_LINE, 2, 1);
  } else {
    ctx.fillStyle = PALETTE.road;
    ctx.fillRect(left, GROUND, STAGE_WIDTH, STAGE_HEIGHT);
  }
}

/**
 * Tints everything below the water line, so a swimmer sits half submerged.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} left
 */
function paintWaterSurface(ctx, left) {
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = PALETTE.waterDeep;
  ctx.fillRect(left, WATER_LINE, STAGE_WIDTH, GROUND - WATER_LINE);
  ctx.globalAlpha = 1;
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(left, GROUND, STAGE_WIDTH, STAGE_HEIGHT);
}

/**
 * A canvas showing pixel-font text, enlarged by whole CSS pixels.
 * @param {string} text
 * @param {{ scale?: number, color?: string, maxWidth?: number }} [options]
 */
function textCanvas(text, { scale = 1, color = PALETTE.white, maxWidth = Infinity } = {}) {
  const lines = wrapText(text.toUpperCase(), maxWidth);
  const width = Math.max(...lines.map(measureText)) + 2;
  const { canvas, ctx } = createPixelCanvas(width, lines.length * LINE_HEIGHT);
  lines.forEach((line, i) => drawText(ctx, line, 1, i * LINE_HEIGHT + 2, { color }));
  canvas.className = 'pixel-text';
  canvas.style.width = `${canvas.width * scale}px`;
  canvas.style.height = `${canvas.height * scale}px`;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', text);
  return canvas;
}

/**
 * Keeps `display` showing `source` at the largest whole number of device
 * pixels per game pixel that fits its container.
 * @param {HTMLCanvasElement} display
 * @param {HTMLCanvasElement} source
 * @param {number} [minScale]
 */
function fitDisplay(display, source, minScale = 1) {
  const container = /** @type {HTMLElement} */ (display.parentElement);
  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const scale = Math.max(minScale, Math.floor((container.clientWidth * dpr) / source.width));
    display.width = source.width * scale;
    display.height = source.height * scale;
    display.style.width = `${display.width / dpr}px`;
    display.style.height = `${display.height / dpr}px`;
  };
  new ResizeObserver(resize).observe(container);
  resize();
}

/**
 * @param {string} tag
 * @param {string} [className]
 * @param {Node[]} [children]
 */
function el(tag, className = '', children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children);
  return node;
}

/** @type {(() => void)[]} */
const renderers = [];

/**
 * An animated card: stages side by side, shown at 1x and enlarged.
 * @param {Stage[]} stages
 * @param {Node[]} heading
 * @param {Node[]} [footer]
 */
function card(stages, heading, footer = []) {
  const buffer = createPixelCanvas(stages.length * STAGE_WIDTH, STAGE_HEIGHT);
  const native = document.createElement('canvas');
  native.width = buffer.canvas.width;
  native.height = buffer.canvas.height;
  native.className = 'native';
  native.style.width = `${native.width}px`;
  const zoomed = document.createElement('canvas');
  zoomed.className = 'zoomed';

  const nativeFigure = el('figure', 'native-figure', [native, textCanvas('1X', { color: PALETTE.lightGrey })]);
  const zoomFigure = el('figure', 'zoom-figure', [zoomed]);
  const article = el('article', 'card', [...heading, nativeFigure, zoomFigure, ...footer]);
  requestAnimationFrame(() => fitDisplay(zoomed, buffer.canvas, 2));

  const nativeCtx = /** @type {CanvasRenderingContext2D} */ (native.getContext('2d'));
  renderers.push(() => {
    const ctx = buffer.ctx;
    stages.forEach((stage, i) => {
      const left = i * STAGE_WIDTH;
      paintStageBackground(ctx, stage, left);
      stage.draw(ctx, left + STAGE_WIDTH / 2, time);
      if (stage.ground === 'water') paintWaterSurface(ctx, left);
      drawText(ctx, stage.label, left + STAGE_WIDTH / 2, GROUND + 3, { align: 'center' });
    });
    nativeCtx.drawImage(buffer.canvas, 0, 0);
    const zoomCtx = /** @type {CanvasRenderingContext2D} */ (zoomed.getContext('2d'));
    zoomCtx.imageSmoothingEnabled = false;
    zoomCtx.drawImage(buffer.canvas, 0, 0, zoomed.width, zoomed.height);
  });
  return article;
}

/** @param {Athlete} athlete */
function athleteCard(athlete) {
  return card(
    stagesFor(athlete),
    [
      textCanvas(athlete.name, { scale: 2 }),
      textCanvas(`${athlete.country} - ${athlete.team}`, { color: PALETTE.lightGrey }),
    ],
    [textCanvas(athlete.look, { color: PALETTE.yellow, maxWidth: 150 })],
  );
}

function bikeCard() {
  const athlete = ATHLETES[0];
  /** @param {string} label @param {number} speed */
  const spin = (label, speed) => /** @type {Stage} */ ({
    label,
    ground: 'road',
    draw: (ctx, x, t) => drawBike(ctx, athlete, wheelFrame(t, speed), x, GROUND),
  });
  return card(
    [spin('STILL', 0), spin('SLOW', 16), spin('FAST', 96)],
    [textCanvas('The bike', { scale: 2 }), textCanvas('Wheel spin follows road speed', { color: PALETTE.lightGrey })],
  );
}

/**
 * Finds how tall the tallest sprite is, in game pixels, by drawing every
 * athlete's poses and scanning for the topmost opaque pixel.
 */
function measureTallest() {
  const { canvas, ctx } = createPixelCanvas(64, STAGE_HEIGHT, { willReadFrequently: true });
  let tallest = { height: 0, name: '' };
  for (const athlete of ATHLETES) {
    for (const stage of stagesFor(athlete)) {
      if (stage.ground === 'water') continue;
      for (let step = 0; step < 16; step++) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const t = step / 7;
        stage.draw(ctx, 32, t);
        const alpha = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let top = canvas.height;
        for (let i = 3; i < alpha.length; i += 4) {
          if (alpha[i]) {
            top = Math.floor(i / 4 / canvas.width);
            break;
          }
        }
        const height = GROUND + 1 - top;
        if (height > tallest.height) tallest = { height, name: athlete.name };
      }
    }
  }
  return tallest;
}

function scaleCheck() {
  const scene = createSideScene();
  const riders = athletesFor('cycling');
  const buffer = createPixelCanvas(WIDTH, HEIGHT);
  const display = document.createElement('canvas');
  display.className = 'zoomed';
  const tallest = measureTallest();
  const verdict = tallest.height <= HEIGHT_LIMIT ? 'PASS' : 'FAIL';
  const section = el('section', 'scale-check', [
    textCanvas('In-game scale', { scale: 3 }),
    textCanvas('The 320x180 frame at whole-pixel scale. Guides: HUD band, road band, 36px height limit.', {
      color: PALETTE.lightGrey,
      maxWidth: 300,
    }),
    el('figure', 'zoom-figure', [display]),
    textCanvas(`Tallest sprite: ${tallest.name}, ${tallest.height}px of ${HEIGHT_LIMIT}px - ${verdict}`, {
      scale: 2,
      color: verdict === 'PASS' ? PALETTE.volt : PALETTE.red,
      maxWidth: 160,
    }),
  ]);
  section.dataset.tallest = String(tallest.height);
  requestAnimationFrame(() => fitDisplay(display, buffer.canvas));

  renderers.push(() => {
    const ctx = buffer.ctx;
    scene.draw(ctx, time * ROAD_SPEED);
    riders.forEach((athlete, i) => {
      const x = 28 + i * 44;
      drawRider(ctx, athlete, 'bike', 'pedal', pedalFrame(time + i * 0.13), wheelFrame(time), x, SCENE.laneY);
    });
    // Guides
    ctx.fillStyle = PALETTE.yellow;
    for (let x = 0; x < WIDTH; x += 4) ctx.fillRect(x, 19, 2, 1);
    drawText(ctx, 'HUD BAND 20PX', 4, 7, { color: PALETTE.yellow });
    ctx.fillStyle = PALETTE.volt;
    for (let x = 0; x < WIDTH; x += 4) ctx.fillRect(x, SCENE.roadTop, 2, 1);
    drawText(ctx, 'ROAD BAND 30%', 316, SCENE.roadTop + 4, { color: PALETTE.volt, align: 'right' });
    ctx.fillStyle = PALETTE.red;
    for (let x = 0; x < WIDTH; x += 4) ctx.fillRect(x, SCENE.laneY - HEIGHT_LIMIT, 2, 1);
    drawText(ctx, '36PX LIMIT', 316, SCENE.laneY - HEIGHT_LIMIT - 9, { color: PALETTE.red, align: 'right' });

    const displayCtx = /** @type {CanvasRenderingContext2D} */ (display.getContext('2d'));
    displayCtx.imageSmoothingEnabled = false;
    displayCtx.drawImage(buffer.canvas, 0, 0, display.width, display.height);
  });
  return section;
}

/**
 * @param {string} title
 * @param {Node[]} cards
 */
function section(title, cards) {
  return el('section', 'roster', [textCanvas(title, { scale: 3 }), el('div', 'cards', cards)]);
}

let time = 0;

const main = /** @type {HTMLElement} */ (document.querySelector('main'));
main.append(
  el('header', 'page-header', [
    textCanvas('Pixel Endurance', { scale: 4, color: PALETTE.yellow }),
    textCanvas('Sprite gallery: every athlete at 1x and enlarged', { scale: 2, color: PALETTE.lightGrey, maxWidth: 160 }),
  ]),
  scaleCheck(),
  section('The Tour', athletesFor('cycling').map(athleteCard)),
  section('Marathon', athletesFor('marathon').map(athleteCard)),
  section('Ironman', athletesFor('ironman').map(athleteCard)),
  section('Equipment', [bikeCard()]),
);

startLoop({
  update(dt) {
    time += dt;
  },
  render() {
    for (const render of renderers) render();
  },
});
