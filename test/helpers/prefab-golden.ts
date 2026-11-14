import assert from 'node:assert/strict';
import * as THREE from 'three/webgpu';
/** Geometry uses native local-scene math. Keep topology, identity, order, strings and flags exact. */
export function prefabGolden(actual: unknown, expected: unknown, path = '$'): void {
  if (typeof actual === 'number' && typeof expected === 'number') {
    assert.ok(Number.isFinite(actual) && Number.isFinite(expected), path);
    // Integer topology and counts stay exact. Floating world coordinates use the owner's tight tolerance.
    if (
      /\.(boxes|solids|bodies|visible|authored|batches|signs)$|\.indices\[\d+\]$/.test(path) ||
      (Number.isInteger(actual) && Number.isInteger(expected))
    )
      assert.ok(actual === expected, path);
    else
      assert.ok(
        Math.abs(actual - expected) <= Math.max(1e-9, 1e-12 * Math.max(Math.abs(actual), Math.abs(expected))),
        `${path}: ${actual} != ${expected}`,
      );
    return;
  }
  if (Array.isArray(actual) && Array.isArray(expected)) {
    assert.equal(actual.length, expected.length, path + '.length');
    actual.forEach((v, i) => prefabGolden(v, expected[i], `${path}[${i}]`));
    return;
  }
  if (actual && expected && typeof actual === 'object' && typeof expected === 'object') {
    assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort(), path + '.keys');
    for (const key of Object.keys(actual))
      prefabGolden(Reflect.get(actual, key), Reflect.get(expected, key), path + '.' + key);
    return;
  }
  assert.deepEqual(actual, expected, path);
}
/** Record the full-precision matrices submitted to the GPU, before Float32 buffer quantization.
 * A native last-bit difference can straddle a Float32 boundary; that is not a world geometry change.
 */
export function recordMatrices() {
  const matrices = new WeakMap<THREE.InstancedMesh, Map<number, THREE.Matrix4>>();
  const colours = new WeakMap<THREE.InstancedMesh, Map<number, THREE.Color>>();
  const originalColour = THREE.InstancedMesh.prototype.setColorAt;
  THREE.InstancedMesh.prototype.setColorAt = function (index, colour) {
    let slots = colours.get(this);
    if (!slots) colours.set(this, (slots = new Map()));
    slots.set(index, colour.clone());
    return originalColour.call(this, index, colour);
  };
  const original = THREE.InstancedMesh.prototype.setMatrixAt;
  THREE.InstancedMesh.prototype.setMatrixAt = function (index, matrix) {
    let slots = matrices.get(this);
    if (!slots) matrices.set(this, (slots = new Map()));
    slots.set(index, matrix.clone());
    return original.call(this, index, matrix);
  };
  return {
    get: (mesh: THREE.InstancedMesh, index: number) => matrices.get(mesh)!.get(index)!.clone(),
    colour: (mesh: THREE.InstancedMesh, index: number) => colours.get(mesh)!.get(index)!.clone(),
    restore: () => {
      THREE.InstancedMesh.prototype.setMatrixAt = original;
      THREE.InstancedMesh.prototype.setColorAt = originalColour;
    },
  };
}
