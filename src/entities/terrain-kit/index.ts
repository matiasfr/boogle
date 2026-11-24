// The canyon kit on the canyon climb (./view.ts): local scenery with walk colliders, no state. It is optional dressing:
// a kit that fails to load (a missing or broken GLB) logs once and leaves the canyon bare, never holding up startup.
// The warm-up promise settles with nothing, so it keeps no view alive after the entity is disposed.
import { productionRailway } from '../../proto/flags.ts';
import { defineKind, spawn } from '../../entity/entity.ts';
import { warmUp } from '../../render/precompile.ts';
import { createTerrainKitView } from './view.ts';

defineKind('terrain-kit', { update: 4 });

if (productionRailway) {
  const loaded = createTerrainKitView().then(
    (view) => {
      spawn({
        kind: 'terrain-kit',
        mesh: view.root,
        update: view.update,
        describe: view.inspect,
        dispose: view.dispose,
      });
    },
    (error: unknown) => console.warn('[terrain-kit] the canyon kit did not load; the canyon stays bare:', error),
  );
  warmUp(() => loaded);
}
