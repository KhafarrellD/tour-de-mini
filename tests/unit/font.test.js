import { test } from 'node:test';
import assert from 'node:assert/strict';
import { measureText, glyphFor, wrapText, LINE_HEIGHT } from '../../engine/font.js';
import { GLYPHS } from '../../assets/font.js';

test('every glyph has the cap height of 7 rows, plus optional accent rows', () => {
  for (const [char, rows] of Object.entries(GLYPHS)) {
    assert.ok(rows.length === 7 || rows.length === 9, `glyph ${char} has ${rows.length} rows`);
    const width = rows[0].length;
    for (const row of rows) assert.equal(row.length, width, `glyph ${char} is ragged`);
  }
});

test('the font covers letters, digits and the punctuation the games use', () => {
  for (const char of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:!?-+/%\'()<> Č') {
    assert.ok(GLYPHS[char], `missing glyph ${JSON.stringify(char)}`);
  }
});

test('text width is the sum of glyph widths plus 1px spacing', () => {
  const a = GLYPHS.A[0].length;
  assert.equal(measureText('A'), a);
  assert.equal(measureText('AA'), a * 2 + 1);
  assert.equal(measureText(''), 0);
});

test('lowercase text is drawn with the uppercase glyphs', () => {
  assert.equal(glyphFor('č'), GLYPHS['Č']);
  assert.equal(measureText('pogačar'), measureText('POGAČAR'));
});

test('unknown characters fall back to "?" instead of vanishing', () => {
  assert.equal(glyphFor('@'), GLYPHS['?']);
});

test('line height leaves room for accents above capitals', () => {
  assert.ok(LINE_HEIGHT >= 9);
});

test('wrapText breaks lines at spaces so none exceeds the width', () => {
  const lines = wrapText('THE QUICK BROWN FOX JUMPS', 40);
  assert.ok(lines.length > 1);
  for (const line of lines) assert.ok(measureText(line) <= 40, line);
  assert.equal(lines.join(' '), 'THE QUICK BROWN FOX JUMPS');
});

test('wrapText keeps a word longer than the width on its own line', () => {
  assert.deepEqual(wrapText('A SUPERCALIFRAGILISTIC B', 20), ['A', 'SUPERCALIFRAGILISTIC', 'B']);
});
