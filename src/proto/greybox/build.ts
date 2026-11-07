// The Sickle Isles blockout as meshes and solids: untextured prisms for every island, the White Wall from one chalk
// module placed four times, placeholder rail ribbons on trestle blocks coloured by stage, station markers and the
// landmarks at height. Flat tints, one per role. Dev only (../../features/proto-greybox.ts). The data is ./sickle-data.ts.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { scene } from '../../render/scene.ts';
import { readableGlow } from '../../render/readable-unlit.ts';
import { addBody, createBody, type Shape } from '../../physics/engine.ts';
import { GROUP, groundMat } from '../../physics/physics.ts';
import { flat } from '../flat.ts';
import { ORIGIN, FAR } from '../place/layout.ts';
import { H, insidePlace } from '../place/terrain.ts';
import {
  CHALK_MODULE,
  GATES,
  GORGE_GAP,
  GORGE_X,
  ISLES,
  LINES,
  PLACES,
  SECRETS,
  STAGE_COLOURS,
  UNBUILT,
  blobPts,
  canopyTrees,
  inside,
  isleOutline,
  smoothRing,
  stageOf,
  type Line,
  type Pick,
  type XZ,
} from './sickle-data.ts';

/** `&gbcliff=d9d4c8` puts chalk white back: near-white cliffs vanished into the pale horizon haze past ~2 km. */
const cliffTint = /^[0-9a-f]{6}$/i.test(new URLSearchParams(location.search).get('gbcliff') ?? '')
  ? `#${new URLSearchParams(location.search).get('gbcliff')}`
  : '#9c988f';
/** One tint per role, so it reads as a greybox: walkable tops, cliffs, and things you only look at. */
export const TINT = {
  walk: '#a9b48c',
  cliff: cliffTint,
  backdrop: '#5d6a66',
  gate: '#ff6a2e',
  landmark: '#2c3038',
  marker: '#f4f1e8',
};
const WALK = flat(TINT.walk),
  CLIFF = flat(TINT.cliff),
  BACKDROP = flat(TINT.backdrop),
  GATE = flat(TINT.gate, 0.6),
  LANDMARK = flat(TINT.landmark),
  MARKER = flat(TINT.marker, 0.6);
const SEA_BED = -10;
const wx = (x: number) => x + ORIGIN.x,
  wz = (z: number) => z + ORIGIN.z;

export const root = new THREE.Group();
root.name = 'sickle-greybox';
/** Station markers and gate posts: shown with the labels. */
export const markers = new THREE.Group();
root.add(markers);

function solid(shapes: Shape[], position = { x: 0, y: 0, z: 0 }, rotation?: THREE.Quaternion) {
  const body = createBody({
    material: groundMat,
    group: GROUP.SCENERY,
    position,
    ...(rotation ? { rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w } } : {}),
    shapes,
  });
  addBody(body);
}

// ---------------------------------------------------------------- ground under a point (local metres)
const OUTLINES = ISLES.map((isle) => ({ isle, pts: isleOutline(isle) }));
/** Today's Ring Island cones (src/proto/place/land.ts, buildFar): dx, dz, radius, height. */
const RING_CONES: [number, number, number, number][] = [
  [0, 0, 340, 70],
  [-170, 60, 170, 120],
  [190, 30, 190, 95],
  [40, -90, 130, 150],
];
function ringHeight(x: number, z: number) {
  let best = -Infinity;
  for (const [dx, dz, r, h] of RING_CONES) {
    const d = Math.hypot(x - FAR.x - dx, z - FAR.z - dz);
    if (d < r) best = Math.max(best, h - 4 - (h * d) / r);
  }
  return best;
}
/** The highest isle top over a point, or null over open sea. */
export function isleTop(x: number, z: number) {
  let top: number | null = null;
  for (const { isle, pts } of OUTLINES) if (inside([x, z], pts)) top = Math.max(top ?? -Infinity, isle.top);
  return top;
}
export function groundAt(x: number, z: number) {
  if (insidePlace(wx(x), wz(z))) return H(wx(x), wz(z));
  return Math.max(isleTop(x, z) ?? SEA_BED, ringHeight(x, z));
}

