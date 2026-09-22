/**
 * The Marathon, on screen. race.js decides everything; this scene turns the
 * race into pictures: runners spaced by their time gaps, a HUD in the top
 * band, the pace bar in the bottom band, and small touches (dust, a flash on
 * a perfect, banners at the wall and the final push).
 */
import { createRace, stepRace, phaseAt, standings, finalStandings, elapsedAt, splitFor, paceAt, RACE_KM } from './race.js';
import { drawTimingBar } from '../shared/timing-bar.js';
import { createSideScene, SCENE } from '../shared/side-scene.js';
import { drawRunner } from '../../engine/character.js';
import { cycleFrame } from '../../engine/animation.js';
import { createParticles } from '../../engine/particles.js';
import { drawText, measureText } from '../../engine/font.js';
import { damp } from '../../engine/math.js';
import { formatClock, ordinal } from '../../engine/format.js';
import { PALETTE } from '../../assets/palette.js';

/** @typedef {import('../../data/athletes.js').Athlete} Athlete */
/** @typedef {import('../../engine/input.js').ButtonState} ButtonState */

/** @typedef {import('../sports.js').Outcome} Outcome */

const COUNTDOWN = 3;
const FINISH_HOLD = 2.8;
/** Camera speed: one kilometre of road every real second. */
const PX_PER_KM = 64;
/** Screen pixels per second of time gap between runners. */
const GAP_PX = 2.2;
const PLAYER_X = 112;
/** Road covered per full run cycle (two strides). */
const STRIDE_PX = 22;
const BAR = { x: 100, y: 168, width: 120 };
const JUDGEMENTS = {
  perfect: { text: 'PERFECT!', color: PALETTE.yellow },
  good: { text: 'GOOD', color: PALETTE.white },
  miss: { text: 'MISS', color: PALETTE.red },
};
const BANNERS = {
  wall: { text: 'THE WALL', color: PALETTE.red },
  steady: { text: 'THROUGH IT!', color: PALETTE.volt },
  final: { text: 'FINAL PUSH', color: PALETTE.yellow },
};
/** Short phase labels beside the pace bar. */
const PHASE_LABELS = {
  wall: { text: 'WALL', color: PALETTE.red },
  final: { text: 'PUSH', color: PALETTE.yellow },
};

/**
 * @param {{ athlete: Athlete, rivals: Athlete[], seed: number, onFinish: (outcome: Outcome) => void }} options
 * @returns {import('../../engine/director.js').Scene}
 */
