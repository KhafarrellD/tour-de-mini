/**
 * The swim on screen: side on, half under the water. Tap to stroke and
 * rise, let go and you sink. Buoys hang from the surface and other swimmers
 * churn along the bottom; the gap between them is the line to take.
 */
import { createSwim, stepSwim, swimStandings, SWIM_METRES, DEPTH_MAX } from './swim.js';
import { drawSwimmer } from '../../engine/character.js';
import { cycleFrame } from '../../engine/animation.js';
import { createParticles } from '../../engine/particles.js';
import { createRng } from '../../engine/rng.js';
import { drawText, measureText } from '../../engine/font.js';
import { formatShort } from '../../engine/format.js';
import { paintSky, hillTile } from '../../assets/scenery/countryside.js';
import { createPixelCanvas } from '../../engine/screen.js';
import { PALETTE } from '../../assets/palette.js';
import { sound } from '../../engine/audio.js';

/** @typedef {import('../../data/athletes.js').Athlete} Athlete */
/** @typedef {import('../../engine/input.js').ButtonState} ButtonState */
/** @typedef {import('../sports.js').StageResults} StageResults */

/** Where the water starts; the lane runs from here down. */
const SURFACE_Y = 86;
const PLAYER_X = 96;
const PX_PER_METRE = 1.7;
const FINISH_HOLD = 1.4;

/**
 * @param {{ athlete: Athlete, rivals: Athlete[], seed: number, intro?: boolean,
 *   onFinish: (results: StageResults) => void }} options
 * @returns {import('../../engine/director.js').Scene}
 */
