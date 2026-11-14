// Compiled kit in the existing platform frame. The view still owns drop animation and its original body order.
import { haltKitPlacements as placements } from '../../prefab/catalogue.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { createOwnedView, type OwnedView } from '../../render/owned-view.ts';
export function createHaltKit(
  owner: OwnedView,
  row: number,
  up: boolean,
  x: number,
  y: number,
  z: number,
  yaw: number,
) {
  const frame = createOwnedView();
  frame.root.position.set(x, y, z);
  frame.root.rotation.y = yaw;
  owner.add(frame.root);
  owner.cleanup(frame.dispose);
  const instances = placements
    .filter((p) => p.params?.row === row && p.params.up === up)
    .map((p) => ({
      piece: p.params!.piece,
      instance: instantiate(p.prefab, p, { owner: frame }),
    }));
  return {
    parts: instances.flatMap(({ instance }) => instance.parts),
    enable(piece: string) {
      return instances
        .filter((i) => i.piece === piece)
        .flatMap(({ instance }) => {
          instance.setEnabled(true);
          return instance.bodies;
        });
    },
    disable() {
      const removed = new Set(instances.flatMap(({ instance }) => instance.bodies));
      for (const { instance } of instances) instance.setEnabled(false);
      return removed;
    },
  };
}