export function createMarathonScene({ athlete, rivals, seed, onFinish }) {
  const race = createRace({ player: athlete, rivals, seed });
  const scene = createSideScene();
  const dust = createParticles(120);

  // Each runner keeps a small fixed offset so the pack never stacks into
  // one sprite, and eases toward the position its time gap implies.
  const runners = [race.player, ...race.rivals].map((runner, i) => ({
    runner,
    isPlayer: i === 0,
    lane: i === 0 ? 0 : i % 2,
    spread: i === 0 ? 0 : (i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2) * 10,
    x: PLAYER_X,
    stride: i * 0.17,
    frame: 0,
  }));
  for (const r of runners) r.x = PLAYER_X + r.spread;

  /** @type {'countdown' | 'racing' | 'finished'} */
  let state = 'countdown';
  let clock = 0;
  let extraKm = 0;
  let flash = 0;
  let streak = 0;
  /** @type {{ text: string, color: string, age: number } | null} */
  let popup = null;
  /** @type {{ text: string, color: string, age: number } | null} */
  let banner = null;
  let finalRows = /** @type {ReturnType<typeof finalStandings>} */ ([]);

  const self = {
    name: 'marathon-countdown',
    /**
     * @param {number} dt
     * @param {ButtonState} button
     */
    update(dt, button) {
      clock += dt;
      flash = Math.max(0, flash - dt);
      if (popup) popup.age += dt;
      if (banner) banner.age += dt;

      if (state === 'countdown') {
        if (clock >= COUNTDOWN) {
          state = 'racing';
          self.name = 'marathon-racing';
          clock = 0;
        }
      } else if (state === 'racing') {
        for (const event of stepRace(race, dt, button.pressed)) {
          if (event.type === 'judged') {
            popup = { ...JUDGEMENTS[event.result], text: event.late ? 'TOO LATE' : JUDGEMENTS[event.result].text, age: 0 };
            streak = event.result === 'perfect' ? streak + 1 : 0;
            if (event.result === 'perfect') flash = 0.1;
          } else if (event.type === 'phase') {
            banner = { ...BANNERS[event.name], age: 0 };
          } else if (event.type === 'finish') {
            state = 'finished';
            self.name = 'marathon-finished';
            clock = 0;
            finalRows = finalStandings(race);
            banner = { text: 'FINISH!', color: PALETTE.yellow, age: 0 };
          }
        }
      } else {
        extraKm += dt;
        if (clock >= FINISH_HOLD) {
          const place = finalRows.findIndex((row) => row.isPlayer) + 1;
          const count = (/** @type {string} */ result) => race.results.filter((r) => r === result).length;
          onFinish({
            time: finalRows[place - 1].time,
            place,
            standings: finalRows,
            summary: [`PERFECT ${count('perfect')}`, `GOOD ${count('good')}   MISS ${count('miss')}`],
          });
        }
      }

      moveRunners(dt);
      dust.update(dt);
    },
    /** @param {CanvasRenderingContext2D} ctx */
    render(ctx) {
      const camera = (race.km + extraKm) * PX_PER_KM;
      scene.draw(ctx, camera);
      drawCourse(ctx, camera);
      dust.draw(ctx);
      const ordered = [...runners].sort((a, b) => b.lane - a.lane);
      for (const r of ordered) {
        const moving = state !== 'countdown';
        const y = SCENE.laneY - r.lane * 7;
        const animation = moving ? 'run' : 'idle';
        const frame = moving ? r.frame : cycleFrame(clock * 0.8, 2);
        if (r.isPlayer) drawPlayerRing(ctx, r.x, y);
        drawRunner(ctx, r.runner.athlete, 'run', animation, frame, r.x, y, { flash: r.isPlayer && flash > 0 });
      }
      if (state === 'racing' && streak >= 3 && phaseAt(race.km).name === 'final') drawSpeedLines(ctx, clock);
      drawHud(ctx);
      drawOverlayText(ctx);
    },
  };

  /** @param {number} dt */
  function moveRunners(dt) {
    const km = race.km;
    const playerTime = elapsedAt(race.player, km);
    for (const r of runners) {
      const gap = r.isPlayer ? 0 : playerTime - elapsedAt(r.runner, km);
      const target = r.isPlayer
        ? PLAYER_X + Math.min(streak, 4) * 2
        : Math.max(-40, Math.min(360, PLAYER_X + r.spread + gap * GAP_PX));
      r.x = damp(r.x, target, 3, dt);
      if (state === 'countdown') continue;
      // Legs follow each runner's own pace: a faster split, a faster cadence.
      const speed = PX_PER_KM * (splitFor('good', 'steady') / paceAt(r.runner, km));
      const before = r.frame;
      r.stride += (speed / STRIDE_PX) * dt;
      r.frame = cycleFrame(r.stride, 6);
      if (r.frame !== before && (r.frame === 0 || r.frame === 3) && r.x > -10 && r.x < 330) kickDust(r);
    }
  }

  /** Two specks of dust thrown back as a foot lands. */
  function kickDust(/** @type {typeof runners[number]} */ r) {
    const y = SCENE.laneY - r.lane * 7;
    for (let i = 0; i < 2; i++) {
      dust.spawn({
        x: r.x - 3 + i * 2,
        y: y - 1,
        vx: -PX_PER_KM - 10 - i * 12,
        vy: -6 - i * 5,
        gravity: 50,
        life: 0.3,
        color: PALETTE.lightGrey,
      });
    }
  }

  /**
   * Start and finish lines, and a km sign every 5 km, placed in world space.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} camera
   */
  function drawCourse(ctx, camera) {
    const worldToScreen = (/** @type {number} */ km) => Math.round(km * PX_PER_KM + PLAYER_X - camera);
    for (let km = 5; km < RACE_KM; km += 5) {
      const x = worldToScreen(km);
      if (x > -30 && x < 350) drawKmSign(ctx, x, km);
    }
    drawGantry(ctx, worldToScreen(0) + 36, 'START');
    drawGantry(ctx, worldToScreen(RACE_KM), 'FINISH');
  }

  /** @param {CanvasRenderingContext2D} ctx */
  function drawHud(ctx) {
    // A panel-colored band, distinct from the letterbox around the game.
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(0, 0, 320, 18);
    ctx.fillStyle = PALETTE.panelEdge;
    ctx.fillRect(0, 18, 320, 1);
    ctx.fillStyle = PALETTE.outline;
    ctx.fillRect(0, 19, 320, 1);

    const km = race.km.toFixed(1);
    drawText(ctx, km, 5, 3, { scale: 2, color: PALETTE.yellow });
    drawText(ctx, 'KM', 5 + measureText(km) * 2 + 4, 9);

    const time = state === 'finished' ? finalRows.find((row) => row.isPlayer)?.time ?? 0 : elapsedAt(race.player, race.km);
    drawText(ctx, formatClock(state === 'countdown' ? 0 : time), 160, 6, { align: 'center' });

    const rows = state === 'finished' ? finalRows : standings(race);
    const place = rows.findIndex((row) => row.isPlayer) + 1;
    const total = `/${rows.length}`;
    drawText(ctx, total, 315, 9, { align: 'right' });
    drawText(ctx, ordinal(place), 315 - measureText(total) - 3, 3, { scale: 2, align: 'right', color: PALETTE.yellow });

    const phase = phaseAt(race.km);
    drawText(ctx, 'PACE', BAR.x - 30, BAR.y);
    drawTimingBar(ctx, BAR.x, BAR.y, BAR.width, phase, state === 'countdown' ? 0 : race.marker);
    if (state === 'countdown') {
      drawText(ctx, 'READY', BAR.x + BAR.width + 8, BAR.y, { color: PALETTE.lightGrey });
    } else if (phase.name !== 'steady') {
      const { text, color } = PHASE_LABELS[phase.name];
      drawText(ctx, text, BAR.x + BAR.width + 8, BAR.y, { color });
    }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  function drawOverlayText(ctx) {
    if (state === 'countdown') {
      const left = Math.ceil(COUNTDOWN - clock);
      drawText(ctx, String(left), 160, 26, { align: 'center', scale: 4, color: PALETTE.yellow });
      drawText(ctx, 'TAP WHEN THE MARKER HITS THE MIDDLE', 160, 60, { align: 'center' });
      drawText(ctx, 'ONE TAP EVERY KM', 160, 70, { align: 'center', color: PALETTE.skyHaze });
    } else if (state === 'racing' && clock < 0.7) {
      drawText(ctx, 'GO!', 160, 26, { align: 'center', scale: 4, color: PALETTE.volt });
    }
    if (banner && banner.age < 1.8 && (banner.age > 0.4 || Math.floor(banner.age * 10) % 2 === 0)) {
      drawText(ctx, banner.text, 160, 34, { align: 'center', scale: 3, color: banner.color });
    }
    if (popup && popup.age < 0.7) {
      const y = SCENE.laneY - 58 - Math.round(popup.age * 16);
      const player = runners[0];
      drawText(ctx, popup.text, player.x, y, { align: 'center', color: popup.color });
    }
  }

  return self;
}

/**
 * A yellow ring on the road under the player's feet, so you can always find
 * yourself in the pack.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} groundY
 */
function drawPlayerRing(ctx, x, groundY) {
  const cx = Math.round(x);
  ctx.fillStyle = PALETTE.yellow;
  ctx.fillRect(cx - 4, groundY - 1, 9, 1);
  ctx.fillRect(cx - 6, groundY, 2, 1);
  ctx.fillRect(cx + 5, groundY, 2, 1);
  ctx.fillRect(cx - 4, groundY + 1, 9, 1);
}

/**
 * A roadside marker board: "25 KM".
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} km
 */
function drawKmSign(ctx, x, km) {
  const label = `${km} KM`;
  const width = measureText(label) + 6;
  const top = SCENE.roadTop - 26;
  ctx.fillStyle = PALETTE.outline;
  ctx.fillRect(x - 1, top + 10, 3, 17);
  ctx.fillRect(x - Math.ceil(width / 2) - 1, top - 1, width + 2, 12);
  ctx.fillStyle = PALETTE.grey;
  ctx.fillRect(x, top + 10, 1, 16);
  ctx.fillStyle = PALETTE.white;
  ctx.fillRect(x - Math.ceil(width / 2), top, width, 10);
  drawText(ctx, label, x, top + 2, { align: 'center', color: PALETTE.navy, outline: '' });
}

/**
 * A banner gantry standing on the far edge of the road, centered over a
 * checkered line painted across the road.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} lineX where the line crosses the road
 * @param {string} text
 */
function drawGantry(ctx, lineX, text) {
  if (lineX < -60 || lineX > 380) return;
  const width = measureText(text) + 16;
  const x = Math.round(lineX - width / 2);
  const top = SCENE.roadTop - 44;
  // The line across the road: a black and white checker, 3 squares wide.
  const lineLeft = Math.round(lineX) - 3;
  for (let row = 0; SCENE.roadTop + 3 + row * 2 < 174; row++) {
    for (let column = 0; column < 3; column++) {
      ctx.fillStyle = (row + column) % 2 === 0 ? PALETTE.white : PALETTE.outline;
      ctx.fillRect(lineLeft + column * 2, SCENE.roadTop + 3 + row * 2, 2, 2);
    }
  }
  ctx.fillStyle = PALETTE.outline;
  ctx.fillRect(x - 1, top, 4, 45);
  ctx.fillRect(x + width - 3, top, 4, 45);
  ctx.fillRect(x - 2, top - 1, width + 4, 13);
  ctx.fillStyle = PALETTE.lightGrey;
  ctx.fillRect(x, top + 12, 2, 32);
  ctx.fillRect(x + width - 2, top + 12, 2, 32);
  ctx.fillStyle = PALETTE.red;
  ctx.fillRect(x - 1, top, width + 2, 11);
  drawText(ctx, text, x + width / 2, top + 2, { align: 'center', color: PALETTE.white, outline: '' });
}

/**
 * Faint streaks behind the player on a perfect streak in the final push.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} time seconds, to flicker the streaks
 */
function drawSpeedLines(ctx, time) {
  ctx.fillStyle = PALETTE.white;
  ctx.globalAlpha = 0.5;
  const t = Math.floor(time * 20);
  for (let i = 0; i < 3; i++) {
    const length = 6 + ((t + i * 3) % 7);
    ctx.fillRect(PLAYER_X - 14 - length - i * 5, SCENE.laneY - 22 + i * 7, length, 1);
  }
  ctx.globalAlpha = 1;
}
