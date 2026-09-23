import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFullscreen } from '../../engine/fullscreen.js';

/**
 * A stand-in for the browser's fullscreen API, in either spelling.
 * @param {{ prefixed?: boolean, enabled?: boolean }} [options]
 * @returns {any}
 */
function fakeDocument({ prefixed = false, enabled = true } = {}) {
  /** @type {any} */
  const doc = {
    /** @type {string[]} */
    calls: [],
    /** @type {any} */
    listener: null,
    /** @param {string} type @param {any} listener */
    addEventListener(type, listener) {
      doc.calls.push(`listen:${type}`);
      doc.listener = listener;
    },
  };
  if (prefixed) {
    Object.assign(doc, {
      webkitFullscreenEnabled: enabled,
      webkitFullscreenElement: null,
      webkitExitFullscreen: () => doc.calls.push('exit'),
    });
  } else {
    Object.assign(doc, {
      fullscreenEnabled: enabled,
      fullscreenElement: null,
      exitFullscreen: () => {
        doc.calls.push('exit');
        return Promise.resolve();
      },
    });
  }
  return doc;
}

/**
 * @param {any} doc
 * @param {{ prefixed?: boolean }} [options]
 * @returns {any}
 */
function fakeElement(doc, { prefixed = false } = {}) {
  /** @type {any} */
  const element = {};
  const enter = () => {
    doc.calls.push('enter');
    if (prefixed) doc.webkitFullscreenElement = element;
    else doc.fullscreenElement = element;
    return Promise.resolve();
  };
  if (prefixed) Object.assign(element, { webkitRequestFullscreen: enter });
  else Object.assign(element, { requestFullscreen: enter });
  return element;
}

test('a browser without fullscreen is simply not offered it', () => {
  const doc = fakeDocument({ enabled: false });
  const screen = createFullscreen(fakeElement(doc), doc);
  assert.equal(screen.supported, false);
  // Asking anyway does nothing at all, rather than throwing.
  screen.toggle();
  assert.deepEqual(doc.calls.filter((/** @type {string} */ call) => call !== 'listen:fullscreenchange'), []);
});

test('toggling goes in, then comes back out', async () => {
  const doc = fakeDocument();
  const element = fakeElement(doc);
  const screen = createFullscreen(element, doc);
  assert.equal(screen.supported, true);
  assert.equal(screen.active, false);
  await screen.toggle();
  assert.equal(screen.active, true);
  await screen.toggle();
  assert.deepEqual(doc.calls.filter((/** @type {string} */ call) => !call.startsWith('listen')), ['enter', 'exit']);
});

test('the older webkit spelling works the same way', async () => {
  const doc = fakeDocument({ prefixed: true });
  const element = fakeElement(doc, { prefixed: true });
  const screen = createFullscreen(element, doc);
  assert.equal(screen.supported, true);
  await screen.toggle();
  assert.equal(screen.active, true);
  await screen.toggle();
  assert.deepEqual(doc.calls.filter((/** @type {string} */ call) => !call.startsWith('listen')), ['enter', 'exit']);
});

test('leaving fullscreen by any other means is noticed', () => {
  const doc = fakeDocument();
  const element = fakeElement(doc);
  /** @type {boolean[]} */
  const changes = [];
  const screen = createFullscreen(element, doc, () => changes.push(screen.active));
  doc.fullscreenElement = element;
  doc.listener();
  assert.deepEqual(changes, [true]);
  // Escape, or the browser's own control.
  doc.fullscreenElement = null;
  doc.listener();
  assert.deepEqual(changes, [true, false]);
});

test('a refusal from the browser is not an error the player sees', async () => {
  const doc = fakeDocument();
  /** @type {any} */
  const element = { requestFullscreen: () => Promise.reject(new Error('denied')) };
  const screen = createFullscreen(element, doc);
  await screen.toggle();
  assert.equal(screen.active, false);
});
