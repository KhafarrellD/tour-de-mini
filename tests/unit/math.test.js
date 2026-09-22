import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clamp, lerp, damp, approach, wrap } from '../../engine/math.js';

test('clamp keeps values inside the range', () => {
  assert.equal(clamp(5, 0, 3), 3);
  assert.equal(clamp(-1, 0, 3), 0);
  assert.equal(clamp(2, 0, 3), 2);
});

test('lerp interpolates linearly', () => {
  assert.equal(lerp(10, 20, 0.25), 12.5);
});

test('damp eases toward the target the same way at any step size', () => {
  let coarse = 0;
  coarse = damp(coarse, 100, 5, 0.1);
  let fine = 0;
  for (let i = 0; i < 10; i++) fine = damp(fine, 100, 5, 0.01);
  assert.ok(Math.abs(coarse - fine) < 1e-9);
  assert.ok(coarse > 0 && coarse < 100);
});

test('approach moves by at most the given delta and never overshoots', () => {
  assert.equal(approach(0, 10, 3), 3);
  assert.equal(approach(9, 10, 3), 10);
  assert.equal(approach(10, 0, 4), 6);
});

test('wrap maps any value into [0, size)', () => {
  assert.equal(wrap(5, 4), 1);
  assert.equal(wrap(-1, 4), 3);
  assert.equal(wrap(8, 4), 0);
});
