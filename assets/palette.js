/**
 * The master palette. Every color in the game comes from this list, which
 * keeps athletes, bikes and scenery visually cohesive. Colors used on
 * athletes come in pairs: `name` and `nameShade`, the darker tone used for
 * limbs on the far side of the body.
 */
export const PALETTE = {
  outline: '#1a1423',

  // Skin
  skinPale: '#f7d7bb',
  skinPaleShade: '#dfae8e',
  skinFair: '#efbf98',
  skinFairShade: '#cf9672',
  skinLight: '#e8b98e',
  skinLightShade: '#c79068',
  skinTan: '#d79f73',
  skinTanShade: '#b37a52',
  skinBrown: '#b07448',
  skinBrownShade: '#8a5634',
  skinDark: '#7a4a2e',
  skinDarkShade: '#5a321e',

  // Hair
  hairBlond: '#f0d078',
  hairBlondShade: '#c9a24e',
  hairSandy: '#d0a868',
  hairSandyShade: '#a47e46',
  hairLightBrown: '#9c6b42',
  hairLightBrownShade: '#74492a',
  hairDarkBrown: '#5c3b26',
  hairDarkBrownShade: '#3f2718',
  hairBlack: '#2e2630',
  hairBlackShade: '#1e181f',

  // Kit colors
  white: '#f5f3ee',
  whiteShade: '#c9cdd8',
  lightGrey: '#c4c8d2',
  lightGreyShade: '#9aa0ae',
  grey: '#7c8190',
  greyShade: '#5c6070',
  black: '#474759',
  blackShade: '#33334a',
  navy: '#243764',
  navyShade: '#182648',
  blue: '#2f6de0',
  blueShade: '#214fb0',
  sky: '#66b8f2',
  skyShade: '#4290cc',
  red: '#dc3440',
  redShade: '#a8222e',
  coral: '#f47c6c',
  coralShade: '#cc5a4e',
  orange: '#f58f2c',
  orangeShade: '#c86a1c',
  yellow: '#f8d32f',
  yellowShade: '#cfa816',
  gold: '#d9aa3c',
  goldShade: '#a8802a',
  volt: '#c8f23c',
  voltShade: '#98c022',
  green: '#2fa05c',
  greenShade: '#207442',
  pink: '#f0529e',
  pinkShade: '#c0347a',
  purple: '#7a4db4',
  purpleShade: '#58348c',
  lavender: '#cdbdee',
  lavenderShade: '#a594cc',

  // Bike parts
  tire: '#2c2a33',
  spoke: '#8f95a3',
  metal: '#c4c8d2',

  // Interface
  panel: '#251d33',
  panelEdge: '#4a3b66',

  // Scenery
  skyHigh: '#6cb9ec',
  skyMid: '#8fd0f4',
  skyHaze: '#c3e7f7',
  cloud: '#ffffff',
  cloudShade: '#d9ecf7',
  mountain: '#7f9cc4',
  mountainShade: '#647fa8',
  snow: '#eef6fb',
  hill: '#79b35e',
  hillShade: '#5c9648',
  hillDark: '#467a3a',
  grass: '#69ad4b',
  grassShade: '#4f8f3a',
  road: '#5d5d6b',
  roadLight: '#717181',
  roadLine: '#f5f3ee',
  water: '#3c8ad0',
  waterDeep: '#2a6aa8',
  waterLight: '#7cc0ee',
  foam: '#ffffff',
};

/** @typedef {keyof typeof PALETTE} ColorName */

/**
 * Looks up a palette color, failing loudly on typos in athlete data.
 * @param {string} name
 * @returns {string}
 */
export function color(name) {
  const value = /** @type {Record<string, string>} */ (PALETTE)[name];
  if (!value) throw new Error(`Unknown palette color "${name}"`);
  return value;
}

/**
 * The darker partner of a color, or the color itself when it has none.
 * @param {string} name
 * @returns {string}
 */
export function shadeOf(name) {
  const value = /** @type {Record<string, string>} */ (PALETTE)[`${name}Shade`];
  return value ?? color(name);
}

/** The colors of the rainbow bands worn by world champions, in order. */
export const RAINBOW = ['blue', 'red', 'black', 'yellow', 'green'];
