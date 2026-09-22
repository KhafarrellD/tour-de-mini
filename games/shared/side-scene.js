/**
 * The side-view backdrop shared by the sprint, the marathon and the run:
 * a static sky and four scrolling layers, each slower the farther away it
 * is (mountains, hills, then the crowd and road moving with the world).
 */
import { drawParallax } from '../../engine/parallax.js';
import { createPixelCanvas, WIDTH, HEIGHT } from '../../engine/screen.js';
import { SCENE, paintSky, mountainTile, hillTile, crowdTile, roadTile } from '../../assets/scenery/countryside.js';

export { SCENE };

export function createSideScene() {
  const sky = createPixelCanvas(WIDTH, HEIGHT);
  paintSky(sky.ctx, SCENE.roadTop);

  /** @type {import('../../engine/parallax.js').ParallaxLayer[]} */
  const layers = [
    { image: mountainTile(), factor: 0.08, y: 58 },
    { image: hillTile(), factor: 0.25, y: 96 },
    { image: crowdTile(), factor: 1, y: SCENE.roadTop - 13 },
    { image: roadTile(), factor: 1, y: SCENE.roadTop },
  ];

  return {
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} cameraX world x of the screen's left edge
     */
    draw(ctx, cameraX) {
      ctx.drawImage(sky.canvas, 0, 0);
      drawParallax(ctx, layers, cameraX);
    },
  };
}
