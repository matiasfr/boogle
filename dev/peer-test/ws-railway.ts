// Railway rooms in the headless room test (ws-run.ts): the Server-kind railway (docs/plans/replication.md, R1a) over the
// real server, mirrored by headless pages (ws-page.ts). railwayChecks proves the mirror, late join, sessions, the
// last-piece race and restarts, comparing mirrored state instead of lockstep hashes. railwayLoad (WS_LOAD=1) measures
// R1a's bars: action-to-visible for the actor and for others, downlink per client, late join, saves and server cost.
import fs from 'node:fs/promises';
import path from 'node:path';
import { waitFor, ev, sleep } from './harness.ts';
import { RAILWAY_PLAY_NS, railwayRoomId } from '../../src/world/railway-namespace.ts';
import { DEFAULT_ROOM } from '../../src/constants.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 } from '../../src/sim/railway-layout.ts';
import { LINE1_INITIAL } from '../../src/sim/railway-line-layout.ts';
import { RAIL_STONE } from '../../src/sim/railway-works-layout.ts';
import type { RailAction } from '../../src/sim/railway.ts';
import {
  cart as cartRow,
  line as lineRow,
  train as trainRow,
  trains as trainRows,
} from '../../src/sim/railway-rows.ts';
import { SERVER_ID } from '../../src/net/ids.ts';
import type { RailwayProbe, RailwayAdapterProbe } from './ws-page.ts';
import type { RailwayWorldHost } from '../../server/src/host/world-host.ts';
import type { HostedRoom } from '../../server/src/host/hosted-room.ts';

type Page = { name: string; page: import('playwright').Page; selfId: unknown };
/** Sections that read or step the in-process room host (ws-run.ts counts their checks). */
export type HostSection = 'jump-in replace' | 'request stop' | 'leaf' | 'carrier leaves' | 'leg rejoin';
type Web = { open(name: string, query: string): Promise<Page> };
type Ctx = {
  web: Web;
  port: () => number;
  room: string;
  check: (name: string, ok: boolean, detail?: string) => void;
  /** An orderly server restart (a deploy). */
  restart: () => Promise<void>;
  hosted: (id: string) => HostedRoom | undefined;
  /** True when this section must be skipped: broker net runs the server out of process, with no room host to step. */
  hostOnly: (section: HostSection) => boolean;
  dataDir: string;
};

const rail = (p: Page): Promise<RailwayProbe> => ev(p.page, () => window.T.rail());
const adapter = (p: Page): Promise<RailwayAdapterProbe> => ev(p.page, () => window.T.railAdapter());
const INITIAL = LINE1_INITIAL[0];
/** The logs on a probed tab's back: its account row, or none. */
const backOf = (p: RailwayAdapterProbe) => p.rows.account?.carry ?? 0;
// What the room adds around a replication packet (hosted-room.ts writes it without re-serializing).
const ENVELOPE = `{"t":"m","from":${JSON.stringify(SERVER_ID)},"d":}`.length;

/** Seat authority over real sockets and client mirrors, including a real first-page close. Presentation prediction
 * is covered by the seat host/adapter tests and the two-player bench look; this probe never moves an avatar. */
export async function railwaySeats(c: Ctx) {
  const check = (name: string, ok: boolean, detail = '') => {
    c.check(name, ok, detail);
    if (!ok) throw new Error(`Seat proof stopped: ${name}${detail ? ` (${detail})` : ''}`);
  };
  const room = railwayRoomId(`${c.room}-seats`);
  const open = (name: string, pid: string) =>
    c.web.open(name, `room=${room}&server=http://127.0.0.1:${c.port()}&pid=${pid}`);
  const epochs = new Map<Page, number>();
  const next = new Map<Page, number>();
  const session = async (p: Page) => {
    check(`${p.name} receives a whole seat mirror`, (await waitFor(async () => (await rail(p)).ready)) >= 0);
    await ev(p.page, () => (window.T.railMessages.length = 0));
    check(
      `${p.name} receives a seat command session`,
      (await waitFor(async () => {
        await ev(p.page, () => window.T.railOpen());
        return (await rail(p)).messages.some((m) => m.t === 'r:session');
      })) >= 0,
    );
    const reply = (await rail(p)).messages.findLast((m) => m.t === 'r:session')!;
    epochs.set(p, Number(reply.epoch));
    next.set(p, Number(reply.next));
  };
  const command = async (p: Page, op: 'seat.sit' | 'seat.stand', id?: string, alt?: string[]) => {
    const request = next.get(p)!;
    next.set(p, request + 1);
    const e = { op, id, alt, epoch: epochs.get(p)!, request };
    await ev(p.page, (edit: typeof e) => window.T.railEdit(edit), e);
    let answer: Record<string, unknown> | undefined;
    check(
      `${p.name} ${op} gets a receipt`,
      (await waitFor(async () => {
        answer = (await rail(p)).messages.findLast(
          (m) => m.epoch === e.epoch && m.request === request && (m.t === 'ok' || m.t === 'rej'),
        );
        return !!answer;
      })) >= 0,
    );
    return answer!;
  };
  const accept = async (name: string, p: Page, op: 'seat.sit' | 'seat.stand', id?: string, alt?: string[]) => {
    const answer = await command(p, op, id, alt);
    check(name, answer.t === 'ok' && answer.accepted === 1, JSON.stringify(answer));
  };
  const seats = async (p: Page) => Object.fromEntries((await rail(p)).seats.map((s) => [s.id, s.pid]));
  const agree = (peers: Page[], expected: Record<string, string>) =>
    waitFor(async () => {
      const rows = await Promise.all(peers.map(seats));
      return rows.every(
        (row) =>
          Object.keys(row).length === Object.keys(expected).length &&
          Object.entries(expected).every(([id, pid]) => row[id] === pid),
      );
    });
  const A = await open('SeatA', 'seata');
  const B = await open('SeatB', 'seatb');
  await session(A);
  await session(B);
  // The raw fixture starts without an actor pose. Like every command, seats require one; an ack watermark alone
  // would also acknowledge this rejection. Prove that boundary before providing valid envelopes for contention.
  const actorless = await command(A, 'seat.sit', 'machine-deck-0');
  check(
    'a seat command without its actor pose is refused',
    actorless.t === 'rej' && actorless.reason === 'refused',
    JSON.stringify(actorless),
  );
  check('an actorless seat command leaves both mirrors empty', (await agree([A, B], {})) >= 0);
  await Promise.all([A, B].map((p) => ev(p.page, () => window.T.railStand(0, 0, 0))));
  // Wait for the first request's accepted receipt before sending the competitor. This orders arrival at the server
  // without assuming cross-socket ordering or sleeping; mirror predicates below separately await replication.
  await accept('first seat request wins', A, 'seat.sit', 'machine-deck-0');
  await accept('the losing seat request takes the alternate', B, 'seat.sit', 'machine-deck-0', ['machine-deck-1']);
  const held = { 'machine-deck-0': 'seata', 'machine-deck-1': 'seatb' };
  check('both seat mirrors agree without displacement', (await agree([A, B], held)) >= 0);
  const C = await open('SeatC', 'seatc');
  await session(C);
  await ev(C.page, () => window.T.railStand(0, 0, 0));
  check('a late join sees both occupied chairs', (await agree([A, B, C], held)) >= 0);
  const refused = await command(C, 'seat.sit', 'machine-deck-0', ['machine-deck-1']);
  check('a third player at two stools is refused taken', refused.t === 'rej' && refused.reason === 'taken');
  await Promise.all([A, B, C].map((p) => ev(p.page, () => window.T.room.presence({ v: 1 }))));
  await ev(A.page, () => window.T.room.presence({ v: 0 }));
  check(
    'the other tabs receive the first tab hiding',
    (await waitFor(async () =>
      (await ev(B.page, () => window.T.room.peers())).some(
        (p: { peer: string; presence: Record<string, unknown> }) => p.peer === A.selfId && p.presence.v === 0,
      ),
    )) >= 0,
  );
  check('a hidden tab does not free seats', (await agree([A, B, C], held)) >= 0);
  const before = await ev(B.page, () => window.T.conn.length);
  await ev(B.page, () => window.T.room.pause(400));
  check('a sitter keeps its chair inside the reconnect grace', (await agree([C], held)) >= 0);
  check(
    'the sitter reconnects with its seat row intact',
    (await waitFor(() => ev(B.page, (n: number) => window.T.conn.length >= n + 2 && window.T.conn.at(-1).c, before))) >=
      0 && (await agree([B, C], held)) >= 0,
  );
  await A.page.close();
  check(
    'closing the first page frees only its chair after grace',
    (await agree([B, C], { 'machine-deck-1': 'seatb' })) >= 0,
  );
  await c.restart();
  check('server restart clears transient seat rows on both clients', (await agree([B, C], {})) >= 0);
  await session(B);
  await session(C);
  await accept('a friend takes the old chair during the restart gap', C, 'seat.sit', 'machine-deck-1');
  await accept('re-claim includes alternatives and is accepted', B, 'seat.sit', 'machine-deck-1', ['machine-deck-0']);
  check(
    're-claim slides to the alternate without displacing the friend',
    (await agree([B, C], { 'machine-deck-0': 'seatb', 'machine-deck-1': 'seatc' })) >= 0,
  );
  await accept('standing is accepted', B, 'seat.stand');
  check('standing releases only the caller', (await agree([B, C], { 'machine-deck-1': 'seatc' })) >= 0);
  await Promise.all([B.page.close(), C.page.close()]);
}

