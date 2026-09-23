/**
 * Chiptune sound, synthesised in the browser — no audio files.
 *
 * Every sound is written as notes: a wave, a pitch and how long it rings.
 * Turning that into a schedule of voices is pure, so the sounds themselves
 * are unit-tested; only the last step touches WebAudio. Sound starts muted
 * and stays off until the player asks for it, which also means no
 * AudioContext exists until then — browsers refuse one before a gesture,
 * and a portfolio page that makes noise by itself is rude.
 */

const KEY = 'tour-de-mini:muted';
/** Semitones above C, for the note names used below. */
const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * @param {string} note a name like 'A4', 'F#3' or 'Bb5'
 * @returns {number} hertz
 */
export function noteFrequency(note) {
  const [, letter, accidental, octave] = /^([A-G])([#b]?)(-?\d)$/.exec(note) ?? [];
  if (!letter) throw new Error(`not a note: ${note}`);
  const semitone = SEMITONES[/** @type {keyof typeof SEMITONES} */ (letter)] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0);
  // A4 = 440 Hz, and each semitone is the twelfth root of two.
  const fromA4 = semitone - 9 + (Number(octave) - 4) * 12;
  return 440 * 2 ** (fromA4 / 12);
}

/**
 * @typedef {object} Note
 * @property {string} [note] pitch, or nothing for noise
 * @property {'square' | 'triangle' | 'sawtooth' | 'noise'} [wave]
 * @property {number} at seconds from the start of the sound
 * @property {number} length seconds
 * @property {number} [gain] 0..1
 */

/**
 * The game's whole sound palette. Short, dry and a little bright: this is a
 * 320x180 game, so the sounds are the size of the pixels.
 * @type {Record<string, Note[]>}
 */
export const SOUNDS = {
  /** Moving along a menu. */
  move: [{ note: 'E5', wave: 'square', at: 0, length: 0.05, gain: 0.18 }],
  /** Choosing something: two notes up. */
  select: [
    { note: 'E5', wave: 'square', at: 0, length: 0.06, gain: 0.22 },
    { note: 'B5', wave: 'square', at: 0.06, length: 0.12, gain: 0.22 },
  ],
  /** Coming back out of a screen. */
  back: [
    { note: 'B4', wave: 'square', at: 0, length: 0.06, gain: 0.18 },
    { note: 'E4', wave: 'square', at: 0.06, length: 0.1, gain: 0.18 },
  ],
  /** One pedal stroke or one stride: felt more than heard. */
  tick: [{ note: 'A3', wave: 'triangle', at: 0, length: 0.035, gain: 0.1 }],
  /** A perfect hit on a timing bar. */
  perfect: [
    { note: 'E5', wave: 'square', at: 0, length: 0.05, gain: 0.2 },
    { note: 'G#5', wave: 'square', at: 0.05, length: 0.05, gain: 0.2 },
    { note: 'B5', wave: 'square', at: 0.1, length: 0.16, gain: 0.22 },
  ],
  /** Inside the zone, but off the middle. */
  good: [{ note: 'B4', wave: 'square', at: 0, length: 0.09, gain: 0.18 }],
  /** Mistimed. */
  miss: [
    { note: 'D#4', wave: 'sawtooth', at: 0, length: 0.08, gain: 0.16 },
    { note: 'A3', wave: 'sawtooth', at: 0.07, length: 0.14, gain: 0.16 },
  ],
  /** Going down on a corner. */
  crash: [
    { wave: 'noise', at: 0, length: 0.32, gain: 0.3 },
    { note: 'D3', wave: 'sawtooth', at: 0, length: 0.3, gain: 0.18 },
  ],
  /** A stroke breaking the water, or clipping a buoy. */
  splash: [{ wave: 'noise', at: 0, length: 0.14, gain: 0.16 }],
  /** A stage of the Ironman is done. */
  stage: [
    { note: 'C5', wave: 'triangle', at: 0, length: 0.1, gain: 0.2 },
    { note: 'G5', wave: 'triangle', at: 0.1, length: 0.22, gain: 0.2 },
  ],
  /** Crossing the line. */
  finish: [
    { note: 'C5', wave: 'square', at: 0, length: 0.1, gain: 0.22 },
    { note: 'E5', wave: 'square', at: 0.1, length: 0.1, gain: 0.22 },
    { note: 'G5', wave: 'square', at: 0.2, length: 0.1, gain: 0.22 },
    { note: 'C6', wave: 'square', at: 0.3, length: 0.34, gain: 0.24 },
    { note: 'C4', wave: 'triangle', at: 0.3, length: 0.34, gain: 0.14 },
  ],
  /** The seconds before a race starts. */
  countdown: [{ note: 'A4', wave: 'square', at: 0, length: 0.08, gain: 0.2 }],
};

/**
 * @typedef {object} Voice
 * @property {'square' | 'triangle' | 'sawtooth' | 'noise'} type
 * @property {number} [frequency] hertz, absent for noise
 * @property {number} start seconds on the audio clock
 * @property {number} stop
 * @property {number} gain
 */

/**
 * @param {Note[]} notes
 * @param {number} at seconds on the audio clock
 * @param {number} [volume] scales every note
 * @returns {Voice[]}
 */
function schedule(notes, at, volume = 1) {
  return notes.map((note) => ({
    type: note.wave ?? 'square',
    frequency: note.note ? noteFrequency(note.note) : undefined,
    start: at + note.at,
    stop: at + note.at + note.length,
    gain: (note.gain ?? 0.2) * volume,
  }));
}

/**
 * @param {string} name
 * @param {number} at seconds on the audio clock
 * @returns {Voice[]}
 */
export function scheduleFor(name, at) {
  return schedule(SOUNDS[name] ?? [], at);
}

/**
 * How long a sound rings for, from its first note to its last.
 * @param {string} name
 */
export function soundLength(name) {
  return (SOUNDS[name] ?? []).reduce((end, note) => Math.max(end, note.at + note.length), 0);
}

/**
 * The music under the menus: a bar of bass with an arpeggio over it, quiet
 * enough to sit beneath every effect. It repeats for as long as nobody is
 * racing.
 */
export const MENU_LOOP = {
  seconds: 4,
  /** @type {Note[]} */
  notes: [
    // Bass, on the beat.
    ...['E2', 'E2', 'A2', 'A2', 'C3', 'C3', 'B2', 'B2'].map((note, i) => ({
      note,
      wave: /** @type {const} */ ('triangle'),
      at: i * 0.5,
      length: 0.24,
      gain: 0.1,
    })),
    // Arpeggio, on the off-beat.
    ...['E4', 'B4', 'E5', 'B4', 'A4', 'E5', 'A5', 'E5', 'C5', 'G5', 'C6', 'G5', 'B4', 'F#5', 'B5', 'F#5'].map(
      (note, i) => ({
        note,
        wave: /** @type {const} */ ('square'),
        at: i * 0.25 + 0.125,
        length: 0.12,
        gain: 0.07,
      }),
    ),
  ],
};

/**
 * One repeat of the menu loop, starting at `at` on the audio clock.
 * @param {number} at
 * @returns {Voice[]}
 */
export function loopSchedule(at) {
  return schedule(MENU_LOOP.notes, at);
}

/**
 * @typedef {object} StorageLike
 * @property {(key: string) => string | null} getItem
 * @property {(key: string, value: string) => void} setItem
 */

/** @returns {StorageLike | null} */
function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Whether sound is off, remembered between visits. Muted until asked
 * otherwise, and a storage that throws only costs the memory of the choice.
 * @param {StorageLike | null} [storage]
 */
export function createMute(storage = browserStorage()) {
  let muted = true;
  try {
    muted = storage?.getItem(KEY) !== 'off';
  } catch {
    muted = true;
  }
  return {
    get muted() {
      return muted;
    },
    /** @param {boolean} value */
    set(value) {
      muted = value;
      try {
        storage?.setItem(KEY, value ? 'on' : 'off');
      } catch {
        // Forgotten after this session; the toggle still works.
      }
      return muted;
    },
    toggle() {
      return this.set(!muted);
    },
  };
}

/**
 * The sound the game actually plays. Everything above is data; this is the
 * only part that needs a browser.
 * @param {{ mute?: ReturnType<typeof createMute> }} [options]
 */
export function createAudio({ mute = createMute() } = {}) {
  /** @type {AudioContext | null} */
  let context = null;
  /** @type {GainNode | null} */
  let master = null;
  /** @type {AudioBuffer | null} */
  let noise = null;
  let loopUntil = 0;
  let loopWanted = false;
  /** @type {number | undefined} */
  let loopTimer;

  /** Starts the audio clock. Only ever called from a user gesture. */
  function wake() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return context;
    }
    const Ctor = globalThis.AudioContext ?? /** @type {any} */ (globalThis).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    master = context.createGain();
    master.gain.value = 0.7;
    master.connect(context.destination);
    // One second of white noise, reused for every crash and splash.
    noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    return context;
  }

  /** @param {Voice[]} voices */
  function emit(voices) {
    if (!context || !master) return;
    for (const voice of voices) {
      const gain = context.createGain();
      gain.connect(master);
      // A quick attack and a fade, so nothing clicks.
      gain.gain.setValueAtTime(0.0001, voice.start);
      gain.gain.exponentialRampToValueAtTime(voice.gain, voice.start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, voice.stop);
      if (voice.type === 'noise' && noise) {
        const source = context.createBufferSource();
        source.buffer = noise;
        source.connect(gain);
        source.start(voice.start);
        source.stop(voice.stop);
      } else if (voice.frequency) {
        const oscillator = context.createOscillator();
        oscillator.type = /** @type {OscillatorType} */ (voice.type);
        oscillator.frequency.value = voice.frequency;
        oscillator.connect(gain);
        oscillator.start(voice.start);
        oscillator.stop(voice.stop);
      }
    }
  }

  /** Queues repeats of the menu loop a little ahead of the clock. */
  function pump() {
    if (!context || mute.muted || !loopWanted) return;
    while (loopUntil < context.currentTime + 2) {
      const at = Math.max(loopUntil, context.currentTime + 0.05);
      emit(loopSchedule(at));
      loopUntil = at + MENU_LOOP.seconds;
    }
  }

  return {
    get muted() {
      return mute.muted;
    },
    /**
     * Plays one of the sounds above. Silent while muted, and before the
     * player has ever turned sound on there is no audio context at all.
     * @param {string} name
     */
    play(name) {
      if (mute.muted || !context) return;
      emit(scheduleFor(name, context.currentTime + 0.01));
    },
    /**
     * Starts or stops the menu music.
     * @param {boolean} on
     */
    music(on) {
      loopWanted = on;
      if (!on) {
        loopUntil = 0;
        return;
      }
      wake();
      pump();
    },
    /**
     * Turns sound on or off. Called from a click or a key, so this is where
     * the audio context is allowed to start.
     * @param {boolean} [value]
     */
    setMuted(value) {
      const muted = mute.set(value ?? !mute.muted);
      if (!muted) {
        wake();
        this.play('select');
        pump();
      } else {
        loopUntil = 0;
      }
      return muted;
    },
    /** Keeps the music queued; call once a frame. */
    update() {
      pump();
    },
    /** Lets go of the audio clock, for tests and teardown. */
    close() {
      clearTimeout(loopTimer);
      context?.close();
      context = null;
    },
  };
}

/**
 * The voice the scenes speak to. Scenes should not know whether sound
 * exists, so they call `sound.play('perfect')` and this forwards it to
 * whatever the page set up — or to nothing at all, in tests.
 * @type {{ play(name: string): void, music(on: boolean): void }}
 */
export const sound = {
  play() {},
  music() {},
};

/**
 * Hands the scenes a real voice. Called once, by the page.
 * @param {ReturnType<typeof createAudio>} audio
 */
export function useAudio(audio) {
  sound.play = (name) => audio.play(name);
  sound.music = (on) => audio.music(on);
}
