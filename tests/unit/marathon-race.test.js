import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RACE_KM,
  phaseAt,
  createRace,
  stepRace,
  finalStandings,
  standings,
  splitFor,
  paceAt,
} from '../../games/marathon/race.js';
import { markerPosition } from '../../games/shared/timing-bar.js';
import { athletesFor } from '../../data/athletes.js';
import { createRng } from '../../engine/rng.js';

const STEP = 1 / 60;
const [player, ...rivals] = athletesFor('marathon');

/** @param {number} seed */
function newRace(seed = 1) {
  return createRace({ player, rivals, seed });
}

/**
 * Plays a whole race. `pressAt(race)` is asked at the start of every km
 * for the time (in seconds after the km starts) to press, or null to skip.
 * @param {ReturnType<typeof newRace>} race
 * @param {(race: ReturnType<typeof newRace>) => number | null} pressAt
 */
function play(race, pressAt) {
  let plannedKm = -1;
  let pressTime = Infinity;
  while (!race.finished) {
    const km = Math.floor(race.km + 1e-9);
    if (km !== plannedKm) {
      plannedKm = km;
      const offset = pressAt(race);
      pressTime = offset === null ? Infinity : race.km + offset;
    }
    const press = race.km <= pressTime && race.km + STEP > pressTime;
    stepRace(race, STEP, press);
  }
  return race;
}

/** Seconds until the marker next crosses the middle of the bar. */
function untilCenter(/** @type {ReturnType<typeof newRace>} */ race) {
  const { sweep } = phaseAt(race.km);
  const next = Math.floor(race.marker - 0.5) + 1.5;
  return (next - race.marker) * sweep;
}

/** A human who aims for the middle with a normal timing error of `sigma` seconds. */
function human(/** @type {number} */ sigma, /** @type {number} */ seed) {
  const rng = createRng(seed);
  return (/** @type {ReturnType<typeof newRace>} */ race) => {
    const gaussian = Math.sqrt(-2 * Math.log(1 - rng.next())) * Math.cos(2 * Math.PI * rng.next());
    return Math.max(0, untilCenter(race) + gaussian * sigma);
  };
}

/** @param {(race: ReturnType<typeof newRace>) => number | null} strategy */
function averagePlace(strategy, races = 40) {
  let total = 0;
  for (let seed = 1; seed <= races; seed++) {
    const race = play(newRace(seed), strategy);
    total += finalStandings(race).findIndex((row) => row.isPlayer) + 1;
  }
  return total / races;
}

test('the race lasts exactly 42.2 seconds', () => {
  const race = newRace();
  let steps = 0;
  while (!race.finished) {
    stepRace(race, STEP, false);
    steps++;
  }
  assert.equal(Math.round(steps * STEP * 10) / 10, RACE_KM);
});

test('phases: steady, the wall from km 30 to 35, then the final push over the last 2 km', () => {
  assert.equal(phaseAt(10).name, 'steady');
  assert.equal(phaseAt(30).name, 'wall');
  assert.equal(phaseAt(34.9).name, 'wall');
  assert.equal(phaseAt(36).name, 'steady');
  assert.equal(phaseAt(40.2).name, 'final');
});

test('the wall shrinks the zone and speeds up the marker', () => {
  assert.ok(phaseAt(32).zone < phaseAt(10).zone);
  assert.ok(phaseAt(32).sweep < phaseAt(10).sweep);
});

test('timing windows are wide enough for people, not just bots', () => {
  for (const km of [5, 32, 41]) {
    const { sweep, zone, perfect } = phaseAt(km);
    const good = zone * sweep;
    assert.ok(good >= 0.2, `km ${km}: good window ${good.toFixed(3)} s`);
    assert.ok(perfect * sweep >= 0.07, `km ${km}: perfect window ${(perfect * sweep).toFixed(3)} s`);
  }
  assert.ok(phaseAt(5).zone * phaseAt(5).sweep >= 0.3, 'the steady phase is generous');
});

test('in the steady phase the marker crosses the middle halfway through each km', () => {
  const race = newRace();
  while (race.km < 3.5) stepRace(race, STEP, false);
  assert.ok(Math.abs(markerPosition(race.marker) - 0.5) < 0.02);
});