export async function railwayChecks(c: Ctx) {
  // A failed authority proof ends this run immediately; later checks cannot turn it into a pass.
  const railCheck = (name: string, ok: boolean, detail = '') => {
    c.check(name, ok, detail);
    if (!ok) throw new Error(`Railway proof stopped: ${name}`);
  };
  const railRoom = railwayRoomId(c.room);
  console.log(`\nRailway room: ${railRoom}`);
  const openRail = (name: string, pid: string, extra = '') =>
    c.web.open(name, `room=${railRoom}&server=http://127.0.0.1:${c.port()}&pid=${pid}${extra}`);
  const session = async (p: Page) => {
    railCheck(`${p.name} mirrors the whole railway`, (await waitFor(async () => (await rail(p)).ready)) >= 0);
    await ev(p.page, () => (window.T.railMessages.length = 0));
    const started = await waitFor(async () => {
      await ev(p.page, () => window.T.railOpen());
      return (await rail(p)).messages.some((m) => m.t === 'r:session');
    });
    railCheck(`${p.name} receives a server-issued session`, started >= 0);
    return Number((await rail(p)).messages.findLast((m) => m.t === 'r:session')!.epoch);
  };
  const pose = (p: Page, target: 'station' | 'source', id?: number) =>
    ev(p.page, ({ target, id }: { target: 'station' | 'source'; id?: number }) => window.T.railPose(target, id), {
      target,
      id,
    });
  // Sends one action and waits for its ack or refusal on a replication packet.
  const act = async (p: Page, e: RailAction & { station?: string }, target: 'station' | 'source') => {
    await pose(p, target, e.id);
    await ev(p.page, (edit: RailAction) => window.T.railEdit(edit), e);
    let settled: Record<string, unknown> | undefined;
    const done = await waitFor(async () => {
      settled = (await rail(p)).messages.findLast(
        (m) =>
          (m.t === 'ack' && m.epoch === e.epoch && Number(m.request) >= e.request) ||
          (m.t === 'rej' && m.epoch === e.epoch && m.request === e.request),
      );
      return !!settled;
    });
    railCheck(`${e.op} is acknowledged or refused`, done >= 0);
    await sleep(RAILWAY_T1.swingMs + 20); // the next swing on the action clock
    return settled!;
  };
  // Mirrors agree when they hash the same (a packet carrying only one client's ack moves only its step, not its state).
  const agree = async (group: Page[]) =>
    (await waitFor(async () => {
      const all = await Promise.all(group.map(rail));
      return all.every((s) => s.ready && s.hash === all[0]!.hash);
    }, 8000)) >= 0;

  const RA = await openRail('RA', 'raila'),
    RB = await openRail('RB', 'railb');
  const epochA = await session(RA),
    epochB = await session(RB);
  railCheck(
    'wake is acknowledged',
    (await act(RA, { op: 'rail.wake', epoch: epochA, request: 1 }, 'station')).t === 'ack',
  );
  railCheck(
    'both mirrors show the wake finish on its schedule',
    (await waitFor(
      async () =>
        (await Promise.all([RA, RB].map(rail))).every(
          (s) => s.phase === 'idle' && s.awake >= 0 && s.awake + RAILWAY_T1.wakeTicks <= s.tick,
        ),
      30000, // a ceiling: the wait is the wake's own ticks (awake + wakeTicks <= mirror tick), not a real-time budget
      50,
      async () =>
        (await Promise.all([RA, RB].map(rail))).map((s) => ({ tick: s.tick, awake: s.awake, phase: s.phase })),
    )) >= 0,
  );
  const chopA = { op: 'rail.chop', epoch: epochA, request: 2, id: RAILWAY_SOURCES[0]![0], yaw: 0, collapsed: false };
  await act(RA, chopA, 'source');
  await act(RB, { ...chopA, epoch: epochB, request: 1 }, 'source');
  railCheck(
    'each harvest shows in both mirrors',
    (await waitFor(async () => (await Promise.all([RA, RB].map(rail))).every((s) => s.counts.carry === 2))) >= 0,
  );
  // A resend of an applied request is acknowledged again and changes nothing.
  await act(RA, chopA, 'source');
  await sleep(300);
  railCheck('a duplicate request does not harvest twice', (await rail(RB)).counts.carry === 2);
  await act(RA, { op: 'rail.deposit', epoch: epochA, request: 3, station: 'T1', n: 1 }, 'station');
  railCheck(
    'two mirrors agree on conserved balances',
    (await waitFor(async () =>
      (await Promise.all([RA, RB].map(rail))).every(
        (s) => s.counts.stock === 1 && s.counts.carry === 1 && s.counts.total === INITIAL + s.counts.produced,
      ),
    )) >= 0,
  );
  railCheck('mirrors hash the same', await agree([RA, RB]));
  const RC = await openRail('RC', 'railc');
  await session(RC);
  railCheck(
    'a late joiner mirrors exact stock and carry',
    (await waitFor(async () => {
      const s = await rail(RC);
      return s.counts.stock === 1 && s.counts.carry === 1 && s.counts.total === INITIAL + s.counts.produced;
    })) >= 0,
  );
  const RA2 = await openRail('RA2', 'raila');
  const epochA2 = await session(RA2);
  railCheck('same-pid takeover advances the session epoch', epochA2 === epochA + 1);
  railCheck(
    'same-pid takeover retires the old socket',
    (await waitFor(async () => (await ev(RA.page, () => window.T.fatal)) === 'elsewhere')) >= 0,
  );
  const stale = await act(RA2, { ...chopA, request: 4 }, 'source');
  railCheck('an old epoch cannot spend through the new session', stale.t === 'rej' && stale.reason === 'session');
  await RA.page.close();
  railCheck('takeover peers still mirror identically', await agree([RA2, RB, RC]));
  await c.restart();
  railCheck('reconnected mirrors agree after an orderly restart', await agree([RA2, RB, RC]));
  railCheck(
    'restored progress and carry are exact',
    (await Promise.all([RA2, RB, RC].map(rail))).every(
      (s) => s.counts.stock === 1 && s.counts.carry === 1 && s.counts.total === INITIAL + s.counts.produced,
    ),
  );
  const epochRestored = await session(RA2);
  railCheck('a restart issues a new epoch', epochRestored === epochA2 + 1);
  const initial = await rail(RA2);
  railCheck(
    'the client registers no shared state; railway, tuning and roster are mirrored',
    initial.registry.states.length === 0,
  );
  // Re-sent until it shows, as src/features/identity.ts does every 3 s: just after the restart the host can drop an
  // edit that arrives before its world runs again (CI run 42723426132), and the host refuses one that changes nothing.
  let whoSent = -Infinity;
  railCheck(
    'identity is accepted in the server roster',
    (await waitFor(async () => {
      if ((await rail(RB)).people.some((p) => p.pid === 'raila' && p.name === 'Alice')) return true;
      if (Date.now() - whoSent >= 1000) {
        whoSent = Date.now();
        await ev(
          RA2.page,
          (epoch: number) => {
            window.T.railStand(0, 0, 0);
            window.T.railEdit({ op: 'who.set', n: 'Alice', c: 2, epoch, request: 1 });
          },
          epochRestored,
        );
      }
      return false;
    })) >= 0,
  );
  await ev(RA2.page, () => window.T.railBaseEdit({ op: 'who.set', i: 0, j: 0, n: 'Forged', c: 2 }));
  await sleep(500);
  railCheck('the legacy edit channel is refused', !(await rail(RA2)).people.some((person) => person.name === 'Forged'));

  const epochB2 = await session(RB);
  const next = new Map<Page, number>([
    [RA2, 2],
    [RB, 1],
  ]);
  const epochs = new Map<Page, number>([
    [RA2, epochRestored],
    [RB, epochB2],
  ]);
  const request = (p: Page, fields: Omit<RailAction, 'epoch' | 'request'> & { station?: string }) => {
    const r = next.get(p)!;
    next.set(p, r + 1);
    return { ...fields, epoch: epochs.get(p)!, request: r };
  };
  const carryOf = async (p: Page, pid: string) => (await rail(p)).accounts.find((a) => a.pid === pid)?.carry ?? 0;
  const harvestTo = async (p: Page, pid: string, wanted: number) => {
    while ((await carryOf(p, pid)) < wanted) {
      const source = (await rail(p)).sources.find((s) => s.remaining > 0);
      railCheck('the catalog has an unspent source', !!source);
      await act(p, request(p, { op: 'rail.chop', id: source!.id, yaw: 0, collapsed: false }), 'source');
      await waitFor(async () => (await rail(p)).accounts.find((a) => a.pid === pid)!.request >= next.get(p)! - 1);
    }
    const extra = (await carryOf(p, pid)) - wanted;
    if (extra > 0)
      await act(p, request(p, { op: 'rail.drop', n: extra, x: RAILWAY_T1.x, y: 3000, z: RAILWAY_T1.z }), 'station');
  };
  while ((await rail(RA2)).counts.stock < 23) {
    await harvestTo(RA2, 'raila', 8);
    const n = Math.min(8, 23 - (await rail(RA2)).counts.stock);
    await act(RA2, request(RA2, { op: 'rail.deposit', station: 'T1', n }), 'station');
    await waitFor(async () => (await rail(RA2)).counts.carry < 8 + 2);
  }
  await harvestTo(RA2, 'raila', 4);
  await harvestTo(RB, 'railb', 4);
  await Promise.all([RA2, RB].map((p) => pose(p, 'station')));
  const race = [RA2, RB].map((p) => ({ p, e: request(p, { op: 'rail.deposit', station: 'T1', n: 4 }) }));
  await Promise.all(race.map(({ p, e }) => ev(p.page, (e: RailAction) => window.T.railEdit(e), e)));
  railCheck(
    'the final-piece race moves one log: seven carried, one bill funded',
    (await waitFor(async () =>
      (await Promise.all([RA2, RB, RC].map(rail))).every(
        (s) =>
          s.counts.carry === 7 &&
          s.counts.delivered === RAILWAY_T1.bill &&
          s.counts.total === INITIAL + s.counts.produced,
      ),
    )) >= 0,
  );
  // The schedule's own length bounds the wait: three times its ticks at 100 ms each (laying measured about 11 s).
  const t1Ticks = (await rail(RA2)).scheduleTicks;
  if (!Number.isFinite(t1Ticks) || t1Ticks <= 0) throw new Error(`T1 schedule ticks unreadable: ${t1Ticks}`);
  const laying = async () =>
    (await Promise.all([RA2, RB, RC].map(rail))).map((s) => ({
      tick: s.tick,
      awake: s.awake,
      phase: s.phase,
      completion: s.counts.completion,
      used: s.counts.used,
    }));
  railCheck(
    'every mirror lays T1 from its start tick and opens T2',
    (await waitFor(
      async () =>
        (await Promise.all([RA2, RB, RC].map(rail))).every(
          (s) =>
            s.counts.completion === 1 &&
            s.counts.used === RAILWAY_T1.bill &&
            s.phase === 'idle' &&
            s.activeStation === 1,
        ),
      t1Ticks * 100 * 3,
      50,
      laying,
    )) >= 0,
  );
  railCheck('mirrors agree after completion', await agree([RA2, RB, RC]));
  const completed = (await rail(RC)).counts;
  await RC.page.reload();
  await ev(RC.page, () => window.T.start());
  await session(RC);
  railCheck(
    'reloading restores exact material and completion',
    JSON.stringify((await rail(RC)).counts) === JSON.stringify(completed),
  );
  railCheck('the reloaded mirror matches the active players', await agree([RA2, RB, RC]));
  await Promise.all([RA2, RB, RC].map((p) => p.page.close()));

  // The real browser adapter (R1b): own actions predicted with their effects at once, settled by acks and refusals,
  // what a refusal took back returned through a correction; everyone else's effects from accepted events.
  const adapterRoom = railwayRoomId(`${c.room}-adapter`);
  const openAdapter = (name: string, pid: string) =>
    c.web.open(name, `room=${adapterRoom}&server=http://127.0.0.1:${c.port()}&pid=${pid}&adapter=1`);
  const AA = await openAdapter('AA', 'adaptera'),
    AB = await openAdapter('AB', 'adapterb');
  const adapterReady = async () => (await Promise.all([AA, AB].map(adapter))).every((p) => p.session.ready);
  railCheck('browser adapters become ready on the mirror and a session', (await waitFor(adapterReady)) >= 0);
  await pose(AA, 'station');
  const sentFit = await ev(AA.page, () => {
    const room = window.T.room;
    const send = room.send;
    let fit: { line: number; part: number; revision: number } | undefined;
    room.send = (m: { t: string; e?: { op: string; line: number; part: number; revision: number } }) => {
      if (m.t === 'r:edit' && m.e?.op === 'rail.install') fit = m.e;
      return send.call(room, m);
    };
    try {
      window.T.railIntent({ op: 'rail.install', line: 3, part: 6, revision: 0 });
      return fit;
    } finally {
      room.send = send;
    }
  });
  railCheck(
    'the browser probe forwards the bay Strong install',
    sentFit?.line === 3 && sentFit.part === 6 && sentFit.revision === 0,
    JSON.stringify(sentFit),
  );
  await waitFor(async () => (await adapter(AA)).session.pending === 0);
  railCheck('adapter sends a wake', await ev(AA.page, () => window.T.railIntent({ op: 'rail.wake' })));
  railCheck(
    'adapter wake retires and both show idle',
    (await waitFor(async () =>
      (await Promise.all([AA, AB].map(adapter))).every((p) => p.rows.phase === 'idle' && p.session.pending === 0),
    )) >= 0,
  );
  const beforeRejected = await adapter(AA);
  railCheck(
    'adapter sends an out-of-reach stroke',
    await ev(AA.page, () => window.T.railIntent({ op: 'rail.chop', id: 0, yaw: 0, collapsed: false })),
  );
  railCheck(
    'a refused stroke is shown at once, then retires and gives its logs back',
    (await waitFor(async () => {
      const p = await adapter(AA);
      return (
        p.session.ready &&
        p.session.pending === 0 &&
        backOf(p) === 0 &&
        p.effects.length === beforeRejected.effects.length + 1 &&
        p.effects.at(-1)!.predicted === true &&
        p.corrections.length === beforeRejected.corrections.length + 1 &&
        p.corrections.at(-1)!.reason === 'refused'
      );
    })) >= 0,
  );
  await sleep(RAILWAY_T1.swingMs);
  await pose(AA, 'source');
  // Two strokes at once: the second is sooner than the swing cadence, so it is "not yet" and never sent.
  const burst = await ev(
    AA.page,
    (id: number) => [0, 1].map(() => window.T.railIntent({ op: 'rail.chop', id, yaw: 0, collapsed: false })),
    RAILWAY_SOURCES[0]![0],
  );
  railCheck('a stroke sooner than the swing cadence is not sent', burst[0] === true && burst[1] === false);
  // A tree holds ten logs and a hit gives 1 before the keener edge: seven more strokes on a fresh tree fill the row of
  // 8 logs, then test the full row against another unspent tree so refusal proves the carry bound, not exhaustion.
  await pose(AA, 'source', RAILWAY_SOURCES[1]![0]);
  const incoming = await ev(
    AA.page,
    async ({ id, spare, every }: { id: number; spare: number; every: number }) => {
      const queued: boolean[] = [];
      for (let n = 0; n < 9; n++) {
        await new Promise((r) => setTimeout(r, every));
        if (n === 7) window.T.railPose('source', spare);
        queued.push(window.T.railIntent({ op: 'rail.chop', id: n < 7 ? id : spare, yaw: 0, collapsed: false }));
      }
      return { queued, probe: window.T.railAdapter() };
    },
    { id: RAILWAY_SOURCES[1]![0], spare: RAILWAY_SOURCES[2]![0], every: RAILWAY_T1.swingMs + 10 },
  );
  railCheck(
    'predicted strokes cannot offer more than the eight log squares',
    incoming.queued.filter(Boolean).length === 7 && backOf(incoming.probe) === 8 && incoming.probe.rows.freeCarry === 0,
    JSON.stringify({ queued: incoming.queued, carry: backOf(incoming.probe), free: incoming.probe.rows.freeCarry }),
  );
  railCheck(
    'every burst stroke retires; what was shown minus what was given back is what is carried',
    (await waitFor(async () => {
      const p = await adapter(AA);
      const chops = p.effects.filter((e) => e.op === 'rail.chop');
      const returned = p.corrections.filter((x) => x.event.op === 'rail.chop').reduce((n, x) => n + x.lost, 0);
      const harvested = chops.reduce((n, e) => n + e.accepted, 0) - returned;
      return (
        p.session.pending === 0 &&
        backOf(p) === harvested &&
        new Set(chops.map((e) => e.request)).size === chops.length &&
        p.rows.counts.total === INITIAL + p.rows.counts.produced
      );
    })) >= 0,
  );
  await pose(AA, 'source');
  while (backOf(await adapter(AA)) < 8) {
    await sleep(RAILWAY_T1.swingMs);
    const before = backOf(await adapter(AA));
    await ev(
      AA.page,
      (id: number) => window.T.railIntent({ op: 'rail.chop', id, yaw: 0, collapsed: false }),
      RAILWAY_SOURCES[0]![0],
    );
    await waitFor(async () => backOf(await adapter(AA)) > before && (await adapter(AA)).session.pending === 0);
  }
  await pose(AA, 'station');
  const outgoing = await ev(
    AA.page,
    async (every: number) => {
      const queued: boolean[] = [];
      for (let n = 0; n < 9; n++) {
        await new Promise((r) => setTimeout(r, every));
        queued.push(window.T.railIntent({ op: 'rail.deposit', station: 'T1', n: 1 }));
      }
      return { queued, probe: window.T.railAdapter() };
    },
    RAILWAY_T1.unloadMs + 10,
  );
  railCheck(
    'eight predicted deposits show at once and prevent a ninth spend',
    outgoing.queued.filter(Boolean).length === 8 &&
      backOf(outgoing.probe) === 0 &&
      outgoing.probe.rows.jobs[0]!.job.stock === 8,
  );
  railCheck(
    'every deposit retires and only accepted logs leave carry, in both mirrors',
    (await waitFor(async () => {
      const states = await Promise.all([AA, AB].map(adapter));
      const s = states[0]!.rows;
      return (
        states[0]!.session.pending === 0 &&
        s.counts.stock > 0 &&
        states.every(
          (p) =>
            p.rows.counts.stock === s.counts.stock &&
            p.rows.counts.carry === 8 - s.counts.stock &&
            p.rows.counts.total === INITIAL + p.rows.counts.produced,
        )
      );
    })) >= 0,
  );
  const settled = await adapter(AA);
  await AB.page.reload();
  await ev(AB.page, () => window.T.start());
  railCheck(
    'a reload rebuilds balances without replaying effects',
    (await waitFor(async () => {
      const p = await adapter(AB);
      return p.session.ready && p.rows.counts.stock === settled.rows.counts.stock && p.effects.length === 0;
    })) >= 0,
  );
  await c.restart();
  railCheck(
    'adapters reconnect after a restart with a new epoch, exact balances and no replayed effects',
    (await waitFor(async () => {
      const p = await adapter(AA);
      return (
        (await adapterReady()) &&
        p.session.epoch === settled.session.epoch + 1 &&
        p.rows.counts.stock === settled.rows.counts.stock &&
        p.rows.counts.carry === settled.rows.counts.carry &&
        p.effects.length === settled.effects.length
      );
    }, 15000)) >= 0,
  );
  railCheck('reconnected adapter mirrors agree', await agree([AA, AB]));
  await Promise.all([AA, AB].map((p) => p.page.close()));
}

