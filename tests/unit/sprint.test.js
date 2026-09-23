import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SPRINT_METRES,
  ATTACK_POINTS,
  createSprint,
  stepSprint,
  sprintStandings,
  playerDraft,
} from '../../games/cycling/sprint.js';
import { markerPosition } from '../../games/shared/timing-bar.js';
import { athletesFor } from '../../data/athletes.js';
import { STEP, steadyRider, draftingRider, masher } from '../helpers/players.js';

const [player, ...rest] = athletesFor('cycling');
const rivals = rest.slice(0, 4);

/** @param {number} seed */
const newSprint = (seed = 1) => createSprint({ athlete: player, rivals, seed });

/** @typedef {ReturnType<typeof newSprint>} Sprint */

/**
 * Plays a whole sprint. `press(state, step)` decides each step.
 * @param {Sprint} state
 * @param {(state: Sprint, step: number) => boolean} press
 */
function play(state, press) {
  for (let step = 0; !state.finished && step < 60 * 200; step++) {
    stepSprint(state, STEP, press(state, step));
  }
  return state;
}


/** @param {Sprint} state */
const placeOf = (state) => sprintStandings(state).findIndex((row) => row.isPlayer) + 1;

test('the sprint is the last 2 km, with attacks at 500, 200 and 100 metres to go', () => {
  assert.equal(SPRINT_METRES, 2000);
  assert.deepEqual([...ATTACK_POINTS], [500, 200, 100]);
  assert.equal(newSprint().toGo, 2000);
});

test('tapping builds cadence and speed; freewheeling loses both', () => {
  const state = newSprint();
  for (let i = 0; i < 120; i++) stepSprint(state, STEP, i % 12 === 0);
  const pedalling = { cadence: state.player.cadence, speed: state.player.speed };
  for (let i = 0; i < 180; i++) stepSprint(state, STEP, false);
  assert.ok(state.player.cadence < pedalling.cadence, 'cadence falls when you stop');
  assert.ok(state.player.speed < pedalling.speed, 'speed follows cadence down');
  assert.ok(state.player.speed > 0, 'the bike keeps rolling');
});

test('stamina drains while sprinting and recovers when you ease off', () => {
  const state = newSprint();
  for (let i = 0; i < 60 * 15; i++) stepSprint(state, STEP, true);
  const spent = state.player.stamina;
  assert.ok(spent < 0.75, `15 s flat out should cost stamina, left ${spent.toFixed(2)}`);
  for (let i = 0; i < 300; i++) stepSprint(state, STEP, false);
  assert.ok(state.player.stamina > spent, 'easing off recovers');
});

test('an attack window opens at each attack point and closes on its own', () => {
  const state = newSprint();
  /** @type {number[]} */
  const opened = [];
  while (!state.finished) {
    for (const event of stepSprint(state, STEP, false)) {
      if (event.type === 'window') opened.push(event.at);
    }
  }
  assert.deepEqual(opened, [500, 200, 100]);
});

test('a perfect attack gains more than a good one, and missing gains nothing', () => {
  /** Presses as the marker crosses `target`, so no frame step can skip it. */
  const gainOf = (/** @type {'perfect' | 'good' | 'none'} */ kind) => {
    const state = newSprint();
    while (!state.window) stepSprint(state, STEP, false);
    const before = state.player.metres;
    const target = kind === 'perfect' ? 0.5 : 0.5 + state.window.zone / 3;
    let previous = markerPosition(state.window.marker);
    for (let i = 0; i < 60 * 6; i++) {
      const now = state.window ? markerPosition(state.window.marker) : previous;
      const press = kind !== 'none' && previous < target && now >= target;
      previous = now;
      stepSprint(state, STEP, press);
    }
    return state.player.metres - before;
  };
  const perfect = gainOf('perfect');
  const good = gainOf('good');
  const none = gainOf('none');
  assert.ok(perfect > good, `perfect ${perfect.toFixed(1)} should beat good ${good.toFixed(1)}`);
  assert.ok(good > none, `good ${good.toFixed(1)} should beat nothing ${none.toFixed(1)}`);
});

