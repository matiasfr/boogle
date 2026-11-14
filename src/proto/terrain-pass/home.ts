// The terrain pass on all of Home's ground (docs/plans/terrain-pass.md; owner, 10 November: "apply to all of Home"):
// the three.js half of island.ts. It rewrites the land's own geometry before the mesh is made, so the ledges cost no
// extra draw: unwalkable cells leave the main grid's quads and come back at 1 m, their new vertices appended to the same
// buffers, and every vertex gains round two's material inputs. `?terrain=0` leaves the land as it was.
import * as THREE from 'three/webgpu';
import { GRID, ORIGIN } from '../../place/layout.ts';
import { CELL, NX, NZ, at, gorgeD } from '../../place/terrain.ts';
import { GROUND_TILE, type NearGround } from '../../place/far-ground.ts';
import type { TileCells } from '../../place/far-ground-index.ts';
import { smoothstep } from '../../math.ts';
import { buildIslandSurface } from './island.ts';
import { describeGround } from './surface.ts';

export type HomePass = { mainEnd: number; near: NearGround };

/**
 * Apply the pass to the land's geometry (land.ts buildMesh, after its normals). `mainEnd` is where the main grid's
 * quads end in the index (six indices a cell, in cell order); `skip` names cells the land leaves out (the cove's patch).
 */
export function applyHomePass(
  geo: THREE.BufferGeometry,
  mainEnd: number,
  skip: (i: number, j: number) => boolean,
): HomePass {
  const count = geo.getAttribute('position').count,
    grid = NX * NZ;
  const s = buildIslandSurface(count, skip, GROUND_TILE);
  const extra = s.position.length / 3,
    total = count + extra;
  // Every attribute grows by the new vertices, which take the land's own values at their place on the grid.
  const weights = (x: number, z: number) => {
    const fx = (x - ORIGIN.x - GRID.x0) / CELL,
      fz = (z - ORIGIN.z - GRID.z0) / CELL;
    const i = Math.min(Math.floor(fx), NX - 2),
      j = Math.min(Math.floor(fz), NZ - 2),
      u = fx - i,
      v = fz - j;
    return [
      [at(i, j), (1 - u) * (1 - v)],
      [at(i + 1, j), u * (1 - v)],
      [at(i, j + 1), (1 - u) * v],
      [at(i + 1, j + 1), u * v],
    ] as const;
  };
  for (const [name, attribute] of Object.entries(geo.attributes)) {
    const size = attribute.itemSize,
      source = attribute.array as Float32Array;
    const out = new Float32Array(total * size);
    out.set(source);
    if (name === 'position') {
      out.set(s.position, count * 3);
      for (const [id, y] of s.moved) out[id * 3 + 1] = y;
    } else
      for (let k = 0; k < extra; k++) {
        const w = weights(s.position[k * 3]!, s.position[k * 3 + 2]!);
        let length = 0;
        for (let c = 0; c < size; c++) {
          let sum = 0;
          for (const [id, weight] of w) sum += source[id * size + c]! * weight;
          out[(count + k) * size + c] = sum;
          length += sum * sum;
        }
        if (name === 'normal' && length > 0)
          for (let c = 0; c < size; c++) out[(count + k) * size + c] = out[(count + k) * size + c]! / Math.sqrt(length);
      }
    geo.setAttribute(name, new THREE.BufferAttribute(out, size));
  }
  // Round two's material inputs. The grid's and the new vertices' come from island.ts; the cove's patch is described
  // where it stands; the offshore rings are flat sea bed (walkable, no face, level).
  const position = geo.getAttribute('position');
  const layers = {
    steep: new Float32Array(total),
    foot: new Float32Array(total).fill(1),
    soil: new Float32Array(total).fill(1),
  };
  const gorge = new Float32Array(total);
  for (const key of ['steep', 'foot', 'soil'] as const) {
    layers[key].set(s[key].subarray(0, grid));
    layers[key].set(s[key].subarray(grid), count);
  }
  for (let k = 0; k < total; k++) {
    const x = position.getX(k) - ORIGIN.x,
      z = position.getZ(k) - ORIGIN.z;
    const inside = x >= GRID.x0 && x <= GRID.x1 && z >= GRID.z0 && z <= GRID.z1;
    if (k >= grid && k < count && inside) describeGround(x, z, k, layers);
    gorge[k] = inside ? smoothstep(20, 16, gorgeD(x, z)) : 0;
  }
  // Packed into one attribute: a pipeline takes at most eight vertex buffers, and the land already carries five.
  const packed = new Float32Array(total * 4);
  for (let k = 0; k < total; k++) packed.set([layers.steep[k]!, layers.foot[k]!, layers.soil[k]!, gorge[k]!], k * 4);
  geo.setAttribute('tpLayers', new THREE.BufferAttribute(packed, 4));
  // The index: the main grid without its 1 m cells, then the rest as it was (offshore rings, the cove), then the 1 m cells.
  const old = geo.getIndex()!.array;
  const index: number[] = [];
  for (let t = 0; t < mainEnd; t += 6) {
    const a = old[t]!;
    if (s.fine(a % NX, Math.floor(a / NX))) continue;
    for (let n = 0; n < 6; n++) index.push(old[t + n]!);
  }
  const newMainEnd = index.length;
  for (let t = mainEnd; t < old.length; t++) index.push(old[t]!);
  const restEnd = index.length;
  for (const list of s.triangles.values()) for (const v of list) index.push(v);
  geo.setIndex(index);
  const triangles = ([i0, j0, i1, j1]: TileCells) => {
    const out: number[] = [];
    for (let j = j0; j < j1; j++)
      for (let i = i0; i < i1; i++) {
        const list = s.triangles.get(i + j * NX);
        if (list) for (const v of list) out.push(v);
      }
    return out;
  };
  console.log(
    'TERRAIN_PASS ' +
      JSON.stringify({
        variant: 'home',
        fineCells: s.fineCells,
        newVertices: extra,
        movedGridVertices: s.moved.length,
        triangles: index.length / 3,
        was: old.length / 3,
      }),
  );
  return { mainEnd: newMainEnd, near: { skip: s.fine, triangles, restEnd } };
}
