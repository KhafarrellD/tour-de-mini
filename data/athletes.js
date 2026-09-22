/**
 * Every athlete in the game. This is the one file to edit to add or restyle
 * someone: sprites are built from these traits at runtime, so no art needs
 * redrawing. Colors are names from assets/palette.js. Research notes and
 * sources for each look: docs/athlete-research.md.
 */

/** @typedef {'cycling' | 'marathon' | 'ironman'} Sport */
/** @typedef {'run' | 'bike' | 'swim'} Discipline */
/** @typedef {'compact' | 'regular' | 'tall'} Build */

/**
 * @typedef {object} Headwear
 * @property {'helmet' | 'cap' | 'capBackwards' | 'visor' | 'headband'} type
 * @property {string} color
 * @property {string} [accent] vents, brim or stripe; defaults to a shade of `color`
 */

/**
 * @typedef {object} Kit
 * @property {string} top jersey, singlet or tri-suit
 * @property {string} accent second kit color, placed by `pattern`
 * @property {'plain' | 'lower' | 'shoulders' | 'band' | 'side' | 'split' | 'logo' | 'open'} pattern
 * @property {string | null} sleeves null for sleeveless
 * @property {'rainbow' | string | null} cuffs sleeve ends; "rainbow" for world champions
 * @property {string | null} armSleeves forearm sleeves, null for bare arms
 * @property {string} shorts
 * @property {'short' | 'bib' | 'tights'} legs how far the shorts reach down the thigh
 * @property {string | null} shins compression sleeves, null for bare shins
 * @property {string} socks
 * @property {string} shoes
 */

/**
 * @typedef {object} Athlete
 * @property {string} id
 * @property {string} name
 * @property {Sport} sport
 * @property {string} country IOC code
 * @property {string} team team or main sponsor, shown on the select screen
 * @property {Build} build
 * @property {string} skin
 * @property {{ style: 'short' | 'slick' | 'buzz' | 'curly' | 'mullet', color: string }} hair
 * @property {'beard' | 'moustache' | null} facialHair
 * @property {{ lens: string } | null} eyewear
 * @property {Partial<Record<Discipline, Headwear>>} headwear
 * @property {Kit} kit
 * @property {{ frame: string }} [bike]
 * @property {string} [swimCap]
 * @property {string[]} traits signature head details from assets/sprites/heads.js
 * @property {string} signature one line on what makes them recognizable
 * @property {{ power: number, endurance: number, technique: number }} stats 1-10
 */

/** @type {Kit} */
const CYCLING_KIT = {
  top: 'white',
  accent: 'white',
  pattern: 'plain',
  sleeves: 'white',
  cuffs: null,
  armSleeves: null,
  shorts: 'black',
  legs: 'bib',
  shins: null,
  socks: 'white',
  shoes: 'white',
};

/** @type {Kit} */
const RUNNING_KIT = {
  top: 'white',
  accent: 'white',
  pattern: 'plain',
  sleeves: null,
  cuffs: null,
  armSleeves: null,
  shorts: 'black',
  legs: 'short',
  shins: null,
  socks: 'white',
  shoes: 'white',
};

/** @type {Kit} */
const TRI_KIT = { ...RUNNING_KIT, sleeves: 'white', legs: 'bib' };

