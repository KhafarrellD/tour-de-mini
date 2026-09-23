import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitScale, chooseFit, WIDTH, HEIGHT } from '../../engine/screen.js';

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

test('a phone held upright turns the game sideways to double its size', () => {
  // Upright, a 375px phone can only manage 3 device pixels per game pixel.
  // Turned, the same phone manages 6, so the picture is twice the size.
  const fit = chooseFit(375, 812, 3);
  assert.equal(fit.rotated, true);
  assert.equal(fit.scale, 6);
  assert.equal(fit.cssWidth, 640);
  assert.equal(fit.cssHeight, 360);
  // It still fits: turned, the long side of the frame lies along the screen.
  assert.ok(fit.cssWidth <= 812);
  assert.ok(fit.cssHeight <= 375);
});

test('a phone already turned is left alone', () => {
  const fit = chooseFit(812, 375, 3);
  assert.equal(fit.rotated, false);
  assert.equal(fit.scale, 6);
});

test('desktops and tablets are never turned sideways', () => {
  assert.equal(chooseFit(1440, 900, 1).rotated, false);
  assert.equal(chooseFit(900, 1440, 1).rotated, false, 'a tall desktop window stays upright');
  assert.equal(chooseFit(768, 1024, 2).rotated, false, 'a tablet in portrait stays upright');
});

test('turning the game is only worth it when it actually gains size', () => {
  // A square-ish small window gains nothing by turning, so it should not.
  const fit = chooseFit(400, 420, 2);
  assert.equal(fit.rotated, false);
  assert.equal(fit.scale, fitScale(400, 420, 2).scale);
});
