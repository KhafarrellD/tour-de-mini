import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepAccumulator, STEP } from '../../engine/loop.js';

/**
 * Runs `seconds` of simulated wall-clock time at the given display refresh
 * rate and returns how many fixed updates the loop performed.
 * @param {number} hz
 * @param {number} seconds
 */
function updatesOver(hz, seconds) {
  let accumulator = 0;
  let total = 0;
  for (let i = 0; i < Math.round(hz * seconds); i++) {
    const result = stepAccumulator(accumulator, 1 / hz);
    accumulator = result.accumulator;
    total += result.steps;
  }
  return total;
}

test('the fixed step is 60 updates per second', () => {
  assert.equal(STEP, 1 / 60);
});

test('a 60 Hz display gets exactly one update per frame', () => {
  let accumulator = 0;
  for (let i = 0; i < 600; i++) {
    const result = stepAccumulator(accumulator, 1 / 60);
    assert.equal(result.steps, 1, `frame ${i}`);
    accumulator = result.accumulator;
  }
});

test('game speed does not depend on refresh rate', () => {
  for (const hz of [30, 60, 75, 120, 144, 165]) {
    const updates = updatesOver(hz, 10);
    assert.ok(Math.abs(updates - 600) <= 1, `${hz} Hz ran ${updates} updates in 10 s`);
  }
});

test('a 30 Hz display runs two updates per frame', () => {
  assert.equal(stepAccumulator(0, 1 / 30).steps, 2);
});

test('a long stall (background tab) is capped instead of fast-forwarding', () => {
  const result = stepAccumulator(0, 5);
  assert.equal(result.steps, 5);
  assert.ok(result.accumulator < STEP);
});

test('negative frame times (clock hiccups) run no updates', () => {
  assert.deepEqual(stepAccumulator(0, -0.01), { steps: 0, accumulator: 0 });
});
