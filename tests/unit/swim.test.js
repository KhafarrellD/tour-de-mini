import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SWIM_METRES,
  DEPTH_MAX,
  GAP,
  createSwim,
  stepSwim,
  swimStandings,
} from '../../games/ironman/swim.js';
import { athletesFor } from '../../data/athletes.js';
import { STEP, gapFollower } from '../helpers/players.js';

const [player, ...rest] = athletesFor('ironman');
const rivals = rest.slice(0, 4);

/** @param {number} seed */
const newSwim = (seed = 1) => createSwim({ athlete: player, rivals, seed });

/** @typedef {ReturnType<typeof newSwim>} Swim */

/**
 * @param {Swim} state
 * @param {(state: Swim, step: number) => boolean} stroke
 */
function swim(state, stroke) {
  const events = [];
  for (let step = 0; !state.finished && step < 60 * 120; step++) {
    events.push(...stepSwim(state, STEP, stroke(state, step)));
  }
  return { state, events };
}

test('the swim is a few hundred metres with buoys and swimmers to dodge', () => {
  const state = newSwim();
  assert.ok(SWIM_METRES >= 250 && SWIM_METRES <= 600);
  assert.ok(state.obstacles.length >= 5, `only ${state.obstacles.length} obstacles`);
  for (const obstacle of state.obstacles) {
    assert.ok(['buoy', 'swimmer'].includes(obstacle.type));
    assert.ok(obstacle.gapBottom - obstacle.gapTop >= GAP, 'the gap is swimmable');
    assert.ok(obstacle.gapTop >= 0 && obstacle.gapBottom <= DEPTH_MAX);
  }
});

test('stroking lifts you toward the surface; doing nothing sinks you', () => {
  const rising = newSwim();
  for (let i = 0; i < 40; i++) stepSwim(rising, STEP, i % 8 === 0);
  const sinking = newSwim();
  for (let i = 0; i < 40; i++) stepSwim(sinking, STEP, false);
  assert.ok(rising.depth < sinking.depth, `stroking ${rising.depth} vs sinking ${sinking.depth}`);
  assert.ok(sinking.depth > newSwim().depth, 'you sink when you stop');
});

test('you cannot swim out of the water or through the bottom', () => {
  const up = newSwim();
  for (let i = 0; i < 300; i++) stepSwim(up, STEP, true);
  assert.ok(up.depth >= 0, 'the surface holds you in');
  const down = newSwim();
  for (let i = 0; i < 300; i++) stepSwim(down, STEP, false);
  assert.ok(down.depth <= DEPTH_MAX, 'the bottom holds you up');
});

test('swimming into a buoy costs time', () => {
  const clean = swim(newSwim(), gapFollower).state;
  const blind = swim(newSwim(), () => false).state;
  assert.ok(clean.hits === 0, `a careful swim should be clean, had ${clean.hits}`);
  assert.ok(blind.hits > 0, 'sinking through the course hits things');
  assert.ok(blind.time > clean.time + 1, `blind ${blind.time.toFixed(1)} vs clean ${clean.time.toFixed(1)}`);
});

test('a clean swim takes about twenty seconds', () => {
  const { state } = swim(newSwim(), gapFollower);
  assert.ok(state.finished);
  assert.ok(state.time > 14 && state.time < 30, `swim took ${state.time.toFixed(1)} s`);
});

test('balance: reading the gaps beats mashing or floating', () => {
  let following = 0;
  let mashing = 0;
  let floating = 0;
  for (let seed = 1; seed <= 8; seed++) {
    following += swim(newSwim(seed), gapFollower).state.time;
    mashing += swim(newSwim(seed), () => true).state.time;
    floating += swim(newSwim(seed), () => false).state.time;
  }
  assert.ok(following < mashing - 2, `following ${(following / 8).toFixed(1)} vs mashing ${(mashing / 8).toFixed(1)}`);
  assert.ok(following < floating - 2, `following ${(following / 8).toFixed(1)} vs floating ${(floating / 8).toFixed(1)}`);
});

test('rivals get swim times from their stats', () => {
  const { state } = swim(newSwim(), gapFollower);
  const rows = swimStandings(state);
  assert.equal(rows.length, 5);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i].time >= rows[i - 1].time);
  for (const row of rows) assert.ok(row.time > 10 && row.time < 45, `${row.athlete.name} swam ${row.time}`);
});
