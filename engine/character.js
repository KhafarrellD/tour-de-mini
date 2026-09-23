/**
 * Builds athlete sprites from the shared rigs and each athlete's traits.
 *
 * A sprite is made in four steps, all on role grids until the last:
 *   1. compose  - stamp the body frame, then head layers at the frame's anchor
 *   2. build    - repeat or remove marked rows for tall or compact athletes
 *   3. outline  - wrap the silhouette in a 1px dark line
 *   4. paint    - map each role to the athlete's colors and kit pattern
 * Finished canvases are cached per athlete, so each is built only once.
 */
import { gridFromRows, emptyGrid, stamp, duplicateRows, removeRows, outline, shear, EMPTY } from './grid.js';
import { gridToCanvas } from './sprite.js';
import { color, shadeOf, PALETTE, RAINBOW } from '../assets/palette.js';
import { HEAD, HAIR, FACIAL_HAIR, HEADWEAR, EYEWEAR, TRAITS } from '../assets/sprites/heads.js';
import { RUNNER } from '../assets/sprites/runner.js';
import { RIDER } from '../assets/sprites/rider.js';
import { RIDER_REAR, REAR_TIRE_AT } from '../assets/sprites/rider-rear.js';
import { SWIMMER } from '../assets/sprites/swimmer.js';
import { BIKE, HUBS, WHEEL, REAR_TIRE } from '../assets/sprites/bike.js';

/** @typedef {import('./grid.js').Grid} Grid */
/** @typedef {import('../assets/sprites/rig.js').Rig} Rig */
/** @typedef {import('../assets/sprites/heads.js').HeadPart} HeadPart */
/** @typedef {import('../data/athletes.js').Athlete} Athlete */
/** @typedef {import('../data/athletes.js').Discipline} Discipline */

/** Every role letter a body or head grid may use. */
export const BODY_ROLES = new Set('SsETtVvCcAaPpQqLlWwOoKkHhMmGgF');

/** Roles drawn behind the bike: the far arm, far leg and far crank. */
const FAR_ROLES = new Set('vacqlwokp');

const OUTLINE = '#';

/** Transparent margin around each frame, so head layers can overhang it. */
export const PAD = { top: 3, left: 2, right: 2 };

/**
 * @typedef {object} Look
 * @property {Athlete['build']} build
 * @property {HeadPart[]} headParts bottom to top
 * @property {Record<string, string>} colors role -> hex
 * @property {Athlete['kit']['pattern']} pattern
 * @property {string} accent hex used by the pattern
 * @property {boolean} rainbowCuffs
 */

/**
 * Resolves what an athlete looks like in one discipline: which head layers
 * to stack and which color each role takes.
 * @param {Athlete} athlete
 * @param {Discipline} discipline
 * @returns {Look}
 */
export function lookFor(athlete, discipline) {
  const { kit } = athlete;
  const headwear = athlete.headwear[discipline];
  const coversThigh = kit.legs !== 'short';

  /** @type {Record<string, string>} role -> palette name */
  const names = {
    S: athlete.skin,
    E: 'outline',
    H: athlete.hair.color,
    T: kit.top,
    V: kit.sleeves ?? athlete.skin,
    C: kit.cuffs && kit.cuffs !== 'rainbow' ? kit.cuffs : (kit.sleeves ?? athlete.skin),
    A: kit.armSleeves ?? athlete.skin,
    P: kit.shorts,
    Q: coversThigh ? kit.shorts : athlete.skin,
    L: kit.shins ?? athlete.skin,
    W: kit.socks,
    O: kit.shoes,
    K: 'black',
    M: discipline === 'swim' ? (athlete.swimCap ?? 'white') : (headwear?.color ?? 'white'),
    G: discipline === 'swim' ? 'black' : (athlete.eyewear?.lens ?? 'black'),
    F: athlete.bike?.frame ?? 'black',
  };

  /** @type {Record<string, string>} */
  const colors = {};
  for (const [role, name] of Object.entries(names)) {
    colors[role] = color(name);
    colors[role.toLowerCase()] = shadeOf(name);
  }
  colors.m = headwear?.accent ? color(headwear.accent) : shadeOf(names.M);
  colors.g = PALETTE.outline;
  colors.R = PALETTE.tire;
  colors.r = PALETTE.grey;

  /** @type {HeadPart[]} */
  const headParts = [HEAD, HAIR[athlete.hair.style]];
  if (athlete.facialHair) headParts.push(FACIAL_HAIR[athlete.facialHair]);
  if (headwear) headParts.push(HEADWEAR[headwear.type]);
  if (athlete.eyewear && discipline !== 'swim') headParts.push(EYEWEAR.shades);
  for (const name of athlete.traits) {
    const trait = TRAITS[name];
    if (trait.with && trait.with !== headwear?.type) continue;
    headParts.push(trait);
    for (const [role, name] of Object.entries(trait.colors ?? {})) colors[role] = color(name);
  }

  return {
    build: athlete.build,
    headParts,
    colors,
    pattern: kit.pattern,
    accent: color(kit.accent),
    rainbowCuffs: kit.cuffs === 'rainbow',
  };
}

