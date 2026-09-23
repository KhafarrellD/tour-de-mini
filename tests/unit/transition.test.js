import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROMPTS, createTransition, stepTransition, PROMPT_SECONDS } from '../../games/ironman/transition.js';
import { markerPosition } from '../../games/shared/timing-bar.js';
import { STEP, onTheMark } from '../helpers/players.js';


/** @param {number} seed */
const newTransition = (seed = 1) => createTransition({ seed });

/** @typedef {ReturnType<typeof newTransition>} Transition */

/**
 * @param {Transition} state
 * @param {(state: Transition) => boolean} press
 */
function run(state, press) {
  const events = [];
  for (let step = 0; !state.done && step < 60 * 30; step++) {
    events.push(...stepTransition(state, STEP, press(state)));
  }
  return { state, events };
}

test('three prompts, in order: rack the bike, shoes on, go', () => {
  assert.deepEqual([...PROMPTS], ['RACK THE BIKE', 'SHOES ON', 'GO']);
  const { events } = run(newTransition(), onTheMark);
  const order = events.filter((e) => e.type === 'prompt').map((e) => e.prompt);
  assert.deepEqual(order, [...PROMPTS]);
});

test('hitting all three cleanly costs almost nothing', () => {
  const { state } = run(newTransition(), onTheMark);
  assert.ok(state.done);
  assert.ok(state.penalty < 0.5, `clean transition cost ${state.penalty.toFixed(2)} s`);
  assert.equal(state.results.length, 3);
});

test('mistiming costs time, and ignoring a prompt costs the most', () => {
  // Inside the green but off the gold: a good hit, not a perfect one.
  const sloppy = run(newTransition(), (state) => markerPosition(state.marker) > 0.63).state;
  const asleep = run(newTransition(), () => false).state;
  const clean = run(newTransition(), onTheMark).state;
  assert.ok(sloppy.penalty > clean.penalty, `sloppy ${sloppy.penalty} vs clean ${clean.penalty}`);
  assert.ok(asleep.penalty > sloppy.penalty, `asleep ${asleep.penalty} vs sloppy ${sloppy.penalty}`);
  assert.deepEqual(asleep.results, ['miss', 'miss', 'miss']);
});

test('a prompt times out on its own, so the transition always ends', () => {
  const { state } = run(newTransition(), () => false);
  assert.ok(state.done);
  assert.ok(state.time <= PROMPT_SECONDS * 3 + 0.2, `transition took ${state.time.toFixed(1)} s`);
});

test('the transition is over in a few seconds', () => {
  const { state } = run(newTransition(), onTheMark);
  assert.ok(state.time > 1 && state.time < 8, `transition took ${state.time.toFixed(1)} s`);
});
