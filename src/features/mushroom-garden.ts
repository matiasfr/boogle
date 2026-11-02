// Mushroom seed stall, watering can and bouncy mushrooms (src/adapters/mushroom-garden.ts). The stall is built in main.ts.
import { defineKind, spawn } from '../entity/entity.ts';
import { bounceOffCaps, plots, shoveFromUnderCaps, stallTargets, updateGarden } from '../adapters/mushroom-garden.ts';
import { registerInteractable } from '../player/hands.ts';

registerInteractable(stallTargets); // Take seeds or the can

// update: after the world tick (-10), before splashes (10), the order main.ts used to call them in.
defineKind('mushroom-garden', { fixedPre: 20, fixedPost: 10, update: 5 });
spawn({
  kind: 'mushroom-garden',
  mesh: plots,
  fixedPre: shoveFromUnderCaps,
  fixedPost: bounceOffCaps,
  update: ({ dt, now }) => updateGarden(dt, now),
});
