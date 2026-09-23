/**
 * The Ironman scoreboard: four stages, each raced with its own engine (the
 * swim, the descent, the transition and the sprint), each handing back a
 * time for everyone on the start list. This module only adds them up.
 */

import { formatShort } from '../../engine/format.js';

/** @typedef {import('../../data/athletes.js').Athlete} Athlete */

export const IRONMAN_STAGES = /** @type {const} */ (['SWIM', 'BIKE', 'T2', 'RUN']);

/**
 * How long each stage is. The bike is a short run down the descent's
 * mountain and the run is a dash for the line, so that the whole race
 * lands inside the minute and a half the brief asks for.
 */
export const IRONMAN_COURSE = {
  bikeMetres: 660,
  runMetres: 280,
  runAttacks: /** @type {readonly number[]} */ ([120]),
};

/** @param {string} stage */
export function stageIndex(stage) {
  return IRONMAN_STAGES.indexOf(/** @type {typeof IRONMAN_STAGES[number]} */ (stage));
}

/**
 * @typedef {object} StageResult
 * @property {Athlete} athlete
 * @property {number} time seconds for that stage
 * @property {boolean} isPlayer
 */

/**
 * @param {{ athlete: Athlete, rivals: Athlete[] }} options
 */
export function createIronman({ athlete, rivals }) {
  return {
    athlete,
    rivals,
    /** @type {Map<Athlete, Record<string, number>>} */
    times: new Map([athlete, ...rivals].map((entry) => [entry, {}])),
  };
}

/** @typedef {ReturnType<typeof createIronman>} Ironman */

/**
 * Files one stage's times. Recording a stage twice keeps the first result,
 * so replaying a stage cannot inflate anyone's race.
 * @param {Ironman} state
 * @param {string} stage
 * @param {StageResult[]} results
 */
export function recordStage(state, stage, results) {
  for (const result of results) {
    const stages = state.times.get(result.athlete);
    if (!stages || stages[stage] !== undefined) continue;
    stages[stage] = result.time;
  }
}

/**
 * @typedef {object} IronmanStanding
 * @property {Athlete} athlete
 * @property {number} time total so far
 * @property {Record<string, number>} stages
 * @property {boolean} isPlayer
 */

/**
 * Everyone by total time over the stages raced so far.
 * @param {Ironman} state
 * @returns {IronmanStanding[]}
 */
export function ironmanStandings(state) {
  return [...state.times.entries()]
    .map(([athlete, stages]) => ({
      athlete,
      stages,
      time: Object.values(stages).reduce((total, seconds) => total + seconds, 0),
      isPlayer: athlete === state.athlete,
    }))
    .sort((a, b) => a.time - b.time);
}

/**
 * The stage splits, written as two short lines for the results panel: the
 * swim beside the bike, the transition beside the run.
 * @param {Record<string, number>} stages
 * @returns {string[]}
 */
export function stageSummary(stages) {
  const split = (/** @type {string} */ name) =>
    stages[name] === undefined ? '' : `${name} ${formatShort(stages[name])}`;
  return [0, 2].map((first) =>
    IRONMAN_STAGES.slice(first, first + 2)
      .map(split)
      .filter(Boolean)
      .join('  '),
  );
}
