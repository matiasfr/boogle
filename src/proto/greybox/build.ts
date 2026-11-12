// The greybox as meshes and solids, all from the map JSON (./map-data.ts): islands as flat-topped prisms tinted by
// role and geology, a sand or rock shelf under the water round each, rail placeholders on trestle blocks coloured by
// stage, station markers, gates, landmarks, a harbour, the mainland backdrop and the ambient boats.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { scene } from '../../render/scene.ts';
import { readableGlow } from '../../render/readable-unlit.ts';
import { addBody, createBody, type Shape } from '../../physics/engine.ts';
import { GROUP, groundMat } from '../../physics/physics.ts';
import { flat } from '../../render/flat.ts';
import { FAR } from '../../place/layout.ts';
import { FORMATION, WORLD_LINES } from '../../sim/railway-world-lines.ts';
import { RING_CONES, SEA_BED, wx, wz, type Ground } from './ground.ts';
import {
  blobPts,
  distToLine,
  inside,
  mulberry,
  smoothRing,
  stageOf,
  type Harbour,
  type Land,
  type Layout,
  type Work,
  type XZ,
} from './map-data.ts';

/** One tint per role, so it reads as a greybox; a land's geology `tint` replaces the cliff tint. */
export const TINT = {
  walk: '#a9b48c',
  cliff: '#9c988f',
  backdrop: '#5d6a66',
  gate: '#ff6a2e',
  landmark: '#2c3038',
  marker: '#f4f1e8',
  sand: '#d6c69c',
  rock: '#7a766d',
  chalk: '#c9c5bb',
};
export const STAGE_COLOURS: Record<number, string> = {
  2: '#3f7fd8',
  3: '#e89b2f',
  4: '#d8412f',
  5: '#9157d6',
  6: '#22b39a',
  7: '#e8cf2f',
  8: '#e85cab',
};
const UNBUILT = '#8a8a8a';
/** Line 2's work marks take the stage palette; the survey line is pink, so it never reads as a laid stage. */
const WORK_COLOURS: Record<Work['kind'], string> = {
  frame: STAGE_COLOURS[2]!,
  gate: STAGE_COLOURS[4]!,
  chest: STAGE_COLOURS[7]!,
  halt: STAGE_COLOURS[6]!,
  boiler: STAGE_COLOURS[3]!,
  train: STAGE_COLOURS[5]!,
  works: '#d9d4c8',
};
const SURVEY = '#ff5fa8';
const SURVEY_EVERY = 20;
/** The railway's deck over the sea, metres (Place's `LINES.east` rail height past the rim). */
const LINE2_DECK = 24.3;
const WALK = flat(TINT.walk),
  BACKDROP = flat(TINT.backdrop),
  GATE = flat(TINT.gate, 0.6),
  LANDMARK = flat(TINT.landmark),
  MARKER = flat(TINT.marker, 0.6),
  WHITE = flat('#eeeae2');

export type Spot = { pos: THREE.Vector3; label: string; kind: 'place' | 'gate' | 'mark'; stage?: number | null };
export type BuiltLine = { id: string; name: string; stage: number | null; path: THREE.Vector3[] };
export type Greybox = {
  root: THREE.Group;
  markers: THREE.Group;
  spots: Record<string, Spot>;
  lines: BuiltLine[];
  /** Cosmetic motion: the boats, the blinking lights, the smoke. */
  animate(dt: number, time: number): void;
};

function solid(shapes: Shape[], position = { x: 0, y: 0, z: 0 }, rotation?: THREE.Quaternion) {
  addBody(
    createBody({
      material: groundMat,
      group: GROUP.SCENERY,
      position,
      ...(rotation ? { rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w } } : {}),
      shapes,
    }),
  );
}
/** Under the look harness (?debugcam=1&dpr=fixed), some meshes' first render objects never drew (the far islets, the
 * mainland, the crowns: seen 6 and 7 November), while the same material cloned later drew at once. So once the blockout
 * has been on screen for a moment, give every mesh fresh clones of its materials. Cheap: same programs. */
export function refreshMaterials(root: THREE.Object3D) {
  const made = new Map<THREE.Material, THREE.Material>();
  const swap = (m: THREE.Material) => {
    let c = made.get(m);
    if (!c) made.set(m, (c = m.clone()));
    return c;
  };
  root.traverse((o) => {
    if (o instanceof THREE.Mesh)
      o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material as THREE.Material);
  });
}
const yawQ = (yaw: number) => new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
const glow = (color: string, intensity: number) =>
  readableGlow(new THREE.MeshStandardNodeMaterial({ color, emissive: color, emissiveIntensity: intensity }));

type Box = { w: number; h: number; d: number; x: number; y: number; z: number; yaw?: number };
/** A merged set of boxes with one material; `solidToo` adds each as a solid box. Box local x turns by `yaw`. */
function boxes(list: Box[], mat: THREE.Material, parent: THREE.Object3D, solidToo = true) {
  const geo = mergeGeometries(
    list.map((b) => new THREE.BoxGeometry(b.w, b.h, b.d).rotateY(b.yaw ?? 0).translate(b.x, b.y, b.z)),
  );
  const mesh = new THREE.Mesh(geo, mat);
  parent.add(mesh);
  if (solidToo)
    for (const b of list)
      solid([{ kind: 'box', hx: b.w / 2, hy: b.h / 2, hz: b.d / 2 }], { x: b.x, y: b.y, z: b.z }, yawQ(b.yaw ?? 0));
  return mesh;
}
/** The yaw that turns box local +x along (dx, dz). */
const alongYaw = (dx: number, dz: number) => -Math.atan2(dz, dx);

