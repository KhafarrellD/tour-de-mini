/**
 * Freestyle swimmer, side view facing right, lying along the water line
 * (row 5). The stroke cycle alternates a reaching arm, a pulling arm and a
 * high-elbow recovery over the water while the legs flutter-kick.
 *
 * Roles: M cap, G goggles, S skin, T suit top, P suit shorts, L/l legs,
 * A/a arms. Lowercase is the far side.
 */

/** @type {import('./rig.js').Rig} */
export const SWIMMER = {
  width: 24,
  height: 10,
  build: {
    tall: [],
    compact: [],
  },
  animations: {
    stroke: [
      {
        rows: [
          '........................',
          '........................',
          '........................',
          '................MMM.....',
          'L.llLPPTTTTTTTTMMMMS....',
          '.LLLLPPTTTTTTTTSMGGSAA..',
          '.............a..SSAAAAAA',
          '.............a..........',
          '..............a.........',
          '..............a.........',
        ],
      },
      {
        rows: [
          '........................',
          '........................',
          '........................',
          '................MMM.....',
          '..llLPPTTTTTTTTMMMMS....',
          'LLLLLaaTTTTTTTTSMGGS....',
          '.......aaa....A.SSS.....',
          '..............A.........',
          '...............A........',
          '...............AA.......',
        ],
      },
      {
        rows: [
          '........................',
          '............a...........',
          '...........a.a..........',
          '..........a..a..MMM.....',
          'L.llLPPTTTTTTTTMMMMS....',
          '.LLLLPPTTTTTTTTSMGGS....',
          '........AAAA....SSS.....',
          '........................',
          '........................',
          '........................',
        ],
      },
      {
        rows: [
          '........................',
          '...............A........',
          '..............A.A.......',
          '..............A..AMMM...',
          '..llLPPTTTTTTTTMMMMS....',
          'LLLLLPPTTTTTTTTSMGGSaa..',
          '................SSaaaaaa',
          '........................',
          '........................',
          '........................',
        ],
      },
    ],
    idle: [
      {
        rows: [
          '........................',
          '........................',
          '........................',
          '................MMM.....',
          'L.llLPPTTTTTTTTMMMMS....',
          '.LLLLPPTTTTTTTTSMGGSAA..',
          '.........aaaa...SSAAAAAA',
          '........................',
          '........................',
          '........................',
        ],
      },
      {
        rows: [
          '........................',
          '........................',
          '........................',
          '................MMM.....',
          '..llLPPTTTTTTTTMMMMS....',
          'LLLLLPPTTTTTTTTSMGGSAA..',
          '.........aaaa...SSAAAAAA',
          '........................',
          '........................',
          '........................',
        ],
      },
    ],
  },
};
