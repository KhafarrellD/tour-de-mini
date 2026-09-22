/**
 * Seeded pseudo-random numbers (mulberry32). Scenery and rival behaviour use
 * a seed so that a given course always looks the same and tests are
 * repeatable.
 * @param {number} seed
 */
export function createRng(seed) {
  let state = seed >>> 0;

  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    /**
     * @param {number} min inclusive
     * @param {number} max inclusive
     */
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    /**
     * @template T
     * @param {readonly T[]} items
     * @returns {T}
     */
    pick(items) {
      return items[Math.floor(next() * items.length)];
    },
  };
}
