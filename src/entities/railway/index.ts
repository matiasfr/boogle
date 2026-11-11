// Default T1 entry. Explicit Place keeps its isolated legacy regression entry until its last promotion slice.
import { railwayMirror, rules } from '../../world/game-world.ts';
import { productionRailway } from '../../proto/flags.ts';
import { defineKind, despawn, spawn } from '../../entity/entity.ts';
import { identity } from '../../player/identity.ts';
import { registerInteractable, NO_TARGETS } from '../../player/hands.ts';
import { net, onRoomReady, onNetState, localPresence } from '../../netplay/net.ts';
import { warmUp } from '../../render/precompile.ts';
import { createRailwayAdapter, railMovement } from '../../adapters/railway-session.ts';
import { delayedRoom } from '../../world/delayed-room.ts';
import { createRailwayView, type RailwayView } from './view.ts';
import { setRailwayView, setRailwayWorldRead } from './state.ts';

defineKind('railway', { prePhysics: -59, fixedPre: 43, update: 10, lateUpdate: 0 });
// The glide keeps the heading it had before the controller's air steering (Place's order-22 note, at 23 here): a second slot.
defineKind('railway-glide', { fixedPre: 23 });
let active: RailwayView | null = null;
registerInteractable(() => active?.targets() ?? NO_TARGETS);

if (productionRailway && railwayMirror) {
  const query = new URLSearchParams(location.search);
  const adapter = createRailwayAdapter({
    mirror: railwayMirror,
    movement: () => railMovement(rules.tune),
    movementRev: () => rules.tune.tune.rev,
    pid: identity.pid,
    pose: () => {
      const local = localPresence();
      return local?.entered && local.body ? local.body.position : null;
    },
  });
  setRailwayWorldRead(adapter.read);
  // Dev only: &railLag=<ms> adds that round trip to the railway's own messages (replication R1b captures).
  const lag = import.meta.env.DEV ? Math.min(1000, Math.max(0, Number(query.get('railLag')) || 0)) : 0;
  onRoomReady((room) => adapter.attach(delayedRoom(room, lag)));
  onNetState(() => {
    if (net.room) adapter.attach(delayedRoom(net.room, lag));
  });
  const loaded = createRailwayView(adapter).then((view) => {
    active = view;
    setRailwayView(view.inspect);
    const note = spawn({
      kind: 'railway-glide',
      fixedPre() {
        view.noteVelocity();
      },
    });
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
      lateUpdate() {
        view.lateUpdate();
      },
      describe: view.inspect,
      dispose() {
        despawn(note);
        active = null;
        setRailwayView(null);
        setRailwayWorldRead(null);
        view.dispose();
        adapter.dispose();
      },
    });
  });
  warmUp(() => loaded, { beforeScene: true });
}
