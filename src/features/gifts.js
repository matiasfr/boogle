// Island gifts (src/gifts.js): fruit on the palms, things washing up on the beach, things players threw, and the
// frisbee on the lighthouse deck.
import { onFrame, onStart } from '../loop.js';
import { gifts, createGifts3d, updateGifts } from '../gifts.js';

onStart(() => {
  createGifts3d();
  if (window.boogle) window.boogle.gifts = gifts; // debug handle
});
onFrame(({ dt, now }) => updateGifts(dt, now));
