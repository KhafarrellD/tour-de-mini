/**
 * The game renders into a fixed 320x180 buffer, which is scaled up by a
 * whole number of *device* pixels per game pixel and letterboxed. Scaling by
 * whole device pixels (rather than whole CSS pixels) keeps every game pixel
 * the same size on phones and on Windows displays set to 125% or 150%.
 */

export const WIDTH = 320;
export const HEIGHT = 180;

/**
 * @param {number} availableWidth CSS pixels
 * @param {number} availableHeight CSS pixels
 * @param {number} devicePixelRatio
 * @returns {{ scale: number, cssWidth: number, cssHeight: number }}
 *   scale is device pixels per game pixel
 */
export function fitScale(availableWidth, availableHeight, devicePixelRatio) {
  const scale = Math.max(
    1,
    Math.floor(
      Math.min(
        (availableWidth * devicePixelRatio) / WIDTH,
        (availableHeight * devicePixelRatio) / HEIGHT,
      ),
    ),
  );
  return {
    scale,
    cssWidth: (WIDTH * scale) / devicePixelRatio,
    cssHeight: (HEIGHT * scale) / devicePixelRatio,
  };
}

/**
 * Creates a 2D context with smoothing off, so scaled drawing stays crisp.
 * @param {number} width
 * @param {number} height
 * @param {{ willReadFrequently?: boolean }} [options] set when pixels are read back often
 */
export function createPixelCanvas(width, height, { willReadFrequently = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d', { willReadFrequently }));
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

/**
 * Mounts a letterboxed display canvas inside `container` and returns the
 * 320x180 context that games draw into. Call `present()` once per frame.
 * @param {HTMLElement} container
 */
export function createScreen(container) {
  const buffer = createPixelCanvas(WIDTH, HEIGHT);
  const display = document.createElement('canvas');
  display.className = 'screen';
  container.append(display);
  const displayCtx = /** @type {CanvasRenderingContext2D} */ (display.getContext('2d'));
  let scale = 1;

  function resize() {
    const fit = fitScale(container.clientWidth, container.clientHeight, window.devicePixelRatio || 1);
    scale = fit.scale;
    display.width = WIDTH * scale;
    display.height = HEIGHT * scale;
    display.style.width = `${fit.cssWidth}px`;
    display.style.height = `${fit.cssHeight}px`;
    displayCtx.imageSmoothingEnabled = false;
  }

  function present() {
    displayCtx.drawImage(buffer.canvas, 0, 0, WIDTH * scale, HEIGHT * scale);
  }

  new ResizeObserver(resize).observe(container);
  window.addEventListener('resize', resize);
  resize();

  return { ctx: buffer.ctx, canvas: display, present };
}
