import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IRONMAN_STAGES, createIronman, recordStage, ironmanStandings, stageIndex } from '../../games/ironman/ironman.js';
import { athletesFor } from '../../data/athletes.js';

const [player, ...rest] = athletesFor('ironman');
const rivals = rest.slice(0, 4);
const newRace = () => createIronman({ athlete: player, rivals });

/**
 * @param {ReturnType<typeof newRace>} race
 * @param {string} stage
 * @param {number} playerTime
 * @param {number[]} rivalTimes
 */
const record = (race, stage, playerTime, rivalTimes) =>
  recordStage(race, stage, [{ athlete: player, time: playerTime, isPlayer: true }, ...rivalTimes.map((time, i) => ({ athlete: rivals[i], time, isPlayer: false }))]);

test('four stages in order: swim, bike, T2, run', () => {
  assert.deepEqual([...IRONMAN_STAGES], ['SWIM', 'BIKE', 'T2', 'RUN']);
  assert.equal(stageIndex('T2'), 2);
});

test('a total is the sum of the stages raced so far', () => {
  const race = newRace();
  record(race, 'SWIM', 20, [19, 21, 22, 23]);
  record(race, 'BIKE', 30, [31, 29, 32, 33]);
  const you = ironmanStandings(race).find((row) => row.isPlayer);
  assert.equal(you?.time, 50);
  assert.deepEqual(you?.stages, { SWIM: 20, BIKE: 30 });
});

test('standings sort by total time, and say who is leading', () => {
  const race = newRace();
  record(race, 'SWIM', 22, [19, 21, 25, 30]);
  const rows = ironmanStandings(race);
  assert.equal(rows.length, 5);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i].time >= rows[i - 1].time);
  assert.equal(rows[0].time, 19);
  assert.equal(rows.findIndex((row) => row.isPlayer) + 1, 3);
});

test('a stage counts once, even if recorded twice', () => {
  const race = newRace();
  record(race, 'SWIM', 20, [19, 21, 22, 23]);
  record(race, 'SWIM', 20, [19, 21, 22, 23]);
  assert.equal(ironmanStandings(race).find((row) => row.isPlayer)?.time, 20);
});

test('the whole race fits in the minute and a half the brief asks for', () => {
  const race = newRace();
  record(race, 'SWIM', 20, [20, 20, 20, 20]);
  record(race, 'BIKE', 32, [32, 32, 32, 32]);
  record(race, 'T2', 4, [4, 4, 4, 4]);
  record(race, 'RUN', 11, [11, 11, 11, 11]);
  const total = ironmanStandings(race).find((row) => row.isPlayer)?.time ?? 0;
  assert.ok(total >= 60 && total <= 90, `a typical race totals ${total} s`);
});
