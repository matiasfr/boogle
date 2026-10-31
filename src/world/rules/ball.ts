// Ball rules: the ball.rest op and the `ball` state, the beach ball's last resting spot (../../sim/ball-rest.ts). The
// ball's physics stays Owner state (src/physics/ball.js); when it settles, its owner submits ball.rest and apply only
// records the spot. Putting the ball back there on load is the adapter's job (src/features/ball-rest.ts), not apply's.
// Lockstep: everything here runs the same on every peer (see ./README.md).
import {
  canRest,
  rest,
  createBallRest,
  serializeBallRest,
  loadBallRest,
  hashBallRest,
  MAX_XZ_CM,
  MIN_Y_CM,
  MAX_Y_CM,
} from '../../sim/ball-rest.ts';
import { JUNK, bad } from './edit-gen.ts';

import type { SyncView, Stream } from './types.ts';

export const name = 'ball';
export type BallApi = ReturnType<typeof install>;
// Wire fields (on top of op, i, j): the resting spot in integer centimetres.
export type RestFields = { x: number; y: number; z: number };

export function install(sync: SyncView) {
  const ball = createBallRest();
  sync.registerOp<RestFields>('ball.rest', {
    validate: (e, ctx) => canRest(ball, e.x, e.y, e.z, ctx.tick),
    apply: (e, tick) => rest(ball, e.x, e.y, e.z, tick),
  });
  sync.registerState('ball', {
    serialize: () => serializeBallRest(ball),
    load: (json) => loadBallRest(ball, json),
    hash: () => hashBallRest(ball),
  });
  return { ball, rest: () => ball.p };
}

// Replay-test generators (./README.md): a rest somewhere on the beach, or junk.
export const edits = {
  'ball.rest': (r: Stream) =>
    r.chance(JUNK)
      ? bad(r, 'ball.rest')
      : { op: 'ball.rest', i: 0, j: 0, x: r.int(-3000, 3000), y: r.int(0, 800), z: r.int(-3000, 3000) },
};

export function invariants({ ball }: BallApi): string | null {
  if (ball.p === null) return null;
  const [x, y, z] = ball.p;
  const ok =
    [x, y, z].every(Number.isSafeInteger) &&
    Math.abs(x) <= MAX_XZ_CM &&
    Math.abs(z) <= MAX_XZ_CM &&
    y >= MIN_Y_CM &&
    y <= MAX_Y_CM;
  return ok ? null : `ball rests at ${ball.p.join(',')}`;
}
