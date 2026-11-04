// Local production-water editor: no DOM, preferences or panel code unless explicitly requested.
import { onStart } from '../loop.ts';
import { inputState } from '../player/input-state.ts';
import { onEntered } from '../entities/player/state.ts';
import { me } from '../player/state.ts';

const query = new URLSearchParams(location.search);
if (query.get('tune') === '1' && query.get('dev') !== '1') {
  // Claim the cursor before a slow lazy chunk or the lobby's Enter click can race us.
  const canLock = inputState.canLock;
  inputState.canLock = false;
  const restorePointer = () => {
    inputState.canLock = canLock;
  };
  onStart(() => {
    const show = () =>
      void import('../debug/water-tuning.ts')
        .then((m) => m.showWaterTuning(restorePointer))
        .catch((error: unknown) => {
          restorePointer();
          console.error('Water tuning could not load:', error);
        });
    // The standalone panel must never cover the first-visit Jump in button on a phone.
    // With dev=1 the same panel is mounted explicitly inside Pause instead.
    if (me.entered) show();
    else onEntered(show);
  });
}
