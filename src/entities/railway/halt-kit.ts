// Compiled kit in the existing platform frame. The view still owns drop animation and its original body order.
import artifact from '../../../content/built/prefabs.json' with { type: 'json' };
import level from '../../../content/built/levels/halt-kit.json' with { type: 'json' };
import type { PrefabArtifact } from '../../prefab/types.ts';
import { loadLevelArtifact } from '../../prefab/validate.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { createOwnedView, type OwnedView } from '../../render/owned-view.ts';
// instantiate already loads/validates the one prefab catalogue. Validate only this level's references here.
const placements = loadLevelArtifact(level, (artifact as unknown as PrefabArtifact).prefabs).placements;
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
      const item = instances.find((i) => i.piece === piece)?.instance;
      if (!item) return [];
      item.setEnabled(true);
      return item.bodies;
    },
    disable() {
      const removed = new Set(instances.flatMap(({ instance }) => instance.bodies));
      for (const { instance } of instances) instance.setEnabled(false);
      return removed;
    },
  };
}
