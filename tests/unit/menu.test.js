import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMenu, HOLD_TO_SELECT } from '../../games/shared/menu.js';

const STEP = 1 / 60;
const up = { pressed: false, released: false, held: false, pressedAt: -1 };
const down = { pressed: true, released: false, held: true, pressedAt: 0 };
const holding = { pressed: false, released: false, held: true, pressedAt: 0 };
const release = { pressed: false, released: true, held: false, pressedAt: 0 };
const tap = { pressed: true, released: true, held: false, pressedAt: 0 };

/**
 * @param {ReturnType<typeof createMenu>} menu
 * @param {number} seconds
 */
function hold(menu, seconds) {
  /** @type {(string | null)[]} */
  const events = [menu.update(STEP, down)];
  for (let t = STEP; t < seconds; t += STEP) events.push(menu.update(STEP, holding));
  events.push(menu.update(STEP, release));
  return events.filter(Boolean);
}

test('a short tap moves to the next item and wraps around', () => {
  const menu = createMenu(3);
  menu.update(STEP, up);
  assert.equal(menu.update(STEP, tap), 'next');
  assert.equal(menu.index, 1);
  menu.update(STEP, tap);
  menu.update(STEP, tap);
  assert.equal(menu.index, 0);
});

test('a press released before the hold time is a tap', () => {
  const menu = createMenu(3);
  menu.update(STEP, up);
  assert.deepEqual(hold(menu, HOLD_TO_SELECT / 2), ['next']);
});

test('holding selects once, and releasing afterwards does not also move', () => {
  const menu = createMenu(3);
  menu.update(STEP, up);
  assert.deepEqual(hold(menu, HOLD_TO_SELECT + 0.2), ['select']);
  assert.equal(menu.index, 0);
});

test('the hold meter fills while held and resets on release', () => {
  const menu = createMenu(3);
  menu.update(STEP, up);
  menu.update(STEP, down);
  for (let t = 0; t < HOLD_TO_SELECT / 2; t += STEP) menu.update(STEP, holding);
  assert.ok(menu.holdProgress > 0.4 && menu.holdProgress < 0.7);
  menu.update(STEP, release);
  assert.equal(menu.holdProgress, 0);
});

test('with a single item a tap selects it', () => {
  const menu = createMenu(1);
  menu.update(STEP, up);
  assert.equal(menu.update(STEP, tap), 'select');
});

test('a button still held from the previous screen does nothing until released', () => {
  const menu = createMenu(3);
  for (let t = 0; t < HOLD_TO_SELECT * 2; t += STEP) assert.equal(menu.update(STEP, holding), null);
  assert.equal(menu.update(STEP, release), null);
  assert.equal(menu.update(STEP, tap), 'next');
});

test('the starting item can be chosen', () => {
  assert.equal(createMenu(4, 2).index, 2);
});
