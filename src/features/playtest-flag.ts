// The playtest flag (M, or d-pad right): a local bookmark in the playtest data, a `flag` mark with where you are and what
// you are doing, so a moment can be found again without typing. No world change and no message; a tick is the only
// acknowledgement. Live game only (?proto=place keeps its own, src/proto/place/flag.ts, until it is deleted).
// Serves the owner's call-first feedback (docs/agents/owner-calls.md).
import { onStart } from '../loop.ts';
import { productionRailway } from '../proto/flags.ts';
import { hookActivity, playMark } from '../proto/mark.ts';
import { registerAction } from '../player/controls.ts';
import { me } from '../player/player.ts';
import { inv } from '../player/inventory.ts';
import { carry } from '../physics/platforms.ts';
import { railwayRead } from '../entities/railway/state.ts';
import { uiSound } from '../ui/ui-sound.ts';

function flag() {
  if (!me.entered || !me.body) return;
  const p = me.body.position;
  const r = railwayRead();
  const logs = r?.carry ?? 0,
    rails = r?.railsCarry ?? 0,
    stone = r?.stoneCarry ?? 0,
    big = r?.foot ? 'footing' : null;
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
