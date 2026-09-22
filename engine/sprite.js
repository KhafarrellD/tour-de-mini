/**
 * Turns pixel grids into canvases the renderer can draw. Building a canvas
 * costs far more than drawing one, so every sprite is built once, cached by
 * a key, and reused on each frame.
 */
import { toRGBA } from './grid.js';

/** @typedef {import('./grid.js').Grid} Grid */

/**
 * @param {Grid} grid
 * @param {(cell: string, x: number, y: number) => string | null} colorOf
 * @returns {HTMLCanvasElement}
 */
export function gridToCanvas(grid, colorOf) {
  const canvas = document.createElement('canvas');
  canvas.width = grid.width;
  canvas.height = grid.height;
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  ctx.putImageData(new ImageData(toRGBA(grid, colorOf), grid.width, grid.height), 0, 0);
  return canvas;
}

/**
 * Memoizes canvas creation by key.
 * @template T
 * @param {(key: string) => T} build
 * @returns {(key: string) => T}
 */
export function cached(build) {
  /** @type {Map<string, T>} */
  const cache = new Map();
  return (key) => {
    let value = cache.get(key);
    if (value === undefined) {
      value = build(key);
      cache.set(key, value);
    }
    return value;
  };
}
