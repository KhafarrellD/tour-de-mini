import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatClock, formatShort, ordinal } from '../../engine/format.js';

test('race clocks show hours, minutes and seconds', () => {
  assert.equal(formatClock(7086), '1:58:06');
  assert.equal(formatClock(0), '0:00:00');
  assert.equal(formatClock(3599.9), '0:59:59');
});

test('ordinals for finishing positions', () => {
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal), [
    '1ST',
    '2ND',
    '3RD',
    '4TH',
    '11TH',
    '12TH',
    '13TH',
    '21ST',
    '22ND',
  ]);
});

test('short races show tenths, not hours', () => {
  assert.equal(formatShort(66.94), '1:06.9');
  assert.equal(formatShort(9.04), '0:09.0');
  assert.equal(formatShort(125.5), '2:05.5');
});
