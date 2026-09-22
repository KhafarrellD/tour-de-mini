/**
 * Title screen: the peloton rolls past the Alps. Any press starts.
 */
import { drawText } from '../../engine/font.js';
import { cycleFrame, wheelTurns } from '../../engine/animation.js';
import { drawRider, PEDAL_FRAMES, WHEEL_FRAMES } from '../../engine/character.js';
import { athletesFor } from '../../data/athletes.js';
import { createSideScene, SCENE } from '../shared/side-scene.js';
import { PALETTE } from '../../assets/palette.js';
import { WHEEL } from '../../assets/sprites/bike.js';

const BUNCH_SPEED = 56;
const CADENCE = 1.5;

/**
 * @param {{ onStart: () => void }} options
 * @returns {import('../../engine/director.js').Scene}
 */
export function createTitleScene({ onStart }) {
  const scene = createSideScene();
  // Two staggered rows with Pogačar at the front; the far row is drawn first.
  const riders = athletesFor('cycling')
    .map((athlete, i) => ({
      athlete,
      x: 222 - i * 32,
      lane: i % 2 === 0 ? SCENE.laneY : SCENE.laneY - 7,
      crank: i * 0.37,
    }))
    .sort((a, b) => a.lane - b.lane);
  let time = 0;

  return {
    name: 'title',
    update(dt, button) {
      time += dt;
      for (const rider of riders) rider.crank += CADENCE * dt;
      if (button.pressed) onStart();
    },
    render(ctx) {
      const distance = time * BUNCH_SPEED;
      scene.draw(ctx, distance);
      drawText(ctx, 'TOUR DE MINI', 160, 26, { align: 'center', scale: 3, color: PALETTE.yellow });
      drawText(ctx, 'A PIXEL SPORTS HUB', 160, 58, { align: 'center' });
      if (Math.floor(time * 1.6) % 2 === 0) {
        drawText(ctx, 'PRESS SPACE OR TAP TO START', 160, 78, { align: 'center', color: PALETTE.skyHaze });
      }
      const wheel = cycleFrame(wheelTurns(distance, WHEEL.size) * WHEEL_FRAMES, WHEEL_FRAMES);
      for (const rider of riders) {
        const pedal = cycleFrame(rider.crank, PEDAL_FRAMES);
        drawRider(ctx, rider.athlete, 'bike', 'pedal', pedal, wheel, rider.x, rider.lane);
      }
    },
  };
}
