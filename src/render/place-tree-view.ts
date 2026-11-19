// Local tree geometry, fall poses and colliders for the railway entity.
// No material account, save, co-op or progression owner lives here.
import * as THREE from 'three/webgpu';
import { fitInstanceBounds } from './instance-bounds.ts';
import { createTreeRoots, type TreeRoot } from './tree-roots.ts';
import { emit } from './particles.ts';
import { removeBody, teleport, sweepSphere, type Body, type Shape } from '../physics/engine.ts';

export type TreePose = {
  index: number;
  root: TreeRoot;
  x: number;
  y: number;
  z: number;
  size: number;
  great: boolean;
  hardwood: boolean;
  cleared: boolean; // Local shore clearance only; never written to a save, snapshot or harvest result
  work: number;
  issued: number;
  ceiling: number;
  revision: number;
  collapsed: boolean;
  scuff: boolean;
  hitAt: number;
  cutYaw: number;
  strokes: number;
  shake: number; // 1 on a hit, decaying
  fall: number; // s since it was felled, -1 standing
  fallYaw: number;
  growth?: number; // Accepted T1 renewal stage: 1 shoot, 2 sapling, 3 young, 4 mature; absent for legacy trees.
  at: THREE.Vector3;
  body: Body | null; // standing: its trunk; felled: the trunk on the ground
  stump: Body | null;
};

