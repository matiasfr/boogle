// The seabed light: one baked tile sampled twice with scrolling, no render pass of its own. The receivers
// (./receivers.ts) project the sun ray to the surface and pick the tile's mip from CAUSTIC_TEXELS_PER_M.
import { seaU } from './state.ts';
import { TSL, type N } from './tsl.ts';
import { registerGraphics } from '../../graphics-settings.ts';
import { bakeCausticTile, CAUSTIC_SIZE } from './art.ts';
import { scalar } from './live.ts';

const { Fn, clamp, float, max, mix, texture, uniform, vec2 } = TSL;
const PERIOD = 6; // m: the tile's repeat
export const CAUSTIC_TEXELS_PER_M = CAUSTIC_SIZE / PERIOD;
const SCALE2 = 1.37;
const SUN_CAUSTICS = { gain: 3, lines: 0.8 };
/** Light focused on the bed at a sun-ray entry point, `depth` m down, at mip `lod`: 1 is unfocused. */
export type CausticSample = (entryXZ: N, depth: N, lod: N) => N;

export function createCaustics() {
  const tile = bakeCausticTile();
  const on = uniform(1);
  const gain = scalar('sun.caustics', SUN_CAUSTICS, 'gain'),
    lines = scalar('sun.causticLines', SUN_CAUSTICS, 'lines');
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
      // The product lights where the two webs cross and each web adds its own faint lines, so the net keeps moving up
      // close; both terms average to zero, so the mean stays one (the bed's brightness unchanged).
      const crossing = a.mul(b).sub(mean2).mul(gain),
        own = a
          .add(b)
          .sub(2 * tile.mean)
          .mul(lines);
      const intensity = max(float(1).add(crossing).add(own), 0.3);
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
