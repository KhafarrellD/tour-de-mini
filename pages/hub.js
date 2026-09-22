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
    athletes: athletesFor(sport.id),
    startId,
    onPick: (athlete) => director.go(race(sport, athlete)),
  });
}

/**
 * @param {Sport} sport
 * @param {Athlete} athlete
 */
function race(sport, athlete) {
  return sport.createScene({
    athlete,
    rivals: athletesFor(sport.id).filter((rival) => rival !== athlete),
    seed: Date.now() % 2147483647,
    onFinish: (outcome) => {
      const newBest = scores.submit(sport.id, { time: outcome.time, athleteId: athlete.id });
      director.go(
        createResultsScene({
          sport,
          athlete,
          outcome,
          best: scores.get(sport.id),
          newBest,
          onRaceAgain: () => director.go(race(sport, athlete)),
          onNewAthlete: () => director.go(athleteSelect(sport, athlete.id)),
          onSports: () => director.go(sportSelect()),
        }),
      );
    },
  });
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
