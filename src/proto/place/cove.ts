// Bounded sandstone pilot: static Local geometry and Owner collision, never lockstep state.
// One metre per unit, Y up. Original code recipe; references: docs/plans/terrain-pilot.md.
import { smoothstep } from '../../math.ts';
import { pageQuery } from '../flags.ts';

export const COVE = pageQuery().get('terrain') === 'cove';
export const COVE_CLAY = pageQuery().get('coveView') === 'shape';
export const COVE_DRY = COVE_CLAY || pageQuery().get('coveView') === 'dry';
export const COVE_BOUNDS = { x0: -216, x1: -154, z0: 30, z1: 80 };
export const coveFront = (z: number) => -192 - 5 * Math.sin(((Math.max(42, Math.min(66, z)) - 42) * Math.PI) / 24);

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
    bounds: { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity },
  };
}
function vertex(mesh: CoveMesh, x: number, y: number, z: number, rgb: number[], shade = 1) {
  mesh.vertices.push(x, y, z);
  mesh.colors.push(...(COVE_CLAY ? clay : rgb).map((c) => c * shade));
  mesh.bounds.minX = Math.min(mesh.bounds.minX, x);
  mesh.bounds.maxX = Math.max(mesh.bounds.maxX, x);
  mesh.bounds.minZ = Math.min(mesh.bounds.minZ, z);
  mesh.bounds.maxZ = Math.max(mesh.bounds.maxZ, z);
}

/** Six joined 4 m pieces, three resistant beds, shallow seams and a buried flat rear.
 * Shared end sockets and world Y preserve bedding across the bend; no arbitrary vertical scaling. */
function cliff(): CoveMesh {
  const mesh = empty('cove-face');
  const levels = [-2.4, 0.18, 1.15, 1.42, 2.5, 2.78, 4.05, 4.32, 4.48];
  const reach = [-1.6, -1.3, -0.6, -0.92, -0.14, -0.48, 0.12, 0.25, 0.38];
  for (let part = 0; part < 6; part++) {
    const start = mesh.vertices.length / 3;
    const z0 = 42 + part * 4;
    for (let row = 0; row < levels.length; row++) {
      const y = levels[row]!;
      const rgb = row === 8 ? turf : row === 7 || row === 3 || row === 5 ? seam : stone;
      // Seven front samples, two rear corners. All loops run clockwise viewed from above.
      for (let col = 0; col < 7; col++) {
        const z = z0 + (col * 4) / 6;
        const joint = col === 0 || col === 6 ? 0.08 : 0;
        const broken = Math.sin(z * 1.71 + row * 0.8) * 0.18 * Math.sin((col * Math.PI) / 6);
        const fracture = col === 3 && row < 7 ? 0.16 : 0;
        vertex(
          mesh,
          coveFront(z) + reach[row]! + joint + broken + fracture,
          y + 0.07 * Math.sin(z * 0.8),
          z,
          rgb,
          0.96 + 0.04 * Math.sin(z * 0.7),
        );
      }
      vertex(mesh, coveFront(z0 + 4) + 5.8, y, z0 + 4, rgb);
      vertex(mesh, coveFront(z0) + 5.8, y, z0, rgb);
    }
    for (let row = 0; row < levels.length - 1; row++)
      for (let col = 0; col < 9; col++) {
        const a = start + row * 9 + col,
          b = start + row * 9 + ((col + 1) % 9);
        mesh.indices.push(a, b, a + 9, b, b + 9, a + 9);
      }
    // Fan caps; bottom buried. No tiny separate turf draw, and every inviting ledge is physically solid.
    for (let col = 1; col < 8; col++) {
      mesh.indices.push(start, start + col + 1, start + col);
      const top = start + 8 * 9;
      mesh.indices.push(top, top + col, top + col + 1);
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
  { x: -201.6, z: 44.5, rx: 1.7, rz: 1.35, top: 1.1 },
  { x: -203.4, z: 55.5, rx: 2.15, rz: 1.65, top: 1.4 },
  { x: -197.4, z: 66, rx: 1.5, rz: 1.2, top: 0.85 },
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
    for (let row = 0; row < 3; row++) {
      const y = row === 0 ? -2.1 : row === 1 ? rock.top - 0.35 : rock.top;
      const radius = row === 0 ? 0.85 : row === 1 ? 1 : 0.7;
      for (let col = 0; col < 8; col++) {
        const a = (col * Math.PI) / 4 + n * 0.37;
        vertex(
          mesh,
          rock.x + Math.cos(a) * rock.rx * radius,
          y,
          rock.z + Math.sin(a) * rock.rz * radius,
          stone,
          0.94 + 0.06 * Math.sin(n + col),
        );
      }
    }
    for (let row = 0; row < 2; row++)
      for (let col = 0; col < 8; col++) {
        const a = start + row * 8 + col,
          b = start + row * 8 + ((col + 1) % 8);
        mesh.indices.push(a, a + 8, b, b, a + 8, b + 8);
      }
    for (let col = 1; col < 7; col++) {
      mesh.indices.push(start, start + col, start + col + 1);
      mesh.indices.push(start + 16, start + 16 + col + 1, start + 16 + col);
    }
  }
  return mesh;
}
function facetColours(mesh: CoveMesh) {
  const out = empty(mesh.name);
  for (let k = 0; k < mesh.indices.length; k += 3) {
    const ids = mesh.indices.slice(k, k + 3);
    const y = ids.reduce((n, i) => n + mesh.vertices[i * 3 + 1]!, 0) / 3;
    const z = ids.reduce((n, i) => n + mesh.vertices[i * 3 + 2]!, 0) / 3;
    const rgb = mesh.name !== 'cove-face' ? stone : y > 4.39 ? turf : y > 4.16 ? seam : stone;
    const recessed = (y > 1.16 && y < 1.4) || (y > 2.51 && y < 2.76);
    const shade = (recessed ? 0.74 : 1) * (0.95 + 0.05 * Math.sin(z * 0.7));
    for (const i of ids) {
      out.indices.push(out.vertices.length / 3);
      vertex(out, mesh.vertices[i * 3]!, mesh.vertices[i * 3 + 1]!, mesh.vertices[i * 3 + 2]!, rgb, shade);
    }
  }
  return out;
}
export const coveMeshes = COVE ? [cliff(), blocks()].map(facetColours) : [];

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
