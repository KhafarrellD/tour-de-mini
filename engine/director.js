/**
 * Runs one scene at a time (title, menus, a race, results) and switches
 * between them with a short pixel wipe. Input keeps flowing during the wipe
 * so quick taps are never lost; menus ignore a button still held over from
 * the previous screen (see games/shared/menu.js).
 */
import { PALETTE } from '../assets/palette.js';

/** @typedef {import('./input.js').ButtonState} ButtonState */

/**
 * @typedef {object} Scene
 * @property {string} name shown as data-scene on the page, for tests and styling
 * @property {(dt: number, button: ButtonState) => void} update
 * @property {(ctx: CanvasRenderingContext2D) => void} render
 */

const WIPE_SECONDS = 0.3;

/** @param {Scene} initial */
export function createDirector(initial) {
  let scene = initial;
  /** @type {Scene | null} */
  let next = null;

  const director = {
    /** Seconds of wipe left. */
    transition: 0,
    /** The showing scene's name. */
    get name() {
      return scene.name;
    },
    /** @param {Scene} target */
    go(target) {
      next = target;
      director.transition = WIPE_SECONDS;
    },
    /**
     * @param {number} dt
     * @param {ButtonState} button
     */
    update(dt, button) {
      if (next) {
        scene = next;
        next = null;
      }
      director.transition = Math.max(0, director.transition - dt);
      scene.update(dt, button);
    },
    /** @param {CanvasRenderingContext2D} ctx */
    render(ctx) {
      scene.render(ctx);
      if (director.transition > 0) drawWipe(ctx, director.transition / WIPE_SECONDS);
    },
  };
  return director;
}

/**
 * Vertical blinds that open as `amount` falls from 1 to 0.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} amount
 */
function drawWipe(ctx, amount) {
  const stripe = 16;
  const covered = Math.ceil(stripe * amount);
  ctx.fillStyle = PALETTE.outline;
  for (let x = 0; x < ctx.canvas.width; x += stripe) ctx.fillRect(x, 0, covered, ctx.canvas.height);
}
