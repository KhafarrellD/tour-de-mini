import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ATHLETES, athletesFor, shortName } from '../../data/athletes.js';
import { PALETTE } from '../../assets/palette.js';
import { HAIR, FACIAL_HAIR, HEADWEAR, TRAITS } from '../../assets/sprites/heads.js';
import { wrapText, measureText } from '../../engine/font.js';
import { BIO_WIDTH } from '../../games/hub/athlete-select-scene.js';

/** @param {string} name */
const isColor = (name) => Object.hasOwn(PALETTE, name);

/** The athletes the brief asks for, by sport. More can be added freely. */
const BRIEF = {
  cycling: ['pogacar', 'vanderpoel', 'evenepoel', 'vanaert', 'pidcock', 'carapaz', 'vingegaard'],
  marathon: ['sawe', 'kejelcha', 'kipchoge', 'rayner', 'whelan', 'mantz', 'osako', 'almgren'],
  ironman: ['blummenfelt', 'wilde', 'stornes', 'geens', 'schomburg', 'riddle', 'laidlow'],
};

test('every athlete in the brief is on the right roster', () => {
  for (const [sport, ids] of Object.entries(BRIEF)) {
    const roster = athletesFor(/** @type {import('../../data/athletes.js').Sport} */ (sport)).map((a) => a.id);
    for (const id of ids) assert.ok(roster.includes(id), `${id} missing from ${sport}`);
  }
});

test('athlete ids are unique', () => {
  const ids = ATHLETES.map((athlete) => athlete.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('confirmed name spellings', () => {
  const names = ATHLETES.map((athlete) => athlete.name);
  for (const name of ['Tadej Pogačar', 'Jimmy Whelan', 'Conner Mantz', 'Sabastian Sawe', 'Kristian Blummenfelt']) {
    assert.ok(names.includes(name), name);
  }
});

for (const athlete of ATHLETES) {
  test(`${athlete.name}: every color is in the palette`, () => {
    const kitColors = Object.entries(athlete.kit)
      .filter(([key, value]) => !['pattern', 'legs'].includes(key) && value !== null && value !== 'rainbow')
      .map(([, value]) => /** @type {string} */ (value));
    const colors = [
      athlete.skin,
      athlete.hair.color,
      ...kitColors,
      ...Object.values(athlete.headwear).flatMap((hw) => [hw.color, hw.accent ?? hw.color]),
      ...(athlete.eyewear ? [athlete.eyewear.lens] : []),
      ...(athlete.bike ? [athlete.bike.frame] : []),
      ...(athlete.swimCap ? [athlete.swimCap] : []),
    ];
    for (const name of colors) assert.ok(isColor(name), `unknown color "${name}"`);
  });

  test(`${athlete.name}: every trait and style exists`, () => {
    assert.ok(HAIR[athlete.hair.style], athlete.hair.style);
    if (athlete.facialHair) assert.ok(FACIAL_HAIR[athlete.facialHair]);
    for (const hw of Object.values(athlete.headwear)) assert.ok(HEADWEAR[hw.type], hw.type);
    for (const trait of athlete.traits) assert.ok(TRAITS[trait], trait);
  });

  test(`${athlete.name}: has what their sport needs`, () => {
    if (athlete.sport !== 'marathon') {
      assert.ok(athlete.bike, 'bike');
      assert.equal(athlete.headwear.bike?.type, 'helmet', 'helmet on the bike');
    }
    if (athlete.sport === 'ironman') assert.ok(athlete.swimCap, 'swim cap');
    for (const value of Object.values(athlete.stats)) assert.ok(value >= 1 && value <= 10);
  });
}

test('short names keep Dutch and Belgian particles', () => {
  const byId = (/** @type {string} */ id) => /** @type {import('../../data/athletes.js').Athlete} */ (ATHLETES.find((a) => a.id === id));
  assert.equal(shortName(byId('vanderpoel')), 'VAN DER POEL');
  assert.equal(shortName(byId('vanaert')), 'VAN AERT');
  assert.equal(shortName(byId('pogacar')), 'POGAČAR');
  assert.equal(shortName(byId('kipchoge')), 'KIPCHOGE');
});

test('every athlete has a look and a bio that fit the select panel', () => {
  for (const athlete of ATHLETES) {
    assert.ok(athlete.look.length > 0, `${athlete.name} has no look`);
    assert.ok(athlete.bio.length > 0, `${athlete.name} has no bio`);
    const lines = wrapText(athlete.bio, BIO_WIDTH);
    assert.ok(lines.length <= 4, `${athlete.name}: bio needs ${lines.length} lines`);
    for (const line of lines) assert.ok(measureText(line) <= BIO_WIDTH, `${athlete.name}: "${line}" is too wide`);
  }
});
