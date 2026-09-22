/**
 * Draws text with the pixel font in assets/font.js. Text is positioned by the
 * top of its capital letters; accents sit in the 2 rows above.
 */
import { GLYPHS } from '../assets/font.js';
import { gridFromRows, outline } from './grid.js';
import { gridToCanvas, cached } from './sprite.js';

export const CAP_HEIGHT = 7;
const ACCENT_ROWS = 2;
const SPACING = 1;
/** Distance between the tops of two lines of text. */
export const LINE_HEIGHT = ACCENT_ROWS + CAP_HEIGHT + 1;

/**
 * @param {string} char
 * @returns {readonly string[]}
 */
export function glyphFor(char) {
  return GLYPHS[char.toUpperCase()] ?? GLYPHS['?'];
}

/**
 * Width of `text` in game pixels.
 * @param {string} text
 */
export function measureText(text) {
  let width = 0;
  for (const char of text) width += glyphFor(char)[0].length + SPACING;
  return Math.max(0, width - SPACING);
}

/**
 * Splits text into lines no wider than `maxWidth`, breaking at spaces.
 * @param {string} text
 * @param {number} maxWidth game pixels
 * @returns {string[]}
 */
export function wrapText(text, maxWidth) {
  /** @type {string[]} */
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measureText(candidate) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Glyph canvases keyed by "char|fill|outline". Each canvas is the glyph with
 * a 1px outline around it, so text reads over any background.
 */
const glyphCanvas = cached((key) => {
  const [char, fill, edge] = key.split('|');
  const grid = outline(gridFromRows(glyphFor(char)), 'O');
  return gridToCanvas(grid, (cell) => (cell === 'X' ? fill : edge || null));
});

/**
 * @typedef {object} TextStyle
 * @property {string} [color] fill color, default white
 * @property {string} [outline] outline color, or "" for none
 * @property {'left' | 'center' | 'right'} [align]
 * @property {number} [scale] whole-number enlargement for titles
 */

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y top of the capital letters
 * @param {TextStyle} [style]
 */
export function drawText(ctx, text, x, y, style = {}) {
  const { color = '#ffffff', outline: edge = '#1a1423', align = 'left', scale = 1 } = style;
  const width = measureText(text) * scale;
  let cursor = Math.round(align === 'center' ? x - width / 2 : align === 'right' ? x - width : x);
  for (const char of text) {
    const rows = glyphFor(char);
    const canvas = glyphCanvas(`${char.toUpperCase()}|${color}|${edge}`);
    const top = y - (rows.length - CAP_HEIGHT) * scale - scale;
    ctx.drawImage(canvas, cursor - scale, top, canvas.width * scale, canvas.height * scale);
    cursor += (rows[0].length + SPACING) * scale;
  }
}
