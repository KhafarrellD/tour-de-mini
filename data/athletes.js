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
 * @property {string} look one line on what makes them recognizable on screen
 * @property {string} bio one line on who they are, shown when you pick them
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
  // ── The Tour ───────────────────────────────────────────────────────
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
    look: 'Hair tuft poking out of his helmet and rainbow cuffs',
    bio: 'Attacks from 100 km out and wins anyway. Five Tours and he is not done.',
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
    look: 'Tall with long legs, rainbow cuffs',
    bio: 'Grandson of Poulidor, son of a pro. The family business is suffering.',
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
    look: 'Compact build, white kit with bright blue sleeves, rainbow cuffs',
    bio: 'The little Belgian rocket. Was going to be a footballer, now he hurts everyone against the clock.',
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
    look: 'The tallest rider, yellow kit fading to black',
    bio: 'Huge engine, huge legs, huge everything. Wins the sprint, then says he was not at his best.',
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
    look: 'The smallest rider, navy kit with a gold band',
    bio: 'Smallest guy in the race and the fastest downhill. Brakes are optional.',
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
    look: 'All pink, helmet included',
    bio: 'The locomotive from Ecuador. Climbs like the air is thinner for everyone else.',
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
    look: 'Slimmer and shorter than his teammate van Aert',
    bio: 'Quiet, skinny, merciless on a climb. Packed fish for a living before this.',
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
    look: 'Coral singlet and black half-tights',
    bio: 'The upcoming GOAT. First man under two hours in a real race.',
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
    look: 'Tall, curly hair and a short beard',
    bio: 'A very tall skeleton who will come for you. Sub-two on his debut. Insane.',
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
    look: 'White arm sleeves and a half-orange singlet',
    bio: 'The man, the myth, the legend.',
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
    look: 'Mullet, moustache and dark sunglasses',
    bio: 'It is all the mullet and the moustache. Without them he is nothing.',
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
    look: 'Salomon skinsuit: white top, black tights, red logo',
    bio: 'The only one who went from cycling to running and not the other way. Looks like he is trying to injure himself.',
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
    look: 'Blond hair and an all-blue kit',
    bio: 'American record holder in the marathon and the half. Quietly very fast.',
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
    look: 'Black cap and a white singlet with black side panels',
    bio: 'The most aesthetic Asian runner in the sport. Every stride looks photoshopped.',
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
    look: 'Blond, tall, orange-red shoes',
    bio: 'A potential future GOAT. What a man.',
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
    look: 'Stocky build and a white cap worn backwards',
    bio: 'Built like a bowling ball, finishes like a missile. Olympic champion who never blows up.',
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
    look: 'Green suit and a black visor',
    bio: 'Came from mountain bikes and never calmed down. The green suit is a warning.',
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
    look: 'Grey suit, white cap, mirrored glasses',
    bio: 'One third of the Norwegian podium sweep that broke triathlon.',
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
    look: 'Black-yellow-red Belgian visor',
    bio: 'Belgian speed. Runs the last 10 km like somebody told him it was a 5 km.',
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
    look: 'Blond hair and a pink headband',
    bio: 'Pink headband, German engineering, no fear in the washing machine of a swim start.',
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
    look: 'Green-and-yellow shoulders and white calf sleeves',
    bio: 'South African who is always at the front before the running even starts.',
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
    look: 'Beard, backwards cap and an unzipped suit',
    bio: 'Holds the Kona bike record and took a world title nobody saw coming. Beard included.',
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