export function createSwimScene({ athlete, rivals, seed, intro = true, onFinish }) {
  const state = createSwim({ athlete, rivals, seed });
  const spray = createParticles(90);
  const rng = createRng(seed ^ 0x5347);
  const sky = createPixelCanvas(320, SURFACE_Y);
  paintSky(sky.ctx, SURFACE_Y);
  const shore = hillTile();

  const INTRO_SECONDS = intro ? 2.4 : 0.6;
  /** @type {'intro' | 'swimming' | 'done'} */
  let phase = 'intro';
  let clock = 0;
  let stroke = 0;
  let flash = 0;
  let wake = 0;
  /** @type {{ text: string, age: number } | null} */
  let popup = null;

  const self = {
    name: 'swim-intro',
    /**
     * @param {number} dt
     * @param {ButtonState} button
     */
    update(dt, button) {
      clock += dt;
      flash = Math.max(0, flash - dt);
      if (popup) popup.age += dt;

      if (phase === 'intro') {
        if (clock >= INTRO_SECONDS) {
          phase = 'swimming';
          self.name = 'swim-swimming';
          clock = 0;
        }
      } else if (phase === 'swimming') {
        wake -= dt;
        if (wake <= 0) {
          wake = 0.07;
          bubble();
        }
        for (const event of stepSwim(state, dt, button.pressed)) {
          if (event.type === 'stroke') {
            splash(3);
            stroke += 1;
            sound.play('splash');
          } else if (event.type === 'hit') {
            popup = { text: event.obstacle.type === 'buoy' ? 'BUOY!' : 'TRAFFIC!', age: 0 };
            flash = 0.18;
            splash(14);
            sound.play('miss');
          } else if (event.type === 'finish') {
            sound.play('stage');
            phase = 'done';
            self.name = 'swim-done';
            clock = 0;
          }
        }
      } else if (clock >= FINISH_HOLD) {
        onFinish(swimStandings(state));
      }
      spray.update(dt);
    },
    /** @param {CanvasRenderingContext2D} ctx */
    render(ctx) {
      ctx.drawImage(sky.canvas, 0, 0);
      ctx.drawImage(shore, -Math.round((state.metres * PX_PER_METRE * 0.25) % 320), SURFACE_Y - 30);
      ctx.drawImage(shore, 320 - Math.round((state.metres * PX_PER_METRE * 0.25) % 320), SURFACE_Y - 30);
      drawWater(ctx, state.metres);
      drawObstacles(ctx);
      spray.draw(ctx);

      const y = SURFACE_Y + Math.round(state.depth);
      const frame = cycleFrame(stroke / 4 + state.metres / 30, 4);
      drawSwimmer(ctx, athlete, phase === 'intro' ? 'idle' : 'stroke', frame, PLAYER_X, y);
      if (flash > 0 && Math.floor(flash * 30) % 2 === 0) {
        ctx.fillStyle = PALETTE.red;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(0, SURFACE_Y, 320, 180 - SURFACE_Y);
        ctx.globalAlpha = 1;
      }
      drawHud(ctx);
    },
  };

  /** A bubble trailing off the swimmer's feet. */
  function bubble() {
    spray.spawn({
      x: PLAYER_X - 10,
      y: SURFACE_Y + state.depth + 2 + rng.next() * 3,
      vx: -26 - rng.next() * 16,
      vy: -6 - rng.next() * 10,
      gravity: -18,
      life: 0.5 + rng.next() * 0.4,
      color: rng.next() < 0.5 ? PALETTE.foam : PALETTE.waterLight,
    });
  }

  /** @param {number} count */
  function splash(count) {
    const y = SURFACE_Y + state.depth;
    for (let i = 0; i < count; i++) {
      spray.spawn({
        x: PLAYER_X + 6 + rng.next() * 8,
        y: y - 2,
        vx: -20 - rng.next() * 40,
        vy: -18 - rng.next() * 30,
        gravity: 150,
        life: 0.25 + rng.next() * 0.25,
        color: rng.next() < 0.6 ? PALETTE.foam : PALETTE.waterLight,
      });
    }
  }

  /**
   * Water, with a foam line at the surface and darker depths below.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} metres
   */
  function drawWater(ctx, metres) {
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(0, SURFACE_Y, 320, 180 - SURFACE_Y);
    ctx.fillStyle = PALETTE.waterDeep;
    ctx.fillRect(0, SURFACE_Y + DEPTH_MAX + 6, 320, 180);
    const scroll = Math.round(metres * PX_PER_METRE);
    // Shafts of light slanting down through the lane.
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = PALETTE.foam;
    for (let i = 0; i < 6; i++) {
      const top = -((scroll * 0.6 + i * 74) % 420) + 320;
      for (let row = 0; row < DEPTH_MAX + 6; row += 2) {
        ctx.fillRect(Math.round(top + row * 0.6), SURFACE_Y + row, 9, 2);
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.waterLight;
    for (let x = -(scroll % 12); x < 320; x += 12) ctx.fillRect(x, SURFACE_Y + 1, 6, 1);
    for (let x = -(scroll % 20) + 7; x < 320; x += 20) ctx.fillRect(x, SURFACE_Y + 9, 4, 1);
    ctx.fillStyle = PALETTE.foam;
    for (let x = -(scroll % 8); x < 320; x += 8) ctx.fillRect(x, SURFACE_Y - 1, 4, 1);
  }

  /** @param {CanvasRenderingContext2D} ctx */
  function drawObstacles(ctx) {
    state.obstacles.forEach((obstacle, index) => {
      const x = Math.round(PLAYER_X + (obstacle.at - state.metres) * PX_PER_METRE);
      if (x < -30 || x > 340) return;
      if (obstacle.type === 'buoy') {
        // A float on the surface on a rope, blocking the top of the lane.
        const bottom = SURFACE_Y + obstacle.gapTop;
        ctx.fillStyle = PALETTE.outline;
        ctx.fillRect(x - 1, SURFACE_Y - 6, 3, bottom - SURFACE_Y + 6);
        ctx.fillStyle = PALETTE.orange;
        ctx.fillRect(x - 3, SURFACE_Y - 9, 7, 7);
        ctx.fillStyle = PALETTE.white;
        ctx.fillRect(x - 2, SURFACE_Y - 8, 2, 2);
        ctx.fillStyle = PALETTE.grey;
        ctx.fillRect(x, SURFACE_Y - 2, 1, bottom - SURFACE_Y + 2);
      } else {
        // Another swimmer churning along, blocking the bottom of the lane.
        const rival = rivals[index % rivals.length];
        drawSwimmer(ctx, rival, 'stroke', cycleFrame(state.metres / 22 + index, 4), x, SURFACE_Y + obstacle.gapBottom + 6);
      }
    });
  }

  /** @param {CanvasRenderingContext2D} ctx */
  function drawHud(ctx) {
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(0, 0, 320, 18);
    ctx.fillStyle = PALETTE.panelEdge;
    ctx.fillRect(0, 18, 320, 1);
    ctx.fillStyle = PALETTE.outline;
    ctx.fillRect(0, 19, 320, 1);
    drawText(ctx, 'SWIM', 5, 6, { color: PALETTE.yellow });
    const toGo = `${Math.max(0, Math.round(SWIM_METRES - state.metres))} M`;
    drawText(ctx, toGo, 315, 6, { align: 'right' });
    drawText(ctx, formatShort(state.time), 160, 6, { align: 'center' });
    if (state.hits > 0) {
      const hits = `${state.hits} BUMP${state.hits > 1 ? 'S' : ''}`;
      drawText(ctx, hits, 160 - measureText(hits) / 2, 24, { color: PALETTE.red });
    }

    if (phase === 'intro') {
      drawText(ctx, 'TAP TO STROKE AND RISE', 160, 44, { align: 'center', scale: 2, color: PALETTE.yellow });
      drawText(ctx, 'LET GO TO SINK. MIND THE BUOYS.', 160, 66, { align: 'center' });
    } else if (phase === 'swimming' && clock < 3) {
      drawText(ctx, 'TAP TO STROKE', 160, 68, { align: 'center', color: PALETTE.skyHaze });
    }
    if (popup && popup.age < 0.7) {
      drawText(ctx, popup.text, PLAYER_X, SURFACE_Y - 18 - Math.round(popup.age * 10), {
        align: 'center',
        color: PALETTE.red,
      });
    }
  }

  return self;
}
