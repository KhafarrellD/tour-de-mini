/**
 * The final 2 km on screen: the bunch strung out along the road, a stamina
 * bar you have to nurse, and an attack bar at 500, 200 and 100 m to go.
 * sprint.js decides everything; this scene draws it.
 *
 * The same picture serves the Ironman's run to the line: the rules are
 * identical, so only the bodies change — riders on bikes become runners on
 * their feet, and the wording follows them.
 */
import { createSprint, stepSprint, sprintStandings, playerDraft } from './sprint.js';
import { drawTimingBar } from '../shared/timing-bar.js';
import { createSideScene, SCENE } from '../shared/side-scene.js';
import { drawRider, drawRunner, PEDAL_FRAMES, WHEEL_FRAMES } from '../../engine/character.js';
import { cycleFrame, wheelTurns } from '../../engine/animation.js';
import { createParticles } from '../../engine/particles.js';
import { createRng } from '../../engine/rng.js';
import { drawText, measureText } from '../../engine/font.js';
import { damp } from '../../engine/math.js';
import { ordinal } from '../../engine/format.js';
import { PALETTE } from '../../assets/palette.js';
import { WHEEL } from '../../assets/sprites/bike.js';

/** @typedef {import('../../data/athletes.js').Athlete} Athlete */
/** @typedef {import('../sports.js').Outcome} Outcome */
/** @typedef {import('../../engine/input.js').ButtonState} ButtonState */

const FULL_INTRO = 2.6;
const SHORT_INTRO = 0.9;
const FINISH_HOLD = 2.8;
/** Screen pixels per metre of road. */
const PX_PER_METRE = 2.2;
const PLAYER_X = 104;
/** Crank revolutions per second at full cadence. */
const TOP_CADENCE = 2.4;
const BAR = { x: 118, y: 168, width: 104 };
const STAMINA = { x: 8, y: 168, width: 86, height: 7 };
/** Strides per second at full effort. */
const TOP_STRIDE = 3.2;
const RUN_FRAMES = 6;

/** What changes between a bunch sprint and a run to the line. */
const DISCIPLINES = {
  bike: { spacing: 9, prompt: 'TAP TO PEDAL', hint: 'TAP TO PEDAL, SIT IN A WHEEL TO SAVE YOUR LEGS' },
  run: { spacing: 15, prompt: 'TAP TO STRIDE', hint: 'TAP TO STRIDE, TUCK IN BEHIND TO SAVE YOUR LEGS' },
};

/**
 * @param {{ athlete: Athlete, rivals: Athlete[], seed: number, metres?: number,
 *   attackPoints?: readonly number[], intro?: boolean, title?: string,
 *   discipline?: 'bike' | 'run', onFinish: (outcome: Outcome) => void }} options
 *   The short options are for the Ironman's run to the line.
 * @returns {import('../../engine/director.js').Scene}
 */
