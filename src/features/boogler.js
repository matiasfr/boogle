// The Boogler: a wandering NPC (src/boogler.js) with a bouncy name tag and an off-screen pointer (src/boogler-hud.js),
// who you can pet, talk to, give presents and ride (src/boogler-play.js, src/boogler-dialogue.js, src/boogler-fx.js).
import './boogler.css';
import { onFrame, onStart } from '../loop.js';
import { boogler, createBoogler, updateBoogler } from '../boogler.js';
import { updateBooglerHud } from '../boogler-hud.js';
import { setupBooglerPlay, updateBooglerPlay } from '../boogler-play.js';
import { updateBooglerFx } from '../boogler-fx.js';
import { updateDialogue } from '../boogler-dialogue.js';

// Created at start, after the props exist, so he knows where the trees and rocks are.
onStart(() => {
  createBoogler();
  setupBooglerPlay();
  if (window.boogle) window.boogle.boogler = boogler; // debug handle
  const help = document.getElementById('help');
  for (const [key, text] of [
    ['T', 'Talk to The Boogler'],
    ['G', 'Give The Boogler a present'],
    ['Click', 'Pet him, pick things up, shake a palm'],
  ]) {
    const row = document.createElement('div');
    const kbd = document.createElement('kbd');
    kbd.textContent = key;
    const span = document.createElement('span');
    span.textContent = text;
    row.append(kbd, span);
    help?.append(row);
  }
});
onFrame(({ dt, now }) => updateBoogler(dt, now));
onFrame(({ dt, now }) => {
  updateBooglerPlay(dt, now);
  updateBooglerFx(dt, now);
  updateDialogue(now);
});
onFrame(() => updateBooglerHud(), { phase: 'late' });
