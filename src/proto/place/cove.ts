// Bounded sandstone pilot: static Local geometry and Owner collision, never lockstep state.
// One metre per unit, Y up. Original code recipe; references: docs/plans/terrain-pilot.md.
import { smoothstep } from '../../math.ts';
import { pageQuery } from '../flags.ts';

export const COVE = pageQuery().get('terrain') === 'cove';
export const COVE_CLAY = pageQuery().get('coveView') === 'shape';
export const COVE_DRY = COVE_CLAY || pageQuery().get('coveView') === 'dry';
export const COVE_BOUNDS = { x0: -216, x1: -154, z0: 30, z1: 80 };
export const coveFront = (z: number) =>
  -192 - 5 * Math.sin(((Math.max(42, Math.min(66, z)) - 42) * Math.PI) / 24) + 0.12 * Math.max(0, z - 66) ** 2;

/** Fade is separate from corridor protection, supplied by the finished terrain owner. */
export function coveWeight(x: number, z: number) {
  return (
    smoothstep(-216, -208, x) * (1 - smoothstep(-166, -154, x)) * smoothstep(30, 38, z) * (1 - smoothstep(68, 80, z))
  );
}

export function coveGround(x: number, z: number) {
  const across = x - coveFront(z);
  // Continuous submerged bench, then land beneath the kit; no hidden heightfield in front of the face.
  const shelf = -1.8 + 1.2 * smoothstep(-16, -5, across);
  const pocket = 2.3 * (1 - smoothstep(40, 46, z)) * smoothstep(-10, -3, across);
  return shelf + pocket + 4.9 * smoothstep(1.8, 5.5, across) + 14 * smoothstep(8, 35, across);
}

