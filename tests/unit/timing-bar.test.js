import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markerPosition, advanceMarker, judge } from '../../games/shared/timing-bar.js';

test('the marker sweeps left to right, then back (ping-pong)', () => {
  assert.equal(markerPosition(0), 0);
  assert.equal(markerPosition(0.5), 0.5);
  assert.equal(markerPosition(1), 1);
  assert.equal(markerPosition(1.5), 0.5);
  assert.equal(markerPosition(2), 0);
});

test('advancing by one sweep moves the marker across the whole bar', () => {
  assert.equal(advanceMarker(0, 0.8, 0.8), 1);
  assert.equal(advanceMarker(0, 0.5, 1), 0.5);
});

test('changing sweep speed never makes the marker jump', () => {
  // The phase carries over, so a faster sweep continues from where it was.
  const before = advanceMarker(0, 0.4, 1);
  const after = advanceMarker(before, 0, 0.5);
  assert.equal(markerPosition(after), markerPosition(before));
});

const ZONE = { zone: 0.4, perfect: 0.1, center: 0.5 };

test('judging: the gold center is perfect, the green zone good, the rest a miss', () => {
  assert.equal(judge(0.5, ZONE), 'perfect');
  assert.equal(judge(0.54, ZONE), 'perfect');
  assert.equal(judge(0.6, ZONE), 'good');
  assert.equal(judge(0.3, ZONE), 'good');
  assert.equal(judge(0.75, ZONE), 'miss');
  assert.equal(judge(0.0, ZONE), 'miss');
});

test('the zone can sit off center', () => {
  assert.equal(judge(0.8, { ...ZONE, center: 0.8 }), 'perfect');
  assert.equal(judge(0.5, { ...ZONE, center: 0.8 }), 'miss');
});
