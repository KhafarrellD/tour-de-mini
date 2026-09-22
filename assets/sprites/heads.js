/**
 * Side-view head (facing right) and the layers stacked on it. Each part is
 * placed relative to the top-left of the 6x6 head at [dx, dy], so parts can
 * reach above or behind the skull (a helmet, a mullet, a curly top).
 *
 * Roles: S skin, s skin shade, E eye, H hair, h hair shade,
 * M headwear, m headwear accent, G lens, g eyewear frame.
 */

/**
 * @typedef {object} HeadPart
 * @property {readonly [number, number]} at offset from the head's top-left
 * @property {readonly string[]} rows
 * @property {Record<string, string>} [colors] fixed palette colors for digit
 *   roles, for details that look the same on everyone who has them
 * @property {string} [with] only drawn with this headwear type
 */

/** @type {HeadPart} */
export const HEAD = {
  at: [0, 0],
  rows: [
    '.SSSS.',
    'SSSSSS',
    'SSSSES',
    'SsSSSS',
    '.SSSSS',
    '..SSS.',
  ],
};

/** @type {Record<string, HeadPart>} */
export const HAIR = {
  short: {
    at: [0, 0],
    rows: [
      '.HHHH.',
      'HHHHHH',
      'HH....',
      'H.....',
    ],
  },
  slick: {
    at: [0, -1],
    rows: [
      '..HHH..',
      '.HHHHHH',
      'HHHHHH.',
      'HH.....',
      'H......',
    ],
  },
  buzz: {
    at: [0, 0],
    rows: [
      '.hhhh.',
      'hh....',
    ],
  },
  curly: {
    at: [-1, -2],
    rows: [
      '..HhHH..',
      '.HHHHhH.',
      'HhHHHHHH',
      'HHHh....',
      'HHH.....',
      '.H......',
    ],
  },
  mullet: {
    at: [-1, -1],
    rows: [
      '..HHHH..',
      '.HHHHHHH',
      'HHHHHHH.',
      'HHH.....',
      'HHH.....',
      'HH......',
      'HH......',
      '.H......',
    ],
  },
};

/** @type {Record<string, HeadPart>} */
export const FACIAL_HAIR = {
  beard: {
    at: [1, 3],
    rows: [
      '...H.',
      '.HHHH',
      '..HHH',
    ],
  },
  moustache: {
    at: [4, 4],
    rows: ['HH'],
  },
};

/** @type {Record<string, HeadPart>} */
export const HEADWEAR = {
  helmet: {
    at: [-1, -2],
    rows: [
      '...MMMM.',
      '.MMmMMmM',
      'MMMMMMMM',
      '.M......',
    ],
  },
  cap: {
    at: [0, -1],
    rows: [
      '.MMMM...',
      'MMMMMM..',
      'MMMMMmmm',
    ],
  },
  capBackwards: {
    at: [-2, -1],
    rows: [
      '...MMMM.',
      '..MMMMMM',
      'mmmMMMMM',
    ],
  },
  visor: {
    at: [0, 1],
    rows: ['MMMMMmmm'],
  },
  headband: {
    at: [0, 1],
    rows: ['MMMMMM'],
  },
};

/** @type {Record<string, HeadPart>} */
export const EYEWEAR = {
  shades: {
    at: [2, 2],
    rows: ['ggGG'],
  },
};

/**
 * Signature details drawn last, on top of everything else.
 * @type {Record<string, HeadPart>}
 */
export const TRAITS = {
  /** Pogačar's tuft of hair poking out of the front of his helmet. */
  tuft: {
    with: 'helmet',
    at: [4, -3],
    rows: [
      '.H',
      'H.',
    ],
  },
  /** Geens' visor in the Belgian tricolor. */
  tricolorVisor: {
    with: 'visor',
    at: [0, 1],
    rows: ['11222333'],
    colors: { 1: 'black', 2: 'yellow', 3: 'red' },
  },
};
