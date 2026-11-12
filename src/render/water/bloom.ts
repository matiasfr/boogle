// Ultra Water PostFX.js: six 13-tap downsamples (soft knee + Karis first), five additive tent upsamples.
// BloomNode's five Gaussian levels/high-pass do not reproduce this filter or its strength scale.
import { HalfFloatType } from 'three/webgpu';
import { luma, TSL, type N } from '../tone.ts';
import { clampTargetSize } from '../drawable-size.ts';

const { Fn, uv, vec2, vec3, vec4, float, max, min, clamp, textureSize, rtt } = TSL;

export function createWaterBloom(source: N, threshold: N) {
  const targets: N[] = [];
  const target = (node: N, scale: number, name: string) => {
    const out = rtt(node, null, null, { type: HalfFloatType, depthBuffer: false, resolutionScale: scale });
    clampTargetSize(out.renderTarget); // the 1/64 level floors to 0 on a canvas under 64 px (a pane opening)
    out.name = `water_bloom_${name.replaceAll(' ', '_')}`;
    out.value.name = out.name;
    targets.push(out);
    return out;
  };
  // Underwater is an expression, not a texture. Materialize it once, still in linear HDR.
  const hdr = target(source, 1, 'HDR');
  const down: N[] = [];
  for (let level = 0; level < 6; level++) {
    const input = level ? down[level - 1]! : hdr;
    down.push(
      target(
        Fn(() => {
          const at = uv(),
            texel = vec2(1).div(textureSize(input));
          const tap = (x: number, y: number) => {
            const c = input.sample(at.add(vec2(x, y).mul(texel))).rgb.toVar();
            if (level === 0) {
              c.assign(max(c, 0));
              const lum = max(luma(c), 1e-4).toVar();
              c.mulAssign(min(1, float(64).div(lum)));
              lum.assign(min(lum, 64));
              const knee = max(threshold.mul(0.5), 1e-4);
              const q = clamp(lum.sub(threshold.sub(knee)), 0, knee.mul(2));
              c.mulAssign(max(q.mul(q).mul(float(0.25).div(knee)), lum.sub(threshold)).div(lum));
            }
            return c;
          };
          const a = tap(-2, 2),
            b = tap(0, 2),
            c = tap(2, 2);
          const d = tap(-2, 0),
            e = tap(0, 0),
            f = tap(2, 0);
          const g = tap(-2, -2),
            h = tap(0, -2),
            i = tap(2, -2);
          const groups = [
            a.add(b).add(d).add(e).mul(0.25),
            b.add(c).add(e).add(f).mul(0.25),
            d.add(e).add(g).add(h).mul(0.25),
            e.add(f).add(h).add(i).mul(0.25),
            tap(-1, 1).add(tap(1, 1)).add(tap(-1, -1)).add(tap(1, -1)).mul(0.25),
          ];
          const sum = vec3(0).toVar(),
            weights = float(0).toVar();
          groups.forEach((group, index) => {
            const weight = float(index === 4 ? 0.5 : 0.125);
            const w = level === 0 ? weight.div(luma(group).add(1)) : weight;
            sum.addAssign(group.mul(w));
            weights.addAssign(w);
          });
          return vec4(level === 0 ? sum.div(weights) : sum, 1);
        })(),
        1 / 2 ** (level + 1),
        `down ${level}`,
      ),
    );
  }
  let coarse = down[5]!;
  for (let level = 4; level >= 0; level--) {
    const input = coarse,
      fine = down[level]!;
    coarse = target(
      Fn(() => {
        const at = uv(),
          texel = vec2(1).div(textureSize(input));
        const sum = vec3(0).toVar();
        for (let y = -1; y <= 1; y++)
          for (let x = -1; x <= 1; x++) {
            sum.addAssign(input.sample(at.add(vec2(x, y).mul(texel))).rgb.mul((x === 0 ? 2 : 1) * (y === 0 ? 2 : 1)));
          }
        // Separate target avoids reading and writing the same attachment; same additive reconstruction.
        return vec4(fine.sample(at).rgb.add(sum.mul(1 / 16)), 1);
      })(),
      1 / 2 ** (level + 1),
      `up ${level}`,
    );
  }
  return { hdr, glow: coarse, dispose: () => targets.forEach((t) => t.dispose()) };
}