// ---------------------------------------------------------------- islands and shelves
const centroid = (pts: XZ[]): XZ => {
  let x = 0,
    z = 0;
  for (const p of pts) {
    x += p[0];
    z += p[1];
  }
  return [x / pts.length, z / pts.length];
};
/** A flat walkable top and cliff sides battered out to the sea bed; groups 0 (top) and 1 (sides). */
function prism(outline: XZ[], top: number, batter = 0.035) {
  const [cx, cz] = centroid(outline);
  const n = outline.length;
  const verts: number[] = [];
  for (const [x, z] of outline) verts.push(x, top, z);
  for (const [x, z] of outline) verts.push(cx + (x - cx) * (1 + batter), SEA_BED, cz + (z - cz) * (1 + batter));
  const tops: number[] = [],
    sides: number[] = [];
  const contour = outline.map(([x, z]) => new THREE.Vector2(x, z));
  for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(contour, [])) {
    const ax = verts[a! * 3]!,
      az = verts[a! * 3 + 2]!;
    const up = (verts[b! * 3 + 2]! - az) * (verts[c! * 3]! - ax) - (verts[b! * 3]! - ax) * (verts[c! * 3 + 2]! - az);
    tops.push(...(up >= 0 ? [a!, b!, c!] : [a!, c!, b!]));
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ex = outline[j]![0] - outline[i]![0],
      ez = outline[j]![1] - outline[i]![1];
    const mx = (outline[i]![0] + outline[j]![0]) / 2 - cx,
      mz = (outline[i]![1] + outline[j]![1]) / 2 - cz;
    // The face normal (-ez, ex) should point away from the middle.
    if (-ez * mx + ex * mz > 0) sides.push(i, n + i, j, j, n + i, n + j);
    else sides.push(i, j, n + i, j, n + j, n + i);
  }
  const indices = [...tops, ...sides];
  const position = new Float32Array(indices.length * 3);
  indices.forEach((v, k) => position.set([verts[v * 3]!, verts[v * 3 + 1]!, verts[v * 3 + 2]!], k * 3));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geo.addGroup(0, tops.length, 0);
  geo.addGroup(tops.length, sides.length, 1);
  geo.computeVertexNormals();
  return { geo, verts: new Float32Array(verts), indices: new Uint32Array(indices) };
}
/** Each outline point pushed out along its outward normal. */
function offset(outline: XZ[], d: number): XZ[] {
  const n = outline.length;
  const [cx, cz] = centroid(outline);
  return outline.map((p, i) => {
    const a = outline[(i - 1 + n) % n]!,
      b = outline[(i + 1) % n]!;
    let nx = b[1] - a[1],
      nz = -(b[0] - a[0]);
    const len = Math.hypot(nx, nz) || 1;
    nx /= len;
    nz /= len;
    if (nx * (p[0] - cx) + nz * (p[1] - cz) < 0) {
      nx = -nx;
      nz = -nz;
    }
    return [p[0] + nx * d, p[1] + nz * d];
  });
}
/** The shallow shelf round an island, so the sea lightens toward the shore: sand or rock, sloping to the sea bed. */
function shelf(outline: XZ[], w: number, kind: 'sand' | 'rock') {
  const inner = offset(outline, 1),
    outer = offset(outline, w);
  const yIn = kind === 'sand' ? -0.7 : -1.6,
    yOut = SEA_BED + 1;
  const n = outline.length;
  const pos: number[] = [];
  const push = (p: XZ, y: number) => pos.push(wx(p[0]), y, wz(p[1]));
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    push(inner[i]!, yIn);
    push(outer[i]!, yOut);
    push(inner[j]!, yIn);
    push(inner[j]!, yIn);
    push(outer[i]!, yOut);
    push(outer[j]!, yOut);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.computeVertexNormals();
  // Winding varies with the outline's direction: draw both sides rather than chase it.
  const mat = flat(kind === 'sand' ? TINT.sand : TINT.rock).clone();
  mat.side = THREE.DoubleSide;
  return new THREE.Mesh(geo, mat);
}

/** The harbour basin's sea floor: shallow at the quay, a few metres across the basin, falling to the open sea past the
 * mouth. The water shades by the depth of what lies under it, so this is what turns the basin turquoise. */
function basinFloor(hb: Harbour) {
  const sb = hb.seabed!;
  const poly: XZ[] = [...hb.breakwater, ...[...hb.quay].reverse()];
  const edge: XZ[] = [...poly, poly[0]!];
  const MARGIN = 150,
    CELL = 12,
    deep = SEA_BED - 16;
  const sm = (t: number) => t * t * (3 - 2 * t);
  const xs = poly.map((p) => p[0]),
    zs = poly.map((p) => p[1]);
  const x0 = Math.min(...xs) - MARGIN,
    z0 = Math.min(...zs) - MARGIN;
  const nx = Math.ceil((Math.max(...xs) + MARGIN - x0) / CELL) + 1,
    nz = Math.ceil((Math.max(...zs) + MARGIN - z0) / CELL) + 1;
  const reach = Math.hypot(hb.mouth[0] - hb.quay[0]![0], hb.mouth[1] - hb.quay[0]![1]);
  const yAt = new Float32Array(nx * nz),
    live = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const p: XZ = [x0 + i * CELL, z0 + j * CELL];
      const de = distToLine(p, edge) * (inside(p, poly) ? 0 : 1);
      // across the basin: quay foot to basin depth, then on down to the mouth depth toward the mouth
      const across = sb.quay + (sb.basin - sb.quay) * sm(Math.min(1, distToLine(p, hb.quay) / 120));
      const toMouth = sm(Math.max(0, 1 - Math.hypot(p[0] - hb.mouth[0], p[1] - hb.mouth[1]) / (reach * 0.7)));
      const d = across + (sb.mouth - across) * toMouth;
      const k = i + j * nx;
      yAt[k] = -(d + (-deep - d) * sm(Math.min(1, de / MARGIN)));
      live[k] = de < MARGIN ? 1 : 0;
    }
  const TRI: [number, number][] = [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ];
  const pos: number[] = [];
  const v = (i: number, j: number) => pos.push(wx(x0 + i * CELL), yAt[i + j * nx]!, wz(z0 + j * CELL));
  for (let j = 0; j < nz - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      if (!(live[i + j * nx] || live[i + 1 + j * nx] || live[i + (j + 1) * nx] || live[i + 1 + (j + 1) * nx])) continue;
      for (const [a, b] of TRI) v(i + a, j + b);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.computeVertexNormals();
  const mat = flat(TINT.sand).clone();
  mat.side = THREE.DoubleSide;
  return new THREE.Mesh(geo, mat);
}

