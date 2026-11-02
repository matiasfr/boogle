// The beach ball, the worked example of a long-lived entity: what runs when, in one place (docs/game-design/ball.md).
//   state.ts     body, authority, pose, claim and throw, surf. Game code imports this
//   view.ts      mesh, texture, smoothing. Only what draws around the ball imports this
//   sync.ts      who owns it, the `b` presence field and the snapshots behind a remote ball
//   headless.ts  spawns state and sync, with no view: `npm run sim` loads it alone
// This file adds the view, as its own kind, and only the glob in src/main.ts imports it.
import { defineKind, spawn } from '../../entity/entity.ts';
import './headless.ts';
import { ballMesh, syncBallMesh } from './view.ts';

defineKind('ball-view', { update: -300 });

spawn({
  kind: 'ball-view',
  mesh: ballMesh,
  update: ({ dt }) => syncBallMesh(dt),
});
