// Load test of one room (`npm run load`): PLAYERS headless pages (default 8, the room cap) send a game-sized presence
// at HZ (20, like net.js) for SECONDS (30), then one more page checks the cap turns it away. Prints the host's
// upload and CPU, and per-client delivery and presence latency. All pages share this machine and loopback, so read
// CPU as relative (before/after a change) and latency as a floor; upload is the number that matters on a real host.
// `-- --json <file>` also writes the numbers.
import fs from 'node:fs';
import { startHarness, waitFor, ev, seesAll, sleep } from './harness.mjs';

const PLAYERS = Number(process.env.PLAYERS ?? 8);
const HZ = Number(process.env.HZ ?? 20);
const SECONDS = Number(process.env.SECONDS ?? 30);
const jsonOut = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null;

const pct = (xs, p) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
const kbps = (bytes, s) => Math.round((bytes * 8) / s / 1000);

const { open, close } = await startHarness();
let exitCode = 1;
try {
  const pages = [];
  for (let i = 0; i < PLAYERS; i++) pages.push(await open('P' + i));
  if ((await waitFor(() => seesAll(pages), 15000)) < 0) throw new Error(`${PLAYERS} pages never all saw each other`);
  const roles = await Promise.all(pages.map((p) => ev(p.page, () => window.T.room.isHost())));
  const host = pages[roles.indexOf(true)];
  if (!host || roles.filter(Boolean).length !== 1) throw new Error(`expected one host, got ${roles}`);
  const cdp = await host.ctx.newCDPSession(host.page);
  await cdp.send('Performance.enable');
  const cpu = async () =>
    (await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'TaskDuration')?.value ?? 0;

  console.log(`load: ${PLAYERS} players, presence at ${HZ} Hz for ${SECONDS} s ...`);
  await Promise.all(pages.map((p) => ev(p.page, (hz) => window.T.load(hz), HZ)));
  await sleep(2000); // warm up
  const before = await Promise.all(pages.map((p) => ev(p.page, () => window.T.stats())));
  const cpu0 = await cpu();
  const t0 = Date.now();
  await sleep(SECONDS * 1000);
  const after = await Promise.all(pages.map((p) => ev(p.page, () => window.T.stats())));
  const wall = (Date.now() - t0) / 1000;
  const hostCpu = (await cpu()) - cpu0;
  await Promise.all(pages.map((p) => ev(p.page, () => window.T.stopLoad())));

  const rows = pages.map((p, i) => {
    const a = after[i],
      b = before[i];
    const lat = a.lat.slice(b.lat.length);
    return {
      name: p.name,
      host: a.host,
      upKbps: kbps(a.sent - b.sent, wall),
      downKbps: kbps(a.received - b.received, wall),
      updatesPerS: Math.round((a.got - b.got) / wall),
      latP50: pct(lat, 50),
      latP95: pct(lat, 95),
    };
  });
  const expected = (PLAYERS - 1) * HZ;
  console.log('\n  page  role    up kbit/s  down kbit/s  updates seen/s (sent ' + expected + ')  latency p50/p95 ms');
  for (const r of rows) {
    console.log(
      `  ${r.name.padEnd(5)} ${(r.host ? 'host' : 'client').padEnd(7)} ${String(r.upKbps).padStart(9)}  ${String(r.downKbps).padStart(11)}  ${String(r.updatesPerS).padStart(20)}  ${r.host ? '-' : `${r.latP50}/${r.latP95}`}`,
    );
  }
  const clients = rows.filter((r) => !r.host);
  const summary = {
    players: PLAYERS,
    hz: HZ,
    seconds: Math.round(wall),
    hostUpKbps: rows.find((r) => r.host)?.upKbps,
    hostCpuPct: Math.round((hostCpu / wall) * 100),
    clientUpdatesPerS: Math.round(clients.reduce((s, r) => s + r.updatesPerS, 0) / clients.length),
    expectedUpdatesPerS: expected,
    latP50: pct(
      clients.map((r) => r.latP50),
      50,
    ),
    latP95: Math.max(...clients.map((r) => r.latP95)),
  };
  console.log(
    `\nload: host uploads ${summary.hostUpKbps} kbit/s, host main thread ${summary.hostCpuPct}% busy; clients get ` +
      `${summary.clientUpdatesPerS}/${expected} updates/s, presence latency p50 ${summary.latP50} ms, worst p95 ${summary.latP95} ms`,
  );

  const extra = await open('over-cap');
  summary.capTurnsAway = extra.selfId?.error === 'room_full';
  console.log(
    `load: player ${PLAYERS + 1} ${summary.capTurnsAway ? 'turned away (room_full)' : 'got in: ' + JSON.stringify(extra.selfId)}`,
  );
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ summary, rows }, null, 2));
  exitCode = PLAYERS >= 8 && !summary.capTurnsAway ? 1 : 0;
} catch (e) {
  console.log('load: FAILED', e.stack || e);
} finally {
  await close();
  process.exit(exitCode);
}
