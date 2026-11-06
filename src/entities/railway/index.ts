// Default T1 entry. Explicit Place keeps its isolated legacy regression entry until its last promotion slice.
import { railwayApi } from '../../world/game-world.ts';
import {
  world,
  worldStatus,
  stateHashes,
  onApplied,
  onAfterTick,
  onSnapshot,
  onDesync,
  onSnapFail,
  requestResync,
} from '../../world/sync.ts';
import { productionRailway } from '../../proto/flags.ts';
import { defineKind, spawn } from '../../entity/entity.ts';
import { identity } from '../../player/identity.ts';
import { registerInteractable, NO_TARGETS } from '../../player/hands.ts';
import { net, onRoomReady, onNetState } from '../../netplay/net.ts';
import { warmUp } from '../../render/precompile.ts';
import { createRailwayAdapter } from '../../adapters/railway.ts';
import { createRailwayView, type RailwayView } from './view.ts';
import { setRailwayView } from './state.ts';

defineKind('railway', { prePhysics: -59, fixedPre: 43, update: 10 });
let active: RailwayView | null = null;
registerInteractable(() => active?.targets() ?? NO_TARGETS);

if (productionRailway && railwayApi) {
  const adapter = createRailwayAdapter({
    api: railwayApi,
    sync: { world, worldStatus, stateHashes, onApplied, onAfterTick, onSnapshot, onDesync, onSnapFail, requestResync },
    pid: identity.pid,
  });
  onRoomReady((room) => adapter.attach(room));
  onNetState(() => {
    if (net.room) adapter.attach(net.room);
  });
  const loaded = createRailwayView(adapter).then((view) => {
    active = view;
    setRailwayView(view.inspect);
    return spawn({
      kind: 'railway',
      mesh: view.root,
      prePhysics() {
        view.prePhysics();
      },
      fixedPre() {
        view.fixedPre();
      },
      update(ctx) {
        adapter.update(ctx.now);
        view.update(ctx);
      },
      describe: view.inspect,
      dispose() {
        active = null;
        setRailwayView(null);
        view.dispose();
        adapter.dispose();
      },
    });
  });
  warmUp(() => loaded, { beforeScene: true });
}
