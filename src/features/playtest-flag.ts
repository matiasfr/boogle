// The playtest flag (M, or d-pad right): a local bookmark in the playtest data, a `flag` mark with where you are and what
// you are doing, so a moment can be found again without typing. No world change and no message; a tick is the only
// acknowledgement. Live game only.
// Serves the owner's call-first feedback (docs/agents/owner-calls.md).
import { onStart } from '../loop.ts';
import { productionRailway } from '../proto/flags.ts';
import { hookActivity, playMark } from '../proto/mark.ts';
import { registerAction } from '../player/controls.ts';
import { me } from '../player/player.ts';
import { inv } from '../player/inventory.ts';
import { carry } from '../physics/platforms.ts';
import { railwayWorldRead } from '../entities/railway/state.ts';
import { account } from '../sim/railway-rows.ts';
import { uiSound } from '../ui/ui-sound.ts';

function flag() {
  if (!me.entered || !me.body) return;
  const p = me.body.position;
  const r = railwayWorldRead();
  const mine = r && account(r.world(), r.pid);
  const logs = mine?.carry ?? 0,
    rails = mine?.rails ?? 0,
    stone = mine?.stone ?? 0,
    big = mine?.foot ? 'footing' : null;
  const loaded = !!inv.held || logs + rails + stone > 0 || big !== null;
  playMark('flag', {
    y: Math.round(p.y * 10) / 10,
    activity:
      hookActivity() ??
      (carry.on
        ? 'riding'
        : me.swimming
          ? 'swimming'
          : loaded
            ? 'carrying'
            : me.wish.lengthSq() > 0
              ? 'walking'
              : 'idle'),
    logs,
    rails,
    stone,
    big,
    ridden: carry.on ? (carry.on.id ?? 'unnamed platform') : null,
  });
  uiSound('tick');
}

onStart(() => {
  if (!productionRailway) return;
  registerAction('playtest-flag', { key: 'KeyM', pad: 'right', label: 'Flag', group: 'menu', down: flag });
});
