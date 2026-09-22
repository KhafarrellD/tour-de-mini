/**
 * Best results, kept in localStorage. Storage can be missing or throw (private
 * browsing, blocked cookies, a sandboxed iframe), so every access is guarded
 * and results fall back to memory for the session.
 */

const KEY = 'tour-de-mini:best';

/**
 * @typedef {object} StorageLike
 * @property {(key: string) => string | null} getItem
 * @property {(key: string, value: string) => void} setItem
 */

/**
 * @typedef {object} Best
 * @property {number} time seconds, lower is better
 * @property {string} athleteId
 */

/** @returns {StorageLike | null} */
function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** @param {unknown} value @returns {value is Best} */
function isBest(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (/** @type {Best} */ (value).time) === 'number' &&
    typeof (/** @type {Best} */ (value).athleteId) === 'string'
  );
}

/**
 * @param {StorageLike | null} [storage]
 */
export function createBestScores(storage = browserStorage()) {
  /** @type {Record<string, unknown>} */
  let saved = {};
  try {
    const raw = storage?.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (typeof parsed === 'object' && parsed !== null) saved = parsed;
  } catch {
    saved = {};
  }

  return {
    /**
     * @param {string} sport
     * @returns {Best | null}
     */
    get(sport) {
      const best = saved[sport];
      return isBest(best) ? best : null;
    },
    /**
     * Records a result; returns true when it is a new best.
     * @param {string} sport
     * @param {Best} result
     */
    submit(sport, result) {
      const best = this.get(sport);
      if (best && best.time <= result.time) return false;
      saved = { ...saved, [sport]: result };
      try {
        storage?.setItem(KEY, JSON.stringify(saved));
      } catch {
        // Unsaved beyond this session; the game carries on.
      }
      return true;
    },
  };
}
