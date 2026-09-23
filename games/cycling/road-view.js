/**
 * The chase camera: a road drawn one screen row at a time.
 *
 * Every row below the horizon is a distance ahead of the rider: near rows
 * are thick, far rows thin. The camera always points along the road under
 * the rider, so a corner does not swing the tarmac off the screen; instead
 * the road's curvature is added up with distance, which bends it away to
 * one side exactly like a real corner looks. Nothing is rotated or scaled,
 * so the road stays pixel-crisp; the camera rolls by shifting each row.
 */
import { PALETTE } from '../../assets/palette.js';

/** Where the road meets the sky. Below this is 45% of the frame. */
export const HORIZON_Y = 98;
const CAMERA_HEIGHT = 1.5;
const FOCAL = 130;
/** Half the width of the tarmac, in metres. */
const ROAD_HALF = 4.6;
/** Length of one light/dark band of road, in metres. */
const BAND = 7;
/** How far ahead the road is drawn. */
const VIEW_METRES = 260;
/** Steps of the curvature sum: fine enough for corners, cheap enough per frame. */
const STEP_METRES = 2;
const STEPS = Math.ceil(VIEW_METRES / STEP_METRES);

/**
 * How far ahead the given screen row is, in metres.
 * @param {number} y
 */
export function distanceAt(y) {
  return (CAMERA_HEIGHT * FOCAL) / Math.max(0.5, y - HORIZON_Y);
}

/**
 * A camera that follows a course. `curvatureAt(metres)` returns how hard the
 * road bends there: positive turns right.
 * @param {(metres: number) => number} curvatureAt
 */
export function createRoadCamera(curvatureAt) {
  const offsets = new Float64Array(STEPS + 1);
  const camera = {
    metres: 0,
    /** Camera roll, in pixels of shift per row below the horizon. */
    tilt: 0,
    /**
     * Recomputes how far the road has bent away at each distance ahead.
     * Call once per frame, before drawing.
     * @param {number} metres
     */
    update(metres) {
      camera.metres = metres;
      let slope = 0;
      let offset = 0;
      offsets[0] = 0;
      for (let i = 1; i <= STEPS; i++) {
        const z = i * STEP_METRES;
        slope += curvatureAt(metres + z) * STEP_METRES;
        offset += slope * STEP_METRES;
        offsets[i] = offset;
      }
    },
    /**
     * Sideways shift of the road centre at a distance ahead, in metres.
     * @param {number} z
     */
    offsetAt(z) {
      const position = Math.max(0, Math.min(STEPS - 0.001, z / STEP_METRES));
      const index = Math.floor(position);
      const fraction = position - index;
      return offsets[index] * (1 - fraction) + offsets[index + 1] * fraction;
    },
  };
  return camera;
}

/** @typedef {ReturnType<typeof createRoadCamera>} RoadCamera */

/**
 * Where the middle of the road sits on screen for a row.
 * @param {RoadCamera} camera
 * @param {number} y
 */
export function roadCenterAt(camera, y) {
  const z = distanceAt(y);
  return 160 + (camera.offsetAt(z) * FOCAL) / z + camera.tilt * (y - HORIZON_Y);
}

/**
 * Draws the road from the horizon to the bottom of the screen.
 * @param {CanvasRenderingContext2D} ctx
 * @param {RoadCamera} camera
 */
export function drawRoad(ctx, camera) {
  for (let y = HORIZON_Y + 1; y < 180; y++) {
    const z = distanceAt(y);
    const center = roadCenterAt(camera, y);
    const half = Math.max(1, (ROAD_HALF * FOCAL) / z);
    const light = Math.floor((camera.metres + z) / BAND) % 2 === 0;

    ctx.fillStyle = light ? PALETTE.hill : PALETTE.hillShade;
    ctx.fillRect(0, y, 320, 1);

    const left = Math.round(center - half);
    const width = Math.max(2, Math.round(half * 2));
    ctx.fillStyle = light ? PALETTE.roadLight : PALETTE.road;
    ctx.fillRect(left, y, width, 1);

    // Rumble strips, and a dashed line down the middle when the road is wide
    // enough on screen for it to read.
    const rumble = Math.max(1, Math.round(half * 0.14));
    ctx.fillStyle = light ? PALETTE.white : PALETTE.red;
    ctx.fillRect(left, y, rumble, 1);
    ctx.fillRect(left + width - rumble, y, rumble, 1);
    if (half > 14 && light) {
      ctx.fillStyle = PALETTE.roadLine;
      ctx.fillRect(Math.round(center), y, Math.max(1, Math.round(half * 0.06)), 1);
    }
  }
}

/**
 * White marker posts along the verge: at speed they flick past and give the
 * eye something to measure the pace against.
 * @param {CanvasRenderingContext2D} ctx
 * @param {RoadCamera} camera
 */
export function drawPosts(ctx, camera) {
  const spacing = 22;
  const first = Math.ceil(camera.metres / spacing) * spacing;
  for (let metres = first; metres < camera.metres + VIEW_METRES; metres += spacing) {
    for (const side of [-1, 1]) {
      const spot = project(camera, metres, side * (ROAD_HALF + 1.2));
      if (!spot) continue;
      const height = Math.max(1, Math.round(4 * spot.scale));
      ctx.fillStyle = PALETTE.outline;
      ctx.fillRect(Math.round(spot.x) - 1, Math.round(spot.y) - height - 1, spot.scale + 2, height + 1);
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(Math.round(spot.x), Math.round(spot.y) - height, spot.scale, height);
    }
  }
}

/**
 * Projects a point beside the road (a sign, a rival) onto the screen.
 * @param {RoadCamera} camera
 * @param {number} metres where it stands on the course
 * @param {number} offset metres to the side of the middle: negative is left
 * @returns {{ x: number, y: number, scale: number } | null} null when out of view
 */
export function project(camera, metres, offset) {
  const z = metres - camera.metres;
  if (z < 1 || z > VIEW_METRES) return null;
  const y = HORIZON_Y + (CAMERA_HEIGHT * FOCAL) / z;
  if (y >= 180) return null;
  const x = 160 + ((camera.offsetAt(z) + offset) * FOCAL) / z + camera.tilt * (y - HORIZON_Y);
  // Whole-number scales only: pixel art is never drawn at half a pixel.
  const scale = Math.max(1, Math.min(3, Math.round(40 / z)));
  return { x, y, scale };
}
