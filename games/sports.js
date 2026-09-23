/**
 * The games the hub offers. Adding a sport means adding an entry here:
 * the menus, athlete select and results screens are shared.
 */
import { formatClock, formatShort } from '../engine/format.js';
import { createMarathonScene } from './marathon/marathon-scene.js';
import { createSprintScene } from './cycling/sprint-scene.js';
import { createDescentScene } from './cycling/descent-scene.js';
import { drawRunner, drawRider, PEDAL_FRAMES } from '../engine/character.js';
import { cycleFrame } from '../engine/animation.js';

/** @typedef {import('../data/athletes.js').Athlete} Athlete */
/** @typedef {import('../engine/director.js').Scene} Scene */

/**
 * @typedef {object} Outcome
 * @property {number} time seconds, lower is better
 * @property {number} place
 * @property {{ athlete: Athlete, time: number, isPlayer: boolean }[]} standings
 * @property {string[]} summary
 */

/**
 * @typedef {object} Sport
 * @property {string} key identifies the game, for best times
 * @property {import('../data/athletes.js').Sport} roster whose athletes race it
 * @property {string} name
 * @property {string} tagline
 * @property {string} athleteNoun "RUNNER", "RIDER"...
 * @property {(seconds: number) => string} formatTime how results read
 * @property {number} [rivalCount] how many rivals race, when not the whole roster
 * @property {(ctx: CanvasRenderingContext2D, athlete: Athlete, time: number, x: number, groundY: number, active: boolean) => void} drawAthlete
 *   an athlete in the menus; `active` when highlighted
 * @property {(options: { athlete: Athlete, rivals: Athlete[], seed: number, onFinish: (outcome: Outcome) => void }) => Scene} createScene
 */

/** @type {readonly Sport[]} */
export const SPORTS = [
  {
    key: 'marathon',
    roster: 'marathon',
    name: 'MARATHON',
    tagline: '42.2 KM IN 42.2 SECONDS. TAP ONCE EVERY KM, ON THE BEAT.',
    athleteNoun: 'RUNNER',
    formatTime: formatClock,
    drawAthlete(ctx, athlete, time, x, groundY, active) {
      const frame = active ? cycleFrame(time * 1.6, 6) : cycleFrame(time * 0.6, 2);
      drawRunner(ctx, athlete, 'run', active ? 'run' : 'idle', frame, x, groundY);
    },
    createScene: createMarathonScene,
  },
  {
    key: 'tdf-sprint',
    roster: 'cycling',
    name: 'TOUR SPRINT',
    tagline: 'THE LAST 2 KM. TAP TO PEDAL, SIT IN A WHEEL, ATTACK AT THE RIGHT MOMENT.',
    athleteNoun: 'RIDER',
    formatTime: formatShort,
    rivalCount: 4,
    drawAthlete(ctx, athlete, time, x, groundY, active) {
      const cadence = active ? 1.5 : 0.5;
      drawRider(ctx, athlete, 'bike', active ? 'pedal' : 'idle', cycleFrame(time * cadence, active ? PEDAL_FRAMES : 2), cycleFrame(time * (active ? 2.2 : 0), 4), x, groundY);
    },
    createScene: createSprintScene,
  },
  {
    key: 'tdf-descent',
    roster: 'cycling',
    name: 'THE DESCENT',
    tagline: 'SWITCHBACKS OFF THE MOUNTAIN. HOLD TO BRAKE, READ THE SIGNS, STAY UPRIGHT.',
    athleteNoun: 'RIDER',
    formatTime: formatShort,
    rivalCount: 4,
    drawAthlete(ctx, athlete, time, x, groundY, active) {
      const cadence = active ? 1.5 : 0.5;
      drawRider(ctx, athlete, 'bike', active ? 'pedal' : 'idle', cycleFrame(time * cadence, active ? PEDAL_FRAMES : 2), cycleFrame(time * (active ? 2.2 : 0), 4), x, groundY);
    },
    createScene: createDescentScene,
  },
];
