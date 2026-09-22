import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RUNNER } from '../../assets/sprites/runner.js';
import { RIDER } from '../../assets/sprites/rider.js';
import { RIDER_REAR } from '../../assets/sprites/rider-rear.js';
import { SWIMMER } from '../../assets/sprites/swimmer.js';
import { BIKE, WHEEL, REAR_TIRE } from '../../assets/sprites/bike.js';
import { HEAD, HAIR, FACIAL_HAIR, HEADWEAR, EYEWEAR, TRAITS } from '../../assets/sprites/heads.js';
import { BODY_ROLES } from '../../engine/character.js';

const RIGS = { RUNNER, RIDER, RIDER_REAR, SWIMMER, BIKE };
const BIKE_ROLES = new Set('FZzRrxh.');

for (const [name, rig] of Object.entries(RIGS)) {
  test(`${name}: every frame matches the rig size`, () => {
    for (const [animation, frames] of Object.entries(rig.animations)) {
      frames.forEach((frame, i) => {
        assert.equal(frame.rows.length, rig.height, `${animation}[${i}] height`);
        frame.rows.forEach((row, y) => {
          assert.equal(row.length, rig.width, `${animation}[${i}] row ${y}: "${row}"`);
        });
      });
    }
  });

  test(`${name}: frames only use known roles`, () => {
    const roles = rig === BIKE ? BIKE_ROLES : new Set([...BODY_ROLES, '.']);
    for (const [animation, frames] of Object.entries(rig.animations)) {
      frames.forEach((frame, i) => {
        for (const cell of frame.rows.join('')) {
          assert.ok(roles.has(cell), `${animation}[${i}] uses unknown role "${cell}"`);
        }
      });
    }
  });

  test(`${name}: build rows fall inside every frame`, () => {
    for (const frames of Object.values(rig.animations)) {
      for (const frame of frames) {
        const top = frame.head ? frame.head[1] : 0;
        for (const offset of [...rig.build.tall, ...rig.build.compact]) {
          assert.ok(top + offset >= 0 && top + offset < rig.height);
        }
      }
    }
  });
}

test('the player sprites respect the 36px height limit even when tall', () => {
  // +2 for the outline, + tall rows; riders also sit 1 row above the tire bottom.
  assert.ok(RUNNER.height + RUNNER.build.tall.length + 2 <= 36);
  const riderOnBike = RIDER.height + RIDER.build.tall.length + 1 + 2;
  assert.ok(riderOnBike <= 36, `rider on bike is ${riderOnBike}px`);
});

test('wheel frames are square and use bike roles', () => {
  for (const frame of WHEEL.frames) {
    assert.equal(frame.length, WHEEL.size);
    for (const row of frame) {
      assert.equal(row.length, WHEEL.size, `wheel row "${row}"`);
      for (const cell of row) assert.ok(BIKE_ROLES.has(cell), `wheel role "${cell}"`);
    }
  }
});

test('rear tire frames are all the same size', () => {
  for (const frame of REAR_TIRE.frames) {
    assert.equal(frame.length, REAR_TIRE.frames[0].length);
    for (const row of frame) assert.equal(row.length, 2);
  }
});

test('head parts are rectangular and use head roles', () => {
  const parts = [HEAD, ...Object.values({ ...HAIR, ...FACIAL_HAIR, ...HEADWEAR, ...EYEWEAR, ...TRAITS })];
  for (const part of parts) {
    const width = part.rows[0].length;
    for (const row of part.rows) {
      assert.equal(row.length, width, `head part row "${row}"`);
      for (const cell of row) {
        assert.ok(
          BODY_ROLES.has(cell) || cell === '.' || (part.colors && cell in part.colors),
          `head part uses unknown role "${cell}"`,
        );
      }
    }
  }
});
