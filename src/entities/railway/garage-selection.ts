// What the garage's chosen part shows on the works copy (owner, 14 November 2026: "there should be some visual
// change, and I'm looking through the different wagons"): a gold frame round the part (whole when the room has it;
// the game's dashed "a part goes here" when it does not) that settles onto it, and a pale ghost flatbed for a car the
// copy does not carry, where it rides in the train. No button and no rule: nothing is tried on, and nothing on a real
// train changes until an install. Local to this tab: nobody else sees a selection.
// Everything made here leaves with the view: the frames are the owner's, and the ghost car's geometry and material
// are disposed by the owner's cleanup (the ghost hangs under the train's group, which the owner never traversed).
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import { createGhostOutlines } from '../../render/ghost-outline.ts';

/** Where a part is, or goes, in the train's frame (the first car's centre at z 0, y from the rail): the box its frame
 * is drawn round. `ghost`: a car to draw as a ghost with it, at this z with its deck this high. */
export type Focus = {
  c: [number, number, number];
  s: [number, number, number];
  ghost?: { z: number; top: number };
};
/** A newly chosen part's frame settles onto it over `s` seconds from `over` oversize; the ghost car drops `drop` m. */
export const SETTLE = { s: 0.28, over: 0.14, drop: 0.35 } as const;
const backOut = (t: number) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2;

/** `train`: the group whose frame a `Focus` is in. It must already hang under `owner`'s root. */
export function createGarageSelection(owner: OwnedView, train: THREE.Object3D) {
  const have = createGhostOutlines(owner, 12, 40, 0, 0.045);
  const goes = createGhostOutlines(owner, 320);
  const material = new THREE.MeshStandardNodeMaterial({
    color: '#e6dcc0',
    emissive: '#b9a878',
    emissiveIntensity: 0.5,
    roughness: 0.6,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const deckGeometry = new THREE.BoxGeometry(2.2, 0.2, 3.2),
    wheelGeometry = new THREE.CylinderGeometry(0.22, 0.22, 0.12, 16).rotateZ(Math.PI / 2);
  const car = new THREE.Group();
  const deck = new THREE.Mesh(deckGeometry, material);
  car.add(deck);
  for (const sx of [-0.8, 0.8])
    for (const sz of [-1.1, 1.1]) {
      const wheel = new THREE.Mesh(wheelGeometry, material);
      wheel.position.set(sx, 0.37, sz);
      car.add(wheel);
    }
  car.visible = false;
  train.add(car);
  owner.cleanup(() => {
    car.removeFromParent();
    deckGeometry.dispose();
    wheelGeometry.dispose();
    material.dispose();
  });

  const at = new THREE.Matrix4();
  let key = '',
    t = 1;
  return {
    /** Draws the frame for the part `id` names (null: nothing chosen, or a hold or a moment has the picture). `owned`:
     * the room has it, so the frame is whole and its ghost car is drawn. `still`: no settle (reduced motion). */
    show(dt: number, id: string | null, focus: Focus | null, owned: boolean, still: boolean) {
      have.begin();
      goes.begin();
      car.visible = false;
      if (!id || !focus) key = '';
      else {
        if (id !== key) {
          key = id;
          t = still ? 1 : 0;
        }
        t = Math.min(1, t + dt / SETTLE.s);
        const settle = 1 - backOut(t),
          over = 1 + SETTLE.over * settle;
        train.updateWorldMatrix(true, false);
        at.makeTranslation(focus.c[0], focus.c[1], focus.c[2]).premultiply(train.matrixWorld);
        (owned ? have : goes).outline(at, focus.s[0] * over, focus.s[1] * over, focus.s[2] * over);
        if (focus.ghost) {
          car.visible = true;
          car.position.set(0, settle * SETTLE.drop, focus.ghost.z);
          deck.position.y = focus.ghost.top - 0.1;
        }
      }
      have.commit();
      goes.commit();
    },
    inspect: () => ({ key, whole: have.count, dashed: goes.count, ghostCar: car.visible }),
    /** For the teardown test: what this made. */
    made: { geometries: [deckGeometry, wheelGeometry], material, frames: [have.mesh, goes.mesh], car },
  };
}
