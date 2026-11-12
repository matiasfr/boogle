// Local tree geometry, fall poses and colliders for the railway entity.
// No material account, save, co-op or progression owner lives here.
import * as THREE from 'three/webgpu';
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
  const parts = {
    trunk: new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.46, 5, 6), tree('#7a5430', 'timber'), n),
    crown: new THREE.InstancedMesh(new THREE.ConeGeometry(2.6, 6.5, 6), tree('#3f8a3a', 'green'), n),
    crown2: new THREE.InstancedMesh(new THREE.ConeGeometry(1.9, 4.6, 6), tree('#4f9c44', 'green'), n),
    stump: new THREE.InstancedMesh(new THREE.CylinderGeometry(0.44, 0.5, 0.6, 6), tree('#ffffff', 'timber'), n),
    notch: new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.16, 0.16), flat('#39291e'), n),
    hardwood: new THREE.InstancedMesh(hardwoodGeo, flat('#686359'), hardwoodCount),
    forks: new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.42, 3.5, 8), flat('#686359'), hardwoodCount * 2),
    broad: new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), tree('#657a37', 'green'), hardwoodCount * 3),
    branch: new THREE.InstancedMesh(new THREE.CylinderGeometry(0.17, 0.21, 1.5, 8), flat('#686359'), hardwoodCount),
    cutEnd: new THREE.InstancedMesh(new THREE.CircleGeometry(0.17, 8), flat('#ddc89b'), hardwoodCount),
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
  for (const m of Object.values(parts)) {
    m.castShadow = true;
    m.frustumCulled = false;
    root.add(m);
  }
  const base = new THREE.Matrix4(),
    turn = new THREE.Matrix4(),
    local = new THREE.Matrix4(),
    out4 = new THREE.Matrix4(),
    e = new THREE.Euler(),
    sv = new THREE.Vector3();
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  const Q0 = new THREE.Quaternion(),
    S1 = new THREE.Vector3(),
    P1 = new THREE.Vector3(),
    OLD_STUMP = new THREE.Color('#c9a06a'),
    RENEWED_STUMP = new THREE.Color('#dec89f');
  function pose(t: Tree, now: number) {
    if (t.cleared) {
      for (const m of [parts.trunk, parts.crown, parts.crown2, parts.stump, parts.notch]) m.setMatrixAt(t.index, ZERO);
      for (const m of Object.values(parts)) m.instanceMatrix.needsUpdate = true;
      return;
    }
    const hardwoodIndex = hardwoodIndices.get(t.index);
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
    parts.trunk.setMatrixAt(t.index, taken || t.hardwood || compact ? ZERO : at(2.5));
    if (hardwoodIndex !== undefined) parts.hardwood.setMatrixAt(hardwoodIndex, taken || compact ? ZERO : at(2.5));
    // A crown follows the trunk's contact by 80 ms rather than twitching as one rigid stick.
    if (t.fall < 0 && t.shake > 0 && now - t.hitAt < 80) base.makeTranslation(t.x, t.y, t.z);
    parts.crown.setMatrixAt(t.index, bare || t.hardwood ? ZERO : at(7.2));
    parts.crown2.setMatrixAt(t.index, bare || t.hardwood ? ZERO : at(10));
    for (let k = 0; hardwoodIndex !== undefined && k < 2; k++) {
      out4
        .copy(base)
        .multiply(local.makeTranslation((k ? 1 : -1) * 0.7 * t.size, 4.5 * t.size, 0))
        .multiply(turn.makeRotationZ((k ? -1 : 1) * 0.45))
        .scale(sv);
      parts.forks.setMatrixAt(hardwoodIndex * 2 + k, !bare ? out4 : ZERO);
    }
    for (let k = 0; hardwoodIndex !== undefined && k < 3; k++) {
      const dx = (k - 1) * 2.1;
      out4
        .copy(base)
        .multiply(local.makeTranslation(dx * t.size, (k === 1 ? 7.2 : 6.3) * t.size, (k === 1 ? 0.8 : 0) * t.size))
        .scale(S1.set(2.8 * t.size, 2.3 * t.size, 2.6 * t.size));
      parts.broad.setMatrixAt(hardwoodIndex * 3 + k, !bare ? out4 : ZERO);
    }
    // The notch gets wider only with accepted work; refusal leaves one shallow scuff.
    const cut = t.work / (t.great ? greatStrokes : 15);
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
    parts.notch.setMatrixAt(t.index, t.fall >= 0 || (!cut && !t.scuff) ? ZERO : local);
    parts.stump.setMatrixAt(
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
      parts.branch.setMatrixAt(hardwoodIndex, local);
      local.compose(
        P1.set(branchX + Math.sin(0.6) * 0.755, H(branchX, branchZ) + 0.22, branchZ + Math.cos(0.6) * 0.755),
        Q0.setFromAxisAngle(AXIS_Y, 0.6),
        S1.setScalar(1),
      );
      parts.cutEnd.setMatrixAt(hardwoodIndex, local);
    }
    for (const m of Object.values(parts)) m.instanceMatrix.needsUpdate = true;
  }

  return {
    pose,
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
