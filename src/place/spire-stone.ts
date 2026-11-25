import * as THREE from 'three/webgpu';
import { max, mix, normalWorldGeometry, positionWorld, vec3 } from 'three/tsl';
import { rockLayers } from './ground-material.ts';
import { ORIGIN } from './layout.ts';

let stone: THREE.MeshStandardNodeMaterial | undefined;

export function spireStone() {
  if (stone) return stone;
  const p = positionWorld.sub(vec3(ORIGIN.x, 0, ORIGIN.z));
  const { layered, paint, q } = rockLayers(p);
  const sky = max(normalWorldGeometry.normalize().y, 0);
  const bleach = q.floor().mul(0.018).clamp(0, 0.45);
  stone = new THREE.MeshStandardNodeMaterial({ roughness: 0.92, flatShading: true });
  stone.colorNode = layered.mul(mix(vec3(1), paint, 0.45)).mul(sky.mul(bleach.add(0.18)).add(1));
  return stone;
}

/** Cut shallow joints into the seven original faces. The first and last rings still meet the original caps. */
export function spireDrum(bottom: number, top: number, height: number) {
  const courses = Math.round(height / 3);
  const rows = courses * 3;
  const geometry = new THREE.CylinderGeometry(top, bottom, height, 7, rows);
  const positions = geometry.attributes.position!;
  for (let row = 1; row < rows; row++) {
    const course = Math.floor(row / 3);
    const bevel = [0, 0.08, 0.89][row % 3]!;
    for (let corner = 0; corner <= 7; corner++) {
      const index = row * 8 + corner;
      const angle = (corner % 7) * Math.PI * 2 / 7;
      const breakAt = (joint: number) =>
        joint === 0 || joint === courses ? joint : joint + 0.13 * Math.sin(angle * 2 + joint * 1.7);
      const depth = THREE.MathUtils.lerp(breakAt(course), breakAt(course + 1), bevel) / courses;
      const radius = THREE.MathUtils.lerp(top, bottom, depth) - (row % 3 === 0 ? 0.23 : 0);
      positions.setXYZ(index, Math.sin(angle) * radius, height * (0.5 - depth), Math.cos(angle) * radius);
    }
  }
  geometry.computeVertexNormals();
  return geometry;
}
