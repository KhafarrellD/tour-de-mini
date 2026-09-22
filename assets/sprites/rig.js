/**
 * Shared shape of every body and bike sprite sheet.
 *
 * @typedef {object} RigFrame
 * @property {readonly string[]} rows one character per pixel, "." transparent
 * @property {readonly [number, number]} [head] top-left of the side-view head,
 *   for rigs that stack head layers (runner, rider)
 *
 * @typedef {object} Rig
 * @property {number} width
 * @property {number} height
 * @property {{ tall: readonly number[], compact: readonly number[] }} build
 *   rows repeated for tall athletes or removed for compact ones, counted from
 *   the head anchor when frames have one, otherwise from the top
 * @property {Record<string, readonly RigFrame[]>} animations
 */

export {};
