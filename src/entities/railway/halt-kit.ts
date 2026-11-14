// Compiled kit in the existing platform frame. The view still owns drop animation and its original body order.
import { haltKitPlacements as placements } from '../../prefab/catalogue.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { createOwnedView, type OwnedView } from '../../render/owned-view.ts';
import { Euler } from 'three/webgpu';
import { boxAt, place } from '../../render/box-plan.ts';
import { tagStepSupport, segmentStepSupport } from '../../render/locomotion-surfaces.ts';
import type { Placement } from '../../prefab/types.ts';
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
  const selected = placements.filter(
    (p) =>
      p.params?.row === row &&
      p.params.up === up &&
      p.params.piece !== 'lever' &&
      p.params.piece !== 'stack-display' &&
      p.params.piece !== 'signal' &&
      p.params.piece !== 'road-plaque',
  );
  const make = (p: Placement) => ({
    piece: p.params!.piece,
    params: p.params!,
    instance: instantiate(p.prefab, p, { owner: p.params!.world ? owner : frame }),
  });
  // Keep the original scene traversal order: the down ramp meshes follow the signal and lever.
  const instances = selected.filter((p) => up || p.params!.piece !== 'ramp-visual').map(make);
  return {
    parts: instances
      .filter((i) => i.piece !== 'ramp-visual' && i.piece !== 'crossing-visual')
      .flatMap(({ instance }) => instance.parts),
    rampBoxes: instances
      .filter((i) => i.piece === 'ramp-visual')
      .flatMap(({ instance, params }) =>
        instance.parts.map(([, x, y, z, w, h, d, colour, pitch]) =>
          boxAt(x, y - h / 2, z, place(0, 0, 0, w, h, d, params.yaw as number, new Euler(pitch, 0, 0)), colour),
        ),
      ),
    crossingBoxes: instances
      .filter((i) => i.piece === 'crossing-visual')
      .flatMap(({ instance, params }) =>
        instance.parts.map(([, x, y, z, w, h, d, colour]) =>
          boxAt(x, y - h / 2, z, place(0, 0, 0, w, h, d, params.yaw as number), colour),
        ),
      ),
    createRamps() {
      if (!up) instances.push(...selected.filter((p) => p.params!.piece === 'ramp-visual').map(make));
    },
    showRamps(on: boolean) {
      for (const i of instances) if (i.piece === 'ramp-visual') i.instance.setEnabled(on);
    },
    enable(piece: string) {
      return instances
        .filter((i) => i.piece === piece)
        .flatMap(({ instance, params }) => {
          instance.setEnabled(true);
          if (Array.isArray(params.support)) {
            const [ax, az, bx, bz, ya, yb, width] = params.support as number[];
            for (const body of instance.bodies)
              tagStepSupport(body, segmentStepSupport(ax!, az!, bx!, bz!, ya!, yb!, width!, 'grass'));
          }
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

/** Attachment and stand construction happens at its original point in the scene/batch traversal. */
export function createHaltAttachment(owner: OwnedView, id: string) {
  const p = placements.find((p) => p.id === id);
  if (!p) throw new Error(`halt attachment: missing placement ${id}`);
  const instance = instantiate(p.prefab, p, { owner });
  instance.setEnabled(true);
  return instance;
}
