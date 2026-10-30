// Island gifts (src/adapters/gifts.js): fruit on the palms, things washing up on the beach, things players threw, and the
// frisbee on the lighthouse deck.
import { onFrame, onStart } from '../loop.js';
import { gifts, createGifts3d, updateGifts, giftTargets } from '../adapters/gifts.js';
import { interactTarget, registerInteractable } from '../player/hands.js';

onStart(() => {
  createGifts3d();
  if (window.boogle) window.boogle.gifts = gifts; // debug handle
});
registerInteractable(giftTargets); // Pick up, Shake
// The item the interact prompt is on gets the highlight.
onFrame(({ dt, now }) => updateGifts(dt, now, interactTarget()?.item ?? null));
