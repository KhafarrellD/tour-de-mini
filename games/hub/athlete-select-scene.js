/**
 * Pick an athlete: the roster stands in a lineup on the road with their
 * names above them. The highlighted athlete moves (runs in place, pedals)
 * and their details fill the panel above.
 */
import { drawText, wrapText, measureText, LINE_HEIGHT } from '../../engine/font.js';
import { shortName } from '../../data/athletes.js';
import { createSideScene, SCENE } from '../shared/side-scene.js';
import { createMenu } from '../shared/menu.js';
import { drawPanel, drawStatBar, drawMenuHint, menuHint } from '../shared/ui.js';
import { PALETTE } from '../../assets/palette.js';

/** @typedef {import('../../data/athletes.js').Athlete} Athlete */
/** @typedef {import('../sports.js').Sport} Sport */

const BUILDS = { compact: 'COMPACT', regular: 'REGULAR', tall: 'TALL' };

/** Width available for an athlete's bio in the info panel, in game pixels. */
export const BIO_WIDTH = 164;
/** Width available for the headline name, before the stat bars begin. */
export const NAME_WIDTH = 176;

/**
 * Names are drawn twice size, except the long ones — a couple of surnames
 * would otherwise run straight through the stat bars.
 * @param {string} name
 */
export function nameScale(name) {
  return measureText(name) * 2 <= NAME_WIDTH ? 2 : 1;
}

/**
 * @param {{ sport: Sport, athletes: readonly Athlete[], startId?: string, onPick: (athlete: Athlete) => void }} options
 * @returns {import('../../engine/director.js').Scene}
 */
export function createAthleteSelectScene({ sport, athletes, startId, onPick }) {
  const scene = createSideScene();
  const start = Math.max(0, athletes.findIndex((athlete) => athlete.id === startId));
  const menu = createMenu(athletes.length, start);
  const spacing = 320 / (athletes.length + 1);
  let time = 0;

  return {
    name: 'athlete-select',
    update(dt, button) {
      time += dt;
      if (menu.update(dt, button) === 'select') onPick(athletes[menu.index]);
    },
    render(ctx) {
      scene.draw(ctx, 0);
      drawText(ctx, `CHOOSE YOUR ${sport.athleteNoun}`, 160, 6, { align: 'center', color: PALETTE.yellow });

      const athlete = athletes[menu.index];
      drawPanel(ctx, 8, 18, 304, 78);
      // A shrunken name keeps its baseline, so the panel reads the same.
      const scale = nameScale(athlete.name);
      drawText(ctx, athlete.name, 14, 24 + (scale === 2 ? 0 : 5), { scale });
      drawText(ctx, `${athlete.country} - ${athlete.team}`, 14, 43, { color: PALETTE.lightGrey });
      wrapText(athlete.bio, BIO_WIDTH).forEach((line, row) => {
        drawText(ctx, line, 14, 56 + row * LINE_HEIGHT, { color: PALETTE.yellow });
      });
      drawStatBar(ctx, 194, 26, 'POWER', athlete.stats.power);
      drawStatBar(ctx, 194, 38, 'ENDURANCE', athlete.stats.endurance);
      drawStatBar(ctx, 194, 50, 'TECHNIQUE', athlete.stats.technique);
      drawText(ctx, 'BUILD', 194, 66, { color: PALETTE.lightGrey });
      drawText(ctx, BUILDS[athlete.build], 252, 66);

      athletes.forEach((entry, i) => {
        const x = Math.round(spacing * (i + 1));
        const active = i === menu.index;
        drawText(ctx, shortName(entry), x, 100 + (i % 2) * 10, {
          align: 'center',
          color: active ? PALETTE.yellow : PALETTE.white,
        });
        sport.drawAthlete(ctx, entry, time + i * 0.23, x, SCENE.laneY, active);
      });

      // A bobbing arrow over the highlighted athlete's name.
      const x = Math.round(spacing * (menu.index + 1));
      const arrowY = 96 + (menu.index % 2) * 10 - (Math.floor(time * 3) % 2);
      ctx.fillStyle = PALETTE.outline;
      ctx.fillRect(x - 3, arrowY - 3, 7, 1);
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(x - 2, arrowY - 2, 5, 1);
      ctx.fillRect(x - 1, arrowY - 1, 3, 1);
      ctx.fillRect(x, arrowY, 1, 1);

      drawMenuHint(ctx, menuHint(athletes.length), menu.holdProgress, SCENE.laneY + 8);
    },
  };
}
