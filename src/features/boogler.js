// The Boogler: a wandering NPC (src/boogler.js) with a bouncy name tag and an off-screen pointer (src/boogler-hud.js).
import './boogler.css';
import { onFrame, onStart } from '../loop.js';
import { boogler, createBoogler, updateBoogler } from '../boogler.js';
import { updateBooglerHud } from '../boogler-hud.js';

// Created at start, after the props exist, so he knows where the trees and rocks are.
onStart(() => {
  createBoogler();
  if (window.boogle) window.boogle.boogler = boogler; // debug handle
});
onFrame(({ dt, now }) => updateBoogler(dt, now));
onFrame(() => updateBooglerHud(), { phase: 'late' });
