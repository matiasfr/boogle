// End-to-end test of src/net/peer-room.js (`npm run test:net`): local PeerServer + headless Chromium pages running
// page.js. Room interface: src/net/README.md.
import { startHarness, waitFor, ev, snap, seesAll, sleep } from './harness.mjs';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
}

const { room, open, close } = await startHarness();

let exitCode;
try {
  // 1. startup: first page becomes host, the others join it
  const A = await open('A'),
    B = await open('B'),
    C = await open('C');
  const all = [A, B, C];
  const snaps = await Promise.all(all.map(snap));
  check(
    'exactly one host (the first page)',
    snaps.filter((s) => s.host).length === 1 && snaps[0].host,
    `hosts=${snaps.map((s) => s.host)}`,
  );
  check(
    'selfIds unique, 10 base36 chars',
    new Set(all.map((p) => p.selfId)).size === 3 && all.every((p) => /^[a-z0-9]{10}$/.test(p.selfId)),
  );
  check('each page sees the other two', (await waitFor(() => seesAll(all), 5000)) >= 0);

  // 2. presence propagation and latency (client -> host -> client included)
  await Promise.all(all.map((p, i) => ev(p.page, (i) => window.T.room.presence({ name: 'p' + i, x: i }), i)));
  const presOk = await waitFor(async () => {
    for (const p of all) {
      const s = await snap(p);
      for (const o of all)
        if (o !== p && s.peers.find((x) => x.peer === o.selfId)?.presence.name !== 'p' + all.indexOf(o)) return false;
    }
    return true;
  }, 3000);
  check('presence values propagate', presOk >= 0, presOk + ' ms');
  await ev(A.page, () => window.T.room.presence({ x: null }));
  check(
    'presence null deletes key',
    (await waitFor(async () => !('x' in (await snap(B)).peers.find((x) => x.peer === A.selfId).presence), 2000)) >= 0,
  );
  await Promise.all(
    all.map((p) =>
      ev(p.page, () => {
        window.T.lat.length = 0;
      }),
    ),
  );
  await Promise.all(all.map((p) => ev(p.page, () => window.T.latency(40, 50))));
  await sleep(500);
  const lats = (await Promise.all(all.map((p) => ev(p.page, () => window.T.lat.map((l) => l.ms)))))
    .flat()
    .sort((a, b) => a - b);
  const maxLat = lats[lats.length - 1],
    p50 = lats[Math.floor(lats.length / 2)];
  check(
    'presence latency < 500 ms',
    lats.length > 200 && maxLat < 500,
    `n=${lats.length} p50=${p50}ms max=${maxLat}ms`,
  );

  // linkStats(): the host has a link to each client, each client one to the host; all direct (no TURN here)
  const links = await Promise.all(
    all.map((p) => ev(p.page, async () => ({ host: window.T.room.isHost(), rows: await window.T.room.linkStats() }))),
  );
  check(
    'linkStats(): one row per link, direct, with an RTT',
    links.every((l) => l.rows.length === (l.host ? 2 : 1)) &&
      links.flatMap((l) => l.rows).every((r) => r.relay === false && Number.isFinite(r.rttMs)),
    JSON.stringify(links.map((l) => l.rows.map((r) => `${r.local}/${r.remote} ${r.rttMs}ms`))),
  );

  // 3. reliable messages: ordered, exactly once, from every sender to both others
  await Promise.all(
    all.map((p) =>
      ev(p.page, () => {
        window.T.msgs = {};
      }),
    ),
  );
  await Promise.all(all.map((p) => ev(p.page, () => window.T.burst(100))));
  await sleep(1500);
  let msgOk = true;
  const msgDetail = [];
  for (const p of all) {
    const msgs = await ev(p.page, () => window.T.msgs);
    for (const o of all) {
      if (o === p) {
        if (msgs[o.selfId]) msgOk = false;
        continue;
      }
      const got = msgs[o.selfId] || [];
      if (!(got.length === 100 && got.every((n, i) => n === i))) {
        msgOk = false;
        msgDetail.push(`${p.name}<-${o.name}: ${got.length}`);
      }
    }
  }
  check('send(): 100 msgs x 3 senders in order, exactly once, not echoed', msgOk, msgDetail.join(' '));

  // 4. host crash (page.close() runs no unload handlers) -> migration
  const idsBefore = [B.selfId, C.selfId];
  const BC = [B, C];
  await Promise.all(
    BC.map((p) =>
      ev(p.page, () => {
        window.T.left.length = 0;
        window.T.conn.length = 0;
      }),
    ),
  );
  const tKill = Date.now();
  await A.page.close();
  const newHostMs = await waitFor(async () => (await Promise.all(BC.map(snap))).some((s) => s.host), 7000);
  check(
    'a remaining page becomes host within ~5 s',
    newHostMs >= 0 && Date.now() - tKill < 7000,
    `${Date.now() - tKill} ms`,
  );
  const reconnected = await waitFor(
    async () => (await Promise.all(BC.map((p) => ev(p.page, () => window.T.conn.at(-1)?.c === true)))).every(Boolean),
    10000,
  );
  check('both survivors reconnected (onConnection true)', reconnected >= 0, `${Date.now() - tKill} ms after kill`);
  const seeEachOther = await waitFor(
    async () => (await Promise.all(BC.map(snap))).every((s, i) => s.peers.some((x) => x.peer === BC[1 - i].selfId)),
    5000,
  );
  check('B and C still see each other', seeEachOther >= 0);
  const hosts = (await Promise.all(BC.map(snap))).filter((s) => s.host).length;
  check('exactly one host after migration', hosts === 1, `hosts=${hosts}`);
  check(
    'selfIds unchanged across migration',
    (await Promise.all(BC.map(snap))).every((s, i) => s.self === idsBefore[i] && s.peers[0].peer === idsBefore[i]),
  );
  const connLogs = await Promise.all(BC.map((p) => ev(p.page, () => window.T.conn.map((c) => c.c))));
  check(
    'onConnection went false then true',
    connLogs.every((l) => l.includes(false) && l.at(-1) === true),
    JSON.stringify(connLogs),
  );
  const settled = await waitFor(
    async () => (await Promise.all(BC.map(snap))).every((s) => !s.peers.some((x) => x.peer === A.selfId)),
    14000,
  );
  check('old host reported as left on both', settled >= 0);
  const lefts = await Promise.all(BC.map((p) => ev(p.page, () => window.T.left.map((l) => l.peer))));
  if (process.env.DBG)
    console.log(
      '  lefts',
      JSON.stringify(
        await Promise.all(
          BC.map((p) => ev(p.page, () => ({ l: window.T.left, c: window.T.conn, h: window.T.hostChanges }))),
        ),
      ),
      tKill,
      { A: A.selfId, B: B.selfId, C: C.selfId },
    );
  check(
    'no spurious left for surviving peers (no flapping)',
    lefts.every((l) => l.every((id) => id === A.selfId)),
    JSON.stringify(lefts),
  );
  await Promise.all(
    BC.map((p) =>
      ev(p.page, () => {
        window.T.msgs = {};
        window.T.lat.length = 0;
      }),
    ),
  );
  await Promise.all(BC.map((p) => ev(p.page, () => window.T.latency(10, 50))));
  await Promise.all(BC.map((p) => ev(p.page, () => window.T.burst(20))));
  await sleep(800);
  const post = await Promise.all(BC.map((p) => ev(p.page, () => ({ lat: window.T.lat.length, msgs: window.T.msgs }))));
  check(
    'presence flows after migration',
    post.every((x) => x.lat >= 8),
    post.map((x) => x.lat).join('/'),
  );
  check(
    'messages flow after migration',
    post[0].msgs[C.selfId]?.length === 20 && post[1].msgs[B.selfId]?.length === 20,
  );

  // 5. a newcomer joins the migrated room; then a client crashes, then one closes gracefully
  const D = await open('D');
  const BCD = [B, C, D];
  check(
    'new page joins migrated room, sees B and C',
    (await waitFor(() => seesAll(BCD), 6000)) >= 0 && !(await snap(D)).host,
  );
  await Promise.all(
    BCD.map((p) =>
      ev(p.page, () => {
        window.T.left.length = 0;
      }),
    ),
  );
  const hostFlags = await Promise.all(BCD.map(async (p) => (await snap(p)).host));
  const nonHosts = BCD.filter((p, i) => !hostFlags[i]);
  const [victim, other] = nonHosts; // crash one client, close the other gracefully
  const tClient = Date.now();
  await victim.page.close();
  const watchers = BCD.filter((p) => p !== victim);
  const leftMs = await waitFor(
    async () =>
      (
        await Promise.all(
          watchers.map((p) => ev(p.page, (id) => window.T.left.some((l) => l.peer === id), victim.selfId)),
        )
      ).every(Boolean),
    8000,
  );
  check(
    'closing a client page -> others get left',
    leftMs >= 0 && Date.now() - tClient < 5000,
    `${Date.now() - tClient} ms`,
  );
  check('still exactly one host', (await Promise.all(watchers.map(snap))).filter((s) => s.host).length === 1);
  await ev(other.page, () => window.T.room.close());
  const hostPage = BCD.find((p, i) => hostFlags[i]);
  const gracefulMs = await waitFor(
    () => ev(hostPage.page, (id) => window.T.left.some((l) => l.peer === id), other.selfId),
    3000,
  );
  check('graceful room.close() -> left within 3 s', gracefulMs >= 0, gracefulMs + ' ms');
  // a hard crash: the renderer dies, so nothing is sent (no 'bye', no unload handlers); only heartbeats can notice
  const E = await open('E'),
    F = await open('F');
  const HEF = [hostPage, E, F];
  check(
    'two more pages join',
    (await waitFor(
      async () => (await Promise.all(HEF.map(async (p) => (await snap(p)).peers.length))).every((n) => n === 3),
      6000,
    )) >= 0,
  );
  await Promise.all(
    HEF.map((p) =>
      ev(p.page, () => {
        window.T.left.length = 0;
      }),
    ),
  );
  const tHard = Date.now();
  const cdp = await E.ctx.newCDPSession(E.page);
  cdp.send('Page.crash').catch(() => {}); // never resolves: the renderer is gone
  const hardWatchers = [hostPage, F];
  const hardMs = await waitFor(
    async () =>
      (
        await Promise.all(
          hardWatchers.map((p) => ev(p.page, (id) => window.T.left.some((l) => l.peer === id), E.selfId)),
        )
      ).every(Boolean),
    8000,
  );
  check(
    'hard-crashed client -> others get left within 5 s',
    hardMs >= 0 && Date.now() - tHard < 5000,
    `${Date.now() - tHard} ms`,
  );

  // Room cap (maxPeers, host included): a newcomer past the cap is turned away with room_full, and gets in once
  // someone leaves.
  const capRoom = room + 'cap';
  const capOpts = { in: capRoom, query: '&max=3' };
  const X = await open('X', capOpts),
    Y = await open('Y', capOpts),
    Z = await open('Z', capOpts);
  check('cap: three join a room capped at 3', (await waitFor(() => seesAll([X, Y, Z]), 5000)) >= 0);
  const W = await open('W', capOpts);
  check(
    'cap: a fourth is turned away with room_full',
    W.selfId?.error === 'room_full' && W.selfId.max === 3,
    JSON.stringify(W.selfId),
  );
  await sleep(800);
  check('cap: the room never lists the fourth', (await snap(X)).peers.length === 3);
  await ev(Z.page, () => window.T.room.close());
  await waitFor(() => seesAll([X, Y]), 5000);
  W.selfId = await ev(W.page, () => window.T.start());
  check(
    'cap: once one leaves, the fourth gets in',
    typeof W.selfId === 'string' && (await waitFor(() => seesAll([X, Y, W]), 5000)) >= 0,
    JSON.stringify(W.selfId),
  );
  // Y leaves, V takes the spot, Y's tab connects again (same selfId, as after a blip): the host admits it over the
  // cap. (A fresh createPeerRoom restarts its presence seq, which the host's tombstone ignores, so this only checks
  // admission; a real blip reconnects the same room and keeps its seq.)
  await ev(Y.page, () => window.T.room.close());
  await waitFor(() => seesAll([X, W]), 5000);
  const V = await open('V', capOpts);
  await waitFor(() => seesAll([X, W, V]), 5000);
  const back = await ev(Y.page, () => window.T.start());
  check('cap: a tab the room has seen before is not turned away', back === Y.selfId, JSON.stringify(back));
  await Promise.all([X, Y, Z, W, V].map((p) => p.ctx.close()));

  // Host choice: a host whose score drops (a hidden tab) hands over to the best-scored client, and stays in the room.
  const hoRoom = room + 'ho';
  const H = await open('H', { in: hoRoom, query: '&score=3' }),
    K = await open('K', { in: hoRoom, query: '&score=2' }),
    L = await open('L', { in: hoRoom, query: '&score=3' });
  await waitFor(() => seesAll([H, K, L]), 5000);
  check('handover: the first page hosts', (await snap(H)).host);
  await ev(H.page, () => (window.T.score = 0));
  const tHo = Date.now();
  const handedMs = await waitFor(async () => (await snap(L)).host, 20000); // a new host keeps the role 15 s
  check('handover: a hidden host hands over to the best-scored client', handedMs >= 0, `${Date.now() - tHo} ms`);
  const hosts3 = (await Promise.all([H, K, L].map(snap))).filter((s) => s.host).length;
  check('handover: exactly one host after it', hosts3 === 1, `hosts=${hosts3}`);
  check('handover: the old host is back in as a client', (await waitFor(() => seesAll([H, K, L]), 10000)) >= 0);
  await Promise.all([H, K, L].map((p) => p.ctx.close()));

  const BD = [hostPage];
  const errs = await Promise.all(BD.map((p) => ev(p.page, () => window.T.errors)));
  check(
    'no error callbacks / sender mismatches',
    errs.every((e) => e.length === 0),
    JSON.stringify(errs),
  );
} catch (e) {
  console.log('FAIL  unexpected exception:', e.stack || e);
  results.push({ name: 'exception', ok: false });
} finally {
  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${failed.length ? 'FAIL' : 'PASS'}: ${results.length - failed.length}/${results.length} checks passed`,
  );
  exitCode = failed.length ? 1 : 0;
  await close();
  process.exit(exitCode);
}
