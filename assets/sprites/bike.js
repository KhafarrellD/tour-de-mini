/**
 * Road bike, side view facing right. The frame and the wheels are separate
 * sprites: wheels spin at a rate tied to road speed, while the rider's
 * pedal frames (and the crank drawn with them) follow cadence.
 *
 * Roles: F frame, Z saddle and bar tape, z seatpost and chainring,
 * R tire, r rim, x spoke, h hub.
 */

/** @type {import('./rig.js').Rig} */
export const BIKE = {
  width: 24,
  height: 14,
  // Row 5 crosses the seat tube, down tube and fork, so repeating it gives a
  // taller frame whose saddle and bars rise together (see rider.js).
  build: {
    tall: [5],
    compact: [5],
  },
  animations: {
    frame: [
      {
        rows: [
          '....ZZZZ................',
          '......z.........ZZZ.....',
          '......z........FF..Z....',
          '.......FFFFFFFFF...Z....',
          '.......FF......FF.ZZ....',
          '......F..F....F..F......',
          '......F..F...F...F......',
          '.....F....F.F.....F.....',
          '.....FFF.zzzF.....F.....',
          '........Fzhz............',
          '.........zzz............',
          '........................',
          '........................',
          '........................',
        ],
      },
    ],
  },
};

/** Wheel hub centers on the bike frame grid. */
export const HUBS = /** @type {const} */ ([
  [5, 8],
  [18, 8],
]);

/**
 * Four rotation frames, 22.5° apart. Two crossed spokes repeat every 90°,
 * so the cycle reads as continuous clockwise rotation.
 */
export const WHEEL = {
  size: 11,
  frames: [
    [
      '...RRRRR...',
      '..RrrrrrR..',
      '.Rr..x..rR.',
      'Rr...x...rR',
      'Rr...x...rR',
      'RrxxxhxxxrR',
      'Rr...x...rR',
      'Rr...x...rR',
      '.Rr..x..rR.',
      '..RrrrrrR..',
      '...RRRRR...',
    ],
    [
      '...RRRRR...',
      '..RrrrrrR..',
      '.Rr...x.rR.',
      'Rr....x..rR',
      'Rrxx.x...rR',
      'Rr..xhx..rR',
      'Rr...x.xxrR',
      'Rr..x....rR',
      '.Rr.x...rR.',
      '..RrrrrrR..',
      '...RRRRR...',
    ],
    [
      '...RRRRR...',
      '..RrrrrrR..',
      '.Rr.....rR.',
      'Rr.x...x.rR',
      'Rr..x.x..rR',
      'Rr...h...rR',
      'Rr..x.x..rR',
      'Rr.x...x.rR',
      '.Rr.....rR.',
      '..RrrrrrR..',
      '...RRRRR...',
    ],
    [
      '...RRRRR...',
      '..RrrrrrR..',
      '.Rr.x...rR.',
      'Rr..x....rR',
      'Rr...x.xxrR',
      'Rr..xhx..rR',
      'Rrxx.x...rR',
      'Rr....x..rR',
      '.Rr...x.rR.',
      '..RrrrrrR..',
      '...RRRRR...',
    ],
  ],
};

/**
 * The rear tire seen from behind (chase camera). The lighter tread marks
 * scroll down the tire to show it rolling.
 */
export const REAR_TIRE = {
  frames: [
    ['RR', 'RR', 'Rr', 'RR', 'RR', 'Rr', 'RR', 'RR', 'Rr', 'RR', 'RR'],
    ['RR', 'Rr', 'RR', 'RR', 'Rr', 'RR', 'RR', 'Rr', 'RR', 'RR', 'RR'],
    ['RR', 'RR', 'RR', 'Rr', 'RR', 'RR', 'Rr', 'RR', 'RR', 'Rr', 'RR'],
  ],
};