// ---------------------------------------------------------------- islands
/** An island as a prism: a flat walkable top and cliff sides battered out to the sea bed. */
function prism(outline: XZ[], top: number, batter = 0.035) {
  let cx = 0,
    cz = 0;
  for (const [x, z] of outline) {
    cx += x;
    cz += z;
  }
  cx /= outline.length;
  cz /= outline.length;
  const n = outline.length;
  const verts: number[] = [];
  for (const [x, z] of outline) verts.push(x, top, z);
  for (const [x, z] of outline) verts.push(cx + (x - cx) * (1 + batter), SEA_BED, cz + (z - cz) * (1 + batter));
  const tops: number[] = [],
    sides: number[] = [];
  const contour = outline.map(([x, z]) => new THREE.Vector2(x, z));
  for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(contour, [])) {
    const [ax, , az] = [verts[a! * 3]!, 0, verts[a! * 3 + 2]!];
    const ny = (verts[b! * 3 + 2]! - az) * (verts[c! * 3]! - ax) - (verts[b! * 3]! - ax) * (verts[c! * 3 + 2]! - az);
    if (ny >= 0) tops.push(a!, b!, c!);
    else tops.push(a!, c!, b!);
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    // Outward winding: the face's normal points away from the island's middle.
    const ex = outline[j]![0] - outline[i]![0],
      ez = outline[j]![1] - outline[i]![1];
    const mx = (outline[i]![0] + outline[j]![0]) / 2 - cx,
      mz = (outline[i]![1] + outline[j]![1]) / 2 - cz;
    const out = -ez * mx + ex * mz > 0; // the edge normal (-ez, ex) agrees with the outward direction
    if (out) sides.push(i, n + i, j, j, n + i, n + j);
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

function buildIsles() {
  // The White Wall's one module, placed four times: the kit the map's art-surface numbers assume.
  const chalk = prism(smoothRing(blobPts(CHALK_MODULE)), 120);
  for (const { isle, pts } of OUTLINES) {
    if (isle.module) {
      const mesh = new THREE.Mesh(chalk.geo, [WALK, CLIFF]);
      mesh.position.set(wx(isle.blob.c[0]), 0, wz(isle.blob.c[1]));
      mesh.rotation.y = (-(isle.blob.rot ?? 0) * Math.PI) / 180;
      mesh.name = isle.id;
      mesh.receiveShadow = true;
      root.add(mesh);
      mesh.updateMatrixWorld();
      // The module's solid is its own triangles at the islet's pose.
      solid(
        [{ kind: 'trimesh', vertices: chalk.verts, indices: chalk.indices }],
        { x: mesh.position.x, y: 0, z: mesh.position.z },
        mesh.quaternion,
      );
      continue;
    }
    const world = pts.map(([x, z]): XZ => [wx(x), wz(z)]);
    const p = prism(world, isle.top);
    const mesh = new THREE.Mesh(p.geo, [WALK, CLIFF]);
    mesh.name = isle.id;
    mesh.receiveShadow = true;
    root.add(mesh);
    solid([{ kind: 'trimesh', vertices: p.verts, indices: p.indices }]);
  }
  // Ring Island: today's cones stand there already; make them solid so the greybox can be walked from the aperture.
  RING_CONES.forEach(([dx, dz, r, h]) => {
    solid(
      [{ kind: 'cylinder', rTop: 0.5, rBottom: r, h, segments: 7 }],
      { x: wx(FAR.x + dx), y: h / 2 - 4, z: wz(FAR.z + dz) },
      new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, dx),
    );
  });
}

// ---------------------------------------------------------------- boxes
const box = (w: number, h: number, d: number, x: number, y: number, z: number, yaw = 0) => {
  const g = new THREE.BoxGeometry(w, h, d);
  g.rotateY(yaw);
  g.translate(x, y, z);
  return g;
};
/** A merged set of boxes with one material; `solidToo` adds each as a solid box. */
function boxes(
  list: { w: number; h: number; d: number; x: number; y: number; z: number; yaw?: number }[],
  mat: THREE.Material,
  parent: THREE.Object3D = root,
  solidToo = true,
) {
  const mesh = new THREE.Mesh(mergeGeometries(list.map((b) => box(b.w, b.h, b.d, b.x, b.y, b.z, b.yaw ?? 0))), mat);
  parent.add(mesh);
  if (solidToo)
    for (const b of list)
      solid(
        [{ kind: 'box', hx: b.w / 2, hy: b.h / 2, hz: b.d / 2 }],
        { x: b.x, y: b.y, z: b.z },
        new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, b.yaw ?? 0),
      );
  return mesh;
}

// ---------------------------------------------------------------- landmarks and set pieces
const glow = (color: string, intensity: number) =>
  readableGlow(new THREE.MeshStandardNodeMaterial({ color, emissive: color, emissiveIntensity: intensity }));
