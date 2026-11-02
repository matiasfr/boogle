// The player's body: every avatar, yours and everyone else's, is the Buddy (src/player/buddy/, assets/src/buddy.py). The
// loading screen waits for it (a warm-up step, under the boot's 8 s), so the capsule only shows past that, for good with
// ?body=capsule, or if it can't load. The follow camera comes with it,
// whichever body you have (&cam=old for the older one). &hat=cap or beanie tries a hat; ?buddies=8 is a test crowd with a
// frame-rate readout, for phones and iPads (src/debug/buddy-crowd.ts). Serves DESIGN.md 1 (moving around is a toy). Sync
// kind: Local (render only).
import { onStart } from '../loop.ts';
import { registerAsset } from '../render/asset-manifest.ts';
import { warmUp } from '../render/precompile.ts';
import buddyUrl from '../../assets/built/buddy.glb?url';
import clipsUrl from '../../assets/built/hero-clips.glb?url';

const q = new URLSearchParams(location.search);
registerAsset({ id: 'buddy', url: buddyUrl, kind: 'model', priority: 'first' });
registerAsset({ id: 'hero-clips', url: clipsUrl, kind: 'model', priority: 'first' });

let dressed: Promise<unknown> = Promise.resolve();
warmUp(() => dressed);

onStart(() => {
  void import('../player/buddy/camera.ts').then((m) => m.startFollowCamera());
  if (q.get('body') === 'capsule') return;
  dressed = import('../player/buddy/body.ts')
    .then((m) => m.startBuddy())
    .then(() => {
      if (q.has('buddies')) void import('../debug/buddy-crowd.ts');
    })
    .catch((e) => console.warn('buddy: staying a capsule', e));
});