/**
 * @typedef {object} Underlay
 * @property {readonly string[]} rows
 * @property {readonly [number, number]} at position in rig coordinates
 */

/**
 * Stamps a body frame and its head layers onto a padded grid, then applies
 * the athlete's build. The rig's bottom-left corner ends up at
 * (PAD.left, grid.height).
 * @param {Rig} rig
 * @param {string} animation
 * @param {number} index wraps around the animation length
 * @param {Pick<Look, 'build' | 'headParts'>} look
 * @param {Underlay[]} [under] drawn beneath the body, e.g. the rear tire
 * @returns {Grid}
 */
export function composeBody(rig, animation, index, look, under = []) {
  const frames = rig.animations[animation];
  const frame = frames[((index % frames.length) + frames.length) % frames.length];
  let grid = emptyGrid(rig.width + PAD.left + PAD.right, rig.height + PAD.top);
  for (const layer of under) {
    grid = stamp(grid, gridFromRows(layer.rows), PAD.left + layer.at[0], PAD.top + layer.at[1]);
  }
  grid = stamp(grid, gridFromRows(frame.rows), PAD.left, PAD.top);

  const [headX, headY] = frame.head ?? [0, 0];
  if (frame.head) {
    for (const part of look.headParts) {
      const x = PAD.left + headX + part.at[0];
      const y = PAD.top + headY + part.at[1];
      grid = stamp(grid, gridFromRows(part.rows), x, y);
    }
  }

  const top = PAD.top + headY;
  if (look.build === 'tall') grid = duplicateRows(grid, rig.build.tall.map((row) => top + row));
  if (look.build === 'compact') grid = removeRows(grid, rig.build.compact.map((row) => top + row));
  return grid;
}

/**
 * Separates the limbs on the far side of the bike from everything else.
 * @param {Grid} grid
 * @returns {{ far: Grid, near: Grid }}
 */
export function splitLayers(grid) {
  const pick = (/** @type {boolean} */ far) => ({
    ...grid,
    cells: grid.cells.map((cell) => (FAR_ROLES.has(cell) === far ? cell : EMPTY)),
  });
  return { far: pick(true), near: pick(false) };
}

/**
 * Kit patterns, as tests on a torso pixel's position: u runs back to front
 * (left to right), v top to bottom, both 0..1 across the torso's bounds.
 * `rear` is true for the chase-camera view, where the torso is the back.
 * @type {Record<Look['pattern'], (u: number, v: number, rear: boolean) => boolean>}
 */
const PATTERNS = {
  plain: () => false,
  lower: (_u, v) => v >= 0.7,
  shoulders: (_u, v) => v <= 0.3,
  band: (_u, v) => v >= 0.35 && v <= 0.65,
  side: (u, _v, rear) => (rear ? u <= 0.15 || u >= 0.85 : u >= 0.35 && u <= 0.65),
  split: (u) => u < 0.5,
  logo: (u, v, rear) => !rear && u >= 0.9 && v >= 0.1 && v <= 0.35,
  open: (u, v, rear) => !rear && u >= 0.7 && v <= 0.55,
};

/**
 * @typedef {object} PaintOptions
 * @property {boolean} [rear] the chase-camera view, where the torso is the back
 * @property {boolean} [flash] a white silhouette, for the hit flash on a perfect
 */

/**
 * Returns the color function for a composed grid.
 * @param {Grid} grid
 * @param {Look} look
 * @param {PaintOptions} [options]
 * @returns {(cell: string, x: number, y: number) => string | null}
 */
export function colorizer(grid, look, { rear = false, flash = false } = {}) {
  if (flash) return () => PALETTE.white;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  grid.cells.forEach((cell, i) => {
    if (cell !== 'T') return;
    const x = i % grid.width;
    const y = Math.floor(i / grid.width);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });
  const inPattern = PATTERNS[look.pattern];

  return (cell, x, y) => {
    if (cell === 'T') {
      const u = maxX > minX ? (x - minX) / (maxX - minX) : 0;
      const v = maxY > minY ? (y - minY) / (maxY - minY) : 0;
      return inPattern(u, v, rear) ? look.accent : look.colors.T;
    }
    if ((cell === 'C' || cell === 'c') && look.rainbowCuffs) {
      const band = RAINBOW[x % RAINBOW.length];
      return cell === 'C' ? color(band) : shadeOf(band);
    }
    return look.colors[cell] ?? null;
  };
}

