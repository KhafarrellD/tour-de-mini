/**
 * Results for any sport: the finishing order, the player's time and best,
 * and a one-button menu to race again, change athlete, or go back.
 */
import { drawText, wrapText, LINE_HEIGHT } from '../../engine/font.js';
import { ordinal } from '../../engine/format.js';
import { shortName } from '../../data/athletes.js';
import { createSideScene, SCENE } from '../shared/side-scene.js';
import { createMenu } from '../shared/menu.js';
import { drawPanel, drawMenuHint, menuHint } from '../shared/ui.js';
import { PALETTE } from '../../assets/palette.js';

/** @typedef {import('../sports.js').Sport} Sport */
/** @typedef {import('../sports.js').Outcome} Outcome */
/** @typedef {import('../../data/athletes.js').Athlete} Athlete */

const OPTIONS = ['RACE AGAIN', 'NEW ATHLETE', 'SPORTS'];
/** Room for the summary inside the right-hand panel. */
export const SUMMARY_WIDTH = 134;
/** Lines of summary that fit below the best time without touching it. */
export const SUMMARY_ROWS = 3;

/**
 * @param {{
 *   sport: Sport,
 *   athlete: Athlete,
 *   outcome: Outcome,
 *   best: import('../../engine/storage.js').Best | null,
 *   newBest: boolean,
 *   onRaceAgain: () => void,
 *   onNewAthlete: () => void,
 *   onSports: () => void,
 * }} options
 * @returns {import('../../engine/director.js').Scene}
 */
export function createResultsScene({ sport, athlete, outcome, best, newBest, onRaceAgain, onNewAthlete, onSports }) {
  const scene = createSideScene();
  const menu = createMenu(OPTIONS.length);
  const actions = [onRaceAgain, onNewAthlete, onSports];
  let time = 0;

  return {
    name: 'results',
    update(dt, button) {
      time += dt;
      if (menu.update(dt, button) === 'select') actions[menu.index]();
    },
    render(ctx) {
      scene.draw(ctx, 0);
      const headline = outcome.place === 1 ? 'YOU WIN!' : `YOU FINISHED ${ordinal(outcome.place)}`;
      drawText(ctx, headline, 160, 6, { align: 'center', scale: 2, color: PALETTE.yellow });

      // Finishing order.
      drawPanel(ctx, 8, 26, 150, 92);
      outcome.standings.forEach((row, i) => {
        const y = 32 + i * LINE_HEIGHT;
        const color = row.isPlayer ? PALETTE.yellow : PALETTE.white;
        drawText(ctx, `${i + 1}`, 22, y, { align: 'right', color });
        drawText(ctx, row.isPlayer ? `${shortName(row.athlete)} (YOU)` : shortName(row.athlete), 28, y, { color });
        drawText(ctx, sport.formatTime(row.time), 152, y, { align: 'right', color });
      });

      // Your race.
      drawPanel(ctx, 166, 26, 146, 92);
      drawText(ctx, sport.name, 172, 32, { color: PALETTE.lightGrey });
      drawText(ctx, 'YOUR TIME', 172, 46);
      drawText(ctx, sport.formatTime(outcome.time), 306, 42, { align: 'right', scale: 2, color: PALETTE.yellow });
      drawText(ctx, 'BEST', 172, 64);
      if (best) drawText(ctx, sport.formatTime(best.time), 306, 64, { align: 'right' });
      if (newBest && Math.floor(time * 3) % 2 === 0) {
        drawText(ctx, 'NEW BEST!', 306, 76, { align: 'right', color: PALETTE.volt });
      }
      // Summary lines wrap to the panel, whatever a sport puts in them.
      const lines = outcome.summary.flatMap((line) => wrapText(line, SUMMARY_WIDTH)).slice(0, SUMMARY_ROWS);
      lines.forEach((line, i) => {
        drawText(ctx, line, 239, 112 - lines.length * LINE_HEIGHT + i * LINE_HEIGHT, {
          align: 'center',
          color: PALETTE.lightGrey,
        });
      });

      // The player on the road, with the menu beside them.
      sport.drawAthlete(ctx, athlete, time, 40, SCENE.laneY, false);
      OPTIONS.forEach((label, i) => {
        const x = 110 + i * 76;
        const active = i === menu.index;
        drawText(ctx, active ? `>${label}` : label, x, 136, {
          align: 'center',
          color: active ? PALETTE.yellow : PALETTE.white,
        });
      });
      drawMenuHint(ctx, menuHint(OPTIONS.length), menu.holdProgress, SCENE.laneY + 8);
    },
  };
}
