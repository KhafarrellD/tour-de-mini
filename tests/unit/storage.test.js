import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBestScores } from '../../engine/storage.js';

function memoryStorage() {
  /** @type {Map<string, string>} */
  const data = new Map();
  return {
    getItem: (/** @type {string} */ key) => data.get(key) ?? null,
    setItem: (/** @type {string} */ key, /** @type {string} */ value) => void data.set(key, value),
  };
}

test('the first result is always a new best', () => {
  const scores = createBestScores(memoryStorage());
  assert.equal(scores.get('marathon'), null);
  assert.equal(scores.submit('marathon', { time: 7200, athleteId: 'sawe' }), true);
  assert.deepEqual(scores.get('marathon'), { time: 7200, athleteId: 'sawe' });
});

test('only a faster time replaces the best', () => {
  const scores = createBestScores(memoryStorage());
  scores.submit('marathon', { time: 7200, athleteId: 'sawe' });
  assert.equal(scores.submit('marathon', { time: 7300, athleteId: 'osako' }), false);
  assert.equal(scores.submit('marathon', { time: 7100, athleteId: 'osako' }), true);
  assert.equal(scores.get('marathon')?.athleteId, 'osako');
});

test('bests survive a reload (same storage)', () => {
  const storage = memoryStorage();
  createBestScores(storage).submit('marathon', { time: 7150, athleteId: 'mantz' });
  assert.equal(createBestScores(storage).get('marathon')?.time, 7150);
});

test('blocked or broken storage never crashes the game', () => {
  const broken = {
    getItem: () => {
      throw new Error('SecurityError');
    },
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
  };
  const scores = createBestScores(broken);
  assert.equal(scores.get('marathon'), null);
  assert.equal(scores.submit('marathon', { time: 7000, athleteId: 'sawe' }), true);
  assert.equal(scores.get('marathon')?.time, 7000);
});

test('corrupt saved data is ignored', () => {
  const storage = memoryStorage();
  storage.setItem('tour-de-mini:best', '{not json');
  assert.equal(createBestScores(storage).get('marathon'), null);
});