/** @type {Athlete[]} */
export const ATHLETES = [
  // ── Tour de Mini France ────────────────────────────────────────────
  {
    id: 'pogacar',
    name: 'Tadej Pogačar',
    sport: 'cycling',
    country: 'SLO',
    team: 'UAE Team Emirates-XRG',
    build: 'regular',
    skin: 'skinFair',
    hair: { style: 'short', color: 'hairLightBrown' },
    facialHair: null,
    eyewear: { lens: 'sky' },
    headwear: { bike: { type: 'helmet', color: 'white', accent: 'black' } },
    kit: { ...CYCLING_KIT, top: 'white', accent: 'black', pattern: 'lower', cuffs: 'rainbow' },
    bike: { frame: 'white' },
    traits: ['tuft'],
    signature: 'Hair tuft poking out of his helmet and rainbow cuffs',
    stats: { power: 9, endurance: 10, technique: 9 },
  },
  {
    id: 'vanderpoel',
    name: 'Mathieu van der Poel',
    sport: 'cycling',
    country: 'NED',
    team: 'Alpecin-Premier Tech',
    build: 'tall',
    skin: 'skinFair',
    hair: { style: 'short', color: 'hairLightBrown' },
    facialHair: null,
    eyewear: { lens: 'blue' },
    headwear: { bike: { type: 'helmet', color: 'black', accent: 'white' } },
    kit: { ...CYCLING_KIT, top: 'blue', accent: 'navy', pattern: 'lower', sleeves: 'blue', cuffs: 'rainbow', shorts: 'navy' },
    bike: { frame: 'navy' },
    traits: [],
    signature: 'Tall with long legs, rainbow cuffs',
    stats: { power: 10, endurance: 8, technique: 9 },
  },
  {
    id: 'evenepoel',
    name: 'Remco Evenepoel',
    sport: 'cycling',
    country: 'BEL',
    team: 'Red Bull-BORA-hansgrohe',
    build: 'compact',
    skin: 'skinFair',
    hair: { style: 'short', color: 'hairDarkBrown' },
    facialHair: null,
    eyewear: { lens: 'gold' },
    headwear: { bike: { type: 'helmet', color: 'white', accent: 'blue' } },
    kit: { ...CYCLING_KIT, top: 'white', accent: 'blue', pattern: 'plain', sleeves: 'blue', cuffs: 'rainbow', shorts: 'navy' },
    bike: { frame: 'blue' },
    traits: [],
    signature: 'Compact build, white kit with bright blue sleeves, rainbow cuffs',
    stats: { power: 8, endurance: 9, technique: 8 },
  },
  {
    id: 'vanaert',
    name: 'Wout van Aert',
    sport: 'cycling',
    country: 'BEL',
    team: 'Visma-Lease a Bike',
    build: 'tall',
    skin: 'skinFair',
    hair: { style: 'slick', color: 'hairDarkBrown' },
    facialHair: null,
    eyewear: { lens: 'black' },
    headwear: { bike: { type: 'helmet', color: 'yellow', accent: 'black' } },
    kit: { ...CYCLING_KIT, top: 'yellow', accent: 'black', pattern: 'lower', sleeves: 'yellow' },
    bike: { frame: 'yellow' },
    traits: [],
    signature: 'The tallest rider, yellow kit fading to black',
    stats: { power: 10, endurance: 8, technique: 8 },
  },
  {
    id: 'pidcock',
    name: 'Tom Pidcock',
    sport: 'cycling',
    country: 'GBR',
    team: 'Pinarello-Q36.5',
    build: 'compact',
    skin: 'skinFair',
    hair: { style: 'short', color: 'hairLightBrown' },
    facialHair: null,
    eyewear: { lens: 'gold' },
    headwear: { bike: { type: 'helmet', color: 'navy', accent: 'gold' } },
    kit: { ...CYCLING_KIT, top: 'navy', accent: 'gold', pattern: 'band', sleeves: 'navy', shorts: 'navy' },
    bike: { frame: 'gold' },
    traits: [],
    signature: 'The smallest rider, navy kit with a gold band',
    stats: { power: 8, endurance: 7, technique: 10 },
  },
  {
    id: 'carapaz',
    name: 'Richard Carapaz',
    sport: 'cycling',
    country: 'ECU',
    team: 'EF Education-EasyPost',
    build: 'compact',
    skin: 'skinBrown',
    hair: { style: 'short', color: 'hairBlack' },
    facialHair: null,
    eyewear: { lens: 'black' },
    headwear: { bike: { type: 'helmet', color: 'pink', accent: 'purple' } },
    kit: { ...CYCLING_KIT, top: 'pink', accent: 'purple', pattern: 'shoulders', sleeves: 'pink', shorts: 'purple' },
    bike: { frame: 'pink' },
    traits: [],
    signature: 'All pink, helmet included',
    stats: { power: 7, endurance: 9, technique: 8 },
  },
  {
    id: 'vingegaard',
    name: 'Jonas Vingegaard',
    sport: 'cycling',
    country: 'DEN',
    team: 'Visma-Lease a Bike',
    build: 'regular',
    skin: 'skinPale',
    hair: { style: 'short', color: 'hairSandy' },
    facialHair: null,
    eyewear: { lens: 'sky' },
    headwear: { bike: { type: 'helmet', color: 'yellow', accent: 'black' } },
    kit: { ...CYCLING_KIT, top: 'yellow', accent: 'black', pattern: 'lower', sleeves: 'yellow' },
    bike: { frame: 'yellow' },
    traits: [],
    signature: 'Slimmer and shorter than his teammate van Aert',
    stats: { power: 7, endurance: 10, technique: 8 },
  },

  // ── Marathon ───────────────────────────────────────────────────────
  {
    id: 'sawe',
    name: 'Sabastian Sawe',
    sport: 'marathon',
    country: 'KEN',
    team: 'adidas',
    build: 'regular',
    skin: 'skinDark',
    hair: { style: 'buzz', color: 'hairBlack' },
    facialHair: null,
    eyewear: null,
    headwear: {},
    kit: { ...RUNNING_KIT, top: 'coral', legs: 'tights' },
    traits: [],
    signature: 'Coral singlet and black half-tights',
    stats: { power: 9, endurance: 10, technique: 8 },
  },
  {
    id: 'kejelcha',
    name: 'Yomif Kejelcha',
    sport: 'marathon',
    country: 'ETH',
    team: 'adidas',
    build: 'tall',
    skin: 'skinDark',
    hair: { style: 'curly', color: 'hairBlack' },
    facialHair: 'beard',
    eyewear: null,
    headwear: {},
    kit: { ...RUNNING_KIT, top: 'lavender', shorts: 'purple' },
    traits: [],
    signature: 'Tall, curly hair and a short beard',
    stats: { power: 10, endurance: 8, technique: 8 },
  },
  {
    id: 'kipchoge',
    name: 'Eliud Kipchoge',
    sport: 'marathon',
    country: 'KEN',
    team: 'NN Running Team',
    build: 'compact',
    skin: 'skinDark',
    hair: { style: 'buzz', color: 'hairBlack' },
    facialHair: null,
    eyewear: null,
    headwear: {},
    kit: { ...RUNNING_KIT, top: 'white', accent: 'orange', pattern: 'split', armSleeves: 'white', shoes: 'volt' },
    traits: [],
    signature: 'White arm sleeves and a half-orange singlet',
    stats: { power: 8, endurance: 10, technique: 10 },
  },
  {
    id: 'rayner',
    name: 'Jack Rayner',
    sport: 'marathon',
    country: 'AUS',
    team: 'Nike',
    build: 'regular',
    skin: 'skinFair',
    hair: { style: 'mullet', color: 'hairSandy' },
    facialHair: 'moustache',
    eyewear: { lens: 'black' },
    headwear: {},
    kit: { ...RUNNING_KIT, top: 'orange', accent: 'yellow', pattern: 'band', shorts: 'navy' },
    traits: [],
    signature: 'Mullet, moustache and dark sunglasses',
    stats: { power: 7, endurance: 8, technique: 7 },
  },
  {
    id: 'whelan',
    name: 'Jimmy Whelan',
    sport: 'marathon',
    country: 'AUS',
    team: 'Salomon',
    build: 'tall',
    skin: 'skinFair',
    hair: { style: 'short', color: 'hairDarkBrown' },
    facialHair: null,
    eyewear: null,
    headwear: {},
    kit: { ...RUNNING_KIT, top: 'white', accent: 'red', pattern: 'logo', legs: 'tights' },
    traits: [],
    signature: 'Salomon skinsuit: white top, black tights, red logo',
    stats: { power: 7, endurance: 8, technique: 8 },
  },
  {
    id: 'mantz',
    name: 'Conner Mantz',
    sport: 'marathon',
    country: 'USA',
    team: 'Nike',
    build: 'regular',
    skin: 'skinFair',
    hair: { style: 'short', color: 'hairBlond' },
    facialHair: null,
    eyewear: null,
    headwear: {},
    kit: { ...RUNNING_KIT, top: 'blue', accent: 'sky', pattern: 'band', shorts: 'blue', shoes: 'volt' },
    traits: [],
    signature: 'Blond hair and an all-blue kit',
    stats: { power: 8, endurance: 9, technique: 8 },
  },
  {
    id: 'osako',
    name: 'Suguru Osako',
    sport: 'marathon',
    country: 'JPN',
    team: 'Li-Ning',
    build: 'regular',
    skin: 'skinLight',
    hair: { style: 'short', color: 'hairBlack' },
    facialHair: null,
    eyewear: null,
    headwear: { run: { type: 'cap', color: 'black' } },
    kit: { ...RUNNING_KIT, top: 'white', accent: 'black', pattern: 'side' },
    traits: [],
    signature: 'Black cap and a white singlet with black side panels',
    stats: { power: 7, endurance: 9, technique: 9 },
  },
  {
    id: 'almgren',
    name: 'Andreas Almgren',
    sport: 'marathon',
    country: 'SWE',
    team: 'Nike',
    build: 'tall',
    skin: 'skinPale',
    hair: { style: 'short', color: 'hairBlond' },
    facialHair: null,
    eyewear: null,
    headwear: {},
    kit: { ...RUNNING_KIT, top: 'white', accent: 'sky', pattern: 'band', shorts: 'navy', shoes: 'red' },
    traits: [],
    signature: 'Blond, tall, orange-red shoes',
    stats: { power: 9, endurance: 8, technique: 7 },
  },

  // ── Ironman ────────────────────────────────────────────────────────
  {
    id: 'blummenfelt',
    name: 'Kristian Blummenfelt',
    sport: 'ironman',
    country: 'NOR',
    team: 'CADEX',
    build: 'compact',
    skin: 'skinFair',
    hair: { style: 'short', color: 'hairLightBrown' },
    facialHair: null,
    eyewear: { lens: 'black' },
    headwear: {
      run: { type: 'capBackwards', color: 'white' },
      bike: { type: 'helmet', color: 'white', accent: 'navy' },
    },
    kit: { ...TRI_KIT, top: 'white', accent: 'navy', pattern: 'lower', shorts: 'navy' },
    bike: { frame: 'navy' },
    swimCap: 'red',
    traits: [],
    signature: 'Stocky build and a white cap worn backwards',
    stats: { power: 10, endurance: 9, technique: 7 },
  },
  {
    id: 'wilde',
    name: 'Hayden Wilde',
    sport: 'ironman',
    country: 'NZL',
    team: 'Canyon',
    build: 'regular',
    skin: 'skinFair',
    hair: { style: 'short', color: 'hairLightBrown' },
    facialHair: null,
    eyewear: { lens: 'black' },
    headwear: {
      run: { type: 'visor', color: 'black' },
      bike: { type: 'helmet', color: 'black', accent: 'green' },
    },
    kit: { ...TRI_KIT, top: 'green', accent: 'black', pattern: 'plain', sleeves: 'green' },
    bike: { frame: 'black' },
    swimCap: 'green',
    traits: [],
    signature: 'Green suit and a black visor',
    stats: { power: 10, endurance: 8, technique: 8 },
  },
  {
    id: 'stornes',
    name: 'Casper Stornes',
    sport: 'ironman',
    country: 'NOR',
    team: 'Pinarello',
    build: 'regular',
    skin: 'skinFair',
    hair: { style: 'short', color: 'hairSandy' },
    facialHair: null,
    eyewear: { lens: 'sky' },
    headwear: {
      run: { type: 'cap', color: 'white' },
      bike: { type: 'helmet', color: 'white', accent: 'lightGrey' },
    },
    kit: { ...TRI_KIT, top: 'lightGrey', sleeves: 'lightGrey' },
    bike: { frame: 'lightGrey' },
    swimCap: 'white',
    traits: [],
    signature: 'Grey suit, white cap, mirrored glasses',
    stats: { power: 8, endurance: 9, technique: 8 },
  },
  {
    id: 'geens',
    name: 'Jelle Geens',
    sport: 'ironman',
    country: 'BEL',
    team: 'HUUB',
    build: 'regular',
    skin: 'skinTan',
    hair: { style: 'short', color: 'hairDarkBrown' },
    facialHair: null,
    eyewear: null,
    headwear: {
      run: { type: 'visor', color: 'black' },
      bike: { type: 'helmet', color: 'black', accent: 'yellow' },
    },
    kit: { ...TRI_KIT, top: 'white', accent: 'black', pattern: 'side', shoes: 'yellow' },
    bike: { frame: 'black' },
    swimCap: 'yellow',
    traits: ['tricolorVisor'],
    signature: 'Black-yellow-red Belgian visor',
    stats: { power: 8, endurance: 9, technique: 9 },
  },
  {
    id: 'schomburg',
    name: 'Jonas Schomburg',
    sport: 'ironman',
    country: 'GER',
    team: 'Canyon',
    build: 'regular',
    skin: 'skinFair',
    hair: { style: 'short', color: 'hairBlond' },
    facialHair: null,
    eyewear: { lens: 'black' },
    headwear: {
      run: { type: 'headband', color: 'pink' },
      bike: { type: 'helmet', color: 'white', accent: 'navy' },
    },
    kit: { ...TRI_KIT, top: 'white', accent: 'navy', pattern: 'side', shorts: 'navy', shoes: 'volt' },
    bike: { frame: 'navy' },
    swimCap: 'pink',
    traits: [],
    signature: 'Blond hair and a pink headband',
    stats: { power: 8, endurance: 8, technique: 9 },
  },
  {
    id: 'riddle',
    name: 'Jamie Riddle',
    sport: 'ironman',
    country: 'RSA',
    team: 'Felt',
    build: 'regular',
    skin: 'skinFair',
    hair: { style: 'short', color: 'hairLightBrown' },
    facialHair: null,
    eyewear: { lens: 'gold' },
    headwear: { bike: { type: 'helmet', color: 'white', accent: 'green' } },
    kit: { ...TRI_KIT, top: 'white', accent: 'green', pattern: 'shoulders', shins: 'white' },
    bike: { frame: 'green' },
    swimCap: 'orange',
    traits: [],
    signature: 'Green-and-yellow shoulders and white calf sleeves',
    stats: { power: 7, endurance: 9, technique: 8 },
  },
  {
    id: 'laidlow',
    name: 'Sam Laidlow',
    sport: 'ironman',
    country: 'FRA',
    team: 'Canyon',
    build: 'regular',
    skin: 'skinFair',
    hair: { style: 'short', color: 'hairLightBrown' },
    facialHair: 'beard',
    eyewear: { lens: 'black' },
    headwear: {
      run: { type: 'capBackwards', color: 'white' },
      bike: { type: 'helmet', color: 'white', accent: 'blue' },
    },
    kit: { ...TRI_KIT, top: 'white', accent: 'skinFair', pattern: 'open', shins: 'white' },
    bike: { frame: 'blue' },
    swimCap: 'blue',
    traits: [],
    signature: 'Beard, backwards cap and an unzipped suit',
    stats: { power: 9, endurance: 8, technique: 7 },
  },
];

/** Name particles that belong to the surname: van der Poel, van Aert. */
const PARTICLES = new Set(['van', 'der', 'de', 'den']);

/**
 * The surname in capitals, for HUDs and results tables.
 * @param {Athlete} athlete
 */
export function shortName(athlete) {
  const words = athlete.name.split(' ');
  const first = words.findIndex((word, i) => i > 0 && PARTICLES.has(word));
  return words.slice(first > 0 ? first : -1).join(' ').toUpperCase();
}

/**
 * @param {Sport} sport
 * @returns {Athlete[]}
 */
export function athletesFor(sport) {
  return ATHLETES.filter((athlete) => athlete.sport === sport);
}
