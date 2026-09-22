import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createParticles } from '../../engine/particles.js';

test('particles move by their velocity and fall with gravity', () => {
  const particles = createParticles();
  particles.spawn({ x: 10, y: 20, vx: 30, vy: -10, life: 1, color: '#fff', gravity: 60 });
  particles.update(0.5);
  const [p] = particles.list;
  assert.equal(p.x, 25);
  assert.ok(p.vy > -10, 'gravity pulls the particle down');
});

test('particles disappear when their life runs out', () => {
  const particles = createParticles();
  particles.spawn({ x: 0, y: 0, vx: 0, vy: 0, life: 0.2, color: '#fff' });
  particles.update(0.1);
  assert.equal(particles.list.length, 1);
  particles.update(0.15);
  assert.equal(particles.list.length, 0);
});

test('the pool is capped so a long race never grows memory', () => {
  const particles = createParticles(10);
  for (let i = 0; i < 50; i++) particles.spawn({ x: i, y: 0, vx: 0, vy: 0, life: 5, color: '#fff' });
  assert.equal(particles.list.length, 10);
  assert.equal(particles.list.at(-1)?.x, 49, 'newest particles are kept');
});
