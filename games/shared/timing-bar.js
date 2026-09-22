/**
 * The timing bar shared by every sport: a marker sweeps back and forth and
 * the player presses while it is inside the green zone, or better, on the
 * gold center. The marker's motion is a *phase* that only ever grows, so
 * changing the sweep speed mid-race never makes the marker jump.
 */
import { wrap } from '../../engine/math.js';
import { PALETTE } from '../../assets/palette.js';

/** @typedef {'perfect' | 'good' | 'miss'} Result */

/**
 * @typedef {object} Zone
 * @property {number} zone width of the good zone, as a fraction of the bar
 * @property {number} perfect width of the perfect center, as a fraction
 * @property {number} [center] zone center, 0 = left end, 1 = right end
 */

/**
 * Marker position for a phase: 0 -> 1 on even sweeps, 1 -> 0 on odd ones.
 * @param {number} phase sweeps elapsed
 */
export function markerPosition(phase) {
  const p = wrap(phase, 2);
  return p <= 1 ? p : 2 - p;
}

/**
 * @param {number} phase
 * @param {number} dt seconds
 * @param {number} sweep seconds for one crossing of the bar
 */
export function advanceMarker(phase, dt, sweep) {
  return phase + dt / sweep;
}

/**
 * @param {number} position marker position, 0..1
 * @param {Zone} zone
 * @returns {Result}
 */
export function judge(position, { zone, perfect, center = 0.5 }) {
  const distance = Math.abs(position - center);
  if (distance <= perfect / 2) return 'perfect';
  if (distance <= zone / 2) return 'good';
  return 'miss';
}

/**
 * Draws the bar: track, green zone, gold center and the marker.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x left edge
 * @param {number} y top edge
 * @param {number} width
 * @param {Zone} zone
 * @param {number} phase
 */
export function drawTimingBar(ctx, x, y, width, zone, phase) {
  const height = 7;
  const center = zone.center ?? 0.5;
  const span = (/** @type {number} */ fraction) => Math.max(1, Math.round(fraction * width));
  ctx.fillStyle = PALETTE.outline;
  ctx.fillRect(x - 1, y - 1, width + 2, height + 2);
  ctx.fillStyle = PALETTE.grey;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = PALETTE.green;
  const zoneWidth = span(zone.zone);
  ctx.fillRect(Math.round(x + center * width - zoneWidth / 2), y, zoneWidth, height);
  ctx.fillStyle = PALETTE.yellow;
  const perfectWidth = span(zone.perfect);
  ctx.fillRect(Math.round(x + center * width - perfectWidth / 2), y, perfectWidth, height);

  const markerX = Math.round(x + markerPosition(phase) * (width - 1));
  ctx.fillStyle = PALETTE.outline;
  ctx.fillRect(markerX - 2, y - 3, 5, height + 6);
  ctx.fillStyle = PALETTE.white;
  ctx.fillRect(markerX - 1, y - 2, 3, height + 4);
}
