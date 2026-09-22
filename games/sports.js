/**
 * The games the hub offers. Adding a sport means adding an entry here:
 * the menus, athlete select and results screens are shared.
 */
import { createMarathonScene } from './marathon/marathon-scene.js';
import { drawRunner } from '../engine/character.js';
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
 * @property {import('../data/athletes.js').Sport} id
 * @property {string} name
 * @property {string} tagline
 * @property {string} athleteNoun "RUNNER", "RIDER"...
 * @property {(ctx: CanvasRenderingContext2D, athlete: Athlete, time: number, x: number, groundY: number, active: boolean) => void} drawAthlete
 *   an athlete in the menus; `active` when highlighted
 * @property {(options: { athlete: Athlete, rivals: Athlete[], seed: number, onFinish: (outcome: Outcome) => void }) => Scene} createScene
 */

/** @type {readonly Sport[]} */
export const SPORTS = [
  {
    id: 'marathon',
    name: 'MARATHON',
    tagline: '42.2 KM IN 42.2 SECONDS. TAP ONCE EVERY KM, ON THE BEAT.',
    athleteNoun: 'RUNNER',
    drawAthlete(ctx, athlete, time, x, groundY, active) {
      const frame = active ? cycleFrame(time * 1.6, 6) : cycleFrame(time * 0.6, 2);
      drawRunner(ctx, athlete, 'run', active ? 'run' : 'idle', frame, x, groundY);
    },
    createScene: createMarathonScene,
  },
];