/**
 * @typedef {object} Sprite
 * @property {HTMLCanvasElement} canvas
 * @property {number} anchorX canvas x of the rig's left edge
 * @property {number} anchorY canvas y just below the rig's bottom row
 */

/**
 * Outlines and paints a composed grid.
 * @param {Grid} grid
 * @param {Look} look
 * @param {PaintOptions} [options]
 * @returns {Sprite}
 */
function paint(grid, look, options) {
  const withOutline = outline(grid, OUTLINE);
  const colorOf = colorizer(grid, look, options);
  const canvas = gridToCanvas(withOutline, (cell, x, y) =>
    cell === OUTLINE ? PALETTE.outline : colorOf(cell, x - 1, y - 1),
  );
  return { canvas, anchorX: PAD.left + 1, anchorY: withOutline.height - 1 };
}

/** @type {WeakMap<Athlete, Map<string, unknown>>} */
const caches = new WeakMap();

/**
 * @template T
 * @param {Athlete} athlete
 * @param {string} key
 * @param {() => T} build
 * @returns {T}
 */
function memo(athlete, key, build) {
  let cache = caches.get(athlete);
  if (!cache) {
    cache = new Map();
    caches.set(athlete, cache);
  }
  if (!cache.has(key)) cache.set(key, build());
  return /** @type {T} */ (cache.get(key));
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Sprite} sprite
 * @param {number} left where the rig's left edge goes
 * @param {number} bottom where the rig's bottom edge goes
 */
function place(ctx, sprite, left, bottom) {
  ctx.drawImage(sprite.canvas, Math.round(left - sprite.anchorX), Math.round(bottom - sprite.anchorY));
}

/**
 * Draws a runner standing on `groundY`, centered on `x`.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Athlete} athlete
 * @param {Discipline} discipline
 * @param {'run' | 'idle'} animation
 * @param {number} frame
 * @param {number} x
 * @param {number} groundY
 * @param {{ flash?: boolean }} [options] flash: draw a white silhouette
 */
export function drawRunner(ctx, athlete, discipline, animation, frame, x, groundY, { flash = false } = {}) {
  const index = frame % RUNNER.animations[animation].length;
  const sprite = memo(athlete, `runner|${discipline}|${animation}|${index}|${flash}`, () => {
    const look = lookFor(athlete, discipline);
    return paint(composeBody(RUNNER, animation, index, look), look, { flash });
  });
  place(ctx, sprite, x - RUNNER.width / 2, groundY);
}

/** Pedal frames per crank revolution; wheel frames per quarter turn. */
export const PEDAL_FRAMES = RIDER.animations.pedal.length;
export const WHEEL_FRAMES = WHEEL.frames.length;

/** @type {Map<number, Sprite>} */
const wheelSprites = new Map();

/** @param {number} frame */
function wheelSprite(frame) {
  let sprite = wheelSprites.get(frame);
  if (!sprite) {
    const colors = /** @type {Record<string, string>} */ ({
      R: PALETTE.tire,
      r: PALETTE.grey,
      x: PALETTE.spoke,
      h: PALETTE.metal,
    });
    const grid = outline(gridFromRows(WHEEL.frames[frame]), OUTLINE);
    const canvas = gridToCanvas(grid, (cell) => (cell === OUTLINE ? PALETTE.outline : (colors[cell] ?? null)));
    sprite = { canvas, anchorX: 1, anchorY: 1 };
    wheelSprites.set(frame, sprite);
  }
  return sprite;
}

/**
 * The bike frame for an athlete, one row taller or shorter to match their
 * build so the saddle and bars meet the rider.
 * @param {Athlete} athlete
 * @returns {Sprite}
 */
function bikeSprite(athlete) {
  return memo(athlete, 'bike', () => {
    const colors = /** @type {Record<string, string>} */ ({
      F: color(athlete.bike?.frame ?? 'black'),
      Z: PALETTE.black,
      z: PALETTE.metal,
      h: PALETTE.grey,
    });
    let grid = gridFromRows(BIKE.animations.frame[0].rows);
    if (athlete.build === 'tall') grid = duplicateRows(grid, BIKE.build.tall);
    if (athlete.build === 'compact') grid = removeRows(grid, BIKE.build.compact);
    const canvas = gridToCanvas(outline(grid, OUTLINE), (cell) =>
      cell === OUTLINE ? PALETTE.outline : (colors[cell] ?? null),
    );
    return { canvas, anchorX: 1, anchorY: canvas.height - 1 };
  });
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} wheelFrame
 * @param {number} left bike's left edge
 * @param {number} bottom ground line under the tires
 */
