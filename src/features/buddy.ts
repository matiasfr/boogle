// The player's body: every avatar, yours and everyone else's, is the Buddy (src/player/buddy/, assets/src/buddy.py). The
// HTML preloads its files before the game modules. Loading waits for the prepared avatar; a genuine failure permits
// a capsule while bounded retries try again. A 45 s escape permits entry without cancelling a stalled load.
// ?body=capsule opts into it. The follow camera comes with it,
// whichever body you have (&cam=old for the older one). &hat=cap or beanie tries a hat; ?buddies=8 is a test crowd with a
// frame-rate readout, for phones and iPads (src/debug/buddy-crowd.ts). Serves DESIGN.md 1 (moving around is a toy). Sync
// kind: Local (render only).
import { onStart } from '../loop.ts';
import { registerAsset } from '../render/asset-manifest.ts';
import { failAvatarSkin } from '../player/avatars.ts';
import { bootMark } from '../boot/timeline.ts';
import buddyUrl from '../../assets/built/buddy.glb?url';
import clipsUrl from '../../assets/built/hero-clips.glb?url';

const q = new URLSearchParams(location.search);
registerAsset({ id: 'buddy', url: buddyUrl, kind: 'model', priority: 'first' });
registerAsset({ id: 'hero-clips', url: clipsUrl, kind: 'model', priority: 'first' });

async function prepareBuddy() {
  const retryMs = [1500, 5000];
  for (let attempt = 0; ; attempt++) {
    try {
      const m = await import('../player/buddy/body.ts');
      await m.startBuddy();
      if (q.has('buddies')) void import('../debug/buddy-crowd.ts');
      return;
    } catch (e) {
      bootMark('buddy-failed');
      failAvatarSkin();
      console.warn('buddy: model unavailable', e);
      const delay = retryMs[attempt];
      if (delay === undefined) return;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

onStart(() => {
  void import('../player/buddy/camera.ts').then((m) => m.startFollowCamera());
  if (q.get('body') === 'capsule') {
    bootMark('buddy-skipped');
    return;
  }
  bootMark('buddy-wait');
  const deadline = setTimeout(() => {
    bootMark('buddy-deadline');
    failAvatarSkin('load-deadline');
  }, 45000);
  // Escape only releases loading. Keep this one preparation alive so late success replaces the capsule.
  void prepareBuddy().finally(() => clearTimeout(deadline));
});
