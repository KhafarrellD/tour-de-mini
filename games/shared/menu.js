/**
 * Menus driven by the single button: a tap moves to the next item, holding
 * selects it. A visible meter fills while the button is held, so the
 * gesture explains itself. With one item, a tap selects straight away.
 */

/** Seconds the button must be held to select. */
export const HOLD_TO_SELECT = 0.45;

/** @typedef {import('../../engine/input.js').ButtonState} ButtonState */

/**
 * @param {number} count number of items
 * @param {number} [start] initially highlighted item
 */
export function createMenu(count, start = 0) {
  // A press that began on the previous screen (the hold that selected
  // something there) must not leak into this one.
  let armed = false;
  let holding = false;
  let heldFor = 0;
  let fired = false;

  const menu = {
    index: start,
    /** 0..1 while the button is held, for the hold meter. */
    holdProgress: 0,
    /**
     * @param {number} dt
     * @param {ButtonState} button
     * @returns {'next' | 'select' | null}
     */
    update(dt, button) {
      if (!armed) {
        if (!button.held && !button.pressed) armed = true;
        return null;
      }
      /** @type {'next' | 'select' | null} */
      let event = null;
      if (button.pressed) {
        holding = true;
        heldFor = 0;
        fired = false;
      }
      if (holding && button.held) {
        heldFor += dt;
        if (!fired && heldFor >= HOLD_TO_SELECT) {
          fired = true;
          event = 'select';
        }
      }
      if (holding && button.released) {
        holding = false;
        if (!fired) event = count === 1 ? 'select' : 'next';
        heldFor = 0;
      }
      if (event === 'next') menu.index = (menu.index + 1) % count;
      menu.holdProgress = holding && !fired ? Math.min(1, heldFor / HOLD_TO_SELECT) : 0;
      return event;
    },
  };
  return menu;
}
