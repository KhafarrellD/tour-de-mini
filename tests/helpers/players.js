/**
 * The simulated humans the balance tests race against each other.
 *
 * Each one plays a game through its real rules with the single button, the
 * way a person would: reading what is ahead, timing a bar by eye with some
 * error in the hand, or just mashing. They live here because the Ironman
 * has to be judged by the same players as the games it is built from.
 */
import { cornerAhead, BRAKING } from '../../games/cycling/descent.js';
import { DEPTH_MAX } from '../../games/ironman/swim.js';
import { markerPosition } from '../../games/shared/timing-bar.js';
import { createRng } from '../../engine/rng.js';

export const STEP = 1 / 60;

/**
 * Swims for the middle of the gap ahead, looking a moment into the future
 * the way a person reads their own rise and fall.
 * @param {any} state
 */
export const gapFollower = (state) => {
  const next = state.obstacles.find((/** @type {{ at: number }} */ o) => o.at > state.metres);
  const target = next ? (next.gapTop + next.gapBottom) / 2 : DEPTH_MAX / 2;
  return state.depth + state.rise * 0.22 > target;
};

/**
 * Brakes so as to arrive at every corner on its safe speed.
 * @param {any} state
 */
export const cleanRider = (state) => {
  const corner = cornerAhead(state);
  if (!corner) return false;
  const distance = Math.max(0.1, corner.at - state.metres);
  // Braking distance for the speed we need to lose, plus a margin.
  const excess = state.speed - corner.safeSpeed;
  if (excess <= 0) return false;
  return distance <= (state.speed ** 2 - corner.safeSpeed ** 2) / (2 * BRAKING) + 6;
};

/**
 * Presses as the timing marker crosses the middle of the bar.
 * @param {{ marker: number, sweep: number }} state
 */
export const onTheMark = (state) => {
  const now = markerPosition(state.marker);
  const next = markerPosition(state.marker + STEP / state.sweep);
  return now < 0.5 && next >= 0.5;
};

/**
 * Aims at the middle of an attack bar with human timing error: a normal
 * spread around the moment they meant to press.
 * @param {ReturnType<typeof createRng>} rng
 * @param {number} sigma seconds of error, one standard deviation
 */
export function attacker(rng, sigma) {
  let plannedFor = -1;
  let pressAt = Infinity;
  return (/** @type {any} */ state) => {
    if (!state.window) return false;
    if (state.window.at !== plannedFor) {
      plannedFor = state.window.at;
      const gaussian = Math.sqrt(-2 * Math.log(1 - rng.next())) * Math.cos(2 * Math.PI * rng.next());
      const next = Math.floor(state.window.marker - 0.5) + 1.5;
      pressAt = state.time + (next - state.window.marker) * state.window.sweep + gaussian * sigma;
    }
    return state.time <= pressAt && state.time + STEP > pressAt;
  };
}

/**
 * The intended way to race: hold a rival's wheel to save the tank, then
 * empty it over the closing stretch, attacking on cue.
 * @param {number} [seed]
 * @param {number} [kick] metres to go where the effort goes in
 */
export function draftingRider(seed = 5, kick = 300) {
  const attack = attacker(createRng(seed), 0.05);
  return (/** @type {any} */ state, /** @type {number} */ step) => {
    if (state.window) return attack(state);
    if (state.toGo < kick) return step % 3 === 0;
    const gaps = state.rivals
      .map((/** @type {{ metres: number }} */ rival) => rival.metres - state.player.metres)
      .filter((/** @type {number} */ gap) => gap > 0);
    const gap = gaps.length ? Math.min(...gaps) : Infinity;
    // Work to catch a wheel, ease once on it, and never run into it.
    return step % (gap > 14 ? 8 : gap < 4 ? 16 : 12) === 0;
  };
}

/** Taps at a steady rhythm and attacks on cue, but ignores the wind. */
export function steadyRider(seed = 5, everyN = 15) {
  const attack = attacker(createRng(seed), 0.05);
  return (/** @type {any} */ state, /** @type {number} */ step) =>
    state.window ? attack(state) : step % everyN === 0;
}

/** Presses as fast as the button allows, all race long. */
export const masher = (/** @type {any} */ _state, /** @type {number} */ step) => step % 2 === 0;
