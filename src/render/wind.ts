import { positionGeometry, positionLocal, sin, time, vec3 } from 'three/tsl';

// Home's instance matrices place vertices in island coordinates before positionNode runs.
// A crest travels east across neighbouring crowns in roughly four seconds per wavelength.
export const windAt = (point: typeof positionLocal) => sin(time.mul(1.57).sub(point.x.mul(0.18)).sub(point.z.mul(0.07)));

export function crownPosition(point: typeof positionLocal) {
  const weight = positionGeometry.y.add(0.8).clamp(0, 1);
  return point.add(vec3(windAt(point).mul(weight).mul(0.24), 0, 0));
}
