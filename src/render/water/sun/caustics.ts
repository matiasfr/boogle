// The Sunshine sea's seabed light (owner question 4's recommended answer): one baked tile sampled twice with scrolling,
// in place of the caustics producer's two render passes. Same receiver seam and texel density as ../caustics.ts.
import { CAUSTIC_TEXELS_PER_M, type CausticSample } from '../caustics.ts';
import { seaU } from '../state.ts';
import { TSL } from '../tsl.ts';
import { registerGraphics } from '../../../graphics-settings.ts';
import { bakeCausticTile, CAUSTIC_SIZE } from './art.ts';
import { scalar } from '../live.ts';

const { Fn, clamp, float, max, mix, texture, uniform, vec2 } = TSL;
const PERIOD = CAUSTIC_SIZE / CAUSTIC_TEXELS_PER_M; // m: the tile's texel density matches the producer's
const SCALE2 = 1.37;
export const SUN_CAUSTICS = { gain: 3 };

export function createStaticCaustics() {
  const tile = bakeCausticTile();
  const on = uniform(1);
  const gain = scalar('sun.caustics', SUN_CAUSTICS, 'gain');
  const unregister = registerGraphics({
    id: 'caustics',
    label: 'Caustics',
    choices: [true, false],
    default: true,
    applyMode: 'live',
    cost: 'two tile samples per lit seabed pixel',
    skips: 'Flat seabed light: the receivers skip the scrolling caustic tile.',
    read: () => on.value === 1,
    apply: (value) => {
      on.value = value === true ? 1 : 0;
    },
  });
  const mean2 = tile.mean * tile.mean;
  const sample: CausticSample = (entryXZ, depth, lod) =>
    Fn(() => {
      const t = seaU.uTime;
      const a = texture(tile.texture, entryXZ.div(PERIOD).add(vec2(0.021, 0.013).mul(t))).level(lod).r;
      const b = texture(tile.texture, entryXZ.div(PERIOD * SCALE2).add(vec2(-0.016, 0.011).mul(t))).level(
        max(lod.sub(Math.log2(SCALE2)), 0),
      ).r;
      // The product lights where the two webs cross; normalised so the mean stays one (the bed's brightness unchanged).
      const intensity = max(float(1).add(a.mul(b).sub(mean2).mul(gain)), 0.3);
      return mix(1, intensity, clamp(depth.div(1.5), 0, 1).mul(on));
    })();
  return {
    sample,
    bytes: Math.round((CAUSTIC_SIZE * CAUSTIC_SIZE * 4) / 3),
    dispose() {
      unregister();
      tile.texture.dispose();
    },
  };
}
export type StaticCaustics = ReturnType<typeof createStaticCaustics>;
