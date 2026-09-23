/**
 * The Ironman: four stages back to back, each played by the engine that
 * already exists for it — the swim, the descent (shortened), the transition
 * and the sprint (shortened to a run to the line). Between them a card
 * shows the stage time and where you stand overall. This scene owns the
 * running order and the scoreboard; each stage scene owns its own picture.
 */
import { createIronman, recordStage, ironmanStandings, stageSummary, IRONMAN_STAGES, IRONMAN_COURSE } from './ironman.js';
import { createSwimScene } from './swim-scene.js';
import { createTransitionScene } from './transition-scene.js';
import { createDescentScene } from '../cycling/descent-scene.js';
import { createSprintScene } from '../cycling/sprint-scene.js';
import { drawText, measureText } from '../../engine/font.js';
import { formatShort, ordinal } from '../../engine/format.js';
import { drawPanel } from '../shared/ui.js';
import { PALETTE } from '../../assets/palette.js';

/** @typedef {import('../../data/athletes.js').Athlete} Athlete */
/** @typedef {import('../sports.js').Outcome} Outcome */
/** @typedef {import('../../engine/director.js').Scene} Scene */
/** @typedef {import('./ironman.js').StageResult} StageResult */

/** How long the card between stages stays up. */
const CARD_SECONDS = 2.2;

/**
 * @param {{ athlete: Athlete, rivals: Athlete[], seed: number, onFinish: (outcome: Outcome) => void }} options
 * @returns {Scene}
 */
export function createIronmanScene({ athlete, rivals, seed, onFinish }) {
  const race = createIronman({ athlete, rivals });
  let stage = 0;
  /** @type {Scene} */
  let current = buildStage(0);
  /** @type {{ stage: string, time: number, age: number } | null} */
  let card = null;

  /** @param {number} index */
  function buildStage(index) {
    const name = IRONMAN_STAGES[index];
    const common = { athlete, rivals, seed: seed + index * 7919 };
    if (name === 'SWIM') {
      return createSwimScene({ ...common, intro: true, onFinish: (results) => finishStage(name, results) });
    }
    if (name === 'BIKE') {
      return createDescentScene({
        ...common,
        metres: IRONMAN_COURSE.bikeMetres,
        intro: false,
        onFinish: (outcome) => finishStage(name, outcome.standings),
      });
    }
    if (name === 'T2') {
      return createTransitionScene({ ...common, onFinish: (results) => finishStage(name, results) });
    }
    return createSprintScene({
      ...common,
      metres: IRONMAN_COURSE.runMetres,
      attackPoints: IRONMAN_COURSE.runAttacks,
      intro: false,
      title: 'RUN TO THE LINE',
      discipline: 'run',
      onFinish: (outcome) => finishStage(name, outcome.standings),
    });
  }

  /**
   * @param {string} name
   * @param {StageResult[]} results
   */
  function finishStage(name, results) {
    recordStage(race, name, results);
    const mine = results.find((row) => row.isPlayer);
    card = { stage: name, time: mine?.time ?? 0, age: 0 };
  }

  const self = {
    name: stageName(),
    /**
     * @param {number} dt
     * @param {import('../../engine/input.js').ButtonState} button
     */
    update(dt, button) {
      if (card) {
        card.age += dt;
        if (card.age >= CARD_SECONDS) {
          card = null;
          stage++;
          if (stage >= IRONMAN_STAGES.length) {
            finishRace();
            return;
          }
          current = buildStage(stage);
        }
        self.name = stageName();
        return;
      }
      current.update(dt, button);
      self.name = stageName();
    },
    /** @param {CanvasRenderingContext2D} ctx */
    render(ctx) {
      current.render(ctx);
      if (card) drawCard(ctx, card);
    },
  };

  /** What is on screen right now: the card, or the stage playing. */
  function stageName() {
    const stageKey = IRONMAN_STAGES[Math.min(stage, IRONMAN_STAGES.length - 1)].toLowerCase();
    return card ? `ironman-card-${stageKey}` : `ironman-${stageKey}-${current.name}`;
  }

  function finishRace() {
    const rows = ironmanStandings(race);
    const place = rows.findIndex((row) => row.isPlayer) + 1;
    const mine = rows[place - 1];
    onFinish({
      time: mine.time,
      place,
      standings: rows,
      summary: stageSummary(mine.stages),
    });
  }

  /**
   * The card between stages: what that stage cost and where it leaves you.
   * @param {CanvasRenderingContext2D} ctx
   * @param {{ stage: string, time: number, age: number }} shown
   */
  function drawCard(ctx, shown) {
    const rows = ironmanStandings(race);
    const place = rows.findIndex((row) => row.isPlayer) + 1;
    const total = rows[place - 1].time;
    const leader = rows[0].time;
    ctx.fillStyle = PALETTE.outline;
    ctx.globalAlpha = 0.72;
    ctx.fillRect(0, 0, 320, 180);
    ctx.globalAlpha = 1;
    drawPanel(ctx, 46, 48, 228, 84);
    drawText(ctx, `${shown.stage} DONE`, 160, 56, { align: 'center', scale: 2, color: PALETTE.yellow });
    drawText(ctx, formatShort(shown.time), 160, 76, { align: 'center', scale: 2 });
    drawText(ctx, `TOTAL ${formatShort(total)}`, 160, 96, { align: 'center', color: PALETTE.lightGrey });
    const gap = place === 1 ? 'LEADING' : `+${formatShort(total - leader).replace('0:', '')} DOWN`;
    const line = `${ordinal(place)} OVERALL - ${gap}`;
    drawText(ctx, line, 160 - measureText(line) / 2, 110, { color: place === 1 ? PALETTE.volt : PALETTE.white });
    const next = IRONMAN_STAGES[Math.min(IRONMAN_STAGES.length - 1, stage + 1)];
    if (stage + 1 < IRONMAN_STAGES.length) {
      drawText(ctx, `NEXT: ${next}`, 160, 122, { align: 'center', color: PALETTE.skyHaze });
    }
  }

  return self;
}