export function createSprintScene({ athlete, rivals, seed, metres, attackPoints, intro = true, title = 'FINAL 2 KM', discipline = 'bike', onFinish }) {
  const style = DISCIPLINES[discipline];
  const onFoot = discipline === 'run';
  const state = createSprint({ athlete, rivals, seed, metres, attackPoints });
  const scene = createSideScene();
  const grit = createParticles(80);
  const rng = createRng(seed ^ 0x51ed);

  const riders = [state.player, ...state.rivals].map((rider, i) => ({
    rider,
    isPlayer: i === 0,
    lane: i === 0 ? 0 : i % 2,
    x: PLAYER_X + (i === 0 ? 0 : (i % 2 === 0 ? 1 : -1) * style.spacing),
    crank: i * 0.31,
  }));

  const INTRO = intro ? FULL_INTRO : SHORT_INTRO;
  /** @type {'intro' | 'racing' | 'finished'} */
  let phase = 'intro';
  let clock = 0;
  let coast = 0;
  let flash = 0;
  /** @type {{ text: string, color: string, age: number } | null} */
  let popup = null;
  /** @type {{ text: string, color: string, age: number } | null} */
  let banner = { text: title, color: PALETTE.yellow, age: 0 };
  let finalRows = /** @type {ReturnType<typeof sprintStandings>} */ ([]);

  const self = {
    name: 'sprint-intro',
    /**
     * @param {number} dt
     * @param {ButtonState} button
     */
    update(dt, button) {
      clock += dt;
      flash = Math.max(0, flash - dt);
      if (popup) popup.age += dt;
      if (banner) banner.age += dt;

      if (phase === 'intro') {
        if (clock >= INTRO) {
          phase = 'racing';
          self.name = 'sprint-racing';
          clock = 0;
        }
      } else if (phase === 'racing') {
        for (const event of stepSprint(state, dt, button.pressed)) {
          if (event.type === 'window') {
            banner = { text: `${event.at} M TO GO`, color: PALETTE.white, age: 0 };
          } else if (event.type === 'attack') {
            if (event.result === 'perfect') {
              popup = { text: 'PERFECT ATTACK!', color: PALETTE.yellow, age: 0 };
              flash = 0.12;
            } else if (event.result === 'good') {
              popup = { text: 'ATTACK!', color: PALETTE.white, age: 0 };
            } else {
              popup = { text: 'MISTIMED', color: PALETTE.red, age: 0 };
            }
          } else if (event.type === 'empty') {
            popup = { text: 'LEGS GONE!', color: PALETTE.red, age: 0 };
          } else if (event.type === 'finish') {
            phase = 'finished';
            self.name = 'sprint-finished';
            clock = 0;
            finalRows = sprintStandings(state);
            banner = { text: 'FINISH!', color: PALETTE.yellow, age: 0 };
          }
        }
      } else {
        coast += dt;
        if (clock >= FINISH_HOLD) {
          const place = finalRows.findIndex((row) => row.isPlayer) + 1;
          const count = (/** @type {string} */ result) => state.player.attacks.filter((a) => a === result).length;
          onFinish({
            time: finalRows[place - 1].time,
            place,
            standings: finalRows,
            summary: [
              `${count('perfect')} PERFECT   ${count('good')} GOOD`,
              `${count('miss')} MISTIMED   LEGS ${Math.round(state.player.stamina * 100)}%`,
            ],
          });
        }
      }

      moveRiders(dt);
      grit.update(dt);
    },
    /** @param {CanvasRenderingContext2D} ctx */
    render(ctx) {
      const camera = (state.player.metres + coast * 26) * PX_PER_METRE;
      scene.draw(ctx, camera);
      drawFinishLine(ctx, camera);
      grit.draw(ctx);

      const drafting = playerDraft(state);
      for (const entry of [...riders].sort((a, b) => b.lane - a.lane)) {
        const y = SCENE.laneY - entry.lane * 7;
        if (entry.isPlayer) drawPlayerRing(ctx, entry.x, y);
        const flashing = entry.isPlayer && flash > 0;
        if (onFoot) {
          drawRunner(ctx, entry.rider.athlete, 'run', 'run', cycleFrame(entry.crank, RUN_FRAMES), entry.x, y, { flash: flashing });
        } else {
          const pedal = cycleFrame(entry.crank, PEDAL_FRAMES);
          const wheel = cycleFrame(wheelTurns(entry.rider.metres * PX_PER_METRE, WHEEL.size) * WHEEL_FRAMES, WHEEL_FRAMES);
          drawRider(ctx, entry.rider.athlete, 'bike', 'pedal', pedal, wheel, entry.x, y, { flash: flashing });
        }
      }
      if (phase === 'racing' && state.player.boost > 1) drawSpeedLines(ctx, clock);
      drawHud(ctx, drafting);
      drawOverlay(ctx);
    },
  };

  /** @param {number} dt */
  function moveRiders(dt) {
    for (const entry of riders) {
      const gap = entry.rider.metres - state.player.metres;
      const target = PLAYER_X + gap * PX_PER_METRE;
      entry.x = damp(entry.x, Math.max(-50, Math.min(370, target)), 6, dt);
      if (phase === 'intro') continue;
      const cadence = entry.isPlayer ? state.player.cadence : 0.62;
      entry.crank += cadence * (onFoot ? TOP_STRIDE : TOP_CADENCE) * dt;
      if (entry.isPlayer && state.player.cadence > 0.8 && rng.next() < 0.25) kickGrit(entry);
    }
  }

  /** A little road spray off the back wheel when the player is going hard. */
  function kickGrit(/** @type {typeof riders[number]} */ entry) {
    grit.spawn({
      x: entry.x - (onFoot ? 6 : 12),
      y: SCENE.laneY - entry.lane * 7 - 1,
      vx: -70 - rng.next() * 40,
      vy: -8 - rng.next() * 10,
      gravity: 70,
      life: 0.28,
      color: PALETTE.lightGrey,
    });
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} camera
   */
  function drawFinishLine(ctx, camera) {
    const x = Math.round(state.metresTotal * PX_PER_METRE + PLAYER_X - camera);
    if (x < -60 || x > 380) return;
    const text = 'FINISH';
    const width = measureText(text) + 16;
    const left = Math.round(x - width / 2);
    const top = SCENE.roadTop - 44;
    for (let row = 0; SCENE.roadTop + 3 + row * 2 < 174; row++) {
      for (let column = 0; column < 3; column++) {
        ctx.fillStyle = (row + column) % 2 === 0 ? PALETTE.white : PALETTE.outline;
        ctx.fillRect(x - 3 + column * 2, SCENE.roadTop + 3 + row * 2, 2, 2);
      }
    }
    ctx.fillStyle = PALETTE.outline;
    ctx.fillRect(left - 1, top, 4, 45);
    ctx.fillRect(left + width - 3, top, 4, 45);
    ctx.fillRect(left - 2, top - 1, width + 4, 13);
    ctx.fillStyle = PALETTE.lightGrey;
    ctx.fillRect(left, top + 12, 2, 32);
    ctx.fillRect(left + width - 2, top + 12, 2, 32);
    ctx.fillStyle = PALETTE.red;
    ctx.fillRect(left - 1, top, width + 2, 11);
    drawText(ctx, text, left + width / 2, top + 2, { align: 'center', color: PALETTE.white, outline: '' });
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {boolean} drafting
   */
  function drawHud(ctx, drafting) {
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(0, 0, 320, 18);
    ctx.fillStyle = PALETTE.panelEdge;
    ctx.fillRect(0, 18, 320, 1);
    ctx.fillStyle = PALETTE.outline;
    ctx.fillRect(0, 19, 320, 1);

    const toGo = String(Math.ceil(state.toGo));
    drawText(ctx, toGo, 5, 3, { scale: 2, color: PALETTE.yellow });
    drawText(ctx, 'M TO GO', 5 + measureText(toGo) * 2 + 4, 9);

    const rows = phase === 'finished' ? finalRows : sprintStandings(state);
    const place = rows.findIndex((row) => row.isPlayer) + 1;
    const total = `/${rows.length}`;
    drawText(ctx, total, 315, 9, { align: 'right' });
    drawText(ctx, ordinal(place), 315 - measureText(total) - 3, 3, { scale: 2, align: 'right', color: PALETTE.yellow });

    // Legs: the stamina you have left.
    drawText(ctx, 'LEGS', STAMINA.x, STAMINA.y - 10);
    ctx.fillStyle = PALETTE.outline;
    ctx.fillRect(STAMINA.x - 1, STAMINA.y - 1, STAMINA.width + 2, STAMINA.height + 2);
    ctx.fillStyle = PALETTE.panelEdge;
    ctx.fillRect(STAMINA.x, STAMINA.y, STAMINA.width, STAMINA.height);
    const low = state.player.stamina < 0.25;
    ctx.fillStyle = state.player.emptied ? PALETTE.red : low ? PALETTE.orange : PALETTE.volt;
    if (!state.player.emptied || Math.floor(clock * 6) % 2 === 0) {
      ctx.fillRect(STAMINA.x, STAMINA.y, Math.round(STAMINA.width * state.player.stamina), STAMINA.height);
    }
    // Far right, so it never runs into the prompt in the middle.
    if (drafting) drawText(ctx, 'DRAFT', 315, STAMINA.y, { align: 'right', color: PALETTE.volt });

    if (state.window) {
      drawText(ctx, 'ATTACK!', BAR.x + BAR.width / 2, BAR.y - 11, { align: 'center', color: PALETTE.yellow });
      drawTimingBar(ctx, BAR.x, BAR.y, BAR.width, state.window, state.window.marker);
    } else if (phase === 'racing' && (clock < 6 || state.player.cadence < 0.2)) {
      drawText(ctx, style.prompt, BAR.x + BAR.width / 2, BAR.y, { align: 'center', color: PALETTE.lightGrey });
    }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  function drawOverlay(ctx) {
    if (phase === 'intro' && intro) {
      drawText(ctx, style.hint, 160, 58, { align: 'center' });
      drawText(ctx, 'ATTACK WHEN THE BAR APPEARS', 160, 70, { align: 'center', color: PALETTE.skyHaze });
    }
    if (banner && banner.age < 1.6) {
      drawText(ctx, banner.text, 160, 30, { align: 'center', scale: 3, color: banner.color });
    }
    if (popup && popup.age < 0.8) {
      const y = SCENE.laneY - 56 - Math.round(popup.age * 14);
      drawText(ctx, popup.text, riders[0].x, y, { align: 'center', color: popup.color });
    }
  }

  return self;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} groundY
 */
function drawPlayerRing(ctx, x, groundY) {
  const cx = Math.round(x);
  ctx.fillStyle = PALETTE.yellow;
  ctx.fillRect(cx - 6, groundY - 1, 13, 1);
  ctx.fillRect(cx - 8, groundY, 2, 1);
  ctx.fillRect(cx + 7, groundY, 2, 1);
  ctx.fillRect(cx - 6, groundY + 1, 13, 1);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} time
 */
function drawSpeedLines(ctx, time) {
  ctx.fillStyle = PALETTE.white;
  ctx.globalAlpha = 0.5;
  const t = Math.floor(time * 20);
  for (let i = 0; i < 3; i++) {
    const length = 7 + ((t + i * 3) % 8);
    ctx.fillRect(PLAYER_X - 20 - length - i * 5, SCENE.laneY - 24 + i * 7, length, 1);
  }
  ctx.globalAlpha = 1;
}
