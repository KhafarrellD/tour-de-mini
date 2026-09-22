/**
 * Tiny one-pixel particles for dust, spray and splashes. The pool is capped,
 * dropping the oldest particle first, so effects can never pile up.
 */

/**
 * @typedef {object} Particle
 * @property {number} x
 * @property {number} y
 * @property {number} vx pixels per second
 * @property {number} vy pixels per second
 * @property {number} life seconds left
 * @property {string} color
 * @property {number} [gravity] pixels per second squared
 */

export function createParticles(max = 200) {
  /** @type {Particle[]} */
  let list = [];

  return {
    get list() {
      return list;
    },
    /** @param {Particle} particle */
    spawn(particle) {
      if (list.length >= max) list.shift();
      list.push({ ...particle });
    },
    /** @param {number} dt */
    update(dt) {
      for (const p of list) {
        p.vy += (p.gravity ?? 0) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      }
      list = list.filter((p) => p.life > 0);
    },
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} [offsetX] camera shift applied to every particle
     */
    draw(ctx, offsetX = 0) {
      for (const p of list) {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x - offsetX), Math.round(p.y), 1, 1);
      }
    },
  };
}
