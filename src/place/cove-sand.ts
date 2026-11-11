// Ultra Water scene/terrain.js sand ripples, adapted to TSL. Normals only: no render/collision displacement.
import type { MeshStandardNodeMaterial } from 'three/webgpu';
import { patchNode } from '../render/material-patch.ts';
import { registerWaterReceiver, vnoise } from '../render/water/receivers.ts';
import { TSL, type N } from '../render/water/tsl.ts';
import { coveU } from './cove-tuning.ts';

const { Fn, cameraViewMatrix, cos, dot, float, fwidth, max, mix, normalViewGeometry, normalWorldGeometry } = TSL;
const { normalize, positionWorld, sin, smoothstep, vec2, vec4 } = TSL;

const ripplePhase = Fn(([p, d, frequency, noiseScale, warp]: [N, N, N, N, N]) =>
  frequency.mul(
    dot(p, d)
      .add(vnoise(p.mul(noiseScale)).sub(0.5).mul(warp))
      .add(vnoise(p.mul(noiseScale).mul(0.27).add(4)).sub(0.5).mul(warp).mul(3)),
  ),
);
const rippleSlope = Fn(([p, d, frequency, noiseScale, warp, amplitude]: [N, N, N, N, N, N]) => {
  const phase = ripplePhase(p, d, frequency, noiseScale, warp);
  const gradient = vec2(
    ripplePhase(p.add(vec2(0.01, 0)), d, frequency, noiseScale, warp),
    ripplePhase(p.add(vec2(0, 0.01)), d, frequency, noiseScale, warp),
  )
    .sub(phase)
    .div(0.01);
  return gradient.mul(amplitude).mul(cos(phase).add(sin(phase.mul(2)).mul(0.5)));
});

/** Call after the cove's base colour/normal graph, instead of also registering a plain receiver. */
export function registerCoveSand(material: MeshStandardNodeMaterial, sandMask: N) {
  const scale = float(coveU('rippleScale'));
  const p = positionWorld.xz.div(scale);
  // All derivatives stay outside variable control flow. Fade each band before its cells alias.
  const footprint = fwidth(p);
  const pixels = max(footprint.x, footprint.y);
  const direction = normalize(vec2(0.8, 0.6).add(vec2(vnoise(p.mul(0.02)), vnoise(p.mul(0.02).add(5))).sub(0.5)));
  const longAmplitude = smoothstep(0.25, 0.75, vnoise(p.mul(0.06).add(11)))
    .mul(0.7)
    .add(0.3)
    .mul(0.02);
  const shortAmplitude = smoothstep(0.25, 0.75, vnoise(p.mul(0.15).add(3)))
    .mul(0.7)
    .add(0.3)
    .mul(0.002);
  const crossDirection = normalize(direction.add(vec2(direction.y.negate(), direction.x).mul(0.3)));
  const slope = rippleSlope(p, direction, float(3.9), float(0.35), float(0.8), longAmplitude)
    .mul(smoothstep(0.15, 0.5, pixels).oneMinus())
    .add(
      rippleSlope(p, crossDirection, float(21), float(2.2), float(0.1), shortAmplitude).mul(
        smoothstep(0.03, 0.09, pixels).oneMinus(),
      ),
    )
    .mul(float(coveU('rippleStrength')).div(0.12))
    .div(scale);
  const mask = float(sandMask)
    .mul(smoothstep(0.85, 0.95, normalWorldGeometry.y))
    .mul(mix(1, 0.25, smoothstep(-0.3, 0.6, positionWorld.y)));
  const perturbation = cameraViewMatrix.mul(vec4(slope.x, 0, slope.y, 0)).xyz;
  patchNode(material, 'normalNode', (previous: N) =>
    (previous ?? normalViewGeometry).sub(perturbation.mul(mask)).normalize(),
  );
  registerWaterReceiver(material, {
    mask: sandMask,
    dampHeight: coveU('dampHeight'),
    dampWidth: coveU('dampWidth'),
    dampStrength: coveU('dampStrength'),
    tideMarkStrength: coveU('tideMarkStrength'),
    sheenStrength: coveU('sheenStrength'),
  });
}
