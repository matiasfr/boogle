// Dashed gold ghosts: "a part goes here" (docs/brainstorms/works-signposting.md). Thin dashes along a box's twelve
// edges in the great beam's GOLD_ROPE, no glow and no pulse. Every outline a view draws is one instanced draw, rebuilt
// only when the caller's state changes. Local presentation only: the Works kiln's missing load, and the boiler plan's
// saddle echo (docs/plans/boiler-first-choice.md, step 6).
import * as THREE from 'three/webgpu';
import type { OwnedView } from './owned-view.ts';
import { GOLD_ROPE } from './gold-rope.ts';

let shared: THREE.MeshStandardNodeMaterial | null = null;
/** One lit gold for every ghost, like the rope's own material. Shared: never mutate or dispose it. */
const ghostMaterial = () =>
  (shared ??= new THREE.MeshStandardNodeMaterial({ color: GOLD_ROPE, roughness: 0.7, flatShading: true }));

/** Up to `max` dashes, in metres: `dash` long, `gap` apart, `thick` across. */
export function createGhostOutlines(owner: OwnedView, max: number, dash = 0.14, gap = 0.09, thick = 0.035) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.InstancedMesh(geometry, ghostMaterial(), max);
  geometry.dispose();
  mesh.castShadow = false;
  mesh.count = 0;
  owner.add(mesh);
  const frame = new THREE.Matrix4(),
    local = new THREE.Matrix4(),
    out = new THREE.Matrix4(),
    p = new THREE.Vector3(),
    q = new THREE.Quaternion(),
    s = new THREE.Vector3(),
    up = new THREE.Vector3(0, 1, 0);
  let n = 0;
  const ghosts = {
    mesh,
    begin() {
      n = 0;
    },
    /** The outline of a w × h × d box centred at the origin of `at` (a world pose without scale). */
    outline(at: THREE.Matrix4, w: number, h: number, d: number) {
      const size = [w, h, d] as const;
      for (let axis = 0; axis < 3; axis++) {
        const length = size[axis]!,
          count = Math.max(1, Math.round((length + gap) / (dash + gap))),
          piece = Math.max(thick, (length - gap * (count - 1)) / count);
        const a = (axis + 1) % 3,
          b = (axis + 2) % 3;
        for (const sa of [-0.5, 0.5])
          for (const sb of [-0.5, 0.5])
            for (let i = 0; i < count && n < max; i++) {
              const c = [0, 0, 0];
              c[axis] = -length / 2 + piece / 2 + i * (piece + gap);
              c[a] = sa * size[a]!;
              c[b] = sb * size[b]!;
              const k = [thick, thick, thick];
              k[axis] = piece;
              local.compose(p.set(c[0]!, c[1]!, c[2]!), q.identity(), s.set(k[0]!, k[1]!, k[2]!));
              mesh.setMatrixAt(n++, out.multiplyMatrices(at, local));
            }
      }
    },
    /** The outline of a w × h × d box at (x, y, z), turned `yaw`. */
    box(x: number, y: number, z: number, w: number, h: number, d: number, yaw = 0) {
      ghosts.outline(frame.compose(p.set(x, y, z), q.setFromAxisAngle(up, yaw), s.set(1, 1, 1)), w, h, d);
    },
    commit() {
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      if (n) mesh.computeBoundingSphere();
      mesh.visible = n > 0;
    },
    get count() {
      return n;
    },
  };
  return ghosts;
}
export type GhostOutlines = ReturnType<typeof createGhostOutlines>;