/** Where named things stand, for labels and views (world metres). */
export const SPOTS: Record<string, THREE.Vector3> = {};

function buildLandmarks() {
  // High Port's harbour crane on the cliff edge above the quay: a 45 m tower and a 60 m jib over the drop.
  {
    const [cx, cz] = GATES.find((g) => g.id === 'crane')!.at;
    const base = 55,
      x = wx(cx),
      z = wz(cz),
      yaw = Math.atan2(940 - cz, -990 - cx); // the jib points at the quay
    const jx = Math.cos(yaw),
      jz = Math.sin(yaw);
    const tower = 45;
    boxes(
      [
        { w: 8, h: 4, d: 8, x, y: base + 2, z },
        { w: 4, h: tower, d: 4, x, y: base + tower / 2, z },
        // jib and counter-jib along the yaw (box local x is the jib's length)
        { w: 62, h: 3, d: 3, x: x + jx * 26, y: base + tower + 1.5, z: z + jz * 26, yaw: -yaw },
        { w: 6, h: 6, d: 6, x: x - jx * 8, y: base + tower - 1, z: z - jz * 8, yaw: -yaw },
        { w: 1, h: 30, d: 1, x: x + jx * 50, y: base + tower - 15, z: z + jz * 50 },
      ],
      LANDMARK,
    );
    SPOTS.crane = new THREE.Vector3(x, base + tower + 4, z);
  }
  // Lantern Notch: a sea arch across the final crossing's line, with the lantern on top.
  {
    const [nx, nz] = [-2620, -1000];
    const along = Math.atan2(-1350 - nz, -2950 - nx); // the final crossing's heading
    const ax = -Math.sin(along),
      az = Math.cos(along); // across the line
    const x = wx(nx),
      z = wz(nz),
      yaw = -Math.atan2(az, ax);
    const span = 34,
      leg = 22,
      h = 58;
    boxes(
      [
        { w: leg, h, d: 26, x: x + ax * (span / 2 + leg / 2), y: h / 2, z: z + az * (span / 2 + leg / 2), yaw },
        { w: leg, h, d: 26, x: x - ax * (span / 2 + leg / 2), y: h / 2, z: z - az * (span / 2 + leg / 2), yaw },
        { w: span + leg * 2, h: 14, d: 26, x, y: h + 7, z, yaw },
      ],
      CLIFF,
    );
    boxes([{ w: 5, h: 8, d: 5, x, y: h + 18, z }], LANDMARK);
    const lantern = new THREE.Mesh(new THREE.IcosahedronGeometry(3.2, 1), glow('#ffcf6a', 2.4));
    lantern.position.set(x, h + 24, z);
    root.add(lantern);
    SPOTS.lantern = lantern.position.clone();
  }
  // The Original Island's lighthouse: "a lighthouse blinking beyond the Wall".
  {
    const [ox, oz] = [-3150, -1700];
    boxes([{ w: 8, h: 40, d: 8, x: wx(ox), y: 28 + 20, z: wz(oz) }], MARKER);
    const lamp = new THREE.Mesh(new THREE.IcosahedronGeometry(4, 1), glow('#fff2c0', 3));
    lamp.position.set(wx(ox), 28 + 44, wz(oz));
    lamp.name = 'lighthouse-lamp';
    root.add(lamp);
    SPOTS.lighthouse = lamp.position.clone();
  }
  // Bell Rock's rock: a stubby pinnacle the bay shortcut aims at.
  boxes([{ w: 22, h: 40, d: 18, x: wx(-1030), y: 14 + 20, z: wz(-470), yaw: 0.4 }], CLIFF);
  // High Gorge: the bridge across the 90 m split at the station, and the waterfall down the west stack's face.
  {
    const x0 = GORGE_X - GORGE_GAP / 2 - 8,
      x1 = GORGE_X + GORGE_GAP / 2 + 8;
    boxes([{ w: x1 - x0, h: 2, d: 10, x: wx((x0 + x1) / 2), y: 85 - 1, z: wz(-1900) }], WALK);
    const fall = new THREE.Mesh(new THREE.BoxGeometry(2, 85, 22), flat('#e4f4ff', 0.3));
    fall.position.set(wx(GORGE_X - GORGE_GAP / 2 + 1), 85 / 2, wz(-1820));
    root.add(fall);
    SPOTS.waterfall = new THREE.Vector3(fall.position.x, 60, fall.position.z);
  }
  // Canopy Town's giant trees: trunks you bump into, crowns you look at.
  {
    const trunks: THREE.BufferGeometry[] = [],
      crowns: THREE.BufferGeometry[] = [];
    for (const t of canopyTrees()) {
      const x = wx(t.x),
        z = wz(t.z),
        trunkR = 2.5 + t.r * 0.08,
        trunkH = 38 + t.r * 0.6;
      trunks.push(new THREE.CylinderGeometry(trunkR * 0.8, trunkR, trunkH, 7).translate(x, 12 + trunkH / 2, z));
      crowns.push(
        new THREE.IcosahedronGeometry(t.r * 0.75, 0).scale(1, 0.7, 1).translate(x, 12 + trunkH + t.r * 0.25, z),
      );
      solid([{ kind: 'cylinder', rTop: trunkR * 0.8, rBottom: trunkR, h: trunkH, segments: 7 }], {
        x,
        y: 12 + trunkH / 2,
        z,
      });
    }
    root.add(new THREE.Mesh(mergeGeometries(trunks), LANDMARK));
    root.add(new THREE.Mesh(mergeGeometries(crowns), BACKDROP));
    SPOTS.crowns = new THREE.Vector3(wx(-2070), 90, wz(-300));
  }
  // The Notch ledge above Canopy's west shore: a block you would hook up onto, then glide from.
  {
    const [lx, lz] = GATES.find((g) => g.id === 'notch-ledge')!.at;
    boxes([{ w: 30, h: 36, d: 24, x: wx(lx), y: 18, z: wz(lz), yaw: 0.7 }], CLIFF);
    SPOTS['notch-ledge'] = new THREE.Vector3(wx(lx), 40, wz(lz));
  }
  // The sunken trestle in the shallows: stumps of an older railway pointing at the Notch.
  {
    const [sx, sz] = SECRETS.find((s) => s.id === 'trestle')!.at;
    const dir = Math.atan2(-1000 - sz, -2600 - sx);
    const posts = [];
    for (let k = 0; k < 7; k++)
      posts.push({ w: 2, h: 5, d: 2, x: wx(sx + Math.cos(dir) * k * 18), y: 0.5, z: wz(sz + Math.sin(dir) * k * 18) });
    boxes(posts, BACKDROP, root, false);
    SPOTS.trestle = new THREE.Vector3(wx(sx), 3, wz(sz));
  }
}

