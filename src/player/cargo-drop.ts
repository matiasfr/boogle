// One control declaration shared by the mutually exclusive place and railway owners.
import { registerAction } from './controls.ts';
import { createDropHold, DROP_HOLD_MS } from './drop-hold.ts';

let activeDrop: (() => boolean) | null = null;
let bigDrop: (() => boolean) | null = null;
let installed = false;
// Hold Drop (an owner whose back is more than one piece): `whole` puts all of it down. Null where Drop is a plain tap.
let whole: { all: () => boolean; more: () => boolean } | null = null;
const hold = createDropHold({
  tap: () => void activeDrop?.(),
  all: () => void whole?.all(),
});
// A timer fires the hold (the pad alone calls an action's `held`), so a key, a click or a touch hold all fire alike.
let timer: ReturnType<typeof setTimeout> | undefined;
const stop = () => clearTimeout(timer);
/** 0..1 while Drop is held toward putting the whole back down (the HUD's bar). */
export const dropHoldProgress = () => hold.progress(performance.now());

/** Unique server cargo gets first refusal without declaring another control. */
export function bindBigDrop(drop: () => boolean) {
  bigDrop = drop;
  return () => {
    if (bigDrop === drop) bigDrop = null;
  };
}

export function bindCargoDrop(drop: () => boolean, all?: { all: () => boolean; more: () => boolean }) {
  whole = all ?? null;
  if (!installed) {
    installed = true;
    registerAction('place-drop', {
      pad: 'r3',
      keys: ['Mouse2'],
      mouse: 2,
      label: 'Drop one thing off your back (hold: all of it)',
      touch: { label: 'Drop', className: 'place-drop-btn' },
      group: 'hands',
      order: 3,
      down: () => {
        if (bigDrop?.()) return;
        stop();
        hold.down(performance.now(), !!whole?.more());
        if (hold.holding()) timer = setTimeout(() => hold.tick(performance.now()), DROP_HOLD_MS + 5);
      },
      up: () => {
        stop();
        hold.up(performance.now());
      },
    });
  }
  activeDrop = drop;
  return () => {
    if (activeDrop === drop) {
      activeDrop = null;
      whole = null;
      stop();
      hold.cancel();
    }
  };
}
