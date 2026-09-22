/**
 * The marathon as pure data: 42.2 real seconds, one per kilometre. Each km
 * the player gets one judged press on the pace bar, which becomes that km's
 * split in marathon time (a perfect km is run in 2:48, a miss in 3:00).
 * Rivals follow hidden rhythms built from their stats: surges they pay back,
 * fading at the wall, and a finishing kick. Nothing here draws; the scene
 * reads this state.
 */
import { advanceMarker, markerPosition, judge } from '../shared/timing-bar.js';
import { createRng } from '../../engine/rng.js';
import { clamp } from '../../engine/math.js';

/** @typedef {import('../../data/athletes.js').Athlete} Athlete */
/** @typedef {import('../shared/timing-bar.js').Result} Result */
/** @typedef {'steady' | 'wall' | 'final'} PhaseName */

export const RACE_KM = 42.2;
/** 42 full kilometres, then the last 0.2. */
const SEGMENTS = Math.ceil(RACE_KM);
const EPSILON = 1e-6;

/**
 * Bar settings per phase. In the steady phase one sweep takes exactly one
 * km, so the marker crosses the middle halfway through every km and the
 * race has a beat. The wall breaks that beat with a faster marker and a
 * narrower zone, but fits exactly 7 sweeps into its 5 km, so the marker
 * lands back on the beat when the wall ends.
 */
const PHASES = {
  steady: { sweep: 1, zone: 0.36, perfect: 0.11 },
  wall: { sweep: 5 / 7, zone: 0.28, perfect: 0.1 },
  final: { sweep: 0.8, zone: 0.36, perfect: 0.12 },
};

/** Marathon seconds per km for each result. */
const SPLITS = {
  steady: { perfect: 168, good: 172, miss: 180 },
  wall: { perfect: 170, good: 175, miss: 186 },
  final: { perfect: 162, good: 169, miss: 182 },
};

/** @param {number} km */
export function phaseAt(km) {
  /** @type {PhaseName} */
  const name = km >= 40 ? 'final' : km >= 30 && km < 35 ? 'wall' : 'steady';
  return { name, center: 0.5, ...PHASES[name] };
}

/**
 * @param {Result} result
 * @param {PhaseName} phase
 */
export function splitFor(result, phase) {
  return SPLITS[phase][result];
}

/** @param {number} segment */
function segmentLength(segment) {
  return Math.min(1, RACE_KM - segment);
}

/** @param {number} km */
function segmentAt(km) {
  return Math.min(SEGMENTS - 1, Math.floor(km + EPSILON));
}

/**
 * A rival's split for every segment, drawn once at the start.
 * @param {Athlete} athlete
 * @param {ReturnType<typeof createRng>} rng
 */
function rivalSplits(athlete, rng) {
  const { power, endurance, technique } = athlete.stats;
  const base = 173.2 - (endurance - 8) * 0.9 - (power - 8) * 0.4;
  const form = (rng.next() - 0.5) * 2.4;
  const wobble = 3.4 - technique * 0.25;
  /** @type {number[]} */
  const splits = [];
  let payback = 0;
  for (let segment = 0; segment < SEGMENTS; segment++) {
    const phase = phaseAt(segment + 0.5).name;
    let split = base + form + (rng.next() - 0.5) * wobble + payback;
    payback = 0;
    if (rng.next() < 0.07) {
      split -= 4;
      payback = 2.5;
    }
    if (phase === 'wall') split += Math.max(0, 9 - endurance) * 1.6 + rng.next() * 2;
    if (phase === 'final') split -= (power - 5) * 1.1;
    splits.push(split * segmentLength(segment));
  }
  return splits;
}

/**
 * @typedef {object} Runner
 * @property {Athlete} athlete
 * @property {number[]} splits marathon seconds per segment (known so far)
 */

/**
 * @typedef {{ type: 'judged', result: Result, segment: number, late: boolean }
 *   | { type: 'km', km: number }
 *   | { type: 'phase', name: PhaseName }
 *   | { type: 'finish' }} RaceEvent
 */

/**
 * @param {{ player: Athlete, rivals: Athlete[], seed: number }} options
 */
