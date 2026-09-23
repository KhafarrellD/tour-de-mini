/**
 * The hub: title, then pick a sport, then an athlete, then race, then
 * results. Every screen is a scene; this file only wires them together.
 */
import { createScreen } from '../engine/screen.js';
import { startLoop } from '../engine/loop.js';
import { createButton, bindButton } from '../engine/input.js';
import { createDirector } from '../engine/director.js';
import { createBestScores } from '../engine/storage.js';
import { athletesFor } from '../data/athletes.js';
import { createRng } from '../engine/rng.js';
import { SPORTS } from '../games/sports.js';
import { createTitleScene } from '../games/hub/title-scene.js';
import { createSportSelectScene } from '../games/hub/sport-select-scene.js';
import { createAthleteSelectScene } from '../games/hub/athlete-select-scene.js';
import { createResultsScene } from '../games/hub/results-scene.js';
import { mountRotateHint } from '../games/shared/rotate-hint.js';

/** @typedef {import('../games/sports.js').Sport} Sport */
/** @typedef {import('../data/athletes.js').Athlete} Athlete */

const container = /** @type {HTMLElement} */ (document.getElementById('game'));
const screen = createScreen(container);
mountRotateHint(container);
const button = createButton();
bindButton(button, container);
const scores = createBestScores();

const director = createDirector(createTitleScene({ onStart: () => director.go(sportSelect()) }));

function sportSelect() {
  return createSportSelectScene({ sports: SPORTS, onPick: (sport) => director.go(athleteSelect(sport)) });
}

/**
 * @param {Sport} sport
 * @param {string} [startId]
 */
function athleteSelect(sport, startId) {
  return createAthleteSelectScene({
    sport,
    athletes: athletesFor(sport.roster),
    startId,
    onPick: (athlete) => director.go(race(sport, athlete)),
  });
}

/**
 * @param {Sport} sport
 * @param {Athlete} athlete
 */
function race(sport, athlete) {
  const seed = Date.now() % 2147483647;
  return sport.createScene({
    athlete,
    rivals: pickRivals(sport, athlete, seed),
    seed,
    onFinish: (outcome) => {
      const newBest = scores.submit(sport.key, { time: outcome.time, athleteId: athlete.id });
      director.go(
        createResultsScene({
          sport,
          athlete,
          outcome,
          best: scores.get(sport.key),
          newBest,
          onRaceAgain: () => director.go(race(sport, athlete)),
          onNewAthlete: () => director.go(athleteSelect(sport, athlete.id)),
          onSports: () => director.go(sportSelect()),
        }),
      );
    },
  });
}

/**
 * Everyone else on the roster, or a seeded handful when the sport races a
 * small field.
 * @param {Sport} sport
 * @param {Athlete} athlete
 * @param {number} seed
 */
function pickRivals(sport, athlete, seed) {
  const others = athletesFor(sport.roster).filter((rival) => rival !== athlete);
  if (!sport.rivalCount || sport.rivalCount >= others.length) return others;
  const rng = createRng(seed);
  const pool = [...others];
  const picked = [];
  while (picked.length < sport.rivalCount) picked.push(...pool.splice(rng.int(0, pool.length - 1), 1));
  return picked;
}

startLoop({
  update(dt) {
    director.update(dt, button.poll());
    if (container.dataset.scene !== director.name) container.dataset.scene = director.name;
  },
  render() {
    director.render(screen.ctx);
    screen.present();
  },
});
