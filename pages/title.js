/**
 * Title screen: the peloton rolls past the Alps while the leader waits for
 * your input. Hold Space, Enter or a finger on the screen to attack: cadence
 * rises, the rider eases ahead of the bunch, and eases back when you let go.
 * Exercises the whole engine: fixed-step loop, integer scaling, the single
 * button, parallax, sprite caching and eased motion.
 */
import { createScreen } from '../engine/screen.js';
import { startLoop } from '../engine/loop.js';
import { createButton, bindButton } from '../engine/input.js';
import { drawText } from '../engine/font.js';
import { damp } from '../engine/math.js';
import { cycleFrame, wheelTurns } from '../engine/animation.js';
import { drawRider, PEDAL_FRAMES, WHEEL_FRAMES } from '../engine/character.js';
import { athletesFor } from '../data/athletes.js';
import { createSideScene, SCENE } from '../games/shared/side-scene.js';
import { mountRotateHint } from '../games/shared/rotate-hint.js';
import { PALETTE } from '../assets/palette.js';
import { WHEEL } from '../assets/sprites/bike.js';

const BUNCH_SPEED = 56; // world px per second
const CRUISE_CADENCE = 1.5; // revolutions per second (90 rpm)
const ATTACK_CADENCE = 2.2;
const ATTACK_GAP = 64; // px the leader pulls ahead
const EASE = 2.5;

const container = /** @type {HTMLElement} */ (document.getElementById('game'));
const screen = createScreen(container);
mountRotateHint(container);
const button = createButton();
bindButton(button, container);
const scene = createSideScene();

// Two staggered rows with Pogačar at the front; the far row is drawn first.
const riders = athletesFor('cycling').map((athlete, i) => ({
  athlete,
  home: 222 - i * 32,
  x: 222 - i * 32,
  lane: i % 2 === 0 ? SCENE.laneY : SCENE.laneY - 7,
  crank: i * 0.37,
  distance: 0,
}));
const leader = riders[0];
riders.sort((a, b) => a.lane - b.lane);

let time = 0;
let cameraX = 0;
let attacking = false;

startLoop({
  update(dt) {
    attacking = button.poll().held;
    time += dt;
    cameraX += BUNCH_SPEED * dt;
    for (const rider of riders) {
      const isLeader = rider === leader && attacking;
      const previousX = rider.x;
      rider.x = damp(rider.x, rider.home + (isLeader ? ATTACK_GAP : 0), EASE, dt);
      rider.crank += (isLeader ? ATTACK_CADENCE : CRUISE_CADENCE) * dt;
      rider.distance += BUNCH_SPEED * dt + (rider.x - previousX);
    }
  },
  render() {
    const ctx = screen.ctx;
    scene.draw(ctx, cameraX);

    drawText(ctx, 'TOUR DE MINI', 160, 26, { align: 'center', scale: 3, color: PALETTE.yellow });
    drawText(ctx, 'A PIXEL SPORTS HUB', 160, 58, { align: 'center' });
    if (Math.floor(time * 1.6) % 2 === 0) {
      drawText(ctx, 'HOLD SPACE OR TAP TO ATTACK', 160, 78, { align: 'center', color: PALETTE.skyHaze });
    }

    for (const rider of riders) {
      if (rider === leader && attacking) drawSpeedLines(ctx, rider.x, rider.lane);
      const pedal = cycleFrame(rider.crank, PEDAL_FRAMES);
      const wheel = cycleFrame(wheelTurns(rider.distance, WHEEL.size) * WHEEL_FRAMES, WHEEL_FRAMES);
      drawRider(ctx, rider.athlete, 'bike', 'pedal', pedal, wheel, rider.x, rider.lane);
    }
    screen.present();
  },
});

/**
 * A few faint streaks trailing an attacking rider.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} groundY
 */
function drawSpeedLines(ctx, x, groundY) {
  ctx.fillStyle = PALETTE.white;
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 3; i++) {
    const length = 6 + ((Math.floor(time * 20) + i * 3) % 7);
    ctx.fillRect(Math.round(x - 16 - length - i * 4), groundY - 20 + i * 6, length, 1);
  }
  ctx.globalAlpha = 1;
}
