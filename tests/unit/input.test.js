import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createButton } from '../../engine/input.js';

test('a press shows up as pressed and held on the next poll only', () => {
  const button = createButton();
  button.press(100);
  assert.deepEqual(button.poll(), { pressed: true, released: false, held: true, pressedAt: 100 });
  assert.deepEqual(button.poll(), { pressed: false, released: false, held: true, pressedAt: 100 });
});

test('a release is reported once', () => {
  const button = createButton();
  button.press(0);
  button.poll();
  button.release(50);
  assert.equal(button.poll().released, true);
  assert.equal(button.poll().released, false);
  assert.equal(button.poll().held, false);
});

test('a tap shorter than one update still registers', () => {
  const button = createButton();
  button.press(10);
  button.release(12);
  const state = button.poll();
  assert.equal(state.pressed, true);
  assert.equal(state.released, true);
  assert.equal(state.held, false);
});

test('keyboard auto-repeat while held does not create new presses', () => {
  const button = createButton();
  button.press(0);
  button.poll();
  button.press(30);
  button.press(60);
  const state = button.poll();
  assert.equal(state.pressed, false);
  assert.equal(state.pressedAt, 0);
});

test('a release without a press is ignored', () => {
  const button = createButton();
  button.release(5);
  assert.deepEqual(button.poll(), { pressed: false, released: false, held: false, pressedAt: -1 });
});

test('reset clears a stuck button (window lost focus)', () => {
  const button = createButton();
  button.press(0);
  button.reset();
  assert.equal(button.poll().held, false);
});