const pct = (xs: number[], q: number) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))]!;
};

/** R1a's and R1b's measurements: players x added latency x churn, every player driving the real predicting adapter.
 * Returns the rows it printed. */
export async function railwayLoad(
  c: Ctx,
  { players = [2, 4, 6], lat = [0, 100, 200], seconds = 15, churns = ['normal', '5x'] } = {},
) {
  const rows: Record<string, number | string>[] = [];
  for (const churn of [
    { name: 'normal', every: 500 },
    { name: '5x', every: 100 },
    // Everyone at one tree, dropping on and taking from the same pile: the contest case (opt in with WS_LOAD_CHURN).
    { name: 'crowd', every: 500, crowd: true },
  ].filter((x) => churns.includes(x.name)))
    for (const n of players)
      for (const l of lat) {
        const id = `${c.room}-l${n}-${l}-${churn.name}`;
        const roomId = railwayRoomId(id);
        const pages: Page[] = [];
        for (let k = 0; k < n; k++)
          pages.push(
            await c.web.open(
              `L${k}`,
              `room=${roomId}&server=http://127.0.0.1:${c.port()}&pid=load${k}&lat=${l}&adapter=1`,
            ),
          );
        // Each adapter opens its own session once the whole state has arrived.
        await waitFor(async () => (await Promise.all(pages.map(adapter))).every((p) => p.session.ready), 15000);
        await ev(pages[0]!.page, () => window.T.railPose('station'));
        await ev(pages[0]!.page, () => window.T.railIntent({ op: 'rail.wake' }));
        await waitFor(async () => (await Promise.all(pages.map(adapter))).every((p) => p.rows.phase === 'idle'), 10000);
        await ev(pages[0]!.page, () => {
          window.T.railResponse.length = 0;
          window.T.railCorrections.length = 0;
        });
        const hosted = c.hosted(roomId)!;
        const world = hosted.world as RailwayWorldHost;
        const stats0 = { ...world.stats };
        const rep0 = { ...hosted.status().replication };
        const saves0 = world.sync.worldStatus().saves;
        const t0 = Date.now();
        await Promise.all(
          pages.map((p, k) =>
            ev(p.page, (o: { ms: number; every: number; first: number }) => window.T.railLoad(o), {
              ms: seconds * 1000,
              every: churn.every,
              first: 'crowd' in churn ? 0 : k * 40,
            }),
          ),
        );
        const t1 = Date.now();
        await sleep(l + 400); // the last answers arrive
        // Latency: send (on the actor's page, before the added delay) to the event's arrival, actor and observers.
        type Log = {
          sent: { at: number; epoch: number; request: number }[];
          events: { at: number; pid: string; request: number }[];
          packets: { at: number; chars: number; ok?: number[][] }[];
          response: number[];
          corrections: { at: number; op: string; lost: number; reason: string }[];
          stats: { predicted: number; notYet: number; unpredicted: number };
        };
        const logs: Log[] = await Promise.all(
          pages.map((p) =>
            ev(p.page, () => ({
              sent: window.T.railSent,
              events: window.T.railEvents,
              packets: window.T.railPackets,
              response: window.T.railResponse,
              corrections: window.T.railCorrections,
              stats: window.T.railAdapter().session.prediction,
            })),
          ),
        );
        // Actor: press to its predicted effect (the visible response; the frame adds at most one frame). Confirm:
        // the press to the server's event for it arriving (R1a's actor latency, now invisible).
        const actor = logs.flatMap((log) => log.response),
          confirm: number[] = [],
          others: number[] = [];
        let accepted = 0;
        logs.forEach((log, k) => {
          for (const s of log.sent) {
            if (s.at < t0) continue;
            const pid = `load${k}`;
            // The server answers the actor's prediction with `ok` (no echoed event); everyone else hears the event.
            const mine = log.packets.find((p) => p.ok?.some(([e, r]) => e === s.epoch && r === s.request));
            if (!mine) continue;
            accepted++;
            confirm.push(mine.at - s.at);
            logs.forEach((other, j) => {
              if (j === k) return;
              const seen = other.events.find((e) => e.pid === pid && e.request === s.request);
              if (seen) others.push(seen.at - s.at);
            });
          }
        });
        const kbits = logs.map(
          (log) =>
            (log.packets.filter((p) => p.at >= t0 && p.at <= t1 + l).reduce((sum, p) => sum + p.chars + ENVELOPE, 0) *
              8) /
            1000 /
            ((t1 - t0) / 1000),
        );
        const rep = hosted.status().replication;
        const steps = world.stats.steps - stats0.steps;
        // Late join: one more page, from page start to a whole mirror.
        const late = await c.web.open('LJ', `room=${roomId}&server=http://127.0.0.1:${c.port()}&pid=latejoin&lat=${l}`);
        await waitFor(async () => (await rail(late)).ready, 10000);
        const join = await ev(late.page, () => {
          const T = window.T;
          return { ms: T.railSyncedAt - T.railStartAt, chars: T.railSyncedChars, packets: T.railSyncedPackets };
        });
        // Conservation on the server and agreement of every mirror at quiescence.
        await sleep(300);
        const counts = world.rules.railway.counts();
        const conserved =
          counts.total === INITIAL + counts.produced &&
          counts.stone!.total === RAIL_STONE + counts.stone!.produced &&
          counts.rails!.total === 0;
        const probes = await Promise.all([...pages, late].map(rail));
        const mirrorsAgree = probes.every((s) => s.hash === probes[0]!.hash && s.counts.total === counts.total);
        world.sync.saveNow(true);
        await world.sync.whenDurable();
        const saveBytes = (await fs.stat(path.join(c.dataDir, `${roomId}.json`))).size;
        const row = {
          churn: churn.name,
          players: n,
          lat: l,
          accepted,
          actionsPerSec: Math.round((accepted / (seconds * n)) * 10) / 10,
          actorP50: Math.round(pct(actor, 0.5) * 100) / 100,
          actorP95: Math.round(pct(actor, 0.95) * 100) / 100,
          actorMax: Math.round(Math.max(...actor) * 100) / 100,
          confirmP50: pct(confirm, 0.5),
          predicted: logs.reduce((n, log) => n + log.stats.predicted, 0),
          corrections: logs.reduce((n, log) => n + log.corrections.filter((x) => x.at >= t0).length, 0),
          correctionsPerPlayerMin:
            Math.round(
              (logs.reduce((n, log) => n + log.corrections.filter((x) => x.at >= t0).length, 0) /
                n /
                ((t1 - t0) / 60000)) *
                100,
            ) / 100,
          notYet: logs.reduce((n, log) => n + log.stats.notYet, 0),
          // Corrections by op and reason, e.g. "rail.chop refused": 3.
          correctionReasons: JSON.stringify(
            logs
              .flatMap((log) => log.corrections.filter((x) => x.at >= t0))
              .reduce<Record<string, number>>(
                (o, x) => ((o[`${x.op} ${x.reason}`] = (o[`${x.op} ${x.reason}`] ?? 0) + 1), o),
                {},
              ),
          ),
          othersP50: pct(others, 0.5),
          othersP95: pct(others, 0.95),
          kbitMean: Math.round((kbits.reduce((a, b) => a + b, 0) / kbits.length) * 10) / 10,
          kbitMax: Math.round(Math.max(...kbits) * 10) / 10,
          lateJoinBytes: join.chars + join.packets * ENVELOPE,
          lateJoinMs: join.ms,
          saveBytes,
          checkpointsPerMin:
            Math.round(((world.sync.worldStatus().saves - saves0 - 1) / ((t1 - t0) / 60000)) * 10) / 10,
          stepMsMean: Math.round(((world.stats.stepMs - stats0.stepMs) / Math.max(1, steps)) * 1000) / 1000,
          wakeMsMax: Math.round(world.stats.maxStepMs * 100) / 100,
          flushMsMean: Math.round(((rep.ms - rep0.ms) / Math.max(1, rep.steps - rep0.steps)) * 1000) / 1000,
          actionMsMean:
            Math.round(
              ((world.stats.actionMs - stats0.actionMs) / Math.max(1, world.stats.actions - stats0.actions)) * 1000,
            ) / 1000,
          conserved: String(conserved),
          mirrorsAgree: String(mirrorsAgree),
        };
        rows.push(row);
        console.log(`  railway load ${JSON.stringify(row)}`);
        c.check(`railway load ${churn.name} ${n}p ${l}ms conserves material`, conserved);
        c.check(`railway load ${churn.name} ${n}p ${l}ms mirrors agree`, mirrorsAgree);
        await Promise.all([...pages, late].map((p) => p.page.close()));
      }
  const out = new URL('../../.look/replication-r1b/', import.meta.url);
  await fs.mkdir(out, { recursive: true });
  await fs.writeFile(new URL('load.json', out), JSON.stringify(rows, null, 2));
  console.table(rows);
  return rows;
}

