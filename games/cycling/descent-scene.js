/**
 * The descent on screen, seen from behind the rider: the road falls away
 * through switchbacks, corner signs warn what speed is safe, and a gauge
 * shows whether you are inside it. Hold the button to brake.
 */
import { createDescent, stepDescent, cornerAhead, descentStandings, curvatureAt, SIGN_DISTANCE } from './descent.js';
import { createRoadCamera, drawRoad, drawPosts, project, roadCenterAt, HORIZON_Y } from './road-view.js';
import { drawRiderRear, MAX_LEAN } from '../../engine/character.js';
import { cycleFrame } from '../../engine/animation.js';
import { createParticles } from '../../engine/particles.js';
import { createRng } from '../../engine/rng.js';
import { drawText, measureText } from '../../engine/font.js';
import { clamp, damp } from '../../engine/math.js';
import { formatShort } from '../../engine/format.js';
import { paintSky, mountainTile } from '../../assets/scenery/countryside.js';
import { createPixelCanvas } from '../../engine/screen.js';
import { PALETTE } from '../../assets/palette.js';

/** @typedef {import('../../data/athletes.js').Athlete} Athlete */
/** @typedef {import('../sports.js').Outcome} Outcome */
/** @typedef {import('../../engine/input.js').ButtonState} ButtonState */

const FULL_INTRO = 2.6;
const SHORT_INTRO = 0.8;
const FINISH_HOLD = 2.6;
const TOP_SPEED_SHOWN = 26;
const GAUGE = { x: 96, y: 168, width: 128, height: 7 };
/** The rider's wheels sit here, clear of the gauge below. */
const RIDER_GROUND_Y = 163;
/** Pedal frames per second while freewheeling downhill. */
const COAST_CADENCE = 0.9;

/**
 * @param {{ athlete: Athlete, rivals: Athlete[], seed: number, metres?: number,
 *   intro?: boolean, onFinish: (outcome: Outcome) => void }} options
 *   `metres` shortens the descent and `intro: false` skips the briefing, both
 *   for the Ironman's bike leg.
 * @returns {import('../../engine/director.js').Scene}
 */
