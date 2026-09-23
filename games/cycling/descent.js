/**
 * The technical descent, as pure data.
 *
 * The bike runs downhill by itself; holding the button brakes. Every corner
 * has a safe speed, shown on a sign before you reach it. Arrive on it and
 * you carry your speed through; a little over and the bike wobbles; far
 * over and you crash and lose real time. Steering is automatic, because the
 * whole game is played with one button: the skill is knowing when to brake.
 *
 * The course is a list of corners; the road's sideways position is the
 * double integral of their curvature, which the scene uses to draw the road
 * ahead and to lean the rider.
 */
import { createRng } from '../../engine/rng.js';


/** @typedef {import('../../data/athletes.js').Athlete} Athlete */

export const DESCENT_METRES = 1300;
/** Speed with the brakes off on this gradient. */
const TOP_SPEED = 25;
const ACCELERATION = 4.2;
export const BRAKING = 8.5;
const MIN_SPEED = 7;
/** Over the safe speed by this much is a wobble; more is a crash. */
const WOBBLE_MARGIN = 1.08;
const CRASH_MARGIN = 1.22;
const CRASH_SECONDS = 2.2;
/** How far ahead a corner's sign is visible. */
export const SIGN_DISTANCE = 150;
/** Extra course kept past the finish so the road ahead is always drawn. */
const VIEW_AHEAD = 320;

/**
 * @typedef {object} Corner
 * @property {number} at metres from the start
 * @property {1 | -1} direction 1 turns right
 * @property {number} radius smaller is tighter
 * @property {number} safeSpeed metres per second
 * @property {boolean} hairpin
 */

/**
 * A seeded course: alternating corners with straights between them, a few
 * of them hairpins, tightening slightly toward the bottom.
 * @param {ReturnType<typeof createRng>} rng
 * @param {number} metres length of the descent
 * @returns {Corner[]}
 */
function buildCourse(rng, metres) {
  /** @type {Corner[]} */
  const corners = [];
  let at = 140;
  /** @type {1 | -1} */
  let direction = rng.next() < 0.5 ? 1 : -1;
  while (at < metres - 130) {
    const hairpin = rng.next() < 0.28;
    const radius = hairpin ? 26 + rng.next() * 10 : 50 + rng.next() * 60;
    corners.push({
      at: Math.round(at),
      direction,
      radius,
      // Cornering speed from the radius, the way a physics book would have it.
      safeSpeed: Math.round(Math.sqrt(radius * 3.6) * 10) / 10,
      hairpin,
    });
    at += (hairpin ? 70 : 95) + rng.next() * 70;
    direction = rng.next() < 0.78 ? /** @type {1 | -1} */ (-direction) : direction;
  }
  return corners;
}

/**
 * @param {{ athlete: Athlete, rivals: Athlete[], seed: number, metres?: number }} options
 *   `metres` shortens the course for the Ironman's bike leg.
 */
export function createDescent({ athlete, rivals, seed, metres = DESCENT_METRES }) {
  const rng = createRng(seed);
  const course = buildCourse(rng, metres);
  return {
    athlete,
    course,
    /** Length of this descent. */
    metresTotal: metres,
    /** How hard the road bends, one entry per metre. */
    curvature: buildCurvature(course, metres),
    time: 0,
    metres: 0,
    speed: 14,
    finished: false,
    /** Seconds left of a crash before the rider is going again. */
    down: 0,
    nextCorner: 0,
    clean: 0,
    wobbles: 0,
    crashes: 0,
    rivals: rivals.map((rival) => ({ athlete: rival, time: rivalTime(rival, course, rng, metres) })),
  };
}

/** @typedef {ReturnType<typeof createDescent>} Descent */

/**
 * How hard the road bends at each metre of the course: 1/radius through a
 * corner, eased in and out so corners flow rather than snap. Positive bends
 * right. The chase camera adds this up to draw the road ahead.
 * @param {Corner[]} course
 * @param {number} metres
 */
function buildCurvature(course, metres) {
  const curvature = new Float64Array(metres + VIEW_AHEAD);
  for (const corner of course) {
    const half = corner.hairpin ? 26 : 38;
    for (let metre = corner.at - half; metre <= corner.at + half; metre++) {
      if (metre < 0 || metre >= curvature.length) continue;
      // Eased shape: no bend at the edges, full bend at the apex.
      const t = (metre - (corner.at - half)) / (half * 2);
      const shape = Math.sin(Math.PI * t) ** 2;
      curvature[metre] += (corner.direction * shape) / corner.radius;
    }
  }
  return curvature;
}

/**
 * The bend in the road at a point on the course.
 * @param {Descent} state
 * @param {number} metres
 */
