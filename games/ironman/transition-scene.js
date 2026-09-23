/**
 * T2 on screen: the athlete runs into the transition zone and three prompts
 * come up in order. Each one is a quick sweep of the timing bar; fumbling
 * costs seconds that go straight onto the race time.
 */
import { createTransition, stepTransition, PROMPTS, T2_BASE_SECONDS } from './transition.js';
import { drawTimingBar } from '../shared/timing-bar.js';
import { createSideScene, SCENE } from '../shared/side-scene.js';
import { drawRunner, drawBike } from '../../engine/character.js';
import { cycleFrame } from '../../engine/animation.js';
import { drawText } from '../../engine/font.js';
import { PALETTE } from '../../assets/palette.js';
import { createRng } from '../../engine/rng.js';

/** @typedef {import('../../data/athletes.js').Athlete} Athlete */
/** @typedef {import('../../engine/input.js').ButtonState} ButtonState */
/** @typedef {import('../sports.js').StageResults} StageResults */

/** The bar sits clear to the right of the athlete, in the bottom band. */
const BAR = { x: 118, y: 150, width: 104 };
/** The athlete runs along the same road band as every other scene. */
const GROUND_Y = SCENE.laneY;
const RUNNER_X = 44;
const DONE_HOLD = 1.2;

/**
 * @param {{ athlete: Athlete, rivals: Athlete[], seed: number,
 *   onFinish: (results: StageResults) => void }} options
 * @returns {import('../../engine/director.js').Scene}
 */
export function createTransitionScene({ athlete, rivals, seed, onFinish }) {
  const state = createTransition({ seed });
  const scene = createSideScene();
  const rng = createRng(seed ^ 0x7a2);
  // Rivals fumble T2 according to how tidy they are.
  const rivalPenalties = rivals.map((rival) => ({
    athlete: rival,
    penalty: Math.max(0, (10 - rival.stats.technique) * 0.22 + rng.next() * 0.9 - 0.2),
  }));
  let clock = 0;
  let flash = 0;
  /** @type {{ text: string, color: string, age: number } | null} */
  let popup = null;

  const self = {
    name: 'transition',
    /**
     * @param {number} dt
     * @param {ButtonState} button
     */
    update(dt, button) {
      clock += dt;
      flash = Math.max(0, flash - dt);
      if (popup) popup.age += dt;

      if (!state.done) {
        for (const event of stepTransition(state, dt, button.pressed)) {
          if (event.type === 'judged') {
            const text = { perfect: 'SHARP!', good: 'OK', miss: 'FUMBLE!' }[event.result];
            const color = { perfect: PALETTE.yellow, good: PALETTE.white, miss: PALETTE.red }[event.result];
            popup = { text, color, age: 0 };
            if (event.result === 'perfect') flash = 0.12;
          }
        }
      } else if (clock >= state.time + DONE_HOLD) {
        onFinish([
          { athlete, time: T2_BASE_SECONDS + state.penalty, isPlayer: true },
          ...rivalPenalties.map((rival) => ({
            athlete: rival.athlete,
            time: T2_BASE_SECONDS + rival.penalty,
            isPlayer: false,
          })),
        ]);
      }
    },
    /** @param {CanvasRenderingContext2D} ctx */
    render(ctx) {
      // The transition zone sits beside the course, so it shares the road.
      scene.draw(ctx, 0);
      drawRack(ctx);

      const running = !state.done;
      drawRunner(ctx, athlete, 'run', running ? 'run' : 'idle', cycleFrame(clock * (running ? 1.8 : 0.7), running ? 6 : 2), RUNNER_X, GROUND_Y, {
        flash: flash > 0,
      });

      // The same top band every other scene uses, with the prompt called
      // out in the empty sky where nothing can be hidden behind it.
      ctx.fillStyle = PALETTE.panel;
      ctx.fillRect(0, 0, 320, 18);
      ctx.fillStyle = PALETTE.panelEdge;
      ctx.fillRect(0, 18, 320, 1);
      ctx.fillStyle = PALETTE.outline;
      ctx.fillRect(0, 19, 320, 1);
      drawText(ctx, 'T2', 5, 6, { color: PALETTE.yellow });
      drawText(ctx, 'BIKE TO RUN', 20, 6, { color: PALETTE.lightGrey });
      const lost = state.penalty > 0 ? `+${state.penalty.toFixed(1)}S` : 'CLEAN';
      drawText(ctx, lost, 315, 6, { align: 'right', color: state.penalty > 0 ? PALETTE.red : PALETTE.volt });
      drawText(ctx, state.done ? 'GO GO GO!' : PROMPTS[state.index], 160, 40, {
        align: 'center',
        scale: 2,
        color: PALETTE.yellow,
      });

      if (!state.done) {
        drawTimingBar(ctx, BAR.x, BAR.y, BAR.width, state, state.marker);
        drawText(ctx, `${state.index + 1}/3`, BAR.x - 22, BAR.y, { color: PALETTE.lightGrey });
      }
      if (popup && popup.age < 0.6) {
        drawText(ctx, popup.text, RUNNER_X, GROUND_Y - 44 - Math.round(popup.age * 12), {
          align: 'center',
          color: popup.color,
        });
      }
    },
  };

  /**
   * The rack the bikes come back to: a rail on posts with the athlete's own
   * machine and a few rivals' racked beside it.
   * @param {CanvasRenderingContext2D} ctx
   */
  function drawRack(ctx) {
    const rail = GROUND_Y - 36;
    ctx.fillStyle = PALETTE.outline;
    ctx.fillRect(150, rail, 162, 2);
    for (const x of [152, 230, 308]) {
      ctx.fillStyle = PALETTE.grey;
      ctx.fillRect(x, rail, 2, GROUND_Y - rail);
    }
    // Hung by the saddle, wheels off the ground, the way a rack holds them.
    const racked = [athlete, ...rivals].slice(0, 3);
    racked.forEach((entry, i) => {
      drawBike(ctx, entry, 0, 180 + i * 52, rail + 16);
    });
  }

  return self;
}
