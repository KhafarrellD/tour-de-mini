import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitScale, WIDTH, HEIGHT } from '../../engine/screen.js';

test('the internal resolution is 320x180', () => {
  assert.equal(WIDTH, 320);
  assert.equal(HEIGHT, 180);
});

test('desktop 1440x900 scales 4x to 1280x720', () => {
  assert.deepEqual(fitScale(1440, 900, 1), { scale: 4, cssWidth: 1280, cssHeight: 720 });
});

test('tablet 768x1024 on a 2x screen fits 640x360 CSS pixels', () => {
  assert.deepEqual(fitScale(768, 1024, 2), { scale: 4, cssWidth: 640, cssHeight: 360 });
});

test('a portrait phone 375 wide keeps whole device pixels per game pixel', () => {
  const fit = fitScale(375, 812, 3);
  assert.equal(fit.scale, 3);
  assert.equal(fit.cssWidth, 320);
  assert.ok(fit.cssWidth <= 375);
});

test('a landscape phone is limited by its height', () => {
  assert.deepEqual(fitScale(812, 375, 3), { scale: 6, cssWidth: 640, cssHeight: 360 });
});

test('fractional device pixel ratios still land on whole device pixels', () => {
  const fit = fitScale(1366, 768, 1.25);
  assert.equal(fit.scale, 5);
  assert.equal(fit.cssWidth * 1.25, 1600);
});

test('a window smaller than the game still renders at 1x', () => {
  assert.equal(fitScale(200, 100, 1).scale, 1);
});
