/**
 * On a phone held upright the 320x180 frame can only scale 1x, so a small
 * pixel-font hint below it suggests turning the phone. CSS shows it only in
 * portrait; it lives outside the game frame and never covers play.
 */
import { createPixelCanvas } from '../../engine/screen.js';
import { drawText, measureText, LINE_HEIGHT } from '../../engine/font.js';
import { PALETTE } from '../../assets/palette.js';

const TEXT = 'ROTATE FOR A BIGGER VIEW';
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
