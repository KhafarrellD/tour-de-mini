import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layerOffset } from '../../engine/parallax.js';

test('a layer scrolls by its depth factor', () => {
  assert.equal(layerOffset(100, 0.5, 320), -50);
});

test('the offset wraps so a repeating tile always covers the screen', () => {
  assert.equal(layerOffset(700, 1, 320), -60);
  assert.equal(layerOffset(-10, 1, 320), -310);
});

test('offsets are whole pixels so layers never blur', () => {
  assert.ok(Number.isInteger(layerOffset(33.3, 0.37, 320)));
});

test('a static layer (factor 0) never moves', () => {
  assert.equal(layerOffset(12345, 0, 320), 0);
});
