// The game's existing cosmetic particle pool; the isolated asset stage uses the same implementation.
import { renderer, scene } from './scene.ts';
import { onFrame } from '../loop.ts';
import { warmUp, warmDraw } from './precompile.ts';
import { createParticlePool } from './particle-pool.ts';
export type { Particle } from './particle-pool.ts';

const particles = createParticlePool(renderer);
scene.add(particles.object);
warmUp(particles.prepare, { beforeScene: true });
// Compile both per-particle looks on the actual HDR/MSAA target, even before the first emission.
warmDraw(() => {
  const visible = particles.object.visible;
  particles.object.visible = true;
  return () => (particles.object.visible = visible);
});
onFrame(({ dt }) => particles.update(dt), { phase: 'late', order: -20 });
export const emit = particles.emit;
export const particleCounts = particles.counts;
