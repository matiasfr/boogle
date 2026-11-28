import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConeGeometry, Matrix4, type Node, Vector3 } from 'three/webgpu';
import { positionGeometry, positionLocal, time } from 'three/tsl';
import { crownPosition } from '../src/render/wind.ts';

// Sample the production vertex expression at the first regrowth pose without a GPU.
function sample(node: Node, axis: 'x' | 'y' | 'z', vertex: Vector3, placed: Vector3, matrix: Matrix4): number {
  if (node === positionLocal) return placed[axis];
  if (node === positionGeometry) return vertex[axis];
  if (node === time) return Math.PI / (2 * 1.57);
  if ('value' in node && typeof node.value === 'number') return node.value;
  const children = [...node.getChildren()];
  const read = (index: number, component = axis) => sample(children[index]!, component, vertex, placed, matrix);
  if (node.constructor.name === 'ArrayElementNode') {
    const binding = children[0];
    assert.ok(binding && 'property' in binding && binding.property === 'instanceMatrix');
    return matrix.elements[4 * read(1) + { x: 0, y: 1, z: 2 }[axis]]!;
  }
  if ('components' in node && node.components === 'xyz') return read(0);
  if ('components' in node && (node.components === 'x' || node.components === 'y' || node.components === 'z'))
    return read(0, node.components);
  if ('op' in node) {
    if (node.op === '+') return read(0) + read(1);
    if (node.op === '-') return read(0) - read(1);
    if (node.op === '*') return read(0) * read(1);
  }
  if ('method' in node) {
    if (node.method === 'length') return Math.hypot(read(0, 'x'), read(0, 'y'), read(0, 'z'));
    if (node.method === 'min') return Math.min(read(0), read(1));
    if (node.method === 'sin') return Math.sin(read(0));
    if (node.method === 'clamp') return Math.min(read(2), Math.max(read(1), read(0)));
  }
  if (node.constructor.name === 'JoinNode') return read({ x: 0, y: 1, z: 2 }[axis]);
  throw new Error('Unsupported wind expression ' + node.constructor.name);
}

test('the first regrowing pine keeps its upper crown tip over its base at peak wind', () => {
  const radius = 1.9;
  const crown = new ConeGeometry(radius, 4.6, 6);
  const tip = new Vector3().fromBufferAttribute(crown.getAttribute('position'), 0);
  for (const scale of [1, 0.07]) {
    const matrix = new Matrix4().makeRotationY(0.6).scale(new Vector3(scale, scale, scale));
    const placed = tip.clone().applyMatrix4(matrix);
    const travel = sample(crownPosition(positionLocal), 'x', tip, placed, matrix) - placed.x;
    assert.ok(Math.abs(travel) <= radius * scale);
    assert.ok(Math.abs(travel - 0.24 * scale) < 1e-9, `tip moves ${travel} m at scale ${scale}`);
  }
});
