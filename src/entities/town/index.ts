// The town entity in the live game (place-retirement T1): the house, shop and museum, after the railway each frame.
import { onStart } from '../../loop.ts';
import { wrapAction } from '../../player/controls.ts';
import { railwayMirror } from '../../world/game-world.ts';
import { productionRailway } from '../../proto/flags.ts';
import { defineKind, despawn, spawn } from '../../entity/entity.ts';
import { registerInteractable, NO_TARGETS, type Interactable } from '../../player/hands.ts';
import { warmUp } from '../../render/precompile.ts';
import { railwayWorldRead } from '../railway/state.ts';
import { createTownReader } from './town-read.ts';
import { createTownView, type TownView } from './view.ts';
import { setTownView } from './state.ts';
import { spawnHangout } from './hangout.ts';
import { useHomeToyGround } from './court.ts';

// Late, after the debug camera (1000): the rooms draw what's near the camera that's about to render.
defineKind('town', { update: 11, lateUpdate: 1001 });
const hangoutTargets: Interactable[] = [];
let hangouts: ReturnType<typeof spawnHangout>[] = [];
let active: TownView | null = null;
onStart(() =>
  wrapAction('interact', {
    up(next) {
      active?.release();
      next();
    },
  }),
);
registerInteractable(() => {
  if (!active) return NO_TARGETS;
  hangoutTargets.length = 0;
  for (const hangout of hangouts) hangoutTargets.push(...hangout.targets());
  return active.targets(hangoutTargets);
});

if (productionRailway && railwayMirror) {
  useHomeToyGround();
  const loaded = createTownView(createTownReader(railwayWorldRead).look).then((view) => {
    active = view;
    setTownView(view);
    hangouts = [0, 2].map((k) => spawnHangout(k, view.plotDone));
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
        for (const h of hangouts) despawn(h);
        hangouts = [];
        active = null;
        setTownView(null);
        view.dispose();
      },
    });
  });
  warmUp(() => loaded, { beforeScene: true });
}