type Tree = TreePose;
type Ground = (x: number, z: number) => number;
type StaticBody = (shape: Shape, position: { x: number; y: number; z: number }, rotation?: THREE.Quaternion) => Body;
export function createTreeSolids(
  TREES: readonly Tree[],
  H: Ground,
  addStatic: StaticBody,
  playerBody: () => Body | null,
  trunkTaken: () => boolean,
  remove: (body: Body) => void = removeBody,
) {
  const AXIS_Y = new THREE.Vector3(0, 1, 0),
    lie = new THREE.Quaternion();
  const standing = (t: Tree) => !t.cleared && t.fall < 0;
  function solidTree(t: Tree) {
    if (t.body) remove(t.body);
    if (t.stump) remove(t.stump);
    t.body = t.stump = null;
    if (t.cleared) return;
    if (t.growth && t.growth < 4) {
      t.stump = addStatic(
        { kind: 'cylinder', rTop: 0.46 * t.size, rBottom: 0.46 * t.size, h: 0.6 + t.y - t.root.bottom, segments: 6 },
        { x: t.x, y: (t.root.bottom + t.y + 0.6) / 2, z: t.z },
      );
      return;
    }
    const h = (t.collapsed ? 0.8 : 5) * t.size;
    if (t.fall < 0) {
      t.body = addStatic(
        {
          kind: 'cylinder',
          rTop: (t.hardwood ? 0.8 : 0.38) * t.size,
          rBottom: (t.hardwood ? 0.8 : 0.38) * t.size,
          h: h + t.y - t.root.bottom,
          segments: 6,
        },
        { x: t.x, y: (t.root.bottom + t.y + h) / 2, z: t.z },
      );
      return;
    }
    t.stump = addStatic(
      { kind: 'cylinder', rTop: 0.46 * t.size, rBottom: 0.46 * t.size, h: 0.6 + t.y - t.root.bottom, segments: 6 },
      { x: t.x, y: (t.root.bottom + t.y + 0.6) / 2, z: t.z },
    );
    // The great tree's trunk goes on your shoulder; it isn't in the way after that.
    if (t.great && trunkTaken()) return;
    // A settled log must never appear around the local player's capsule. Move only the intersecting player,
    // sideways off the new footprint, before adding its static solid; every peer performs this for itself.
    const player = playerBody();
    if (player) {
      const p = player.position,
        dx = p.x - t.x,
        dz = p.z - t.z;
      const along = dx * Math.sin(t.fallYaw) + dz * Math.cos(t.fallYaw);
      const across = dx * Math.cos(t.fallYaw) - dz * Math.sin(t.fallYaw);
      if (along > -0.8 && along < h + 1 && Math.abs(across) < 0.3 * t.size + 0.65 && Math.abs(p.y - t.y) < 2) {
        let clear: { x: number; y: number; z: number } | null = null;
        for (let attempt = 0; attempt < 64 && !clear; attempt++) {
          const angle = t.fallYaw + ((attempt % 16) * Math.PI) / 8,
            radius = 2 + Math.floor(attempt / 16) * 2,
            x = p.x + Math.cos(angle) * radius,
            z = p.z - Math.sin(angle) * radius,
            y = H(x, z);
          if (y < 3 || Math.abs(y - t.y) > 1.2) continue;
          const ax = x - t.x,
            az = z - t.z;
          const on = ax * Math.sin(t.fallYaw) + az * Math.cos(t.fallYaw),
            side = ax * Math.cos(t.fallYaw) - az * Math.sin(t.fallYaw);
          if (on > -1 && on < h + 1 && Math.abs(side) < t.size + 0.8) continue;
          if (TREES.some((other) => standing(other) && Math.hypot(x - other.x, z - other.z) < other.size + 0.8))
            continue;
          if (sweepSphere({ x, y: y + 128, z }, { x, y: y + 1.1, z }, 0.6, { mask: 0xffff, thin: 'skip' }) >= 0)
            continue;
          clear = { x, y: y + 1.1, z };
        }
        // If every side is occupied, stand above the low log, never inside it; walking/jumping remains available.
        teleport(player, clear?.x ?? p.x, clear?.y ?? Math.max(p.y, t.y + 2.5), clear?.z ?? p.z);
        player.velocity.set(0, 0, 0);
      }
    }
    if (t.collapsed) return; // the compact fall leaves exactly the visible, low stump
    lie.setFromAxisAngle(AXIS_Y, t.fallYaw);
    t.body = addStatic(
      { kind: 'box', hx: 0.3 * t.size, hy: 0.3 * t.size, hz: h / 2 },
      {
        x: t.x + Math.sin(t.fallYaw) * (h / 2 + 0.2),
        y: H(t.x + Math.sin(t.fallYaw) * h * 0.5, t.z + Math.cos(t.fallYaw) * h * 0.5) + 0.3 * t.size,
        z: t.z + Math.cos(t.fallYaw) * (h / 2 + 0.2),
      },
      lie,
    );
  }

  return solidTree;
}
export function createTreeView(
  TREES: readonly Tree[],
  root: THREE.Object3D,
  H: Ground,
  materials: {
    flat: (color: string, roughness?: number) => THREE.Material;
    tree: (color: string, family: 'green' | 'timber') => THREE.Material;
  },
  trunkTaken: () => boolean,
  greatStrokes: number,
) {
  const { flat, tree } = materials;
  const AXIS_Y = new THREE.Vector3(0, 1, 0);
  // The chop's notch (G20): a V cut into the trunk at chopping height on the stroke's side, pale fresh wood inside,
  // deepening hit by hit past the axis to a thin hinge at the felling one. One trunk geometry carries it as a morph
  // target, set per tree: 0 is the whole trunk, 1 the felling cut. All in the trunk geometry's own space (a 6-sided
  // frustum, 0.46 m at the base, 0.28 m at the top, 5 m tall, centred, a corner facing +z), so it meets the whole trunk.
  const TRUNK_BASE = 0.46,
    TRUNK_TOP = 0.28,
    TRUNK_H = 5;
  const NOTCH_LOW = 0.84,
    NOTCH_MID = 1.12, // metres above the foot; chips fly at 1.1
    NOTCH_HIGH = 1.4;
  const trunkRadius = (h: number) => TRUNK_BASE + ((TRUNK_TOP - TRUNK_BASE) * h) / TRUNK_H;
  // The felling cut's inner edge, 30% of the radius past the axis: from the side the hinge left is a sliver.
  const APEX_DEEP = -0.3 * trunkRadius(NOTCH_MID);
  const LITTER = 6; // chips at the foot of a felling cut
  // A first hit already shows a small notch (about 8 cm deep); the last one is the whole cut.
  const notchAt = (cut: number) => Math.min(1, 0.08 + 0.92 * Math.max(0, cut));

  /**
   * The trunk with its chopping band built from four of its six faces (θ -120°..120°, the cut side) as a 5×5 grid of
   * rows (band bottom, lower lip, apex, upper lip, band top) and columns (the corners). Whole, the lips and apex sit together on
   * the bark; cut, the lips open to the band's edges and the apex row is pushed back to APEX_DEEP, so the two front
   * faces' middle strips become the notch's two faces. Those strips draw in the second material (fresh wood).
   */
  function notchedTrunkGeometry() {
    const section = (from: number, to: number) =>
      new THREE.CylinderGeometry(trunkRadius(to), trunkRadius(from), to - from, 6).translate(
        0,
        (from + to) / 2 - TRUNK_H / 2,
        0,
      );
    // The back two faces of the band stay bark and never move.
    const back = new THREE.CylinderGeometry(
      trunkRadius(NOTCH_HIGH),
      trunkRadius(NOTCH_LOW),
      NOTCH_HIGH - NOTCH_LOW,
      2,
      1,
      true,
      (Math.PI * 2) / 3,
      (Math.PI * 2) / 3,
    ).translate(0, (NOTCH_LOW + NOTCH_HIGH) / 2 - TRUNK_H / 2, 0);
    const whole = [NOTCH_LOW, NOTCH_MID, NOTCH_MID, NOTCH_MID, NOTCH_HIGH];
    const cutRows = [NOTCH_LOW, NOTCH_LOW, NOTCH_MID, NOTCH_HIGH, NOTCH_HIGH];
    const corner = (h: number, column: number, apex: number | null, out: THREE.Vector3) => {
      const theta = ((column - 2) * Math.PI) / 3,
        r = trunkRadius(h);
      const z = r * Math.cos(theta);
      return out.set(r * Math.sin(theta), h - TRUNK_H / 2, apex === null ? z : Math.min(z, apex));
    };
    const at = (rows: number[], apex: number, row: number, column: number, out: THREE.Vector3) =>
      corner(rows[row]!, column, row === 2 ? apex : null, out);
    const a = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()],
      b = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()],
      e1 = new THREE.Vector3(),
      e2 = new THREE.Vector3(),
      centre = new THREE.Vector3();
    // Each triangle as [row, column] corners, wound to face away from the axis in whichever state it has area.
    const facesOf = (wood: boolean) => {
      const tris: [number, number][][] = [];
      for (let row = 0; row < 4; row++)
        for (let column = 0; column < 4; column++) {
          if (((row === 1 || row === 2) && (column === 1 || column === 2)) !== wood) continue;
          const q: [number, number][] = [
            [row, column],
            [row, column + 1],
            [row + 1, column + 1],
            [row + 1, column],
          ];
          for (const tri of [
            [q[0]!, q[1]!, q[2]!],
            [q[0]!, q[2]!, q[3]!],
          ]) {
            tri.forEach(([r, c], k) => at(whole, Infinity, r, c, a[k]!));
            tri.forEach(([r, c], k) => at(cutRows, APEX_DEEP, r, c, b[k]!));
            const area = (p: THREE.Vector3[]) => e1.subVectors(p[1]!, p[0]!).cross(e2.subVectors(p[2]!, p[0]!));
            const na = area(a).clone(),
              nb = area(b);
            const [n, p] = na.lengthSq() > nb.lengthSq() ? [na, a] : [nb, b];
            centre.copy(p[0]!).add(p[1]!).add(p[2]!);
            centre.y = 0;
            tris.push(n.dot(centre) < 0 ? [tri[0]!, tri[2]!, tri[1]!] : tri);
          }
        }
      return tris;
    };
    // Grid triangles unrolled into their own vertices, with the cut state's offsets as the morph target.
    const grid = (wood: boolean) => {
      const tris = facesOf(wood),
        position: number[] = [],
        delta: number[] = [],
        normal: number[] = [];
      for (const tri of tris)
        for (const [r, c] of tri) {
          at(whole, Infinity, r, c, a[0]!);
          at(cutRows, APEX_DEEP, r, c, b[0]!);
          position.push(a[0]!.x, a[0]!.y, a[0]!.z);
          delta.push(b[0]!.x - a[0]!.x, b[0]!.y - a[0]!.y, b[0]!.z - a[0]!.z);
          e1.set(a[0]!.x, 0, a[0]!.z).normalize();
          normal.push(e1.x, e1.y, e1.z);
        }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((position.length / 3) * 2).fill(0), 2));
      geometry.setIndex(Array.from({ length: position.length / 3 }, (_, k) => k));
      return { geometry, delta };
    };
    const barkGrid = grid(false),
      woodGrid = grid(true);
    const parts = [section(0, NOTCH_LOW), back, barkGrid.geometry, section(NOTCH_HIGH, TRUNK_H), woodGrid.geometry];
    // Merged by hand: every part is indexed with position, normal and uv; only the grids move.
    const merged = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv'] as const) {
      const size = parts[0]!.getAttribute(name).itemSize;
      merged.setAttribute(
        name,
        new THREE.Float32BufferAttribute(
          parts.flatMap((part) => [...(part.getAttribute(name).array as Float32Array)]),
          size,
        ),
      );
    }
    const morph = parts.flatMap((part) =>
      part === barkGrid.geometry
        ? barkGrid.delta
        : part === woodGrid.geometry
          ? woodGrid.delta
          : new Array<number>(part.getAttribute('position').count * 3).fill(0),
    );
    merged.morphAttributes.position = [new THREE.Float32BufferAttribute(morph, 3)];
    merged.morphTargetsRelative = true;
    const indices: number[] = [];
    let offset = 0;
    for (const part of parts) {
      if (part === woodGrid.geometry) merged.addGroup(0, indices.length, 0); // bark, then the fresh wood
      const index = part.getIndex()!;
      for (let k = 0; k < index.count; k++) indices.push(index.getX(k) + offset);
      offset += part.getAttribute('position').count;
      part.dispose();
    }
    merged.addGroup(merged.groups[0]!.count, indices.length - merged.groups[0]!.count, 1);
    merged.setIndex(indices);
    return merged;
  }
  const n = TREES.length;
  const hardwoodIndices = new Map(TREES.filter((t) => t.hardwood).map((t, k) => [t.index, k]));
  const hardwoodCount = hardwoodIndices.size;
  // Alternating radial ridges give hardwood actual bark relief and a flared root base, even in grayscale.
  const hardwoodGeo = new THREE.CylinderGeometry(0.52, 0.95, 5, 12, 1);
  const barkVertices = hardwoodGeo.getAttribute('position');
  for (let k = 0; k < barkVertices.count; k++) {
    const x = barkVertices.getX(k),
      z = barkVertices.getZ(k);
    const ridge = 1 + 0.13 * Math.cos(Math.atan2(z, x) * 6);
    barkVertices.setXYZ(k, x * ridge, barkVertices.getY(k), z * ridge);
  }
  hardwoodGeo.computeVertexNormals();
  const trunkMaterial = tree('#7a5430', 'timber');
  const parts = {
    trunk: new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.46, 5, 6), trunkMaterial, n),
    crown: new THREE.InstancedMesh(new THREE.ConeGeometry(2.6, 6.5, 6), tree('#3f8a3a', 'green'), n),
    crown2: new THREE.InstancedMesh(new THREE.ConeGeometry(1.9, 4.6, 6), tree('#4f9c44', 'green'), n),
    stump: new THREE.InstancedMesh(new THREE.CylinderGeometry(0.44, 0.5, 0.6, 6), tree('#ffffff', 'timber'), n),
    notch: new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.16, 0.16), flat('#39291e'), n),
    // A tree being chopped draws this trunk instead of the whole one: bark, and fresh wood in the notch.
    // At least two slots: three.js reads a per-instance morph only from an instanced mesh of more than one.
    bitten: new THREE.InstancedMesh(notchedTrunkGeometry(), [trunkMaterial, flat('#ead3a0')], Math.max(2, n)),
    hardwood: new THREE.InstancedMesh(hardwoodGeo, flat('#686359'), hardwoodCount),
    forks: new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.42, 3.5, 8), flat('#686359'), hardwoodCount * 2),
    broad: new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), tree('#657a37', 'green'), hardwoodCount * 3),
    branch: new THREE.InstancedMesh(new THREE.CylinderGeometry(0.17, 0.21, 1.5, 8), flat('#686359'), hardwoodCount),
    cutEnd: new THREE.InstancedMesh(new THREE.CircleGeometry(0.17, 8), flat('#ddc89b'), hardwoodCount),
    // Chips lying round the foot of a tree being chopped, more as the notch deepens: fresh wood like its faces.
    litter: new THREE.InstancedMesh(new THREE.BoxGeometry(0.17, 0.035, 0.08), flat('#ead3a0'), n * LITTER),
  };
  const roots = [
    createTreeRoots(
      TREES.filter((t) => !t.hardwood),
      parts.trunk.material,
    ),
    createTreeRoots(
      TREES.filter((t) => t.hardwood),
      parts.hardwood.material,
    ),
  ];
  root.add(...roots);
  const batches = Object.values(parts);
  for (const m of batches) {
    m.castShadow = true;
    root.add(m);
  }
  const base = new THREE.Matrix4(),
    turn = new THREE.Matrix4(),
    local = new THREE.Matrix4(),
    out4 = new THREE.Matrix4(),
    e = new THREE.Euler(),
    sv = new THREE.Vector3(),
    spin = new THREE.Matrix4();
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  const Q0 = new THREE.Quaternion(),
    S1 = new THREE.Vector3(),
    P1 = new THREE.Vector3(),
    OLD_STUMP = new THREE.Color('#c9a06a'),
    RENEWED_STUMP = new THREE.Color('#dec89f');
  const slotSphere = new THREE.Sphere();
  // Each bitten tree's notch depth, as a per-instance morph influence (relative targets, so no base weight).
  const notchDepth = new THREE.Mesh();
  notchDepth.morphTargetInfluences = [0];
  parts.bitten.setMorphAt(0, notchDepth);
  for (let slot = n; slot < parts.bitten.count; slot++) parts.bitten.setMatrixAt(slot, ZERO);
  const chipAt = new THREE.Matrix4(),
    chipTurn = new THREE.Quaternion(),
    chipPlace = new THREE.Vector3(),
    chipSize = new THREE.Vector3();
  // A fixed scatter per tree and chip (view only): the same tree always drops its chips in the same places.
  const scatter = (tree: number, chip: number, salt: number) => {
    const v = Math.sin(tree * 12.9898 + chip * 78.233 + salt * 37.719) * 43758.5453;
    return v - Math.floor(v);
  };
  let fitted = false;
  function write(mesh: (typeof batches)[number], slot: number, matrix: THREE.Matrix4, grow: boolean) {
    mesh.setMatrixAt(slot, matrix);
    if (!grow) return;
    mesh.instanceMatrix.needsUpdate = true;
    // A pose can only show a batch here, never hide one: emptying a batch waits for the next full refit.
    if (matrix === ZERO) return;
    mesh.visible = true;
    slotSphere.copy(mesh.geometry.boundingSphere!).applyMatrix4(matrix);
    slotSphere.radius += 0.5;
    if (Number.isFinite(slotSphere.radius) && Number.isFinite(slotSphere.center.lengthSq()))
      mesh.boundingSphere!.union(slotSphere);
  }
  function writePose(t: Tree, now: number, grow: boolean) {
    const put = (mesh: (typeof batches)[number], slot: number, matrix: THREE.Matrix4) =>
      write(mesh, slot, matrix, grow);
    const hardwoodIndex = hardwoodIndices.get(t.index);
    if (t.cleared) {
      for (const mesh of [parts.trunk, parts.crown, parts.crown2, parts.stump, parts.notch, parts.bitten])
        put(mesh, t.index, ZERO);
      for (let k = 0; k < LITTER; k++) put(parts.litter, t.index * LITTER + k, ZERO);
      if (hardwoodIndex !== undefined) {
        for (const mesh of [parts.hardwood, parts.branch, parts.cutEnd]) put(mesh, hardwoodIndex, ZERO);
        for (let slot = 0; slot < 2; slot++) put(parts.forks, hardwoodIndex * 2 + slot, ZERO);
        for (let slot = 0; slot < 3; slot++) put(parts.broad, hardwoodIndex * 3 + slot, ZERO);
      }
      return;
    }
    const growth = t.growth ?? 0;
    const size = t.size * (growth === 1 ? 0.07 : growth === 2 ? 0.18 : growth === 3 ? 0.42 : 1);
    const fallen = t.fall >= 0 && growth === 0;
    let a = 0,
      b = 0;
    if (fallen) {
      const u = Math.min(1, t.fall / 0.75);
      a = t.collapsed ? 0 : (u * u * Math.PI) / 2 - 0.04 * u;
    } else if (t.shake > 0) {
      const age = Math.max(0, now - t.hitAt);
      a = Math.sin(age * 0.028) * t.shake * 0.052;
      b = Math.sin(age * 0.022) * t.shake * 0.018;
    }
    const drop = t.collapsed && fallen ? Math.min(1, t.fall / 0.75) ** 2 * 12 * size : 0;
    base.makeTranslation(t.x, t.y - drop, t.z);
    turn.makeRotationY(t.fallYaw).multiply(local.makeRotationFromEuler(e.set(a, 0, b)));
    base.multiply(turn);
    sv.setScalar(size);
    const at = (y: number) =>
      out4
        .copy(base)
        .multiply(local.makeTranslation(0, y * size, 0))
        .scale(sv);
    const taken = t.great && trunkTaken();
    const bare = fallen && t.fall >= 0.75;
    const compact = bare && t.collapsed;
    // The notch gets deeper only with accepted work; refusal leaves one shallow scuff. An ordinary trunk being chopped
    // is drawn notched (G20), turned so its notch faces the last stroke, and keeps the notch as it falls and lies.
    const cut = t.work / (t.great ? greatStrokes : 15);
    const bite = cut > 0 && !t.hardwood && !t.great && (growth === 0 || growth === 4);
    put(parts.trunk, t.index, taken || t.hardwood || compact || bite ? ZERO : at(2.5));
    const spun = !bite || compact ? null : at(2.5).multiply(spin.makeRotationY(t.cutYaw - t.fallYaw));
    put(parts.bitten, t.index, spun ?? ZERO);
    if (spun) {
      notchDepth.morphTargetInfluences![0] = notchAt(cut);
      parts.bitten.setMorphAt(t.index, notchDepth);
      parts.bitten.morphTexture!.needsUpdate = true;
    }
    const chips = bite ? Math.ceil(notchAt(cut) * LITTER) : 0;
    for (let k = 0; k < LITTER; k++) {
      if (k >= chips) {
        put(parts.litter, t.index * LITTER + k, ZERO);
        continue;
      }
      const angle = scatter(t.index, k, 1) * Math.PI * 2,
        reach = (0.6 + 0.7 * scatter(t.index, k, 2)) * t.size;
      const x = t.x + Math.sin(angle) * reach,
        z = t.z + Math.cos(angle) * reach;
      chipTurn.setFromEuler(e.set(0.25 * (scatter(t.index, k, 3) - 0.5), scatter(t.index, k, 4) * Math.PI * 2, 0));
      const s = 0.7 + 0.6 * scatter(t.index, k, 5);
      chipAt.compose(chipPlace.set(x, H(x, z) + 0.02, z), chipTurn, chipSize.set(s, 1, s));
      put(parts.litter, t.index * LITTER + k, chipAt);
    }
    if (hardwoodIndex !== undefined) put(parts.hardwood, hardwoodIndex, taken || compact ? ZERO : at(2.5));
    // A crown follows the trunk's contact by 80 ms rather than twitching as one rigid stick.
    if (t.fall < 0 && t.shake > 0 && now - t.hitAt < 80) base.makeTranslation(t.x, t.y, t.z);
    put(parts.crown, t.index, bare || t.hardwood ? ZERO : at(7.2));
    put(parts.crown2, t.index, bare || t.hardwood ? ZERO : at(10));
    for (let k = 0; hardwoodIndex !== undefined && k < 2; k++) {
      out4
        .copy(base)
        .multiply(local.makeTranslation((k ? 1 : -1) * 0.7 * t.size, 4.5 * t.size, 0))
        .multiply(turn.makeRotationZ((k ? -1 : 1) * 0.45))
        .scale(sv);
      put(parts.forks, hardwoodIndex * 2 + k, !bare ? out4 : ZERO);
    }
    for (let k = 0; hardwoodIndex !== undefined && k < 3; k++) {
      const dx = (k - 1) * 2.1;
      out4
        .copy(base)
        .multiply(local.makeTranslation(dx * t.size, (k === 1 ? 7.2 : 6.3) * t.size, (k === 1 ? 0.8 : 0) * t.size))
        .scale(S1.set(2.8 * t.size, 2.3 * t.size, 2.6 * t.size));
      put(parts.broad, hardwoodIndex * 3 + k, !bare ? out4 : ZERO);
    }
    const cutYaw = t.cutYaw;
    local.compose(
      P1.set(
        t.x + Math.sin(cutYaw) * (t.hardwood ? 0.7 : 0.4) * t.size,
        t.y + 1.1,
        t.z + Math.cos(cutYaw) * (t.hardwood ? 0.7 : 0.4) * t.size,
      ),
      Q0.setFromAxisAngle(AXIS_Y, cutYaw),
      S1.set(t.size * (t.scuff && !cut ? 0.35 : 0.5 + cut), t.scuff && !cut ? 0.2 : 0.5 + cut, 1),
    );
    put(parts.notch, t.index, t.fall >= 0 || bite || (!cut && !t.scuff) ? ZERO : local);
    put(
      parts.stump,
      t.index,
      t.fall >= 0 || growth > 0
        ? local.compose(
            P1.set(t.x, t.y + 0.3, t.z),
            Q0.identity(),
            S1.set(t.size * (t.hardwood ? 1.8 : growth ? 1.35 : 1), 1, t.size * (t.hardwood ? 1.8 : growth ? 1.35 : 1)),
          )
        : ZERO,
    );
    parts.stump.setColorAt(t.index, t.growth === undefined ? OLD_STUMP : RENEWED_STUMP);
    parts.stump.instanceColor!.needsUpdate = true;
    // A naturally fallen branch with a pale end shows what this dense wood is good for before the axe upgrade.
    if (hardwoodIndex !== undefined) {
      const branchX = t.x + 1.5 * t.size,
        branchZ = t.z + 1.1 * t.size;
      local.compose(
        P1.set(branchX, H(branchX, branchZ) + 0.22, branchZ),
        Q0.setFromEuler(e.set(Math.PI / 2, 0, -0.6)),
        S1.setScalar(1),
      );
      put(parts.branch, hardwoodIndex, local);
      local.compose(
        P1.set(branchX + Math.sin(0.6) * 0.755, H(branchX, branchZ) + 0.22, branchZ + Math.cos(0.6) * 0.755),
        Q0.setFromAxisAngle(AXIS_Y, 0.6),
        S1.setScalar(1),
      );
      put(parts.cutEnd, hardwoodIndex, local);
    }
  }
  function upload() {
    fitted = true;
    for (const mesh of batches) {
      mesh.instanceMatrix.needsUpdate = true;
      fitInstanceBounds(mesh);
      // The forest is never frustum culled (owner playtest, 18 November: felling one tree near the quarry hid every
      // other tree once the fitted bounds of world-streaming step 1 culled these batches). The fitted sphere still
      // serves raycasts, and an empty batch still skips its draw.
      mesh.frustumCulled = false;
      mesh.visible = !mesh.boundingSphere!.isEmpty();
    }
  }

  return {
    upload,
    pose(t: Tree, now: number, uploadNow = true) {
      const grow = fitted && uploadNow && !t.cleared;
      writePose(t, now, grow);
      if (uploadNow && !grow) upload();
    },
    dispose() {
      for (const mesh of roots) {
        mesh.removeFromParent();
        mesh.geometry.dispose();
      }
      // The pigment factory returns owned clones; flat materials remain in their shared cache.
      for (const name of ['trunk', 'crown', 'crown2', 'stump', 'broad'] as const) parts[name].material.dispose();
      for (const mesh of Object.values(parts)) {
        mesh.removeFromParent();
        mesh.geometry.dispose();
        mesh.dispose();
      }
    },
  };
}
/** Unchanged starter/proper axe geometry, shared with the legacy animation. */
const leaf = new THREE.Color('#4f9c44'),
  leaf2 = new THREE.Color('#3f8a3a');
