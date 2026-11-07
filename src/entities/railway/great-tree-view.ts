// The great tree's own dress (the great beam pass, C2): buttress roots so it reads as more than a big conifer, and the
// gold rope sling it wears from the moment Station 3 opens, the same rope as Station 3's empty saddles. Local
// presentation from accepted state; the sling's arrival glints once when it happens live.
import * as THREE from 'three/webgpu';
import type { TreePose } from '../../render/place-tree-view.ts';
import { createRope, GOLD_ROPE } from '../../render/gold-rope.ts';
import { emit } from '../../render/particles.ts';
import { reducedMotion } from '../../constants.ts';

/** The trunk's radius at height h above its base (the shared tree view's tapered cylinder). */
const trunkR = (t: TreePose, h: number) => (0.46 - (0.18 * h) / t.size / 5) * t.size;
const glint = new THREE.Color('#ffd76a');

export function createGreatTreeDress(
  parent: THREE.Object3D,
  tree: TreePose,
  flat: (color: string, roughness?: number) => THREE.Material,
) {
  const geometries: THREE.BufferGeometry[] = [];
  const keep = <T extends THREE.BufferGeometry>(g: T) => {
    geometries.push(g);
    return g;
  };
  const roots = new THREE.Group();
  roots.position.set(tree.x, tree.y, tree.z);
  // Five flared buttresses: a square fin turned on its corner and centred on the trunk's skin, so what shows outside
  // the trunk is a sloping wedge, tall where it meets the bark and running into the ground.
  const fin = 0.62 * tree.size;
  const rootGeo = keep(new THREE.BoxGeometry(0.16 * tree.size, fin, fin));
  const bark = flat('#7f5a36', 0.95);
  for (let k = 0; k < 5; k++) {
    const yaw = (k / 5) * Math.PI * 2 + 0.4;
    const m = new THREE.Mesh(rootGeo, bark);
    const r = trunkR(tree, 0) * 0.95;
    m.position.set(Math.sin(yaw) * r, -0.12, Math.cos(yaw) * r);
    m.rotation.set(0, yaw, 0);
    m.rotateX(Math.PI / 4);
    m.castShadow = true;
    roots.add(m);
  }
  parent.add(roots);

  const sling = new THREE.Group();
  sling.position.set(tree.x, tree.y, tree.z);
  const rope = flat(GOLD_ROPE, 0.7);
  for (const h of [1.5, 1.85]) {
    const band = new THREE.Mesh(keep(new THREE.TorusGeometry(trunkR(tree, h) + 0.04, 0.08, 6, 22)), rope);
    band.rotation.x = Math.PI / 2;
    band.position.y = h;
    band.castShadow = true;
    sling.add(band);
  }
  // The knot and a loose tail on the downhill side, toward Station 3.
  const knotAt = new THREE.Vector3(0, 1.68, trunkR(tree, 1.68) + 0.05);
  const knot = new THREE.Mesh(keep(new THREE.SphereGeometry(0.13, 8, 6)), rope);
  knot.position.copy(knotAt);
  sling.add(knot);
  const tail = createRope(sling, rope, 6, 0.045);
  tail.set(knotAt, new THREE.Vector3(0.25, 0.35, knotAt.z + 0.45), 0.08);
  sling.visible = false;
  parent.add(sling);
  let shown: boolean | null = null;

  return {
    /** wearing: Station 3 is open and the tree still stands. The first call only sets it (no glint on a load). */
    update(wearing: boolean) {
      if (wearing === shown) return;
      if (wearing && shown === false && !reducedMotion)
        for (let k = 0; k < 18; k++) {
          const a = (k / 18) * Math.PI * 2;
          const r = trunkR(tree, 1.7) + 0.1;
          emit({
            x: tree.x + Math.sin(a) * r,
            y: tree.y + 1.5 + (k % 3) * 0.18,
            z: tree.z + Math.cos(a) * r,
            vx: Math.sin(a) * 0.8,
            vy: 0.9,
            vz: Math.cos(a) * 0.8,
            life: 0.9,
            size: 0.12,
            color: glint,
          });
        }
      shown = wearing;
      sling.visible = wearing;
    },
    dispose() {
      tail.dispose();
      roots.removeFromParent();
      sling.removeFromParent();
      for (const g of geometries) g.dispose();
    },
  };
}
