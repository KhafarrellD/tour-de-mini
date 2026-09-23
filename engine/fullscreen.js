/**
 * Fullscreen, in both spellings the web has for it.
 *
 * The game is a fixed 320x180 frame scaled by whole pixels, so filling the
 * screen is worth real size: a laptop goes from four device pixels per game
 * pixel to six or more. It works embedded too — a page that allows
 * fullscreen lets the frame inside it fill the screen.
 *
 * Browsers that do not offer fullscreen (an iPhone, most notably) are not
 * offered a control for it, rather than a control that does nothing.
 */

/**
 * @param {any} element what to make fullscreen
 * @param {any} [doc]
 * @param {() => void} [onChange] called when fullscreen is entered or left,
 *   including by the browser's own control or Escape
 */
export function createFullscreen(element, doc = globalThis.document, onChange) {
  const enabled = Boolean(doc?.fullscreenEnabled ?? doc?.webkitFullscreenEnabled);
  const request = element?.requestFullscreen ?? element?.webkitRequestFullscreen;
  const exit = doc?.exitFullscreen ?? doc?.webkitExitFullscreen;
  const supported = enabled && Boolean(request) && Boolean(exit);

  const current = () => doc?.fullscreenElement ?? doc?.webkitFullscreenElement ?? null;

  if (supported && onChange) {
    for (const type of ['fullscreenchange', 'webkitfullscreenchange']) {
      doc.addEventListener(type, onChange);
    }
  }

  return {
    supported,
    get active() {
      return current() === element;
    },
    /** Goes in if out, comes out if in. A refusal is not the player's problem. */
    async toggle() {
      if (!supported) return;
      try {
        if (current() === element) await exit.call(doc);
        else await request.call(element);
      } catch {
        // Denied, or already changed by something else; nothing to report.
      }
    },
  };
}
