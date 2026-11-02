// The beach ball, the worked example of a long-lived entity: what runs when, in one place (docs/game-design/ball.md).
//   state.ts   body, authority, pose, claim and throw, surf. Game code imports this
//   view.ts    mesh, texture, smoothing. Only what draws around the ball imports this
//   sync.ts    who owns it, the `b` presence field and the snapshots behind a remote ball
// This file is the only one that knows all three, and only the glob in src/main.ts imports it. Two kinds because it
// needs two slots in prePhysics and postPhysics, with the player's -80 and -290 between them (src/loop.ts).
import { defineKind, spawn } from '../../entity/entity.ts';
import { ball, netBall, prepareBall, settleBall, surfBall, walkIntoBall } from './state.ts';
import { resolveBallOwner, sampleBallPose } from './sync.ts';
import { ballMesh, syncBallMesh } from './view.ts';

defineKind('ball', { prePhysics: -90, fixedPre: 45, fixedPost: 15, postPhysics: -300, update: -300 });
defineKind('ball-carry', { prePhysics: -70, postPhysics: -280 });

spawn({
  id: 'ball',
  kind: 'ball',
  alive: true,
  mesh: ballMesh,
  bodies: [ball.body],
  prePhysics: ({ now }) => resolveBallOwner(now, document.hidden),
  fixedPre: ({ dt }) => surfBall(dt),
  fixedPost: netBall,
  postPhysics: settleBall,
  update: ({ dt }) => syncBallMesh(dt),
});

spawn({
  id: 'ball-carry',
  kind: 'ball-carry',
  alive: true,
  prePhysics() {
    sampleBallPose();
    prepareBall();
  },
  postPhysics: ({ now }) => walkIntoBall(now),
});
