// Two players, two processes, the real server: who owns the ball as it changes hands, and whether both worlds agree. No
// browser or GPU. In real time, since the point is the network: it takes about ten seconds.
//   1. One of them picks up the orphaned ball, and the other follows it.
//   2. The other grabs it: the epoch goes up, the first lets go, and exactly one owns it at each report.
//   3. It's thrown: the old owner's pose ends where the new owner's body does.
//   4. An edit from one reaches the other's lockstep world, with no desync.
//   5. The owner leaves: the one left picks up the ball where it lay.
import assert from 'node:assert/strict';
import { fork, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createService, loadConfig } from '../../server/src/server.ts';
import type { PeerCommand, PeerReport } from './ball-handoff-peer.ts';

const SETTLE_TO = 0.1; // m: how close the two poses end, with snapshots rounded to the centimetre
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-sim-'));
const service = createService(loadConfig({ DATA_DIR: dataDir, SERVER_ROOMS: '*' }, { log: () => {} }));
const port = await service.listen(0);
const room = `sim${Date.now().toString(36)}`;

const here = import.meta.dirname;
const players: ChildProcess[] = ['a', 'b'].map(() =>
  fork(path.join(here, 'ball-handoff-peer.ts'), [], {
    execArgv: ['--import', path.join(here, 'hooks.ts')],
    env: { ...process.env, SIM_ROOM: room, VITE_BOOGLE_SERVER: `http://127.0.0.1:${port}` },
  }),
);
const ask = (player: ChildProcess, command: PeerCommand = { do: 'report' }) =>
  new Promise<PeerReport>((resolve) => {
    player.once('message', (m) => resolve(m as PeerReport));
    player.send(command);
  });
async function until<T>(what: string, read: () => Promise<T>, ok: (v: T) => boolean, timeoutMs = 8000) {
  const t0 = Date.now();
  for (;;) {
    const v = await read();
    if (ok(v)) {
      console.log(`ok  ${what} (${Date.now() - t0} ms)`);
      return v;
    }
    assert.ok(Date.now() - t0 < timeoutMs, `${what}: not within ${timeoutMs} ms; last ${JSON.stringify(v)}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}
const both = async () => Promise.all(players.map((p) => ask(p))) as Promise<[PeerReport, PeerReport]>;
const dist = (a: number[], b: number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

try {
  // 1
  const [a, b] = await until(
    'one player picks up the orphaned ball, the other follows',
    both,
    ([a, b]) => a.others === 1 && b.others === 1 && a.mine !== b.mine && (a.mine ? b.remoteOwned : a.remoteOwned),
  );
  const [owner, other] = a.mine ? players : players.toReversed();
  const firstEpoch = Math.max(a.epoch, b.epoch);

  // 2
  await ask(other!, { do: 'grab' });
  const [took, gaveUp] = await until(
    'the other grabs it, and the first lets go',
    async () => [await ask(other!), await ask(owner!)] as const,
    ([took, gaveUp]) => took.mine && took.held && !gaveUp.mine && gaveUp.remoteOwned,
    2000,
  );
  assert.ok(took.epoch > firstEpoch, `the epoch goes up: ${firstEpoch} to ${took.epoch}`);
  assert.ok(gaveUp.held, 'the old owner sees the ball held');

  // 3
  const [x, y, z] = took.pose as [number, number, number];
  await ask(other!, { do: 'throw', from: { x, y: y + 2, z }, vel: { x: -3, y: 6, z: -4 } });
  await until(
    'the throw is in the air, and the old owner sees it',
    () => ask(owner!),
    (watcher) => watcher.speed > 2 && !watcher.held,
    2000,
  );
  const [thrower, watcher] = await until(
    "it lands, and the old owner's pose ends where the body does",
    async () => [await ask(other!), await ask(owner!)] as const,
    ([thrower, watcher]) => thrower.speed < 1 && dist(thrower.pose, watcher.pose) < SETTLE_TO,
    10000,
  );
  assert.ok(thrower.mine && !watcher.mine, 'the thrower still owns it');

  // 4
  await ask(owner!, { do: 'rest', x: 1234, y: 200, z: 567 });
  const [saw] = await until(
    'an edit from one reaches the other through the lockstep world',
    async () => [await ask(other!)] as const,
    ([saw]) => saw.rest?.[0] === 1234,
    3000,
  );
  assert.ok(saw.tick > 0, 'the lockstep world is ticking');
  const reports = await both();
  for (const report of reports) assert.equal(report.desyncs, 0, 'no desync');

  // 5
  const lay = (await ask(other!)).pose;
  other!.kill();
  const inherited = await until(
    'the owner leaves, and the one left picks the ball up where it lay',
    () => ask(owner!),
    (r) => r.others === 0 && r.mine,
  );
  assert.ok(dist(inherited.pose, lay) < 1, `it stays put: ${lay} to ${inherited.pose}`);
  console.log(`epochs ${firstEpoch} to ${inherited.epoch}, lockstep tick ${inherited.tick}, no desync`);
} finally {
  for (const player of players) player.kill();
  await service.close?.();
}
process.exit(0);
