// Diagnostic only (loaded by dev/look page code, never by the game): the swell's TSL twin against its TypeScript, on the
// GPU, so the plan's "agree to 1 mm on a grid" is checked where the shader actually runs.
import * as THREE from 'three/webgpu';
import { ReadbackBuffer } from 'three/webgpu';
import { renderer } from '../../scene.ts';
import { TSL } from '../tsl.ts';
import { swellAt, swellNode, swellPhases } from './swell.ts';

export async function checkSwell(time = 4321.5, depth = 50) {
  const points: [number, number][] = [];
  for (let x = -300; x <= 1700; x += 97) for (let z = -400; z <= 300; z += 61) points.push([x, z]);
  const n = points.length;
  const input = TSL.attributeArray(new Float32Array(points.flat()), 'vec2');
  const output = TSL.attributeArray(n, 'float');
  const p = swellPhases(time);
  const phases = TSL.uniform(new THREE.Vector4(p[0], p[1], p[2], p[3]));
  const compute = TSL.Fn(() => {
    output.element(TSL.instanceIndex).assign(swellNode(input.element(TSL.instanceIndex), TSL.float(depth), phases).x);
  })().compute(n);
  await renderer.computeAsync(compute);
  const readback = new ReadbackBuffer(n * 4);
  await renderer.getArrayBufferAsync(output.value, readback);
  const gpu = new Float32Array(readback.buffer!.slice(0));
  readback.release();
  readback.dispose();
  compute.dispose();
  let worst = 0;
  points.forEach(([x, z], i) => (worst = Math.max(worst, Math.abs(gpu[i]! - swellAt(x, z, time, depth).height))));
  return { points: n, worstMetres: worst, time };
}
