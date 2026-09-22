import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  gridFromRows,
  gridToRows,
  stamp,
  duplicateRows,
  removeRows,
  outline,
  shear,
  toRGBA,
} from '../../engine/grid.js';

test('rows become a grid with a width and height', () => {
  const grid = gridFromRows(['ab.', '.cd']);
  assert.equal(grid.width, 3);
  assert.equal(grid.height, 2);
  assert.deepEqual(gridToRows(grid), ['ab.', '.cd']);
});

test('ragged rows are rejected with the offending row number', () => {
  assert.throws(() => gridFromRows(['abc', 'ab']), /row 1/);
});

test('stamping draws only opaque cells and clips at the edges', () => {
  const base = gridFromRows(['....', '....', '....']);
  const hat = gridFromRows(['.M', 'MM']);
  assert.deepEqual(gridToRows(stamp(base, hat, 1, 0)), ['..M.', '.MM.', '....']);
  assert.deepEqual(gridToRows(stamp(base, hat, 3, 2)), ['....', '....', '....']);
  assert.deepEqual(gridToRows(stamp(base, hat, -1, -1)), ['M...', '....', '....']);
});

test('duplicating rows makes a sprite taller without distorting other rows', () => {
  const grid = gridFromRows(['H', 'T', 'L', 'O']);
  assert.deepEqual(gridToRows(duplicateRows(grid, [1, 2])), ['H', 'T', 'T', 'L', 'L', 'O']);
});

test('removing rows makes a sprite shorter', () => {
  const grid = gridFromRows(['H', 'T', 'L', 'O']);
  assert.deepEqual(gridToRows(removeRows(grid, [2])), ['H', 'T', 'O']);
});

test('the outline surrounds opaque pixels on four sides, not diagonally', () => {
  const grid = gridFromRows(['X']);
  assert.deepEqual(gridToRows(outline(grid, '#')), ['.#.', '#X#', '.#.']);
});

test('the outline does not cover interior pixels', () => {
  const grid = gridFromRows(['XX', 'XX']);
  assert.deepEqual(gridToRows(outline(grid, '#')), ['.##.', '#XX#', '#XX#', '.##.']);
});

test('shear leans a sprite row by row without losing pixels', () => {
  const grid = gridFromRows(['A', 'B', 'C']);
  assert.deepEqual(gridToRows(shear(grid, 1)), ['..A', '.B.', 'C..']);
  assert.deepEqual(gridToRows(shear(grid, -1)), ['A..', '.B.', '..C']);
  assert.deepEqual(gridToRows(shear(grid, 0.5)), ['.A', '.B', 'C.']);
});

test('large holes enclosed by the sprite (between wheel spokes) are not outlined', () => {
  const ring = gridFromRows(['XXXXX', 'X...X', 'X...X', 'XXXXX']);
  assert.deepEqual(gridToRows(outline(ring, '#')), [
    '.#####.',
    '#XXXXX#',
    '#X...X#',
    '#X...X#',
    '#XXXXX#',
    '.#####.',
  ]);
});

test('pinholes of up to 4 pixels are filled so no background leaks through', () => {
  const ring = gridFromRows(['XXX', 'X.X', 'XXX']);
  assert.deepEqual(gridToRows(outline(ring, '#')), ['.###.', '#XXX#', '#X#X#', '#XXX#', '.###.']);
});

test('toRGBA converts cells through a color function, leaving "." transparent', () => {
  const grid = gridFromRows(['R.']);
  const data = toRGBA(grid, (cell) => (cell === 'R' ? '#ff8000' : null));
  assert.deepEqual([...data], [255, 128, 0, 255, 0, 0, 0, 0]);
});

test('toRGBA passes cell coordinates so colors can vary by position', () => {
  const grid = gridFromRows(['CC']);
  const data = toRGBA(grid, (_cell, x) => (x === 0 ? '#0000ff' : '#ff0000'));
  assert.deepEqual([...data], [0, 0, 255, 255, 255, 0, 0, 255]);
});
