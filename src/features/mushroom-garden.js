// Mushroom seed stall, watering can and bouncy mushrooms (src/adapters/mushroom-garden.js). The stall is built in main.js.
import { onFrame } from '../loop.js';
import { updateGarden, stallTargets } from '../adapters/mushroom-garden.js';
import { registerInteractable } from '../player/hands.js';

registerInteractable(stallTargets); // Take seeds or the can

// After the world tick (-10) and shovel (0), before splashes (10): the order main.js used to call them in.
onFrame(({ dt, now }) => updateGarden(dt, now), { order: 5 });
