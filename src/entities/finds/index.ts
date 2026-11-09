// The finds entity (docs/plans/place-retirement.md, K1; F1 and F2 add to it): what you find along the production
// railway, Personal Local.
//   state.ts  what you've found, the store; game code and evals import this
//   view.ts   the crystals in the world, their magnet and chime, and their row on the curio shelf
// It starts only on the production railway; Place keeps its own crystals.ts until D1. Only main.ts's glob imports this
// file.
import { productionRailway } from '../../proto/flags.ts';
import { defineKind, spawn } from '../../entity/entity.ts';
import { identity } from '../../player/identity.ts';
import { getRoomId } from '../../netplay/net.ts';
import { warmUp } from '../../render/precompile.ts';
import { railwayRoomId } from '../../world/railway-namespace.ts';
import { FINDS_PREFIX, setFindsView, startFinds } from './state.ts';
import { createFindsView } from './view.ts';

// After the town (11), whose shelf the crystals' row stands on.
defineKind('finds', { update: 13 });

if (productionRailway) {
  const key = `${FINDS_PREFIX}${railwayRoomId(getRoomId())}:${identity.pid}`;
  const store = startFinds({
    read: () => localStorage.getItem(key),
    write: (text) => localStorage.setItem(key, text),
  });
  const listeners = new AbortController();
  // Another tab of this player found something: take theirs.
  addEventListener('storage', (e) => e.key === key && store.reload(), { signal: listeners.signal });
  const loaded = createFindsView(store).then((view) => {
    setFindsView(view.inspect);
    return spawn({
      kind: 'finds',
      mesh: view.root,
      update(ctx) {
        view.update(ctx);
      },
      describe: view.inspect,
      dispose() {
        listeners.abort();
        setFindsView(null);
        view.dispose();
      },
    });
  });
  warmUp(() => loaded);
}
