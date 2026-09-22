/**
 * Every game is played with a single button: Space or Enter on a keyboard,
 * or a tap anywhere on a touch screen. Browser events are queued as they
 * arrive and read once per fixed update with `poll()`, so a tap shorter than
 * one frame is never lost.
 */

/**
 * @typedef {object} ButtonState
 * @property {boolean} pressed went down since the last poll
 * @property {boolean} released went up since the last poll
 * @property {boolean} held is down right now
 * @property {number} pressedAt timestamp (ms) of the latest press, -1 if never
 */

export function createButton() {
  let held = false;
  let pressed = false;
  let released = false;
  let pressedAt = -1;

  return {
    /** @param {number} time ms */
    press(time) {
      if (held) return; // keyboard auto-repeat
      held = true;
      pressed = true;
      pressedAt = time;
    },
    /** @param {number} _time ms */
    release(_time) {
      if (!held) return;
      held = false;
      released = true;
    },
    /** Forgets a held button, e.g. when the window loses focus mid-press. */
    reset() {
      held = false;
      pressed = false;
      released = false;
    },
    /** @returns {ButtonState} */
    poll() {
      const state = { pressed, released, held, pressedAt };
      pressed = false;
      released = false;
      return state;
    },
  };
}

/** @typedef {ReturnType<typeof createButton>} Button */

const KEYS = new Set(['Space', 'Enter']);

/**
 * Wires a button to keyboard and pointer events. Keys are handled on the
 * window; pointer input only on `surface`, so any HTML controls outside it
 * keep working normally. Space and Enter never scroll the page, which also
 * keeps a parent page still when the game runs inside an iframe.
 * @param {Button} button
 * @param {HTMLElement} surface
 * @returns {() => void} removes the listeners
 */
export function bindButton(button, surface) {
  /** @param {KeyboardEvent} event */
  const onKeyDown = (event) => {
    if (!KEYS.has(event.code)) return;
    event.preventDefault();
    if (!event.repeat) button.press(event.timeStamp);
  };
  /** @param {KeyboardEvent} event */
  const onKeyUp = (event) => {
    if (!KEYS.has(event.code)) return;
    event.preventDefault();
    button.release(event.timeStamp);
  };
  /** @param {PointerEvent} event */
  const onPointerDown = (event) => {
    if (!event.isPrimary) return;
    event.preventDefault();
    window.focus(); // inside an iframe, keys only arrive once the frame has focus
    button.press(event.timeStamp);
  };
  /** @param {PointerEvent} event */
  const onPointerUp = (event) => {
    if (event.isPrimary) button.release(event.timeStamp);
  };
  const onBlur = () => button.reset();

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  surface.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('blur', onBlur);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    surface.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    window.removeEventListener('blur', onBlur);
  };
}
