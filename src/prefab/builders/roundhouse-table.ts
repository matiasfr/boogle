// The fixed half of a turntable: shallow masonry pit, sloping floor, ring rail and centre bearing.
// The owning Roundhouse view draws and collides the turning bridge. Dimensions are metres from yard level.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { material } from '../../render/materials.ts';
import { CELL, cellX, cellZ, surfaceHeight } from '../../place/terrain.ts';
import { ORIGIN } from '../../place/layout.ts';
import type { Placement } from '../types.ts';
import { registerBuilder } from '../builders.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'roundhouse.table': true;
  }
}

const SEGMENTS = 48,
  WALL_R = 8.15,
  KERB_R = 8.6;
type Point = { x: number; z: number };

/** Clip the actual terrain triangles to the pit. Sampling only a radial fan would let the 2 m ground poke
 * through between its vertices. Coordinates are world-aligned until the final inverse placement transform. */
function floorGeometry(placement: Placement) {
  const [cx, cy, cz] = placement.pos,
    yaw = placement.rot?.[0] ?? 0,
    sx = placement.scale?.[0] ?? 1,
    sz = placement.scale?.[2] ?? 1;
  const c = Math.cos(yaw),
    s = Math.sin(yaw);
  const local = (p: Point) => ({
    x: ((p.x - cx) * c - (p.z - cz) * s) / sx,
    z: ((p.x - cx) * s + (p.z - cz) * c) / sz,
  });
  const positions: number[] = [];
  const radius = KERB_R * Math.max(sx, sz);
  const x0 = Math.floor((cx - radius - ORIGIN.x - cellX(0)) / CELL) * CELL + ORIGIN.x + cellX(0);
  const z0 = Math.floor((cz - radius - ORIGIN.z - cellZ(0)) / CELL) * CELL + ORIGIN.z + cellZ(0);
  for (let x = x0; x < cx + radius; x += CELL)
    for (let z = z0; z < cz + radius; z += CELL)
      for (let poly of [
        [
          { x, z },
          { x, z: z + CELL },
          { x: x + CELL, z },
        ],
        [
          { x: x + CELL, z: z + CELL },
          { x: x + CELL, z },
          { x, z: z + CELL },
        ],
      ]) {
        for (let k = 0; k < SEGMENTS && poly.length; k++) {
          const a = (k * Math.PI * 2) / SEGMENTS;
          const distance = (p: Point) => {
            const q = local(p);
            return q.x * Math.sin(a) + q.z * Math.cos(a) - WALL_R;
          };
          const clipped: Point[] = [];
          for (let i = 0; i < poly.length; i++) {
            const p = poly[i]!,
              q = poly[(i + 1) % poly.length]!,
              dp = distance(p),
              dq = distance(q);
            if (dp <= 0) clipped.push(p);
            if (dp < 0 !== dq < 0) {
              const t = dp / (dp - dq);
              clipped.push({ x: p.x + (q.x - p.x) * t, z: p.z + (q.z - p.z) * t });
            }
          }
          poly = clipped;
        }
        for (let i = 1; i + 1 < poly.length; i++)
          for (const p of [poly[0]!, poly[i]!, poly[i + 1]!]) {
            const q = local(p);
            positions.push(q.x, surfaceHeight(p.x, p.z) - cy + 0.012, q.z);
          }
      }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

registerBuilder('roundhouse.table', (_params, _batch, placement) => {
  if (!placement) throw new Error('roundhouse.table needs its ground placement');
  const object = new THREE.Group(),
    geometries: THREE.BufferGeometry[] = [];
  const add = (geometry: THREE.BufferGeometry, colour: `#${string}`, family: 'stone' | 'steel' = 'stone') => {
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material(family, { colour }));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    object.add(mesh);
  };
  const ring = (inner: number, outer: number, bottom: number, top: number) =>
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(inner, bottom),
        new THREE.Vector2(outer, bottom),
        new THREE.Vector2(outer, top),
        new THREE.Vector2(inner, top),
        new THREE.Vector2(inner, bottom),
      ],
      SEGMENTS,
    );
  add(floorGeometry(placement), '#454b49');
  add(ring(WALL_R, KERB_R, -0.9, 0), '#8c897b');
  // Separate capstones leave narrow mortar joints, over the continuous solid kerb.
  const caps: THREE.BufferGeometry[] = [];
  for (let k = 0; k < SEGMENTS; k++) {
    const a = (k * Math.PI * 2) / SEGMENTS;
    const cap = new THREE.BoxGeometry(2 * 8.375 * Math.tan(Math.PI / SEGMENTS) - 0.018, 0.15, 0.45);
    cap.rotateY(a).translate(Math.sin(a) * 8.375, 0.075, Math.cos(a) * 8.375);
    caps.push(cap);
  }
  add(mergeGeometries(caps), '#cfc8b5');
  caps.forEach((g) => g.dispose());
  // The bank rises toward the wall. Its rail bed is level above that bank, with the running head at r7.4.
  add(ring(7.25, 7.55, -0.48, -0.12), '#66665c');
  add(ring(7.35, 7.45, -0.12, -0.04), '#677378', 'steel');
  add(new THREE.CylinderGeometry(0.65, 0.65, 0.18, 24).translate(0, -0.81, 0), '#aaa18a');
  add(new THREE.CylinderGeometry(0.42, 0.5, 0.32, 24).translate(0, -0.56, 0), '#47545a', 'steel');
  return { object, dispose: () => geometries.forEach((g) => g.dispose()) };
});
