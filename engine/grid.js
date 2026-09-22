/**
 * Pure operations on pixel grids. A sprite is authored as rows of
 * characters, e.g. "..HHHH..", where each character names a *role* (hair,
 * jersey, skin...) and "." is transparent. Nothing here touches the DOM, so
 * the whole sprite pipeline is unit-testable in Node.
 */

export const EMPTY = '.';

/**
 * @typedef {object} Grid
 * @property {number} width
 * @property {number} height
 * @property {string[]} cells row-major, one character per cell
 */

/**
 * @param {readonly string[]} rows
 * @returns {Grid}
 */
export function gridFromRows(rows) {
  const width = rows[0]?.length ?? 0;
  rows.forEach((row, index) => {
    if (row.length !== width) {
      throw new Error(`Grid row ${index} is ${row.length} wide, expected ${width}: "${row}"`);
    }
  });
  return { width, height: rows.length, cells: rows.join('').split('') };
}

/**
 * @param {Grid} grid
 * @returns {string[]}
 */
export function gridToRows(grid) {
  const rows = [];
  for (let y = 0; y < grid.height; y++) {
    rows.push(grid.cells.slice(y * grid.width, (y + 1) * grid.width).join(''));
  }
  return rows;
}

/**
 * @param {number} width
 * @param {number} height
 * @returns {Grid}
 */
export function emptyGrid(width, height) {
  return { width, height, cells: new Array(width * height).fill(EMPTY) };
}

/**
 * Draws the opaque cells of `source` over `target` with its top-left corner
 * at (x, y). Cells outside `target` are clipped.
 * @param {Grid} target
 * @param {Grid} source
 * @param {number} x
 * @param {number} y
 * @returns {Grid}
 */
export function stamp(target, source, x, y) {
  const cells = target.cells.slice();
  for (let sy = 0; sy < source.height; sy++) {
    const ty = y + sy;
    if (ty < 0 || ty >= target.height) continue;
    for (let sx = 0; sx < source.width; sx++) {
      const tx = x + sx;
      if (tx < 0 || tx >= target.width) continue;
      const cell = source.cells[sy * source.width + sx];
      if (cell !== EMPTY) cells[ty * target.width + tx] = cell;
    }
  }
  return { width: target.width, height: target.height, cells };
}

/**
 * Repeats each listed row once, making the sprite taller while every other
 * row keeps its hand-drawn pixels. Used to derive tall builds.
 * @param {Grid} grid
 * @param {readonly number[]} indices rows of the original grid
 * @returns {Grid}
 */
export function duplicateRows(grid, indices) {
  const rows = gridToRows(grid).flatMap((row, y) => (indices.includes(y) ? [row, row] : [row]));
  return gridFromRows(rows);
}

/**
 * Deletes the listed rows. Used to derive compact builds.
 * @param {Grid} grid
 * @param {readonly number[]} indices rows of the original grid
 * @returns {Grid}
 */
export function removeRows(grid, indices) {
  return gridFromRows(gridToRows(grid).filter((_row, y) => !indices.includes(y)));
}

/** Enclosed gaps up to this many pixels are pinholes, not intentional holes. */
const MAX_PINHOLE = 4;

/**
 * Returns the grid grown by 1px on every side, with `char` placed on each
 * outside cell that touches the sprite horizontally or vertically.
 *
 * Only the silhouette is outlined: holes enclosed by the sprite, like the
 * gaps between wheel spokes or inside a bike frame, stay clear, which keeps
 * thin line art from turning to mud. Pinholes (a gap between hair and neck)
 * are filled instead, so the background never peeks through a body.
 * Skipping diagonal neighbours gives the rounded outline typical of
 * hand-made pixel art.
 * @param {Grid} grid
 * @param {string} char
 * @returns {Grid}
 */
export function outline(grid, char) {
  const padded = stamp(emptyGrid(grid.width + 2, grid.height + 2), grid, 1, 1);
  const { width, height } = padded;
  /** @param {number} x @param {number} y */
  const inside = (x, y) => x >= 0 && y >= 0 && x < width && y < height;

  // Label each transparent region; region 1 touches the border (outside).
  const region = new Int32Array(width * height);
  /** @type {number[]} */
  const sizes = [0];
  padded.cells.forEach((cell, start) => {
    if (cell !== EMPTY || region[start]) return;
    const label = sizes.length;
    let size = 0;
    const stack = [start];
    region[start] = label;
    while (stack.length) {
      const i = /** @type {number} */ (stack.pop());
      size++;
      const x = i % width;
      const y = Math.floor(i / width);
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        const n = ny * width + nx;
        if (inside(nx, ny) && !region[n] && padded.cells[n] === EMPTY) {
          region[n] = label;
          stack.push(n);
        }
      }
    }
    sizes.push(size);
  });

  /** @param {number} x @param {number} y */
  const opaque = (x, y) => inside(x, y) && padded.cells[y * width + x] !== EMPTY;
  const cells = padded.cells.map((cell, i) => {
    if (cell !== EMPTY) return cell;
    if (region[i] !== 1) return sizes[region[i]] <= MAX_PINHOLE ? char : EMPTY;
    const x = i % width;
    const y = Math.floor(i / width);
    return opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1)
      ? char
      : EMPTY;
  });
  return { width, height, cells };
}

/**
 * Leans a sprite by shifting each row sideways, pivoting on the bottom row.
 * Unlike rotation, shearing never resamples, so no pixel is lost or blurred.
 * @param {Grid} grid
 * @param {number} slope pixels of shift per row of height; positive leans right
 * @returns {Grid}
 */
export function shear(grid, slope) {
  /** @type {number[]} */
  const shifts = [];
  for (let y = 0; y < grid.height; y++) shifts.push(Math.round((grid.height - 1 - y) * slope));
  const min = Math.min(...shifts);
  const max = Math.max(...shifts);
  let result = emptyGrid(grid.width + max - min, grid.height);
  gridToRows(grid).forEach((row, y) => {
    result = stamp(result, gridFromRows([row]), shifts[y] - min, y);
  });
  return result;
}

/**
 * Converts a grid to RGBA bytes. `colorOf` receives each opaque cell with its
 * position and returns a "#rrggbb" color, or null to leave it transparent.
 * @param {Grid} grid
 * @param {(cell: string, x: number, y: number) => string | null} colorOf
 * @returns {Uint8ClampedArray<ArrayBuffer>}
 */
export function toRGBA(grid, colorOf) {
  const data = new Uint8ClampedArray(grid.width * grid.height * 4);
  grid.cells.forEach((cell, i) => {
    if (cell === EMPTY) return;
    const color = colorOf(cell, i % grid.width, Math.floor(i / grid.width));
    if (!color) return;
    const value = parseInt(color.slice(1), 16);
    data[i * 4] = value >> 16;
    data[i * 4 + 1] = (value >> 8) & 0xff;
    data[i * 4 + 2] = value & 0xff;
    data[i * 4 + 3] = 255;
  });
  return data;
}