/** WS_LOAD_CHURN=cart: the depot cart ridden across tabs (docs/plans/line2-part2-greybox.md, B3). A room at Q4 with its
 * cart running, three tabs at 0, 100 and 200 ms added latency. Each tab places the cart from its own estimate of the
 * server's tick. A rider on one tab is drawn on the others at their own copy of the deck (the shared platform), so they
 * stay on it there; how far the tabs' carts are apart at one instant is how far two players' views of cart and rider
 * disagree (kept under half the deck, 1.35 m), and a tab's cart jumping between frames is what would throw its own
 * rider. */
export async function railwayCartRide(c: Ctx, { seconds = 60 } = {}) {
  const { railwayAtQ4 } = await import('../../src/sim/railway-seed-route.ts');
  const { railwayCheck } = await import('../../src/sim/railway-check.ts');
  const { CART, CART_PHASE } = await import('../../src/sim/railway-cart.ts');
  const q4 = railwayAtQ4(); // built before the room opens: it holds the event loop ~20 s
  const roomId = railwayRoomId(`${c.room}-cart`);
  const lats = [0, 100, 200];
  const pages: Page[] = [];
  for (const [k, l] of lats.entries())
    pages.push(
      await c.web.open(`C${k}`, `room=${roomId}&server=http://127.0.0.1:${c.port()}&pid=cart${k}&lat=${l}&adapter=1`),
    );
  await waitFor(async () => (await Promise.all(pages.map(adapter))).every((p) => p.session.ready), 15000);
  const world = c.hosted(roomId)!.world as RailwayWorldHost;
  // The built world's clock is ahead of this fresh room's: wait for the room to pass it, then load it.
  await waitFor(() => world.sync.world.tick > q4.t + 5, (q4.t + 60) * 100);
  world.rules.railway.world().load(JSON.parse(JSON.stringify(q4.w.snapshot())), railwayCheck);
  world.rules.railway.touchAll();
  const cartOf = (p: Page) => ev(p.page, () => window.T.railCart());
  // Every tab has the loaded world's cart (its phase and where it set out), then a moment to settle: the load itself
  // relocates the cart, which is a restart, not a ride.
  const server = () => cartRow(world.rules.railway.world());
  await waitFor(async () => {
    const want = server();
    return (await Promise.all(pages.map(adapter))).every(
      (p) => p.rows.cart.phase === want.phase && p.rows.cart.depart === want.depart,
    );
  }, 10000);
  await sleep(2000);
  type Sample = { along: number; phase: number; at: number };
  const series: Sample[][] = lats.map(() => []);
  let apart = 0;
  const phases = new Set<number>();
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    const now = (await Promise.all(pages.map(cartOf))) as Sample[];
    now.forEach((x, k) => series[k]!.push(x));
    // Only while every tab has the same phase (a phase change reaches each tab after its own latency).
    if (now.every((x) => x.phase === now[0]!.phase)) {
      const base = now[0]!;
      // Less what the cart can travel between the two pages' sample instants (cruise: CART.speed cm per 100 ms).
      for (const x of now)
        apart = Math.max(apart, Math.abs(x.along - base.along) - (CART.speed / 100) * Math.abs(x.at - base.at));
    }
    for (const x of now) phases.add(x.phase);
    await sleep(50);
  }
  // A tab's cart between two samples never moves faster than cruise (plus the sample's own timing slack).
  const jumps = series.map((s) =>
    s.slice(1).reduce((m, x, i) => {
      const dt = Math.max(1, x.at - s[i]!.at) / 100; // ticks
      return Math.max(m, Math.abs(x.along - s[i]!.along) - CART.speed * dt * 1.25);
    }, 0),
  );
  const moved = phases.has(CART_PHASE.OUT) || phases.has(CART_PHASE.RUN) || phases.has(CART_PHASE.BACK);
  const row = {
    seconds,
    phases: [...phases].sort().join(','),
    tabsApartMaxCm: Math.round(apart),
    jumpMaxCm: Math.round(Math.max(...jumps)),
    samples: series[0]!.length,
  };
  console.log(`  railway cart ride ${JSON.stringify(row)}`);
  c.check('railway cart ride: the cart ran while sampled', moved, row.phases);
  c.check(
    'railway cart ride: tabs place the cart within half a deck of each other',
    apart < 135,
    `${row.tabsApartMaxCm} cm`,
  );
  c.check('railway cart ride: no tab jumps its cart under a rider', Math.max(...jumps) < 50, `${row.jumpMaxCm} cm`);
  await Promise.all(pages.map((p) => p.page.close()));
  return row;
}

/** WS_LOAD_CHURN=train: the line-2 kit train across three tabs at 0/100/200 ms. Same sample clock as the cart. */
export async function railwayTrainRide(c: Ctx, { seconds = 60 } = {}) {
  const { railwayAtTrains } = await import('../../src/sim/railway-seed-route.ts');
  const { railwayCheck } = await import('../../src/sim/railway-check.ts');
  const { TRAIN, TRAIN_PHASE, trainAlong } = await import('../../src/sim/railway-train.ts');
  // WS_LOAD_TRAIN_SEED=wagon-on rides the line-2 train with its footing wagon and four stops (Works J3).
  const seed =
    process.env.WS_LOAD_TRAIN_SEED === 'wagon-on'
      ? (await import('../../src/sim/railway-seed-works.ts')).railwayAtWorks('wagon-on')
      : railwayAtTrains('trains-on');
  const roomId = railwayRoomId(`${c.room}-train`);
  const lats = [0, 100, 200];
  const pages: Page[] = [];
  for (const [k, l] of lats.entries())
    pages.push(
      await c.web.open(`T${k}`, `room=${roomId}&server=http://127.0.0.1:${c.port()}&pid=train${k}&lat=${l}&adapter=1`),
    );
  await waitFor(async () => (await Promise.all(pages.map(adapter))).every((p) => p.session.ready), 15000);
  const world = c.hosted(roomId)!.world as RailwayWorldHost;
  // The built world's clock is ahead of this fresh room's: advance the disposable room to pass it, then load it.
  await advancePast(world, seed.t + 5);
  world.rules.railway.world().load(JSON.parse(JSON.stringify(seed.w.snapshot())), railwayCheck);
  world.rules.railway.touchAll();
  const trainOf = (p: Page) => ev(p.page, () => window.T.railTrain(1));
  // Every tab has the loaded world's train (its phase and where it set out), then a moment to settle: the load itself
  // relocates the train, which is a restart, not a ride.
  const server = () => trainRow(world.rules.railway.world(), 1);
  await waitFor(async () => {
    const want = server();
    return (await Promise.all(pages.map(adapter))).every(
      (p) => p.rows.trains[1]!.phase === want.phase && p.rows.trains[1]!.depart === want.depart,
    );
  }, 10000);
  await sleep(2000);
  type Sample = NonNullable<Awaited<ReturnType<typeof trainOf>>>;
  const series: Sample[][] = lats.map(() => []);
  let apart = 0;
  let sameInstantApart = 0,
    sampleSkew = 0,
    clockSpread = 0,
    conservativeSpread = 0;
  const phases = new Set<number>();
  const stats0 = { ...world.stats };
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    const now = (await Promise.all(pages.map(trainOf))) as Sample[];
    now.forEach((x, k) => series[k]!.push(x));
    // Only while every tab has the same phase (a phase change reaches each tab after its own latency).
    if (now.every((x) => x.phase === now[0]!.phase && x.depart === now[0]!.depart)) {
      const base = now[0]!;
      const at = Math.max(...now.map((x) => x.at));
      sampleSkew = Math.max(sampleSkew, at - Math.min(...now.map((x) => x.at)));
      // Project each tab's own train/clock sample to one wall instant. This removes RPC polling skew, not clock skew.
      const poses = now.map((x) => trainAlong(x.row, 1, x.tick + (at - x.at) / 100));
      sameInstantApart = Math.max(sameInstantApart, Math.max(...poses) - Math.min(...poses));
      const clocks = now.map((x) => x.tick * 100 + at - x.at);
      const conservative = now.map((x) => x.conservativeTick * 100 + at - x.at);
      clockSpread = Math.max(clockSpread, Math.max(...clocks) - Math.min(...clocks));
      conservativeSpread = Math.max(conservativeSpread, Math.max(...conservative) - Math.min(...conservative));
      // Less what the train can travel between the two pages' sample instants (cruise: TRAIN.speed cm per 100 ms).
      for (const x of now)
        apart = Math.max(apart, Math.abs(x.along - base.along) - (TRAIN.speed / 100) * Math.abs(x.at - base.at));
    }
    for (const x of now) phases.add(x.phase);
    await sleep(50);
  }
  // A tab's train between two samples never moves faster than cruise (plus the sample's own timing slack).
  const jumps = series.map((s) =>
    s.slice(1).reduce((m, x, i) => {
      const dt = Math.max(1, x.at - s[i]!.at) / 100; // ticks
      return Math.max(m, Math.abs(x.along - s[i]!.along) - TRAIN.speed * dt * 1.25);
    }, 0),
  );
  const moved = phases.has(TRAIN_PHASE.RUN);
  const row = {
    seconds,
    stepMsMean: (world.stats.stepMs - stats0.stepMs) / Math.max(1, world.stats.steps - stats0.steps),
    stepMsMax: world.stats.maxStepMs,
    phases: [...phases].sort().join(','),
    tabsApartMaxCm: Math.round(apart),
    sameInstantApartMaxCm: Math.round(sameInstantApart),
    clockSpreadMaxMs: Math.round(clockSpread),
    conservativeSpreadMaxMs: Math.round(conservativeSpread),
    sampleSkewMaxMs: Math.round(sampleSkew),
    jumpMaxCm: Math.round(Math.max(...jumps)),
    samples: series[0]!.length,
  };
  console.log(`  railway train ride ${JSON.stringify(row)}`);
  c.check('railway train ride: the train ran while sampled', moved, row.phases);
  c.check(
    'railway train ride: tabs place the train within half a deck of each other',
    apart < 160 && sameInstantApart < 160,
    `${row.tabsApartMaxCm} cm`,
  );
  c.check('railway train ride: no tab jumps its train under a rider', Math.max(...jumps) < 50, `${row.jumpMaxCm} cm`);
  await Promise.all(pages.map((p) => p.page.close()));
  return row;
}

