// The Boogler: a wandering NPC (src/boogler/boogler.ts) with a bouncy name tag and an off-screen pointer (src/boogler/hud.ts),
// who you can talk to, pet, give presents and ride (src/boogler/play.ts, src/boogler/dialogue.ts, src/boogler/fx.ts).
import './boogler.css';
import { onFrame, onStart } from '../loop.ts';
import { boogler, createBoogler, updateBoogler } from '../boogler/boogler.ts';
import { updateBooglerHud } from '../boogler/hud.ts';
import { setupBooglerPlay, updateBooglerPlay, talkTargets } from '../boogler/play.ts';
import { registerInteractable } from '../player/hands.ts';
import { updateBooglerFx } from '../boogler/fx.ts';
import { updateDialogue } from '../boogler/dialogue.ts';
import { describeControl } from '../player/controls.ts';

// Created at start, after the props exist, so he knows where the trees and rocks are.
onStart(() => {
  createBoogler();
  setupBooglerPlay();
  if (window.boogle) window.boogle.boogler = boogler; // debug handle
  describeControl('boogler-answer', {
    label: 'Answer The Boogler',
    detail: { kbm: 'E or Esc walks away (so does walking off)', pad: 'D-pad picks, A says it, B walks away' },
    keys: ['Digit1-8'],
    pad: ['up', 'down'],
    touch: 'Tap an answer',
    group: 'friends',
    context: 'talking',
  });
});
registerInteractable(talkTargets); // Talk, in his name tag
onFrame(({ dt, now }) => updateBoogler(dt, now));
onFrame(({ dt, now }) => {
  updateBooglerPlay(dt, now);
  updateBooglerFx(dt, now);
  updateDialogue(now);
});
onFrame(() => updateBooglerHud(), { phase: 'late' });