export type CoveMesh = {
  name: string;
  vertices: number[];
  indices: number[];
  colors: number[];
  normals: number[];
  turf: number[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
};
const pigment = (hex: number) => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
// Linear albedos tuned under the actual frozen sky; the board's swatches are intent, not a colour transform.
const stone = [0.62, 0.35, 0.12],
  seam = [0.29, 0.16, 0.07],
  turf = [0.19, 0.32, 0.04];
const clay = pigment(0xa7a39a);
function empty(name: string): CoveMesh {
  return {
    name,
    vertices: [],
    indices: [],
    colors: [],
    normals: [],
    turf: [],
    bounds: { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity },
  };
}
function vertex(mesh: CoveMesh, x: number, y: number, z: number, rgb: number[], shade = 1, cap = 0) {
  mesh.vertices.push(x, y, z);
  mesh.colors.push(...(COVE_CLAY ? clay : rgb).map((c) => c * shade));
  mesh.turf.push(cap);
  mesh.bounds.minX = Math.min(mesh.bounds.minX, x);
  mesh.bounds.maxX = Math.max(mesh.bounds.maxX, x);
  mesh.bounds.minZ = Math.min(mesh.bounds.minZ, z);
  mesh.bounds.maxZ = Math.max(mesh.bounds.maxZ, z);
}

/** A connected sculpted face and rounded turf lip; bedding is a material, not repeated box seams.
 * Only the buried rear/end closures split their normals from the continuous visible skin. */
function cliff(): CoveMesh {
  const mesh = empty('cove-face');
  const levels = [-2.4, -0.8, 0, 0.55, 1.15, 1.75, 2.3, 2.9, 3.5, 3.95, 4.2, 4.4, 4.48];
  const reach = [-1.5, -1.45, -1.25, -0.95, -0.64, -0.57, -0.36, -0.3, -0.02, 0.15, 0.14, 0.22, 0.5];
  const columns = 49,
    rows = levels.length + 1;
  for (let col = 0; col < columns; col++) {
    const z = 42 + (col * 32) / (columns - 1);
    const crest = 0.06 * Math.sin((z - 42) * 0.15);
    for (let row = 0; row < levels.length; row++) {
      const cap = row === 12 ? 1 : row === 11 ? 0.15 : 0;
      const ripple = 0.045 * Math.sin(z * 0.47 + row * 0.4) * Math.sin((row * Math.PI) / 12);
      vertex(
        mesh,
        coveFront(z) + reach[row]! + ripple,
        levels[row]! + crest,
        z,
        cap > 0.5 ? turf : row === 11 ? seam : stone,
        1,
        cap,
      );
    }
    vertex(mesh, coveFront(z) + 5.8, 4.48 + crest, z, turf, 1, 1);
  }
  for (let col = 0; col < columns - 1; col++)
    for (let row = 0; row < rows - 1; row++) {
      const a = col * rows + row,
        b = a + rows;
      mesh.indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  // Duplicate rear/bottom corners: a buried closure cannot pull the visible front's shading normal.
  const back = mesh.vertices.length / 3;
  for (let col = 0; col < columns; col++) {
    const z = 42 + (col * 32) / (columns - 1);
    const crest = 0.06 * Math.sin((z - 42) * 0.15);
    vertex(mesh, coveFront(z) + 5.8, 4.48 + crest, z, turf, 1, 1);
    vertex(mesh, coveFront(z) + 5.8, -2.4 + crest, z, stone);
    vertex(mesh, coveFront(z) + reach[0]!, -2.4 + crest, z, stone);
  }
  for (let col = 0; col < columns - 1; col++)
    for (let row = 0; row < 2; row++) {
      const a = back + col * 3 + row,
        b = a + 3;
      mesh.indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  for (const col of [0, columns - 1]) {
    const start = mesh.vertices.length / 3;
    for (let row = 0; row < rows; row++) {
      const i = (col * rows + row) * 3;
      vertex(mesh, mesh.vertices[i]!, mesh.vertices[i + 1]!, mesh.vertices[i + 2]!, row === rows - 1 ? turf : stone);
    }
    const i = (back + col * 3 + 1) * 3;
    vertex(mesh, mesh.vertices[i]!, mesh.vertices[i + 1]!, mesh.vertices[i + 2]!, stone);
    for (let row = 1; row < rows; row++) {
      if (col === 0) mesh.indices.push(start, start + row, start + row + 1);
      else mesh.indices.push(start, start + row + 1, start + row);
    }
  }
  // A broad broken end slopes onto the pocket. It is real stone support, outside protected shoulders.
  const end = mesh.vertices.length / 3;
  const foot = [
    [-195, 1.7, 38],
    [-192, 1.7, 38],
    [-188.8, 4.48, 42],
    [-191.5, 4.48, 42],
  ];
  for (const bottom of [true, false]) for (const [x, y, z] of foot) vertex(mesh, x!, bottom ? -2.4 : y!, z!, stone);
  for (let i = 0; i < 4; i++) {
    const a = end + i,
      b = end + ((i + 1) % 4);
    mesh.indices.push(a, a + 4, b, b, a + 4, b + 4);
  }
  mesh.indices.push(end, end + 1, end + 2, end, end + 2, end + 3, end + 4, end + 6, end + 5, end + 4, end + 7, end + 6);
  return mesh;
}

export const COVE_ROCKS = [
  { x: -198.8, z: 46, rx: 2.4, rz: 1.7, top: 1.45 },
  { x: -199.5, z: 55.5, rx: 2.8, rz: 2.1, top: 1.9 },
  { x: -193.8, z: 67.5, rx: 2.2, rz: 1.5, top: 1.15 },
] as const;
function blocks(): CoveMesh {
  const mesh = empty('cove-blocks');
  const stones = [
    ...COVE_ROCKS,
    { x: -191.9, z: 38.7, rx: 0.55, rz: 0.4, top: 0.1 },
    { x: -192.7, z: 39.4, rx: 0.8, rz: 0.55, top: 0.35 },
    { x: -193.1, z: 40.6, rx: 0.45, rz: 0.4, top: 0.05 },
  ];
  for (const [n, rock] of stones.entries()) {
    const start = mesh.vertices.length / 3;
    const sides = n < 3 ? 12 : 8;
    const profile =
      n < 3
        ? [
            [-2.1, 0.7],
            [rock.top - 0.85, 1],
            [rock.top - 0.4, 0.98],
            [rock.top - 0.1, 0.8],
            [rock.top, 0.35],
          ]
        : [
            [-2.1, 0.85],
            [rock.top - 0.35, 1],
            [rock.top, 0.7],
          ];
    for (const [row, [y, radius]] of profile.entries()) {
      for (let col = 0; col < sides; col++) {
        const a = (col * Math.PI * 2) / sides + n * 0.37;
        vertex(
          mesh,
          rock.x + Math.cos(a) * rock.rx * radius!,
          y! + (0.24 * Math.cos(a + n) * row) / (profile.length - 1),
          rock.z + Math.sin(a) * rock.rz * radius!,
          stone,
          1,
        );
      }
    }
    for (let row = 0; row < profile.length - 1; row++)
      for (let col = 0; col < sides; col++) {
        const a = start + row * sides + col,
          b = start + row * sides + ((col + 1) % sides);
        mesh.indices.push(a, a + sides, b, b, a + sides, b + sides);
      }
    const top = start + (profile.length - 1) * sides;
    for (let col = 1; col < sides - 1; col++) {
      mesh.indices.push(start, start + col, start + col + 1);
      mesh.indices.push(top, top + col + 1, top + col);
    }
  }
  return mesh;
}
function smoothNormals(mesh: CoveMesh) {
  mesh.normals = Array<number>(mesh.vertices.length).fill(0);
  for (let k = 0; k < mesh.indices.length; k += 3) {
    const ids = mesh.indices.slice(k, k + 3);
    const a = ids[0]! * 3,
      b = ids[1]! * 3,
      c = ids[2]! * 3;
    const ux = mesh.vertices[b]! - mesh.vertices[a]!,
      uy = mesh.vertices[b + 1]! - mesh.vertices[a + 1]!,
      uz = mesh.vertices[b + 2]! - mesh.vertices[a + 2]!;
    const vx = mesh.vertices[c]! - mesh.vertices[a]!,
      vy = mesh.vertices[c + 1]! - mesh.vertices[a + 1]!,
      vz = mesh.vertices[c + 2]! - mesh.vertices[a + 2]!;
    const nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx;
    for (const i of ids) {
      mesh.normals[i * 3]! += nx;
      mesh.normals[i * 3 + 1]! += ny;
      mesh.normals[i * 3 + 2]! += nz;
    }
  }
  for (let i = 0; i < mesh.normals.length; i += 3) {
    const length = Math.hypot(mesh.normals[i]!, mesh.normals[i + 1]!, mesh.normals[i + 2]!) || 1;
    mesh.normals[i]! /= length;
    mesh.normals[i + 1]! /= length;
    mesh.normals[i + 2]! /= length;
  }
  return mesh;
}
export const coveMeshes = COVE ? [cliff(), blocks()].map(smoothNormals) : [];

/** Exact downward triangle query shared by physical ground consumers and the bathymetry owner.
 * This is a solid coastal kit, never a bridge/deck registered as seabed. */
export function coveSurface(x: number, z: number, floor: number) {
  let h = floor;
  for (const m of coveMeshes) {
    if (x < m.bounds.minX || x > m.bounds.maxX || z < m.bounds.minZ || z > m.bounds.maxZ) continue;
    for (let k = 0; k < m.indices.length; k += 3) {
      const a = m.indices[k]! * 3,
        b = m.indices[k + 1]! * 3,
        c = m.indices[k + 2]! * 3;
      const ax = m.vertices[a]!,
        az = m.vertices[a + 2]!;
      const bx = m.vertices[b]! - ax,
        bz = m.vertices[b + 2]! - az;
      const cx = m.vertices[c]! - ax,
        cz = m.vertices[c + 2]! - az;
      const det = bx * cz - bz * cx;
      if (Math.abs(det) < 1e-8) continue;
      const u = ((x - ax) * cz - (z - az) * cx) / det;
      const v = (bx * (z - az) - bz * (x - ax)) / det;
      if (u < -1e-6 || v < -1e-6 || u + v > 1.000001) continue;
      h = Math.max(
        h,
        m.vertices[a + 1]! +
          u * (m.vertices[b + 1]! - m.vertices[a + 1]!) +
          v * (m.vertices[c + 1]! - m.vertices[a + 1]!),
      );
    }
  }
  return h;
}