export function curvatureAt(state, metres) {
  const index = Math.round(metres);
  if (index < 0 || index >= state.curvature.length) return 0;
  return state.curvature[index];
}

/**
 * The corner you are riding toward, or null past the last one.
 * @param {Descent} state
 */
export function cornerAhead(state) {
  return state.course[state.nextCorner] ?? null;
}

/**
 * @typedef {{ type: 'sign', corner: Corner }
 *   | { type: 'clean', corner: Corner }
 *   | { type: 'wobble', corner: Corner }
 *   | { type: 'crash', corner: Corner }
 *   | { type: 'finish' }} DescentEvent
 */

/**
 * @param {Descent} state
 * @param {number} dt
 * @param {boolean} braking
 * @returns {DescentEvent[]}
 */
export function stepDescent(state, dt, braking) {
  /** @type {DescentEvent[]} */
  const events = [];
  if (state.finished) return events;
  state.time += dt;

  if (state.down > 0) {
    // On the floor: no speed, no input, until the rider is up again.
    state.down -= dt;
    state.speed = 0;
    return events;
  }

  const skill = 0.97 + state.athlete.stats.technique * 0.006;
  state.speed = braking
    ? Math.max(MIN_SPEED, state.speed - BRAKING * dt)
    : Math.min(TOP_SPEED * skill, state.speed + ACCELERATION * dt);

  const before = state.metres;
  state.metres += state.speed * dt;

  const corner = cornerAhead(state);
  if (corner) {
    if (before < corner.at - SIGN_DISTANCE && state.metres >= corner.at - SIGN_DISTANCE) {
      events.push({ type: 'sign', corner });
    }
    if (state.metres >= corner.at) {
      state.nextCorner++;
      const over = state.speed / corner.safeSpeed;
      if (over >= CRASH_MARGIN) {
        state.crashes++;
        state.down = CRASH_SECONDS;
        state.speed = 0;
        state.metres = corner.at;
        events.push({ type: 'crash', corner });
      } else if (over >= WOBBLE_MARGIN) {
        state.wobbles++;
        state.speed = corner.safeSpeed * 0.7;
        events.push({ type: 'wobble', corner });
      } else {
        state.clean++;
        events.push({ type: 'clean', corner });
      }
    }
  }

  if (state.metres >= state.metresTotal) {
    state.metres = state.metresTotal;
    state.finished = true;
    events.push({ type: 'finish' });
  }
  return events;
}

/**
 * A rival's time, found by riding them down the same course with the same
 * physics: they brake for a margin under each corner's safe speed, a little
 * late, and pay for it when they get it wrong.
 * @param {Athlete} athlete
 * @param {Corner[]} course
 * @param {ReturnType<typeof createRng>} rng
 * @param {number} metres
 */
function rivalTime(athlete, course, rng, metres) {
  const { technique } = athlete.stats;
  const margin = 0.82 + technique * 0.012 + (rng.next() - 0.5) * 0.05;
  const lag = Math.max(0, 0.3 - technique * 0.02 + (rng.next() - 0.5) * 0.12);
  const dt = 1 / 30;
  let time = 0;
  let ridden = 0;
  let speed = 14;
  let index = 0;
  while (ridden < metres && time < 400) {
    const corner = course[index];
    let braking = false;
    if (corner) {
      const target = corner.safeSpeed * margin;
      const needed = (speed * speed - target * target) / (2 * BRAKING);
      braking = speed > target && corner.at - ridden <= needed + 6 - speed * lag;
    }
    speed = braking
      ? Math.max(MIN_SPEED, speed - BRAKING * dt)
      : Math.min(TOP_SPEED, speed + ACCELERATION * dt);
    ridden += speed * dt;
    time += dt;
    if (corner && ridden >= corner.at) {
      index++;
      const over = speed / corner.safeSpeed;
      if (over >= CRASH_MARGIN) {
        time += CRASH_SECONDS;
        speed = MIN_SPEED;
      } else if (over >= WOBBLE_MARGIN) {
        speed = corner.safeSpeed * 0.7;
      }
    }
  }
  return time;
}

/**
 * @typedef {object} DescentStanding
 * @property {Athlete} athlete
 * @property {number} time
 * @property {boolean} isPlayer
 */

/**
 * @param {Descent} state
 * @returns {DescentStanding[]}
 */
export function descentStandings(state) {
  const projected = state.finished
    ? state.time
    : state.time + (state.metresTotal - state.metres) / Math.max(MIN_SPEED, state.speed);
  return [
    { athlete: state.athlete, time: projected, isPlayer: true },
    ...state.rivals.map((rival) => ({ athlete: rival.athlete, time: rival.time, isPlayer: false })),
  ].sort((a, b) => a.time - b.time);
}
