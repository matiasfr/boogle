// Independent checkpoint sampler: actual full-resolution Home mesh buffers, never the ledge recipe.
// Run the census with graphics=farGround:false: the sampled mesh must actually be visible.
// The cove's rendered kit and its physical tops are included independently of the heightfield.
import * as THREE from 'three/webgpu';
import { scene } from '../../src/render/scene.ts';
import { GRID, ORIGIN } from '../../src/place/layout.ts';
import { NX, NZ, terrainCollisionTiles } from '../../src/place/terrain.ts';
import { coveSurface } from '../../src/place/cove.ts';
import { WALKABLE_NY } from '../../src/constants.ts';

type Face = {
  x: number;
  z: number;
  y: number;
  ux: number;
  uz: number;
  vx: number;
  vz: number;
  uy: number;
  vy: number;
  det: number;
};
const BIN = 4;
const collision = terrainCollisionTiles();

export function onHome(x: number, z: number) {
  return x >= GRID.x0 + ORIGIN.x && x <= GRID.x1 + ORIGIN.x && z >= GRID.z0 + ORIGIN.z && z <= GRID.z1 + ORIGIN.z;
}

/** Physics heightfield triangles, including the closed outer edge (surfaceHeight uses an outside fallback there).
 * The cove kit's exact shared triangle query composes its solid tops over the heightfield. */
export function colliderHeight(x: number, z: number) {
  for (const tile of collision) {
    const nx = tile.heights.length,
      nz = tile.heights[0]!.length;
    const fx = (x - tile.position.x) / tile.cell;
    const fz = (z - (tile.position.z - (nz - 1) * tile.cell)) / tile.cell;
    if (fx < 0 || fz < 0 || fx > nx - 1 || fz > nz - 1) continue;
    const i = Math.min(Math.floor(fx), nx - 2),
      j = Math.min(Math.floor(fz), nz - 2);
    const u = fx - i,
      v = fz - j;
    const a = tile.heights[i]![nz - 1 - j]!,
      b = tile.heights[i + 1]![nz - 1 - j]!;
    const c = tile.heights[i]![nz - 2 - j]!,
      d = tile.heights[i + 1]![nz - 2 - j]!;
    const h = u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
    return coveSurface(x - ORIGIN.x, z - ORIGIN.z, h);
  }
  throw new Error(`No Home collider at ${x},${z}`);
}

export function drawnGround() {
  const full: THREE.Mesh[] = [];
  const kit: THREE.Mesh[] = [];
  scene.updateMatrixWorld(true);
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const position = object.geometry.getAttribute('position');
    if (position && position.count >= NX * NZ && object.geometry.hasAttribute('covePath')) full.push(object);
    if (object.parent?.name === 'west-cove-sandstone') kit.push(object);
  });
  if (full.length !== 1 || !full[0]!.visible)
    throw new Error('Census needs exactly one visible Home full mesh: use graphics=farGround:false');
  if (kit.length !== 2) throw new Error('Census needs both rendered cove meshes');
  const bins = new Map<string, Face[]>();
  const point = new THREE.Vector3();
  const loX = GRID.x0 + ORIGIN.x,
    hiX = GRID.x1 + ORIGIN.x;
  const loZ = GRID.z0 + ORIGIN.z,
    hiZ = GRID.z1 + ORIGIN.z;
  for (const mesh of [...full, ...kit]) {
    const position = mesh.geometry.getAttribute('position');
    const index = mesh.geometry.getIndex();
    if (!index) throw new Error('Ground is not indexed');
    const vertices = Array.from({ length: position.count }, (_, i) => {
      point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
      return [point.x, point.y, point.z] as const;
    });
    for (let t = 0; t < index.count; t += 3) {
      const a = vertices[index.getX(t)]!,
        b = vertices[index.getX(t + 1)]!,
        c = vertices[index.getX(t + 2)]!;
      const ux = b[0] - a[0],
        uz = b[2] - a[2],
        vx = c[0] - a[0],
        vz = c[2] - a[2];
      const det = ux * vz - uz * vx;
      if (det >= -1e-12) continue; // vertical or downward-facing: not a footing surface
      const x0 = Math.max(loX, Math.min(a[0], b[0], c[0])),
        x1 = Math.min(hiX, Math.max(a[0], b[0], c[0]));
      const z0 = Math.max(loZ, Math.min(a[2], b[2], c[2])),
        z1 = Math.min(hiZ, Math.max(a[2], b[2], c[2]));
      const face: Face = { x: a[0], y: a[1], z: a[2], ux, uz, vx, vz, uy: b[1] - a[1], vy: c[1] - a[1], det };
      for (let j = Math.floor(z0 / BIN); j <= Math.floor(z1 / BIN); j++)
        for (let i = Math.floor(x0 / BIN); i <= Math.floor(x1 / BIN); i++) {
          const key = `${i},${j}`;
          const list = bins.get(key);
          if (list) list.push(face);
          else bins.set(key, [face]);
        }
    }
  }
  function heightAt(x: number, z: number) {
    let height = -Infinity;
    for (const f of bins.get(`${Math.floor(x / BIN)},${Math.floor(z / BIN)}`) ?? []) {
      const dx = x - f.x,
        dz = z - f.z;
      const u = (dx * f.vz - dz * f.vx) / f.det,
        v = (f.ux * dz - f.uz * dx) / f.det;
      if (u >= -1e-9 && v >= -1e-9 && u + v <= 1 + 1e-9) height = Math.max(height, f.y + u * f.uy + v * f.vy);
    }
    if (!Number.isFinite(height)) throw new Error(`No rendered ground at ${x},${z}`);
    return height;
  }
  return {
    heightAt,
    triangles: full[0]!.geometry.getIndex()!.count / 3,
    vertices: full[0]!.geometry.getAttribute('position').count,
  };
}

export function gapReport() {
  return { samples: 0, over1cm: 0, worstGap: 0, where: [0, 0], drawn: 0, collider: 0 };
}
export function recordGap(report: ReturnType<typeof gapReport>, x: number, z: number, drawn: number, collider: number) {
  const gap = Math.abs(drawn - collider);
  report.samples++;
  if (gap > 0.01) report.over1cm++;
  if (gap > report.worstGap) Object.assign(report, { worstGap: gap, where: [x, z], drawn, collider });
  return gap;
}

/** A regular 0.5 m lattice over every walkable Home cell, including cell edges.
 * Walkability uses the collider surface's local normal, not the drawn surface's slope. */
export function walkableGrid(home: ReturnType<typeof drawnGround>) {
  const report = gapReport();
  for (let z = GRID.z0 + ORIGIN.z; z <= GRID.z1 + ORIGIN.z; z += 0.5)
    for (let x = GRID.x0 + ORIGIN.x; x <= GRID.x1 + ORIGIN.x; x += 0.5) {
      const y = colliderHeight(x, z);
      const e = 0.001;
      const x0 = Math.max(x - e, GRID.x0 + ORIGIN.x),
        x1 = Math.min(x + e, GRID.x1 + ORIGIN.x);
      const z0 = Math.max(z - e, GRID.z0 + ORIGIN.z),
        z1 = Math.min(z + e, GRID.z1 + ORIGIN.z);
      const gx = (colliderHeight(x1, z) - colliderHeight(x0, z)) / (x1 - x0);
      const gz = (colliderHeight(x, z1) - colliderHeight(x, z0)) / (z1 - z0);
      if (1 / Math.hypot(1, gx, gz) < WALKABLE_NY) continue;
      recordGap(report, x, z, home.heightAt(x, z), y);
    }
  return report;
}
