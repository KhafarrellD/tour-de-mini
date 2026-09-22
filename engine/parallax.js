/**
 * Parallax scrolling: each background layer is a horizontally repeating
 * tile that moves at a fraction of the camera speed. Distant layers move
 * slowly, near layers quickly, which sells depth in a flat 2D scene.
 */

/**
 * Where to draw the first copy of a repeating tile so that copies placed
 * every `tileWidth` pixels cover the screen. Always a whole pixel.
 * @param {number} cameraX world position of the camera
 * @param {number} factor 0 = fixed to the screen, 1 = moves with the world
 * @param {number} tileWidth
 */
export function layerOffset(cameraX, factor, tileWidth) {
  const scrolled = Math.floor(cameraX * factor);
  return -(((scrolled % tileWidth) + tileWidth) % tileWidth) || 0;
}

/**
 * @typedef {object} ParallaxLayer
 * @property {HTMLCanvasElement} image a tile that repeats horizontally
 * @property {number} factor scroll speed relative to the camera
 * @property {number} y top edge on screen
 */

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {readonly ParallaxLayer[]} layers back to front
 * @param {number} cameraX
 */
export function drawParallax(ctx, layers, cameraX) {
  const screenWidth = ctx.canvas.width;
  for (const layer of layers) {
    const tileWidth = layer.image.width;
    for (let x = layerOffset(cameraX, layer.factor, tileWidth); x < screenWidth; x += tileWidth) {
      ctx.drawImage(layer.image, x, layer.y);
    }
  }
}
