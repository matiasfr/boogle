// The wardrobe entity (docs/plans/place-retirement.md, T4): one personal wardrobe for every wearable, in the live game.
//   state.ts  what you own and wear, the store and the `wardrobe` presence. Game code imports this
//   view.ts   what everyone wears, drawn on each avatar, and everyone's stowaway following them
//   menu.ts   the You page in Pause (mirror.ts: Buddy turned to the camera behind it)
// It starts only on the production railway; Place keeps its own gifts.ts wardrobe until D1. Only main.ts's glob
// imports this file.
import { productionRailway } from '../../proto/flags.ts';
import { defineKind, spawn } from '../../entity/entity.ts';
import { background } from '../../async.ts';
import { identity } from '../../player/identity.ts';
import { getRoomId } from '../../netplay/net.ts';
import { railwayRoomId } from '../../world/railway-namespace.ts';
import { COSMETICS, wearableIn } from '../../render/cosmetic-parts.ts';
import { aboard } from '../../physics/platforms.ts';
import { WARDROBE_PREFIX, startWardrobe } from './state.ts';
import { createWardrobeView } from './view.ts';
import { createMirror } from './mirror.ts';
import { createWardrobePage } from './menu.ts';
import { pausePages } from '../../player/pause-pages.ts';

defineKind('wardrobe', { lateUpdate: 5 });

if (productionRailway) {
  const key = `${WARDROBE_PREFIX}${railwayRoomId(getRoomId())}:${identity.pid}`;
  // On a moving deck (a train), standing or in one of its chairs, your stowaway rides beside you on the deck.
  const onDeck = () => aboard() !== null;
  const wardrobe = startWardrobe(
    { items: COSMETICS, wearable: wearableIn },
    {
      read: () => localStorage.getItem(key),
      write: (text) => localStorage.setItem(key, text),
    },
    onDeck,
  );
  // The You page in Pause (menu.ts), with the camera swing it owns (mirror.ts).
  const mirror = createMirror();
  const page = createWardrobePage(wardrobe, { items: COSMETICS, wearable: wearableIn }, mirror);
  pausePages.push(page);
  const listeners = new AbortController();
  // Another tab of this player changed it: take theirs.
  addEventListener('storage', (e) => e.key === key && wardrobe.reload(), { signal: listeners.signal });
  addEventListener('pagehide', () => wardrobe.flush(), { signal: listeners.signal });
  background(
    createWardrobeView(wardrobe).then((view) =>
      spawn({
        kind: 'wardrobe',
        mesh: view.root,
        lateUpdate: (ctx) => {
          view.lateUpdate(ctx, onDeck());
          mirror.update(ctx.dt);
        },
        describe: () => ({ ...wardrobe.inspect(), ...view.inspect(), mirror: mirror.inspect() }),
        dispose() {
          listeners.abort();
          mirror.dispose();
          pausePages.splice(pausePages.indexOf(page), 1);
          view.dispose();
        },
      }),
    ),
    'wardrobe view',
  );
}
