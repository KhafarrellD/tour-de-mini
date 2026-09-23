/**
 * The Ironman swim, as pure data.
 *
 * Side on, in the water: every stroke lifts you toward the surface and you
 * sink between them, so the swim is flown rather than steered. Buoys hang
 * from the surface and other swimmers churn along the bottom; between them
 * is a gap to aim for. Clipping one costs time rather than ending the race,
 * because an Ironman should not be lost to a single mistake.
 */
import { createRng } from '../../engine/rng.js';
import { clamp } from '../../engine/math.js';

/** @typedef {import('../../data/athletes.js').Athlete} Athlete */

export const SWIM_METRES = 380;
/** How deep the lane is, in the scene's pixels. */
export const DEPTH_MAX = 48;
/** The smallest gap left between an obstacle and the surface or bottom. */
export const GAP = 20;
const SINK = 62;
const STROKE = 30;
const MAX_RISE = -34;
const MAX_SINK = 46;
const SPEED = 19;
/** Speed and time lost after clipping something. */
const HIT_SPEED = 9;
const HIT_SECONDS = 1.6;

/**
 * @typedef {object} Obstacle
 * @property {number} at metres from the start
 * @property {'buoy' | 'swimmer'} type
 * @property {number} gapTop shallowest depth that is clear
 * @property {number} gapBottom deepest depth that is clear
 */

/**
 * @param {ReturnType<typeof createRng>} rng
 * @returns {Obstacle[]}
 */
function buildObstacles(rng) {
  /** @type {Obstacle[]} */
  const obstacles = [];
  for (let at = 70; at < SWIM_METRES - 40; at += 46 + rng.next() * 26) {
    // A buoy hangs from the surface, a swimmer churns near the bottom.
    const buoy = rng.next() < 0.5;
    const gap = GAP + rng.next() * 8;
    const gapTop = buoy ? clamp(12 + rng.next() * 16, 0, DEPTH_MAX - gap) : 0;
    obstacles.push({
      at: Math.round(at),
      type: buoy ? 'buoy' : 'swimmer',
      gapTop,
      gapBottom: Math.min(DEPTH_MAX, gapTop + gap),
    });
  }
  return obstacles;
}

/**
 * @param {{ athlete: Athlete, rivals: Athlete[], seed: number }} options
 */
export function createSwim({ athlete, rivals, seed }) {
  const rng = createRng(seed);
  const obstacles = buildObstacles(rng);
  return {
    athlete,
    obstacles,
    time: 0,
    metres: 0,
    /** 0 is the surface, DEPTH_MAX the bottom. */
    depth: 14,
    rise: 0,
    hits: 0,
    slowed: 0,
    finished: false,
    nextObstacle: 0,
    rivals: rivals.map((rival) => ({ athlete: rival, time: rivalTime(rival, rng) })),
  };
}

/** @typedef {ReturnType<typeof createSwim>} Swim */

/**
 * @typedef {{ type: 'hit', obstacle: Obstacle }
 *   | { type: 'stroke' }
 *   | { type: 'finish' }} SwimEvent
 */

/**
 * @param {Swim} state
 * @param {number} dt
 * @param {boolean} stroking a press this step
 * @returns {SwimEvent[]}
 */
export function stepSwim(state, dt, stroking) {
  /** @type {SwimEvent[]} */
  const events = [];
  if (state.finished) return events;
  state.time += dt;
  state.slowed = Math.max(0, state.slowed - dt);

  if (stroking) {
    state.rise = Math.max(MAX_RISE, state.rise - STROKE);
    events.push({ type: 'stroke' });
  }
  state.rise = Math.min(MAX_SINK, state.rise + SINK * dt);
  state.depth += state.rise * dt;
  if (state.depth <= 0) {
    state.depth = 0;
    state.rise = Math.max(0, state.rise);
  }
  if (state.depth >= DEPTH_MAX) {
    state.depth = DEPTH_MAX;
    state.rise = Math.min(0, state.rise);
  }

  const before = state.metres;
  state.metres += (state.slowed > 0 ? HIT_SPEED : SPEED) * dt;

  const obstacle = state.obstacles[state.nextObstacle];
  if (obstacle && state.metres >= obstacle.at && before < obstacle.at) {
    state.nextObstacle++;
    if (state.depth < obstacle.gapTop || state.depth > obstacle.gapBottom) {
      state.hits++;
      state.slowed = HIT_SECONDS;
      events.push({ type: 'hit', obstacle });
    }
  }

  if (state.metres >= SWIM_METRES) {
    state.metres = SWIM_METRES;
    state.finished = true;
    events.push({ type: 'finish' });
  }
  return events;
}

/**
 * A rival's swim: their own pace, plus the odd moment lost in the washing
 * machine of a mass start.
 * @param {Athlete} athlete
 * @param {ReturnType<typeof createRng>} rng
 */
function rivalTime(athlete, rng) {
  const { endurance, technique } = athlete.stats;
  const pace = SPEED * (0.9 + endurance * 0.011 + (rng.next() - 0.5) * 0.04);
  const scuffles = rng.next() < 0.45 ? (rng.next() * 2.2) / (technique * 0.15) : 0;
  return SWIM_METRES / pace + scuffles;
}

/**
 * @typedef {object} SwimStanding
 * @property {Athlete} athlete
 * @property {number} time
 * @property {boolean} isPlayer
 */

/**
 * @param {Swim} state
 * @returns {SwimStanding[]}
 */
export function swimStandings(state) {
  const projected = state.finished
    ? state.time
    : state.time + (SWIM_METRES - state.metres) / SPEED;
  return [
    { athlete: state.athlete, time: projected, isPlayer: true },
    ...state.rivals.map((rival) => ({ athlete: rival.athlete, time: rival.time, isPlayer: false })),
  ].sort((a, b) => a.time - b.time);
}
