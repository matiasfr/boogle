// The Boogler: a wandering NPC (src/boogler/boogler.ts) with a bouncy name tag and an off-screen pointer (src/boogler/hud.ts),
// who you can talk to, give presents and ride (src/boogler/play.ts, src/boogler/dialogue.ts, src/boogler/fx.ts).
// One blob for now; the state and view split comes later (docs/plans/entity-architecture.md, step 13). Two kinds, because
// carrying his rider takes a second slot in the fixed step, after his body and the player's controller (src/loop.ts).
import './boogler.css';
import { onStart } from '../loop.ts';
import { background } from '../async.ts';
import { defineKind, spawn } from '../entity/entity.ts';
import { boogler, booglerBodyStep, createBoogler, updateBoogler } from '../boogler/boogler.ts';
import { updateBooglerHud } from '../boogler/hud.ts';
import {
  carryBooglerRider,
  checkStandingOnBoogler,
  loadTalk,
  updateBooglerPlay,
  talkTargets,
} from '../boogler/play.ts';
import { registerInteractable } from '../player/hands.ts';
import { updateBooglerFx } from '../boogler/fx.ts';
import { updateDialogue } from '../boogler/dialogue.ts';

defineKind('boogler', { fixedPre: 50, update: 0, lateUpdate: 0 });
defineKind('boogler-ride', { fixedPre: 60, fixedPost: 30 });

// Spawned at start, after the props exist, so he knows where the trees and rocks are.
onStart(() => {
  const { group, body } = createBoogler();
  spawn({
    kind: 'boogler',
    mesh: group,
    bodies: [body],
    fixedPre: booglerBodyStep,
    update({ dt, now }) {
      updateBoogler(dt, now);
      updateBooglerPlay(dt, now);
      updateBooglerFx(dt, now);
      updateDialogue(now);
    },
    lateUpdate: updateBooglerHud,
  });
  spawn({ kind: 'boogler-ride', fixedPre: carryBooglerRider, fixedPost: checkStandingOnBoogler });
  background(loadTalk(), 'boogler dialogue preload');
  if (window.boogle) window.boogle.boogler = boogler; // debug handle
});
registerInteractable(talkTargets); // Talk, in his name tag