/** Request stops (works-late-game step 1; generic-lines v26) over the real server: three adapter tabs at 0/100/200 ms
 * in a trains-on room. Line 2's two trains are mirrored on every tab. A lever request from the quarry's down platform
 * is accepted once and mirrored as the line's ask (`Line.req`); a friend's same request is a noop and a press from off
 * the platform is refused; every tab's mirror names the same serving train (trainServes over its rows), and only that
 * train stands at the quarry for it, leaving that way, while the other never stops there. Every tab agrees on the row.
 * The server is stepped ahead rather than waited for (state, not timing). */
export async function railwayRequestStop(c: Ctx) {
  const { railwayAtTrains } = await import('../../src/sim/railway-seed-route.ts');
  const { railwayCheck } = await import('../../src/sim/railway-check.ts');
  const { LINE_HALTS, TRAIN_PHASE, reqHas } = await import('../../src/sim/railway-train.ts');
  const { trainStops } = await import('../../src/sim/railway-queries-trains.ts');
  const { LINE2, RAIL_LINES, haltPlatform, lineRows } = await import('../../src/sim/railway-lines.ts');
  const { LINE_SLOTS, trainServes } = await import('../../src/sim/railway-trains.ts');
  const seed = railwayAtTrains('trains-on');
  const roomId = railwayRoomId(`${c.room}-request`);
  // A plain mirror (no session) brings the room up; the seed loads before any player opens a session, since a load
  // replaces the accounts a live session's next action would read.
  const host = await c.web.open('Q-host', `room=${roomId}&server=http://127.0.0.1:${c.port()}&pid=reqhost`);
  const world = await hostedWorld(c, roomId);
  await advancePast(world, seed.t + 5);
  world.rules.railway.world().load(JSON.parse(JSON.stringify(seed.w.snapshot())), railwayCheck);
  world.rules.railway.touchAll();
  const pages: Page[] = [];
  for (const [k, l] of [0, 100, 200].entries())
    pages.push(
      await c.web.open(`Q${k}`, `room=${roomId}&server=http://127.0.0.1:${c.port()}&pid=req${k}&lat=${l}&adapter=1`),
    );
  await host.page.close();
  await waitFor(async () => (await Promise.all(pages.map(adapter))).every((p) => p.session.ready), 15000);
  // The server's world, read again at each use (ECS M11): a load replaces the world, and the rules write rows in place.
  const live = () => world.rules.railway.world();
  const slots = LINE_SLOTS[LINE2]!;
  // A lever ask is the line's (`Line.req`), served by whichever of line 2's trains can brake for it.
  const leverReq = () => lineRow(live(), LINE2).req;
  const n = trainStops(live(), 1).length;
  const quarry = LINE_HALTS.findIndex((h) => h.name === 'Quarry');
  // The homeward ask is taken from the platform the homeward train stops at (v45: the offset side at a middle halt).
  const h = { ...LINE_HALTS[quarry]!, ...haltPlatform(quarry, -1) };
  const asked = (req: number) => reqHas(req, h.stop, -1, n);
  // Accepted requests by this tab's own player (every tab hears everyone's).
  const accepted = async (p: Page, pid: string) =>
    (await adapter(p)).effects.filter((e) => e.op === 'rail.call' && e.pid === pid).length;
  const ask = (p: Page, at: [number, number, number]) =>
    ev(
      p.page,
      ({ at, id }) => {
        window.T.railStand(at[0], at[1], at[2]);
        return window.T.railIntent({ op: 'rail.call', id, dir: -1 });
      },
      { at, id: quarry },
    );
  await waitFor(
    async () => (await Promise.all(pages.map(adapter))).every((p) => p.rows.lines[LINE2]!.req === leverReq()),
    10000,
  );
  const sameRow = (a: { phase: number; at: number; track: number; dest: number }, b: typeof a) =>
    a.phase === b.phase && a.at === b.at && a.track === b.track && a.dest === b.dest;
  const bothMirrored = await waitFor(async () => {
    const all = await Promise.all(pages.map(adapter));
    return all.every((p) => slots.every((k) => sameRow(p.rows.trains[k]!, trainRow(live(), k))));
  }, 10000);
  c.check(
    `request stop: every tab mirrors line 2's ${slots.length} trains`,
    // Every row line 2 has: its fleet's two shed rows too (the greybox route, v32), mirrored where they wait.
    slots.length === lineRows(RAIL_LINES[LINE2]!) && bothMirrored >= 0,
  );
  c.check('request stop: the seed starts with nothing asked at the quarry', !asked(leverReq()));
  // From off the platform: refused, nothing set.
  await ask(pages[2]!, [h.x + h.reach + 3000, h.y, h.z]);
  await sleep(600);
  c.check('request stop: a press from off the platform sets nothing', !asked(leverReq()));
  await ask(pages[0]!, [h.x, h.y, h.z]);
  const set = await waitFor(async () => asked(leverReq()), 5000);
  c.check('request stop: the lever request is accepted by the server', set >= 0);
  const mirrored = await waitFor(
    async () => (await Promise.all(pages.map(adapter))).every((p) => asked(p.rows.lines[LINE2]!.req)),
    5000,
  );
  c.check('request stop: every tab mirrors the request', mirrored >= 0);
  c.check(
    'request stop: the asker hears it accepted',
    (await waitFor(async () => (await accepted(pages[0]!, 'req0')) > 0, 5000)) >= 0,
  );
  const before = leverReq();
  await ask(pages[1]!, [h.x, h.y, h.z]);
  await sleep(800);
  c.check(
    "request stop: a friend's same request moves nothing",
    leverReq() === before && (await accepted(pages[1]!, 'req1')) === 0,
    `req ${before} -> ${leverReq()}`,
  );
  // Who serves it: the server's rows and every tab's mirrored rows name the same train at the server's tick.
  const serves = (rows: readonly { phase: number }[], tick: number) =>
    trainServes((k) => rows[k] as never, LINE2, trainStops(live(), LINE2), h.stop, -1, tick);
  const tick0 = world.sync.world.tick,
    named = serves(trainRows(live()), tick0);
  const tabsNamed = (await Promise.all(pages.map(adapter))).map((p) => serves(p.rows.trains, tick0));
  c.check(
    'request stop: every tab names the same serving train as the server',
    named >= 0 && tabsNamed.every((k) => k === named),
    `server ${named}, tabs ${tabsNamed.join(',')}`,
  );
  // Step the server ahead until one of line 2's trains stands at the quarry on the down track; the serving train is
  // re-read each step (it only moves back when the named one can no longer brake).
  let slot = -1,
    serving = named;
  for (let k = 0; k < 6000 && slot < 0; k++) {
    world.step(0.1);
    slot =
      slots.find((i) => {
        const r = trainRow(live(), i);
        return r.phase === TRAIN_PHASE.STAND && r.at === h.stop && r.track === 1;
      }) ?? -1;
    if (slot < 0) serving = serves(trainRows(live()), world.sync.world.tick);
  }
  const stood = slot >= 0;
  const row = trainRow(live(), Math.max(slot, slots[0]!));
  c.check('request stop: a train stands at the quarry, leaving toward the village', stood, JSON.stringify(row));
  c.check(
    'request stop: the serving train is the one that stops',
    stood && slot === serving,
    `stood ${slot}, serving ${serving}, named first ${named}`,
  );
  const agreed = await waitFor(async () => {
    const all = await Promise.all(pages.map(adapter));
    return all.every((p) => sameRow(p.rows.trains[Math.max(slot, slots[0]!)]!, row));
  }, 10000);
  c.check('request stop: every tab agrees on the standing train', agreed >= 0);
  await Promise.all(pages.map((p) => p.page.close()));
}

