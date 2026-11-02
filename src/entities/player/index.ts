// The local player: what runs when, in one place (docs/game-design/player.md).
//   state.ts     body, intent, entering, the controller, the fall back to the spawn. Game code imports this
//   view.ts      the avatar, and how it follows the body
//   headless.ts  spawns the state's kinds, with no view: `npm run sim` loads it alone
// This file adds the view, as its own kind, and only the glob in src/main.ts imports it. The camera is its own entity
// (src/entities/camera/).
import { defineKind, spawn } from '../../entity/entity.ts';
import './headless.ts';
import { onEntered, turnWithDeck } from './state.ts';
import { makePlayerAvatar, syncAvatar } from './view.ts';

// After the ball mesh (ball-view, -300), before remote avatars (remote-player, -280).
defineKind('player-view', { update: -290 });

onEntered(() =>
  spawn({
    kind: 'player-view',
    mesh: makePlayerAvatar(),
    update({ dt }) {
      turnWithDeck();
      syncAvatar(dt);
    },
  }),
);
