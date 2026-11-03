// The existing dome's inexpensive directional colour, shared with water through the skyAt seam.
// No scene import and no cube/LUT bake. The owner can choose a different reflection source independently later.
import { Color, Vector3, Matrix3 } from 'three';
import { TSL, type N } from './water/tsl.ts';
const { uniform, mix, pow, max, dot, vec3, float } = TSL;
export const skyU = {
  uTop: uniform(new Color('#3d9de3')),
  uCurve: uniform(0.6),
  uHorizon: uniform(new Color('#bfe6f5')),
  uSun: uniform(new Vector3()),
  uMoon: uniform(new Vector3()),
  uGlow: uniform(new Color('#ffd27a')),
  uMoonGlow: uniform(0),
  uStars: uniform(0),
  uStarRot: uniform(new Matrix3()),
};

/** With roughness zero this is the dome's original colour/glow calculation, before stars and its existing clamp. */
export function skyRadiance(d: N, roughness: N = float(0)) {
  const ramp = pow(max(d.y, 0), skyU.uCurve);
  const col = mix(skyU.uHorizon, skyU.uTop, ramp).toVar();
  const s = max(dot(d, skyU.uSun), 0),
    m = max(dot(d, skyU.uMoon), 0);
  const broad = float(1).add(roughness.mul(32));
  const glow = pow(s, float(6).div(broad))
    .mul(0.28)
    .add(pow(s, float(40).div(broad)).mul(0.3))
    .add(pow(s, float(400).div(broad)).mul(0.45));
  col.addAssign(skyU.uGlow.mul(glow));
  col.addAssign(
    vec3(0.5, 0.58, 0.88)
      .mul(
        pow(m, float(40).div(broad))
          .mul(0.3)
          .add(pow(m, float(700).div(broad)).mul(0.45)),
      )
      .mul(skyU.uMoonGlow),
  );
  return col;
}

export const gameWaterSky = {
  sunColor: uniform(new Color(1, 1, 1)), // coordinator copies the actual active key light, including the moon
  skyAt: (direction: N, roughness: N) => TSL.min(skyRadiance(direction, roughness), 1),
  skyLod: (direction: N, lod: N) => TSL.min(skyRadiance(direction, lod.div(10)), 1),
  ambient: (normal: N) => TSL.min(skyRadiance(normal, float(1)), 1),
};
