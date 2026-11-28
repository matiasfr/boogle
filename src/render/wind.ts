import type { Node } from 'three/webgpu';
import { positionGeometry, positionLocal, referenceAttribute, sin, time, vec2, vec3 } from 'three/tsl';

// Home's instance matrices place vertices in island coordinates before positionNode runs.
// A crest travels east across neighbouring crowns in roughly four seconds per wavelength.
const waveX = 0.18;
const waveZ = 0.07;
export const windDirection = vec2(waveX, waveZ).normalize();
export const windAt = (point: Node<'vec3'>) => sin(time.mul(1.57).sub(point.x.mul(waveX)).sub(point.z.mul(waveZ)));

export function crownPosition(point: typeof positionLocal) {
  const weight = positionGeometry.y.add(0.8).clamp(0, 1);
  // Read the posed basis so a rotated or regrowing crown keeps its scale. Cap wide hardwood lobes at full bend.
  // Three's declaration does not carry the requested matrix type into the column accessor.
  const matrix = referenceAttribute('instanceMatrix', 'mat4') as unknown as { element(index: number): Node<'vec4'> };
  const scale = matrix.element(0).xyz.length().min(1);
  return point.add(vec3(windAt(point).mul(weight).mul(0.24).mul(scale), 0, 0));
}