test('each km judges one press; a second press in the same km is ignored', () => {
  const race = newRace();
  while (race.km < 0.5) stepRace(race, STEP, false);
  const first = stepRace(race, STEP, true);
  const second = stepRace(race, STEP, true);
  assert.equal(first.filter((e) => e.type === 'judged').length, 1);
  assert.equal(second.filter((e) => e.type === 'judged').length, 0);
});

test('a km that ends without a press counts as a miss', () => {
  const race = newRace();
  /** @type {import('../../games/marathon/race.js').RaceEvent[]} */
  let events = [];
  while (race.km < 1.01) events = events.concat(stepRace(race, STEP, false));
  assert.deepEqual(
    events.filter((e) => e.type === 'judged').map((e) => e.type === 'judged' && e.result),
    ['miss'],
  );
});

test('perfect every km runs under two hours; missing every km is far slower', () => {
  const perfect = play(newRace(), untilCenter);
  const nothing = play(newRace(), () => null);
  const you = (/** @type {ReturnType<typeof newRace>} */ r) => finalStandings(r).find((row) => row.isPlayer);
  assert.ok((you(perfect)?.time ?? Infinity) < 2 * 3600);
  assert.ok((you(nothing)?.time ?? 0) > 2 * 3600 + 5 * 60);
});

test('splits: perfect beats good beats miss in every phase', () => {
  for (const km of [5, 32, 41]) {
    const phase = phaseAt(km).name;
    assert.ok(splitFor('perfect', phase) < splitFor('good', phase));
    assert.ok(splitFor('good', phase) < splitFor('miss', phase));
  }
});

test('rivals are repeatable for a seed and vary between seeds', () => {
  const times = (/** @type {number} */ seed) =>
    finalStandings(play(newRace(seed), () => null))
      .filter((row) => !row.isPlayer)
      .map((row) => row.time);
  assert.deepEqual(times(3), times(3));
  assert.notDeepEqual(times(3), times(4));
});

test('rival finishing times are realistic (1:58 to 2:07)', () => {
  for (let seed = 1; seed <= 20; seed++) {
    for (const row of finalStandings(play(newRace(seed), () => null))) {
      if (row.isPlayer) continue;
      assert.ok(row.time > 7080 && row.time < 7620, `${row.athlete.name} ran ${row.time}`);
    }
  }
});

test('standings mid-race rank everyone by time at the current km', () => {
  const race = newRace();
  while (race.km < 20) stepRace(race, STEP, false);
  const rows = standings(race);
  assert.equal(rows.length, 8);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i].time >= rows[i - 1].time);
});

test('balance: a sharp human usually wins', () => {
  const place = averagePlace(human(0.045, 7));
  assert.ok(place <= 2, `sharp human averaged ${place.toFixed(2)}`);
});

test('balance: a casual human lands mid-pack', () => {
  const place = averagePlace(human(0.1, 9));
  assert.ok(place >= 2 && place <= 5.5, `casual human averaged ${place.toFixed(2)}`);
});

test('balance: pressing blindly or not at all finishes at the back', () => {
  const rng = createRng(12);
  assert.ok(averagePlace(() => rng.next()) >= 7);
  assert.equal(averagePlace(() => null, 10), 8);
});

test('pace is seconds per km, even over the short final 0.2 km', () => {
  const race = play(newRace(), () => null);
  const last = paceAt(race.player, 42.1);
  assert.equal(last, splitFor('miss', 'final'));
  assert.equal(paceAt(race.player, 5.5), splitFor('miss', 'steady'));
});

test('after the wall the beat comes back: the marker again crosses the middle mid-km', () => {
  const race = newRace();
  while (race.km < 37.5) stepRace(race, STEP, false);
  assert.ok(Math.abs(markerPosition(race.marker) - 0.5) < 0.02, `marker at ${markerPosition(race.marker)}`);
});

test('the last 0.2 km needs no extra press: it is run at the pace of the last full km', () => {
  const race = newRace();
  /** @type {import('../../games/marathon/race.js').RaceEvent[]} */
  const events = [];
  while (!race.finished) {
    const press = race.km >= 41.5 && race.km < 41.5 + STEP;
    events.push(...stepRace(race, STEP, press));
  }
  const judged = events.filter((e) => e.type === 'judged' && e.segment === 42);
  assert.deepEqual(judged, [], 'no judgement for the final 0.2 km');
  assert.equal(race.results[42], race.results[41]);
});
