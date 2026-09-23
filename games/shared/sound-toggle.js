/**
 * The sound switch: a small pixel speaker in the corner of the frame.
 *
 * Sound is off until this is pressed, because a page that starts making
 * noise on its own is rude — and browsers will not start an audio clock
 * before a gesture anyway. It sits outside the 320x180 frame so it never
 * covers the game, and it refuses Space and Enter so the one button that
 * plays the game never toggles sound by accident.
 */
import { createPixelCanvas } from '../../engine/screen.js';
import { PALETTE } from '../../assets/palette.js';

const SCALE = 3;
const SIZE = 11;

/**
 * @param {HTMLElement} container
 * @param {ReturnType<typeof import('../../engine/audio.js').createAudio>} audio
 */
export function mountSoundToggle(container, audio) {
  const button = document.createElement('button');
  button.className = 'sound-toggle';
  button.type = 'button';
  const { canvas, ctx } = createPixelCanvas(SIZE, SIZE);
  canvas.style.width = `${SIZE * SCALE}px`;
  canvas.style.height = `${SIZE * SCALE}px`;
  button.append(canvas);
  container.append(button);

  function paint() {
    const on = !audio.muted;
    ctx.clearRect(0, 0, SIZE, SIZE);
    // The speaker: a box and a cone.
    ctx.fillStyle = on ? PALETTE.yellow : PALETTE.grey;
    ctx.fillRect(1, 4, 2, 3);
    ctx.fillRect(3, 3, 1, 5);
    ctx.fillRect(4, 2, 1, 7);
    ctx.fillRect(5, 1, 1, 9);
    if (on) {
      // Two waves coming off it.
      ctx.fillRect(7, 3, 1, 1);
      ctx.fillRect(8, 4, 1, 3);
      ctx.fillRect(7, 7, 1, 1);
      ctx.fillRect(10, 2, 1, 1);
      ctx.fillRect(9, 8, 1, 1);
    } else {
      // Crossed out.
      ctx.fillStyle = PALETTE.red;
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(7 + i, 2 + i, 1, 1);
        ctx.fillRect(11 - i - 1, 2 + i, 1, 1);
      }
    }
    button.setAttribute('aria-pressed', String(on));
    button.setAttribute('aria-label', on ? 'Sound on. Turn sound off (M)' : 'Sound off. Turn sound on (M)');
    button.title = on ? 'Sound on (M)' : 'Sound off (M)';
  }

  function toggle() {
    audio.setMuted(!audio.muted);
    paint();
  }

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    toggle();
    button.blur();
  });
  // The game's button is Space and Enter; this one must never answer to them.
  button.addEventListener('keydown', (event) => {
    if (event.code === 'Space' || event.code === 'Enter') event.preventDefault();
  });
  // Tapping the switch must not also count as a tap on the game.
  for (const type of ['pointerdown', 'pointerup', 'touchstart', 'touchend']) {
    button.addEventListener(type, (event) => event.stopPropagation());
  }
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyM' && !event.repeat) toggle();
  });

  paint();
  return { paint };
}
