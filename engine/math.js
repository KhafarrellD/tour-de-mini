/** Small numeric helpers shared by every game. */

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} t 0 returns a, 1 returns b
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Eases `current` toward `target`. Unlike a plain lerp with a fixed factor,
 * the result is identical whether it runs once over `dt` or many times over
 * smaller steps, so motion looks the same at any update rate.
 * @param {number} current
 * @param {number} target
 * @param {number} rate higher is snappier (roughly 1/seconds)
 * @param {number} dt seconds
 */
export function damp(current, target, rate, dt) {
  return lerp(current, target, 1 - Math.exp(-rate * dt));
}

/**
 * Moves toward `target` by at most `maxDelta`, never overshooting.
 * @param {number} current
 * @param {number} target
 * @param {number} maxDelta
 */
export function approach(current, target, maxDelta) {
  if (current < target) return Math.min(current + maxDelta, target);
  return Math.max(current - maxDelta, target);
}

/**
 * Wraps a value into [0, size), also for negative values.
 * @param {number} value
 * @param {number} size
 */
export function wrap(value, size) {
  return ((value % size) + size) % size;
}
