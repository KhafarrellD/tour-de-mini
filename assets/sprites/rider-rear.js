/**
 * Road cyclist seen from behind, for the chase camera on descents. The
 * helmet and nape are part of the body here, since from behind they carry
 * no facial detail. The rear tire is drawn underneath, on columns 7-8 and
 * ending on the bottom row. Leaning into a corner shears the whole sprite.
 *
 * Roles: M helmet, m helmet vents, H hair, S skin, T top, t pocket band,
 * V sleeve, C cuff, A forearm, P shorts, Q thigh, L shin, W sock, O shoe,
 * F the bike's seat stays either side of the tire.
 */

const LEFT_UP = [
  '......MMMM......',
  '.....MMmmMM.....',
  '....MMMmmMMM....',
  '.....MHHHHM.....',
  '....TTTSSTTT....',
  '...TTTTTTTTTT...',
  '..VTTTTTTTTTTV..',
  '.VVTTTTTTTTTTVV.',
  '.CC.TTTTTTTT.CC.',
  '..A.TTTTTTTT.A..',
  '....tttttttt....',
  '.....TTTTTT.....',
  '....PPPPPPPP....',
  '....PPPPPPPP....',
  '....QQF..FQQ....',
  '....QQF..FQQ....',
  '...LL.F..FQQ....',
  '...LL.....LL....',
  '...WW.....LL....',
  '...OO.....LL....',
  '..........WW....',
  '..........OO....',
  '................',
];

const LEVEL = [
  ...LEFT_UP.slice(0, 14),
  '....QQF..FQQ....',
  '....QQF..FQQ....',
  '....QQF..FQQ....',
  '....LL....LL....',
  '....LL....LL....',
  '....LL....LL....',
  '....WW....WW....',
  '....OO....OO....',
  '................',
];

const RIGHT_UP = [
  ...LEFT_UP.slice(0, 14),
  ...LEFT_UP.slice(14).map((row) => [...row].reverse().join('')),
];

/** @type {import('./rig.js').Rig} */
export const RIDER_REAR = {
  width: 16,
  height: 23,
  // Rows from the top: back and thigh.
  build: {
    tall: [5, 15],
    compact: [5],
  },
  animations: {
    pedal: [{ rows: LEFT_UP }, { rows: LEVEL }, { rows: RIGHT_UP }, { rows: LEVEL }],
  },
};

/** Where the rear tire sits under the rider: its left column and top row. */
export const REAR_TIRE_AT = /** @type {const} */ ([7, 12]);
