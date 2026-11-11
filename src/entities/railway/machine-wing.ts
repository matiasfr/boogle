// ?layer=wing greybox: the track machine's second hand, plain boxes, view only (docs/brainstorms/track-layers-double.md,
// "Wing greybox: parts and storyboard"). A small gantry on a post over the up track, tied to the flatbed by an arm, its
// truck on the up rails once the gap beside the flatbed allows, with its own stack between the tracks. Cream moving
// parts, orange frame; no colliders, no GLB.
import * as THREE from 'three/webgpu';
import { merged } from '../../render/part-geometry.ts';
import { WING, WING_BEAM_LENGTH, panelMechanism, wingState, type RailBatch } from './machine-panels.ts';

const CREAM = '#ecdcb6',
  ORANGE = '#f0752c',
  DARK = '#3a3d44';
const STACK_Y = 2.86;

export function buildWing(parent: THREE.Object3D, railBatch: RailBatch) {
  const group = new THREE.Group();
  group.name = 'wing';
  parent.add(group);
  const material = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.7 });
  const block = (name: string, color: string, w: number, h: number, d: number, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(merged([['b', x, y, z, w, h, d, color]]), material);
    mesh.name = name;
    mesh.castShadow = true;
    return mesh;
  };
  // Frame: arm off the flatbed's side rail, post at its tip, truck at the post's foot, platform for the stack.
  const arm = block('wing-arm', ORANGE, 1, 0.18, 0.3);
  arm.position.set(0, WING.armY, WING.postZ);
  group.add(arm);
  const post = new THREE.Group();
  post.name = 'wing-post';
  post.position.z = WING.postZ;
  group.add(post);
  post.add(block('wing-post-mast', ORANGE, 0.3, 2.7, 0.3, 0, 2.65, 0));
  const truck = new THREE.Group();
  truck.name = 'wing-truck';
  truck.add(
    block('wing-truck-stem', ORANGE, 0.24, 1.3, 0.24, 0, 0.65, 0),
    block('wing-truck-frame', ORANGE, 1.4, 0.14, 0.7, 0, 0.3, 0),
    new THREE.Mesh(
      merged([
        ['c', -0.5, 0.18, 0, 0.36, 0.1, 0.36, DARK, 0, Math.PI / 2],
        ['c', 0.5, 0.18, 0, 0.36, 0.1, 0.36, DARK, 0, Math.PI / 2],
      ]),
      material,
    ),
  );
  post.add(truck);
  const platform = block('wing-stack-platform', ORANGE, 1, 0.08, 3.2, 0, STACK_Y - 0.08, 1.5);
  post.add(platform);

  const mech = panelMechanism(post, railBatch, 0);
  // Greybox parts in place of the GLB's: the shorter beam, the trolley, three hoist sleeves and two jaws, all cream.
  const cream = (w: number, h: number, d: number, y: number, z: number) =>
    new THREE.Mesh(merged([['b', 0, y, z, w, h, d, CREAM]]), material);
  const jaw = (side: number) => {
    const parts: Parameters<typeof merged>[0] = [['b', side * 0.58, 0, 0, 0.13, 0.12, 2.25, CREAM]];
    for (const z of [-1, 1]) {
      parts.push(
        ['b', side * 0.58, -0.12, z, 0.12, 0.32, 0.22, CREAM],
        ['b', side * 0.51, -0.25, z, 0.22, 0.08, 0.22, CREAM],
      );
    }
    return new THREE.Mesh(merged(parts), material);
  };
  mech.install(
    new Map<string, THREE.Object3D>([
      ['lay_gantry_beam', cream(0.26, 0.24, WING_BEAM_LENGTH, 0, WING_BEAM_LENGTH / 2)],
      ['lay_paint_trolley', cream(0.65, 0.35, 0.7, 0, 0)],
      ['lay_cream_upper', cream(0.32, 1.45, 0.32, 0.725, 0)],
      ['lay_cream_jaw_left', jaw(-1)],
    ]),
  );
  // install() reads the right jaw as the left one turned half a turn; it needs no part of its own.

  return {
    group,
    mech,
    /** Place the wing for the up track on `side` (+1 the machine's left) with `gap` m between the flatbed's side and
     * the up track at the post's s; returns the truck's lift (0 once set down on the rails). */
    place(side: number, gap: number) {
      const s = wingState(gap),
        postX = side * s.post,
        stackX = side * s.stack;
      post.position.x = postX;
      truck.position.y = s.lift;
      const from = side * WING.armBase;
      arm.position.x = (from + postX) / 2;
      arm.scale.x = Math.max(0.05, Math.abs(postX - from));
      // The platform runs from the post out under the stack.
      const lo = Math.min(0, stackX - postX - 1.0),
        hi = Math.max(0, stackX - postX + 1.0);
      platform.position.x = (lo + hi) / 2;
      platform.scale.x = hi - lo;
      mech.setStackX(stackX - postX);
      group.updateWorldMatrix(true, true);
      return s.lift;
    },
    dispose() {
      material.dispose();
    },
  };
}
