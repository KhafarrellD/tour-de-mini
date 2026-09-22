import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDirector } from '../../engine/director.js';

const idle = { pressed: false, released: false, held: false, pressedAt: -1 };

/** @param {string[]} log @param {string} name */
function scene(log, name) {
  return {
    name,
    update: () => void log.push(`${name}.update`),
    render: () => void log.push(`${name}.render`),
  };
}

test('the director runs the current scene', () => {
  /** @type {string[]} */
  const log = [];
  const director = createDirector(scene(log, 'a'));
  director.update(1 / 60, idle);
  director.render(/** @type {any} */ (null));
  assert.deepEqual(log, ['a.update', 'a.render']);
});

test('switching scenes takes effect on the next update', () => {
  /** @type {string[]} */
  const log = [];
  const director = createDirector(scene(log, 'a'));
  director.go(scene(log, 'b'));
  director.update(1 / 60, idle);
  assert.deepEqual(log, ['b.update']);
});

test('a scene switch plays a short wipe that ends on its own', () => {
  const director = createDirector(scene([], 'a'));
  director.go(scene([], 'b'));
  assert.ok(director.transition > 0);
  for (let i = 0; i < 60; i++) director.update(1 / 60, idle);
  assert.equal(director.transition, 0);
});

test('taps during the wipe still reach the new scene (quick players are not ignored)', () => {
  /** @type {boolean[]} */
  const seen = [];
  const director = createDirector(scene([], 'a'));
  director.go({ name: 'b', update: (_dt, button) => void seen.push(button.pressed), render: () => {} });
  director.update(1 / 60, { pressed: true, released: true, held: false, pressedAt: 0 });
  assert.deepEqual(seen, [true]);
});

test('the director reports which scene is showing', () => {
  const director = createDirector(scene([], 'title'));
  assert.equal(director.name, 'title');
  director.go(scene([], 'race'));
  director.update(1 / 60, idle);
  assert.equal(director.name, 'race');
});
