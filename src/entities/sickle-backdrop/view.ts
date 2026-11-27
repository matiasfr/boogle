// One merged material, no shadow pass: silhouettes from the same map as the walkable planning greybox.
import * as THREE from 'three/webgpu';
import { attribute, mix, normalGeometry, positionGeometry, vertexColor, vertexStage } from 'three/tsl';
import html from '../../../docs/world/map-prototypes.html?raw';
import { clipHalf, layout, parseMapPage, type XZ } from '../../sickle/map-data.ts';
import { rockLayers } from '../../place/ground-material.ts';
import { addPart, mergeParts } from '../../render/geometry-parts.ts';
import { freezeInPlace } from '../../render/instances.ts';
import { WORLD_LINES } from '../../sim/railway-world-lines.ts';
import { INCLINE_BORE } from '../route-greybox/massing.ts';
import { terrainKitGeometry } from '../terrain-kit/geometry.ts';
import { kitMaterial } from '../../prefab/builders/terrain-kit.ts';

// The map's Place-local origin. Ring Island and the Original Island already render in the live world.
const ORIGIN_X = 1000;
const CLIFF = '#9c988f',
  WALK = '#a9b48c',
  DARK = '#2c3038',
  CROWN = '#5d6a66';

/** The incline's bore through the south stack (docs/plans/greybox-leg2.md, step 4): its walls are open where the `ns`
 * row passes, between the bore's lining (route-greybox/massing.ts INCLINE_BORE; the row is straight there), so a rider
 * sees out of each mouth and a train is seen going in. Map coordinates (world x less ORIGIN_X). */
const BORE = (() => {
  const r = WORLD_LINES.find((l) => l.id === 'ns')!,
    [p, q] = [r.pts[0]!, r.pts[4]!],
    len = Math.hypot(q[0] - p[0], q[1] - p[1]);
  return {
    land: 'stack-s',
    o: [p[0] / 100 - ORIGIN_X, p[1] / 100] as XZ,
    u: [(q[0] - p[0]) / len, (q[1] - p[1]) / len] as XZ,
    half: INCLINE_BORE.half,
    y0: INCLINE_BORE.floor,
    y1: INCLINE_BORE.roof,
  };
})();
/** The stretch [u0, u1] of the wall from `a` to `b` that lies within the bore's half-width of its row, or null. */
function boreHole(a: XZ, b: XZ): [number, number] | null {
  const off = (p: XZ) => (p[0] - BORE.o[0]) * BORE.u[1] - (p[1] - BORE.o[1]) * BORE.u[0],
    da = off(a),
    db = off(b);
  if (da === db) return null;
  const ua = (BORE.half - da) / (db - da),
    ub = (-BORE.half - da) / (db - da),
    u0 = Math.max(0, Math.min(ua, ub)),
    u1 = Math.min(1, Math.max(ua, ub));
  return u1 > u0 ? [u0, u1] : null;
}

