/**
 * Fixed-timestep game loop: the simulation always advances in 1/60 s steps,
 * while rendering follows the display's refresh rate. A 144 Hz monitor and a
 * 30 Hz phone therefore run the game at exactly the same speed.
 */

export const STEP = 1 / 60;

/** Longest stretch of time the loop will catch up on after a stall. */
const MAX_STEPS = 5;

/** Absorbs floating-point drift so 1/60 s frames never yield 0 or 2 steps. */
const EPSILON = 1e-9;

/**
 * Adds one frame's elapsed time to the accumulator and reports how many
 * fixed updates to run. Pure, so it can be tested without a browser.
 * @param {number} accumulator unsimulated seconds carried from last frame
 * @param {number} frameSeconds wall-clock time since the previous frame
 * @returns {{ steps: number, accumulator: number }}
 */
export function stepAccumulator(accumulator, frameSeconds) {
  if (frameSeconds <= 0) return { steps: 0, accumulator };
  let pending = accumulator + Math.min(frameSeconds, MAX_STEPS * STEP);
  let steps = 0;
  while (pending >= STEP - EPSILON && steps < MAX_STEPS) {
    pending -= STEP;
    steps++;
  }
  return { steps, accumulator: Math.max(0, Math.min(pending, STEP - EPSILON)) };
}

/**
 * @typedef {object} LoopHandlers
 * @property {(dt: number) => void} update advances the simulation one step
 * @property {() => void} render draws the current state
 */

/**
 * Starts the loop and returns a function that stops it.
 * @param {LoopHandlers} handlers
 * @returns {() => void}
 */
export function startLoop({ update, render }) {
  let accumulator = 0;
  let last = performance.now();
  let frame = 0;

  /** @param {number} now */
  function tick(now) {
    const result = stepAccumulator(accumulator, (now - last) / 1000);
    last = now;
    accumulator = result.accumulator;
    for (let i = 0; i < result.steps; i++) update(STEP);
    render();
    frame = requestAnimationFrame(tick);
  }

  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}
