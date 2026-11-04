// Local production-water editor: no DOM, preferences or panel code unless explicitly requested.
import { onStart } from '../loop.ts';
import { inputState } from '../player/input-state.ts';

if (new URLSearchParams(location.search).get('tune') === '1') {
  // Claim the cursor before a slow lazy chunk or the lobby's Enter click can race us.
  const canLock = inputState.canLock;
  inputState.canLock = false;
  const restorePointer = () => {
    inputState.canLock = canLock;
  };
  onStart(() =>
    import('../debug/water-tuning.ts')
      .then((m) => m.showWaterTuning(restorePointer))
      .catch((error: unknown) => {
        restorePointer();
        console.error('Water tuning could not load:', error);
      }),
  );
}
