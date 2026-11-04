// Local production-water editor: no DOM, preferences or panel code unless explicitly requested.
import { onStart } from '../loop.ts';
import { devEnabled } from '../dev-preferences.ts';
import { onEntered } from '../entities/player/state.ts';
import { me } from '../player/state.ts';

const query = new URLSearchParams(location.search);
if (query.get('tune') === '1' && !devEnabled) {
  const restorePointer = () => {};
  onStart(() => {
    const show = () =>
      void import('../debug/water-tuning.ts')
        .then((m) => m.showWaterTuning(restorePointer))
        .catch((error: unknown) => {
          restorePointer();
          console.error('Water tuning could not load:', error);
        });
    // The standalone panel must never cover the first-visit Jump in button on a phone.
    // Remembered Dev opt-in mounts the same panel in its dock instead.
    if (me.entered) show();
    else onEntered(show);
  });
}
