// Island gifts (src/adapters/gifts.ts): things players threw, and the frisbee on the lighthouse deck.
import { onStart } from '../loop.ts';
import { defineKind, spawn } from '../entity/entity.ts';
import { gifts, giftObjects, createGifts3d, updateGifts, giftTargets } from '../adapters/gifts.ts';
import { interactTarget, registerInteractable } from '../player/hands.ts';

onStart(() => {
  createGifts3d();
  if (window.boogle) window.boogle.gifts = gifts; // debug handle
});
registerInteractable(giftTargets); // Pick up
defineKind('gifts', { update: 0 });
spawn({
  kind: 'gifts',
  mesh: giftObjects,
  // The item the interact prompt is on gets the highlight.
  update: ({ dt, now }) => updateGifts(dt, now, (interactTarget() as { item?: number } | null)?.item ?? null),
});
