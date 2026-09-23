/**
 * Pick a sport: one card per game in games/sports.js, each with a live
 * preview of its sport's first athlete.
 */
import { drawText, wrapText, LINE_HEIGHT } from '../../engine/font.js';
import { athletesFor } from '../../data/athletes.js';
import { createSideScene, SCENE } from '../shared/side-scene.js';
import { createMenu } from '../shared/menu.js';
import { drawPanel, drawMenuHint, menuHint } from '../shared/ui.js';
import { PALETTE } from '../../assets/palette.js';

/** @typedef {import('../sports.js').Sport} Sport */

const CARD_HEIGHT = 110;
const CARD_GAP = 8;
const MARGIN = 8;
/** Where the tagline starts inside a card, and where the preview road begins. */
const TAGLINE_TOP = 22;
const ROAD_HEIGHT = 20;
/** Padding taken off the card width before the tagline is wrapped. */
export const TAGLINE_INSET = 12;

/**
 * Lines of tagline that fit between the card's title and its preview road.
 * Cards are a fixed height, so this does not depend on how many there are.
 */
export const TAGLINE_ROWS = Math.floor((CARD_HEIGHT - ROAD_HEIGHT - TAGLINE_TOP - 2) / LINE_HEIGHT);

/**
 * Cards share the width, shrinking as sports are added.
 * @param {number} count
 */
export function cardWidth(count) {
  return Math.min(104, Math.floor((320 - MARGIN * 2 - (count - 1) * CARD_GAP) / count));
}

/**
 * @param {{ sports: readonly Sport[], onPick: (sport: Sport) => void }} options
 * @returns {import('../../engine/director.js').Scene}
 */
export function createSportSelectScene({ sports, onPick }) {
  const scene = createSideScene();
  const menu = createMenu(sports.length);
  let time = 0;

  return {
    name: 'sport-select',
    update(dt, button) {
      time += dt;
      if (menu.update(dt, button) === 'select') onPick(sports[menu.index]);
    },
    render(ctx) {
      scene.draw(ctx, time * 12);
      drawText(ctx, 'CHOOSE A SPORT', 160, 8, { align: 'center', scale: 2, color: PALETTE.yellow });

      const width = cardWidth(sports.length);
      const total = sports.length * width + (sports.length - 1) * CARD_GAP;
      sports.forEach((sport, i) => {
        const x = Math.round(160 - total / 2 + i * (width + CARD_GAP));
        const y = 30;
        const active = i === menu.index;
        drawPanel(ctx, x, y, width, CARD_HEIGHT);
        if (active) {
          ctx.fillStyle = PALETTE.yellow;
          ctx.fillRect(x - 2, y - 2, width + 4, 1);
          ctx.fillRect(x - 2, y + CARD_HEIGHT + 1, width + 4, 1);
          ctx.fillRect(x - 2, y - 2, 1, CARD_HEIGHT + 4);
          ctx.fillRect(x + width + 1, y - 2, 1, CARD_HEIGHT + 4);
        }
        drawText(ctx, sport.name, x + width / 2, y + 8, {
          align: 'center',
          color: active ? PALETTE.yellow : PALETTE.white,
        });
        // Clipped rather than spilled: a tagline that outgrows its card is
        // caught by the layout test, not by the player.
        wrapText(sport.tagline, width - TAGLINE_INSET).slice(0, TAGLINE_ROWS).forEach((line, row) => {
          drawText(ctx, line, x + width / 2, y + TAGLINE_TOP + row * LINE_HEIGHT, {
            align: 'center',
            color: PALETTE.lightGrey,
          });
        });
        // A little stretch of road with the sport's first athlete in action.
        const roadY = y + CARD_HEIGHT - ROAD_HEIGHT;
        ctx.fillStyle = PALETTE.road;
        ctx.fillRect(x + 1, roadY, width - 2, ROAD_HEIGHT - 1);
        ctx.fillStyle = PALETTE.roadLine;
        ctx.fillRect(x + 1, roadY, width - 2, 1);
        const [athlete] = athletesFor(sport.roster);
        sport.drawAthlete(ctx, athlete, time, x + width / 2, roadY + 12, active);
      });

      drawMenuHint(ctx, menuHint(sports.length), menu.holdProgress, SCENE.laneY + 8);
    },
  };
}