export function createDescentScene({ athlete, rivals, seed, metres, intro = true, onFinish }) {
  const state = createDescent({ athlete, rivals, seed, metres });
  const gravel = createParticles(120);
  const rng = createRng(seed ^ 0x9e37);
  const sky = createPixelCanvas(320, HORIZON_Y + 1);
  paintSky(sky.ctx, HORIZON_Y + 1);
  const mountains = mountainTile();

  const INTRO = intro ? FULL_INTRO : SHORT_INTRO;
  /** @type {'intro' | 'riding' | 'finished'} */
  let phase = 'intro';
  let clock = 0;
  let lean = 0;
  let tilt = 0;
  let shake = 0;
  let crank = 0;
  let topSpeed = 0;
  /** @type {{ text: string, color: string, age: number } | null} */
  let popup = null;
  let finalRows = /** @type {ReturnType<typeof descentStandings>} */ ([]);

  const camera = createRoadCamera((metres) => curvatureAt(state, metres));

  const self = {
    name: 'descent-intro',
    /**
     * @param {number} dt
     * @param {ButtonState} button
     */
    update(dt, button) {
      clock += dt;
      shake = Math.max(0, shake - dt);
      if (popup) popup.age += dt;

      if (phase === 'intro') {
        if (clock >= INTRO) {
          phase = 'riding';
          self.name = 'descent-riding';
          clock = 0;
        }
      } else if (phase === 'riding') {
        const braking = button.held;
        for (const event of stepDescent(state, dt, braking)) {
          if (event.type === 'wobble') {
            popup = { text: 'WOBBLE!', color: PALETTE.orange, age: 0 };
            shake = 0.12;
            spray(10);
          } else if (event.type === 'crash') {
            popup = { text: 'CRASH!', color: PALETTE.red, age: 0 };
            shake = 0.45;
            spray(40);
          } else if (event.type === 'finish') {
            phase = 'finished';
            self.name = 'descent-finished';
            clock = 0;
            finalRows = descentStandings(state);
          }
        }
        if (braking && state.speed > 9 && rng.next() < 0.3) spray(1);
      } else if (clock >= FINISH_HOLD) {
        const place = finalRows.findIndex((row) => row.isPlayer) + 1;
        onFinish({
          time: state.time,
          place,
          standings: finalRows,
          summary: [
            `CLEAN ${state.clean}   WOBBLE ${state.wobbles}`,
            `CRASH ${state.crashes}   TOP ${Math.round(topSpeed * 3.6)} KM/H`,
          ],
        });
      }

      topSpeed = Math.max(topSpeed, state.speed);
      // The camera rolls into the corner, and the rider leans with it.
      camera.update(state.metres);
      const bend = curvatureAt(state, state.metres + 20) * 55;
      const wanted = clamp(bend, -1, 1);
      lean = damp(lean, wanted, 5, dt);
      tilt = damp(tilt, -wanted * 0.16, 4, dt);
      camera.tilt = tilt;
      crank += (state.down > 0 ? 0 : COAST_CADENCE + state.speed * 0.05) * dt;
      gravel.update(dt);
    },
    /** @param {CanvasRenderingContext2D} ctx */
    render(ctx) {
      const shakeX = shake > 0 ? Math.round((rng.next() - 0.5) * 6 * (shake / 0.45)) : 0;
      const shakeY = shake > 0 ? Math.round((rng.next() - 0.5) * 4 * (shake / 0.45)) : 0;
      ctx.save();
      ctx.translate(shakeX, shakeY);

      drawSky(ctx);
      drawRoad(ctx, camera);
      drawPosts(ctx, camera);
      drawSigns(ctx);
      drawFinishGate(ctx);
      gravel.draw(ctx);

      // The rider sits above the gauge: the HUD never covers the player.
      const down = state.down > 0;
      const groundY = down ? RIDER_GROUND_Y + 2 : RIDER_GROUND_Y;
      ctx.fillStyle = PALETTE.road;
      ctx.fillRect(152, groundY, 17, 1);
      ctx.fillStyle = PALETTE.outline;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(153, groundY, 15, 1);
      ctx.globalAlpha = 1;
      drawRiderRear(
        ctx,
        athlete,
        'bike',
        cycleFrame(crank, 4),
        cycleFrame(state.metres / 3, 3),
        Math.round(lean * MAX_LEAN),
        160,
        groundY,
      );
      ctx.restore();

      drawHud(ctx);
      drawOverlay(ctx);
    },
  };

  /** @param {number} count */
  function spray(count) {
    for (let i = 0; i < count; i++) {
      gravel.spawn({
        x: 160 + (rng.next() - 0.5) * 26,
        y: 172 + rng.next() * 6,
        vx: (rng.next() - 0.5) * 90,
        vy: -20 - rng.next() * 45,
        gravity: 190,
        life: 0.3 + rng.next() * 0.3,
        color: rng.next() < 0.5 ? PALETTE.lightGrey : PALETTE.grey,
      });
    }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  function drawSky(ctx) {
    ctx.drawImage(sky.canvas, 0, 0);
    // The mountains slide sideways as the road turns, which sells the bend.
    const offset = Math.round(-(roadCenterAt(camera, HORIZON_Y + 6) - 160) * 1.6);
    for (let x = (offset % 320) - 320; x < 320; x += 320) {
      ctx.drawImage(mountains, x, HORIZON_Y - 44);
    }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  function drawSigns(ctx) {
    for (const corner of state.course) {
      if (corner.at < state.metres - 10 || corner.at > state.metres + SIGN_DISTANCE) continue;
      const spot = project(camera, corner.at - 12, corner.direction * 7.5);
      if (!spot) continue;
      const kmh = Math.round(corner.safeSpeed * 3.6);
      drawSign(ctx, Math.round(spot.x), Math.round(spot.y), spot.scale, kmh, corner.direction, corner.hairpin);
    }
  }

  /**
   * The banner over the road at the bottom of the descent.
   * @param {CanvasRenderingContext2D} ctx
   */
  function drawFinishGate(ctx) {
    const spot = project(camera, state.metresTotal, 0);
    if (!spot) return;
    const x = Math.round(spot.x);
    const width = Math.max(10, Math.round(620 / (state.metresTotal - state.metres + 1)) * 2 + 24);
    const height = Math.max(4, Math.round(width * 0.22));
    const top = Math.round(spot.y) - height - Math.round(width * 0.55);
    ctx.fillStyle = PALETTE.outline;
    ctx.fillRect(x - width / 2 - 1, top - 1, width + 2, height + 2);
    ctx.fillStyle = PALETTE.red;
    ctx.fillRect(x - width / 2, top, width, height);
    ctx.fillStyle = PALETTE.lightGrey;
    ctx.fillRect(x - width / 2 - 1, top + height, 2, Math.round(width * 0.55));
    ctx.fillRect(x + width / 2 - 1, top + height, 2, Math.round(width * 0.55));
    if (width > 50) {
      drawText(ctx, 'FINISH', x, top + Math.round(height / 2) - 3, { align: 'center', color: PALETTE.white, outline: '' });
    }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  function drawHud(ctx) {
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(0, 0, 320, 18);
    ctx.fillStyle = PALETTE.panelEdge;
    ctx.fillRect(0, 18, 320, 1);
    ctx.fillStyle = PALETTE.outline;
    ctx.fillRect(0, 19, 320, 1);

    const kmh = String(Math.round(state.speed * 3.6));
    drawText(ctx, kmh, 5, 3, { scale: 2, color: PALETTE.yellow });
    drawText(ctx, 'KM/H', 5 + measureText(kmh) * 2 + 4, 9);
    drawText(ctx, formatShort(state.time), 160, 6, { align: 'center' });
    const toGo = `${Math.max(0, Math.round(state.metresTotal - state.metres))} M`;
    drawText(ctx, toGo, 315, 6, { align: 'right' });

    // Speed gauge: keep the marker inside the green before the corner.
    const corner = cornerAhead(state);
    ctx.fillStyle = PALETTE.outline;
    ctx.fillRect(GAUGE.x - 1, GAUGE.y - 1, GAUGE.width + 2, GAUGE.height + 2);
    ctx.fillStyle = PALETTE.panelEdge;
    ctx.fillRect(GAUGE.x, GAUGE.y, GAUGE.width, GAUGE.height);
    if (corner) {
      const safe = Math.round((corner.safeSpeed / TOP_SPEED_SHOWN) * GAUGE.width);
      ctx.fillStyle = PALETTE.green;
      ctx.fillRect(GAUGE.x, GAUGE.y, safe, GAUGE.height);
      ctx.fillStyle = PALETTE.red;
      ctx.fillRect(GAUGE.x + safe, GAUGE.y, GAUGE.width - safe, GAUGE.height);
    } else {
      ctx.fillStyle = PALETTE.green;
      ctx.fillRect(GAUGE.x, GAUGE.y, GAUGE.width, GAUGE.height);
    }
    const marker = GAUGE.x + Math.round(clamp(state.speed / TOP_SPEED_SHOWN, 0, 1) * (GAUGE.width - 1));
    ctx.fillStyle = PALETTE.outline;
    ctx.fillRect(marker - 2, GAUGE.y - 3, 5, GAUGE.height + 6);
    ctx.fillStyle = PALETTE.white;
    ctx.fillRect(marker - 1, GAUGE.y - 2, 3, GAUGE.height + 4);
    drawText(ctx, 'SPEED', GAUGE.x - 34, GAUGE.y);

    if (corner && state.speed > corner.safeSpeed && corner.at - state.metres < 70) {
      if (Math.floor(clock * 8) % 2 === 0) {
        drawText(ctx, 'BRAKE!', GAUGE.x + GAUGE.width + 8, GAUGE.y, { color: PALETTE.red });
      }
    }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  function drawOverlay(ctx) {
    if (phase === 'intro') {
      drawText(ctx, intro ? 'THE DESCENT' : 'BIKE LEG', 160, 30, { align: 'center', scale: 3, color: PALETTE.yellow });
      if (intro) {
        drawText(ctx, 'HOLD TO BRAKE. EVERY CORNER SHOWS ITS SAFE SPEED', 160, 58, { align: 'center' });
        drawText(ctx, 'KEEP THE MARKER OUT OF THE RED', 160, 70, { align: 'center', color: PALETTE.skyHaze });
      }
    }
    if (state.down > 0) drawText(ctx, 'BACK ON!', 160, 44, { align: 'center', scale: 2, color: PALETTE.red });
    if (phase === 'finished') drawText(ctx, 'FINISH!', 160, 34, { align: 'center', scale: 3, color: PALETTE.yellow });
    if (popup && popup.age < 0.8) {
      drawText(ctx, popup.text, 160, 120 - Math.round(popup.age * 12), { align: 'center', color: popup.color });
    }
  }

  return self;
}

/**
 * A roadside board: the safe speed, with a chevron pointing into the bend.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} scale
 * @param {number} kmh
 * @param {number} direction
 * @param {boolean} hairpin
 */
function drawSign(ctx, x, y, scale, kmh, direction, hairpin) {
  const label = String(kmh);
  const width = (measureText(label) + 6) * scale;
  const height = 11 * scale;
  const top = y - height - 2 * scale;
  ctx.fillStyle = PALETTE.grey;
  ctx.fillRect(x - scale, top + height, scale, 6 * scale);
  ctx.fillStyle = PALETTE.outline;
  ctx.fillRect(x - width / 2 - 1, top - 1, width + 2, height + 2);
  ctx.fillStyle = hairpin ? PALETTE.red : PALETTE.white;
  ctx.fillRect(x - width / 2, top, width, height);
  if (scale === 1) {
    drawText(ctx, label, x, top + 2, { align: 'center', color: hairpin ? PALETTE.white : PALETTE.navy, outline: '' });
  } else {
    drawText(ctx, label, x, top + 2 * scale, {
      align: 'center',
      scale,
      color: hairpin ? PALETTE.white : PALETTE.navy,
      outline: '',
    });
  }
  // Chevron under the board, pointing the way the road goes.
  const chevron = 3 * scale;
  ctx.fillStyle = PALETTE.yellow;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x - chevron + i * chevron * direction, top + height + 2, chevron - 1, scale);
  }
}
