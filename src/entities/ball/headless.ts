// The beach ball with no view: its body, its rules and who owns it, what runs when. The game loads this through
// ./index.ts, and `npm run sim` loads it alone (dev/sim/README.md), so nothing here reaches the scene or the DOM. Two
// kinds because it needs two slots in prePhysics and postPhysics. Feature-range orders: the carried pose follows the
// player's intent (-80) and walking into the ball follows the player's fall respawn (-290); see src/loop.ts.
import { defineKind, spawn } from '../../entity/entity.ts';
import { ball, ballOwner, netBall, prepareBall, settleBall, surfBall, walkIntoBall } from './state.ts';
import './sync.ts';

defineKind('ball', { prePhysics: 20, fixedPre: 45, fixedPost: 15, postPhysics: 20 });
defineKind('ball-carry', { prePhysics: 21, postPhysics: 21 });

spawn({
  kind: 'ball',
  bodies: [ball.body],
  prePhysics: ({ now }) => ballOwner.resolve(now),
  fixedPre: ({ dt }) => surfBall(dt),
  fixedPost: netBall,
  postPhysics: settleBall,
  describe: () => ({
    mine: ball.mine,
    held: ball.held,
    remoteOwned: ball.remoteOwned,
    epoch: ball.e,
    myEpoch: ball.myE,
    position: ball.pose.p,
    velocity: ball.pose.v,
  }),
});

spawn({
  kind: 'ball-carry',
  prePhysics() {
    ballOwner.sample();
    prepareBall();
  },
  postPhysics: ({ now }) => walkIntoBall(now),
});