export function createRace({ player, rivals, seed }) {
  const rng = createRng(seed);
  return {
    /** Real seconds elapsed, which is also kilometres run. */
    km: 0,
    /** Pace bar phase (sweeps elapsed). */
    marker: 0,
    finished: false,
    /** @type {Result[]} */
    results: [],
    /** @type {Runner} */
    player: { athlete: player, splits: [] },
    /** @type {Runner[]} */
    rivals: rivals.map((athlete) => ({ athlete, splits: rivalSplits(athlete, rng) })),
  };
}

/** @typedef {ReturnType<typeof createRace>} Race */

/**
 * @param {Race} race
 * @param {number} segment
 * @param {Result} result
 * @param {PhaseName} phase
 */
function record(race, segment, result, phase) {
  race.results[segment] = result;
  race.player.splits[segment] = splitFor(result, phase) * segmentLength(segment);
  // The last 0.2 km is too short to judge fairly; it is run at the pace of
  // the last full kilometre.
  if (segment === SEGMENTS - 2) record(race, SEGMENTS - 1, result, phase);
}

/**
 * Advances the race by one fixed step.
 * @param {Race} race
 * @param {number} dt
 * @param {boolean} pressed the button went down this step
 * @returns {RaceEvent[]}
 */
export function stepRace(race, dt, pressed) {
  /** @type {RaceEvent[]} */
  const events = [];
  if (race.finished) return events;

  const segment = segmentAt(race.km);
  const phase = phaseAt(race.km);
  if (pressed && race.results[segment] === undefined) {
    const result = judge(markerPosition(race.marker), phase);
    record(race, segment, result, phase.name);
    events.push({ type: 'judged', result, segment, late: false });
  }

  race.marker = advanceMarker(race.marker, dt, phase.sweep);
  race.km = Math.min(RACE_KM, race.km + dt);
  const done = race.km >= RACE_KM - EPSILON;
  const reached = done ? SEGMENTS : segmentAt(race.km);

  for (let s = segment; s < reached; s++) {
    if (race.results[s] === undefined) {
      record(race, s, 'miss', phaseAt(s + 0.5).name);
      events.push({ type: 'judged', result: 'miss', segment: s, late: true });
    }
    if (s + 1 < SEGMENTS) events.push({ type: 'km', km: s + 1 });
  }
  const nextPhase = phaseAt(race.km).name;
  if (nextPhase !== phase.name) events.push({ type: 'phase', name: nextPhase });
  if (done) {
    race.km = RACE_KM;
    race.finished = true;
    events.push({ type: 'finish' });
  }
  return events;
}

/**
 * Marathon time a runner had reached at `km`. For the player's current
 * unjudged km, a provisional "good" split is assumed.
 * @param {Runner} runner
 * @param {number} km
 */
export function elapsedAt(runner, km) {
  const segment = segmentAt(km);
  let time = 0;
  for (let s = 0; s < segment; s++) time += runner.splits[s];
  const current = runner.splits[segment] ?? splitFor('good', phaseAt(km).name) * segmentLength(segment);
  return time + current * clamp((km - segment) / segmentLength(segment), 0, 1);
}

/**
 * A runner's pace in marathon seconds per km at `km` (their split for that
 * km, scaled up for the short last segment).
 * @param {Runner} runner
 * @param {number} km
 */
export function paceAt(runner, km) {
  const segment = segmentAt(km);
  const split = runner.splits[segment];
  return split === undefined ? splitFor('good', phaseAt(km).name) : split / segmentLength(segment);
}

/**
 * @typedef {object} Standing
 * @property {Athlete} athlete
 * @property {number} time marathon seconds at the reference point
 * @property {boolean} isPlayer
 */

/**
 * Everyone ranked by time at the current km (less time = further ahead).
 * @param {Race} race
 * @returns {Standing[]}
 */
export function standings(race) {
  return [race.player, ...race.rivals]
    .map((runner) => ({
      athlete: runner.athlete,
      time: elapsedAt(runner, race.km),
      isPlayer: runner === race.player,
    }))
    .sort((a, b) => a.time - b.time);
}

/**
 * Finishing order by total time.
 * @param {Race} race
 * @returns {Standing[]}
 */
export function finalStandings(race) {
  return standings({ ...race, km: RACE_KM });
}
