import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cycleFrame, wheelTurns } from '../../engine/animation.js';

test('cycleFrame maps elapsed cycles onto frame indices', () => {
  assert.equal(cycleFrame(0, 4), 0);
  assert.equal(cycleFrame(0.25, 4), 1);
  assert.equal(cycleFrame(0.99, 4), 3);
  assert.equal(cycleFrame(1.0, 4), 0);
  assert.equal(cycleFrame(2.5, 6), 3);
});

test('cycleFrame handles negative phases (rolling backward)', () => {
  assert.equal(cycleFrame(-0.25, 4), 3);
});

test('a wheel turns once per circumference travelled', () => {
  const diameter = 11;
  assert.ok(Math.abs(wheelTurns(Math.PI * diameter, diameter) - 1) < 1e-9);
  assert.equal(wheelTurns(0, diameter), 0);
});
