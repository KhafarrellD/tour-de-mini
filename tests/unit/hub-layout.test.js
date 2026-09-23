import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrapText, measureText, LINE_HEIGHT } from '../../engine/font.js';
import { SPORTS } from '../../games/sports.js';
import { cardWidth, bestLine, TAGLINE_ROWS, TAGLINE_INSET } from '../../games/hub/sport-select-scene.js';
import { nameScale, NAME_WIDTH } from '../../games/hub/athlete-select-scene.js';
import { ATHLETES } from '../../data/athletes.js';
import { SUMMARY_WIDTH, SUMMARY_ROWS } from '../../games/hub/results-scene.js';
import { stageSummary, IRONMAN_STAGES } from '../../games/ironman/ironman.js';

test('every sport tagline fits its card, at the width the current line-up gives it', () => {
  const width = cardWidth(SPORTS.length) - TAGLINE_INSET;
  const rows = TAGLINE_ROWS;
  for (const sport of SPORTS) {
    const lines = wrapText(sport.tagline, width);
    assert.ok(lines.length <= rows, `${sport.name}: ${lines.length} lines of tagline, room for ${rows}`);
    for (const line of lines) {
      assert.ok(measureText(line) <= width, `${sport.name}: "${line}" is ${measureText(line)}px, room for ${width}`);
    }
  }
});

test('cards keep shrinking as sports are added, and stay above a readable width', () => {
  assert.ok(cardWidth(6) < cardWidth(4), 'a sixth sport must not leave the cards as wide');
  assert.ok(TAGLINE_ROWS * LINE_HEIGHT <= 110, 'the tagline block has to fit inside the card');
});

test('no athlete name overruns the panel into the stat bars', () => {
  for (const athlete of ATHLETES) {
    const width = measureText(athlete.name) * nameScale(athlete.name);
    assert.ok(width <= NAME_WIDTH, `${athlete.name} is ${width}px wide, room for ${NAME_WIDTH}`);
  }
});

test('the ironman summary is two lines of stage splits that fit the results panel', () => {
  const stages = { SWIM: 21.8, BIKE: 46.04, T2: 6.9, RUN: 11.8 };
  const lines = stageSummary(stages);
  assert.equal(lines.length, 2);
  assert.ok(lines.length <= SUMMARY_ROWS);
  for (const line of lines) {
    assert.ok(measureText(line) <= SUMMARY_WIDTH, `"${line}" is ${measureText(line)}px, room for ${SUMMARY_WIDTH}`);
  }
  // Every stage is accounted for, in the order they were raced.
  assert.equal(lines.join(' ').replace(/\s+/g, ' '), 'SWIM 0:21.8 BIKE 0:46.0 T2 0:06.9 RUN 0:11.8');
  assert.deepEqual(IRONMAN_STAGES.filter((name) => !lines.join(' ').includes(name)), []);
});

test('a stage missing from the scoreboard still produces a printable summary', () => {
  const lines = stageSummary({ SWIM: 21.8, BIKE: 46 });
  assert.equal(lines.length, 2);
  for (const line of lines) assert.ok(measureText(line) <= SUMMARY_WIDTH);
});

test('a personal best fits its card, however slow the race was', () => {
  const width = cardWidth(SPORTS.length) - 4;
  // The slowest time each sport can print: a marathon that took hours, and
  // a minute-long race that went very wrong.
  for (const sport of SPORTS) {
    for (const seconds of [59.9, 599.9, 3599, 35999]) {
      const line = bestLine(sport, seconds);
      assert.ok(measureText(line) <= width, `${sport.name}: "${line}" is ${measureText(line)}px, room for ${width}`);
    }
  }
});
