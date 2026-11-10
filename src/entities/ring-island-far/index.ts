// Ring Island's far leaf on the production railway: the raised orange leaf, seen from home and the lookout. Local scenery,
// no state, no sync.
import { productionRailway } from '../../proto/flags.ts';
import { defineKind, spawn } from '../../entity/entity.ts';
import { createRingIslandFarView } from './view.ts';

defineKind('ring-island-far', { update: 14 });

if (productionRailway) {
  const view = createRingIslandFarView();
  spawn({
    kind: 'ring-island-far',
    mesh: view.root,
    update() {
      view.update();
    },
    describe: view.inspect,
    dispose: view.dispose,
  });
}
