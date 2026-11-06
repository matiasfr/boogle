// One player in `npm run sim -- ball-handoff`, in its own process: the headless game in a real room, on the wall clock,
// doing what ./ball-handoff.ts tells it and reporting what it sees.
import { ball, grabBall, throwBall } from '../../src/entities/ball/state.ts';
import { net, remotes } from '../../src/netplay/net.ts';
import { rules } from '../../src/world/game-world.ts';
import { onDesync, submitEdit, world } from '../../src/world/sync.ts';
import { frame, headless, joinRoom } from './world.ts';

export type PeerReport = {
  peer: string | null;
  others: number;
  mine: boolean;
  remoteOwned: boolean;
  held: boolean;
  epoch: number;
  pose: number[];
  speed: number;
  tick: number;
  names: string[];
  desyncs: number;
};
export type PeerCommand =
  | { do: 'grab' }
  | { do: 'throw'; from: { x: number; y: number; z: number }; vel: { x: number; y: number; z: number } }
  | { do: 'rename'; n: string }
  | { do: 'report' };

await headless();
let desyncs = 0;
onDesync(() => desyncs++);
await joinRoom(process.env.SIM_ROOM!);

let last = performance.now();
setInterval(() => {
  const now = performance.now();
  frame(Math.min((now - last) / 1000, 0.05), now);
  last = now;
}, 16);

process.on('message', (c: PeerCommand) => {
  if (c.do === 'grab') grabBall();
  else if (c.do === 'throw') throwBall(c.from, c.vel);
  else if (c.do === 'rename') submitEdit({ op: 'who.set', i: 0, j: 0, n: c.n, c: 3 });
  const { p, v } = ball.pose;
  process.send!({
    peer: net.myPeer,
    others: remotes.size,
    mine: ball.mine,
    remoteOwned: ball.remoteOwned,
    held: ball.held,
    epoch: ball.e,
    pose: [p.x, p.y, p.z],
    speed: v.length(),
    tick: world.tick,
    names: Array.from({ length: rules.roster.size() }, (_, k) => rules.roster.nameOf(k)),
    desyncs,
  } satisfies PeerReport);
});
