// The wardrobe entity (docs/plans/place-retirement.md, T4): one personal wardrobe for every wearable, in the live game.
//   state.ts  what you own and wear, the store and the `wardrobe` presence. Game code imports this
//   view.ts   what everyone wears, drawn on each avatar, and everyone's stowaway following them
// It starts only on the production railway; Place keeps its own gifts.ts wardrobe until D1. Only main.ts's glob
// imports this file.
import { productionRailway } from '../../proto/flags.ts';
import { defineKind, spawn } from '../../entity/entity.ts';
import { background } from '../../async.ts';
import { identity } from '../../player/identity.ts';
import { getRoomId } from '../../netplay/net.ts';
import { railwayRoomId } from '../../world/railway-namespace.ts';
import { COSMETICS, wearableIn } from '../../render/cosmetic-parts.ts';
import { carry } from '../../physics/platforms.ts';
import { WARDROBE_PREFIX, startWardrobe } from './state.ts';
import { createWardrobeView } from './view.ts';

defineKind('wardrobe', { lateUpdate: 5 });

if (productionRailway) {
  const key = `${WARDROBE_PREFIX}${railwayRoomId(getRoomId())}:${identity.pid}`;
  // On a moving deck (a train), your stowaway rides on your shoulder (Place's rule).
  const onDeck = () => carry.on !== null;
  const wardrobe = startWardrobe(
    { items: COSMETICS, wearable: wearableIn },
    {
      read: () => localStorage.getItem(key),
      write: (text) => localStorage.setItem(key, text),
    },
    onDeck,
  );
  const listeners = new AbortController();
  // Another tab of this player changed it: take theirs.
  addEventListener('storage', (e) => e.key === key && wardrobe.reload(), { signal: listeners.signal });
  addEventListener('pagehide', () => wardrobe.flush(), { signal: listeners.signal });
  background(
    createWardrobeView(wardrobe).then((view) =>
      spawn({
        kind: 'wardrobe',
        mesh: view.root,
        lateUpdate: (ctx) => view.lateUpdate(ctx, onDeck()),
        describe: () => ({ ...wardrobe.inspect(), ...view.inspect() }),
        dispose() {
          listeners.abort();
          view.dispose();
        },
      }),
    ),
    'wardrobe view',
  );
}
