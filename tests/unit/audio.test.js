import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  noteFrequency,
  SOUNDS,
  scheduleFor,
  soundLength,
  MENU_LOOP,
  loopSchedule,
  createMute,
} from '../../engine/audio.js';

test('notes convert to the frequencies they are meant to be', () => {
  assert.equal(Math.round(noteFrequency('A4')), 440);
  assert.equal(Math.round(noteFrequency('A5')), 880);
  assert.equal(Math.round(noteFrequency('C4')), 262);
  // An octave is a doubling, wherever you start.
  assert.ok(Math.abs(noteFrequency('E5') / noteFrequency('E4') - 2) < 1e-9);
  assert.ok(noteFrequency('F#4') > noteFrequency('F4'));
});

test('every sound the game asks for exists and is short', () => {
  const asked = ['move', 'select', 'back', 'tick', 'perfect', 'good', 'miss', 'crash', 'splash', 'stage', 'finish', 'countdown'];
  for (const name of asked) {
    assert.ok(SOUNDS[name], `no sound named ${name}`);
    const length = soundLength(name);
    assert.ok(length > 0, `${name} lasts no time at all`);
    assert.ok(length <= 2.2, `${name} lasts ${length}s, too long to fire during play`);
  }
});

test('a schedule places every voice in the future, with a real pitch and fade', () => {
  for (const name of Object.keys(SOUNDS)) {
    const voices = scheduleFor(name, 10);
    assert.ok(voices.length > 0, `${name} schedules nothing`);
    for (const voice of voices) {
      assert.ok(voice.start >= 10, `${name} starts in the past`);
      assert.ok(voice.stop > voice.start, `${name} stops before it starts`);
      assert.ok(voice.gain > 0 && voice.gain <= 1, `${name} gain ${voice.gain}`);
      if (voice.type === 'noise') {
        assert.equal(voice.frequency, undefined);
      } else {
        assert.ok(['square', 'triangle', 'sawtooth'].includes(voice.type), `${name} wave ${voice.type}`);
        const hz = voice.frequency ?? 0;
        assert.ok(hz > 20 && hz < 8000, `${name} at ${hz} Hz`);
      }
    }
  }
});

test('the menu loop is a bar of music that repeats seamlessly', () => {
  assert.ok(MENU_LOOP.seconds > 2 && MENU_LOOP.seconds < 20, `loop is ${MENU_LOOP.seconds}s`);
  const voices = loopSchedule(0);
  assert.ok(voices.length >= 8, `only ${voices.length} notes in the loop`);
  for (const voice of voices) {
    assert.ok(voice.start >= 0 && voice.start < MENU_LOOP.seconds, 'a note starts outside the bar');
    assert.ok(voice.stop <= MENU_LOOP.seconds + 0.001, 'a note runs past the end of the loop');
  }
  // The next repeat is the same music, one bar later.
  const next = loopSchedule(MENU_LOOP.seconds);
  assert.equal(next.length, voices.length);
  assert.ok(Math.abs(next[0].start - (voices[0].start + MENU_LOOP.seconds)) < 1e-9);
});

test('music is quieter than the effects it plays under', () => {
  const loudestNote = Math.max(...loopSchedule(0).map((voice) => voice.gain));
  const select = Math.max(...scheduleFor('select', 0).map((voice) => voice.gain));
  assert.ok(loudestNote < select, `music ${loudestNote} vs effects ${select}`);
});

test('sound is off until someone turns it on, and the choice is remembered', () => {
  /** @type {Record<string, string>} */
  const saved = {};
  const storage = {
    getItem: (/** @type {string} */ key) => saved[key] ?? null,
    setItem: (/** @type {string} */ key, /** @type {string} */ value) => {
      saved[key] = value;
    },
  };
  const first = createMute(storage);
  assert.equal(first.muted, true, 'sound starts muted');
  first.toggle();
  assert.equal(first.muted, false);
  // A later visit remembers it was turned on.
  assert.equal(createMute(storage).muted, false);
  first.toggle();
  assert.equal(createMute(storage).muted, true);
});

test('a broken storage never stops the game making sound', () => {
  const broken = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    },
  };
  const mute = createMute(broken);
  assert.equal(mute.muted, true);
  mute.toggle();
  assert.equal(mute.muted, false, 'the toggle still works for this session');
});
