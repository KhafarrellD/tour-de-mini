import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DESCENT_METRES,
  createDescent,
  stepDescent,
  cornerAhead,
  descentStandings,
  curvatureAt,
} from '../../games/cycling/descent.js';
import { athletesFor } from '../../data/athletes.js';

const STEP = 1 / 60;
const [player, ...rest] = athletesFor('cycling');
const rivals = rest.slice(0, 4);

/** @param {number} seed */
const newDescent = (seed = 1) => createDescent({ athlete: player, rivals, seed });

/** @typedef {ReturnType<typeof newDescent>} Descent */

/** @param {Descent} state */
const placeOf = (state) => descentStandings(state).findIndex((row) => row.isPlayer) + 1;

/**
 * @param {Descent} state
 * @param {(state: Descent) => boolean} brake
 */
function ride(state, brake) {
  const events = [];
  for (let step = 0; !state.finished && step < 60 * 400; step++) {
    events.push(...stepDescent(state, STEP, brake(state)));
  }
  return { state, events };
}

/** Brakes so as to arrive at every corner on its safe speed. */
const cleanRider = (/** @type {Descent} */ state) => {
  const corner = cornerAhead(state);
  if (!corner) return false;
  const distance = Math.max(0.1, corner.at - state.metres);
  // Braking distance for the speed we need to lose, plus a margin.
  const excess = state.speed - corner.safeSpeed;
  if (excess <= 0) return false;
  return distance <= (state.speed ** 2 - corner.safeSpeed ** 2) / (2 * 8.5) + 6;
};

test('the descent is a course of corners, each with a safe speed', () => {
  const state = newDescent();
  assert.ok(DESCENT_METRES >= 1200 && DESCENT_METRES <= 2000);
  assert.ok(state.course.length >= 8, `only ${state.course.length} corners`);
  for (const corner of state.course) {
    assert.ok(corner.at > 0 && corner.at < DESCENT_METRES);
    assert.ok(corner.safeSpeed >= 8 && corner.safeSpeed <= 20, `safe speed ${corner.safeSpeed}`);
    assert.ok(corner.direction === 1 || corner.direction === -1);
  }
  for (let i = 1; i < state.course.length; i++) {
    assert.ok(state.course[i].at - state.course[i - 1].at >= 60, 'corners have room between them');
  }
});

test('the same seed gives the same course; different seeds differ', () => {
  const shape = (/** @type {number} */ seed) => newDescent(seed).course.map((c) => `${c.at}:${c.direction}`).join();
  assert.equal(shape(4), shape(4));
  assert.notEqual(shape(4), shape(5));
});

test('the next corner is visible before you reach it', () => {
  const state = newDescent();
  const corner = cornerAhead(state);
  assert.ok(corner);
  assert.ok(corner.at > state.metres);
  while (state.metres < corner.at - 1) stepDescent(state, STEP, false);
  assert.equal(cornerAhead(state)?.at, corner.at);
});

test('letting the bike run speeds it up; braking slows it down', () => {
  const state = newDescent();
  for (let i = 0; i < 120; i++) stepDescent(state, STEP, false);
  const free = state.speed;
  assert.ok(free > 14, `rolling downhill should be quick, got ${free.toFixed(1)}`);
  for (let i = 0; i < 60; i++) stepDescent(state, STEP, true);
  assert.ok(state.speed < free - 4, 'braking scrubs real speed');
});

test('arriving far too fast crashes; a little too fast wobbles', () => {
  /** @param {number} overshoot */
  const takeFirstCorner = (overshoot) => {
    const state = newDescent();
    const corner = state.course[0];
    /** @type {string[]} */
    const seen = [];
    while (state.metres < corner.at + 5) {
      state.speed = corner.safeSpeed * overshoot;
      for (const event of stepDescent(state, STEP, false)) seen.push(event.type);
    }
    return seen;
  };
  assert.ok(takeFirstCorner(1).includes('clean'), 'on the safe speed it is clean');
  assert.ok(takeFirstCorner(1.12).includes('wobble'), 'slightly over wobbles');
  assert.ok(takeFirstCorner(1.6).includes('crash'), 'way over crashes');
});

test('a crash costs more time than a wobble', () => {
  /** @param {number} overshoot */
  const timeLost = (overshoot) => {
    const state = newDescent();
    const corner = state.course[0];
    while (state.metres < corner.at - 1) stepDescent(state, STEP, cleanRider(state));
    state.speed = corner.safeSpeed * overshoot;
    const before = state.time;
    const from = state.metres;
    while (state.metres < from + 120) stepDescent(state, STEP, false);
    return state.time - before;
  };
  const clean = timeLost(1);
  const wobble = timeLost(1.12);
  const crash = timeLost(1.6);
  assert.ok(wobble > clean, `wobble ${wobble.toFixed(2)} vs clean ${clean.toFixed(2)}`);
  assert.ok(crash > wobble + 1, `crash ${crash.toFixed(2)} vs wobble ${wobble.toFixed(2)}`);
});

test('the road bends through a corner and runs straight between them', () => {
  const state = newDescent();
  const corner = state.course[0];
  assert.ok(Math.abs(curvatureAt(state, corner.at)) > 0.005, 'the apex bends');
  assert.equal(Math.sign(curvatureAt(state, corner.at)), corner.direction, 'it bends the right way');
  assert.ok(Math.abs(curvatureAt(state, corner.at - 60)) < 0.002, 'the run-in is straight');
});

test('a clean run takes about a minute and beats hesitating or charging', () => {
  const clean = ride(newDescent(), cleanRider).state;
  const timid = ride(newDescent(), () => true).state;
  const reckless = ride(newDescent(), () => false).state;
  assert.ok(clean.finished && clean.metres >= DESCENT_METRES);
  assert.ok(clean.time > 55 && clean.time < 100, `clean run took ${clean.time.toFixed(1)} s`);
  assert.ok(timid.time > clean.time + 10, `braking all the way took ${timid.time.toFixed(1)} s`);
  assert.ok(reckless.time > clean.time, `never braking took ${reckless.time.toFixed(1)} s`);
});

test('never braking means crashes, not a fast time', () => {
  const { events } = ride(newDescent(), () => false);
  const crashes = events.filter((event) => event.type === 'crash').length;
  assert.ok(crashes >= 3, `only ${crashes} crashes while never braking`);
});

test('rivals get times and the standings are sorted', () => {
  const { state } = ride(newDescent(), cleanRider);
  const rows = descentStandings(state);
  assert.equal(rows.length, 5);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i].time >= rows[i - 1].time);
  for (const row of rows) assert.ok(row.time > 40 && row.time < 200);
});

test('balance: a clean descent wins, a wild one loses', () => {
  let cleanPlaces = 0;
  let recklessPlaces = 0;
  for (let seed = 1; seed <= 10; seed++) {
    cleanPlaces += placeOf(ride(newDescent(seed), cleanRider).state);
    recklessPlaces += placeOf(ride(newDescent(seed), () => false).state);
  }
  assert.ok(cleanPlaces / 10 <= 1.5, `clean rider averaged ${(cleanPlaces / 10).toFixed(2)}`);
  assert.equal(recklessPlaces / 10, 5, 'never braking finishes last');
});
