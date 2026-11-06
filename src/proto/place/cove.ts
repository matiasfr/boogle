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
  // Spread the first 0.3 m of run-up over about 1.8 m, rather than squeezing it onto
  // the old 2.3 m-high pocket wall. The dry back beach meets the existing kit toe.
  const beach = -0.45 + 1.1 * smoothstep(-13, -3, across);
  const pocket = smoothstep(-18, -13, across) * (1 - smoothstep(42, 48, z));
  const bed = shelf + (beach - shelf) * pocket;
  // Keep the backing soil below this section's cap, including the low beachward toe.
  return bed + (coveCrest(z) - 0.2 - bed) * smoothstep(1.8, 5.5, across) + 14 * smoothstep(8, 35, across);
}

/** Shared cap height: the backing ground must meet the sculpted toe, not the old full-height slab. */
export function coveCrest(z: number) {
  return z < 38
    ? -1.08 + 2.78 * smoothstep(34, 38, z)
    : 1.7 + 2.78 * smoothstep(38, 48, z) + 0.06 * Math.sin((z - 42) * 0.15) * smoothstep(38, 48, z);
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
  const reach = [-1.8, -1.85, -1.7, -1.45, -1.1, -0.7, -0.55, -0.45, -0.3, -0.12, 0.1, 0.27, 0.5];
  // The beachward end is the same skin, not an intersecting ramp plus a capped cliff.
  // At z38 its broad walking surface remains y1.7; its nose disappears below the sand.
  const sections = Array.from({ length: 47 }, (_, col) => {
    const z = col < 8 ? 34 + col : 42 + ((col - 8) * 32) / 38;
    const toe = smoothstep(34, 42, z);
    // Keep the front tangent continuous through the old end: moving sharply inland at
    // z42, then back out around the cove, made the joined skin still read as a cut slab.
    const front =
      z < 38
        ? -199 + 3.5 * smoothstep(34, 38, z)
        : z < 50
          ? -195.5 + (coveFront(50) + 195.5) * smoothstep(38, 50, z)
          : coveFront(z);
    const rear = z < 42 ? -199 + 7 * toe + 2.4 + 3.4 * toe : coveFront(z) + 5.8;
    return {
      z,
      front,
      top: coveCrest(z),
      width: rear - front,
      cap: smoothstep(40, 46, z),
    };
  });
  const columns = sections.length,
    rows = levels.length + 3;
  const shoulderReach = (row: number, z: number) => {
    const height = (levels[row]! + 2.4) / 6.88;
    const rounded = 0.5 - 5.5 * Math.sqrt(Math.max(0, 1 - height));
    // A broad quarter-ellipse buries the toe in the sand and rolls flat into its cap.
    // The tall cliff profile resumes gradually; no separate buttress or cut end face.
    return reach[row]! + (rounded - reach[row]!) * (1 - smoothstep(42, 51, z));
  };
  for (const section of sections) {
    const { z, front, top, width } = section;
    for (let row = 0; row < levels.length; row++) {
      const cap = (row === 12 ? 1 : row === 11 ? 0.15 : 0) * section.cap;
      const ripple = 0.045 * Math.sin(z * 0.47 + row * 0.4) * Math.sin((row * Math.PI) / 12);
      vertex(
        mesh,
        front + shoulderReach(row, z) + ripple,
        -2.4 + ((levels[row]! + 2.4) / 6.88) * (top + 2.4),
        z,
        cap > 0.5 ? turf : row === 11 ? seam : stone,
        1,
        cap,
      );
    }
    // Broad cap curvature joins the rolled lip to the buried terrain socket.
    for (const across of [0.34, 0.68, 1])
      vertex(
        mesh,
        front + 0.5 + (width - 0.5) * across,
        top + 0.14 * Math.sin(across * Math.PI) * smoothstep(38, 44, z),
        z,
        turf,
        1,
        section.cap,
      );
  }
  for (let col = 0; col < columns - 1; col++)
    for (let row = 0; row < rows - 1; row++) {
      const a = col * rows + row,
        b = a + rows;
      mesh.indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  // Duplicate rear/bottom corners: a buried closure cannot pull the visible front's shading normal.
  const back = mesh.vertices.length / 3;
  for (const { z, front, top, width, cap } of sections) {
    vertex(mesh, front + width, top, z, turf, 1, cap);
    vertex(mesh, front + width, -2.4, z, stone);
    vertex(mesh, front + shoulderReach(0, z), -2.4, z, stone);
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
  return mesh;
}

export const COVE_ROCKS = [
  { x: -197.6, z: 45.3, rx: 2.6, rz: 2.1, top: 1.05 },
  { x: -198.5, z: 51.7, rx: 3.2, rz: 2.7, top: 1.4 },
  { x: -196.3, z: 63, rx: 2.6, rz: 1.8, top: 0.8 },
] as const;
function blocks(): CoveMesh {
  const mesh = empty('cove-blocks');
  for (const [n, rock] of COVE_ROCKS.entries()) {
    const start = mesh.vertices.length / 3;
    const sides = 12;
    const profile = [
      [-2.1, 0.7],
      [rock.top - 0.85, 1],
      [rock.top - 0.4, 0.98],
      [rock.top - 0.1, 0.8],
      [rock.top, 0.35],
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
