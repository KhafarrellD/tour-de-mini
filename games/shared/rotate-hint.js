/**
 * On a phone held upright the frame is drawn sideways, so it fills the long
 * side of the screen. This hint is drawn sideways with it and says why. CSS
 * shows it only when the screen is turned; it lives outside the game frame
 * and never covers play.
 */
import { createPixelCanvas } from '../../engine/screen.js';
import { drawText, measureText, LINE_HEIGHT } from '../../engine/font.js';
import { PALETTE } from '../../assets/palette.js';

const TEXT = 'TURN YOUR PHONE';
const SCALE = 2;

/** @param {HTMLElement} container */
export function mountRotateHint(container) {
  const { canvas, ctx } = createPixelCanvas(measureText(TEXT) + 2, LINE_HEIGHT);
  drawText(ctx, TEXT, 1, 2, { color: PALETTE.lightGrey });
  canvas.className = 'rotate-hint';
  canvas.style.width = `${canvas.width * SCALE}px`;
  canvas.style.height = `${canvas.height * SCALE}px`;
  canvas.setAttribute('aria-hidden', 'true');
  container.append(canvas);
}