// Ring Island's leaf (docs/plans/ring-island-build1.md, R4c; the P1 of 11 November): the Aperture row mirrored on three
// tabs at 0, 100 and 200 ms through its states (raised, braced and dipped, down, joined), with the brace from one
// player and the counterweight from another, a late joiner while it is braced and part hung, a reload while it is
// down, and a restart once joined. The leaf's pose is a pure function of the row (leaf-shape.ts `leafRest`, snapped on
// a page's first ready frame), so the row on every tab is the pose on every tab.
export async function railwayLeaf(c: Ctx) {
  const { railwayAtRing } = await import('../../src/sim/railway-seed-ring.ts');
  const { railwayCheck } = await import('../../src/sim/railway-check.ts');
  const { aperture } = await import('../../src/sim/railway-rows.ts');
  const { RING_BRACE, RING_HEAD, RING_RIVET } = await import('../../src/sim/railway-ring-layout.ts');
  const { leafRest } = await import('../../src/entities/railway/leaf-shape.ts');
  const seed = railwayAtRing('leaf-raised');
  const roomId = railwayRoomId(`${c.room}-leaf`);
  const url = (pid: string, lat: number) =>
    `room=${roomId}&server=http://127.0.0.1:${c.port()}&pid=${pid}&lat=${lat}&adapter=1`;
  // As railwayRequestStop: a plain mirror brings the room up and the seed loads before any session opens.
  const host = await c.web.open('L-host', `room=${roomId}&server=http://127.0.0.1:${c.port()}&pid=leafhost`);
  const world = await hostedWorld(c, roomId);
  await advancePast(world, seed.t + 5);
  world.rules.railway.world().load(JSON.parse(JSON.stringify(seed.w.snapshot())), railwayCheck);
  world.rules.railway.touchAll();
  const brace = await c.web.open('L0', url('leaf0', 0)),
    hanger = await c.web.open('L1', url('leaf1', 100));
  await host.page.close();
  let pages = [brace, hanger];
  // The server's row, read again at each use (a restart replaces the hosted world).
  const live = () => aperture((c.hosted(roomId)!.world as RailwayWorldHost).rules.railway.world());
  const row = (r: { set: number; rack: number; cw: number; brace: number; joined: number }) =>
    [r.set, r.rack, r.cw, r.brace, r.joined >= 0 ? 1 : -1].join();
  // A tab's adapter probe, or null while a reloaded page is still starting.
  const tab = (p: Page) => adapter(p) as Promise<RailwayAdapterProbe | null>;
  const mirrored = async (label: string, want: string, ms = 10000) => {
    const ok = await waitFor(async () => {
      const all = await Promise.all(pages.map(tab));
      return (
        row(live()) === want &&
        all.every((p) => p?.session.ready && p.session.pending === 0 && row(p.rows.ring) === want)
      );
    }, ms);
    const all = await Promise.all(pages.map(tab));
    c.check(
      `leaf: ${label}`,
      ok >= 0,
      `server ${row(live())} (pose ${leafRest(live().brace, live().cw, live().joined)}), tabs ${all.map((p) => (p ? row(p.rows.ring) : 'loading')).join(' / ')}, want ${want}`,
    );
  };
  const act = (p: Page, at: { x: number; y: number; z: number }, intent: Record<string, unknown>) =>
    ev(
      p.page,
      ({ at, intent }) => {
        window.T.railStand(at.x, at.y, at.z);
        return window.T.railIntent(intent as never);
      },
      { at: { x: at.x, y: at.y, z: at.z }, intent },
    );
  const head = RING_HEAD[RING_HEAD.length - 1]!;
  const hang = async () => {
    const before = live().cw;
    await act(hanger, head.rack, { op: 'rail.footTake', rack: 2 });
    await waitFor(
      async () => (await adapter(hanger)).session.pending === 0 && (await adapter(hanger)).rows.account?.foot === 1,
    );
    await act(hanger, head.jib, { op: 'rail.footSet', site: 3 });
    await waitFor(async () => live().cw > before && (await adapter(hanger)).session.pending === 0);
  };
  await mirrored('both tabs mirror the raised leaf (14 set, 4 racked, none hung, on its pawl)', '14,4,0,1,-1', 15000);
  await hang();
  await hang();
  await act(brace, RING_BRACE, { op: 'rail.brace', revision: 1 });
  await mirrored("one player's brace and the other's two weights: braced and dipped on both tabs", '14,2,2,2,-1');
  const late = await c.web.open('L2', url('leaf2', 200));
  pages = [brace, hanger, late];
  await mirrored('a late joiner at 200 ms gets the braced, half-hung leaf from the server', '14,2,2,2,-1');
  await hang();
  await hang();
  await mirrored('the fourth weight brings it down on all three tabs', '14,0,4,0,-1');
  // Each tab hears the others' accepted actions (the actor's own predicted ones are answered by its ack, not echoed).
  const heard = async (p: Page) =>
    ((await tab(p))?.effects ?? [])
      .filter((e) => e.op === 'rail.brace' || e.op === 'rail.footSet')
      .map((e) => `${e.op}:${e.pid}`)
      .join();
  const [heard0, heard2] = [await heard(brace), await heard(late)];
  c.check(
    'leaf: the server took the brace from one player and the weights from the other',
    heard0 === `rail.footSet:leaf1,rail.footSet:leaf1,rail.brace:leaf0,rail.footSet:leaf1,rail.footSet:leaf1` &&
      heard2 === 'rail.footSet:leaf1,rail.footSet:leaf1',
    `brace tab heard ${heard0}; late tab heard ${heard2}`,
  );
  await late.page.reload();
  await ev(late.page, () => window.T.start());
  await mirrored('a reloading tab gets the leaf down from the server', '14,0,4,0,-1');
  c.check('leaf: the reload replays nothing', (await heard(late)) === '');
  await act(brace, RING_RIVET, { op: 'rail.strike', id: 2 });
  await mirrored('the rivet: joined on all three tabs', '14,0,4,0,1');
  await c.restart();
  await mirrored('after a restart every tab reconnects to the joined leaf', '14,0,4,0,1', 20000);
  await Promise.all(pages.map((p) => p.page.close()));
}

// Ring Island build 2's Checkpoint A (docs/plans/ring-island-build2.md): a carrier leaving mid-carry from the steel
// yard, over real sockets. Three tabs at `steel-kit` (the whole kit in the island yard, the works cold). One player
// takes logs off the yard and loses their socket (ws-room's pause: a network loss, no `bye`); inside the room's
// reconnect grace the server keeps the logs on their account and both peers mirror it; they reconnect and feed the bill.
// A second player takes rails and stays away past the grace: the room departs them (peers hear `left`), and today's
// rules keep the rails on the absent account. The carry graces (server/src/host/host-maintenance.ts) cover the beam,
// the boiler, footings and a greybox leg's rack units, not the yard's kit: an `Account`'s logs and rails are its own
// and no release or return touches them. Nothing is lost (railCounts counts backs), and the yard's kit is never
// stranded by a leaver: the bill's need (steelNeed, src/sim/railway-queries.ts) never counted kit on a back, so a line 2
// train brings the lack out again. The leaver who comes back later still carries it and can feed it.
export async function railwayCarrierLeaves(c: Ctx) {
  const { railwayAtSteel } = await import('../../src/sim/railway-seed-steel.ts');
  const { railwayCheck } = await import('../../src/sim/railway-check.ts');
  const { account, steel } = await import('../../src/sim/railway-rows.ts');
  const { steelNeed } = await import('../../src/sim/railway-queries.ts');
  const { RING_STEEL_YARD, RING_STEEL_WORKS, STEEL } = await import('../../src/sim/railway-ring-layout.ts');
  const railCheck = (name: string, ok: boolean, detail = '') => {
    c.check(`carrier leaves: ${name}`, ok, detail);
    if (!ok) throw new Error(`Carrier proof stopped: ${name}${detail ? ` (${detail})` : ''}`);
  };
  const seed = railwayAtSteel('steel-kit');
  const roomId = railwayRoomId(`${c.room}-carry`);
  const url = (pid: string, lat: number) =>
    `room=${roomId}&server=http://127.0.0.1:${c.port()}&pid=${pid}&lat=${lat}&adapter=1`;
  // As railwayRequestStop: a plain mirror brings the room up and the seed loads before any session opens.
  const host = await c.web.open('K-host', `room=${roomId}&server=http://127.0.0.1:${c.port()}&pid=carryhost`);
  const world = await hostedWorld(c, roomId);
  await advancePast(world, seed.t + 5);
  world.rules.railway.world().load(JSON.parse(JSON.stringify(seed.w.snapshot())), railwayCheck);
  world.rules.railway.touchAll();
  const K0 = await c.web.open('K0', url('carry0', 0)),
    K1 = await c.web.open('K1', url('carry1', 100)),
    K2 = await c.web.open('K2', url('carry2', 200));
  await host.page.close();
  const pages = [K0, K1, K2];
  // The server's world, read again at each use (a load replaces it; the rules write rows in place).
  const live = () => world.rules.railway.world();
  const back = (pid: string) => {
    const a = account(live(), pid);
    return { logs: a?.carry ?? 0, rails: a?.rails ?? 0 };
  };
  /** The yard, the bill and every back: the kit's logs and rails the case moves, on the server. */
  const kit = () => {
    const s = steel(live());
    return { yardLogs: s.yardLogs, yardRails: s.yardRails, logs: s.logs, rails: s.rails, lit: s.lit };
  };
  // A tab's view of one player's back, from its own mirror (every tab mirrors every account row).
  const mirroredBack = async (p: Page, pid: string) => {
    const a = (await rail(p)).accounts.find((x) => x.pid === pid);
    return { logs: a?.carry ?? 0, rails: a?.rails ?? 0 };
  };
  /** Mirrors agree when they hash the same, every room total is conserved, and each shows `pid`'s back as the server. */
  const agree = async (group: Page[], pid: string) =>
    (await waitFor(async () => {
      const want = JSON.stringify(back(pid));
      const all = await Promise.all(group.map(rail));
      const backs = await Promise.all(group.map((p) => mirroredBack(p, pid)));
      return (
        all.every((s) => s.ready && s.hash === all[0]!.hash && s.counts.total === INITIAL + s.counts.produced) &&
        backs.every((b) => JSON.stringify(b) === want)
      );
    }, 10000)) >= 0;
  const intent = (p: Page, at: { x: number; y: number; z: number }, e: Record<string, unknown>) =>
    ev(
      p.page,
      ({ at, e }) => {
        window.T.railStand(at.x, at.y, at.z);
        return window.T.railIntent(e as never);
      },
      { at: { x: at.x, y: at.y, z: at.z }, e },
    );
  /** One intent through the tab's adapter, accepted when the server's rows show `done` and the tab has nothing pending. */
  const accept = async (
    name: string,
    p: Page,
    at: typeof RING_STEEL_YARD,
    e: Record<string, unknown>,
    done: () => boolean,
  ) => {
    railCheck(`${p.name} has a live session before ${String(e.op)}`, (await ready(p)) >= 0);
    await intent(p, at, e);
    const ok = await waitFor(async () => done() && (await adapter(p)).session.pending === 0, 10000);
    railCheck(
      name,
      ok >= 0,
      `server kit ${JSON.stringify(kit())}, backs ${JSON.stringify([back('carry0'), back('carry1')])}`,
    );
  };
  const connected = (p: Page) => ev(p.page, () => window.T.conn.at(-1)?.c === true);

  railCheck(
    'every tab is ready on the steel-kit seed',
    (await Promise.all(pages.map(ready))).every((t) => t >= 0),
  );
  const start = kit();
  railCheck(
    'the seed holds the whole kit in the yard, the works cold',
    start.yardLogs === STEEL.logs && start.yardRails === STEEL.rails && start.logs + start.rails === 0 && start.lit < 0,
    JSON.stringify(start),
  );

  // Run 1: a carrier loses their link mid-carry and comes back inside the grace.
  await accept(
    'the carrier takes logs off the yard',
    K0,
    RING_STEEL_YARD,
    { op: 'rail.steelTake', kind: 0 },
    () => back('carry0').logs > 0,
  );
  const logs = back('carry0').logs;
  railCheck('the take moves logs from the yard to the back, none made or lost', kit().yardLogs === STEEL.logs - logs);
  railCheck("every tab mirrors the carrier's back before the drop", await agree(pages, 'carry0'));
  const conns = await ev(K0.page, () => window.T.conn.length);
  const players = () => c.hosted(roomId)!.status().players;
  const before = players();
  // A network loss: the socket closes without `bye`, and the page holds its reconnect for 0.6 s (the room's grace is
  // 1.5 s, hosted-room.ts reconnectGraceMs; the page's own reconnect lands about 1.2 s after the close at the earliest).
  await ev(K0.page, () => window.T.room.pause(600));
  // The server must have handled the close before its rows are read: the room's connected clients lose the carrier's
  // socket (or, should the reconnect win the race, a new socket has replaced it). A carrier departed at once, or kit
  // cleared on departure, then shows in the next check, whichever way the race went.
  railCheck(
    "the server handles the carrier's socket closing",
    (await waitFor(
      async () => players() < before || (await ev(K0.page, (n: number) => window.T.conn.length >= n + 2, conns)),
      5000,
    )) >= 0,
    `players ${before} -> ${players()}`,
  );
  railCheck(
    'inside the grace the server keeps the logs on the absent back and the yard as it was',
    back('carry0').logs === logs && kit().yardLogs === STEEL.logs - logs && kit().logs === 0,
    JSON.stringify({ back: back('carry0'), kit: kit() }),
  );
  railCheck('inside the grace both peers mirror the absent back identically', await agree([K1, K2], 'carry0'));
  railCheck(
    'the peers checked inside the grace: the carrier was not yet departed',
    (await sees(K1, K0)) && (await sees(K2, K0)),
  );
  railCheck(
    'the carrier reconnects',
    (await waitFor(
      () => ev(K0.page, (n: number) => window.T.conn.length >= n + 2 && window.T.conn.at(-1).c, conns),
      10000,
    )) >= 0,
  );
  railCheck('after the reconnect every tab mirrors the carry intact', await agree(pages, 'carry0'));
  railCheck('the reconnected carrier sees its own back', (await adapter(K0)).rows.account?.carry === logs);
  await accept(
    'the reconnected carrier feeds the logs into the bill',
    K0,
    RING_STEEL_WORKS,
    { op: 'rail.steel' },
    () => kit().logs === logs && back('carry0').logs === 0,
  );
  railCheck('every tab mirrors the delivery', await agree(pages, 'carry0'));

  // Run 2: a second carrier takes rails and stays away past the grace.
  await accept(
    'the second carrier takes rails off the yard',
    K1,
    RING_STEEL_YARD,
    { op: 'rail.steelTake', kind: 1 },
    () => back('carry1').rails > 0,
  );
  const rails = back('carry1').rails;
  railCheck('the take moves rails from the yard to the back', kit().yardRails === STEEL.rails - rails);
  railCheck('every tab mirrors the second back before the drop', await agree(pages, 'carry1'));
  const needBefore = steelNeed(live()).rails;
  await ev(K1.page, () => window.T.room.pause(8000));
  railCheck(
    'past the grace the room departs the absent carrier (both peers hear it leave)',
    (await waitFor(async () => !(await sees(K0, K1)) && !(await sees(K2, K1)), 6000)) >= 0,
  );
  railCheck('the departed carrier is still away', !(await connected(K1)));
  // Today's rule (read, not decided here): no carry grace covers the yard's kit, so the rails stay on the departed
  // account. Conserved: railCounts counts every back, so `agree`'s room total holds with the rails off the yard.
  railCheck(
    'past the grace the rails stay on the departed account: not returned to the yard, not dropped, not lost',
    back('carry1').rails === rails && kit().yardRails === STEEL.rails - rails && kit().rails === 0,
    JSON.stringify({ back: back('carry1'), kit: kit() }),
  );
  railCheck('past the grace the remaining peers mirror the departed back identically', await agree([K0, K2], 'carry1'));
  // No stall either: the bill's need never counted a back, so it already owes the carried rails and a line 2 train
  // brings them out again (steelLoads, steelService) whether the carrier comes back or not.
  railCheck(
    "the bill's need still owes the departed carrier's rails (what sends a train for them)",
    steelNeed(live()).rails === needBefore && needBefore >= rails,
    `need ${needBefore} -> ${steelNeed(live()).rails}, carried ${rails}`,
  );
  railCheck('the carrier comes back after the grace', (await waitFor(() => connected(K1), 15000)) >= 0);
  railCheck('the returning carrier gets a live session', (await ready(K1)) >= 0);
  railCheck('the returning carrier still carries the rails', (await adapter(K1)).rows.account?.rails === rails);
  await accept(
    'the returning carrier feeds the rails into the bill',
    K1,
    RING_STEEL_WORKS,
    { op: 'rail.steel' },
    () => kit().rails === rails && back('carry1').rails === 0,
  );
  railCheck('every tab mirrors the late delivery and the room totals', await agree(pages, 'carry1'));
  await Promise.all(pages.map((p) => p.page.close()));
}

