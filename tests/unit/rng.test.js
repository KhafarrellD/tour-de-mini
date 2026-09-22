import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../../engine/rng.js';

test('the same seed gives the same sequence', () => {
  const a = createRng(42);
  const b = createRng(42);
  for (let i = 0; i < 20; i++) assert.equal(a.next(), b.next());
});

test('different seeds give different sequences', () => {
  assert.notEqual(createRng(1).next(), createRng(2).next());
});

test('values stay in [0, 1) and integers in range', () => {
  const rng = createRng(7);
  for (let i = 0; i < 1000; i++) {
    const value = rng.next();
    assert.ok(value >= 0 && value < 1);
    const int = rng.int(3, 5);
    assert.ok(int >= 3 && int <= 5 && Number.isInteger(int));
  }
});

test('pick chooses an element of the list', () => {
  const rng = createRng(3);
  for (let i = 0; i < 50; i++) assert.ok(['a', 'b', 'c'].includes(rng.pick(['a', 'b', 'c'])));
});