export function createBackdrop() {
  const map = layout(parseMapPage(html), 'sickle', 'A');
  const parts: THREE.BufferGeometry[] = [];
  const sandstone = new Set<THREE.BufferGeometry>();
  const stackPieces = new Map<string, THREE.Matrix4[]>();
  const matrix = new THREE.Matrix4();
  const add = (geo: THREE.BufferGeometry, tint: string) => {
    addPart(parts, geo, matrix.identity(), tint);
    geo.dispose();
  };
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, tint = DARK, yaw = 0) =>
    add(new THREE.BoxGeometry(w, h, d).rotateY(yaw).translate(x + ORIGIN_X, y, z), tint);
  const crown = (x: number, y: number, z: number, rx: number, ry: number, rz: number, tint = CROWN) =>
    add(new THREE.IcosahedronGeometry(1, 0).scale(rx, ry, rz).translate(x + ORIGIN_X, y, z), tint);

  // Flat tops and battered cliffs; the shared layout preserves the Gorge's clipped gap. No shelves or seabed grid.
  for (const land of map.land) {
    if (land.existing || land.id === 'home-land' || land.id === 'ring-land') continue;
    const top = land.horizon ? 10 : (land.top ?? 10);
    const outline = land.outline;
    const vertices: number[] = [];
    const chalk = land.module === 'chalk';
    const stack = land.id === 'stack-n' || land.id === 'stack-s';
    // Place the kit inside the original shoreline. The straight edge of each
    // cut still owns the stair clearance and the two ends of the rail bore.
    const course = (a: XZ, b: XZ, piece: string, width: number, y: number, heightScale: number) => {
      const dx = b[0] - a[0],
        dz = b[1] - a[1];
      const length = Math.hypot(dx, dz);
      if (length < 1) return;
      const count = Math.ceil(length / width);
      const facing = (a[0] - land.c![0]) * -dz + (a[1] - land.c![1]) * dx >= 0 ? 1 : -1;
      const yaw = Math.atan2(-dz * facing, dx * facing);
      const batch = stackPieces.get(piece) ?? [];
      stackPieces.set(piece, batch);
      for (let k = 0; k < count; k++) {
        const t = (k + 0.5) / count;
        batch.push(
          new THREE.Matrix4()
            .makeRotationY(yaw)
            .scale(new THREE.Vector3(length / ((piece === 'rim_cap' ? 4 : 10) * count), heightScale, 0.5))
            .setPosition(a[0] + dx * t + ORIGIN_X, y, a[1] + dz * t),
        );
      }
    };
    const triangle = (a: XZ, ay: number, b: XZ, by: number, c: XZ, cy: number) =>
      vertices.push(a[0] + ORIGIN_X, ay, a[1], b[0] + ORIGIN_X, by, b[1], c[0] + ORIGIN_X, cy, c[1]);
    const geometry = () => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geo.computeVertexNormals();
      return geo;
    };
    const cap = (ring: XZ[], y: number) => {
      for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(
        ring.map(([x, z]) => new THREE.Vector2(x, z)),
        [],
      ))
        triangle(ring[a!]!, y, ring[b!]!, y, ring[c!]!, y);
    };
    const quad = (a: XZ, b: XZ, y0: number, y1: number) => {
      triangle(a, y1, a, y0, b, y1);
      triangle(b, y1, a, y0, b, y0);
    };
    const at = (a: XZ, b: XZ, u: number): XZ => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
    if (chalk) {
      // Cut shoulders at opposite ends along the islet's long axis. Shared cut edges close each riser.
      const angle = THREE.MathUtils.degToRad(land.rot ?? 0);
      const along = ([x, z]: XZ) => (x - land.c![0]) * Math.cos(angle) + (z - land.c![1]) * Math.sin(angle);
      let ring = outline;
      let y = -10;
      for (const [level, end] of [
        [top * 0.76, -0.6],
        [top * 0.9, 0.44],
        [top, 0],
      ] as const) {
        for (let i = 0; i < ring.length; i++) quad(ring[i]!, ring[(i + 1) % ring.length]!, y, level);
        if (end === 0) cap(ring, level);
        else {
          const side = (p: XZ) => Math.sign(end) * (along(p) - end * land.r![0]);
          cap(clipHalf(ring, side), level);
          ring = clipHalf(ring, (p) => -side(p));
        }
        y = level;
      }
      // The White Wall stays chalk: the kit's stepped courses, not its sandstone (his word, 25 November).
      add(geometry(), '#c9c5bb');
      continue;
    }
    cap(outline, top);
    add(geometry(), stack ? '#725940' : land.horizon ? '#7d8a84' : WALK);
    vertices.length = 0;
    // A few blades rooted in the north cap, leaving the pickup plinth and the way off the stair clear.
    if (land.id === 'stack-n') {
      for (const [x, z] of [
        [-1068, -2034],
        [-1070, -2035],
        [-1077, -2038],
        [-1082, -2040],
      ] as const) {
        for (const lean of [-0.4, 0, 0.35])
          triangle([x + lean - 0.15, z], top, [x + lean + 0.15, z], top, [x + 2 * lean, z - 0.2], top + 0.65);
      }
      add(geometry(), '#777c48');
      vertices.length = 0;
    }
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i]!,
        b = outline[(i + 1) % outline.length]!,
        hole = land.id === BORE.land ? boreHole(a, b) : null;
      if (stack) {
        // The clip makes one long straight cut per stack. Dress those train-facing cuts and the
        // approaching south stack's eastern waterline. The other edges use the bedded backing face.
        const cut = Math.hypot(b[0] - a[0], b[1] - a[1]) > 100;
        const waterline = land.id === 'stack-s' && (a[0] + b[0]) / 2 > -1030;
        const wall = (p: XZ, q: XZ, foot: number) => {
          if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-6) return;
          const inset = (v: XZ): XZ => [v[0] + (land.c![0] - v[0]) * 0.012, v[1] + (land.c![1] - v[1]) * 0.012];
          const backP = inset(p),
            backQ = inset(q);
          quad(backP, backQ, -10, top);
          if (hole) {
            quad(p, backP, -10, top);
            quad(backQ, q, -10, top);
          }
          if (cut || waterline) course(p, q, 'face_10', 85, foot, (top - foot) / 14.4);
        };
        if (hole) {
          const p = at(a, b, hole[0]),
            q = at(a, b, hole[1]);
          wall(a, p, -2);
          wall(q, b, -2);
          quad(p, q, BORE.y1, top);
          quad(p, q, -10, BORE.y0);
        } else wall(a, b, -2);
        if (cut || waterline) course(a, b, 'rim_cap', 85, top, 1);
        continue;
      }
      quad(a, b, -10, top);
    }
    add(geometry(), land.tint ?? '#ffffff');
    if (stack || !land.tint || land.id === 'port-top') sandstone.add(parts.at(-1)!);
    if (land.horizon) {
      // A coarse inland ridge, behind the low coast and city's skyline.
      const coast = outline.slice(0, 9);
      for (const [x, z] of coast)
        crown(x - 450, (land.top ?? 220) * 0.35, z, 600, (land.top ?? 220) * 0.65, 650, '#7d8a84');
    }
  }

  // Broad crown masses, rather than the walkable forest's hundreds of individual trees and trunks.
  for (const t of map.terrain) {
    if (t.kind !== 'forest' || !t.c || !t.r) continue;
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI * 2) / 12;
      const x = t.c[0] + Math.cos(angle) * t.r[0] * 0.65;
      const z = t.c[1] + Math.sin(angle) * t.r[1] * 0.65;
      const y = (t.h ?? 72) - 25 + Math.sin(i * 2.4) * 9;
      box(x, 28, z, 12, 32, 12);
      if (t.land === 'canopy-isle') {
        crown(x, y + 5, z, 34, 19, 29);
        crown(x + 12 * Math.cos(angle), y + 12, z + 12 * Math.sin(angle), 23, 14, 21, '#74816c');
      } else crown(x, y, z, t.r[0] * 0.22, 28, t.r[1] * 0.22);
    }
    for (const [x, z] of t.mothers ?? []) {
      const h = t.motherH ?? 150;
      box(x, (h - 30) / 2, z, 10, h - 30, 10);
      if (t.land === 'canopy-isle') {
        crown(x - 11, h - 28, z, 35, 21, 33);
        crown(x + 13, h - 18, z + 6, 29, 19, 25, '#74816c');
      } else crown(x, h - 36, z, 45, 36, 45);
    }
  }
  for (const lm of map.landmarks) {
    if (!lm.at) continue;
    const [x, z] = lm.at,
      base = lm.base ?? 0,
      h = lm.h ?? 20;
    if (lm.kind === 'arch') {
      const angle = ((lm.bearing ?? 0) * Math.PI) / 180,
        span = lm.span ?? 30;
      for (const sign of [-1, 1])
        box(
          x + Math.cos(angle) * (span / 2 + 11) * sign,
          base + h / 2,
          z + Math.sin(angle) * (span / 2 + 11) * sign,
          22,
          h,
          26,
          '#bdb5a2',
          -angle,
        );
      box(x, base + h + 7, z, span + 44, 14, 26, '#bdb5a2', -angle);
      if (lm.lantern) box(x, base + h + 18, z, 5, 8, 5);
    } else if (lm.kind === 'pinnacle') box(x, base + h / 2, z, 22, h, 18, '#7a766d');
  }
  const city = map.option.backdrop;
  if (city) {
    for (const [x, z, h] of city.towers) box(x, 10 + h / 2, z, 22, h, 18, '#474b54');
    const [x, z, h] = city.lighthouse;
    box(x, 10 + h / 2, z, 8, h, 8, '#eeeae2');
  }
  const material = new THREE.MeshStandardNodeMaterial({
    roughness: 0.95,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const playableVertices = parts.reduce((n, part) => n + part.attributes.position!.count, 0);
  // The map's harbour props are skyline silhouettes. The playable apron and track replace them up close.
  for (const lm of map.landmarks) {
    if (lm.kind !== 'crane' || !lm.at) continue;
    const [x, z] = lm.at,
      base = lm.base ?? 0,
      h = lm.h ?? 20;
    const quay = map.places.find((p) => p.id === 'quay')?.at ?? [x + 1, z];
    const angle = Math.atan2(quay[1] - z, quay[0] - x),
      jib = lm.jib ?? h * 0.9;
    const w = Math.max(2, h / 18);
    box(x, base + h / 2, z, w, h, w);
    box(x + Math.cos(angle) * jib * 0.35, base + h, z + Math.sin(angle) * jib * 0.35, jib, w, w, DARK, -angle);
    box(x + Math.cos(angle) * jib * 0.8, base + h * 0.78, z + Math.sin(angle) * jib * 0.8, 0.8, h * 0.45, 0.8);
  }
  const harbour = map.option.harbour;
  if (harbour) {
    for (const path of [harbour.breakwater, harbour.quay])
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1]!,
          b = path[i]!;
        box(
          (a[0] + b[0]) / 2,
          1.5,
          (a[1] + b[1]) / 2,
          Math.hypot(b[0] - a[0], b[1] - a[1]),
          5,
          10,
          CLIFF,
          -Math.atan2(b[1] - a[1], b[0] - a[0]),
        );
      }
    for (const [x, z, w, d, h] of harbour.warehouses) box(x, 3 + h / 2, z, w, h, d);
  }
  const geometry = mergeParts(parts);
  const rock = new Float32Array(geometry.attributes.position!.count);
  let offset = 0;
  for (const part of parts) {
    const end = offset + part.attributes.position!.count;
    if (sandstone.has(part)) rock.fill(1, offset, end);
    offset = end;
  }
  geometry.setAttribute('sandstone', new THREE.BufferAttribute(rock, 1));
  // Only the kit pigment survives this viewing distance. Sample at vertices to avoid subpixel bed seams.
  const { layered } = rockLayers(positionGeometry);
  material.colorNode = vertexStage(
    mix(vertexColor().rgb, layered.mul(normalGeometry.y.abs().mul(0.18).add(1)), attribute('sandstone', 'float')),
  );
  for (const part of parts) part.dispose();
  const horizon = new THREE.Mesh(geometry, material);
  horizon.name = 'Sickle Isles horizon';
  freezeInPlace(horizon);
  void terrainKitGeometry()
    .then((pieces) => {
      for (const [name, matrices] of stackPieces) {
        const mesh = new THREE.InstancedMesh(pieces.get(name)!, kitMaterial(), matrices.length);
        matrices.forEach((transform, i) => mesh.setMatrixAt(i, transform));
        horizon.add(mesh);
      }
    })
    .catch((error: unknown) => console.warn('[high-gorge] cliff kit load failed', error));
  return { horizon, playableVertices };
}
