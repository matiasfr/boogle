// The canyon kit on the canyon climb (./view.ts): local scenery with walk colliders, no state.
import { productionRailway } from '../../proto/flags.ts';
import { defineKind, spawn } from '../../entity/entity.ts';
import { warmUp } from '../../render/precompile.ts';
import { createTerrainKitView } from './view.ts';

defineKind('terrain-kit', { update: 4 });

if (productionRailway) {
  const loaded = createTerrainKitView().then((view) =>
    spawn({
      kind: 'terrain-kit',
      mesh: view.root,
      update: view.update,
      describe: view.inspect,
      dispose: view.dispose,
    }),
  );
  warmUp(() => loaded);
}
