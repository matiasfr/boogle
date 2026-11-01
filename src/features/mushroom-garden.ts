// Mushroom seed stall, watering can and bouncy mushrooms (src/adapters/mushroom-garden.ts). The stall is built in main.js.
import { onFrame } from '../loop.ts';
import { updateGarden, stallTargets } from '../adapters/mushroom-garden.ts';
import { registerInteractable } from '../player/hands.ts';

registerInteractable(stallTargets); // Take seeds or the can

// After the world tick (-10), before splashes (10): the order main.js used to call them in.
onFrame(({ dt, now }) => updateGarden(dt, now), { order: 5 });
