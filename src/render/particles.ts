// The game's existing cosmetic particle pool; the isolated asset stage uses the same implementation.
import { renderer, scene } from './scene.ts';
import { onFrame } from '../loop.ts';
import { warmUp, warmDraw } from './precompile.ts';
import { createParticlePool, particleBeat } from './particle-pool.ts';
import { graphicsInitial, autoRung, onGraphicsChange, DETAIL_RUNGS } from '../graphics-settings.ts';
import { reducedMotion } from '../constants.ts';
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

function ambientIntervalScale() {
  if (reducedMotion) return 0;
  const detail = graphicsInitial('detail', ['auto', ...DETAIL_RUNGS], 'auto');
  return (detail === 'auto' ? autoRung() > 0 : detail !== 'full') ? 2 : 1;
}
let intervalScale = ambientIntervalScale();
onGraphicsChange(() => {
  intervalScale = ambientIntervalScale();
});

/** Owned by the resident view. A hitch can emit one puff, never a backlog. */
export const ambientParticleBeat = (seconds: number) => particleBeat(seconds, () => intervalScale);