/** The crown comes apart as it lands: what stays is a bare trunk, solid, and you can see how much you've cut. */
export function shedTreeCrown(t: TreePose) {
  for (let k = 0; k < (t.great ? 90 : 36); k++) {
    const along = (t.collapsed ? 0.5 : 5 + Math.random() * 7) * t.size,
      a = Math.random() * Math.PI * 2,
      sp = 1 + Math.random() * 3;
    emit({
      x: t.x + Math.sin(t.fallYaw) * along + Math.cos(a) * Math.random() * 1.8,
      y: t.y + 0.4 + Math.random() * 2,
      z: t.z + Math.cos(t.fallYaw) * along + Math.sin(a) * Math.random() * 1.8,
      vx: Math.cos(a) * sp,
      vy: 1.5 + Math.random() * 3,
      vz: Math.sin(a) * sp,
      life: 0.9 + Math.random() * 0.8,
      size: 0.18 + Math.random() * 0.16,
      color: k % 2 ? leaf : leaf2,
      gravity: 4,
      drag: 1.4,
      shrink: 0.5,
    });
  }
}

export function createAxes(flat: (color: string, roughness?: number) => THREE.Material) {
  function makeAxe(handleLen: number, headW: number, headH: number, col: string, shine: number) {
    const g = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, handleLen, 0.07), flat('#a9794c'));
    handle.position.y = handleLen * 0.44;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, headH, headW), flat(col, shine));
    head.position.set(0, handleLen * 0.86, -headW * 0.41);
    g.add(handle, head);
    g.traverse((o) => void (o.castShadow = true));
    return g;
  }
  // The first one's a poor old thing. The proper one is bigger, brighter and rings.
  const AXES = [makeAxe(0.8, 0.26, 0.17, '#6b6f78', 0.7), makeAxe(1.08, 0.52, 0.34, '#dfe4ec', 0.25)];
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.36, 0.06), flat('#f2b134', 0.4));
  edge.position.set(0, 1.08 * 0.86, -0.52 * 0.76);
  AXES[1]!.add(edge);
  // The multi-axe's pick, on the back of whichever head: it breaks rocks.
  const PICKS = AXES.map((a, k) => {
    const len = k ? 1.08 : 0.8;
    const pick = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, k ? 0.42 : 0.3, 6).rotateX(-Math.PI / 2),
      flat('#8d929c', 0.5),
    );
    pick.position.set(0, len * 0.86, k ? 0.3 : 0.2);
    pick.castShadow = true;
    a.add(pick);
    return pick;
  });

  const root = new THREE.Group();
  root.name = 'wear_axe';
  const blade = new THREE.Object3D();
  blade.name = 'axe-blade-contact';
  const grip = new THREE.Object3D();
  grip.name = 'axe-grip-left';
  grip.position.y = 0.18;
  root.add(...AXES, blade, grip);
  function setTier(proper: boolean, multi: boolean) {
    AXES[0]!.visible = !proper;
    AXES[1]!.visible = proper;
    for (const pick of PICKS) pick.visible = multi;
    // Only sparkle anchors; the existing production meshes and their proportions are unchanged.
    blade.position.set(0, (proper ? 1.08 : 0.8) * 0.86, -(proper ? 0.52 : 0.26) * 0.91);
  }
  setTier(false, false);
  return { root, setTier };
}
