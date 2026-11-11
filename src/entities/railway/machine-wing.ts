// ?layer=wing: the track machine's second hand (docs/brainstorms/track-layers-double.md), view only. A small gantry on a
// post over the up track, tied to the flatbed header's end by a telescoping arm, its truck on the up rails once the gap
// beside the flatbed allows, with its own stack on a platform between the tracks. The model is assets/src/track-wing.py
// (its header names the frames); this file mounts it and poses its moving parts from `wingState`. No colliders.
import * as THREE from 'three/webgpu';
import { dressMachine } from './machine-model.ts';
import { WING, panelMechanism, wingState, type RailBatch } from './machine-panels.ts';

const STAGE = 1.2; // an arm stage's length (track-wing.py ARM_STAGE)

export function buildWing(parent: THREE.Object3D, railBatch: RailBatch) {
  const group = new THREE.Group();
  group.name = 'wing';
  parent.add(group);
  // The model is drawn for the machine's +x side; the mirror groups flip x for the other side.
  const armMirror = new THREE.Group(),
    hinge = new THREE.Group(),
    arm = new THREE.Group();
  armMirror.name = 'wing-arm-mirror';
  hinge.position.set(WING.armBase, WING.armY, 0);
  arm.position.copy(hinge.position);
  armMirror.add(hinge, arm);
  const stages = [0, 1, 2].map(() => new THREE.Group());
  arm.add(...stages);
  const post = new THREE.Group(),
    postMirror = new THREE.Group(),
    truck = new THREE.Group(),
    platform = new THREE.Group(),
    shelf = new THREE.Group();
  post.name = 'wing-post';
  post.position.z = WING.postZ;
  postMirror.add(truck, platform, shelf);
  post.add(postMirror);
  group.add(armMirror, post);
  const mech = panelMechanism(post, railBatch, 0);
  let finish: ReturnType<typeof dressMachine> | undefined;

  return {
    group,
    mech,
    /** Mount the built wing (assets/built/track-wing.glb's scene): the clone is dressed with the machine's materials. */
    install(source: THREE.Object3D) {
      const copy = source.clone(true);
      finish = dressMachine(copy);
      const lay = new Map<string, THREE.Object3D>();
      // The game hands over the glTF scene, the asset stage a holder around it: take the named nodes wherever they are.
      const named: THREE.Object3D[] = [];
      copy.traverse((o) => {
        if (/^(wing|lay)_/.test(o.name)) named.push(o);
      });
      for (const part of named) {
        const n = part.name;
        if (n.startsWith('lay_')) lay.set(n, part);
        else if (n === 'wing_paint_mast') postMirror.add(part);
        else if (n === 'wing_paint_truck' || n === 'wing_iron_truck') truck.add(part);
        else if (n === 'wing_paint_platform') platform.add(part);
        else if (n === 'wing_cream_shelf') shelf.add(part);
        else if (n === 'wing_paint_hinge') hinge.add(part);
        else if (n === 'wing_paint_arm') arm.add(part);
        else if (n.startsWith('wing_cream_arm_')) stages[Number(n.slice(-1))]!.add(part);
        else throw new Error(`Unexpected track-wing node: ${n}`);
      }
      mech.install(lay);
      group.updateWorldMatrix(true, true);
    },
    /** Place the wing for the up track on `side` (+1 the machine's left) with `gap` m between the flatbed's side and
     * the up track at the post's s; returns the truck's lift (0 once set down on the rails). */
    place(side: number, gap: number) {
      const s = wingState(gap),
        stackX = s.stack - s.post;
      armMirror.scale.x = postMirror.scale.x = side;
      post.position.x = side * s.post;
      truck.position.y = s.lift;
      platform.position.x = shelf.position.x = stackX;
      mech.setStackX(side * stackX);
      // The arm runs from the header's end to the post, in plan; each stage slides a third of the way past nested.
      const dx = s.post - WING.armBase,
        reach = Math.hypot(dx, WING.postZ);
      arm.rotation.y = Math.atan2(dx, WING.postZ);
      stages.forEach((stage, i) => (stage.position.z = ((reach - STAGE) * (i + 1)) / 3));
      group.updateWorldMatrix(true, true);
      return s.lift;
    },
    dispose() {
      finish?.dispose();
    },
  };
}