function drawWheels(ctx, wheelFrame, left, bottom) {
  const wheel = wheelSprite(((wheelFrame % WHEEL_FRAMES) + WHEEL_FRAMES) % WHEEL_FRAMES);
  const radius = (WHEEL.size - 1) / 2;
  for (const [hubX, hubY] of HUBS) {
    place(ctx, wheel, left + hubX - radius, bottom - (BIKE.height - hubY) - radius);
  }
}

/**
 * Draws an athlete's bike on its own, tires on `groundY`, centered on `x`.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Athlete} athlete
 * @param {number} wheelFrame
 * @param {number} x
 * @param {number} groundY
 */
export function drawBike(ctx, athlete, wheelFrame, x, groundY) {
  const left = Math.round(x - BIKE.width / 2);
  const bottom = Math.round(groundY);
  drawWheels(ctx, wheelFrame, left, bottom);
  place(ctx, bikeSprite(athlete), left, bottom);
}

/**
 * Draws a rider on a bike, side view, with the tires resting on `groundY`
 * and the bike centered on `x`.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Athlete} athlete
 * @param {Discipline} discipline
 * @param {'pedal' | 'idle'} animation
 * @param {number} frame pedal frame, tied to cadence
 * @param {number} wheelFrame tied to road speed
 * @param {number} x
 * @param {number} groundY
 * @param {{ flash?: boolean }} [options] flash: draw the rider as a white silhouette
 */
export function drawRider(ctx, athlete, discipline, animation, frame, wheelFrame, x, groundY, { flash = false } = {}) {
  const index = frame % RIDER.animations[animation].length;
  const layers = memo(athlete, `rider|${discipline}|${animation}|${index}|${flash}`, () => {
    const look = lookFor(athlete, discipline);
    const { far, near } = splitLayers(composeBody(RIDER, animation, index, look));
    return { far: paint(far, look, { flash }), near: paint(near, look, { flash }) };
  });
  const left = Math.round(x - BIKE.width / 2);
  const bottom = Math.round(groundY);
  drawWheels(ctx, wheelFrame, left, bottom);
  // The rider's feet sit one row above the tires; their grid starts 3px in.
  place(ctx, layers.far, left + 3, bottom - 1);
  place(ctx, bikeSprite(athlete), left, bottom);
  place(ctx, layers.near, left + 3, bottom - 1);
}

/** Lean steps either side of upright, for cornering on the chase camera. */
export const MAX_LEAN = 3;
const LEAN_SLOPE = 0.12;

/**
 * Draws a rider seen from behind, leaning `lean` steps into a corner
 * (negative = left), with the tire on `groundY` centered on `x`.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Athlete} athlete
 * @param {Discipline} discipline
 * @param {number} frame pedal frame
 * @param {number} tireFrame tied to road speed
 * @param {number} lean integer from -MAX_LEAN to MAX_LEAN
 * @param {number} x
 * @param {number} groundY
 */
export function drawRiderRear(ctx, athlete, discipline, frame, tireFrame, lean, x, groundY) {
  const index = frame % RIDER_REAR.animations.pedal.length;
  const tire = tireFrame % REAR_TIRE.frames.length;
  const step = Math.max(-MAX_LEAN, Math.min(MAX_LEAN, Math.round(lean)));
  const sprite = memo(athlete, `rear|${discipline}|${index}|${tire}|${step}`, () => {
    const look = lookFor(athlete, discipline);
    const upright = composeBody(RIDER_REAR, 'pedal', index, look, [
      { rows: REAR_TIRE.frames[tire], at: REAR_TIRE_AT },
    ]);
    const leaned = shear(upright, step * LEAN_SLOPE);
    const sprite = paint(leaned, look, { rear: true });
    // Shearing widens the grid; the bottom row stays put, shifted by the
    // amount the lean pushed everything right.
    const shift = step < 0 ? -Math.round((upright.height - 1) * step * LEAN_SLOPE) : 0;
    return { ...sprite, anchorX: sprite.anchorX + shift };
  });
  place(ctx, sprite, x - RIDER_REAR.width / 2, groundY);
}

/**
 * Draws a swimmer lying along `waterY`, centered on `x`.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Athlete} athlete
 * @param {'stroke' | 'idle'} animation
 * @param {number} frame
 * @param {number} x
 * @param {number} waterY
 */
export function drawSwimmer(ctx, athlete, animation, frame, x, waterY) {
  const index = frame % SWIMMER.animations[animation].length;
  const sprite = memo(athlete, `swim|${animation}|${index}`, () => {
    const look = lookFor(athlete, 'swim');
    return paint(composeBody(SWIMMER, animation, index, look), look);
  });
  // The water line is row 5 of the swimmer grid.
  place(ctx, sprite, x - SWIMMER.width / 2, waterY + SWIMMER.height - 5);
}
