import { BoxGeometry, CylinderGeometry, Group, Line3, Mesh, Vector3 } from 'three/webgpu';
import { REACH } from '../../constants.ts';
import { material } from '../../render/materials.ts';
import { clank } from '../../render/machine-sfx.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { itemModel } from '../../player/item-models.ts';
import { handPosition, me } from '../../player/state.ts';
import { take } from '../../player/inventory.ts';
import type { Interactable } from '../../player/hands.ts';
import { enableDisc, disableDisc, disc, grabDisc, recallDisc, updateDisc } from '../frisbee/state.ts';

export function createBoathouse(owner: OwnedView, base: Vector3, yaw: number) {
  const porch = new Group();
  porch.position.copy(base);
  porch.rotation.y = yaw;
  const wood = material('paintedToy', { colour: '#976941' });
  const tin = material('paintedToy', { colour: '#e7b54e' });
  const board = (x: number, y: number, z: number, w: number, h: number, d: number) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), wood);
    mesh.position.set(x, y, z);
    porch.add(mesh);
  };
  board(0, 0.75, 0, 1.35, 0.12, 0.64);
  for (const x of [-0.54, 0.54]) board(x, 0.38, 0, 0.1, 0.76, 0.46);
  board(0, 2.3, -0.5, 1.6, 0.12, 0.25);
  for (const x of [-0.65, 0.65]) board(x, 1.14, -0.5, 0.09, 2.28, 0.12);
  const cans = [-0.48, 0, 0.48].map((x) => {
    const pivot = new Group();
    pivot.position.set(x, 2.25, -0.5);
    const cord = new Mesh(new CylinderGeometry(0.014, 0.014, 0.25, 6), wood);
    cord.position.y = -0.125;
    const can = new Mesh(new CylinderGeometry(0.14, 0.14, 0.32, 12), tin);
    can.position.y = -0.39;
    pivot.add(cord, can);
    porch.add(pivot);
    return { pivot, at: porch.localToWorld(new Vector3(x, 1.86, -0.5)), last: -Infinity };
  });
  const model = itemModel('frisbee');
  owner.add(porch, model);
  porch.visible = model.visible = false;
  const rack = base.clone().add(new Vector3(0, 0.82, 0));
  const swept = new Line3(),
    closest = new Vector3();
  const pickup = {
    id: 'town.disc',
    verb: 'Catch',
    at: disc.p,
    run() {
      if (grabDisc()) take('frisbee');
    },
  };
  const recall = { id: 'town.disc-rack', verb: 'Return disc', at: rack, run: recallDisc };
  owner.cleanup(disableDisc);
  return {
    targets(): Interactable[] {
      if (!disc.enabled || disc.held || !me.entered || !me.body) return [];
      const hand = handPosition();
      if (hand.distanceTo(disc.p) < REACH) {
        pickup.verb = disc.v.lengthSq() > 1 ? 'Catch' : 'Grab';
        return [pickup];
      }
      return hand.distanceTo(rack) < REACH ? [recall] : [];
    },
    update(enabled: boolean, now: number, dt: number) {
      if (enabled !== disc.enabled) {
        if (enabled) enableDisc(rack);
        else disableDisc();
        porch.visible = enabled;
      }
      model.visible = enabled && !disc.held;
      if (!enabled) return;
      swept.start.copy(disc.p);
      const moving = disc.v.lengthSq() > 1;
      updateDisc(now, dt);
      swept.end.copy(disc.p);
      model.visible = !disc.held;
      model.position.copy(disc.p);
      for (const can of cans) {
        if (
          moving &&
          !disc.held &&
          now - can.last > 350 &&
          swept.closestPointToPoint(can.at, true, closest).distanceTo(can.at) < 0.39
        ) {
          can.last = now;
          clank(can.at.x, can.at.z);
        }
        const age = (now - can.last) / 1000;
        can.pivot.rotation.x = age < 1.5 ? Math.sin(age * 22) * Math.exp(-age * 3) * 0.8 : 0;
      }
    },
  };
}