test('sitting in a rival’s wheel saves stamina', () => {
  const inTheWind = newSprint();
  const sheltered = newSprint();
  // Hold the geometry still: one race is spent alone, the other on a wheel.
  for (let i = 0; i < 60 * 4; i++) {
    inTheWind.rivals.forEach((rival) => (rival.metres = inTheWind.player.metres - 50));
    sheltered.rivals.forEach((rival) => (rival.metres = sheltered.player.metres + 8));
    stepSprint(inTheWind, STEP, i % 12 === 0);
    stepSprint(sheltered, STEP, i % 12 === 0);
  }
  assert.ok(playerDraft(sheltered), 'the player is in the draft');
  assert.ok(!playerDraft(inTheWind), 'the player is in the wind');
  assert.ok(
    sheltered.player.stamina > inTheWind.player.stamina + 0.015,
    `draft ${sheltered.player.stamina.toFixed(3)} vs wind ${inTheWind.player.stamina.toFixed(3)}`,
  );
  assert.ok(sheltered.player.speed > inTheWind.player.speed, 'the slipstream is faster too');
});

test('the race ends at the line and everyone gets a time', () => {
  const state = play(newSprint(), draftingRider());
  assert.ok(state.finished);
  assert.ok(state.player.metres >= SPRINT_METRES);
  const rows = sprintStandings(state);
  assert.equal(rows.length, 5);
  for (const row of rows) assert.ok(row.time > 30 && row.time < 200, `${row.athlete.name} took ${row.time}`);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i].time >= rows[i - 1].time);
});

test('the sprint lasts about a minute', () => {
  const state = play(newSprint(), draftingRider());
  assert.ok(state.time > 55 && state.time < 95, `sprint took ${state.time.toFixed(1)} s`);
});

test('balance: riding the draft and saving for the finish beats brute force', () => {
  /** @param {(state: Sprint, step: number) => boolean} rider */
  const averagePlace = (rider, races = 12) => {
    let total = 0;
    for (let seed = 1; seed <= races; seed++) total += placeOf(play(newSprint(seed), rider));
    return total / races;
  };
  const drafting = averagePlace(draftingRider(3));
  const steady = averagePlace(steadyRider(3));
  const mashing = averagePlace(masher);
  assert.ok(steady < mashing, `steady ${steady.toFixed(2)} should beat mashing ${mashing.toFixed(2)}`);
  assert.ok(drafting <= 3, `drafting rider averaged ${drafting.toFixed(2)}`);
  assert.ok(mashing >= 4, `masher averaged ${mashing.toFixed(2)}`);
  assert.ok(mashing - drafting >= 1.5, `mashing ${mashing.toFixed(2)} vs drafting ${drafting.toFixed(2)}`);
});

test('balance: an emptied tank costs real speed', () => {
  const state = newSprint();
  while (!state.player.emptied && state.time < 60) stepSprint(state, STEP, true);
  assert.ok(state.player.emptied, 'flat out empties the tank');
  assert.ok(state.time < 25, `emptied after ${state.time.toFixed(1)} s of mashing`);
  // Keep mashing on an empty tank: the legs go.
  for (let i = 0; i < 60 * 3; i++) stepSprint(state, STEP, true);
  const emptySpeed = state.player.speed;
  const fresh = newSprint();
  for (let i = 0; i < 60 * 3; i++) stepSprint(fresh, STEP, true);
  assert.ok(
    fresh.player.speed > emptySpeed + 2,
    `fresh ${fresh.player.speed.toFixed(1)} vs empty ${emptySpeed.toFixed(1)}`,
  );
});

test('balance: doing nothing finishes last', () => {
  const state = play(newSprint(), () => false);
  assert.equal(placeOf(state), 5);
});

test('a shorter sprint can be built for the Ironman finish', () => {
  const short = createSprint({ athlete: player, rivals, seed: 2, metres: 260, attackPoints: [120] });
  assert.equal(short.toGo, 260);
  assert.equal(short.metresTotal, 260);
  const state = play(short, draftingRider());
  assert.ok(state.time > 6 && state.time < 16, `short sprint took ${state.time.toFixed(1)} s`);
  assert.ok(state.player.attacks.length <= 1, 'only the one attack window');
});
