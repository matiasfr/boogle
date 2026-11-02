// The beach ball with no view: its body, its rules and who owns it, what runs when. The game loads this through
// ./index.ts, and `npm run sim` loads it alone (dev/sim/README.md), so nothing here reaches the scene or the DOM. Two
// kinds because it needs two slots in prePhysics and postPhysics, with the player's -80 and -290 between them
// (src/loop.ts).
import { defineKind, spawn } from '../../entity/entity.ts';
import { tabHidden } from '../../netplay/net.ts';
import { ball, netBall, prepareBall, settleBall, surfBall, walkIntoBall } from './state.ts';
import { resolveBallOwner, sampleBallPose } from './sync.ts';

defineKind('ball', { prePhysics: -90, fixedPre: 45, fixedPost: 15, postPhysics: -300 });
defineKind('ball-carry', { prePhysics: -70, postPhysics: -280 });

spawn({
  kind: 'ball',
  bodies: [ball.body],
  prePhysics: ({ now }) => resolveBallOwner(now, tabHidden()),
  fixedPre: ({ dt }) => surfBall(dt),
  fixedPost: netBall,
  postPhysics: settleBall,
  describe: () => ({
    mine: ball.mine,
    held: ball.held,
    remoteOwned: ball.remoteOwned,
    epoch: ball.e,
    myEpoch: ball.myE,
    snap: ball.snap,
    position: ball.pose.p,
    velocity: ball.pose.v,
  }),
});

spawn({
  kind: 'ball-carry',
  prePhysics() {
    sampleBallPose();
    prepareBall();
  },
  postPhysics: ({ now }) => walkIntoBall(now),
});
