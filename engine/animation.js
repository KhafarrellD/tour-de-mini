/**
 * Animation timing. Cycles are driven by what the athlete is doing rather
 * than by the clock: legs follow cadence or pace, wheels follow distance
 * travelled. Faster riding therefore looks faster, and a stopped bike stops.
 */
import { wrap } from './math.js';

/**
 * Which frame of a looping animation to show.
 * @param {number} cycles how many full cycles have elapsed (any real number)
 * @param {number} frameCount frames in one cycle
 */
export function cycleFrame(cycles, frameCount) {
  return Math.floor(wrap(cycles, 1) * frameCount) % frameCount;
}

/**
 * Wheel revolutions for a distance rolled, so the tire never slides against
 * the road.
 * @param {number} distance pixels travelled
 * @param {number} diameter wheel diameter in pixels
 */
export function wheelTurns(distance, diameter) {
  return distance / (Math.PI * diameter);
}
