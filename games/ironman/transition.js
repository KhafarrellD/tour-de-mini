/**
 * T2, the transition from bike to run: three prompts in order, each a quick
 * sweep of the timing bar. Hit them and you lose nothing; fumble and the
 * seconds go on your race time.
 */
import { advanceMarker, markerPosition, judge } from '../shared/timing-bar.js';
import { createRng } from '../../engine/rng.js';

/** @typedef {import('../shared/timing-bar.js').Result} Result */

/** Every transition takes this long before any fumbles. */
export const T2_BASE_SECONDS = 3;

export const PROMPTS = /** @type {const} */ (['RACK THE BIKE', 'SHOES ON', 'GO']);
/** How long a prompt stays up before it counts as fumbled. */
export const PROMPT_SECONDS = 1.8;
const BAR = { sweep: 0.7, zone: 0.38, perfect: 0.13, center: 0.5 };
/** Seconds added to the race time for each result. */
const PENALTY = { perfect: 0, good: 0.4, miss: 1.3 };

/**
 * @param {{ seed: number }} options
 */
export function createTransition({ seed }) {
  const rng = createRng(seed);
  return {
    time: 0,
    index: 0,
    /** Phase of the bar for the prompt on screen. */
    marker: rng.next() * 0.4,
    sweep: BAR.sweep,
    zone: BAR.zone,
    perfect: BAR.perfect,
    center: BAR.center,
    promptStarted: 0,
    penalty: 0,
    /** @type {Result[]} */
    results: [],
    done: false,
    /** True on the step a prompt is judged, for the scene's flash. */
    lastResult: /** @type {Result | null} */ (null),
  };
}

/** @typedef {ReturnType<typeof createTransition>} Transition */

/**
 * @typedef {{ type: 'prompt', prompt: string }
 *   | { type: 'judged', prompt: string, result: Result }
 *   | { type: 'done' }} TransitionEvent
 */

/**
 * @param {Transition} state
 * @param {number} dt
 * @param {boolean} pressed
 * @returns {TransitionEvent[]}
 */
export function stepTransition(state, dt, pressed) {
  /** @type {TransitionEvent[]} */
  const events = [];
  if (state.done) return events;
  if (state.time === 0) events.push({ type: 'prompt', prompt: PROMPTS[0] });
  state.time += dt;
  state.marker = advanceMarker(state.marker, dt, state.sweep);

  /** @param {Result} result */
  const settle = (result) => {
    state.results.push(result);
    state.penalty += PENALTY[result];
    state.lastResult = result;
    events.push({ type: 'judged', prompt: PROMPTS[state.index], result });
    state.index++;
    state.promptStarted = state.time;
    if (state.index >= PROMPTS.length) {
      state.done = true;
      events.push({ type: 'done' });
    } else {
      events.push({ type: 'prompt', prompt: PROMPTS[state.index] });
    }
  };

  if (pressed) {
    settle(judge(markerPosition(state.marker), state));
  } else if (state.time - state.promptStarted >= PROMPT_SECONDS) {
    settle('miss');
  }
  return events;
}
