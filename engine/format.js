/** Text formatting for HUDs and results. */

/**
 * A race clock, h:mm:ss.
 * @param {number} seconds
 */
export function formatClock(seconds) {
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * "1ST", "2ND", "3RD", "4TH"... in capitals for the pixel font.
 * @param {number} n
 */
export function ordinal(n) {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'TH' : ({ 1: 'ST', 2: 'ND', 3: 'RD' })[n % 10] ?? 'TH';
  return `${n}${suffix}`;
}
