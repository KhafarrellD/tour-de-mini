/**
 * The final 2 km of a bike race, as pure data.
 *
 * Tapping lifts your cadence, cadence lifts your speed, and speed costs
 * stamina. Tapping flat out pins the cadence and empties the tank long
 * before the line, so mashing loses to a rider who paces the effort and
 * sits in the draft. Three attack windows (500, 200 and 100 m to go) put a
 * timing bar on screen: hit the green zone for an attack, the gold middle
 * for a perfect one. Nothing here draws; the scene reads this state.
 */
import { advanceMarker, markerPosition, judge } from '../shared/timing-bar.js';
import { createRng } from '../../engine/rng.js';
import { clamp, damp } from '../../engine/math.js';

/** @typedef {import('../../data/athletes.js').Athlete} Athlete */
/** @typedef {import('../shared/timing-bar.js').Result} Result */

export const SPRINT_METRES = 2000;
/** Metres to go where the attack windows open. */
export const ATTACK_POINTS = /** @type {const} */ ([500, 200, 100]);

/** How long an attack window stays open. */
const WINDOW_SECONDS = 2.4;
const WINDOW_BAR = { sweep: 0.75, zone: 0.34, perfect: 0.1, center: 0.5 };
/** Speed a rider carries with no effort at all, in metres per second. */
const FREEWHEEL = 20;
/** Extra speed at full cadence. */
const CADENCE_SPEED = 14.5;
/** Sitting in the wheel of a rider this far ahead gives shelter. */
const DRAFT_RANGE = { min: 1.5, max: 14 };
const DRAFT_SPEED = 2.2;
const DRAFT_SAVING = 0.4;

/**
 * @typedef {object} Attack
 * @property {number} boost extra metres per second, decaying
 * @property {Result} result
 */

/**
 * @param {{ athlete: Athlete, rivals: Athlete[], seed: number }} options
 */
export function createSprint({ athlete, rivals, seed }) {
  const rng = createRng(seed);
  return {
    time: 0,
    finished: false,
    /** Metres still to ride. */
    toGo: SPRINT_METRES,
    /** @type {{ at: number, marker: number, sweep: number, zone: number, perfect: number, endsAt: number, used: boolean } | null} */
    window: null,
    nextWindow: 0,
    player: {
      athlete,
      metres: 0,
      speed: 26,
      cadence: 0.45,
      stamina: 1,
      boost: 0,
      /** @type {Result[]} */
      attacks: [],
      emptied: false,
      /** @type {number | null} */
      time: null,
    },
    rivals: rivals.map((rival) => createRival(rival, rng)),
  };
}

/** @typedef {ReturnType<typeof createSprint>} Sprint */
/** @typedef {ReturnType<typeof createRival>} Rival */

/**
 * A rival rides to a plan: a cruising speed from their stats, one surge
 * they pay for afterwards, and a kick in the last 150 m.
 * @param {Athlete} athlete
 * @param {ReturnType<typeof createRng>} rng
 */
function createRival(athlete, rng) {
  const { power, endurance } = athlete.stats;
  return {
    athlete,
    metres: rng.next() * 40 - 20,
    speed: 26,
    /** @type {number | null} */
    time: null,
    cruise: 25.9 + power * 0.2 + endurance * 0.08 + (rng.next() - 0.5) * 2,
    surgeAt: 260 + rng.next() * 520,
    surgeSize: 1.4 + power * 0.18,
    kick: 0.9 + power * 0.22,
    fade: 0.5 + Math.max(0, 9 - endurance) * 0.45,
  };
}

/**
 * @typedef {{ type: 'window', at: number }
 *   | { type: 'attack', result: Result, at: number }
 *   | { type: 'empty' }
 *   | { type: 'finish' }} SprintEvent
 */

/**
 * True while the player is sheltered behind a rival's wheel.
 * @param {Sprint} state
 */
export function playerDraft(state) {
  return state.rivals.some((rival) => {
    const gap = rival.metres - state.player.metres;
    return gap >= DRAFT_RANGE.min && gap <= DRAFT_RANGE.max;
  });
}

/**
 * Advances the sprint by one fixed step.
 * @param {Sprint} state
 * @param {number} dt
 * @param {boolean} pressed
 * @returns {SprintEvent[]}
 */