/** `review: false` (the live client's `?blockout=world`) leaves out the planning marks: line 2's work posts, the survey
 * line and the station poles. */
export function buildGreybox(map: Layout, ground: Ground, { review = true } = {}): Greybox {
  const root = new THREE.Group();
  root.name = 'greybox';
  const markers = new THREE.Group();
  root.add(markers);
  const spots: Record<string, Spot> = {};
  const animations: ((dt: number, time: number) => void)[] = [];
  const cliffMat = (g: Land) => flat(g.tint ?? (g.module === 'chalk' ? TINT.chalk : TINT.cliff));

  // ---- islands: a module's lands share one mesh (the White Wall's chalk kit)
  const modules = new Map<string, ReturnType<typeof prism>>();
  for (const g of ground.lands) {
    const top = ground.topOf(g);
    if (g.module && g.c && g.r && !g.clip) {
      let kit = modules.get(g.module);
      if (!kit) modules.set(g.module, (kit = prism(smoothRing(blobPts([0, 0], g.r, g.seed, g.rough, 0)), top)));
      const mesh = new THREE.Mesh(kit.geo, [WALK, cliffMat(g)]);
      mesh.position.set(wx(g.c[0]), 0, wz(g.c[1]));
      mesh.rotation.y = (-(g.rot ?? 0) * Math.PI) / 180;
      mesh.name = g.id;
      root.add(mesh);
      solid([{ kind: 'trimesh', vertices: kit.verts, indices: kit.indices }], mesh.position, mesh.quaternion);
    } else {
      const p = prism(
        g.outline.map(([x, z]): XZ => [wx(x), wz(z)]),
        top,
      );
      const mesh = new THREE.Mesh(p.geo, [WALK, cliffMat(g)]);
      mesh.name = g.id;
      root.add(mesh);
      solid([{ kind: 'trimesh', vertices: p.verts, indices: p.indices }]);
    }
    if (g.shelf) root.add(shelf(g.outline, g.shelf.w, g.shelf.kind));
  }
  // Ring Island's cones stand there already; make them solid so the aperture can be walked to.
  for (const [dx, dz, r, h] of RING_CONES)
    solid(
      [{ kind: 'cylinder', rTop: 0.5, rBottom: r, h, segments: 7 }],
      { x: wx(FAR.x + dx), y: h / 2 - 4, z: wz(FAR.z + dz) },
      yawQ(dx),
    );

  // ---- forests: trunks you bump into, crowns you look at (crown tops at the terrain's `h`)
  for (const t of map.terrain.filter((x) => x.kind === 'forest' && x.c && x.r)) {
    const base = map.land.find((g) => g.id === t.land)?.top ?? 10;
    const crownTop = t.h ?? base + 60;
    const rnd = mulberry((t.seed ?? 1) * 31);
    const n = Math.round(((t.r![0] * t.r![1]) / 9000) * (t.density ?? 1));
    const trunks: THREE.BufferGeometry[] = [],
      crowns: THREE.BufferGeometry[] = [];
    // One trunk and one crown (both merged below, so the whole forest is two draw calls).
    const plant = (x: number, z: number, trunkH: number, trunkR: number, crown: THREE.BufferGeometry) => {
      trunks.push(new THREE.CylinderGeometry(trunkR * 0.8, trunkR, trunkH, 7).translate(x, base + trunkH / 2, z));
      crowns.push(crown);
      solid([{ kind: 'cylinder', rTop: trunkR * 0.8, rBottom: trunkR, h: trunkH, segments: 7 }], {
        x,
        y: base + trunkH / 2,
        z,
      });
    };
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2,
        rr = Math.sqrt(rnd()),
        r = 28 + rnd() * 30;
      const x = wx(t.c![0] + Math.cos(a) * t.r![0] * rr),
        z = wz(t.c![1] + Math.sin(a) * t.r![1] * rr);
      if (t.crownFrom !== undefined) {
        // Walkable forest: crowns start `crownFrom` above the ground, trunks 3-5 m thick.
        const top = crownTop + (rnd() - 0.5) * 20,
          crownR = 14 + rnd() * 8,
          crownH = top - base - t.crownFrom;
        const crown = new THREE.IcosahedronGeometry(crownR, 0).scale(1, crownH / 2 / crownR, 1);
        plant(x, z, t.crownFrom + crownH * 0.3, 1.5 + rnd(), crown.translate(x, top - crownH / 2, z));
        continue;
      }
      const top = crownTop - (58 - r) * 0.6; // smaller crowns stand a little lower
      const crownH = r * 0.9,
        trunkH = top - crownH * 0.6 - base;
      plant(
        x,
        z,
        trunkH,
        2.5 + r * 0.08,
        new THREE.IcosahedronGeometry(r * 0.75, 0).scale(1, 0.75, 1).translate(x, top - crownH / 2, z),
      );
    }
    // Mother trees: a few giants that keep the skyline lure (crowns top out at `motherH`).
    const motherTop = t.motherH ?? 150;
    for (const [mx, mz] of t.mothers ?? []) {
      const x = wx(mx),
        z = wz(mz);
      const crown = new THREE.IcosahedronGeometry(45, 0).scale(1, 0.8, 1);
      plant(x, z, motherTop - 36 - base + 8, 7, crown.translate(x, motherTop - 36, z));
    }
    root.add(new THREE.Mesh(mergeGeometries(trunks), LANDMARK));
    root.add(new THREE.Mesh(mergeGeometries(crowns), BACKDROP));
  }

  // ---- lines: double-track deck boxes on trestle blocks, coloured by stage for this pick, with the two tracks' beds
  // on top (one merged mesh for every line's beds)
  const lines: BuiltLine[] = [];
  const pivot = new THREE.Object3D();
  const beds: THREE.BufferGeometry[] = [];
  const HALF = FORMATION.centresCm / 200;
  const bed = (len: number, lat: number, matrix: THREE.Matrix4) =>
    beds.push(new THREE.BoxGeometry(2.6, 0.14, len).translate(lat, 0.07, 0).applyMatrix4(matrix));
  for (const line of map.lines) {
    const built = line.kind === 'built';
    const path = ground.linePath(line, built).map(([x, y, z]) => new THREE.Vector3(x, y, z));
    const stage = stageOf(line.stage, map.pick);
    if (built) {
      lines.push({ id: line.id, name: line.name, stage, path });
      continue; // the real railway is there
    }
    // Rides and the rider's sleepers run on the left-hand track, half the track centres off the corridor's middle.
    const left = path.map((p, i) => {
      const a = path[Math.max(0, i - 1)]!,
        b = path[Math.min(path.length - 1, i + 1)]!;
      const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      return new THREE.Vector3(p.x + ((b.z - a.z) / len) * HALF, p.y, p.z - ((b.x - a.x) / len) * HALF);
    });
    lines.push({ id: line.id, name: line.name, stage, path: left });
    const W = FORMATION.deckCm / 100,
      T = 1.2,
      parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i]!,
        b = path[i + 1]!;
      const len = a.distanceTo(b) + 1.5;
      pivot.position.copy(a).add(b).multiplyScalar(0.5);
      pivot.position.y -= T / 2;
      pivot.lookAt(b.x, b.y - T / 2, b.z);
      pivot.updateMatrix();
      parts.push(new THREE.BoxGeometry(W, T, len).applyMatrix4(pivot.matrix));
      solid([{ kind: 'box', hx: W / 2, hy: T / 2, hz: len / 2 }], pivot.position, pivot.quaternion);
      pivot.position.y += T / 2;
      pivot.updateMatrix();
      for (const lat of [-HALF, HALF]) bed(len, lat, pivot.matrix);
      const n = Math.floor(len / 30);
      for (let k = 1; k <= n; k++) {
        const t = k / (n + 1);
        const x = a.x + (b.x - a.x) * t,
          z = a.z + (b.z - a.z) * t,
          y = a.y + (b.y - a.y) * t - T;
        const under = ground.groundAt(x - wx(0), z - wz(0));
        if (y - under < 2) continue;
        parts.push(new THREE.BoxGeometry(1.6, y - under, 1.6).translate(x, (y + under) / 2, z));
      }
    }
    const mesh = new THREE.Mesh(
      mergeGeometries(parts),
      flat(stage === null ? UNBUILT : (STAGE_COLOURS[stage] ?? UNBUILT), 0.7),
    );
    mesh.name = `line-${line.id}`;
    root.add(mesh);
  }

  // ---- stations: a pad and a white pole (shown with the labels)
  const firstStage = (id: string) => {
    const s = lines.filter((l) => !map.lines.find((x) => x.id === l.id && x.kind === 'built'));
    const own = s.filter((l) => {
      const src = map.lines.find((x) => x.id === l.id)!;
      return src.from === id || src.to === id;
    });
    return own.length ? Math.min(...own.map((l) => l.stage ?? 99)) : null;
  };
  for (const p of map.places) {
    const y = ground.deckOf(p.id, p.at);
    const x = wx(p.at[0]),
      z = wz(p.at[1]);
    spots[p.id] = { pos: new THREE.Vector3(x, y, z), label: p.name, kind: 'place', stage: firstStage(p.id) };
    if (p.id === 'home' || p.id === 'camp' || p.id === 'splitrock' || p.id === 'pier' || p.id === 'original') continue;
    boxes([{ w: 16, h: 1, d: 16, x, y: y - 0.5, z }], MARKER, root);
    if (review) boxes([{ w: 1.4, h: 30, d: 1.4, x, y: y + 15, z }], MARKER, markers, false);
  }

  // ---- halts and turnbacks (src/sim/railway-world-lines.ts): a 40 m platform outside each track at every stop, top 0.9 m
  // over the deck; a scissors crossover inside each terminus; a single-track balloon loop where the line ends on land
  {
    const platforms: Box[] = [],
      loops: Box[] = [];
    for (const line of WORLD_LINES) {
      const along = [line.fromCm];
      for (let i = 1; i < line.pts.length; i++)
        along.push(
          along[i - 1]! + Math.hypot(line.pts[i]![0] - line.pts[i - 1]![0], line.pts[i]![1] - line.pts[i - 1]![1]),
        );
      for (const h of line.halts) {
        const s = line.stops[h.stop]!;
        let i = 1;
        while (i < along.length - 1 && along[i]! < s) i++;
        const a = line.pts[i - 1]!,
          b = line.pts[i]!;
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1,
          ux = (b[0] - a[0]) / len,
          uz = (b[1] - a[1]) / len;
        for (const side of [-1, 1]) {
          const off = (side * FORMATION.platformCm) / 100,
            x = h.x / 100 - uz * off,
            z = h.z / 100 + ux * off;
          platforms.push({ w: 40, h: 1.2, d: 4, x, y: h.y / 100 + 0.3, z, yaw: alongYaw(ux, uz) });
        }
        spots[`halt-${line.id}-${h.stop}`] = {
          pos: new THREE.Vector3(h.x / 100, h.y / 100 + 1, h.z / 100),
          label: `${h.name} (${line.name})`,
          kind: 'mark',
          stage: null,
        };
      }
      for (const e of line.ends) {
        let i = 1;
        while (i < along.length - 1 && along[i]! < e.sCm) i++;
        const a = line.pts[i - 1]!,
          b = line.pts[i]!;
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1,
          ux = (b[0] - a[0]) / len,
          uz = (b[1] - a[1]) / len;
        const y = e.y / 100;
        if (e.kind === 'crossover') {
          // Two diagonals across the 4 m between the tracks, 24 m long: an X on the deck.
          const span = 24,
            diag = Math.hypot(span, 2 * HALF);
          for (const k of [-1, 1]) {
            pivot.position.set(e.x / 100, y + 0.02, e.z / 100);
            pivot.rotation.set(0, Math.atan2(ux, uz) + k * Math.atan2(2 * HALF, span), 0);
            pivot.updateMatrix();
            bed(diag, 0, pivot.matrix);
          }
          continue;
        }
        // A loop: deck boxes round the circle the line's end touches, with the bed on top.
        const r = FORMATION.loopCm / 100,
          n = 28,
          cx = e.x / 100,
          cz = e.z / 100,
          tip = e.at === 'start' ? line.pts[0]! : line.pts.at(-1)!;
        const a0 = Math.atan2(tip[1] / 100 - cz, tip[0] / 100 - cx);
        const chord = 2 * r * Math.sin(Math.PI / n) + 0.6;
        for (let k = 0; k < n; k++) {
          const t = a0 + ((k + 0.5) / n) * Math.PI * 2,
            x = cx + Math.cos(t) * r,
            z = cz + Math.sin(t) * r;
          loops.push({ w: chord, h: 1.2, d: 3.6, x, y: y - 0.6, z, yaw: alongYaw(-Math.sin(t), Math.cos(t)) });
          pivot.position.set(x, y, z);
          pivot.rotation.set(0, Math.atan2(-Math.sin(t), Math.cos(t)), 0);
          pivot.updateMatrix();
          bed(chord, 0, pivot.matrix);
        }
      }
    }
    boxes(platforms, WHITE, root);
    if (loops.length) boxes(loops, flat(UNBUILT, 0.7), root);
  }

  // Lines 1 and 2's second track is built now (generic-lines step 2): the live railway draws it,
  // so the greybox no longer draws a survey bed beside them. LIVE_SECOND_TRACK stays the blockout page's record.
  {
    const mesh = new THREE.Mesh(mergeGeometries(beds), flat('#4a4038', 0.9));
    mesh.name = 'track-beds';
    root.add(mesh);
  }

  // ---- line-2 works: thin, non-solid posts with labels, and the unlaid stretch as a survey line (never solid)
  // The production railway is (or will be) laid there, so nothing here collides: a laid track must never meet a greybox solid.
  if (review) {
    const deck = LINE2_DECK;
    const groups = new Map<Work['kind'], Box[]>();
    for (const w of map.works) {
      const [ax, az] = w.at;
      const x = wx(ax),
        z = wz(az),
        under = ground.groundAt(ax, az);
      const base = Math.max(under, 0),
        top = (under < 1 ? deck : Math.max(under, 2.5)) + 9;
      const list = groups.get(w.kind) ?? [];
      list.push(
        { w: 0.45, h: top - base, d: 0.45, x, y: (top + base) / 2, z },
        { w: 2.6, h: 1.3, d: 0.12, x: x + 1.3, y: top - 0.9, z },
      );
      groups.set(w.kind, list);
      spots[`work-${w.id}`] = { pos: new THREE.Vector3(x, top, z), label: w.name, kind: 'mark', stage: null };
    }
    for (const [kind, list] of groups) boxes(list, flat(WORK_COLOURS[kind], 0.7), root, false);

    const l2b = map.lines.find((l) => l.id === 'l2b');
    if (l2b) {
      const stakes: Box[] = [],
        tape: Box[] = [];
      const every = SURVEY_EVERY;
      let carried = 0,
        prev: XZ | null = null;
      const stake = (x: number, z: number) => {
        const under = ground.groundAt(x, z),
          base = Math.max(under, 0),
          top = Math.max(base, deck) + 2.5;
        stakes.push({ w: 0.22, h: top - base, d: 0.22, x: wx(x), y: (top + base) / 2, z: wz(z) });
        if (prev)
          tape.push({
            w: Math.hypot(x - prev[0], z - prev[1]),
            h: 0.1,
            d: 0.1,
            x: wx((x + prev[0]) / 2),
            y: Math.max(base, deck) + 2,
            z: wz((z + prev[1]) / 2),
            yaw: alongYaw(x - prev[0], z - prev[1]),
          });
        prev = [x, z];
      };
      const pts = l2b.pts;
      stake(pts[0]![0], pts[0]![1]);
      for (let i = 1; i < pts.length; i++) {
        const [ax, az] = pts[i - 1]!,
          [bx, bz] = pts[i]!,
          len = Math.hypot(bx - ax, bz - az);
        for (let d = every - carried; d <= len; d += every)
          stake(ax + ((bx - ax) * d) / len, az + ((bz - az) * d) / len);
        carried = (carried + len) % every;
      }
      stake(pts.at(-1)![0], pts.at(-1)![1]);
      boxes(stakes, flat(SURVEY, 0.8), root, false);
      boxes(tape, flat(SURVEY, 0.8), root, false);
      const mid = pts[1]!;
      spots['survey-l2b'] = {
        pos: new THREE.Vector3(wx(mid[0]), deck + 12, wz(mid[1])),
        label: `${l2b.name}: survey line, stakes every ${every} m (not laid)`,
        kind: 'mark',
        stage: null,
      };
    }
  }

  // ---- gates: the sea cave is built into its face; the rest are tall orange posts
  for (const g of map.gates) {
    const [gx, gz] = g.at;
    if (g.id === 'cave') {
      // Face the lowest ground 15 m around: out of the cliff, towards the water.
      let best = { h: Infinity, a: 0 };
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const h = ground.groundAt(gx + Math.sin(a) * 15, gz + Math.cos(a) * 15);
        if (h < best.h) best = { h, a };
      }
      const yaw = best.a,
        ox = Math.sin(yaw),
        oz = Math.cos(yaw);
      // A mouth at the waterline, set into the face: dark recess, the cracked orange plug, a slot of daylight.
      const base = 1;
      boxes(
        [{ w: 11, h: 9, d: 16, x: wx(gx - ox * 6), y: base + 4.5, z: wz(gz - oz * 6), yaw }],
        flat('#14161b'),
        root,
        false,
      );
      boxes([{ w: 8, h: 7, d: 1.5, x: wx(gx + ox * 2), y: base + 3.5, z: wz(gz + oz * 2), yaw }], GATE, root);
      const slit = new THREE.Mesh(new THREE.BoxGeometry(5, 1, 0.6).rotateY(yaw), glow('#fff6d8', 1.4));
      slit.position.set(wx(gx + ox * 2.9), base + 7.6, wz(gz + oz * 2.9));
      root.add(slit);
      spots.cave = { pos: new THREE.Vector3(wx(gx + ox * 2), base + 4, wz(gz + oz * 2)), label: g.name, kind: 'gate' };
      continue;
    }
    const y = Math.max(0, ground.groundAt(gx, gz));
    if (g.id !== 'crane')
      boxes([{ w: 2, h: 140 - y, d: 2, x: wx(gx), y: (140 + y) / 2, z: wz(gz) }], GATE, markers, false);
    spots[g.id] = { pos: new THREE.Vector3(wx(gx), g.id === 'crane' ? 140 : 120, wz(gz)), label: g.name, kind: 'gate' };
  }

  // ---- landmarks
  const lights: { mesh: THREE.Mesh; period: number; on: number }[] = [];
  for (const lm of map.landmarks) {
    const [ax, az] = lm.at ?? [0, 0];
    const x = wx(ax),
      z = wz(az),
      base = lm.base ?? 0,
      h = lm.h ?? 20;
    if (lm.kind === 'crane') {
      // Tower, jib towards the nearest line end (the quay), counter-jib, hook; a red light on top.
      const quay = map.places.find((p) => p.id === 'quay')?.at ?? [ax + 1, az];
      const yaw = Math.atan2(quay[1] - az, quay[0] - ax);
      const jx = Math.cos(yaw),
        jz = Math.sin(yaw),
        jib = lm.jib ?? h * 0.9;
      const w = Math.max(2, h / 18);
      boxes(
        [
          { w: w * 2, h: 4, d: w * 2, x, y: base + 2, z },
          { w, h, d: w, x, y: base + h / 2, z },
          {
            w: jib,
            h: w * 0.8,
            d: w * 0.8,
            x: x + jx * jib * 0.42,
            y: base + h + w * 0.4,
            z: z + jz * jib * 0.42,
            yaw: -yaw,
          },
          { w: w * 1.6, h: w * 1.6, d: w * 1.6, x: x - jx * jib * 0.14, y: base + h - w * 0.2, z: z - jz * jib * 0.14 },
          { w: 0.8, h: h * 0.45, d: 0.8, x: x + jx * jib * 0.8, y: base + h - h * 0.22, z: z + jz * jib * 0.8 },
        ],
        LANDMARK,
        root,
      );
      if (lm.light) {
        const lamp = new THREE.Mesh(new THREE.IcosahedronGeometry(Math.max(1.5, w * 0.8), 1), glow('#ff4a3a', 3));
        lamp.position.set(x, base + h + w * 1.6, z);
        root.add(lamp);
        lights.push({ mesh: lamp, period: 2, on: 1.2 });
      }
      spots[lm.id] = {
        pos: new THREE.Vector3(x, base + h + 6, z),
        label: lm.note ? 'Harbour crane' : 'Dock crane',
        kind: 'mark',
      };
    } else if (lm.kind === 'arch') {
      // Two legs and a lintel across the bearing it faces; the lantern on top.
      const b = ((lm.bearing ?? 0) * Math.PI) / 180;
      const fx = Math.sin(b),
        fz = -Math.cos(b); // facing
      const ax2 = -fz,
        az2 = fx; // across
      const span = lm.span ?? 30,
        leg = 22,
        yaw = alongYaw(ax2, az2);
      boxes(
        [
          {
            w: leg,
            h,
            d: 26,
            x: x + ax2 * (span / 2 + leg / 2),
            y: base + h / 2,
            z: z + az2 * (span / 2 + leg / 2),
            yaw,
          },
          {
            w: leg,
            h,
            d: 26,
            x: x - ax2 * (span / 2 + leg / 2),
            y: base + h / 2,
            z: z - az2 * (span / 2 + leg / 2),
            yaw,
          },
          { w: span + leg * 2, h: 14, d: 26, x, y: base + h + 7, z, yaw },
        ],
        flat(map.land.find((g) => inside([ax, az], g.outline))?.tint ?? TINT.cliff),
        root,
      );
      if (lm.lantern) {
        boxes([{ w: 5, h: 8, d: 5, x, y: base + h + 18, z }], LANDMARK, root);
        const lantern = new THREE.Mesh(new THREE.IcosahedronGeometry(3.2, 1), glow('#ffcf6a', 2.4));
        lantern.position.set(x, base + h + 24, z);
        root.add(lantern);
        // the telescope, pointing the way the arch faces
        boxes(
          [{ w: 6, h: 1.2, d: 1.2, x: x + fx * 6, y: base + h + 15, z: z + fz * 6, yaw: alongYaw(fx, fz) }],
          LANDMARK,
          root,
        );
      }
      spots[lm.id] = { pos: new THREE.Vector3(x, base + h + 28, z), label: 'Lantern', kind: 'mark' };
    } else if (lm.kind === 'pinnacle') {
      boxes([{ w: 22, h, d: 18, x, y: base + h / 2, z, yaw: 0.4 }], flat(TINT.rock), root);
    } else if (lm.kind === 'waterfall') {
      const cut = map.terrain.find((t) => t.kind === 'gorge' && t.pts);
      const land = map.land.find((g) => g.id === lm.land);
      if (cut?.pts && land?.c) {
        const [a, b2] = [cut.pts[0]!, cut.pts[cut.pts.length - 1]!];
        const len = Math.hypot(b2[0] - a[0], b2[1] - a[1]);
        const dx = (b2[0] - a[0]) / len,
          dz = (b2[1] - a[1]) / len;
        const sideSign = Math.sign((land.c[0] - a[0]) * -dz + (land.c[1] - a[1]) * dx) || 1;
        const gap = land.clip?.gap ?? 90;
        const mx = (a[0] + b2[0]) / 2 + -dz * sideSign * (gap / 2 + 1) + dx * 50,
          mz = (a[1] + b2[1]) / 2 + dx * sideSign * (gap / 2 + 1) + dz * 50;
        const fall = new THREE.Mesh(new THREE.BoxGeometry(22, h, 2).rotateY(alongYaw(dx, dz)), flat('#e4f4ff', 0.3));
        fall.position.set(wx(mx), h / 2, wz(mz));
        root.add(fall);
        spots[lm.id] = { pos: new THREE.Vector3(wx(mx), h * 0.7, wz(mz)), label: 'Waterfall', kind: 'mark' };
      }
    } else if (lm.kind === 'saltworks') {
      // Salt stacks (white cones), two drying sheds and a wind pump at the halt: height cues on flat ground.
      const rnd = mulberry(17);
      const cones: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 9; i++) {
        const r = 4 + rnd() * 3;
        cones.push(
          new THREE.ConeGeometry(r, r * 1.3, 7).translate(
            x - 70 + (i % 3) * 22 + rnd() * 6,
            base + r * 0.65,
            z - 20 + Math.floor(i / 3) * 22,
          ),
        );
      }
      root.add(new THREE.Mesh(mergeGeometries(cones), WHITE));
      boxes(
        [
          { w: 30, h: 8, d: 12, x: x + 40, y: base + 4, z: z - 30 },
          { w: 30, h: 8, d: 12, x: x + 40, y: base + 4, z: z - 12 },
        ],
        BACKDROP,
        root,
      );
      boxes(
        [
          { w: 2, h: 18, d: 2, x: x - 18, y: base + 9, z: z + 18 },
          { w: 9, h: 0.6, d: 0.6, x: x - 18, y: base + 18, z: z + 19.4 },
          { w: 0.6, h: 9, d: 0.6, x: x - 18, y: base + 18, z: z + 19.4 },
        ],
        LANDMARK,
        root,
      );
      // evaporation pans: low walls
      const pans: Box[] = [];
      for (let i = 0; i < 4; i++) pans.push({ w: 120, h: 0.6, d: 0.6, x: x - 10, y: base + 0.3, z: z + 30 + i * 14 });
      boxes(pans, WHITE, root, false);
    } else if (lm.kind === 'lamps' && lm.line) {
      const line = lines.find((l) => l.id === lm.line);
      if (!line) continue;
      const every = lm.every ?? 60;
      const posts: Box[] = [];
      const lampGeo: THREE.BufferGeometry[] = [];
      for (let i = 0; i < line.path.length - 1; i++) {
        const a = line.path[i]!,
          b = line.path[i + 1]!;
        const len = a.distanceTo(b);
        for (let s = every / 2; s < len; s += every) {
          const p = a.clone().lerp(b, s / len);
          const dx = (b.z - a.z) / len,
            dz = -(b.x - a.x) / len; // to one side
          posts.push({ w: 0.6, h: h, d: 0.6, x: p.x + dx * 4, y: p.y + h / 2, z: p.z + dz * 4 });
          lampGeo.push(new THREE.IcosahedronGeometry(0.9, 0).translate(p.x + dx * 4, p.y + h + 0.5, p.z + dz * 4));
        }
      }
      boxes(posts, LANDMARK, root, false);
      root.add(new THREE.Mesh(mergeGeometries(lampGeo), glow('#ffd27a', 2)));
    }
  }

  // ---- the harbour: breakwater (walkable, the line rides it), quay edge, warehouses, moorings, the head's light
  const hb = map.option.harbour;
  if (hb) {
    if (hb.seabed) root.add(basinFloor(hb));
    const apronTop = ground.deckOf(hb.place, map.places.find((p) => p.id === hb.place)?.at ?? hb.head);
    const wall: Box[] = [];
    for (let i = 0; i < hb.breakwater.length - 1; i++) {
      const [a, b] = [hb.breakwater[i]!, hb.breakwater[i + 1]!];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) + 12;
      wall.push({
        w: len,
        h: apronTop - 1.4 - SEA_BED,
        d: 14,
        x: wx((a[0] + b[0]) / 2),
        y: (apronTop - 1.4 + SEA_BED) / 2,
        z: wz((a[1] + b[1]) / 2),
        yaw: alongYaw(b[0] - a[0], b[1] - a[1]),
      });
    }
    boxes(wall, flat(TINT.rock), root);
    const quay: Box[] = [];
    for (let i = 0; i < hb.quay.length - 1; i++) {
      const [a, b] = [hb.quay[i]!, hb.quay[i + 1]!];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) + 2;
      quay.push({
        w: len,
        h: apronTop + 0.4 - SEA_BED,
        d: 8,
        x: wx((a[0] + b[0]) / 2),
        y: (apronTop + 0.4 + SEA_BED) / 2,
        z: wz((a[1] + b[1]) / 2),
        yaw: alongYaw(b[0] - a[0], b[1] - a[1]),
      });
    }
    boxes(quay, flat('#b9b2a2'), root);
    boxes(
      hb.warehouses.map(([x, z, w, d, h]) => ({ w, h, d, x: wx(x), y: apronTop + h / 2, z: wz(z) })),
      BACKDROP,
      root,
    );
    const boats: Box[] = [];
    for (const [x, z] of hb.moorings) {
      boats.push({ w: 14, h: 2.4, d: 5, x: wx(x), y: 0.6, z: wz(z), yaw: 0.3 });
      boats.push({ w: 4, h: 2.5, d: 3, x: wx(x) - 2, y: 3, z: wz(z), yaw: 0.3 });
    }
    boxes(boats, flat('#6e4b3a'), root, false);
    const [hx, hz] = hb.head;
    boxes([{ w: 4, h: 14, d: 4, x: wx(hx), y: apronTop + 8, z: wz(hz) }], WHITE, root);
    const beacon = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8, 1), glow('#52ff7a', 2.6));
    beacon.position.set(wx(hx), apronTop + 16.5, wz(hz));
    root.add(beacon);
    lights.push({ mesh: beacon, period: 3, on: 1 });
    spots['harbour-mouth'] = {
      pos: new THREE.Vector3(wx(hb.mouth[0]), 12, wz(hb.mouth[1])),
      label: 'Harbour mouth',
      kind: 'mark',
    };
  }

  // ---- the mainland backdrop: a coarse heightfield inside its outline, rising from the coast to its `top`
  const bd = map.option.backdrop;
  const main = bd && map.land.find((g) => g.id === bd.land);
  if (bd && main) {
    const coast = main.outline;
    const top = main.top ?? 300;
    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;
    for (const [x, z] of coast) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
    // Only the seaward edge is coast: distance to the outline, ignoring the far sides beyond the map.
    const cell = 150,
      nx = Math.ceil((maxX - minX) / cell) + 1,
      nz = Math.ceil((maxZ - minZ) / cell) + 1;
    const rnd = mulberry(91);
    const hAt: number[] = [];
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        const p: XZ = [minX + i * cell, minZ + j * cell];
        const d = distToLine(p, coast);
        const h = inside(p, coast)
          ? Math.min(top, 25 + d * 0.22) * (0.8 + rnd() * 0.35) + 30 * Math.sin(p[0] * 0.002 + p[1] * 0.003)
          : -15;
        hAt.push(h);
      }
    const pos: number[] = [];
    const v = (i: number, j: number) => [wx(minX + i * cell), hAt[i + j * nx]!, wz(minZ + j * cell)] as const;
    for (let j = 0; j < nz - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        const a = v(i, j),
          b = v(i + 1, j),
          c = v(i, j + 1),
          d = v(i + 1, j + 1);
        if (Math.max(a[1], b[1], c[1], d[1]) < 0) continue;
        pos.push(...a, ...c, ...b, ...b, ...c, ...d);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    geo.computeVertexNormals();
    const land = new THREE.Mesh(geo, flat('#7d8a84'));
    land.name = 'mainland';
    root.add(land);
    // the city: towers, a lighthouse, smoke
    const cityBase = 30;
    boxes(
      bd.towers.map(([x, z, h]) => ({ w: 18 + (h % 7), h, d: 18, x: wx(x), y: cityBase + h / 2 - 20, z: wz(z) })),
      flat('#474b54'),
      root,
      false,
    );
    const [lx, lz, lh] = bd.lighthouse;
    boxes([{ w: 8, h: lh, d: 8, x: wx(lx), y: lh / 2 + 10, z: wz(lz) }], WHITE, root, false);
    const lhLamp = new THREE.Mesh(new THREE.IcosahedronGeometry(4, 1), glow('#fff2c0', 3));
    lhLamp.position.set(wx(lx), lh + 14, wz(lz));
    root.add(lhLamp);
    lights.push({ mesh: lhLamp, period: 5, on: 1.2 });
    // window lights: faint by day
    const win: THREE.BufferGeometry[] = [];
    for (const [x, z, h] of bd.towers)
      for (let y = 12; y < h - 6; y += 14)
        win.push(new THREE.BoxGeometry(19, 1.5, 19.2).translate(wx(x), cityBase + y - 20, wz(z)));
    root.add(new THREE.Mesh(mergeGeometries(win), glow('#ffd9a0', 0.6)));
    const puffs: THREE.Mesh[] = [];
    const smokeMat = flat('#a9a9a6');
    for (let i = 0; i < 6; i++) {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(14 + i * 5, 0), smokeMat);
      root.add(puff);
      puffs.push(puff);
    }
    const [sx, sz] = bd.smoke;
    animations.push((_dt, time) => {
      puffs.forEach((p, i) => {
        const k = (time * 0.04 + i / puffs.length) % 1;
        p.position.set(wx(sx) + k * 120, 60 + k * 240, wz(sz) - k * 40);
        p.scale.setScalar(0.6 + k);
      });
    });
    spots.city = {
      pos: new THREE.Vector3(wx(bd.city[0]), 160, wz(bd.city[1])),
      label: 'The mainland city',
      kind: 'mark',
    };
  }

  // ---- ambient boats: there and back along their routes, cosmetic (the fog fades them with distance)
  for (const route of map.ambient) {
    const pts = route.pts.map(([x, z]) => new THREE.Vector3(wx(x), 0.8, wz(z)));
    const along = [0];
    for (let i = 1; i < pts.length; i++) along.push(along[i - 1]! + pts[i]!.distanceTo(pts[i - 1]!));
    const total = along.at(-1)!;
    const steamer = route.kind === 'steamer';
    const boat = new THREE.Group();
    const hull = steamer ? flat('#f1efe8') : flat('#5b3a2e');
    boxes([{ w: steamer ? 34 : 42, h: 5, d: steamer ? 8 : 10, x: 0, y: 1, z: 0 }], hull, boat, false);
    boxes(
      steamer
        ? [
            { w: 20, h: 4, d: 7, x: -1, y: 5.5, z: 0 },
            { w: 2.5, h: 8, d: 2.5, x: 2, y: 11, z: 0 },
          ]
        : [
            { w: 8, h: 6, d: 8, x: -15, y: 6.5, z: 0 },
            { w: 22, h: 4, d: 8, x: 6, y: 5.5, z: 0 },
          ],
      steamer ? flat('#c04a2f') : flat('#3e6f8f'),
      boat,
      false,
    );
    root.add(boat);
    const at = new THREE.Vector3(),
      next = new THREE.Vector3();
    const point = (s: number, out: THREE.Vector3) => {
      let i = 1;
      while (i < along.length - 1 && along[i]! < s) i++;
      const t = (s - along[i - 1]!) / Math.max(1e-6, along[i]! - along[i - 1]!);
      return out.copy(pts[i - 1]!).lerp(pts[i]!, Math.max(0, Math.min(1, t)));
    };
    animations.push((_dt, time) => {
      const loop = (time * route.speed + route.phase * 2 * total) % (2 * total);
      const s = loop < total ? loop : 2 * total - loop;
      point(s, at);
      point(loop < total ? Math.min(total, s + 5) : Math.max(0, s - 5), next);
      boat.position.copy(at);
      boat.rotation.y = alongYaw(next.x - at.x, next.z - at.z);
      boat.position.y = 0.4 + Math.sin(time * 0.9 + route.phase * 7) * 0.3;
    });
  }

  animations.push((_dt, time) => {
    for (const l of lights) l.mesh.visible = time % l.period < l.on;
  });
  scene.add(root);
  return {
    root,
    markers,
    spots,
    lines,
    animate(dt, time) {
      for (const a of animations) a(dt, time);
    },
  };
}