/** The sea cave: the map's point is ~35 m out to sea of today's coast, so march inland to the first real cliff. */
function buildCave() {
  const [gx, gz] = GATES.find((g) => g.id === 'cave')!.at;
  const tx = -100,
    tz = 14; // towards the village
  const len = Math.hypot(tx - gx, tz - gz);
  let x = gx,
    z = gz;
  for (let s = 0; s < len; s += 1) {
    x = gx + ((tx - gx) * s) / len;
    z = gz + ((tz - gz) * s) / len;
    if (groundAt(x, z) > 9) break;
  }
  const yaw = Math.atan2(gx - tx, gz - tz); // facing out to sea
  const ox = Math.sin(yaw),
    oz = Math.cos(yaw);
  // A dark mouth set into the bank, an orange cracked plug in it, and a bright slot of "daylight" over the plug.
  boxes([{ w: 14, h: 12, d: 14, x: wx(x - ox * 3), y: 5, z: wz(z - oz * 3), yaw }], flat('#14161b'), root, false);
  boxes([{ w: 10, h: 9, d: 1.5, x: wx(x + ox * 4), y: 4.5, z: wz(z + oz * 4), yaw }], GATE, root, true);
  const slit = new THREE.Mesh(new THREE.BoxGeometry(6, 1.2, 0.6).rotateY(yaw), glow('#fff6d8', 1.4));
  slit.position.set(wx(x + ox * 4.9), 9.6, wz(z + oz * 4.9));
  root.add(slit);
  SPOTS.cave = new THREE.Vector3(wx(x + ox * 4), 5, wz(z + oz * 4));
  return { x, z };
}

