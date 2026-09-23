/**
 * The Ironman end to end, played by simulated humans through the real
 * rules of all four stages — the same models the single-sport balance
 * tests use. This is the test that says whether the race is fair: a
 * person who plays each stage well has to be able to win it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSwim, stepSwim, swimStandings } from '../../games/ironman/swim.js';
import { createDescent, stepDescent, descentStandings } from '../../games/cycling/descent.js';
import { createTransition, stepTransition, T2_BASE_SECONDS } from '../../games/ironman/transition.js';
import { createSprint, stepSprint, sprintStandings } from '../../games/cycling/sprint.js';
import {
  createIronman,
  recordStage,
  ironmanStandings,
  IRONMAN_COURSE,
  IRONMAN_STAGES,
} from '../../games/ironman/ironman.js';
import { athletesFor } from '../../data/athletes.js';
import { createRng } from '../../engine/rng.js';
import { STEP, gapFollower, cleanRider, onTheMark, draftingRider, masher } from '../helpers/players.js';

const [player, ...rest] = athletesFor('ironman');
const rivals = rest.slice(0, 4);

/**
 * How a player handles each stage. The scene hands the same options to the
 * same engines, so a race here is the race a person plays.
 * @typedef {object} Player
 * @property {(state: any) => boolean} swim
 * @property {(state: any) => boolean} bike
 * @property {(state: any) => boolean} t2
 * @property {(state: any, step: number) => boolean} run
 */

/**
 * Races the whole Ironman and returns the finishing order.
 * @param {Player} how
 * @param {number} seed
 */
function race(how, seed) {
  const state = createIronman({ athlete: player, rivals });
  const common = { athlete: player, rivals };

  const swim = createSwim({ ...common, seed });
  for (let step = 0; !swim.finished && step < 60 * 120; step++) stepSwim(swim, STEP, how.swim(swim));
  recordStage(state, 'SWIM', swimStandings(swim));

  const bike = createDescent({ ...common, seed: seed + 7919, metres: IRONMAN_COURSE.bikeMetres });
  for (let step = 0; !bike.finished && step < 60 * 400; step++) stepDescent(bike, STEP, how.bike(bike));
  recordStage(state, 'BIKE', descentStandings(bike));

  const t2 = createTransition({ seed: seed + 15838 });
  for (let step = 0; !t2.done && step < 60 * 30; step++) stepTransition(t2, STEP, how.t2(t2));
  const rng = createRng((seed + 15838) ^ 0x7a2);
  recordStage(state, 'T2', [
    { athlete: player, time: T2_BASE_SECONDS + t2.penalty, isPlayer: true },
    ...rivals.map((rival) => ({
      athlete: rival,
      time: T2_BASE_SECONDS + Math.max(0, (10 - rival.stats.technique) * 0.22 + rng.next() * 0.9 - 0.2),
      isPlayer: false,
    })),
  ]);

  const run = createSprint({
    ...common,
    seed: seed + 23757,
    metres: IRONMAN_COURSE.runMetres,
    attackPoints: IRONMAN_COURSE.runAttacks,
  });
  for (let step = 0; !run.finished && step < 60 * 200; step++) stepSprint(run, STEP, how.run(run, step));
  recordStage(state, 'RUN', sprintStandings(run));

  return ironmanStandings(state);
}

/** @param {ReturnType<typeof race>} rows */
const placeOf = (rows) => rows.findIndex((row) => row.isPlayer) + 1;
/** @param {ReturnType<typeof race>} rows */
const totalOf = (rows) => rows[placeOf(rows) - 1].time;

/** Plays every stage the way it is meant to be played. */
const sharp = () => ({
  swim: gapFollower,
  bike: cleanRider,
  t2: onTheMark,
  run: draftingRider(4, 120),
});

/** Presses through the whole race and hopes. */
const sloppy = () => ({
  swim: () => true,
  bike: () => false,
  t2: () => false,
  run: masher,
});

test('every stage is raced, and the total is the sum of the four', () => {
  const rows = race(sharp(), 1);
  const you = rows[placeOf(rows) - 1];
  assert.deepEqual(Object.keys(you.stages).sort(), [...IRONMAN_STAGES].sort());
  const sum = IRONMAN_STAGES.reduce((total, name) => total + you.stages[name], 0);
  assert.ok(Math.abs(sum - you.time) < 1e-9, `${sum} vs ${you.time}`);
});

test('a whole race lands in the minute and a half the brief asks for', () => {
  for (let seed = 1; seed <= 6; seed++) {
    const total = totalOf(race(sharp(), seed));
    assert.ok(total > 55 && total < 95, `seed ${seed} raced ${total.toFixed(1)} s`);
  }
});

test('balance: playing all four stages well wins the Ironman', () => {
  let places = 0;
  const races = 8;
  for (let seed = 1; seed <= races; seed++) places += placeOf(race(sharp(), seed));
  const average = places / races;
  assert.ok(average <= 2, `a sharp triathlete averaged ${average.toFixed(2)} of 5`);
});

test('balance: mashing through the stages finishes well beaten', () => {
  let places = 0;
  let gap = 0;
  const races = 8;
  for (let seed = 1; seed <= races; seed++) {
    const rows = race(sloppy(), seed);
    places += placeOf(rows);
    gap += totalOf(rows) - rows[0].time;
  }
  assert.ok(places / races >= 4, `a masher averaged ${(places / races).toFixed(2)} of 5`);
  assert.ok(gap / races > 5, `a masher lost only ${(gap / races).toFixed(1)} s to the winner`);
});

test('balance: no single stage decides the race on its own', () => {
  // Blowing one stage should cost a place or two, not the whole Ironman:
  // the gap it opens has to stay inside what the other three can hold.
  const seeds = [1, 2, 3, 4, 5, 6];
  for (const stage of /** @type {const} */ (['swim', 'bike', 't2', 'run'])) {
    let lost = 0;
    for (const seed of seeds) {
      const good = totalOf(race(sharp(), seed));
      // Never pressing is how each stage goes wrong: sinking, not braking,
      // sleeping through the prompts, standing still.
      const blown = totalOf(race({ ...sharp(), [stage]: () => false }, seed));
      lost += blown - good;
    }
    const average = lost / seeds.length;
    assert.ok(average > 0, `throwing the ${stage} cost nothing (${average.toFixed(1)} s)`);
    assert.ok(average < 45, `throwing the ${stage} cost ${average.toFixed(1)} s, which decides the race alone`);
  }
});
