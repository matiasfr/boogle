// Keep the screen awake while someone plays: an iPad on a long haul with no touches would otherwise dim and lock
// (docs/research/webgpu-on-ipad.md, recommendation 13). A Screen Wake Lock is taken on the first input after the game
// starts (Safari wants the page visible, and some builds a gesture), let go when the tab is hidden (the browser
// drops it then anyway), and taken again on the next input once visible. Feature-detected: Safari 16.4+, Home
// Screen apps from iOS 18.4, Chrome; elsewhere nothing happens. Serves DESIGN.md 8 (drop-in, drop-out: put the
// iPad down mid-haul and it is still there). Sync kind: Local.
import { onStart } from '../loop.ts';

type Sentinel = { released: boolean; release(): Promise<void> };
const wl = (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<Sentinel> } }).wakeLock;

let lock: Sentinel | null = null;
let asking = false;

function take() {
  if (!wl || asking || (lock && !lock.released) || document.visibilityState !== 'visible') return;
  asking = true;
  wl.request('screen').then(
    (s) => {
      lock = s;
      asking = false;
    },
    () => (asking = false), // denied (battery saver, an iframe, no gesture yet): try again on the next input
  );
}

if (wl)
  onStart(() => {
    for (const ev of ['pointerup', 'keydown']) addEventListener(ev, take, { passive: true, capture: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && lock) {
        lock.release().catch(() => {});
        lock = null;
      }
    });
  });