// Greybox leg 3's Checkpoint C (docs/plans/greybox-leg3.md): at `canopy-mid` (the seed doc a playtest jump-in writes),
// a second tab joins; the first takes rails off head 1's rack, leaves (its page closes: a `bye`, not a lost
// link), the server restarts, and it rejoins. The leg's row (sections laid, fed and held) and the kit aboard the bay
// trains must be what they were before it left, through a whole train cycle after the rejoin. Today's rule (read, not
// decided here; server/src/host/host-maintenance.ts): a leaver's lifted leg units stay on their back and counted held
// for the leg through `railBeamGraceS` (180 s); past it legKitRelease takes them off the held count only. The grace
// clock lives in the host's memory, so a restart starts it again for anyone still away.
export async function railwayLegRejoin(c: Ctx) {
  const { RAIL_LEGS, legRack } = await import('../../src/sim/railway-route.ts');
  const { legRow } = await import('../../src/sim/railway-queries-route.ts');
  const { account, rail: railRow } = await import('../../src/sim/railway-rows.ts');
  const { LINE_SLOTS } = await import('../../src/sim/railway-trains.ts');
  const legCheck = (name: string, ok: boolean, detail = '') => {
    c.check(`leg rejoin: ${name}`, ok, detail);
    if (!ok) throw new Error(`Leg rejoin proof stopped: ${name}${detail ? ` (${detail})` : ''}`);
  };
  const k = RAIL_LEGS.findIndex((l) => l.id === 'bell-canopy'),
    leg = RAIL_LEGS[k]!;
  // The seed doc a jump-in writes, written into the server's store before any page opens (as `look --rail-seed`):
  // POST /jump builds an unprebuilt stage in a worker with a 60 s limit (server/src/jump.ts), and canopy-mid, built
  // from ring-joined through every leg stage, takes longer than that on HOTBOX.
  const room = `${c.room}-leg`,
    roomId = railwayRoomId(room);
  const { writeRailSeed } = await import('../look/rail-seed.ts');
  const wrote = await writeRailSeed(c.dataDir, room, 'canopy-mid', 1000).then(
    () => '',
    (e: unknown) => String(e),
  );
  legCheck('the canopy-mid seed is written to the server store', wrote === '', wrote);
  console.log(`\nLeg rejoin room: ${roomId}`);
  const url = (pid: string) => `room=${roomId}&server=http://127.0.0.1:${c.port()}&pid=${pid}&adapter=1`;
  let A = await c.web.open('L0', url('leg0'));
  const B = await c.web.open('L1', url('leg1'));
  // The server's world, read again at each use: a restart replaces the hosted room.
  const live = async () => (await hostedWorld(c, roomId)).rules.railway.world();
  /** What must not move: the leg's row and each bay train's kit cargo. The rack and the carrier's back beside it. */
  const state = async () => {
    const w = await live();
    const kit = LINE_SLOTS[leg.line]!.map((slot) => {
      const t = trainRow(w, slot)!;
      return { slot, legKit: !!t.legKit, logs: t.logs, rails: t.rails };
    });
    const a = account(w, 'leg0');
    const rr = railRow(w);
    return {
      laid: legRow(w, k).laid,
      leg: JSON.stringify(legRow(w, k)),
      aboard: JSON.stringify(kit.filter((t) => t.legKit)),
      rack: [rr.depot, rr.depotRails],
      back: { rails: a?.rails ?? 0, legRails: a?.legRails ?? 0 },
    };
  };
  type State = Awaited<ReturnType<typeof state>>;
  /** The leg, the rack and the kit aboard as they were. */
  const still = (a: State, b: State) => a.leg === b.leg && a.aboard === b.aboard && a.rack.join() === b.rack.join();
  const cycle = async () => {
    const world = await hostedWorld(c, roomId);
    // About one bay train round trip (a stop at head 1 every ~965 ticks at this seed).
    await advancePast(world, world.sync.world.tick + 1100);
  };

  legCheck('both tabs are ready on the canopy-mid seed', (await Promise.all([A, B].map(ready))).every((t) => t >= 0));
  legCheck('the second tab joined: each sees the other', await meet(A, B));
  const seeded = await state();
  legCheck(
    "the seed: one section laid, the rack empty, the next kit aboard a bay train",
    seeded.laid === 1 && seeded.rack.join() === '0,0' && seeded.aboard !== '[]',
    JSON.stringify(seeded),
  );
  // The train brings the kit to head 1's rack; the next kit is then aboard, held while the rack is full.
  await cycle();
  const racked = await state();
  legCheck(
    "head 1's rack is stocked and a bay train holds the next kit",
    racked.rack[1]! > 0 && racked.aboard !== '[]',
    JSON.stringify(racked),
  );
  const rack = legRack(leg, racked.laid);
  legCheck('the first tab has a live session', (await ready(A)) >= 0);
  await ev(
    A.page,
    ({ at }) => {
      window.T.railStand(at.x, at.y, at.z);
      return window.T.railIntent({ op: 'rail.depotRailTake' } as never);
    },
    { at: { x: rack.x, y: rack.y, z: rack.z } },
  );
  legCheck(
    'the first tab takes rails off the rack, counted held for the leg',
    (await waitFor(async () => (await state()).back.legRails > 0 && (await adapter(A)).session.pending === 0, 10000)) >=
      0,
    JSON.stringify(await state()),
  );
  // A whole train cycle with the rails carried: the baseline the rejoin is compared with. The carried rails count as
  // held, so the train aboard must not top the rack up again.
  const taken = await state();
  await cycle();
  const before = await state();
  legCheck(
    'with the rails carried a train cycle leaves the leg, the rack and the kit aboard alone',
    still(before, taken),
    JSON.stringify({ taken, before }),
  );
  legCheck('both mirrors agree before the leave', await agreeOn([A, B]));

  await A.page.close();
  legCheck('the first tab leaves: the second hears it go', (await waitFor(async () => !(await sees(B, A)), 10000)) >= 0);
  const away = await state();
  legCheck(
    'with the carrier away the leg and the kit aboard are unchanged and the rails stay on its back',
    away.leg === before.leg && away.aboard === before.aboard && away.back.rails === before.back.rails,
    JSON.stringify(away),
  );
  await c.restart();
  A = await c.web.open('L0', url('leg0'));
  legCheck(
    'after the restart both tabs are ready again',
    (await Promise.all([A, B].map(ready))).every((t) => t >= 0),
  );
  legCheck('the rejoined tab and the second see each other', await meet(A, B));
  const after = await state();
  legCheck('the leg row is unchanged after the rejoin', after.leg === before.leg, `${before.leg} -> ${after.leg}`);
  legCheck('the kit aboard is unchanged after the rejoin', after.aboard === before.aboard, `${before.aboard} -> ${after.aboard}`);
  legCheck(
    'the carried rails are still on the rejoined back and still counted held',
    after.back.rails === before.back.rails && after.back.legRails === before.back.legRails,
    `${JSON.stringify(before.back)} -> ${JSON.stringify(after.back)}`,
  );
  legCheck(
    "the rejoined tab's own adapter shows the rails on its back",
    (await adapter(A)).rows.account?.rails === before.back.rails,
  );
  await cycle();
  const later = await state();
  legCheck(
    'a train cycle after the rejoin: leg, rack and kit aboard still as before the leave',
    still(later, before),
    JSON.stringify({ before, later }),
  );
  legCheck('both mirrors agree after the rejoin', await agreeOn([A, B]));
  console.log(`  leg rejoin: ${JSON.stringify({ before, after: later })}`);
  await Promise.all([A, B].map((p) => p.page.close()));
}

