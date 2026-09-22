/**
 * Interface pieces shared by the hub and every game: panels, stat bars and
 * the one-button hint with its hold meter.
 */
import { drawText, measureText } from '../../engine/font.js';
import { PALETTE } from '../../assets/palette.js';

/**
 * A dark panel with a 1px border.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 */
export function drawPanel(ctx, x, y, width, height) {
  ctx.fillStyle = PALETTE.outline;
  ctx.fillRect(x - 1, y - 1, width + 2, height + 2);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(x + 1, y + 1, width - 2, height - 2);
}

/**
 * A labelled bar of ten pips, for athlete stats.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {string} label
 * @param {number} value 1..10
 */
export function drawStatBar(ctx, x, y, label, value) {
  drawText(ctx, label, x, y, { color: PALETTE.lightGrey });
  const barX = x + 58;
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i < value ? PALETTE.yellow : PALETTE.panelEdge;
    ctx.fillRect(barX + i * 5, y + 1, 4, 5);
  }
}

/**
 * The control hint at the bottom of a menu, with a meter under it that
 * fills while the button is held.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} holdProgress 0..1
 * @param {number} [y]
 */
export function drawMenuHint(ctx, text, holdProgress, y = 166) {
  drawText(ctx, text, 160, y, { align: 'center', color: PALETTE.white });
  if (holdProgress <= 0) return;
  const width = measureText(text);
  const left = Math.round(160 - width / 2);
  ctx.fillStyle = PALETTE.outline;
  ctx.fillRect(left - 1, y + 9, width + 2, 4);
  ctx.fillStyle = PALETTE.volt;
  ctx.fillRect(left, y + 10, Math.round(width * holdProgress), 2);
}

/**
 * The hint for a one-button menu of `count` items.
 * @param {number} count
 */
export function menuHint(count) {
  return count > 1 ? 'TAP: NEXT   HOLD: SELECT' : 'TAP TO SELECT';
}
