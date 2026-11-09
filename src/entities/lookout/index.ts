// The lookout on the production railway: the ridge telescope and the buoys. Local scenery and a local view, no state.
import { productionRailway } from '../../proto/flags.ts';
import { defineKind, spawn } from '../../entity/entity.ts';
import { registerInteractable, NO_TARGETS } from '../../player/hands.ts';
import { warmUp } from '../../render/precompile.ts';
import { createLookoutView, type LookoutView } from './view.ts';

defineKind('lookout', { update: 12 });
let active: LookoutView | null = null;
registerInteractable(() => active?.targets() ?? NO_TARGETS);

if (productionRailway) {
  const loaded = createLookoutView().then((view) => {
    active = view;
    return spawn({
      kind: 'lookout',
      mesh: view.root,
      update(ctx) {
        view.update(ctx);
      },
      describe: view.inspect,
      dispose() {
        active = null;
        view.dispose();
      },
    });
  });
  warmUp(() => loaded);
}