// A playtest jump-in (docs/plans/playtest-jump-in.md): two players in one seeded room, through a restart. The seed is
// an ordinary save, so play goes on from it and survives the restart; the shared room is never created or changed.
export async function railwayJumpIn(c: Ctx) {
  const jumpCheck = (name: string, ok: boolean, detail = '') => {
    c.check(name, ok, detail);
    if (!ok) throw new Error(`Jump-in proof stopped: ${name}`);
  };
  const sharedFile = path.join(c.dataDir, `${railwayRoomId(DEFAULT_ROOM)}.json`);
  const sharedBefore = await fs.readFile(sharedFile).catch(() => null);
  const r = await fetch(`http://127.0.0.1:${c.port()}/jump`, {
    method: 'POST',
    body: JSON.stringify({ stage: 'q3-done', ns: RAILWAY_PLAY_NS }),
  });
  jumpCheck('POST /jump seeds a room at q3-done', r.status === 200, String(r.status));
  const { room } = (await r.json()) as { room: string };
  const id = railwayRoomId(room);
  console.log(`\nJump-in room: ${id}`);
  const open = (name: string, pid: string) =>
    c.web.open(name, `room=${id}&server=http://127.0.0.1:${c.port()}&pid=${pid}`);
  const J0 = await open('J0', 'jump0'),
    J1 = await open('J1', 'jump1');
  const both = async (fn: (s: RailwayProbe) => boolean, ms = 8000) =>
    (await waitFor(async () => (await Promise.all([J0, J1].map(rail))).every((s) => s.ready && fn(s)), ms)) >= 0;
  jumpCheck('both players mirror the seed: Q3 laid, Q4 not', await both((s) => s.line2[2] === 1 && s.line2[3] !== 1));
  await ev(J0.page, () => (window.T.railMessages.length = 0));
  const opened = await waitFor(async () => {
    await ev(J0.page, () => window.T.railOpen());
    return (await rail(J0)).messages.some((m) => m.t === 'r:session');
  });
  jumpCheck('the first player gets a session in the seeded room', opened >= 0);
  const epoch = Number((await rail(J0)).messages.findLast((m) => m.t === 'r:session')!.epoch);
  const request = ((await rail(J0)).accounts.find((a) => a.pid === 'jump0')?.request ?? 0) + 1;
  const source = (await rail(J1)).sources.find((s) => s.remaining > 0)!;
  const jumpBack = (s: RailwayProbe) => s.accounts.find((a) => a.pid === 'jump0')?.carry ?? 0;
  const backBefore = jumpBack(await rail(J1));
  await ev(J0.page, (sid: number) => window.T.railPose('source', sid), source.id);
  await ev(J0.page, (e: RailAction) => window.T.railEdit(e), {
    op: 'rail.chop',
    epoch,
    request,
    id: source.id,
    yaw: 0,
    collapsed: false,
  });
  // A chop deepens the source's notch and loads the chopper's back. Its count need not drop: the seeds hold the proper
  // axe from the lit forge on, and its first stroke on a tree grows it by the 5 it takes (10 -> 15 -> 10).
  const at = (s: RailwayProbe) => s.sources.find((x) => x.id === source.id)!;
  const left = (s: RailwayProbe) => at(s).remaining;
  const lowered = (s: RailwayProbe) => at(s).work > source.work && jumpBack(s) > backBefore;
  const chopped = await both(lowered);
  const [s0, s1] = await Promise.all([J0, J1].map(rail));
  const reply = s0!.messages.findLast((m) => (m.t === 'ack' || m.t === 'rej') && m.epoch === epoch);
  jumpCheck(
    "one player's chop shows in the other's mirror",
    chopped,
    `source ${source.id}: ${source.remaining} -> ${left(s0!)} / ${left(s1!)}, notch ${source.work} -> ` +
      `${at(s0!).work} / ${at(s1!).work}, back ${backBefore} -> ${jumpBack(s0!)} / ${jumpBack(s1!)}; ${JSON.stringify(reply)}`,
  );
  jumpCheck('the two mirrors agree', await agreeOn([J0, J1]));
  await c.restart();
  jumpCheck(
    'after a restart both rejoin with the seed and the chop kept',
    await both((s) => lowered(s) && s.line2[2] === 1, 15000),
  );
  jumpCheck('and agree', await agreeOn([J0, J1]));
  const host = (await (await fetch(`http://127.0.0.1:${c.port()}/rooms/${id}/host`)).json()) as {
    seed?: { stage: string };
  };
  jumpCheck('the room still says it started at q3-done', host.seed?.stage === 'q3-done', JSON.stringify(host.seed));
  const sharedAfter = await fs.readFile(sharedFile).catch(() => null);
  jumpCheck(
    'the shared room was not created or changed',
    sharedBefore === null ? sharedAfter === null : !!sharedAfter && sharedAfter.equals(sharedBefore),
  );
  // The replacement checkpoint uses the same two live browser mirrors, at a later played tick, then restores
  // the pinned old world. These are the real room hooks; a peer relay cannot invoke onReplacing.
  await ev(J0.page, () => (window.T.railMessages.length = 0));
  jumpCheck(
    'replace: a fresh command session opens before occupying a seat',
    (await waitFor(async () => {
      await ev(J0.page, () => window.T.railOpen());
      return (await rail(J0)).messages.some((m) => m.t === 'r:session');
    })) >= 0,
  );
  const seatSession = (await rail(J0)).messages.findLast((m) => m.t === 'r:session')!;
  await ev(J0.page, () => window.T.railStand(0, 0, 0));
  const sit = {
    op: 'seat.sit' as const,
    id: 'machine-deck-0',
    epoch: Number(seatSession.epoch),
    request: Number(seatSession.next),
  };
  await ev(J0.page, (edit: typeof sit) => window.T.railEdit(edit), sit);
  jumpCheck(
    'replace: both peers mirror the occupied seat before replacement',
    await both((s) => s.seats.length === 1 && s.seats[0]!.pid === 'jump0'),
  );
  const beforeBorn = await ev(J0.page, () => window.T.room!.born());
  await Promise.all(
    [J0, J1].map((p) =>
      ev(p.page, () => {
        const events: string[] = [];
        document.documentElement.dataset.replaceEvents = '[]';
        window.T.room!.onReplacing(({ label, seconds }: { label: string; seconds: number }) => {
          events.push(`notice:${label}:${seconds}`);
          document.documentElement.dataset.replaceEvents = JSON.stringify(events);
        });
        window.T.room!.onConnection((connected: boolean) => {
          if (!connected) events.push('disconnected');
          document.documentElement.dataset.replaceEvents = JSON.stringify(events);
        });
      }),
    ),
  );
  if (c.hostOnly('jump-in replace')) {
    await Promise.all([J0, J1].map((p) => p.page.close()));
    return;
  }
  // Keep enough played clock beyond the seed for reconnect latency not to mask the lower-tick replacement.
  await advancePast(await hostedWorld(c, id), (await rail(J0)).tick + 600);
  jumpCheck(
    'replace: both peers observe the played clock before replacement',
    await both((s) => s.tick >= (c.hosted(id)?.world.sync.world.tick ?? 0) - 60),
  );
  const preChange = await rail(J0);
  const replaced = await fetch(`http://127.0.0.1:${c.port()}/admin/rooms/${id}/replace`, {
    method: 'POST',
    headers: { Authorization: 'Bearer peer-test-advance-32-char-key-000000', 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage: 'q3-done', confirm: room, override: true }),
  });
  jumpCheck('replace: authenticated request succeeds', replaced.status === 200, await replaced.clone().text());
  const record = (await replaced.json()) as { backup: string };
  const births = () => Promise.all([J0, J1].map((p) => ev(p.page, () => window.T.room!.born())));
  // The production room-reset feature reloads on changed born. This bare transport page does not install features:
  // observe that trigger first, retain notice evidence, then reproduce its reload before reading a fresh mirror.
  const reloadPeers = () =>
    Promise.all(
      [J0, J1].map(async (p) => {
        await p.page.reload();
        p.selfId = await ev(p.page, () => window.T.start());
      }),
    );
  jumpCheck(
    'replace: both peers reconnect with a new birth',
    (await waitFor(async () => (await births()).every((born) => born && born !== beforeBorn), 15000)) >= 0,
  );
  const events = await Promise.all(
    [J0, J1].map((p) =>
      ev(p.page, () => JSON.parse(document.documentElement.dataset.replaceEvents ?? '[]') as string[]),
    ),
  );
  jumpCheck(
    'replace: both peers receive countdown before disconnect',
    events.every((rows) => {
      const notice = rows.findIndex((row) => row.startsWith('notice:'));
      return notice >= 0 && rows.indexOf('disconnected', notice + 1) > notice;
    }),
    JSON.stringify(events),
  );
  const newBorn = await births();
  jumpCheck('replace: both peers receive the same new birth', newBorn[0] !== beforeBorn && newBorn[0] === newBorn[1]);
  await reloadPeers();
  jumpCheck(
    'replace: both peers reload into the unplayed Q3 seed',
    await both((s) => s.line2[2] === 1 && left(s) === source.remaining && at(s).work === source.work, 15000),
  );
  jumpCheck('replace: both mirrors agree in the replaced world', await agreeOn([J0, J1]));
  jumpCheck(
    'replace: v41 host and both peers have no seat rows',
    (await both((s) => s.seats.length === 0)) && (await hostedWorld(c, id)).status().seats.length === 0,
  );
  const seedState = await rail(J0);
  jumpCheck(
    'replace: the played world returns to a lower seed tick',
    seedState.tick < preChange.tick,
    `${preChange.tick} -> ${seedState.tick}`,
  );
  const restored = await fetch(
    `http://127.0.0.1:${c.port()}/admin/rooms/${id}/restore?force=1&backup=${encodeURIComponent(record.backup)}`,
    {
      method: 'POST',
      headers: { Authorization: 'Bearer peer-test-report' },
    },
  );
  jumpCheck('replace: pinned backup restores successfully', restored.status === 200, await restored.clone().text());
  jumpCheck(
    'replace: original birth returns on both peers',
    (await waitFor(async () => (await births()).every((born) => born === beforeBorn), 15000)) >= 0,
  );
  await reloadPeers();
  jumpCheck(
    'replace: both peers recover the old Q3 world and chop',
    await both((s) => lowered(s) && s.line2[2] === 1 && s.line2[3] !== 1, 15000),
  );
  jumpCheck('replace: restored mirrors agree', await agreeOn([J0, J1]));
  jumpCheck('replace: restoring the save also leaves transient seats empty', await both((s) => s.seats.length === 0));
  const restoredState = await rail(J0);
  console.log(
    'Replacement checkpoint',
    JSON.stringify({
      before: { tick: preChange.tick, hash: preChange.hash },
      seed: { tick: seedState.tick, hash: seedState.hash },
      restored: { tick: restoredState.tick, hash: restoredState.hash },
      backup: record.backup,
    }),
  );
  await Promise.all([J0, J1].map((p) => p.page.close()));
}
// Step a fresh railway room's clock past `tick`. A step does nothing until the room's startup checkpoint (and any stamp
// it publishes) is durable, and that write lands only when the event loop runs: a plain synchronous step loop started
// before then spins forever. So wait for startup, and yield whenever a step did not move the clock; every wait, a
// stalled startup save included, shares one 30 s deadline.
/** The room's hosted world once the server has it up; an assertion failure (not a TypeError) when it never does. */
async function hostedWorld(c: Ctx, roomId: string): Promise<RailwayWorldHost> {
  const up = await waitFor(async () => !!c.hosted(roomId), 15000);
  const hosted = c.hosted(roomId);
  if (up < 0 || !hosted)
    throw new Error(`the server never hosted room ${roomId} within 15 s (room host missing under load?)`);
  return hosted.world as RailwayWorldHost;
}

async function advancePast(world: RailwayWorldHost, tick: number) {
  const end = performance.now() + 30000;
  const held = () => new Error(`the room clock is held at tick ${world.sync.world.tick}`);
  const within = async (p: Promise<unknown>) => {
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        p,
        new Promise<never>((_, reject) => (timer = setTimeout(() => reject(held()), end - performance.now()))),
      ]);
    } finally {
      clearTimeout(timer);
    }
  };
  await within(world.whenReady());
  while (world.sync.world.tick <= tick) {
    const before = world.sync.roomStep();
    world.step(0.1);
    if (world.sync.roomStep() !== before) continue;
    if (performance.now() > end) throw held();
    await within(world.sync.whenDurable());
    await sleep(1);
  }
  await within(world.sync.whenDurable());
}
/** A tab's adapter session is open with nothing pending. */
const ready = (p: Page) =>
  waitFor(async () => {
    const s = (await adapter(p)).session;
    return s.ready && s.pending === 0;
  }, 15000);
/** Tab `p` has `other` among its room's peers. */
const sees = (p: Page, other: Page) =>
  ev(p.page, (id: unknown) => window.T.room.peers().some((x: { peer: unknown }) => x.peer === id), other.selfId);
/** Each of two tabs sees the other. */
const meet = async (a: Page, b: Page) => (await Promise.all([sees(a, b), sees(b, a)])).every(Boolean);
const agreeOn = async (group: Page[]) =>
  (await waitFor(async () => {
    const all = await Promise.all(group.map(rail));
    return all.every((s) => s.ready && s.hash === all[0]!.hash);
  }, 8000)) >= 0;
