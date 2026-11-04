// A prototype visit: drop next to its verb, count active seconds and record its trace. Local only.
// Place owns its spawn/restore; the fall director always owns an active arrival. Serves DESIGN.md Small and readable.
import { urlParam } from '../../protos/store.ts';
import { onFrame } from '../loop.ts';
import { me, cam } from '../player/player.ts';
import { fallArrival } from '../fall/arrival.ts';
import { teleport } from '../physics/engine.ts';
import { groundHeight } from '../island/terrain.ts';
import { PLAYER_R } from '../constants.ts';
import { protoCount } from './count.ts';
import { pageQuery, protoV } from './flags.ts';
import { currentCard as card } from './card.ts';

const q = pageQuery();
if (card) {
  const v = protoV(card.id);
  if (q.has('trace')) void import('./trace/draw.ts');
  else (await import('./trace/record.ts')).startSitting(card.id, v || urlParam(card, 'v') || '');

  let target =
    card.id === 'place' || fallArrival.active
      ? null
      : (card.variants?.find((variant) => variant.name === v)?.spawn ?? card.spawn ?? null);
  onFrame(
    ({ dt }) => {
      if (!me.entered || !me.body) return;
      if (!document.hidden && dt > 0 && dt < 1) protoCount('seconds', dt);
      if (!target) return;
      const s = target;
      target = null;
      if (fallArrival.active) return;
      teleport(me.body, s.x, groundHeight(s.x, s.z) + PLAYER_R + 0.6, s.z);
      me.body.velocity.set(0, 0, 0);
      cam.yaw = me.yaw = s.yaw;
    },
    { phase: 'world', order: 40 },
  );
}