export function stepSprint(state, dt, pressed) {
  /** @type {SprintEvent[]} */
  const events = [];
  if (state.finished) return events;
  const { player } = state;
  state.time += dt;

  // Attack windows
  if (state.window) {
    state.window.marker = advanceMarker(state.window.marker, dt, state.window.sweep);
    if (pressed && !state.window.used) {
      state.window.used = true;
      const result = judge(markerPosition(state.window.marker), state.window);
      player.attacks.push(result);
      if (result !== 'miss') {
        player.boost += result === 'perfect' ? 8 : 5;
        player.stamina = clamp(player.stamina + (result === 'perfect' ? 0.12 : 0.04), 0, 1);
      }
      events.push({ type: 'attack', result, at: state.window.at });
      pressed = false;
    }
    if (state.time >= state.window.endsAt) state.window = null;
  } else if (state.nextWindow < ATTACK_POINTS.length && state.toGo <= ATTACK_POINTS[state.nextWindow]) {
    const at = ATTACK_POINTS[state.nextWindow++];
    state.window = { at, marker: 0, ...WINDOW_BAR, endsAt: state.time + WINDOW_SECONDS, used: false };
    events.push({ type: 'window', at });
  }

  // Pedalling: each tap lifts the cadence, with less effect the higher it is.
  const wasEmpty = player.emptied;
  const tapGain = player.emptied ? 0.06 : 0.22;
  if (pressed) player.cadence = clamp(player.cadence + tapGain * (1 - player.cadence * 0.7), 0, 1);
  // Cadence bleeds away in proportion to itself, so tap rate maps smoothly
  // onto speed instead of falling off a cliff.
  player.cadence = Math.max(0, player.cadence - (player.emptied ? 1.5 : 0.9) * player.cadence * dt);

  const drafting = playerDraft(state);
  // Effort costs rise steeply with cadence, so going flat out empties the
  // tank in about twenty seconds while a steady rhythm lasts the 2 km.
  const effort = Math.pow(player.cadence, 3.5);
  const drain = effort * 0.075 * (drafting ? DRAFT_SAVING : 1);
  const recovery = player.cadence < 0.35 ? 0.035 * (drafting ? 1.7 : 1) : 0;
  player.stamina = clamp(player.stamina - drain * dt + recovery * dt, 0, 1);
  player.emptied = player.stamina <= 0;
  if (player.emptied && !wasEmpty) events.push({ type: 'empty' });

  const power = 0.98 + player.athlete.stats.power * 0.013;
  const target =
    (FREEWHEEL + player.cadence * CADENCE_SPEED * power) * (player.emptied ? 0.74 : 1) +
    (drafting ? DRAFT_SPEED : 0) +
    player.boost;
  player.speed = damp(player.speed, target, 1.7, dt);
  player.boost = Math.max(0, player.boost - 1.25 * dt);
  player.metres += player.speed * dt;
  state.toGo = Math.max(0, SPRINT_METRES - player.metres);

  for (const rival of state.rivals) stepRival(state, rival, dt);

  if (player.metres >= SPRINT_METRES && player.time === null) {
    player.time = state.time;
    state.finished = true;
    // Rivals still on the road finish at their current speed.
    for (const rival of state.rivals) {
      if (rival.time === null) rival.time = state.time + (SPRINT_METRES - rival.metres) / rival.speed;
    }
    events.push({ type: 'finish' });
  }
  return events;
}

/**
 * @param {Sprint} state
 * @param {Rival} rival
 * @param {number} dt
 */
function stepRival(state, rival, dt) {
  if (rival.time !== null) return;
  const toGo = SPRINT_METRES - rival.metres;
  const surging = toGo <= rival.surgeAt && toGo > rival.surgeAt - 300;
  const kicking = toGo <= 150;
  const paying = toGo <= rival.surgeAt - 300;
  const sheltered = state.rivals.some((other) => {
    const gap = other.metres - rival.metres;
    return other !== rival && gap >= DRAFT_RANGE.min && gap <= DRAFT_RANGE.max;
  });
  const target =
    rival.cruise +
    (surging ? rival.surgeSize : 0) +
    (kicking ? rival.kick : 0) -
    (paying ? rival.fade : 0) +
    (sheltered ? DRAFT_SPEED : 0);
  rival.speed = damp(rival.speed, target, 1.5, dt);
  rival.metres += rival.speed * dt;
  if (rival.metres >= SPRINT_METRES) rival.time = state.time;
}

/**
 * @typedef {object} SprintStanding
 * @property {Athlete} athlete
 * @property {number} metres
 * @property {number} time seconds; projected while the race is on
 * @property {boolean} isPlayer
 */

/**
 * Everyone ordered by how far up the road they are (or their finish time).
 * @param {Sprint} state
 * @returns {SprintStanding[]}
 */
export function sprintStandings(state) {
  const rows = [state.player, ...state.rivals].map((rider) => ({
    athlete: rider.athlete,
    metres: rider.metres,
    time: rider.time ?? state.time + (SPRINT_METRES - rider.metres) / Math.max(1, rider.speed),
    isPlayer: rider === state.player,
  }));
  return rows.sort((a, b) => a.time - b.time);
}