// ---------------------------------------------------------------- lines
export type Built = { line: Line; path: THREE.Vector3[]; stage: number | null; mesh?: THREE.Mesh };
const placeById = Object.fromEntries(PLACES.map((p) => [p.id, p]));
/** A place's deck height (local metres above the sea). */
export function deckOf(id: string, at: XZ): number {
  const p = placeById[id];
  if (p?.deck !== undefined) return p.deck;
  if (id === 'ring') return ringHeight(at[0], at[1]) + 1;
  return Math.max(groundAt(at[0], at[1]), 2.5) + 0.5; // home, the pier, the Works: today's ground
}
/** The line's points in 3D (world), with heights from its ends and any isle top it crosses, linear between. */
export function linePath(line: Line): THREE.Vector3[] {
  if (line.built) {
    // Built today: follow today's ground, sampled, for the fly-along only.
    const out: THREE.Vector3[] = [];
    for (let i = 0; i < line.pts.length - 1; i++) {
      const [ax, az] = line.pts[i]!,
        [bx, bz] = line.pts[i + 1]!;
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 10));
      for (let k = 0; k < n; k++) {
        const x = ax + ((bx - ax) * k) / n,
          z = az + ((bz - az) * k) / n;
        out.push(new THREE.Vector3(wx(x), Math.max(groundAt(x, z), 2.5) + 1, wz(z)));
      }
    }
    const [lx, lz] = line.pts.at(-1)!;
    out.push(new THREE.Vector3(wx(lx), Math.max(groundAt(lx, lz), 2.5) + 1, wz(lz)));
    return out;
  }
  const pts = line.pts;
  const ys: (number | null)[] = pts.map((p, i) =>
    i === 0 ? deckOf(line.from, p) : i === pts.length - 1 ? deckOf(line.to, p) : isleTop(p[0], p[1]),
  );
  const along = [0];
  for (let i = 1; i < pts.length; i++)
    along.push(along[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]));
  return pts.map((p, i) => {
    let y = ys[i];
    if (y === null || y === undefined) {
      let a = i - 1,
        b = i + 1;
      while (ys[a] === null) a--;
      while (ys[b] === null) b++;
      const t = (along[i]! - along[a]!) / (along[b]! - along[a]!);
      y = ys[a]! + (ys[b]! - ys[a]!) * t;
    }
    return new THREE.Vector3(wx(p[0]), y, wz(p[1]));
  });
}

function buildLines(pick: Pick): Built[] {
  const out: Built[] = [];
  const W = 5,
    T = 1.2;
  const pivot = new THREE.Object3D();
  for (const line of LINES) {
    const path = linePath(line);
    const stage = stageOf(line.stage, pick);
    if (line.built) {
      out.push({ line, path, stage });
      continue;
    }
    const parts: THREE.BufferGeometry[] = [];
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
      // Trestle blocks every 30 m down to whatever is under the deck.
      const n = Math.floor(len / 30);
      for (let k = 1; k <= n; k++) {
        const t = k / (n + 1);
        const x = a.x + (b.x - a.x) * t,
          z = a.z + (b.z - a.z) * t,
          y = a.y + (b.y - a.y) * t - T;
        const under = groundAt(x - ORIGIN.x, z - ORIGIN.z);
        if (y - under < 2) continue;
        parts.push(box(1.6, y - under, 1.6, x, (y + under) / 2, z));
      }
    }
    const mesh = new THREE.Mesh(
      mergeGeometries(parts),
      flat(stage === null ? UNBUILT : (STAGE_COLOURS[stage] ?? UNBUILT), 0.7),
    );
    mesh.name = `line-${line.id}`;
    root.add(mesh);
    out.push({ line, path, stage, mesh });
  }
  return out;
}

/** Station markers: a white pole and a pad at each place, shown with the labels. */
function buildStations() {
  for (const p of PLACES) {
    if (p.id === 'home') continue; // the town is there already
    const y = deckOf(p.id, p.at);
    const x = wx(p.at[0]),
      z = wz(p.at[1]);
    boxes([{ w: 16, h: 1, d: 16, x, y: y - 0.5, z }], MARKER, root, true);
    boxes([{ w: 1.4, h: 30, d: 1.4, x, y: y + 15, z }], MARKER, markers, false);
    SPOTS[p.id] = new THREE.Vector3(x, y, z);
  }
  SPOTS.home = new THREE.Vector3(wx(-100), 18, wz(14));
  for (const g of GATES) {
    if (g.id === 'cave' || g.id === 'crane') continue;
    const x = wx(g.at[0]),
      z = wz(g.at[1]);
    const y = groundAt(g.at[0], g.at[1]);
    boxes([{ w: 2, h: 140 - y, d: 2, x, y: (140 + y) / 2, z }], GATE, markers, false);
    SPOTS[g.id] ??= new THREE.Vector3(x, 120, z);
  }
}

export function buildGreybox(pick: Pick) {
  buildIsles();
  buildLandmarks();
  const cave = buildCave();
  buildStations();
  const lines = buildLines(pick);
  scene.add(root);
  return { lines, cave };
}
