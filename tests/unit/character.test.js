import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeBody, splitLayers, colorizer, lookFor, PAD } from '../../engine/character.js';
import { gridFromRows, gridToRows } from '../../engine/grid.js';
import { color, shadeOf, PALETTE, RAINBOW } from '../../assets/palette.js';
import { RUNNER } from '../../assets/sprites/runner.js';
import { RIDER } from '../../assets/sprites/rider.js';

/** @returns {import('../../data/athletes.js').Athlete} */
function athlete(overrides = {}) {
  return {
    id: 'test',
    name: 'Test Rider',
    sport: 'cycling',
    country: 'TST',
    team: 'Test Team',
    build: 'regular',
    skin: 'skinFair',
    hair: { style: 'short', color: 'hairBlack' },
    facialHair: null,
    eyewear: null,
    headwear: {},
    kit: {
      top: 'white',
      accent: 'red',
      pattern: 'plain',
      sleeves: null,
      cuffs: null,
      armSleeves: null,
      shorts: 'black',
      legs: 'short',
      shins: null,
      socks: 'white',
      shoes: 'volt',
    },
    traits: [],
    look: '',
    bio: '',
    stats: { power: 5, endurance: 5, technique: 5 },
    ...overrides,
  };
}

test('the head is stamped at the frame anchor, with hair on top', () => {
  const look = lookFor(athlete({ sport: 'marathon' }), 'run');
  const frame = RUNNER.animations.run[0];
  const grid = gridToRows(composeBody(RUNNER, 'run', 0, look));
  const [hx, hy] = frame.head ?? [0, 0];
  // Top row of the short hairstyle sits on the head's top row.
  assert.equal(grid[PAD.top + hy][PAD.left + hx + 1], 'H');
  // The eye is on row 2 of the head.
  assert.equal(grid[PAD.top + hy + 2][PAD.left + hx + 4], 'E');
});

test('tall athletes gain rows and compact ones lose rows', () => {
  const base = composeBody(RUNNER, 'run', 0, lookFor(athlete({ sport: 'marathon' }), 'run'));
  const tall = composeBody(RUNNER, 'run', 0, lookFor(athlete({ sport: 'marathon', build: 'tall' }), 'run'));
  const compact = composeBody(RUNNER, 'run', 0, lookFor(athlete({ sport: 'marathon', build: 'compact' }), 'run'));
  assert.equal(tall.height, base.height + RUNNER.build.tall.length);
  assert.equal(compact.height, base.height - RUNNER.build.compact.length);
});

test('far limbs split into a layer drawn behind the bike', () => {
  const grid = composeBody(RIDER, 'pedal', 0, lookFor(athlete(), 'bike'));
  const { far, near } = splitLayers(grid);
  const farCells = new Set(far.cells.filter((c) => c !== '.'));
  const nearCells = new Set(near.cells.filter((c) => c !== '.'));
  assert.ok(farCells.has('q'), 'far thigh is in the far layer');
  assert.ok(!nearCells.has('q'), 'far thigh is not in the near layer');
  assert.ok(nearCells.has('T'), 'torso is in the near layer');
  assert.ok(!farCells.has('T'));
});

test('far limbs use the shade of the near color', () => {
  const look = lookFor(athlete({ sport: 'marathon' }), 'run');
  const paint = colorizer(gridFromRows(['L', 'l']), look);
  assert.equal(paint('L', 0, 0), color('skinFair'));
  assert.equal(paint('l', 0, 1), shadeOf('skinFair'));
});

test('bib shorts cover the thigh on bikes, running shorts do not', () => {
  const cyclist = lookFor(athlete({ kit: { ...athlete().kit, legs: 'bib' } }), 'bike');
  const runner = lookFor(athlete({ sport: 'marathon' }), 'run');
  assert.equal(cyclist.colors.Q, color('black'));
  assert.equal(runner.colors.Q, color('skinFair'));
});

test('singlets leave the upper arm bare, jerseys cover it', () => {
  const bare = lookFor(athlete({ sport: 'marathon' }), 'run');
  const sleeved = lookFor(athlete({ kit: { ...athlete().kit, sleeves: 'blue' } }), 'bike');
  assert.equal(bare.colors.V, color('skinFair'));
  assert.equal(sleeved.colors.V, color('blue'));
});

test('the "lower" pattern paints the bottom of the torso in the accent color', () => {
  const kit = { ...athlete().kit, top: 'yellow', accent: 'black', pattern: 'lower' };
  const look = lookFor(athlete({ kit }), 'bike');
  const torso = gridFromRows(['TT', 'TT', 'TT', 'TT', 'TT']);
  const paint = colorizer(torso, look);
  assert.equal(paint('T', 0, 0), color('yellow'));
  assert.equal(paint('T', 0, 4), color('black'));
});

test('rainbow cuffs cycle through the world champion colors', () => {
  const kit = { ...athlete().kit, sleeves: 'white', cuffs: 'rainbow' };
  const paint = colorizer(gridFromRows(['CC']), lookFor(athlete({ kit }), 'bike'));
  assert.notEqual(paint('C', 0, 0), paint('C', 1, 0));
  assert.ok(RAINBOW.map((name) => color(name)).includes(/** @type {string} */ (paint('C', 0, 0))));
});

test('fixed-color trait parts keep their own colors', () => {
  const look = lookFor(
    athlete({ sport: 'ironman', traits: ['tricolorVisor'], headwear: { run: { type: 'visor', color: 'black' } } }),
    'run',
  );
  assert.equal(look.colors['2'], PALETTE.yellow);
});

test('bikes get headwear for the discipline, runners without any stay bare-headed', () => {
  const helmet = { type: 'helmet', color: 'white', accent: 'black' };
  const triathlete = athlete({ sport: 'ironman', headwear: { bike: helmet } });
  assert.ok(lookFor(triathlete, 'bike').headParts.some((part) => part.rows.join('').includes('M')));
  assert.ok(!lookFor(triathlete, 'run').headParts.some((part) => part.rows.join('').includes('M')));
});

test('the hit flash paints the whole body white', () => {
  const look = lookFor(athlete({ sport: 'marathon' }), 'run');
  const paint = colorizer(gridFromRows(['TSH']), look, { flash: true });
  assert.equal(paint('T', 0, 0), PALETTE.white);
  assert.equal(paint('S', 1, 0), PALETTE.white);
  assert.equal(paint('H', 2, 0), PALETTE.white);
});
