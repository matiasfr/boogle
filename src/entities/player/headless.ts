// The local player with no view: what runs when. The game loads this through ./index.ts, and `npm run sim` loads it alone
// (dev/sim/README.md), so nothing here reaches the scene or the DOM. Two kinds because intent runs before you enter, and
// the body only exists after (orders: top of src/loop.ts).
import { defineKind, spawn } from '../../entity/entity.ts';
import { describePlayer, fallRespawn, groundPlayer, me, onEntered, steerPlayer, updateIntent } from './state.ts';

defineKind('player-intent', { prePhysics: -80 });
defineKind('player', { fixedPre: 40, fixedPost: 20, postPhysics: -290 });

spawn({ kind: 'player-intent', prePhysics: ({ dt }) => updateIntent(dt) });

onEntered(() =>
  spawn({
    kind: 'player',
    bodies: [me.body!],
    fixedPre: steerPlayer,
    fixedPost: groundPlayer,
    postPhysics: fallRespawn,
    describe: describePlayer,
  }),
);
