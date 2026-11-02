// The seed stand and the short-lived bouncy mushrooms a bag of seeds sprouts (src/adapters/mushrooms.ts). The stand is
// built in main.ts.
import { defineKind, spawn } from '../entity/entity.ts';
import { bounceOffCaps, listenForSprouts, stallTargets } from '../adapters/mushrooms.ts';
import { registerInteractable } from '../player/hands.ts';

registerInteractable(stallTargets); // Take a bag of seeds
listenForSprouts();

defineKind('mushroom-bounce', { fixedPost: 10 });
spawn({ kind: 'mushroom-bounce', fixedPost: bounceOffCaps });
