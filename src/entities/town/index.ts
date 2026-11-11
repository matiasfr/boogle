// The town entity in the live game (place-retirement T1): the house, shop and museum, after the railway each frame.
import { railwayMirror } from '../../world/game-world.ts';
import { productionRailway } from '../../proto/flags.ts';
import { defineKind, spawn } from '../../entity/entity.ts';
import { registerInteractable, NO_TARGETS } from '../../player/hands.ts';
import { warmUp } from '../../render/precompile.ts';
import { railwayWorldRead } from '../railway/state.ts';
import { createTownReader } from './town-read.ts';
import { createTownView, type TownView } from './view.ts';
import { setTownView } from './state.ts';

// Late, after the debug camera (1000): the rooms draw what's near the camera that's about to render.
defineKind('town', { update: 11, lateUpdate: 1001 });
let active: TownView | null = null;
registerInteractable(() => active?.targets() ?? NO_TARGETS);

if (productionRailway && railwayMirror) {
  const loaded = createTownView(createTownReader(railwayWorldRead).look).then((view) => {
    active = view;
    setTownView(view);
    return spawn({
      kind: 'town',
      mesh: view.root,
      update(ctx) {
        view.update(ctx);
      },
      lateUpdate() {
        view.cull();
      },
      describe: view.inspect,
      dispose() {
        active = null;
        setTownView(null);
        view.dispose();
      },
    });
  });
  warmUp(() => loaded, { beforeScene: true });
}
