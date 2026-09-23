/**
 * The fullscreen switch: a pixel frame in the corner, beside the sound one.
 *
 * Filling the screen is worth real size here, because the game scales by
 * whole pixels: a laptop window showing the frame at four pixels each shows
 * it at six or seven fullscreen. Browsers without fullscreen never see the
 * control at all.
 */
import { createFullscreen } from '../../engine/fullscreen.js';
import { createPixelCanvas } from '../../engine/screen.js';
import { PALETTE } from '../../assets/palette.js';

const SCALE = 3;
const SIZE = 11;

/**
 * @param {HTMLElement} bar where the control sits
 * @param {HTMLElement} target what fills the screen
 */
export function mountFullscreenToggle(bar, target) {
  const button = document.createElement('button');
  button.className = 'frame-button fullscreen-toggle';
  button.type = 'button';
  const { canvas, ctx } = createPixelCanvas(SIZE, SIZE);
  canvas.style.width = `${SIZE * SCALE}px`;
  canvas.style.height = `${SIZE * SCALE}px`;
  button.append(canvas);

  const screen = createFullscreen(target, document, () => paint());
  if (!screen.supported) return { paint() {} };
  bar.append(button);

  function paint() {
    const out = screen.active;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = PALETTE.white;
    // Four corner brackets: at the edges opening inward to fill the screen,
    // drawn back from the middle and opening outward to come out of it.
    for (const [cx, cy, dx, dy] of [
      [0, 0, 1, 1],
      [SIZE - 1, 0, -1, 1],
      [0, SIZE - 1, 1, -1],
      [SIZE - 1, SIZE - 1, -1, -1],
    ]) {
      const x = out ? cx + dx * 3 : cx;
      const y = out ? cy + dy * 3 : cy;
      const stepX = out ? -dx : dx;
      const stepY = out ? -dy : dy;
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(x + stepX * i, y, 1, 1);
        ctx.fillRect(x, y + stepY * i, 1, 1);
      }
    }
    button.setAttribute('aria-pressed', String(out));
    const label = out ? 'Leave fullscreen (F)' : 'Play fullscreen (F)';
    button.setAttribute('aria-label', label);
    button.title = label;
  }

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    screen.toggle();
    button.blur();
  });
  // Space and Enter play the game; they must not press this.
  button.addEventListener('keydown', (event) => {
    if (event.code === 'Space' || event.code === 'Enter') event.preventDefault();
  });
  for (const type of ['pointerdown', 'pointerup', 'touchstart', 'touchend']) {
    button.addEventListener(type, (event) => event.stopPropagation());
  }
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyF' && !event.repeat) screen.toggle();
  });

  paint();
  return { paint };
}
